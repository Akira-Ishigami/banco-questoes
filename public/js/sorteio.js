// Geração automática de prova: sorteia questões aprovadas do banco conforme os filtros.
import { embaralhar } from './ui.js';

const aleatorio = () => Math.random();

// cfg = { disciplinaId, serie, dificuldade: '1'|'2'|'3'|'mista', assuntos: [ids] (vazio = todos),
//         incluirSemSerie, evitarRepetidas, objetivas, discursivas }
// cfg.bncc = [códigos]: só entram questões que trabalham pelo menos uma dessas habilidades (vazio = todas)
export function candidatas(todas, cfg, tipo) {
  const assuntos = new Set(cfg.assuntos || []);
  const bncc = new Set(cfg.bncc || []);
  return todas.filter((q) =>
    q.status === 'aprovada' &&
    q.tipo === tipo &&
    q.disciplinaId === cfg.disciplinaId &&
    (q.serie === cfg.serie || (cfg.incluirSemSerie && !q.serie)) &&
    (!assuntos.size || assuntos.has(q.assuntoId)) &&
    (!bncc.size || (q.bncc || []).some((c) => bncc.has(c))) &&
    (cfg.dificuldade === 'mista' || String(q.dificuldade) === String(cfg.dificuldade))
  );
}

// Divide n questões entre os níveis 1, 2 e 3 de forma equilibrada (a sobra vai para "média" primeiro)
function cotasMista(n) {
  const base = Math.floor(n / 3);
  const cotas = { 1: base, 2: base, 3: base };
  const ordem = [2, 1, 3];
  for (let i = 0; i < n - base * 3; i++) cotas[ordem[i]]++;
  return cotas;
}

// Ordena o grupo colocando primeiro as questões ainda não usadas em outras provas
function priorizar(lista, usadas) {
  const novas = embaralhar(lista.filter((q) => !usadas.has(q.id)), aleatorio);
  const repetidas = embaralhar(lista.filter((q) => usadas.has(q.id)), aleatorio);
  return [...novas, ...repetidas];
}

function sortearTipo(todas, cfg, tipo, n, usadas, excluir) {
  if (!n) return [];
  const pool = candidatas(todas, cfg, tipo).filter((q) => !excluir.has(q.id));
  const evitar = cfg.evitarRepetidas ? usadas : new Set();
  if (cfg.dificuldade !== 'mista') return priorizar(pool, evitar).slice(0, n);

  // mista: tenta respeitar a cota de cada nível; se faltar, completa com o que houver
  const cotas = cotasMista(n);
  const escolhidas = [];
  for (const nivel of [1, 2, 3]) {
    escolhidas.push(...priorizar(pool.filter((q) => q.dificuldade === nivel), evitar).slice(0, cotas[nivel]));
  }
  if (escolhidas.length < n) {
    const ja = new Set(escolhidas.map((q) => q.id));
    escolhidas.push(...priorizar(pool.filter((q) => !ja.has(q.id)), evitar).slice(0, n - escolhidas.length));
  }
  // ordem de prova: das mais fáceis para as mais difíceis
  return escolhidas.sort((a, b) => a.dificuldade - b.dificuldade);
}

// Retorna { questoes, faltaram: {objetiva, discursiva} }
export function sortearProva(todas, cfg, usadas = new Set()) {
  const obj = sortearTipo(todas, cfg, 'objetiva', cfg.objetivas, usadas, new Set());
  const disc = sortearTipo(todas, cfg, 'discursiva', cfg.discursivas, usadas, new Set());
  return {
    questoes: [...obj, ...disc],
    faltaram: { objetiva: cfg.objetivas - obj.length, discursiva: cfg.discursivas - disc.length },
  };
}

// Troca uma questão por outra equivalente (mesmo tipo e, se possível, mesma dificuldade)
export function sortearSubstituta(todas, cfg, atual, idsNaProva, usadas = new Set()) {
  const pool = candidatas(todas, cfg, atual.tipo).filter((q) => !idsNaProva.has(q.id));
  const evitar = cfg.evitarRepetidas ? usadas : new Set();
  const mesmoNivel = pool.filter((q) => q.dificuldade === atual.dificuldade);
  return priorizar(mesmoNivel.length ? mesmoNivel : pool, evitar)[0] || null;
}

// ids de questões já usadas em outras provas da mesma disciplina e série
export function questoesUsadas(provas, cfg, ignorarProvaId) {
  const ids = new Set();
  provas
    .filter((p) => p.id !== ignorarProvaId && p.disciplinaId === cfg.disciplinaId && p.serie === cfg.serie)
    .forEach((p) => p.itens.forEach((it) => ids.add(it.questaoId)));
  return ids;
}
