// Estado global do app + "prova em montagem" (carrinho de questões, igual ao estuda.com)
import { api } from './api.js';
import { esc, sanitizar, textoPuro, LETRAS } from './ui.js';
import { descricaoBncc } from './bncc.js';
import { icone } from './icones.js';

export const estado = { eu: null };

export async function carregarBootstrap() {
  Object.assign(estado, await api.get('/bootstrap'));
}

export const pode = (perm) => !!estado.eu && estado.eu.permissoes.includes(perm);
export const nomeDisciplina = (id) => (estado.disciplinas.find((d) => d.id === id) || {}).nome || '—';
export const nomeAssunto = (id) => (estado.assuntos.find((a) => a.id === id) || {}).nome || '';
export const nomeUsuario = (id) => (estado.usuarios.find((u) => u.id === id) || {}).nome || '—';
export const disciplinasAtivas = () => estado.disciplinas.filter((d) => d.ativo !== false).sort((a, b) => a.nome.localeCompare(b.nome));
export const assuntosDa = (discId) => estado.assuntos.filter((a) => a.disciplinaId === discId).sort((a, b) => a.nome.localeCompare(b.nome));

export const STATUS = { rascunho: 'Rascunho', em_revisao: 'Em revisão', aprovada: 'Aprovada', devolvida: 'Devolvida', impressa: 'Impressa' };
export const DIFICULDADE = { 1: 'Fácil', 2: 'Média', 3: 'Difícil' };
export const DIFICULDADE_PROVA = { 1: 'Fácil', 2: 'Média', 3: 'Difícil', mista: 'Mista (fáceis, médias e difíceis)' };
export const ORIGENS = ['Autoral', 'Livro didático', 'ENEM', 'Vestibular', 'Olimpíada', 'Concurso', 'Prova Brasil/SAEB', 'Outra'];
export const TIPOS_PROVA = ['Prova', 'Simulado', 'Recuperação', 'Lista de exercícios', 'Atividade', 'Trabalho'];

// ---------- fonte da prova impressa (configurada pela escola) ----------
export const FONTES_PROVA = {
  arial: { nome: 'Arial (padrão)', css: "Arial, Helvetica, 'Liberation Sans', sans-serif" },
  times: { nome: 'Times New Roman', css: "'Times New Roman', Times, 'Liberation Serif', serif" },
  verdana: { nome: 'Verdana (letras mais abertas, boa para os anos iniciais)', css: "Verdana, Geneva, 'DejaVu Sans', sans-serif" },
  publicsans: { nome: 'Public Sans (mesma fonte do sistema)', css: "'Public Sans', Arial, sans-serif" },
};
export const familiaDaProva = () => (FONTES_PROVA[estado.escola && estado.escola.fonteProva] || FONTES_PROVA.arial).css;

// ---------- valor (peso) da questão ----------
// número -> "0,5"; vazio/nulo -> ""
export const fmtValor = (v) => {
  const n = numValor(v);
  return n == null ? '' : String(Math.round(n * 100) / 100).replace('.', ',');
};
// "0,5" | 0.5 | "" -> número ou null
export function numValor(v) {
  if (v == null) return null;
  const t = String(v).trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
export const rotuloPontos = (v) => {
  const n = numValor(v);
  return n == null ? '' : `${fmtValor(n)} ${n < 2 ? 'ponto' : 'pontos'}`;
};
export const somaValores = (itens) => Math.round(itens.reduce((t, it) => t + (numValor(it.valor) || 0), 0) * 100) / 100;

export const badge = (status) => `<span class="status st-${status}">${STATUS[status] || status}</span>`;
// dificuldade em 3 pontos (cheios = nível)
export const bolinhas = (d) => `<span class="dif" title="Dificuldade: ${DIFICULDADE[d] || '—'}" aria-label="Dificuldade: ${DIFICULDADE[d] || '—'}">${[1, 2, 3].map((n) => `<i class="${n <= d ? 'on' : ''}"></i>`).join('')}</span>`;

export function ultimoComentario(obj) {
  const h = [...(obj.historico || [])].reverse().find((x) => x.comentario && /devolveu|reabriu/.test(x.acao));
  return h ? `<div class="comentario-revisao"><span class="rotulo">Comentário de ${esc(h.usuarioNome)}:</span> ${esc(h.comentario)}</div>` : '';
}

// Cartão de questão reutilizado no banco, revisão e detalhe da prova
export function cartaoQuestao(q, { numero = '', gabarito = true, acoes = '', mostrarStatus = true, selecionada = false } = {}) {
  const meta = [
    `<strong>${esc(q.codigo)}</strong>`,
    `<span class="etiqueta">${esc(nomeDisciplina(q.disciplinaId))}</span>`,
    q.assuntoId ? `<span class="etiqueta">${esc(nomeAssunto(q.assuntoId))}</span>` : '',
    q.serie ? `<span class="etiqueta">${esc(q.serie)}</span>` : '',
    `<span class="etiqueta">${q.tipo === 'objetiva' ? 'Objetiva' : 'Discursiva'}</span>`,
    bolinhas(q.dificuldade),
    numValor(q.valor) != null ? `<span class="etiqueta etiqueta-valor" title="Valor sugerido da questão">${rotuloPontos(q.valor)}</span>` : '',
    (q.bncc || []).map((c) => `<span class="etiqueta etiqueta-bncc" title="BNCC ${c}: ${esc(descricaoBncc(c))}">${c}</span>`).join(' '),
    q.origem && q.origem !== 'Autoral' ? `<span class="etiqueta">${esc(q.origem)}${q.fonte ? ' · ' + esc(q.fonte) : ''}</span>` : '',
    mostrarStatus ? badge(q.status) : '',
  ].join(' ');
  const certa = q.alternativas.findIndex((a) => a.correta);
  const alternativas = q.tipo !== 'objetiva' ? ''
    : q.alternativasNoEnunciado
      ? `<p class="mt"><span class="etiqueta">Alternativas ${LETRAS[0]}–${LETRAS[q.alternativas.length - 1]} no enunciado</span></p>
         <div class="gabarito-box"><span class="rotulo">Gabarito:</span> <strong>${LETRAS[certa] || '?'}</strong></div>`
      : `<ol class="alternativas">${q.alternativas.map((a, i) => `<li class="${a.correta ? 'correta' : ''}"><span class="letra">${LETRAS[i]})</span><span>${esc(a.texto)}</span></li>`).join('')}</ol>`;
  const gab = q.tipo === 'discursiva'
    ? (textoPuro(q.respostaEsperada)
      ? `<div class="gabarito-box"><span class="rotulo">Resposta esperada:</span> <div class="conteudo-rico">${sanitizar(q.respostaEsperada)}</div></div>`
      : `<p class="mt"><span class="etiqueta">${icone('lapis')} Discursiva · ${q.linhas || 5} linhas · correção pelo professor</span></p>`)
    : q.resolucao ? `<div class="gabarito-box"><span class="rotulo">Resolução:</span> ${esc(q.resolucao)}</div>` : '';
  return `
  <article class="questao ${gabarito ? '' : 'ocultar-gabarito'} ${selecionada ? 'selecionada' : ''}" data-id="${q.id}">
    <div class="num-q">${numero}</div>
    <div class="meta">${meta}</div>
    <div class="enunciado conteudo-rico">${sanitizar(q.enunciado)}</div>
    ${alternativas}
    ${gab}
    ${q.status === 'devolvida' ? ultimoComentario(q) : ''}
    <div class="rodape-q"><small>Por ${esc(nomeUsuario(q.autorId))}</small><div class="acoes">${acoes}</div></div>
  </article>`;
}

// ---------------------------------------------------------------------------
// Prova em montagem — guardada no navegador até ser salva no servidor
// ---------------------------------------------------------------------------
const chave = () => 'montagem:' + estado.eu.id;
const vazia = () => ({ provaId: null, dados: {}, itens: [], alterada: false });

export const montagem = {
  ler() {
    try {
      return JSON.parse(localStorage.getItem(chave())) || vazia();
    } catch {
      return vazia();
    }
  },
  salvar(m) {
    try {
      localStorage.setItem(chave(), JSON.stringify(m));
    } catch {
      /* armazenamento indisponível: segue só em memória */
    }
    window.dispatchEvent(new CustomEvent('montagem-mudou'));
  },
  limpar() {
    try { localStorage.removeItem(chave()); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('montagem-mudou'));
  },
  tem(id) {
    return this.ler().itens.some((i) => i.questaoId === id);
  },
  // valor = valor sugerido da questão (já entra preenchido na prova)
  alternar(id, valor = '') {
    const m = this.ler();
    const i = m.itens.findIndex((x) => x.questaoId === id);
    if (i >= 0) m.itens.splice(i, 1);
    else m.itens.push({ questaoId: id, valor: fmtValor(valor) });
    m.alterada = true;
    this.salvar(m);
    return i < 0;
  },
};
