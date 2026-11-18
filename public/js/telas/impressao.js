// Impressão: prova do aluno (versões embaralhadas), cartão-resposta e gabarito; fila de impressão.
import { api } from '../api.js';
import { esc, $, toast, erro, confirmar, sanitizar, rngComSemente, embaralhar, dataBR, dataHoraBR, LETRAS } from '../ui.js';
import { estado, pode, badge, nomeDisciplina, nomeUsuario, fmtValor, rotuloPontos, somaValores, familiaDaProva } from '../estado.js';
import { icone } from '../icones.js';

// ---------------------------------------------------------------------------
// Geração das versões
// ---------------------------------------------------------------------------
function gerarVersoes(prova) {
  const valores = Object.fromEntries(prova.itens.map((it) => [it.questaoId, it.valor]));
  const n = prova.opcoes.versoes || 1;
  const versoes = [];
  for (let v = 0; v < n; v++) {
    const letra = n > 1 ? 'ABCD'[v] : '';
    const rng = rngComSemente(prova.id + ':' + v);
    let itens = prova.questoes.map((q) => ({ q, valor: valores[q.id] || '' }));
    if (v > 0) itens = embaralhar(itens, rng); // versão A mantém a ordem original
    itens = itens.map(({ q, valor }) => {
      let alts = q.alternativas.map((a, i) => ({ ...a, original: i }));
      if (v > 0 && prova.opcoes.embaralharAlternativas && q.tipo === 'objetiva' && !q.alternativasNoEnunciado) alts = embaralhar(alts, rng);
      return { q, valor, alts, correta: alts.findIndex((a) => a.correta) };
    });
    versoes.push({ letra, itens });
  }
  return versoes;
}

const pts = (v) => (rotuloPontos(v) ? `(${rotuloPontos(v)})` : '');
// valor total: o informado na prova ou, se vazio, a soma dos valores das questões
const valorTotalDe = (prova) => prova.valorTotal || fmtValor(somaValores(prova.itens) || null);

const listaTurmas = (turma) => String(turma || '').split(/\s*,\s*|\s+e\s+/).filter(Boolean);
// "6º A (  )  6º B (  ) ..." — quando a prova é para várias turmas, o aluno marca a dele
const marcarTurmas = (prova) => {
  const serieCurta = String(prova.serie || '').replace(/\s*(ano|série)\s*(EF|EM)?\s*$/i, '').trim();
  return listaTurmas(prova.turma).map((t) => `<span class="turma-marcar">${esc(serieCurta ? serieCurta + ' ' + t : t)} (&nbsp;&nbsp;&nbsp;)</span>`).join(' ');
};
// título sem repetir o tipo: "1ª Avaliação de Artes" em vez de "Prova — 1ª Avaliação de Artes"
const tituloDaProva = (prova) => {
  const t = String(prova.titulo || '');
  return /prova|avalia|simulado|lista|recupera|atividade|trabalho/i.test(t) ? t : `${prova.tipo} — ${t}`;
};

function cabecalho(prova, versao, rotulo = '') {
  const e = estado.escola;
  return `
  <header class="cab-prova">
    <div class="cab-topo">
      ${e.logo ? `<img src="${e.logo}" class="cab-logo" alt="">` : ''}
      <div class="cab-escola"><strong>${esc(e.nome)}</strong>${e.endereco ? `<br>${esc(e.endereco)}` : ''}${e.cidade ? ` · ${esc(e.cidade)}` : ''}${e.telefone ? ` · ${esc(e.telefone)}` : ''}</div>
      ${e.mostrarLogoPei !== false ? '<img src="/img/logo-pei.png" class="cab-logo-pei" alt="PEI">' : ''}
      ${versao.letra ? `<div class="cab-versao"><small>VERSÃO</small>${versao.letra}</div>` : ''}
    </div>
    <table class="cab-campos">
      <tr><td colspan="3">Aluno(a): </td><td>Nº: </td></tr>
      ${listaTurmas(prova.turma).length > 1
        ? `<tr><td>Professor(a): <b>${esc(nomeUsuario(prova.autorId))}</b></td><td>Disciplina: <b>${esc(nomeDisciplina(prova.disciplinaId))}</b></td><td colspan="2">Série: <b>${esc(prova.serie)}</b></td></tr>
           <tr><td colspan="4">Marque sua turma: ${marcarTurmas(prova)}</td></tr>`
        : `<tr><td>Professor(a): <b>${esc(nomeUsuario(prova.autorId))}</b></td><td>Disciplina: <b>${esc(nomeDisciplina(prova.disciplinaId))}</b></td><td>Série: <b>${esc(prova.serie)}</b></td><td>Turma: <b>${esc(prova.turma)}</b></td></tr>`}
      <tr><td>Data: ${prova.data ? `<b>${dataBR(prova.data + 'T12:00')}</b>` : '____/____/______'}</td><td>${esc(prova.bimestre)}</td><td>Valor: <b>${esc(valorTotalDe(prova))}</b></td><td class="cab-nota">Nota:</td></tr>
    </table>
    <h1 class="cab-titulo">${rotulo || esc(tituloDaProva(prova))}</h1>
  </header>`;
}

function folhaProva(prova, versao) {
  return `
  <section class="folha">
    ${cabecalho(prova, versao)}
    ${prova.instrucoes ? `<div class="instrucoes"><b>Instruções:</b> ${esc(prova.instrucoes)}</div>` : ''}
    <div class="corpo-prova ${prova.opcoes.colunas === 2 ? 'duas-colunas' : ''}">
      ${versao.itens.map((it, i) => `
        <div class="q-prova">
          <div class="q-enunciado"><span class="q-num">${i + 1}.</span> ${prova.opcoes.mostrarBncc !== false && (it.q.bncc || []).length ? `<span class="q-bncc">(${it.q.bncc.join(', ')})</span> ` : ''}${pts(it.valor) ? `<span class="q-valor">${pts(it.valor)}</span> ` : ''}<div class="conteudo-rico">${sanitizar(it.q.enunciado)}</div></div>
          ${it.q.tipo === 'objetiva' && it.q.alternativasNoEnunciado ? ''
            : it.q.tipo === 'objetiva'
            ? `<ol class="q-alts">${it.alts.map((a, j) => `<li><span>${LETRAS[j].toLowerCase()})</span> ${esc(a.texto)}</li>`).join('')}</ol>`
            : `<div class="q-linhas">${'<div></div>'.repeat(it.q.linhas || 5)}</div>`}
        </div>`).join('')}
    </div>
    ${estado.escola.rodape ? `<footer class="rodape-prova">${esc(estado.escola.rodape)}</footer>` : ''}
  </section>`;
}

// Cartão-resposta. gabarito = true: o mesmo cartão com a bolinha certa preenchida de preto (gabarito do professor)
function folhaCartao(prova, versao, gabarito = false) {
  const objetivas = versao.itens.map((it, i) => ({ ...it, n: i + 1 }));
  return `
  <section class="folha">
    ${cabecalho(prova, versao, gabarito ? 'Gabarito — Cartão-resposta' : 'Cartão-resposta')}
    ${gabarito
      ? `<div class="faixa-gabarito"><strong>${icone('check')} GABARITO DO PROFESSOR</strong><span>Não entregar ao aluno${versao.letra ? ' · Versão ' + versao.letra : ''}</span></div>`
      : '<p class="instrucoes">Preencha completamente o círculo da alternativa escolhida, com caneta azul ou preta. Não rasure.</p>'}
    <div class="cartao">
      ${objetivas.map((it) => `
        <div class="cartao-linha"><span class="cartao-n">${String(it.n).padStart(2, '0')}</span>
          ${it.q.tipo === 'objetiva'
            ? it.alts.map((_, j) => (gabarito && j === it.correta
              ? `<span class="bolha cheia" aria-label="Resposta correta: ${LETRAS[j]}">${LETRAS[j]}</span>`
              : `<span class="bolha">${LETRAS[j]}</span>`)).join('')
            : `<em class="cartao-disc">${gabarito ? 'discursiva — correção pelo professor' : 'discursiva — responda na prova'}</em>`}
        </div>`).join('')}
    </div>
  </section>`;
}

// ---------------------------------------------------------------------------
// Tela de impressão
// ---------------------------------------------------------------------------
export async function telaImpressao(el, { params }) {
  const prova = await api.get('/provas/' + params[0]);
  const aprovada = ['aprovada', 'impressa'].includes(prova.status);
  const podeImprimir = pode('provas.imprimir') && aprovada;
  const versoes = gerarVersoes(prova);
  const opt = { prova: true, cartao: !!prova.opcoes.cartaoResposta && prova.questoes.some((q) => q.tipo === 'objetiva'), gabarito: false, bncc: prova.opcoes.mostrarBncc !== false, versao: 'todas', colunas: prova.opcoes.colunas, fonte: prova.opcoes.fonte };

  el.innerHTML = `
    <div class="modo-impressao">
      <div class="barra-impressao">
        <div class="bi-linha">
          <a class="btn btn-sm" href="#/provas/${prova.id}" aria-label="Voltar para a prova">${icone('voltar')}<span class="bi-txt"> Voltar</span></a>
          <strong class="bi-titulo">${esc(prova.titulo)}</strong> ${badge(prova.status)}
          <button class="btn btn-sm btn-primario" id="imprimir">${icone('impressora')} ${podeImprimir ? 'Imprimir' : 'Imprimir prévia'}</button>
        </div>
        <details class="bi-opcoes" id="bi-opcoes">
          <summary>Opções de impressão</summary>
          <div class="bi-campos">
            ${versoes.length > 1 ? `<select id="o-versao" class="bi-select" aria-label="Versão"><option value="todas">Todas as versões</option>${versoes.map((v) => `<option value="${v.letra}">Versão ${v.letra}</option>`).join('')}</select>` : ''}
            <label class="check"><input type="checkbox" id="o-prova" ${opt.prova ? 'checked' : ''}> Prova</label>
            ${prova.questoes.some((q) => (q.bncc || []).length) ? `<label class="check" title="Mostra o código da habilidade antes de cada questão"><input type="checkbox" id="o-bncc" ${opt.bncc ? 'checked' : ''}> Códigos BNCC</label>` : ''}
            <label class="check"><input type="checkbox" id="o-cartao" ${opt.cartao ? 'checked' : ''}> Cartão-resposta</label>
            <label class="check" title="Cartão-resposta com a bolinha certa preenchida — para o professor"><input type="checkbox" id="o-gabarito"> Gabarito (cartão marcado)</label>
            <select id="o-colunas" class="bi-select" aria-label="Colunas"><option value="1">1 coluna</option><option value="2">2 colunas</option></select>
            <select id="o-fonte" class="bi-select" aria-label="Tamanho da letra">${[11, 12, 13, 14].map((n) => `<option value="${n}">${n} pt</option>`).join('')}</select>
          </div>
        </details>
      </div>
      ${!aprovada ? '<div class="aviso-previa">Prévia — esta prova ainda não foi aprovada pela supervisão.</div><div class="marca-dagua">PRÉVIA · NÃO APROVADA</div>' : ''}
      <div id="folhas"></div>
    </div>`;
  $('#o-colunas', el).value = String(opt.colunas);
  $('#o-fonte', el).value = String(opt.fonte);
  // no computador as opções ficam sempre visíveis; no celular começam recolhidas
  if (window.matchMedia('(min-width: 901px)').matches) $('#bi-opcoes', el).open = true;

  const desenhar = () => {
    const vs = opt.versao === 'todas' ? versoes : versoes.filter((v) => v.letra === opt.versao);
    const prov = { ...prova, opcoes: { ...prova.opcoes, colunas: opt.colunas, mostrarBncc: opt.bncc } };
    const partes = [];
    vs.forEach((v) => {
      if (opt.prova) partes.push(folhaProva(prov, v));
      if (opt.cartao) partes.push(folhaCartao(prov, v));
    });
    if (opt.gabarito) vs.forEach((v) => partes.push(folhaCartao(prov, v, true)));
    const folhas = $('#folhas', el);
    folhas.style.setProperty('--fonte-prova', opt.fonte + 'pt');
    folhas.style.setProperty('--familia-prova', familiaDaProva());
    folhas.innerHTML = partes.join('') || '<div class="vazio" style="max-width:600px;margin:40px auto">Marque o que deseja imprimir.</div>';
  };

  const ligar = (id, k, conv = (x) => x) => {
    const c = $('#' + id, el);
    if (!c) return;
    c.onchange = () => { opt[k] = c.type === 'checkbox' ? c.checked : conv(c.value); desenhar(); };
  };
  ligar('o-versao', 'versao');
  ligar('o-prova', 'prova');
  ligar('o-cartao', 'cartao');
  ligar('o-bncc', 'bncc');
  ligar('o-gabarito', 'gabarito');
  ligar('o-colunas', 'colunas', Number);
  ligar('o-fonte', 'fonte', Number);

  $('#imprimir', el).onclick = () => {
    if (!podeImprimir) return window.print();
    const aposImprimir = async () => {
      window.removeEventListener('afterprint', aposImprimir);
      if (!opt.prova) return;
      const ok = await confirmar('Registrar impressão', `A impressão foi concluída? Isso marca a prova como <b>impressa</b>${prova.copias ? ` (${prova.copias} cópias solicitadas)` : ''} e tira da fila.`, 'Sim, registrar', 'btn-ok');
      if (!ok) return;
      try {
        const p = await api.post(`/provas/${prova.id}/imprimir`, { copias: prova.copias });
        prova.status = p.status;
        toast('Impressão registrada.', 'ok');
      } catch (e) { erro(e); }
    };
    window.addEventListener('afterprint', aposImprimir);
    window.print();
  };

  desenhar();
}

// ---------------------------------------------------------------------------
// Fila de impressão (direção)
// ---------------------------------------------------------------------------
export async function telaFilaImpressao(el) {
  const provas = await api.get('/provas');
  const quandoAprovada = (p) => ([...p.historico].reverse().find((h) => h.acao === 'aprovou') || {}).data;
  const fila = provas.filter((p) => p.status === 'aprovada').sort((a, b) => (a.data || '9999').localeCompare(b.data || '9999'));
  const feitas = provas.filter((p) => p.status === 'impressa').sort((a, b) => (b.impressaEm || '').localeCompare(a.impressaEm || '')).slice(0, 15);
  const totalCopias = fila.reduce((s, p) => s + (Number(p.copias) || 0), 0);

  const linha = (p, impressa) => `
    <tr>
      <td class="td-titulo"><a class="titulo-linha" href="#/provas/${p.id}">${esc(p.titulo)}</a><br><small>${esc(p.tipo)} · ${p.itens.length} questões${p.opcoes.versoes > 1 ? ` · ${p.opcoes.versoes} versões` : ''}</small></td>
      <td data-label="Professor(a)">${esc(nomeUsuario(p.autorId))}</td>
      <td data-label="Disciplina">${esc(nomeDisciplina(p.disciplinaId))}<br><small>${esc(p.serie)} ${esc(p.turma)}</small></td>
      <td data-label="Aplicação">${p.data ? `<strong>${dataBR(p.data + 'T12:00')}</strong>` : '<small>sem data</small>'}</td>
      <td data-label="Cópias">${p.copias || '—'}</td>
      <td data-label="Situação"><small>${impressa ? 'Impressa ' + dataHoraBR(p.impressaEm) : 'Aprovada ' + dataHoraBR(quandoAprovada(p))}</small></td>
      <td class="td-acoes"><div class="acoes"><a class="btn btn-sm ${impressa ? '' : 'btn-primario'}" href="#/imprimir/${p.id}">${icone('impressora')} ${impressa ? 'Reimprimir' : 'Imprimir'}</a></div></td>
    </tr>`;
  const cab = '<thead><tr><th>Prova</th><th>Professor(a)</th><th>Disciplina / série</th><th>Aplicação</th><th>Cópias</th><th>Situação</th><th></th></tr></thead>';

  el.innerHTML = `
    <div class="cabecalho-pagina"><div><h1>Fila de impressão</h1></div></div>
    <div class="stats">
      <div class="stat ${fila.length ? 'destaque' : ''}"><div class="num">${fila.length}</div><div class="rot">provas aguardando impressão</div></div>
      <div class="stat"><div class="num">${totalCopias}</div><div class="rot">cópias solicitadas na fila</div></div>
    </div>
    <div class="card"><h3>Aguardando</h3>
      ${fila.length ? `<div class="tabela-wrap"><table class="tabela tabela-cartoes">${cab}<tbody>${fila.map((p) => linha(p, false)).join('')}</tbody></table></div>` : '<p class="suave">Nenhuma prova aguardando impressão.</p>'}
    </div>
    <div class="card"><h3>Impressas recentemente</h3>
      ${feitas.length ? `<div class="tabela-wrap"><table class="tabela tabela-cartoes">${cab}<tbody>${feitas.map((p) => linha(p, true)).join('')}</tbody></table></div>` : '<p class="suave">Nenhuma ainda.</p>'}
    </div>`;
}
