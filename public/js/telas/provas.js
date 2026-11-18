// Provas: lista e detalhe com fluxo de aprovação. (A montagem fica em prova-montar.js)
import { api } from '../api.js';
import { esc, $, $$, toast, erro, confirmar, pedirTexto, dataBR, dataHoraBR } from '../ui.js';
import {
  estado, pode, badge, nomeDisciplina, nomeUsuario, montagem, cartaoQuestao, ultimoComentario, STATUS, DIFICULDADE_PROVA,
  fmtValor, rotuloPontos, somaValores,
} from '../estado.js';
import { ir } from '../nav.js';
import { icone } from '../icones.js';
import { mostrarHistorico } from './banco.js';

// ---------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------
let filtroStatus = '';
export async function telaProvas(el) {
  const provas = (await api.get('/provas')).sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
  const contar = (s) => provas.filter((p) => !s || p.status === s).length;
  const desenhar = () => {
    const lista = provas.filter((p) => !filtroStatus || p.status === filtroStatus);
    $('#tabela', el).innerHTML = lista.length ? `
      <div class="tabela-wrap"><table class="tabela tabela-cartoes">
        <thead><tr><th>Prova</th><th>Disciplina</th><th>Série / turma</th>${pode('provas.ver_todas') ? '<th>Professor(a)</th>' : ''}<th>Questões</th><th>Situação</th><th>Atualizada</th><th></th></tr></thead>
        <tbody>${lista.map((p) => `
          <tr>
            <td class="td-titulo"><a class="titulo-linha" href="#/provas/${p.id}">${esc(p.titulo)}</a><br><small>${esc(p.tipo)}${p.bimestre ? ' · ' + esc(p.bimestre) : ''}</small></td>
            <td data-label="Disciplina">${esc(nomeDisciplina(p.disciplinaId))}</td>
            <td data-label="Série / turma">${esc(p.serie)}${p.turma ? ' · ' + esc(p.turma) : ''}</td>
            ${pode('provas.ver_todas') ? `<td data-label="Professor(a)">${esc(nomeUsuario(p.autorId))}</td>` : ''}
            <td data-label="Questões">${p.itens.length}</td>
            <td data-label="Situação">${badge(p.status)}</td>
            <td data-label="Atualizada"><small>${dataBR(p.atualizadoEm)}</small></td>
            <td class="td-acoes"><div class="acoes"><a class="btn btn-sm" href="#/provas/${p.id}">Abrir</a></div></td>
          </tr>`).join('')}</tbody></table></div>`
      : `<div class="vazio"><strong>Nenhuma prova ${filtroStatus ? 'nesta situação' : 'ainda'}</strong>${pode('provas.criar') ? 'Clique em <b>' + icone('mais') + ' Nova prova</b> para gerar uma prova automática ou escolher as questões à mão.' : ''}</div>`;
    $$('.abas button', el).forEach((b) => b.classList.toggle('ativa', b.dataset.s === filtroStatus));
  };
  el.innerHTML = `
    <div class="cabecalho-pagina">
      <div><h1>${pode('provas.ver_todas') ? 'Provas da escola' : 'Minhas provas'}</h1></div>
      <div class="acoes">${pode('provas.criar') ? '<a class="btn btn-caneta" href="#/provas/nova">' + icone('mais') + ' Nova prova</a>' : ''}</div>
    </div>
    <div class="abas">
      <button data-s="">Todas (${contar('')})</button>
      ${Object.entries(STATUS).map(([k, v]) => `<button data-s="${k}">${v} (${contar(k)})</button>`).join('')}
    </div>
    <div id="tabela"></div>`;
  $$('.abas button', el).forEach((b) => (b.onclick = () => { filtroStatus = b.dataset.s; desenhar(); }));
  desenhar();
}

// ---------------------------------------------------------------------------
// Detalhe
// ---------------------------------------------------------------------------
export async function telaProvaDetalhe(el, { params }) {
  const p = await api.get('/provas/' + params[0]);
  const eu = estado.eu.id;
  const autor = p.autorId === eu;
  const editavel = autor && ['rascunho', 'devolvida'].includes(p.status);

  const botoes = [];
  if (editavel) botoes.push('<button class="btn" data-a="editar">Editar</button>');
  if (editavel) botoes.push('<button class="btn btn-caneta" data-a="enviar">Enviar para revisão</button>');
  if (autor && p.status === 'em_revisao') botoes.push('<button class="btn" data-a="retirar">Retirar da revisão</button>');
  if (pode('provas.revisar') && p.status === 'em_revisao') {
    botoes.push('<button class="btn btn-perigo" data-a="devolver">Devolver com comentário</button>');
    botoes.push('<button class="btn btn-ok" data-a="aprovar">Aprovar prova</button>');
  }
  if (pode('provas.revisar') && ['aprovada', 'impressa'].includes(p.status)) botoes.push('<button class="btn" data-a="reabrir">Reabrir</button>');
  botoes.push(`<a class="btn btn-primario" href="#/imprimir/${p.id}">${pode('provas.imprimir') && ['aprovada', 'impressa'].includes(p.status) ? 'Imprimir' : 'Pré-visualizar'}</a>`);

  const extras = [];
  if (pode('provas.criar')) extras.push('<button class="btn btn-sm btn-fantasma" data-a="duplicar">Duplicar</button>');
  extras.push('<button class="btn btn-sm btn-fantasma" data-a="historico">Histórico</button>');
  if ((autor && editavel) || pode('config.gerenciar')) extras.push('<button class="btn btn-sm btn-fantasma btn-perigo" data-a="excluir">Excluir</button>');

  const valores = Object.fromEntries(p.itens.map((it) => [it.questaoId, it.valor]));
  const info = [
    ['Disciplina', nomeDisciplina(p.disciplinaId)], ['Série', p.serie], ['Turma', p.turma],
    ['Dificuldade', DIFICULDADE_PROVA[p.dificuldade] || ''], ['Montagem', p.modo === 'auto' ? 'Automática (sorteio)' : 'Manual'], ['Etapa', p.bimestre],
    ['Aplicação', p.data ? dataBR(p.data + 'T12:00') : ''], ['Valor total', p.valorTotal], ['Soma dos valores', somaValores(p.itens) ? fmtValor(somaValores(p.itens)) + ' pontos' : ''], ['Cópias', p.copias || ''],
    ['Professor(a)', nomeUsuario(p.autorId)], ['Versões', p.opcoes.versoes > 1 ? p.opcoes.versoes : 'Única'],
  ].filter(([, v]) => v);

  el.innerHTML = `
    <div class="cabecalho-pagina">
      <div><p>${esc(p.tipo)} nº ${p.numero} · ${badge(p.status)}</p><h1>${esc(p.titulo)}</h1></div>
      <div class="acoes">${botoes.join('')}</div>
    </div>
    ${p.status === 'devolvida' ? ultimoComentario(p) + '<div style="height:16px"></div>' : ''}
    ${p.status === 'aprovada' || p.status === 'impressa' ? `<p class="suave" style="font-size:.88rem">${icone('cadeado')} Aprovada: alterações no banco não mudam esta prova.</p>` : ''}
    <div class="form-questao">
      <div id="questoes">${p.questoes.map((q, i) => cartaoQuestao(q, {
        numero: i + 1, mostrarStatus: !p.snapshot && q.status !== 'aprovada', // questão ainda não aprovada fica visível ao revisor
        acoes: rotuloPontos(valores[q.id]) ? `<span class="etiqueta etiqueta-valor">Vale ${rotuloPontos(valores[q.id])}</span>` : '',
      })).join('') || '<div class="vazio"><strong>Sem questões</strong></div>'}</div>
      <aside style="position:sticky;top:20px">
        <div class="card">
          <h3>Dados</h3>
          <table class="tabela"><tbody>${info.map(([k, v]) => `<tr><td class="suave">${k}</td><td><strong>${esc(v)}</strong></td></tr>`).join('')}</tbody></table>
          ${p.instrucoes ? `<p class="mt" style="font-size:.9rem"><span class="rotulo">Instruções</span><br>${esc(p.instrucoes)}</p>` : ''}
          <div class="acoes mt">${extras.join('')}</div>
        </div>
        <div class="card"><h3>Últimos passos</h3>
          <ul class="historico">${p.historico.slice(-5).reverse().map((h) => `<li><strong>${esc(h.usuarioNome)}</strong> ${esc(h.acao)}${h.comentario ? `<div class="coment">“${esc(h.comentario)}”</div>` : ''}<div class="quando">${dataHoraBR(h.data)}</div></li>`).join('')}</ul>
        </div>
      </aside>
    </div>`;

  el.querySelector('.cabecalho-pagina').addEventListener('click', acao);
  el.querySelector('aside').addEventListener('click', acao);

  async function acao(e) {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    try {
      switch (b.dataset.a) {
        case 'editar': {
          const atual = montagem.ler();
          if (atual.itens.length && atual.alterada && atual.provaId !== p.id) {
            if (!(await confirmar('Prova em montagem', `Você tem outra prova em montagem com ${atual.itens.length} questão(ões) não salva(s). Substituir pela edição desta prova?`, 'Substituir', 'btn-caneta'))) return;
          }
          const { titulo, tipo, disciplinaId, serie, turma, dificuldade, modo, auto, bimestre, data, valorTotal, valorTotalAuto, instrucoes, copias, opcoes } = p;
          montagem.salvar({ provaId: p.id, dados: { titulo, tipo, disciplinaId, serie, turma, dificuldade, modo, auto, bimestre, data, valorTotal, valorTotalAuto, instrucoes, copias, opcoes }, itens: p.itens.map((x) => ({ ...x, valor: fmtValor(x.valor) })), alterada: false });
          return ir('/provas/montar');
        }
        case 'enviar': {
          const comentario = await pedirTexto('Enviar para revisão', 'Recado para a supervisão (opcional)', { textoOk: 'Enviar' });
          if (comentario === null) return;
          await api.post(`/provas/${p.id}/enviar`, { comentario });
          toast('Prova enviada para revisão.', 'ok');
          break;
        }
        case 'retirar':
          await api.post(`/provas/${p.id}/reabrir`, {});
          toast('Prova voltou para rascunho.');
          break;
        case 'aprovar':
          if (!(await confirmar('Aprovar prova', 'Aprovar esta prova? Ela irá para a fila de impressão da direção.', 'Aprovar', 'btn-ok'))) return;
          await api.post(`/provas/${p.id}/revisar`, { decisao: 'aprovar' });
          toast('Prova aprovada e enviada à fila de impressão.', 'ok');
          break;
        case 'devolver': {
          const c = await pedirTexto('Devolver prova', 'O que o professor precisa ajustar?', { obrigatorio: true, textoOk: 'Devolver', classe: 'btn-caneta' });
          if (!c) return;
          await api.post(`/provas/${p.id}/revisar`, { decisao: 'devolver', comentario: c });
          toast('Prova devolvida ao professor.');
          break;
        }
        case 'reabrir': {
          const c = await pedirTexto('Reabrir prova', 'Motivo (o professor verá este comentário)', { obrigatorio: true, textoOk: 'Reabrir', classe: 'btn-caneta' });
          if (!c) return;
          await api.post(`/provas/${p.id}/reabrir`, { comentario: c });
          toast('Prova reaberta e devolvida ao professor.');
          break;
        }
        case 'duplicar': {
          const nova = await api.post(`/provas/${p.id}/duplicar`);
          toast('Cópia criada.', 'ok');
          return ir('/provas/' + nova.id);
        }
        case 'historico':
          return mostrarHistorico(p);
        case 'excluir':
          if (!(await confirmar('Excluir prova', `Excluir <strong>${esc(p.titulo)}</strong>? Isso não pode ser desfeito.`, 'Excluir', 'btn-caneta'))) return;
          await api.del('/provas/' + p.id);
          toast('Prova excluída.');
          return ir('/provas');
      }
      telaProvaDetalhe(el, { params });
    } catch (er) {
      erro(er);
    }
  }
}
