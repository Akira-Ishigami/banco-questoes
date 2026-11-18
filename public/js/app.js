// Ponto de entrada: login, layout, roteamento e painel inicial.
import { api } from './api.js';
import { esc, $, toast, erro } from './ui.js';
import { estado, carregarBootstrap, pode, badge, nomeDisciplina, nomeUsuario, montagem } from './estado.js';
import { guarda, ir } from './nav.js';
import { icone } from './icones.js';
import { carregarBncc } from './bncc.js';
import { telaBanco } from './telas/banco.js';
import { telaQuestaoForm } from './telas/questao-form.js';
import { telaProvas, telaProvaDetalhe } from './telas/provas.js';
import { telaProvaNova, telaProvaEditor } from './telas/prova-montar.js';
import { telaRevisao } from './telas/revisao.js';
import { telaImpressao, telaFilaImpressao } from './telas/impressao.js';
import { telaUsuarios, telaConfig } from './telas/admin.js';
import { telaTutorial, bannerTutorial, ligarBannerTutorial } from './telas/tutorial.js';

const app = document.getElementById('app');

const ROTAS = [
  { re: /^\/$/, tela: telaPainel, titulo: 'Painel' },
  { re: /^\/banco$/, tela: telaBanco, titulo: 'Banco de questões' },
  { re: /^\/questoes\/nova$/, tela: telaQuestaoForm, perm: 'questoes.criar', titulo: 'Cadastrar questão' },
  { re: /^\/questoes\/([\w-]+)\/editar$/, tela: telaQuestaoForm, titulo: 'Editar questão' },
  { re: /^\/provas$/, tela: telaProvas, titulo: 'Provas' },
  { re: /^\/provas\/nova$/, tela: telaProvaNova, perm: 'provas.criar', titulo: 'Nova prova' },
  { re: /^\/provas\/montar$/, tela: telaProvaEditor, perm: 'provas.criar', titulo: 'Prova em montagem' },
  { re: /^\/provas\/([\w-]+)$/, tela: telaProvaDetalhe, titulo: 'Prova' },
  { re: /^\/imprimir\/([\w-]+)$/, tela: telaImpressao, semLayout: true, titulo: 'Impressão' },
  { re: /^\/revisao$/, tela: telaRevisao, titulo: 'Revisão pedagógica' },
  { re: /^\/impressao$/, tela: telaFilaImpressao, perm: 'provas.imprimir', titulo: 'Fila de impressão' },
  { re: /^\/usuarios$/, tela: telaUsuarios, perm: 'usuarios.gerenciar', titulo: 'Usuários' },
  { re: /^\/config$/, tela: telaConfig, titulo: 'Configurações' },
  { re: /^\/conta$/, tela: telaConta, titulo: 'Minha conta' },
  { re: /^\/tutorial$/, tela: telaTutorial, titulo: 'Tutorial' },
];

function lerHash() {
  const h = location.hash.replace(/^#/, '') || '/';
  const [caminho, qs] = h.split('?');
  return { caminho, query: Object.fromEntries(new URLSearchParams(qs || '')) };
}

let hashAnterior = location.hash;
async function rotear() {
  if (guarda.sujo && guarda.sujo() && location.hash !== hashAnterior) {
    if (!window.confirm('Há alterações não salvas. Sair mesmo assim?')) {
      history.replaceState(null, '', hashAnterior || '#/');
      return;
    }
  }
  guarda.sujo = null;
  hashAnterior = location.hash;
  if (!estado.eu) return;
  const { caminho, query } = lerHash();
  const rota = ROTAS.find((r) => r.re.test(caminho));
  if (!rota) return ir('/');
  if (rota.perm && !pode(rota.perm)) {
    toast('Seu perfil não tem acesso a essa tela.', 'erro');
    return ir('/');
  }
  const params = caminho.match(rota.re).slice(1);
  let alvo;
  if (rota.semLayout) {
    app.innerHTML = '<div id="conteudo"></div>';
    alvo = $('#conteudo');
  } else {
    if (!$('.shell')) montarLayout();
    alvo = $('#conteudo');
    marcarMenu(caminho, query);
    fecharMenu();
    atualizarAjuda(caminho);
  }
  alvo.innerHTML = '<div class="carregando">Carregando…</div>';
  window.scrollTo(0, 0);
  try {
    await rota.tela(alvo, { params, query });
  } catch (e) {
    alvo.innerHTML = `<div class="vazio"><strong>Não foi possível abrir esta tela</strong>${esc(e.message)}</div>`;
    if (e.status !== 401) console.error(e);
  }
  // título da aba: nome da tela; no detalhe da prova, o próprio nome da prova
  const h1 = alvo.querySelector('h1');
  const nomeTela = (rota.titulo === 'Prova' && h1 && h1.textContent.trim()) || rota.titulo;
  document.title = (nomeTela ? nomeTela + ' · ' : '') + 'Banco de Questões';
  atualizarContadores();
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
const LOGO_PEI = '<img src="/img/logo-pei.png" alt="PEI — Programa de Educação Integral">';

function itensMenu() {
  const temProvas = pode('provas.criar') || pode('provas.ver_todas') || pode('provas.revisar') || pode('provas.imprimir');
  return [
    { grupo: 'Início' },
    { href: '#/', rotulo: 'Painel' },
    { href: '#/tutorial', rotulo: 'Tutorial', id: 'tutorial' },
    { grupo: 'Questões' },
    { href: '#/banco', rotulo: 'Banco de questões' },
    pode('questoes.criar') && { href: '#/questoes/nova', rotulo: 'Cadastrar questão' },
    pode('questoes.criar') && { href: '#/banco?escopo=minhas', rotulo: 'Minhas questões', id: 'minhas' },
    temProvas && { grupo: 'Provas' },
    pode('provas.criar') && { href: '#/provas/nova', rotulo: 'Nova prova' },
    pode('provas.criar') && { href: '#/provas/montar', rotulo: 'Prova em montagem', id: 'montar' },
    temProvas && { href: '#/provas', rotulo: pode('provas.ver_todas') ? 'Provas da escola' : 'Minhas provas' },
    (pode('questoes.revisar') || pode('provas.revisar')) && { href: '#/revisao', rotulo: 'Revisão pedagógica', id: 'revisao' },
    pode('provas.imprimir') && { href: '#/impressao', rotulo: 'Fila de impressão', id: 'impressao' },
    (pode('usuarios.gerenciar') || pode('config.gerenciar') || pode('dados.backup')) && { grupo: 'Administração' },
    pode('usuarios.gerenciar') && { href: '#/usuarios', rotulo: 'Usuários' },
    (pode('config.gerenciar') || pode('dados.backup')) && { href: '#/config', rotulo: 'Configurações' },
  ].filter(Boolean);
}

function montarLayout() {
  const eu = estado.eu;
  app.innerHTML = `
  <div class="shell">
    <header class="topo-movel">
      <button class="topo-btn" id="abrir-menu" aria-label="Abrir menu" aria-controls="menu-lateral" aria-expanded="false">${icone('menu', { tamanho: '22' })}</button>
      <a href="#/" class="topo-marca"><img src="/img/favicon-pei.png" alt=""><span>Banco de Questões</span></a>
      <a href="#/tutorial" class="topo-btn" id="topo-ajuda" aria-label="Ajuda desta tela" title="Ajuda desta tela">${icone('ajuda', { tamanho: '22' })}</a>
    </header>
    <div class="fundo-menu" id="fundo-menu"></div>
    <nav class="lateral" id="menu-lateral" aria-label="Menu principal">
      <button class="fechar-menu" id="fechar-menu" aria-label="Fechar menu">${icone('fechar')}</button>
      <div class="marca"><div class="marca-logo">${LOGO_PEI}</div><strong>Banco de Questões</strong><span>${esc(estado.escola.nome || '')}</span></div>
      ${itensMenu().map((i) => i.grupo ? `<div class="grupo">${i.grupo}</div>` : `<a href="${i.href}" ${i.id ? `data-id="${i.id}"` : ''}><span>${i.rotulo}</span><span class="contador oculto"></span></a>`).join('')}
      <div class="rodape-lateral">
        <div>${esc(eu.nome)}</div>
        <div class="perfil">${esc(estado.perfis[eu.perfil])}</div>
        <div class="tamanho-texto" role="group" aria-label="Tamanho do texto">Texto:
          ${TAMANHOS.map(([v, r, d]) => `<button data-tamanho="${v}" title="${d}" aria-label="${d}">${r}</button>`).join('')}</div>
        <div class="links"><a href="#/conta">Minha conta</a><button id="sair">Sair</button></div>
      </div>
    </nav>
    <main class="principal">
      <a class="link-ajuda" id="link-ajuda" href="#/tutorial">${icone('ajuda')} Ajuda desta tela</a>
      <div id="conteudo"></div>
    </main>
  </div>`;
  $('#sair').onclick = sair;
  $('#abrir-menu').onclick = abrirMenu;
  $('#fechar-menu').onclick = fecharMenu;
  $('#fundo-menu').onclick = fecharMenu;
  document.querySelectorAll('[data-tamanho]').forEach((b) => (b.onclick = () => aplicarTamanho(b.dataset.tamanho, true)));
  aplicarTamanho(lerTamanho());
}

// ---------- menu lateral no celular ----------
function abrirMenu() {
  $('.lateral').classList.add('aberta');
  $('#fundo-menu').classList.add('visivel');
  document.body.classList.add('menu-aberto');
  $('#abrir-menu').setAttribute('aria-expanded', 'true');
  setTimeout(() => $('.lateral a.ativo, .lateral a')?.focus(), 50);
}
function fecharMenu() {
  if (!$('.lateral')) return;
  $('.lateral').classList.remove('aberta');
  $('#fundo-menu').classList.remove('visivel');
  document.body.classList.remove('menu-aberto');
  $('#abrir-menu')?.setAttribute('aria-expanded', 'false');
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharMenu(); });

// ---------- tamanho do texto (acessibilidade) ----------
const TAMANHOS = [['100', 'A', 'Texto normal'], ['112.5', 'A+', 'Texto grande'], ['125', 'A++', 'Texto maior']];
function lerTamanho() {
  try { return localStorage.getItem('tamanho-texto') || '100'; } catch { return '100'; }
}
function aplicarTamanho(v, salvar) {
  if (!TAMANHOS.some(([x]) => x === v)) v = '100';
  document.documentElement.style.fontSize = v + '%';
  document.querySelectorAll('[data-tamanho]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tamanho === v)));
  if (salvar) { try { localStorage.setItem('tamanho-texto', v); } catch { /* ignore */ } }
}
aplicarTamanho(lerTamanho());

// ---------- ajuda contextual: cada tela aponta para o passo certo do tutorial ----------
const AJUDA = [
  [/^\/$/, { professor: 'p-painel', supervisao: 's-fila', direcao: 'd-escola' }],
  [/^\/banco/, { professor: 'p-manual', supervisao: 's-banco', direcao: 'p-manual' }],
  [/^\/questoes\//, 'p-questao'],
  [/^\/provas\/nova$/, 'p-auto'],
  [/^\/provas\/montar$/, 'p-ajustar'],
  [/^\/provas/, { professor: 'p-ajustar', supervisao: 's-provas', direcao: 'd-imprimir' }],
  [/^\/revisao/, 's-questoes'],
  [/^\/impressao/, 'd-imprimir'],
  [/^\/usuarios/, 'd-usuarios'],
  [/^\/config/, 'd-escola'],
];
function atualizarAjuda(caminho) {
  const achado = AJUDA.find(([re]) => re.test(caminho));
  let passo = achado ? achado[1] : null;
  if (passo && typeof passo === 'object') passo = passo[estado.eu.perfil] || Object.values(passo)[0];
  const href = '#/tutorial' + (passo ? '?passo=' + passo : '');
  const link = $('#link-ajuda');
  link.href = href;
  link.classList.toggle('oculto', caminho === '/tutorial');
  $('#topo-ajuda').href = href;
}

function marcarMenu(caminho, query) {
  const atual = '#' + caminho + (query.escopo ? '?escopo=' + query.escopo : '');
  document.querySelectorAll('.lateral a[href]').forEach((a) => a.classList.toggle('ativo', a.getAttribute('href') === atual));
}

function definirContador(id, n) {
  const el = document.querySelector(`.lateral a[data-id="${id}"] .contador`);
  if (!el) return;
  el.textContent = n;
  el.classList.toggle('oculto', !n);
}

async function atualizarContadores() {
  if (!$('.shell')) return;
  definirContador('montar', montagem.ler().itens.length);
  try {
    const r = await api.get('/resumo');
    definirContador('revisao', r.questoesEmRevisao + r.provasEmRevisao);
    definirContador('impressao', r.filaImpressao);
    definirContador('minhas', r.minhasDevolvidas);
  } catch { /* contadores são opcionais */ }
}
window.addEventListener('montagem-mudou', () => definirContador('montar', montagem.ler().itens.length));

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
function telaLogin() {
  app.innerHTML = `
  <div class="login">
    <form id="form-login" class="login-cartao">
      <div class="login-logo">${LOGO_PEI}</div>
      <h1>Banco de Questões</h1>
      <label class="campo"><span>Usuário</span><input type="text" name="login" autocomplete="username" required autofocus></label>
      <label class="campo"><span>Senha</span><input type="password" name="senha" autocomplete="current-password" required></label>
      <button class="btn btn-primario" style="width:100%">Entrar</button>
      <div class="demo">
        <span>Demonstração:</span>
        <button type="button" data-u="direcao">direcao</button>
        <button type="button" data-u="supervisao">supervisao</button>
        <button type="button" data-u="professor">professor</button>
        <button type="button" data-u="ana">ana</button>
      </div>
    </form>
  </div>`;
  const f = $('#form-login');
  f.querySelectorAll('[data-u]').forEach((b) => (b.onclick = () => {
    f.login.value = b.dataset.u;
    f.senha.value = b.dataset.u + '123';
  }));
  f.onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/login', { login: f.login.value, senha: f.senha.value });
      await iniciar();
    } catch (er) {
      erro(er);
    }
  };
}

async function sair() {
  await api.post('/logout').catch(() => {});
  estado.eu = null;
  telaLogin();
}

window.addEventListener('sessao-expirada', () => {
  if (!estado.eu) return;
  estado.eu = null;
  toast('Sua sessão expirou. Entre novamente.', 'erro');
  telaLogin();
});

// ---------------------------------------------------------------------------
// Painel
// ---------------------------------------------------------------------------
async function telaPainel(el) {
  const [r, ps] = await Promise.all([api.get('/resumo'), api.get('/provas')]);
  const eu = estado.eu;
  const minhasP = ps.filter((p) => p.autorId === eu.id);

  const stat = (num, rot, href, destaque) => `<a class="stat ${destaque && num ? 'destaque' : ''}" href="${href}"><div class="num">${num}</div><div class="rot">${rot}</div></a>`;
  const stats = [stat(r.questoesAprovadas, 'questões aprovadas no banco', '#/banco')];
  if (pode('questoes.criar')) stats.push(stat(r.minhasQuestoes, 'questões cadastradas por mim', '#/banco?escopo=minhas'));
  if (pode('questoes.criar')) stats.push(stat(r.minhasDevolvidas, 'questões devolvidas para ajuste', '#/banco?escopo=minhas', true));
  if (pode('questoes.revisar')) stats.push(stat(r.questoesEmRevisao, 'questões aguardando revisão', '#/revisao', true));
  if (pode('provas.revisar')) stats.push(stat(r.provasEmRevisao, 'provas aguardando revisão', '#/revisao', true));
  if (pode('provas.imprimir')) stats.push(stat(r.filaImpressao, 'provas na fila de impressão', '#/impressao', true));

  const recentes = (pode('provas.ver_todas') ? ps : minhasP).slice().sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm)).slice(0, 6);
  const porDisc = r.porDisciplina;
  const maxDisc = Math.max(1, ...Object.values(porDisc));

  const atalhos = [
    pode('questoes.criar') && '<a class="btn btn-caneta" href="#/questoes/nova">' + icone('mais') + ' Cadastrar questão</a>',
    pode('provas.criar') && '<a class="btn btn-primario" href="#/provas/nova">' + icone('mais') + ' Nova prova</a>',
    pode('provas.imprimir') && r.filaImpressao && '<a class="btn" href="#/impressao">Ver fila de impressão</a>',
  ].filter(Boolean).join('');

  el.innerHTML = `
    <div class="cabecalho-pagina">
      <div><h1>Painel</h1></div>
      <div class="acoes">${atalhos}</div>
    </div>
    ${bannerTutorial()}
    <div class="stats">${stats.join('')}</div>
    <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;align-items:start">
      <div class="card">
        <h3>Provas recentes</h3>
        ${recentes.length ? `<table class="tabela"><tbody>${recentes.map((p) => `
          <tr><td><a href="#/provas/${p.id}" class="titulo-linha">${esc(p.titulo)}</a><br><small>${esc(nomeDisciplina(p.disciplinaId))} · ${esc(p.serie)} · ${esc(nomeUsuario(p.autorId))}</small></td><td style="text-align:right">${badge(p.status)}</td></tr>`).join('')}</tbody></table>`
        : '<p class="suave">Nenhuma prova ainda.</p>'}
      </div>
      <div class="card">
        <h3>Questões aprovadas por disciplina</h3>
        ${Object.keys(porDisc).length ? Object.entries(porDisc).sort((a, b) => b[1] - a[1]).map(([id, n]) => `
          <div style="margin:8px 0">
            <div class="flex entre"><span>${esc(nomeDisciplina(id))}</span><strong>${n}</strong></div>
            <div style="height:6px;background:var(--papel-2);border-radius:4px"><div style="height:6px;width:${(n / maxDisc) * 100}%;background:var(--verde);border-radius:4px"></div></div>
          </div>`).join('') : '<p class="suave">O banco ainda está vazio.</p>'}
      </div>
    </div>`;
  ligarBannerTutorial(el);
}

// ---------------------------------------------------------------------------
// Minha conta
// ---------------------------------------------------------------------------
async function telaConta(el) {
  el.innerHTML = `
    <div class="cabecalho-pagina"><div><h1>Minha conta</h1></div></div>
    <div class="card" style="max-width:460px">
      <h3>Trocar senha</h3>
      <form id="f-senha">
        <label class="campo"><span>Senha atual</span><input type="password" name="atual" required autocomplete="current-password"></label>
        <label class="campo"><span>Nova senha</span><input type="password" name="nova" required minlength="6" autocomplete="new-password"></label>
        <label class="campo"><span>Repita a nova senha</span><input type="password" name="nova2" required autocomplete="new-password"></label>
        <button class="btn btn-primario">Salvar nova senha</button>
      </form>
    </div>
    <div class="card" style="max-width:460px">
      <h3>Suas permissões</h3>
      <ul>${estado.eu.permissoes.map((p) => `<li>${esc(estado.catalogoPermissoes[p])}</li>`).join('')}</ul>
    </div>`;
  const f = $('#f-senha');
  f.onsubmit = async (e) => {
    e.preventDefault();
    if (f.nova.value !== f.nova2.value) return toast('As senhas não conferem.', 'erro');
    try {
      await api.post('/minha-senha', { atual: f.atual.value, nova: f.nova.value });
      f.reset();
      toast('Senha alterada.', 'ok');
    } catch (er) { erro(er); }
  };
}

// ---------------------------------------------------------------------------
async function iniciar() {
  try {
    await Promise.all([carregarBootstrap(), carregarBncc()]);
  } catch (e) {
    if (e.status === 401) return telaLogin();
    app.innerHTML = `<div class="vazio" style="margin:40px"><strong>Servidor indisponível</strong>${esc(e.message)}</div>`;
    return;
  }
  app.innerHTML = '';
  hashAnterior = location.hash;
  rotear();
}

// recarrega dados de configuração (após editar disciplinas, escola etc.) — ver nav.js
window.addEventListener('recarregar-config', async (e) => {
  try {
    await carregarBootstrap();
    app.innerHTML = '';
    await rotear();
  } finally {
    e.detail && e.detail();
  }
});

window.addEventListener('hashchange', rotear);
iniciar();
