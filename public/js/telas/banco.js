// Banco de questões: filtros à esquerda, lista de questões, botão "adicionar à prova".
import { api } from '../api.js';
import { esc, $, $$, toast, erro, confirmar, modal, textoPuro, dataHoraBR } from '../ui.js';
import {
  estado, pode, cartaoQuestao, montagem, fmtValor, disciplinasAtivas, assuntosDa, DIFICULDADE, ORIGENS, STATUS,
} from '../estado.js';
import { ir } from '../nav.js';
import { icone } from '../icones.js';
import { descricaoBncc } from '../bncc.js';

const POR_PAGINA = 20;
const filtrosSalvos = {}; // mantém filtros ao voltar para a tela (por escopo)

// Montagem manual: abre o banco já filtrado pela disciplina, série e dificuldade da prova
export function filtrarBancoPara({ disciplinaId = '', serie = '', dificuldade = '', bncc = [] }) {
  filtrosSalvos.banco = {
    texto: '', assuntoId: '', tipo: '', origem: '', status: '', autorId: '', gabarito: true, _iniciado: true,
    bncc: (bncc || []).join(' '), // várias habilidades: o banco mostra questões de qualquer uma delas
    disciplinaId, serie, dificuldade: dificuldade === 'mista' ? '' : String(dificuldade || ''),
  };
}

export async function telaBanco(el, { query }) {
  const escopo = query.escopo === 'minhas' ? 'minhas' : query.escopo === 'todas' ? 'todas' : 'banco';
  const revisor = pode('questoes.revisar') || pode('questoes.editar_todas');
  let todas = await api.get('/questoes');
  const f = (filtrosSalvos[escopo] = filtrosSalvos[escopo] || {
    texto: '', disciplinaId: '', assuntoId: '', serie: '', tipo: '', dificuldade: '', origem: '', status: '', autorId: '', bncc: '', gabarito: true,
  });
  // professor: começa filtrando pela 1ª disciplina dele
  if (!f._iniciado) {
    f._iniciado = true;
    if (escopo === 'banco' && estado.eu.disciplinas.length === 1) f.disciplinaId = estado.eu.disciplinas[0];
  }
  let pagina = 1;

  const titulos = {
    banco: ['Banco de questões'],
    minhas: ['Minhas questões'],
    todas: ['Todas as questões'],
  };

  el.innerHTML = `
    <div class="cabecalho-pagina">
      <div><h1>${titulos[escopo][0]}</h1></div>
      <div class="acoes">
        ${revisor ? `<div class="abas" style="margin:0;border:0">
          <button data-escopo="banco" class="${escopo === 'banco' ? 'ativa' : ''}">Aprovadas</button>
          <button data-escopo="todas" class="${escopo === 'todas' ? 'ativa' : ''}">Todas</button>
          <button data-escopo="minhas" class="${escopo === 'minhas' ? 'ativa' : ''}">Minhas</button></div>` : ''}
        ${pode('questoes.criar') ? '<a class="btn btn-caneta" href="#/questoes/nova">' + icone('mais') + ' Cadastrar questão</a>' : ''}
      </div>
    </div>
    <button class="btn btn-filtros" id="btn-filtros" aria-expanded="false" aria-controls="painel-filtros" style="width:100%;margin-bottom:12px">${icone('filtros')} Filtros <span id="n-filtros"></span></button>
    <div class="banco">
      <aside class="filtros" id="painel-filtros"><div class="card">
        <h3>Filtros <button class="btn btn-fantasma btn-sm" id="limpar">Limpar</button></h3>
        <label class="campo"><span>Buscar</span><input type="search" id="f-texto" placeholder="Palavra no enunciado ou código" value="${esc(f.texto)}"></label>
        <label class="campo"><span>Disciplina</span><select id="f-disciplinaId"><option value="">Todas</option>
          ${disciplinasAtivas().map((d) => `<option value="${d.id}">${esc(d.nome)}</option>`).join('')}</select></label>
        <label class="campo"><span>Assunto</span><select id="f-assuntoId"></select></label>
        <label class="campo"><span>Série / ano</span><select id="f-serie"><option value="">Todas</option>
          ${estado.series.map((s) => `<option>${esc(s)}</option>`).join('')}</select></label>
        <div class="grade" style="grid-template-columns:1fr 1fr">
          <label class="campo"><span>Tipo</span><select id="f-tipo"><option value="">Todos</option><option value="objetiva">Objetiva</option><option value="discursiva">Discursiva</option></select></label>
          <label class="campo"><span>Dificuldade</span><select id="f-dificuldade"><option value="">Todas</option>
            ${Object.entries(DIFICULDADE).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
        </div>
        <label class="campo"><span>Habilidade BNCC</span><input type="search" id="f-bncc" list="lista-bncc" placeholder="Ex.: EF69AR04 ou EF69AR" value="${esc(f.bncc || '')}" autocomplete="off">
          <datalist id="lista-bncc">${[...new Set(todas.flatMap((q) => q.bncc || []))].sort().map((c) => `<option value="${c}">${esc(descricaoBncc(c).slice(0, 90))}</option>`).join('')}</datalist></label>
        <label class="campo"><span>Origem</span><select id="f-origem"><option value="">Todas</option>${ORIGENS.map((o) => `<option>${o}</option>`).join('')}</select></label>
        ${escopo !== 'banco' ? `<label class="campo"><span>Situação</span><select id="f-status"><option value="">Todas</option>
          ${Object.entries(STATUS).filter(([k]) => k !== 'impressa').map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>` : ''}
        ${escopo !== 'minhas' && revisor ? `<label class="campo"><span>Autor</span><select id="f-autorId"><option value="">Todos</option>
          ${estado.usuarios.map((u) => `<option value="${u.id}">${esc(u.nome)}</option>`).join('')}</select></label>` : ''}
        <label class="check"><input type="checkbox" id="f-gabarito" ${f.gabarito ? 'checked' : ''}> Mostrar gabarito</label>
        <button class="btn btn-primario btn-filtros mt" id="ver-resultados" style="width:100%">Ver resultados</button>
      </div></aside>
      <section>
        <div class="resultado-topo"><strong id="contagem"></strong>
          ${pode('provas.criar') ? '<button class="btn btn-sm" id="add-todas">' + icone('mais') + ' Adicionar todas desta página à prova</button>' : ''}</div>
        <div id="lista"></div>
        <div class="flex" style="justify-content:center"><button class="btn oculto" id="mais">Carregar mais</button></div>
      </section>
    </div>
    <div id="barra"></div>`;

  // aplica valores salvos nos selects
  ['disciplinaId', 'serie', 'tipo', 'dificuldade', 'origem', 'status', 'autorId'].forEach((k) => {
    const s = $('#f-' + k, el);
    if (s) s.value = f[k];
  });
  const preencherAssuntos = () => {
    const sel = $('#f-assuntoId', el);
    const lista = f.disciplinaId ? assuntosDa(f.disciplinaId) : [];
    sel.innerHTML = `<option value="">${f.disciplinaId ? 'Todos' : 'Escolha a disciplina'}</option>` + lista.map((a) => `<option value="${a.id}">${esc(a.nome)}</option>`).join('');
    sel.disabled = !f.disciplinaId;
    if (!lista.some((a) => a.id === f.assuntoId)) f.assuntoId = '';
    sel.value = f.assuntoId;
  };
  preencherAssuntos();

  $$('[data-escopo]', el).forEach((b) => (b.onclick = () => ir('/banco' + (b.dataset.escopo === 'banco' ? '' : '?escopo=' + b.dataset.escopo))));

  function filtradas() {
    const termo = f.texto.trim().toLowerCase();
    return todas
      .filter((q) => {
        if (escopo === 'banco' && q.status !== 'aprovada') return false;
        if (escopo === 'minhas' && q.autorId !== estado.eu.id) return false;
        if (f.disciplinaId && q.disciplinaId !== f.disciplinaId) return false;
        if (f.assuntoId && q.assuntoId !== f.assuntoId) return false;
        if (f.serie && q.serie !== f.serie) return false;
        if (f.tipo && q.tipo !== f.tipo) return false;
        if (f.dificuldade && String(q.dificuldade) !== f.dificuldade) return false;
        if (f.origem && q.origem !== f.origem) return false;
        // aceita o código completo (EF69AR04), só o começo (EF69AR = todas de Arte do 6º ao 9º)
        // ou vários códigos separados por espaço/vírgula (questões de qualquer um deles)
        const filtrosBncc = String(f.bncc || '').toUpperCase().split(/[\s,;]+/).filter(Boolean);
        if (filtrosBncc.length && !(q.bncc || []).some((c) => filtrosBncc.some((p) => c.startsWith(p)))) return false;
        if (f.status && q.status !== f.status) return false;
        if (f.autorId && q.autorId !== f.autorId) return false;
        if (termo) {
          const alvo = (q.codigo + ' ' + textoPuro(q.enunciado) + ' ' + q.alternativas.map((a) => a.texto).join(' ')).toLowerCase();
          if (!alvo.includes(termo)) return false;
        }
        return true;
      })
      .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
  }

  function acoesDe(q) {
    const eu = estado.eu.id;
    const dono = q.autorId === eu;
    const b = [];
    b.push(`<button class="btn btn-fantasma btn-sm" data-acao="historico">Histórico</button>`);
    if (dono && ['rascunho', 'devolvida'].includes(q.status)) b.push(`<button class="btn btn-sm" data-acao="enviar">Enviar p/ revisão</button>`);
    if (pode('questoes.revisar') && q.status === 'em_revisao') b.push(`<a class="btn btn-sm" href="#/revisao">Revisar</a>`);
    if ((dono && q.status !== 'em_revisao') || pode('questoes.editar_todas')) b.push(`<a class="btn btn-sm" href="#/questoes/${q.id}/editar">Editar</a>`);
    if ((dono && q.status !== 'aprovada') || pode('questoes.excluir_todas')) b.push(`<button class="btn btn-sm btn-perigo" data-acao="excluir">Excluir</button>`);
    if (pode('provas.criar') && (q.status === 'aprovada' || dono)) {
      const na = montagem.tem(q.id);
      b.push(`<button class="btn btn-sm ${na ? 'btn-ok' : 'btn-primario'}" data-acao="prova">${na ? icone('check') + ' Na prova' : icone('mais') + ' Adicionar à prova'}</button>`);
    }
    return b.join('');
  }

  function desenhar() {
    const lista = filtradas();
    const visiveis = lista.slice(0, pagina * POR_PAGINA);
    $('#contagem', el).textContent = `${lista.length} ${lista.length === 1 ? 'questão encontrada' : 'questões encontradas'}`;
    const ativos = ['texto', 'disciplinaId', 'assuntoId', 'serie', 'tipo', 'dificuldade', 'origem', 'status', 'autorId', 'bncc'].filter((k) => String(f[k] || '').trim()).length;
    $('#n-filtros', el).textContent = ativos ? `(${ativos} ativo${ativos > 1 ? 's' : ''}) · ${lista.length} questões` : `· ${lista.length} questões`;
    $('#ver-resultados', el).textContent = `Ver ${lista.length} ${lista.length === 1 ? 'resultado' : 'resultados'}`;
    $('#lista', el).innerHTML = visiveis.length
      ? visiveis.map((q, i) => cartaoQuestao(q, { numero: i + 1, gabarito: f.gabarito, acoes: acoesDe(q), mostrarStatus: escopo !== 'banco', selecionada: montagem.tem(q.id) })).join('')
      : `<div class="vazio"><strong>Nenhuma questão encontrada</strong>${escopo === 'minhas' ? 'Você ainda não cadastrou questões com esses filtros.' : 'Tente remover alguns filtros.'}
         ${pode('questoes.criar') ? '<p class="mt"><a class="btn btn-caneta" href="#/questoes/nova">' + icone('mais') + ' Cadastrar questão</a></p>' : ''}</div>`;
    $('#mais', el).classList.toggle('oculto', visiveis.length >= lista.length);
    desenharBarra();
  }

  function desenharBarra() {
    const m = montagem.ler();
    const barra = $('#barra', el);
    if (!barra) return;
    if (!pode('provas.criar') || !m.itens.length) return (barra.innerHTML = '');
    barra.innerHTML = `
      <div class="barra-montagem">
        <span><span class="qtd">${m.itens.length}</span> ${m.itens.length === 1 ? 'questão' : 'questões'} na prova ${m.provaId ? 'em edição' : 'em montagem'}${m.dados.titulo ? ` · <em>${esc(m.dados.titulo)}</em>` : ''}</span>
        <button class="btn btn-sm btn-fantasma" style="color:#fff" id="limpar-montagem">Esvaziar</button>
        <a class="btn btn-sm btn-caneta" href="#/provas/montar">Abrir prova ${icone('avancar')}</a>
      </div>`;
    $('#limpar-montagem', el).onclick = async () => {
      if (await confirmar('Esvaziar prova em montagem', 'Remover todas as questões da prova em montagem? (Provas já salvas não são afetadas.)', 'Esvaziar', 'btn-caneta')) {
        montagem.limpar();
        desenhar();
      }
    };
  }

  // eventos dos filtros
  const aoMudar = () => { pagina = 1; desenhar(); };
  let timer;
  $('#f-texto', el).oninput = (e) => { f.texto = e.target.value; clearTimeout(timer); timer = setTimeout(aoMudar, 200); };
  $('#f-bncc', el).oninput = (e) => { f.bncc = e.target.value; clearTimeout(timer); timer = setTimeout(aoMudar, 200); };
  ['disciplinaId', 'assuntoId', 'serie', 'tipo', 'dificuldade', 'origem', 'status', 'autorId'].forEach((k) => {
    const s = $('#f-' + k, el);
    if (!s) return;
    s.onchange = () => {
      f[k] = s.value;
      if (k === 'disciplinaId') preencherAssuntos();
      aoMudar();
    };
  });
  $('#f-gabarito', el).onchange = (e) => { f.gabarito = e.target.checked; desenhar(); };
  $('#limpar', el).onclick = () => {
    Object.assign(f, { texto: '', disciplinaId: '', assuntoId: '', serie: '', tipo: '', dificuldade: '', origem: '', status: '', autorId: '', bncc: '' });
    telaBanco(el, { query });
  };
  $('#mais', el).onclick = () => { pagina++; desenhar(); };
  // celular/tablet: filtros abrem e fecham
  const alternarFiltros = (abrir) => {
    $('#painel-filtros', el).classList.toggle('aberto', abrir);
    $('#btn-filtros', el).setAttribute('aria-expanded', String(abrir));
  };
  $('#btn-filtros', el).onclick = () => alternarFiltros(!$('#painel-filtros', el).classList.contains('aberto'));
  $('#ver-resultados', el).onclick = () => { alternarFiltros(false); $('#lista', el).scrollIntoView({ behavior: 'smooth' }); };
  const addTodas = $('#add-todas', el);
  if (addTodas) addTodas.onclick = () => {
    const m = montagem.ler();
    let n = 0;
    filtradas().slice(0, pagina * POR_PAGINA).filter((q) => q.status === 'aprovada' || q.autorId === estado.eu.id).forEach((q) => {
      if (!m.itens.some((i) => i.questaoId === q.id)) { m.itens.push({ questaoId: q.id, valor: fmtValor(q.valor) }); n++; }
    });
    m.alterada = true;
    montagem.salvar(m);
    toast(n ? `${n} questão(ões) adicionada(s) à prova.` : 'Todas já estavam na prova.', 'ok');
    desenhar();
  };

  // ações dos cartões
  $('#lista', el).addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-acao]');
    if (!b) return;
    const id = b.closest('.questao').dataset.id;
    const q = todas.find((x) => x.id === id);
    try {
      if (b.dataset.acao === 'prova') {
        const entrou = montagem.alternar(id, q.valor);
        toast(entrou ? 'Adicionada à prova em montagem.' : 'Removida da prova.', entrou ? 'ok' : '');
        desenhar();
      } else if (b.dataset.acao === 'enviar') {
        const nova = await api.post(`/questoes/${id}/enviar`);
        Object.assign(q, nova);
        toast('Questão enviada para a supervisão.', 'ok');
        desenhar();
      } else if (b.dataset.acao === 'excluir') {
        if (!(await confirmar('Excluir questão', `Excluir a questão <strong>${esc(q.codigo)}</strong>? Isso não pode ser desfeito.`, 'Excluir', 'btn-caneta'))) return;
        await api.del('/questoes/' + id);
        todas = todas.filter((x) => x.id !== id);
        if (montagem.tem(id)) montagem.alternar(id);
        toast('Questão excluída.');
        desenhar();
      } else if (b.dataset.acao === 'historico') {
        mostrarHistorico(q);
      }
    } catch (e) {
      erro(e);
    }
  });

  window.addEventListener('montagem-mudou', function ouvir() {
    if (!document.body.contains(el) || !$('#barra', el)) return window.removeEventListener('montagem-mudou', ouvir);
    desenharBarra();
  });

  desenhar();
}

export function mostrarHistorico(obj) {
  modal({
    titulo: 'Histórico — ' + (obj.codigo || obj.titulo),
    corpo: `<ul class="historico">${(obj.historico || []).slice().reverse().map((h) => `
      <li><div><strong>${esc(h.usuarioNome)}</strong> ${esc(h.acao)}</div>
      ${h.comentario ? `<div class="coment">“${esc(h.comentario)}”</div>` : ''}
      <div class="quando">${dataHoraBR(h.data)}</div></li>`).join('') || '<li>Sem registros.</li>'}</ul>`,
    botoes: [{ texto: 'Fechar' }],
    largura: 520,
  });
}
