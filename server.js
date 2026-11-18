// Banco de Questões — servidor em Node.js puro (sem dependências).
// Uso: node server.js   (porta padrão 3000; mude com PORT=8080 node server.js)
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_BODY = 25 * 1024 * 1024; // questões podem ter imagens em base64
const SESSION_HOURS = 12;

// ---------------------------------------------------------------------------
// Permissões e perfis
// ---------------------------------------------------------------------------
const PERMISSOES = {
  'questoes.criar': 'Cadastrar questões com gabarito',
  'questoes.editar_todas': 'Editar questões de outros usuários',
  'questoes.revisar': 'Aprovar ou devolver questões',
  'questoes.excluir_todas': 'Excluir questões de outros usuários',
  'provas.criar': 'Montar provas e listas',
  'provas.ver_todas': 'Ver provas de todos os professores',
  'provas.revisar': 'Aprovar ou devolver provas',
  'provas.imprimir': 'Imprimir provas aprovadas (fila de impressão)',
  'usuarios.gerenciar': 'Cadastrar e editar usuários',
  'config.gerenciar': 'Configurar escola, disciplinas, séries e permissões',
  'dados.backup': 'Exportar/restaurar backup e importar questões',
};

const PERFIS = {
  professor: 'Professor(a)',
  supervisao: 'Supervisão / Coordenação',
  direcao: 'Direção',
};

const PERMISSOES_PADRAO = {
  professor: ['questoes.criar', 'provas.criar'],
  supervisao: ['questoes.criar', 'questoes.editar_todas', 'questoes.revisar', 'provas.criar', 'provas.ver_todas', 'provas.revisar'],
  direcao: Object.keys(PERMISSOES),
};

// Fontes disponíveis para a prova impressa (Arial é o padrão das provas da escola)
const FONTES_PROVA = ['arial', 'times', 'verdana', 'publicsans'];

// A direção nunca perde estas permissões (evita trancar o sistema).
const PERMISSOES_FIXAS_DIRECAO = ['usuarios.gerenciar', 'config.gerenciar'];

// ---------------------------------------------------------------------------
// Banco de dados em arquivo JSON
// ---------------------------------------------------------------------------
let db;

function uid(prefix) {
  return prefix + '_' + crypto.randomBytes(6).toString('hex');
}
function agora() {
  return new Date().toISOString();
}
function hashSenha(senha, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(senha), salt, 32).toString('hex');
  return { salt, hash };
}
function confereSenha(senha, user) {
  if (!user.salt || !user.hash) return false;
  const { hash } = hashSenha(senha, user.salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.hash, 'hex'));
}

function carregarDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    migrar();
  } else {
    db = require('./seed.js')({ uid, agora, hashSenha, PERMISSOES_PADRAO });
    salvarDb();
    console.log('  Banco criado em data/db.json com dados de exemplo.');
  }
}

function migrar() {
  db.config = db.config || {};
  db.config.permissoes = db.config.permissoes || JSON.parse(JSON.stringify(PERMISSOES_PADRAO));
  db.seq = db.seq || { questao: db.questoes.length, prova: db.provas.length };
  db.config.turmas = db.config.turmas || ['A', 'B', 'C', 'D', 'E', 'Única'];
  if (db.config.escola && db.config.escola.mostrarLogoPei === undefined) db.config.escola.mostrarLogoPei = true;
  if (db.config.escola && !FONTES_PROVA.includes(db.config.escola.fonteProva)) db.config.escola.fonteProva = 'arial';
  db.provas.forEach((p) => {
    if (!p.dificuldade) p.dificuldade = 'mista';
    if (!p.modo) p.modo = 'manual';
    // versões antigas guardavam o valor do item como texto ("2", "1,5")
    p.itens.forEach((it) => {
      if (typeof it.valor === 'string') {
        const n = Number(it.valor.replace(',', '.'));
        it.valor = it.valor.trim() && Number.isFinite(n) ? n : null;
      }
    });
  });
}

function salvarDb() {
  // grava em arquivo temporário e renomeia: evita corromper o banco se o PC desligar no meio
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DB_FILE);
}

function permissoesDo(user) {
  const lista = new Set((db.config.permissoes[user.perfil] || []).filter((p) => PERMISSOES[p]));
  if (user.perfil === 'direcao') PERMISSOES_FIXAS_DIRECAO.forEach((p) => lista.add(p));
  return [...lista];
}
function pode(user, perm) {
  return permissoesDo(user).includes(perm);
}
function usuarioPublico(u) {
  return { id: u.id, nome: u.nome, login: u.login, perfil: u.perfil, disciplinas: u.disciplinas || [], ativo: u.ativo !== false };
}

// ---------------------------------------------------------------------------
// Sessões (em memória — reiniciar o servidor desloga todos)
// ---------------------------------------------------------------------------
const sessoes = new Map();

function lerCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((par) => {
    const i = par.indexOf('=');
    if (i > 0) out[par.slice(0, i).trim()] = decodificar(par.slice(i + 1).trim()) ?? "";
  });
  return out;
}
function usuarioDaRequisicao(req) {
  const sid = lerCookies(req).sid;
  const s = sid && sessoes.get(sid);
  if (!s) return null;
  if (s.expira < Date.now()) {
    sessoes.delete(sid);
    return null;
  }
  const u = db.usuarios.find((x) => x.id === s.userId);
  if (!u || u.ativo === false) return null;
  return u;
}

// ---------------------------------------------------------------------------
// Utilidades de validação
// ---------------------------------------------------------------------------
class HttpError extends Error {
  constructor(status, msg) {
    super(msg);
    this.status = status;
  }
}
const falha = (status, msg) => {
  throw new HttpError(status, msg);
};
const txt = (v, max = 500) => String(v == null ? '' : v).trim().slice(0, max);
// Valor/peso de questão: aceita "0,5", "0.5", "1"; vazio = sem valor. Guarda como número (até 2 casas).
function lerValor(v, rotulo = 'Valor') {
  const t = String(v == null ? '' : v).trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) falha(400, rotulo + ' inválido: use um número como 0,5 ou 2.');
  if (n > 100) falha(400, rotulo + ' muito alto (máximo 100).');
  return Math.round(n * 100) / 100;
}
// Habilidades da BNCC: EF69AR04 (fundamental), EI03EO01 (infantil), EM13LGG101 (médio)
const RE_BNCC = /^(EF\d{2}[A-Z]{2}\d{2}|EI\d{2}[A-Z]{2}\d{2}|EM13[A-Z]{3}\d{3})$/;
function lerBncc(v, { importando = false } = {}) {
  const lista = (Array.isArray(v) ? v : String(v || '').split(/[\s,;]+/))
    .map((c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .filter(Boolean);
  const validos = [];
  for (const c of lista) {
    if (!RE_BNCC.test(c)) {
      if (importando) continue;
      falha(400, 'Código BNCC inválido: ' + c + ' (exemplo de código: EF69AR04).');
    }
    if (!validos.includes(c)) validos.push(c);
  }
  if (validos.length > 6) falha(400, 'No máximo 6 habilidades BNCC por questão.');
  return validos;
}
const formatarValor = (n) => (n == null || n === '' ? '' : String(n).replace('.', ','));
const semTags = (html) => String(html || '').replace(/<img[^>]*>/gi, '[img]').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();

function registrar(obj, user, acao, comentario) {
  obj.historico = obj.historico || [];
  obj.historico.push({ data: agora(), usuarioId: user.id, usuarioNome: user.nome, acao, comentario: comentario ? txt(comentario, 2000) : '' });
}

// ---------------------------------------------------------------------------
// Questões
// ---------------------------------------------------------------------------
// importando = true relaxa série/dificuldade (material externo nem sempre traz essa informação)
function normalizarQuestao(b, { importando = false } = {}) {
  const tipo = b.tipo === 'discursiva' ? 'discursiva' : 'objetiva';
  const difOk = [1, 2, 3].includes(Number(b.dificuldade));
  if (!difOk && !importando) falha(400, 'Escolha a dificuldade da questão.');
  const q = {
    disciplinaId: txt(b.disciplinaId, 60),
    assuntoId: txt(b.assuntoId, 60),
    serie: txt(b.serie, 60),
    tipo,
    dificuldade: difOk ? Number(b.dificuldade) : 2,
    origem: txt(b.origem, 60) || 'Autoral',
    fonte: txt(b.fonte, 200),
    enunciado: String(b.enunciado || ''),
    alternativas: [],
    // alternativas desenhadas no próprio enunciado (ex.: imagem escaneada): guarda só letras + gabarito
    alternativasNoEnunciado: tipo === 'objetiva' && !!b.alternativasNoEnunciado,
    respostaEsperada: String(b.respostaEsperada || ''),
    resolucao: String(b.resolucao || ''),
    linhas: Math.max(0, Math.min(40, Number(b.linhas) || 0)),
    valor: lerValor(b.valor, 'Valor da questão'),
    bncc: lerBncc(b.bncc, { importando }),
  };
  if (!db.config.disciplinas.some((d) => d.id === q.disciplinaId)) falha(400, 'Escolha a disciplina.');
  if (!q.serie && !importando) falha(400, 'Escolha a série / ano da questão.');
  if (q.assuntoId && !db.config.assuntos.some((a) => a.id === q.assuntoId)) q.assuntoId = '';
  if (!semTags(q.enunciado)) falha(400, 'O enunciado é obrigatório.');
  if (q.alternativasNoEnunciado) {
    const lista = Array.isArray(b.alternativas) ? b.alternativas : [];
    const n = Math.max(2, Math.min(6, lista.length || 5));
    const certa = lista.findIndex((a) => a && a.correta);
    if (certa < 0 || certa >= n) falha(400, 'Marque a letra correta (gabarito).');
    q.alternativas = Array.from({ length: n }, (_, i) => ({ texto: 'ABCDEF'[i], correta: i === certa }));
  } else if (tipo === 'objetiva') {
    q.alternativas = (Array.isArray(b.alternativas) ? b.alternativas : [])
      .map((a) => ({ texto: String(a.texto || '').trim().slice(0, 5000), correta: !!a.correta }))
      .filter((a) => a.texto);
    if (q.alternativas.length < 2) falha(400, 'Uma questão objetiva precisa de pelo menos 2 alternativas.');
    if (q.alternativas.length > 6) falha(400, 'Máximo de 6 alternativas.');
    if (q.alternativas.filter((a) => a.correta).length !== 1) falha(400, 'Marque exatamente uma alternativa correta (gabarito).');
  } else {
    // discursiva não precisa de gabarito: a resposta esperada é opcional (orientação para quem corrige)
    if (!semTags(q.respostaEsperada)) q.respostaEsperada = '';
    if (!q.linhas) q.linhas = 5;
  }
  return q;
}

function podeVerQuestao(user, q) {
  return q.autorId === user.id || q.status === 'aprovada' || pode(user, 'questoes.revisar') || pode(user, 'questoes.editar_todas');
}
function podeEditarQuestao(user, q) {
  if (pode(user, 'questoes.editar_todas')) return true;
  return q.autorId === user.id && q.status !== 'em_revisao';
}
function acharQuestao(id) {
  return db.questoes.find((q) => q.id === id) || falha(404, 'Questão não encontrada.');
}

// ---------------------------------------------------------------------------
// Provas
// ---------------------------------------------------------------------------
// Questão que este usuário pode colocar numa prova: aprovada (visível a todos) ou de sua autoria.
// Impede incluir questões que ele não pode ver (em revisão ou rascunho de outra pessoa).
const podeUsarNaProva = (user, q) => q.status === 'aprovada' || q.autorId === user.id;

// Retorna { p, removidas }: removidas = questões descartadas por não poderem estar na prova
function normalizarProva(b, user) {
  const p = {
    titulo: txt(b.titulo, 200),
    tipo: txt(b.tipo, 40) || 'Prova',
    disciplinaId: txt(b.disciplinaId, 60),
    serie: txt(b.serie, 60),
    turma: txt(b.turma, 60),
    dificuldade: ['1', '2', '3', 'mista'].includes(String(b.dificuldade)) ? String(b.dificuldade) : '',
    modo: b.modo === 'auto' ? 'auto' : 'manual',
    // filtros escolhidos na criação (assuntos, BNCC...) e quantidades do sorteio — valem nos dois modos
    auto: b.auto && typeof b.auto === 'object' ? {
      objetivas: Math.max(0, Math.min(100, Math.floor(Number(b.auto.objetivas) || 0))),
      discursivas: Math.max(0, Math.min(100, Math.floor(Number(b.auto.discursivas) || 0))),
      assuntos: (Array.isArray(b.auto.assuntos) ? b.auto.assuntos : []).map((x) => txt(x, 60)).slice(0, 200),
      bncc: lerBncc(b.auto.bncc, { importando: true }),
      incluirSemSerie: !!b.auto.incluirSemSerie,
      evitarRepetidas: b.auto.evitarRepetidas !== false,
    } : null,
    bimestre: txt(b.bimestre, 40),
    data: txt(b.data, 20),
    valorTotal: txt(b.valorTotal, 10),
    instrucoes: txt(b.instrucoes, 3000),
    copias: Math.max(0, Math.min(5000, Number(b.copias) || 0)),
    itens: [],
    opcoes: {
      colunas: Number(b.opcoes && b.opcoes.colunas) === 2 ? 2 : 1,
      fonte: [11, 12, 13, 14].includes(Number(b.opcoes && b.opcoes.fonte)) ? Number(b.opcoes.fonte) : 12,
      versoes: Math.max(1, Math.min(4, Number(b.opcoes && b.opcoes.versoes) || 1)),
      embaralharAlternativas: !!(b.opcoes && b.opcoes.embaralharAlternativas),
      cartaoResposta: !(b.opcoes && b.opcoes.cartaoResposta === false),
      mostrarBncc: !(b.opcoes && b.opcoes.mostrarBncc === false),
    },
  };
  if (!p.titulo) falha(400, 'Dê um título para a prova.');
  if (!db.config.disciplinas.some((d) => d.id === p.disciplinaId)) falha(400, 'Escolha a disciplina da prova.');
  if (!p.serie) falha(400, 'Escolha a série / ano da prova.');
  if (!p.turma) falha(400, 'Escolha a(s) turma(s) da prova.');
  if (!p.dificuldade) falha(400, 'Escolha a dificuldade da prova.');
  const vistos = new Set();
  let removidas = 0;
  for (const it of Array.isArray(b.itens) ? b.itens : []) {
    const id = txt(it.questaoId, 60);
    if (!id || vistos.has(id)) continue;
    const q = db.questoes.find((x) => x.id === id);
    if (!q || !podeUsarNaProva(user, q)) {
      removidas++;
      continue;
    }
    vistos.add(id);
    p.itens.push({ questaoId: id, valor: lerValor(it.valor, 'Valor da questão ' + (p.itens.length + 1)) });
  }
  // valor total: enquanto não for digitado pelo professor, acompanha a soma dos valores das questões
  const soma = Math.round(p.itens.reduce((t, it) => t + (it.valor || 0), 0) * 100) / 100;
  p.valorTotalAuto = b.valorTotalAuto === true || !p.valorTotal;
  if (p.valorTotalAuto) p.valorTotal = soma > 0 ? formatarValor(soma) : '';
  return { p, removidas };
}

// ids de questões já usadas em provas de uma disciplina/série (de todos os professores) — só os ids
function questoesUsadasEm(disciplinaId, serie, ignorarProvaId) {
  const ids = new Set();
  db.provas
    .filter((p) => p.id !== ignorarProvaId && p.disciplinaId === disciplinaId && p.serie === serie)
    .forEach((p) => p.itens.forEach((it) => ids.add(it.questaoId)));
  return [...ids];
}

function podeVerProva(user, p) {
  if (p.autorId === user.id) return true;
  if (p.status === 'rascunho') return false;
  return pode(user, 'provas.ver_todas') || pode(user, 'provas.revisar') || pode(user, 'provas.imprimir');
}
function acharProva(id) {
  return db.provas.find((p) => p.id === id) || falha(404, 'Prova não encontrada.');
}
function provaCompleta(p) {
  // após aprovada, a prova usa a cópia congelada das questões (snapshot)
  const questoes = p.snapshot || p.itens.map((it) => db.questoes.find((q) => q.id === it.questaoId)).filter(Boolean);
  return { ...p, questoes };
}

// ---------------------------------------------------------------------------
// Rotas
// ---------------------------------------------------------------------------
const rotas = [];
function rota(metodo, padrao, acesso, fn) {
  const chaves = [];
  const re = new RegExp('^' + padrao.replace(/:(\w+)/g, (_, k) => (chaves.push(k), '([^/]+)')) + '$');
  rotas.push({ metodo, re, chaves, acesso, fn });
}

// --- autenticação
// Proteção contra tentativas repetidas de senha: após 8 erros seguidos, o computador espera 15 minutos
const TENTATIVAS_MAX = 8;
const BLOQUEIO_MS = 15 * 60e3;
const tentativas = new Map(); // ip -> { erros, ate }

rota('POST', '/api/login', 'publico', (ctx) => {
  const ip = ctx.req.socket.remoteAddress || '?';
  const t = tentativas.get(ip) || { erros: 0, ate: 0 };
  if (t.ate > Date.now()) {
    const min = Math.ceil((t.ate - Date.now()) / 60e3);
    falha(429, `Muitas tentativas de entrada. Aguarde ${min} minuto(s) e tente de novo.`);
  }
  const login = txt(ctx.body.login, 80).toLowerCase();
  const u = db.usuarios.find((x) => x.login.toLowerCase() === login);
  if (!u || u.ativo === false || !confereSenha(ctx.body.senha || '', u)) {
    t.erros += 1;
    if (t.erros >= TENTATIVAS_MAX) {
      t.erros = 0;
      t.ate = Date.now() + BLOQUEIO_MS;
      console.warn(`  [segurança] ${TENTATIVAS_MAX} senhas erradas seguidas vindas de ${ip}: bloqueado por 15 minutos.`);
    }
    tentativas.set(ip, t);
    falha(401, 'Usuário ou senha incorretos.');
  }
  tentativas.delete(ip);
  const sid = crypto.randomBytes(24).toString('hex');
  sessoes.set(sid, { userId: u.id, expira: Date.now() + SESSION_HOURS * 3600e3 });
  ctx.setCookie(`sid=${sid}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_HOURS * 3600}`);
  return { ok: true };
});
rota('POST', '/api/logout', 'publico', (ctx) => {
  const sid = lerCookies(ctx.req).sid;
  if (sid) sessoes.delete(sid);
  ctx.setCookie('sid=; HttpOnly; Path=/; Max-Age=0');
  return { ok: true };
});
rota('POST', '/api/minha-senha', 'logado', (ctx) => {
  const u = ctx.user;
  if (!confereSenha(ctx.body.atual || '', u)) falha(400, 'Senha atual incorreta.');
  if (String(ctx.body.nova || '').length < 6) falha(400, 'A nova senha precisa ter pelo menos 6 caracteres.');
  Object.assign(u, hashSenha(ctx.body.nova));
  salvarDb();
  return { ok: true };
});

// --- dados iniciais do app
rota('GET', '/api/bootstrap', 'logado', (ctx) => ({
  eu: { ...usuarioPublico(ctx.user), permissoes: permissoesDo(ctx.user) },
  escola: db.config.escola,
  series: db.config.series,
  turmas: db.config.turmas,
  disciplinas: db.config.disciplinas,
  assuntos: db.config.assuntos,
  usuarios: db.usuarios.map((u) => ({ id: u.id, nome: u.nome, perfil: u.perfil })),
  perfis: PERFIS,
  catalogoPermissoes: PERMISSOES,
  permissoesPorPerfil: db.config.permissoes,
  permissoesFixas: { direcao: PERMISSOES_FIXAS_DIRECAO },
}));

// --- resumo leve para painel e contadores do menu (evita baixar o banco inteiro com imagens)
rota('GET', '/api/resumo', 'logado', (ctx) => {
  const u = ctx.user;
  const qs = db.questoes.filter((q) => podeVerQuestao(u, q));
  const ps = db.provas.filter((p) => podeVerProva(u, p));
  const porDisciplina = {};
  qs.filter((q) => q.status === 'aprovada').forEach((q) => (porDisciplina[q.disciplinaId] = (porDisciplina[q.disciplinaId] || 0) + 1));
  return {
    questoesAprovadas: qs.filter((q) => q.status === 'aprovada').length,
    minhasQuestoes: qs.filter((q) => q.autorId === u.id).length,
    minhasDevolvidas: qs.filter((q) => q.autorId === u.id && q.status === 'devolvida').length,
    questoesEmRevisao: pode(u, 'questoes.revisar') ? qs.filter((q) => q.status === 'em_revisao').length : 0,
    provasEmRevisao: pode(u, 'provas.revisar') ? ps.filter((p) => p.status === 'em_revisao').length : 0,
    filaImpressao: pode(u, 'provas.imprimir') ? ps.filter((p) => p.status === 'aprovada').length : 0,
    porDisciplina,
  };
});

// --- questões
rota('GET', '/api/questoes', 'logado', (ctx) => db.questoes.filter((q) => podeVerQuestao(ctx.user, q)));

rota('GET', '/api/questoes/:id', 'logado', (ctx) => {
  const q = acharQuestao(ctx.params.id);
  if (!podeVerQuestao(ctx.user, q)) falha(403, 'Sem acesso a esta questão.');
  return q;
});

rota('POST', '/api/questoes', 'questoes.criar', (ctx) => {
  const dados = normalizarQuestao(ctx.body);
  db.seq.questao += 1;
  const q = {
    id: uid('q'),
    codigo: 'Q' + String(db.seq.questao).padStart(4, '0'),
    ...dados,
    autorId: ctx.user.id,
    status: 'rascunho',
    criadoEm: agora(),
    atualizadoEm: agora(),
    historico: [],
  };
  registrar(q, ctx.user, 'criou');
  if (ctx.body.enviar) {
    q.status = 'em_revisao';
    registrar(q, ctx.user, 'enviou para revisão');
  }
  db.questoes.push(q);
  salvarDb();
  return q;
});

rota('PUT', '/api/questoes/:id', 'logado', (ctx) => {
  const q = acharQuestao(ctx.params.id);
  if (!podeEditarQuestao(ctx.user, q)) falha(403, 'Você não pode editar esta questão agora.');
  Object.assign(q, normalizarQuestao(ctx.body), { atualizadoEm: agora() });
  const ehRevisor = pode(ctx.user, 'questoes.editar_todas');
  if (!ehRevisor && q.status === 'aprovada') {
    q.status = 'rascunho'; // autor alterou questão aprovada: precisa de nova revisão
    registrar(q, ctx.user, 'editou (voltou para rascunho)');
  } else registrar(q, ctx.user, 'editou');
  if (ctx.body.enviar && q.status !== 'aprovada') {
    q.status = 'em_revisao';
    registrar(q, ctx.user, 'enviou para revisão');
  }
  salvarDb();
  return q;
});

rota('POST', '/api/questoes/:id/enviar', 'logado', (ctx) => {
  const q = acharQuestao(ctx.params.id);
  if (q.autorId !== ctx.user.id && !pode(ctx.user, 'questoes.editar_todas')) falha(403, 'Sem permissão.');
  if (!['rascunho', 'devolvida'].includes(q.status)) falha(400, 'A questão não está em rascunho.');
  q.status = 'em_revisao';
  registrar(q, ctx.user, 'enviou para revisão');
  salvarDb();
  return q;
});

rota('POST', '/api/questoes/:id/revisar', 'questoes.revisar', (ctx) => {
  const q = acharQuestao(ctx.params.id);
  if (q.status !== 'em_revisao') falha(400, 'Esta questão não está aguardando revisão (pode já ter sido revisada por outra pessoa).');
  const aprovar = ctx.body.decisao === 'aprovar';
  if (!aprovar && !txt(ctx.body.comentario)) falha(400, 'Explique ao autor o que precisa ser ajustado.');
  q.status = aprovar ? 'aprovada' : 'devolvida';
  registrar(q, ctx.user, aprovar ? 'aprovou' : 'devolveu para ajustes', ctx.body.comentario);
  salvarDb();
  return q;
});

rota('DELETE', '/api/questoes/:id', 'logado', (ctx) => {
  const q = acharQuestao(ctx.params.id);
  const dono = q.autorId === ctx.user.id && q.status !== 'aprovada';
  if (!dono && !pode(ctx.user, 'questoes.excluir_todas')) falha(403, 'Sem permissão para excluir esta questão.');
  const emUso = db.provas.filter((p) => p.itens.some((i) => i.questaoId === q.id));
  if (emUso.length) falha(400, `A questão está em ${emUso.length} prova(s): ${emUso.map((p) => p.titulo).join(', ')}. Retire-a dessas provas antes de excluir.`);
  db.questoes = db.questoes.filter((x) => x !== q);
  salvarDb();
  return { ok: true };
});

rota('POST', '/api/questoes/importar', 'dados.backup', (ctx) => {
  const lista = Array.isArray(ctx.body.questoes) ? ctx.body.questoes : falha(400, 'Arquivo sem lista "questoes".');
  const cfg = db.config;
  let criadas = 0;
  const erros = [];
  lista.forEach((item, i) => {
    try {
      const nomeDisc = txt(item.disciplina, 120);
      let disc = cfg.disciplinas.find((d) => d.nome.toLowerCase() === nomeDisc.toLowerCase());
      const discNova = !disc && nomeDisc ? { id: uid('d'), nome: nomeDisc, ativo: true } : null;
      if (discNova) { disc = discNova; cfg.disciplinas.push(disc); }
      const nomeAss = txt(item.assunto, 120);
      let ass = disc && nomeAss && cfg.assuntos.find((a) => a.disciplinaId === disc.id && a.nome.toLowerCase() === nomeAss.toLowerCase());
      const assNovo = !ass && disc && nomeAss ? { id: uid('a'), disciplinaId: disc.id, nome: nomeAss } : null;
      if (assNovo) { ass = assNovo; cfg.assuntos.push(ass); }
      let dados;
      try {
        dados = normalizarQuestao({ ...item, disciplinaId: disc && disc.id, assuntoId: ass && ass.id }, { importando: true });
      } catch (e) {
        // questão inválida: desfaz a disciplina/assunto criados só para ela
        if (assNovo) cfg.assuntos = cfg.assuntos.filter((a) => a !== assNovo);
        if (discNova) cfg.disciplinas = cfg.disciplinas.filter((d) => d !== discNova);
        throw e;
      }
      db.seq.questao += 1;
      const q = { id: uid('q'), codigo: 'Q' + String(db.seq.questao).padStart(4, '0'), ...dados, autorId: ctx.user.id, status: 'aprovada', criadoEm: agora(), atualizadoEm: agora(), historico: [] };
      registrar(q, ctx.user, 'importou', item.referencia ? 'Ref. original: ' + item.referencia : '');
      db.questoes.push(q);
      criadas++;
    } catch (e) {
      if (erros.length < 20) erros.push(`Item ${i + 1}: ${e.message}`);
    }
  });
  salvarDb();
  return { criadas, ignoradas: lista.length - criadas, erros };
});

// --- assuntos (professores podem criar ao cadastrar questão)
rota('POST', '/api/assuntos', 'questoes.criar', (ctx) => {
  const nome = txt(ctx.body.nome, 120);
  const disciplinaId = txt(ctx.body.disciplinaId, 60);
  if (!nome || !db.config.disciplinas.some((d) => d.id === disciplinaId)) falha(400, 'Informe disciplina e nome do assunto.');
  const existente = db.config.assuntos.find((a) => a.disciplinaId === disciplinaId && a.nome.toLowerCase() === nome.toLowerCase());
  if (existente) return existente;
  const a = { id: uid('a'), disciplinaId, nome };
  db.config.assuntos.push(a);
  salvarDb();
  return a;
});

// --- provas
rota('GET', '/api/provas', 'logado', (ctx) =>
  db.provas.filter((p) => podeVerProva(ctx.user, p)).map(({ snapshot, ...p }) => p)
);

rota('GET', '/api/provas/:id', 'logado', (ctx) => {
  const p = acharProva(ctx.params.id);
  if (!podeVerProva(ctx.user, p)) falha(403, 'Sem acesso a esta prova.');
  return provaCompleta(p);
});

rota('POST', '/api/provas', 'provas.criar', (ctx) => {
  const { p: dados, removidas } = normalizarProva(ctx.body, ctx.user);
  db.seq.prova += 1;
  const p = { id: uid('p'), numero: db.seq.prova, ...dados, autorId: ctx.user.id, status: 'rascunho', criadoEm: agora(), atualizadoEm: agora(), historico: [] };
  registrar(p, ctx.user, 'criou');
  db.provas.push(p);
  salvarDb();
  return { ...p, questoesRemovidas: removidas };
});

// ids das questões já usadas em provas da disciplina/série (de toda a escola), para o sorteio evitar repetir
rota('GET', '/api/questoes-usadas', 'provas.criar', (ctx) =>
  questoesUsadasEm(txt(ctx.query.disciplinaId, 60), txt(ctx.query.serie, 60), txt(ctx.query.ignorar, 60))
);

rota('PUT', '/api/provas/:id', 'logado', (ctx) => {
  const p = acharProva(ctx.params.id);
  if (p.autorId !== ctx.user.id) falha(403, 'Só o autor pode editar a prova.');
  if (!['rascunho', 'devolvida'].includes(p.status)) falha(400, 'A prova já foi enviada. Peça para a supervisão devolvê-la se precisar alterar.');
  const { p: dados, removidas } = normalizarProva(ctx.body, ctx.user);
  Object.assign(p, dados, { atualizadoEm: agora() });
  registrar(p, ctx.user, 'editou');
  salvarDb();
  return { ...p, questoesRemovidas: removidas };
});

rota('POST', '/api/provas/:id/enviar', 'logado', (ctx) => {
  const p = acharProva(ctx.params.id);
  if (p.autorId !== ctx.user.id) falha(403, 'Só o autor pode enviar a prova.');
  if (!['rascunho', 'devolvida'].includes(p.status)) falha(400, 'A prova já foi enviada.');
  p.itens = p.itens.filter((it) => db.questoes.some((q) => q.id === it.questaoId));
  if (!p.itens.length) falha(400, 'Adicione questões antes de enviar.');
  p.status = 'em_revisao';
  if (ctx.body.copias != null) p.copias = Math.max(0, Math.min(5000, Number(ctx.body.copias) || 0));
  registrar(p, ctx.user, 'enviou para revisão', ctx.body.comentario);
  salvarDb();
  return p;
});

rota('POST', '/api/provas/:id/revisar', 'provas.revisar', (ctx) => {
  const p = acharProva(ctx.params.id);
  if (p.status !== 'em_revisao') falha(400, 'A prova não está aguardando revisão.');
  const aprovar = ctx.body.decisao === 'aprovar';
  if (!aprovar && !txt(ctx.body.comentario)) falha(400, 'Explique ao professor o que precisa ser ajustado.');
  if (aprovar) {
    const questoes = provaCompleta(p).questoes;
    if (questoes.length !== p.itens.length) falha(400, 'A prova tem questões que não existem mais. Devolva ao professor para ajustar.');
    const pendentes = questoes.filter((q) => q.status !== 'aprovada');
    if (pendentes.length) {
      falha(400, `Antes de aprovar a prova, revise as questões que ainda não foram aprovadas: ${pendentes.map((q) => q.codigo).join(', ')}.`);
    }
    p.status = 'aprovada';
    p.snapshot = JSON.parse(JSON.stringify(questoes));
  } else {
    p.status = 'devolvida';
    delete p.snapshot;
  }
  registrar(p, ctx.user, aprovar ? 'aprovou' : 'devolveu para ajustes', ctx.body.comentario);
  salvarDb();
  return p;
});

rota('POST', '/api/provas/:id/imprimir', 'provas.imprimir', (ctx) => {
  const p = acharProva(ctx.params.id);
  if (!['aprovada', 'impressa'].includes(p.status)) falha(400, 'Só provas aprovadas podem ser impressas.');
  p.status = 'impressa';
  p.impressaEm = agora();
  registrar(p, ctx.user, 'registrou impressão', ctx.body.copias ? `${Number(ctx.body.copias)} cópias` : '');
  salvarDb();
  return p;
});

rota('POST', '/api/provas/:id/reabrir', 'logado', (ctx) => {
  // devolve a prova para rascunho (autor antes da revisão, ou revisor a qualquer momento)
  const p = acharProva(ctx.params.id);
  const autorPode = p.autorId === ctx.user.id && p.status === 'em_revisao';
  const revisorPode = pode(ctx.user, 'provas.revisar') && ['aprovada', 'impressa'].includes(p.status);
  if (!autorPode && !revisorPode) falha(400, 'Esta prova não pode ser reaberta na situação atual.');
  p.status = autorPode ? 'rascunho' : 'devolvida';
  delete p.snapshot;
  delete p.impressaEm;
  registrar(p, ctx.user, autorPode ? 'retirou da revisão' : 'reabriu a prova', ctx.body.comentario);
  salvarDb();
  return p;
});

rota('POST', '/api/provas/:id/duplicar', 'provas.criar', (ctx) => {
  const orig = acharProva(ctx.params.id);
  if (!podeVerProva(ctx.user, orig)) falha(403, 'Sem acesso.');
  db.seq.prova += 1;
  const p = {
    ...JSON.parse(JSON.stringify(orig)),
    id: uid('p'), numero: db.seq.prova, titulo: orig.titulo + ' (cópia)', autorId: ctx.user.id,
    status: 'rascunho', criadoEm: agora(), atualizadoEm: agora(), historico: [],
  };
  delete p.snapshot;
  delete p.impressaEm;
  p.itens = p.itens.filter((it) => {
    const q = db.questoes.find((x) => x.id === it.questaoId);
    return q && podeUsarNaProva(ctx.user, q);
  });
  registrar(p, ctx.user, 'duplicou', 'a partir de ' + orig.titulo);
  db.provas.push(p);
  salvarDb();
  return p;
});

rota('DELETE', '/api/provas/:id', 'logado', (ctx) => {
  const p = acharProva(ctx.params.id);
  const dono = p.autorId === ctx.user.id && ['rascunho', 'devolvida'].includes(p.status);
  if (!dono && !pode(ctx.user, 'config.gerenciar')) falha(403, 'Sem permissão para excluir esta prova.');
  db.provas = db.provas.filter((x) => x !== p);
  salvarDb();
  return { ok: true };
});

// --- usuários
rota('GET', '/api/usuarios', 'usuarios.gerenciar', () => db.usuarios.map(usuarioPublico));

function dadosUsuario(b, existente) {
  const u = {
    nome: txt(b.nome, 120),
    login: txt(b.login, 60).toLowerCase(),
    perfil: PERFIS[b.perfil] ? b.perfil : 'professor',
    disciplinas: (Array.isArray(b.disciplinas) ? b.disciplinas : []).filter((id) => db.config.disciplinas.some((d) => d.id === id)),
    ativo: b.ativo !== false,
  };
  if (!u.nome || !u.login) falha(400, 'Nome e login são obrigatórios.');
  if (!/^[a-z0-9._-]+$/.test(u.login)) falha(400, 'Login: use apenas letras minúsculas, números, ponto, hífen ou _.');
  if (db.usuarios.some((x) => x.login === u.login && x !== existente)) falha(400, 'Este login já está em uso.');
  if (b.senha && String(b.senha).length < 6) falha(400, 'A senha precisa ter pelo menos 6 caracteres.');
  return u;
}

rota('POST', '/api/usuarios', 'usuarios.gerenciar', (ctx) => {
  const dados = dadosUsuario(ctx.body);
  if (!ctx.body.senha) falha(400, 'Defina uma senha inicial.');
  const u = { id: uid('u'), ...dados, ...hashSenha(ctx.body.senha), criadoEm: agora() };
  db.usuarios.push(u);
  salvarDb();
  return usuarioPublico(u);
});

rota('PUT', '/api/usuarios/:id', 'usuarios.gerenciar', (ctx) => {
  const u = db.usuarios.find((x) => x.id === ctx.params.id) || falha(404, 'Usuário não encontrado.');
  const dados = dadosUsuario(ctx.body, u);
  if (u.id === ctx.user.id && (dados.perfil !== u.perfil || !dados.ativo)) falha(400, 'Você não pode mudar o próprio perfil nem se desativar.');
  Object.assign(u, dados);
  if (ctx.body.senha) Object.assign(u, hashSenha(ctx.body.senha));
  salvarDb();
  return usuarioPublico(u);
});

// --- configurações
rota('PUT', '/api/config/escola', 'config.gerenciar', (ctx) => {
  const b = ctx.body;
  const logo = String(b.logo || '');
  db.config.escola = {
    nome: txt(b.nome, 200),
    endereco: txt(b.endereco, 300),
    cidade: txt(b.cidade, 120),
    telefone: txt(b.telefone, 60),
    rodape: txt(b.rodape, 300),
    logo: logo.startsWith('data:image/') ? logo : '',
    mostrarLogoPei: b.mostrarLogoPei !== false,
    fonteProva: FONTES_PROVA.includes(b.fonteProva) ? b.fonteProva : 'arial',
  };
  salvarDb();
  return db.config.escola;
});

rota('PUT', '/api/config/series', 'config.gerenciar', (ctx) => {
  const series = (Array.isArray(ctx.body.series) ? ctx.body.series : []).map((s) => txt(s, 60)).filter(Boolean);
  if (!series.length) falha(400, 'Informe pelo menos uma série.');
  db.config.series = [...new Set(series)];
  salvarDb();
  return db.config.series;
});

rota('PUT', '/api/config/turmas', 'config.gerenciar', (ctx) => {
  const turmas = (Array.isArray(ctx.body.turmas) ? ctx.body.turmas : []).map((s) => txt(s, 30)).filter(Boolean);
  if (!turmas.length) falha(400, 'Informe pelo menos uma turma.');
  db.config.turmas = [...new Set(turmas)];
  salvarDb();
  return db.config.turmas;
});

rota('POST', '/api/config/disciplinas', 'config.gerenciar', (ctx) => {
  const nome = txt(ctx.body.nome, 120);
  if (!nome) falha(400, 'Informe o nome.');
  if (db.config.disciplinas.some((d) => d.nome.toLowerCase() === nome.toLowerCase())) falha(400, 'Disciplina já existe.');
  const d = { id: uid('d'), nome, ativo: true };
  db.config.disciplinas.push(d);
  salvarDb();
  return d;
});
rota('PUT', '/api/config/disciplinas/:id', 'config.gerenciar', (ctx) => {
  const d = db.config.disciplinas.find((x) => x.id === ctx.params.id) || falha(404, 'Disciplina não encontrada.');
  if (ctx.body.nome != null) d.nome = txt(ctx.body.nome, 120) || d.nome;
  if (ctx.body.ativo != null) d.ativo = !!ctx.body.ativo;
  salvarDb();
  return d;
});
rota('PUT', '/api/config/assuntos/:id', 'config.gerenciar', (ctx) => {
  const a = db.config.assuntos.find((x) => x.id === ctx.params.id) || falha(404, 'Assunto não encontrado.');
  a.nome = txt(ctx.body.nome, 120) || a.nome;
  salvarDb();
  return a;
});
rota('DELETE', '/api/config/assuntos/:id', 'config.gerenciar', (ctx) => {
  const usado = db.questoes.filter((q) => q.assuntoId === ctx.params.id).length;
  if (usado) falha(400, `Assunto usado em ${usado} questão(ões). Renomeie em vez de excluir.`);
  db.config.assuntos = db.config.assuntos.filter((a) => a.id !== ctx.params.id);
  salvarDb();
  return { ok: true };
});

rota('PUT', '/api/config/permissoes', 'config.gerenciar', (ctx) => {
  const novo = {};
  for (const perfil of Object.keys(PERFIS)) {
    const lista = Array.isArray(ctx.body[perfil]) ? ctx.body[perfil] : [];
    novo[perfil] = [...new Set(lista.filter((p) => PERMISSOES[p]))];
  }
  PERMISSOES_FIXAS_DIRECAO.forEach((p) => novo.direcao.includes(p) || novo.direcao.push(p));
  db.config.permissoes = novo;
  salvarDb();
  return novo;
});

// --- backup
rota('GET', '/api/backup', 'dados.backup', (ctx) => {
  ctx.setHeader('Content-Disposition', `attachment; filename="banco-questoes-backup-${agora().slice(0, 10)}.json"`);
  return db;
});
rota('POST', '/api/restaurar', 'dados.backup', (ctx) => {
  const b = ctx.body;
  if (!b || !Array.isArray(b.usuarios) || !Array.isArray(b.questoes) || !Array.isArray(b.provas) || !b.config) falha(400, 'Arquivo de backup inválido.');
  if (!b.usuarios.some((u) => u.perfil === 'direcao' && u.ativo !== false)) falha(400, 'O backup não tem nenhum usuário da direção ativo.');
  fs.copyFileSync(DB_FILE, path.join(DATA_DIR, `db-antes-restauracao-${Date.now()}.json`));
  db = b;
  migrar();
  salvarDb();
  sessoes.clear();
  return { ok: true };
});

// ---------------------------------------------------------------------------
// Servidor HTTP
// ---------------------------------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let tamanho = 0;
    const partes = [];
    req.on('data', (c) => {
      tamanho += c.length;
      if (tamanho > MAX_BODY) {
        reject(new HttpError(413, 'Conteúdo muito grande (limite 25 MB). Reduza as imagens.'));
        req.destroy();
      } else partes.push(c);
    });
    req.on('end', () => {
      if (!partes.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(partes).toString('utf8')));
      } catch {
        reject(new HttpError(400, 'JSON inválido.'));
      }
    });
    req.on('error', reject);
  });
}

// Cabeçalhos de segurança enviados em todas as respostas
const SEGURANCA = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  // tudo vem do próprio servidor; imagens podem ser base64 (data:) ou links https nas questões
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
};

function enviarJson(res, status, dados, headers = {}) {
  res.writeHead(status, { ...SEGURANCA, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(dados));
}

// decodeURIComponent dispara erro com endereços malformados (ex.: "%E0%A4%A"); aqui vira null
function decodificar(texto) {
  try {
    return decodeURIComponent(texto);
  } catch {
    return null;
  }
}

async function tratarApi(req, res, url) {
  const r = rotas.find((x) => x.metodo === req.method && x.re.test(url.pathname));
  if (!r) return enviarJson(res, 404, { erro: 'Rota não encontrada.' });
  const headers = {};
  const ctx = {
    req,
    params: {},
    query: Object.fromEntries(url.searchParams),
    setCookie: (c) => (headers['Set-Cookie'] = c),
    setHeader: (k, v) => (headers[k] = v),
  };
  const m = url.pathname.match(r.re);
  try {
    r.chaves.forEach((k, i) => {
      ctx.params[k] = decodificar(m[i + 1]);
      if (ctx.params[k] == null) falha(400, 'Endereço inválido.');
    });
    if (r.acesso !== 'publico') {
      ctx.user = usuarioDaRequisicao(req);
      if (!ctx.user) falha(401, 'Sessão expirada. Entre novamente.');
      if (r.acesso !== 'logado' && !pode(ctx.user, r.acesso)) falha(403, 'Seu perfil não tem permissão para esta ação.');
    }
    ctx.body = ['POST', 'PUT'].includes(req.method) ? await lerCorpo(req) : {};
    const resultado = await r.fn(ctx);
    enviarJson(res, 200, resultado, headers);
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e);
    enviarJson(res, e.status || 500, { erro: e instanceof HttpError ? e.message : 'Erro interno no servidor.' }, headers);
  }
}

function servirArquivo(req, res, url) {
  let rel = decodificar(url.pathname);
  if (rel == null || rel.includes('\0')) {
    res.writeHead(400, { ...SEGURANCA, 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Endereço inválido');
  }
  if (rel === '/') rel = '/index.html';
  const arquivo = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!arquivo.startsWith(PUBLIC_DIR + path.sep) && arquivo !== PUBLIC_DIR) {
    res.writeHead(403, SEGURANCA);
    return res.end();
  }
  fs.readFile(arquivo, (err, conteudo) => {
    if (err) {
      res.writeHead(404, { ...SEGURANCA, 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Não encontrado');
    }
    const ext = path.extname(arquivo).toLowerCase();
    // fontes e imagens mudam raramente: cache de 7 dias; o resto revalida sempre
    const cache = ['.woff2', '.png', '.jpg', '.jpeg', '.ico'].includes(ext) ? 'public, max-age=604800' : 'no-cache';
    res.writeHead(200, { ...SEGURANCA, 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': cache });
    res.end(conteudo);
  });
}

carregarDb();

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) return tratarApi(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      return res.end();
    }
    servirArquivo(req, res, url);
  })
  .listen(PORT, () => {
    const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
    console.log('\n  Banco de Questões rodando!');
    console.log(`  Neste computador:   http://localhost:${PORT}`);
    ips.forEach((ip) => console.log(`  Na rede da escola:  http://${ip}:${PORT}`));
    console.log('\n  Para parar: Ctrl+C\n');
  });
