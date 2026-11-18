// Habilidades da BNCC: catálogo (public/dados/bncc.json), sugestões por disciplina/série e campo de seleção.
import { esc, $ } from './ui.js';
import { icone } from './icones.js';

export const RE_BNCC = /^(EF\d{2}[A-Z]{2}\d{2}|EI\d{2}[A-Z]{2}\d{2}|EM13[A-Z]{3}\d{3})$/;
// encontra códigos escritos no texto, ex.: "1.(EF69AR04) Quanto à combinação..."
const RE_NO_TEXTO = /\b(EF\d{2}[A-Z]{2}\d{2}|EI\d{2}[A-Z]{2}\d{2}|EM13[A-Z]{3}\d{3})\b/g;

let catalogo = null; // [{ c, comp, d }]
let porCodigo = {};
let carregando = null;

export function carregarBncc() {
  if (catalogo) return Promise.resolve(catalogo);
  if (!carregando) {
    carregando = fetch('/dados/bncc.json')
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
      .then((lista) => {
        catalogo = lista;
        porCodigo = Object.fromEntries(lista.map((h) => [h.c, h]));
        return catalogo;
      });
  }
  return carregando;
}

export const descricaoBncc = (codigo) => (porCodigo[codigo] || {}).d || '';
export const codigosNoTexto = (texto) => [...new Set(String(texto || '').toUpperCase().match(RE_NO_TEXTO) || [])];

const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// Componente curricular da BNCC (Ensino Fundamental) a partir do nome da disciplina da escola.
// Comparação sem acento e por início do nome ("Artes Visuais" -> AR, "Matematica" -> MA).
const COMPONENTES = [
  ['lingua portuguesa', 'LP'], ['portugues', 'LP'], ['arte', 'AR'], ['educacao fisica', 'EF'], ['lingua inglesa', 'LI'],
  ['ingles', 'LI'], ['matematica', 'MA'], ['ciencias', 'CI'], ['geografia', 'GE'], ['historia', 'HI'], ['ensino religioso', 'ER'],
];
const siglaDa = (nomeDisciplina) => {
  const n = semAcento(nomeDisciplina);
  const achado = COMPONENTES.find(([nome]) => n === nome || n.startsWith(nome + ' ') || n.startsWith(nome + 's'));
  return achado ? achado[1] : '';
};

// Etapa e ano a partir do nome da série:
//   "6º ano EF", "6° ano", "6o ano" -> { etapa: 'EF', ano: 6 } ; "1ª série EM", "1º ano EM" -> { etapa: 'EM' }
//   "Infantil 5 anos", "Pré-escola" -> { etapa: 'EI' }
function etapaDaSerie(serie) {
  const s = semAcento(serie);
  if (!s) return { etapa: '', ano: null };
  if (/\bem\b|medio|serie/.test(s)) return { etapa: 'EM', ano: null };
  if (/infantil|creche|pre[- ]?escola|\bpre\b|bercario|maternal/.test(s)) return { etapa: 'EI', ano: null };
  const m = s.match(/(\d+)\s*[ºo°]?\s*ano/);
  return m ? { etapa: 'EF', ano: Number(m[1]) } : { etapa: '', ano: null };
}

// EF69AR04 vale do 6º ao 9º ano; EF06MA01 só no 6º; EF15AR02 do 1º ao 5º
function cobreAno(codigo, ano) {
  if (ano == null) return true;
  const a = Number(codigo[2]);
  const b = Number(codigo[3]);
  return a === 0 ? b === ano : ano >= a && ano <= b;
}

// Habilidades do catálogo que combinam com a disciplina, a série e o texto digitado.
// Sem correspondência segura (disciplina sem componente no fundamental, ensino médio, série desconhecida),
// não sugere nada — o professor ainda pode digitar o código.
export function sugerirBncc({ texto = '', disciplina = '', serie = '', limite = 8 } = {}) {
  if (!catalogo) return [];
  const { etapa, ano } = etapaDaSerie(serie);
  const sigla = siglaDa(disciplina);
  let aceita;
  if (etapa === 'EI') aceita = (c) => c.startsWith('EI');
  else if (etapa === 'EF' || (!serie && sigla)) {
    if (!sigla) return [];
    aceita = (c) => c.startsWith('EF') && c.slice(4, 6) === sigla && cobreAno(c, ano);
  } else return [];
  // busca tolerante a variações da palavra: "ortografia" acha "ortográfica", "frações" acha "fração"
  const raiz = (t) => (t.length > 5 ? t.slice(0, Math.max(4, t.length - 3)) : t);
  const termos = semAcento(texto).split(/\s+/).filter(Boolean).map(raiz);
  const res = [];
  for (const h of catalogo) {
    if (!aceita(h.c)) continue;
    const alvo = semAcento(h.c + ' ' + h.d);
    if (termos.every((t) => alvo.includes(t))) res.push(h);
    if (res.length >= limite) break;
  }
  return res;
}

// ---------------------------------------------------------------------------
// Campo de seleção de habilidades (chips + busca com sugestões)
//   montarCampoBncc(container, { valores, contexto: () => ({ disciplina, serie }), aoMudar })
// ---------------------------------------------------------------------------
export function montarCampoBncc(raiz, { valores = [], contexto = () => ({}), aoMudar = () => {} } = {}) {
  let codigos = [...valores];
  raiz.classList.add('campo-bncc');
  raiz.innerHTML = `
    <div class="bncc-chips" aria-live="polite"></div>
    <div class="bncc-busca">
      <input type="text" placeholder="Código (EF69AR04) ou palavra (ex.: cores, frações)" aria-label="Buscar habilidade BNCC" autocomplete="off">
      <div class="bncc-sugestoes" role="listbox" hidden></div>
    </div>`;
  const chips = $('.bncc-chips', raiz);
  const input = $('input', raiz);
  const lista = $('.bncc-sugestoes', raiz);

  const desenharChips = () => {
    chips.innerHTML = codigos.length
      ? codigos.map((c) => `<span class="chip-bncc" title="${esc(descricaoBncc(c))}"><b>${c}</b>
          <small>${esc(descricaoBncc(c).slice(0, 70))}${descricaoBncc(c).length > 70 ? '…' : ''}</small>
          <button type="button" data-tirar="${c}" aria-label="Remover ${c}">${icone('fechar', { tamanho: '15' })}</button></span>`).join('')
      : '<small class="suave">Nenhuma habilidade escolhida.</small>';
  };
  const adicionar = (c) => {
    c = String(c).toUpperCase().trim();
    if (!RE_BNCC.test(c) || codigos.includes(c)) return false;
    codigos.push(c);
    desenharChips();
    aoMudar(codigos);
    return true;
  };
  const sugerir = () => {
    const t = input.value.trim();
    const itens = sugerirBncc({ texto: t, ...contexto(), limite: 8 }).filter((h) => !codigos.includes(h.c));
    const digitado = t.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const extra = RE_BNCC.test(digitado) && !itens.some((h) => h.c === digitado) && !codigos.includes(digitado)
      ? `<button type="button" role="option" data-add="${digitado}"><b>${digitado}</b> <small>adicionar este código</small></button>` : '';
    lista.innerHTML = extra + itens.map((h) => `<button type="button" role="option" data-add="${h.c}"><b>${h.c}</b> <small>${esc(h.d.slice(0, 120))}${h.d.length > 120 ? '…' : ''}</small></button>`).join('')
      || '<div class="bncc-vazio">Nenhuma habilidade encontrada para esta disciplina/série.</div>';
    lista.hidden = false;
  };

  input.addEventListener('focus', () => carregarBncc().then(sugerir));
  input.addEventListener('input', sugerir);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const primeiro = lista.querySelector('[data-add]');
      if (primeiro && adicionar(primeiro.dataset.add)) { input.value = ''; sugerir(); }
    } else if (e.key === 'Escape') lista.hidden = true;
  });
  lista.addEventListener('mousedown', (e) => e.preventDefault()); // não perde o foco ao clicar
  lista.addEventListener('click', (e) => {
    const b = e.target.closest('[data-add]');
    if (b && adicionar(b.dataset.add)) { input.value = ''; sugerir(); input.focus(); }
  });
  input.addEventListener('blur', () => setTimeout(() => (lista.hidden = true), 120));
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tirar]');
    if (!b) return;
    codigos = codigos.filter((c) => c !== b.dataset.tirar);
    desenharChips();
    aoMudar(codigos);
  });

  carregarBncc().then(desenharChips);
  desenharChips();
  return {
    valor: () => [...codigos],
    adicionar,
  };
}
