// Administração: usuários, escola, disciplinas/assuntos, séries, permissões e dados.
import { api } from '../api.js';
import { esc, $, $$, toast, erro, modal, confirmar, pedirTexto, lerImagem } from '../ui.js';
import { estado, pode, nomeDisciplina, FONTES_PROVA } from '../estado.js';
import { recarregarConfig } from '../nav.js';
import { icone } from '../icones.js';

// ---------------------------------------------------------------------------
// Usuários
// ---------------------------------------------------------------------------
export async function telaUsuarios(el) {
  const usuarios = (await api.get('/usuarios')).sort((a, b) => a.nome.localeCompare(b.nome));
  el.innerHTML = `
    <div class="cabecalho-pagina">
      <div><h1>Usuários</h1></div>
      <div class="acoes"><button class="btn btn-caneta" id="novo">${icone('mais')} Novo usuário</button></div>
    </div>
    <div class="card"><div class="tabela-wrap"><table class="tabela tabela-cartoes">
      <thead><tr><th>Nome</th><th>Login</th><th>Perfil</th><th>Disciplinas</th><th>Situação</th><th></th></tr></thead>
      <tbody>${usuarios.map((u) => `
        <tr style="${u.ativo ? '' : 'opacity:.55'}">
          <td class="titulo-linha td-titulo">${esc(u.nome)}</td><td data-label="Login"><code>${esc(u.login)}</code></td>
          <td data-label="Perfil">${esc(estado.perfis[u.perfil])}</td>
          <td data-label="Disciplinas"><small>${u.disciplinas.map((d) => esc(nomeDisciplina(d))).join(', ') || '—'}</small></td>
          <td data-label="Situação">${u.ativo ? '<span class="status st-aprovada">Ativo</span>' : '<span class="status st-rascunho">Inativo</span>'}</td>
          <td class="td-acoes"><div class="acoes"><button class="btn btn-sm" data-id="${u.id}">Editar</button></div></td>
        </tr>`).join('')}</tbody></table></div></div>`;

  $('#novo', el).onclick = () => formUsuario(null);
  $$('[data-id]', el).forEach((b) => (b.onclick = () => formUsuario(usuarios.find((u) => u.id === b.dataset.id))));

  function formUsuario(u) {
    const novo = !u;
    u = u || { nome: '', login: '', perfil: 'professor', disciplinas: [], ativo: true };
    const discs = estado.disciplinas.filter((d) => d.ativo !== false).sort((a, b) => a.nome.localeCompare(b.nome));
    modal({
      titulo: novo ? 'Novo usuário' : 'Editar usuário',
      corpo: `
        <form id="fu" autocomplete="off">
          <div class="grade">
            <label class="campo"><span>Nome completo *</span><input type="text" name="nome" value="${esc(u.nome)}" required></label>
            <label class="campo"><span>Login *</span><input type="text" name="login" value="${esc(u.login)}" placeholder="ex.: maria.silva" required></label>
            <label class="campo"><span>Perfil</span><select name="perfil">${Object.entries(estado.perfis).map(([k, v]) => `<option value="${k}" ${u.perfil === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
            <label class="campo"><span>${novo ? 'Senha inicial *' : 'Nova senha'}</span><input type="password" name="senha" autocomplete="new-password" placeholder="${novo ? 'mín. 6 caracteres' : 'deixe vazio para manter'}"></label>
          </div>
          <div class="campo"><span>Disciplinas que leciona</span>
            <div class="grade" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:4px 12px">
              ${discs.map((d) => `<label class="check"><input type="checkbox" name="disc" value="${d.id}" ${u.disciplinas.includes(d.id) ? 'checked' : ''}> ${esc(d.nome)}</label>`).join('')}
            </div></div>
          <label class="check"><input type="checkbox" name="ativo" ${u.ativo ? 'checked' : ''}> Usuário ativo (pode entrar no sistema)</label>
        </form>`,
      botoes: [
        { texto: 'Cancelar' },
        {
          texto: 'Salvar', classe: 'btn-primario',
          acao: async (d) => {
            const f = $('#fu', d);
            const dados = {
              nome: f.nome.value, login: f.login.value, perfil: f.perfil.value, senha: f.senha.value, ativo: f.ativo.checked,
              disciplinas: $$('input[name=disc]:checked', f).map((c) => c.value),
            };
            if (novo) await api.post('/usuarios', dados);
            else await api.put('/usuarios/' + u.id, dados);
            toast('Usuário salvo.', 'ok');
            await recarregarConfig();
          },
        },
      ],
    });
  }
}

// ---------------------------------------------------------------------------
// Configurações
// ---------------------------------------------------------------------------
let abaConfig = null;

export async function telaConfig(el) {
  const abas = [
    pode('config.gerenciar') && ['escola', 'Escola e cabeçalho'],
    pode('config.gerenciar') && ['disciplinas', 'Disciplinas e assuntos'],
    pode('config.gerenciar') && ['series', 'Séries e turmas'],
    pode('config.gerenciar') && ['permissoes', 'Permissões por perfil'],
    pode('dados.backup') && ['dados', 'Backup e importação'],
  ].filter(Boolean);
  if (!abas.length) {
    el.innerHTML = '<div class="vazio"><strong>Sem acesso</strong></div>';
    return;
  }
  if (!abas.some(([k]) => k === abaConfig)) abaConfig = abas[0][0];

  el.innerHTML = `
    <div class="cabecalho-pagina"><div><h1>Configurações</h1></div></div>
    <div class="abas">${abas.map(([k, v]) => `<button data-aba="${k}" class="${k === abaConfig ? 'ativa' : ''}">${v}</button>`).join('')}</div>
    <div id="aba"></div>`;
  $$('[data-aba]', el).forEach((b) => (b.onclick = () => { abaConfig = b.dataset.aba; telaConfig(el); }));
  const alvo = $('#aba', el);
  ({ escola: abaEscola, disciplinas: abaDisciplinas, series: abaSeries, permissoes: abaPermissoes, dados: abaDados })[abaConfig](alvo);
}

function abaEscola(el) {
  const e = { ...estado.escola };
  el.innerHTML = `
    <div class="card" style="max-width:760px">
      <form id="fe">
        <div class="grade">
          <label class="campo" style="grid-column:1/-1"><span>Nome da escola</span><input type="text" name="nome" value="${esc(e.nome)}"></label>
          <label class="campo"><span>Endereço</span><input type="text" name="endereco" value="${esc(e.endereco)}"></label>
          <label class="campo"><span>Cidade / UF</span><input type="text" name="cidade" value="${esc(e.cidade)}"></label>
          <label class="campo"><span>Telefone</span><input type="text" name="telefone" value="${esc(e.telefone)}"></label>
          <label class="campo"><span>Rodapé da prova</span><input type="text" name="rodape" value="${esc(e.rodape)}" placeholder="Ex.: Boa prova!"></label>
        </div>
        <div class="campo"><span>Logo</span>
          <div class="flex"><img id="logo-prev" src="${e.logo || ''}" style="max-height:70px;max-width:160px;${e.logo ? '' : 'display:none'}">
          <input type="file" accept="image/*" id="logo-arq"><button type="button" class="btn btn-sm btn-perigo" id="logo-tirar">Remover logo</button></div></div>
        <label class="check" style="margin-bottom:14px"><input type="checkbox" name="mostrarLogoPei" ${e.mostrarLogoPei !== false ? 'checked' : ''}>
          Mostrar a logo do PEI <img src="/img/logo-pei.png" alt="" style="height:26px;vertical-align:middle"> no cabeçalho das provas</label>
        <div class="campo"><span>Fonte das provas impressas</span>
          <div class="fontes-prova">
            ${Object.entries(FONTES_PROVA).map(([k, v]) => `
              <label class="fonte-opcao"><input type="radio" name="fonteProva" value="${k}" ${(e.fonteProva || 'arial') === k ? 'checked' : ''}>
                <span><small>${esc(v.nome)}</small><span class="fonte-amostra" style="font-family:${v.css}">1. Assinale a alternativa correta: a) 3/8 · b) 5/8</span></span></label>`).join('')}
          </div>
        </div>
        <button class="btn btn-primario">Salvar</button>
      </form>
    </div>`;
  const f = $('#fe', el);
  $('#logo-arq', el).onchange = async (ev) => {
    try {
      e.logo = await lerImagem(ev.target.files[0], 400);
      $('#logo-prev', el).src = e.logo;
      $('#logo-prev', el).style.display = '';
    } catch (er) { erro(er); }
  };
  $('#logo-tirar', el).onclick = () => { e.logo = ''; $('#logo-prev', el).style.display = 'none'; };
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    try {
      await api.put('/config/escola', { nome: f.nome.value, endereco: f.endereco.value, cidade: f.cidade.value, telefone: f.telefone.value, rodape: f.rodape.value, logo: e.logo, mostrarLogoPei: f.mostrarLogoPei.checked, fonteProva: f.fonteProva.value });
      toast('Dados da escola salvos.', 'ok');
      await recarregarConfig();
    } catch (er) { erro(er); }
  };
}

function abaDisciplinas(el) {
  const discs = [...estado.disciplinas].sort((a, b) => a.nome.localeCompare(b.nome));
  el.innerHTML = `
    <div class="card">
      <div class="flex entre"><span></span>
        <button class="btn btn-caneta btn-sm" id="nova-disc">${icone('mais')} Nova disciplina</button></div>
      <div class="tabela-wrap mt"><table class="tabela tabela-cartoes"><thead><tr><th>Disciplina</th><th>Assuntos</th><th>Situação</th><th></th></tr></thead>
      <tbody>${discs.map((d) => {
        const ass = estado.assuntos.filter((a) => a.disciplinaId === d.id).sort((a, b) => a.nome.localeCompare(b.nome));
        return `<tr data-d="${d.id}" style="${d.ativo === false ? 'opacity:.55' : ''}">
          <td class="titulo-linha td-titulo">${esc(d.nome)}</td>
          <td><div class="flex" style="gap:4px">${ass.map((a) => `<span class="etiqueta" data-a="${a.id}" style="cursor:pointer" title="Clique para renomear ou excluir">${esc(a.nome)}</span>`).join('')}
            <button class="btn btn-sm btn-fantasma" data-acao="novo-assunto">${icone('mais')} assunto</button></div></td>
          <td data-label="Situação">${d.ativo === false ? 'Inativa' : 'Ativa'}</td>
          <td class="td-acoes"><div class="acoes"><button class="btn btn-sm" data-acao="renomear">Renomear</button>
            <button class="btn btn-sm" data-acao="ativo">${d.ativo === false ? 'Ativar' : 'Desativar'}</button></div></td></tr>`;
      }).join('')}</tbody></table></div>
    </div>`;

  $('#nova-disc', el).onclick = async () => {
    const nome = await pedirTexto('Nova disciplina', 'Nome', { obrigatorio: true, textoOk: 'Criar' });
    if (!nome) return;
    try { await api.post('/config/disciplinas', { nome }); await recarregarConfig(); } catch (e) { erro(e); }
  };
  el.querySelector('tbody').addEventListener('click', async (ev) => {
    const linha = ev.target.closest('[data-d]');
    if (!linha) return;
    const d = estado.disciplinas.find((x) => x.id === linha.dataset.d);
    const etiqueta = ev.target.closest('[data-a]');
    const acao = ev.target.closest('[data-acao]')?.dataset.acao;
    try {
      if (etiqueta) {
        const a = estado.assuntos.find((x) => x.id === etiqueta.dataset.a);
        const nome = await pedirTexto('Assunto', 'Novo nome (deixe vazio e confirme para EXCLUIR o assunto)', { valor: a.nome, textoOk: 'Salvar' });
        if (nome === null) return;
        if (nome) await api.put('/config/assuntos/' + a.id, { nome });
        else if (await confirmar('Excluir assunto', `Excluir o assunto <b>${esc(a.nome)}</b>?`, 'Excluir', 'btn-caneta')) await api.del('/config/assuntos/' + a.id);
        else return;
      } else if (acao === 'novo-assunto') {
        const nome = await pedirTexto('Novo assunto de ' + d.nome, 'Nome do assunto', { obrigatorio: true, textoOk: 'Criar' });
        if (!nome) return;
        await api.post('/assuntos', { disciplinaId: d.id, nome });
      } else if (acao === 'renomear') {
        const nome = await pedirTexto('Renomear disciplina', 'Nome', { valor: d.nome, obrigatorio: true, textoOk: 'Salvar' });
        if (!nome) return;
        await api.put('/config/disciplinas/' + d.id, { nome });
      } else if (acao === 'ativo') {
        await api.put('/config/disciplinas/' + d.id, { ativo: d.ativo === false });
      } else return;
      await recarregarConfig();
    } catch (e) { erro(e); }
  });
}

function abaSeries(el) {
  el.innerHTML = `
    <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;align-items:start">
      <div class="card">
        <label class="campo"><span>Séries / anos — uma por linha</span><textarea id="series" rows="14">${esc(estado.series.join('\n'))}</textarea></label>
      </div>
      <div class="card">
        <label class="campo"><span>Turmas — uma por linha</span><textarea id="turmas" rows="8">${esc(estado.turmas.join('\n'))}</textarea></label>
        <small class="suave">Ex.: A, B, C</small>
      </div>
    </div>
    <button class="btn btn-primario mt" id="salvar">Salvar séries e turmas</button>`;
  $('#salvar', el).onclick = async () => {
    try {
      await api.put('/config/series', { series: $('#series', el).value.split('\n') });
      await api.put('/config/turmas', { turmas: $('#turmas', el).value.split('\n') });
      toast('Séries e turmas salvas.', 'ok');
      await recarregarConfig();
    } catch (e) { erro(e); }
  };
}

function abaPermissoes(el) {
  const perfis = Object.keys(estado.perfis);
  const fixas = estado.permissoesFixas.direcao || [];
  el.innerHTML = `
    <div class="card">
      
      <div class="tabela-wrap"><table class="tabela matriz">
        <thead><tr><th>Permissão</th>${perfis.map((p) => `<th>${esc(estado.perfis[p])}</th>`).join('')}</tr></thead>
        <tbody>${Object.entries(estado.catalogoPermissoes).map(([perm, desc]) => `
          <tr><td>${esc(desc)}<br><small><code>${perm}</code></small></td>
          ${perfis.map((p) => {
            const travada = p === 'direcao' && fixas.includes(perm);
            return `<td><input type="checkbox" data-p="${p}" data-perm="${perm}" ${(estado.permissoesPorPerfil[p] || []).includes(perm) || travada ? 'checked' : ''} ${travada ? 'disabled title="A direção sempre mantém esta permissão"' : ''}></td>`;
          }).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="flex mt"><button class="btn btn-primario" id="salvar">Salvar permissões</button>
        <button class="btn btn-fantasma" id="padrao">Exemplo: deixar professor imprimir as próprias provas aprovadas</button></div>
    </div>`;
  $('#padrao', el).onclick = () => {
    const c = $('input[data-p="professor"][data-perm="provas.imprimir"]', el);
    c.checked = true;
    toast('Marcado. Clique em “Salvar permissões” para aplicar.');
  };
  $('#salvar', el).onclick = async () => {
    const corpo = Object.fromEntries(perfis.map((p) => [p, $$(`input[data-p="${p}"]:checked`, el).map((c) => c.dataset.perm)]));
    try {
      await api.put('/config/permissoes', corpo);
      toast('Permissões salvas.', 'ok');
      await recarregarConfig();
    } catch (e) { erro(e); }
  };
}

function abaDados(el) {
  el.innerHTML = `
    <div class="card" style="max-width:760px">
      <h3>Backup</h3>
      <p>Baixe uma cópia completa (usuários, questões, provas e configurações). Faça isso com frequência e guarde fora deste computador.</p>
      <a class="btn btn-primario" href="/api/backup" download>${icone('baixar')} Baixar backup (.json)</a>
      <hr>
      <h3>Restaurar backup</h3>
      <p class="suave">Substitui todos os dados atuais.</p>
      <input type="file" accept=".json,application/json" id="arq-restaurar">
      <hr>
      <h3>Importar questões</h3>
      <p>Aceita um arquivo <code>.json</code> no formato <code>{"questoes": [...]}</code> — por exemplo o gerado pelo script <code>tools/importar_smartprof.py</code> a partir do pendrive SmartProfessor. Disciplinas e assuntos que não existirem são criados; as questões entram como <b>aprovadas</b>.</p>
      <input type="file" accept=".json,application/json" id="arq-importar">
      <div id="resultado-import" class="mt"></div>
    </div>`;

  const lerJson = (arquivo) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => { try { resolve(JSON.parse(r.result)); } catch { reject(new Error('O arquivo não é um JSON válido.')); } };
    r.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    r.readAsText(arquivo, 'utf-8');
  });

  $('#arq-restaurar', el).onchange = async (ev) => {
    const arq = ev.target.files[0];
    if (!arq) return;
    try {
      const dados = await lerJson(arq);
      if (!(await confirmar('Restaurar backup', `Substituir TODOS os dados atuais pelo backup <b>${esc(arq.name)}</b>? Todos serão desconectados.`, 'Restaurar', 'btn-caneta'))) return;
      await api.post('/restaurar', dados);
      toast('Backup restaurado. Entre novamente.', 'ok');
      setTimeout(() => location.reload(), 1200);
    } catch (e) { erro(e); } finally { ev.target.value = ''; }
  };

  $('#arq-importar', el).onchange = async (ev) => {
    const arq = ev.target.files[0];
    if (!arq) return;
    const out = $('#resultado-import', el);
    try {
      const dados = await lerJson(arq);
      const n = Array.isArray(dados.questoes) ? dados.questoes.length : 0;
      if (!n) throw new Error('Nenhuma questão encontrada no arquivo (esperado {"questoes": [...]}).');
      if (!(await confirmar('Importar questões', `Importar <b>${n}</b> questões de <b>${esc(arq.name)}</b>?`, 'Importar'))) return;
      out.innerHTML = '<p class="suave">Importando…</p>';
      const r = await api.post('/questoes/importar', dados);
      await recarregarConfig(); // redesenha a tela (novas disciplinas/assuntos)
      modal({
        titulo: 'Importação concluída',
        corpo: `<p><b>${r.criadas}</b> questões importadas${r.ignoradas ? `, <b>${r.ignoradas}</b> ignoradas` : ''}.</p>
          ${r.erros.length ? `<p class="suave">Primeiros problemas encontrados:</p><ul>${r.erros.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`,
        botoes: [{ texto: 'Ver no banco', classe: 'btn-primario', acao: () => { location.hash = '/banco'; } }, { texto: 'Fechar' }],
      });
    } catch (e) { out.innerHTML = ''; erro(e); } finally { ev.target.value = ''; }
  };
}
