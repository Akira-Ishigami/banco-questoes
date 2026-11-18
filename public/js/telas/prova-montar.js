// Montagem de prova: tela "Nova prova" (automática ou manual) e editor da prova em montagem.
import { api } from '../api.js';
import { esc, $, $$, toast, erro, confirmar, textoPuro, barraAcoesMovel } from '../ui.js';
import {
  estado, badge, bolinhas, nomeDisciplina, nomeAssunto, montagem, disciplinasAtivas, assuntosDa, TIPOS_PROVA, DIFICULDADE_PROVA,
  fmtValor, numValor, somaValores,
} from '../estado.js';
import { ir } from '../nav.js';
import { candidatas, sortearProva, sortearSubstituta } from '../sorteio.js';

// ids das questões já usadas em provas desta disciplina/série, de toda a escola (o servidor só devolve os ids)
async function buscarUsadas(disciplinaId, serie, ignorar = '') {
  const qs = new URLSearchParams({ disciplinaId, serie, ignorar });
  return new Set(await api.get('/questoes-usadas?' + qs));
}
// quantidade de questões: inteiro entre 0 e 100
const qtd = (v) => Math.max(0, Math.min(100, Math.floor(Number(v) || 0)));
import { icone } from '../icones.js';
import { filtrarBancoPara } from './banco.js';
import { descricaoBncc, sugerirBncc, carregarBncc } from '../bncc.js';

const OPCOES_PADRAO = { colunas: 1, fonte: 12, versoes: 1, embaralharAlternativas: false, cartaoResposta: true };
const AUTO_PADRAO = { objetivas: 10, discursivas: 0, assuntos: [], bncc: [], incluirSemSerie: false, evitarRepetidas: true };

// ---------------------------------------------------------------------------
// Campos obrigatórios compartilhados (disciplina, série, turmas, dificuldade)
// ---------------------------------------------------------------------------
const separarTurmas = (s) => String(s || '').split(/\s*,\s*|\s+e\s+/).filter(Boolean);

function htmlCamposBase(d) {
  const turmasMarcadas = new Set(separarTurmas(d.turma));
  return `
    <label class="campo"><span>Disciplina *</span><select data-k="disciplinaId" required><option value="">Escolha…</option>
      ${disciplinasAtivas().map((x) => `<option value="${x.id}">${esc(x.nome)}</option>`).join('')}</select></label>
    <label class="campo"><span>Série / ano *</span><select data-k="serie" required><option value="">Escolha…</option>
      ${estado.series.map((s) => `<option>${esc(s)}</option>`).join('')}</select></label>
    <label class="campo"><span>Dificuldade *</span><select data-k="dificuldade" required><option value="">Escolha…</option>
      ${Object.entries(DIFICULDADE_PROVA).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
    <div class="campo"><span>Turma(s) *</span>
      <div class="flex" style="gap:6px 14px;padding-top:6px" data-turmas>
        ${estado.turmas.map((t) => `<label class="check"><input type="checkbox" value="${esc(t)}" ${turmasMarcadas.has(t) ? 'checked' : ''}> ${esc(t)}</label>`).join('')}
      </div></div>`;
}

// liga os campos [data-k] e as turmas ao objeto d; chama aoMudar(chave) a cada alteração
function ligarCampos(el, d, aoMudar) {
  $$('[data-k]', el).forEach((c) => {
    if (c.tagName === 'SELECT') c.value = d[c.dataset.k] ?? '';
    c.addEventListener(c.tagName === 'SELECT' ? 'change' : 'input', () => { d[c.dataset.k] = c.value; aoMudar(c.dataset.k); });
  });
  const caixa = $('[data-turmas]', el);
  if (caixa) caixa.addEventListener('change', () => {
    d.turma = $$('input:checked', caixa).map((c) => c.value).join(', ');
    aoMudar('turma');
  });
}

function faltando(d) {
  const f = [];
  if (!d.disciplinaId) f.push('disciplina');
  if (!d.serie) f.push('série/ano');
  if (!d.turma) f.push('turma');
  if (!d.dificuldade) f.push('dificuldade');
  return f;
}

const tituloSugerido = (d) =>
  `${d.tipo || 'Prova'}${d.disciplinaId ? ' de ' + nomeDisciplina(d.disciplinaId) : ''}${d.serie ? ' — ' + d.serie : ''}`;

// ---------------------------------------------------------------------------
// Nova prova: escolhe para quem é e como montar
// ---------------------------------------------------------------------------
export async function telaProvaNova(el) {
  const todas = await api.get('/questoes');
  const atual = montagem.ler();
  const d = { tipo: 'Prova', titulo: '', disciplinaId: estado.eu.disciplinas[0] || '', serie: '', turma: '', dificuldade: '', modo: 'auto' };
  const auto = { ...AUTO_PADRAO };
  let tituloEditado = false;

  el.innerHTML = `
    <div class="cabecalho-pagina"><div><h1>Nova prova</h1></div></div>
    ${atual.itens.length || atual.provaId ? `
      <div class="aviso" style="margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <span>Você tem uma prova ${atual.provaId ? 'em edição' : 'em montagem'}${atual.dados.titulo ? ` (<b>${esc(atual.dados.titulo)}</b>)` : ''} com ${atual.itens.length} questão(ões) não salva(s).</span>
        <span class="acoes"><a class="btn btn-sm btn-primario" href="#/provas/montar">Continuar essa</a></span>
      </div>` : ''}
    <div class="card">
      <h3>1. Para quem é a prova</h3>
      <div class="grade">${htmlCamposBase(d)}</div>
      <div class="grade">
        <label class="campo"><span>Tipo</span><select data-k="tipo">${TIPOS_PROVA.map((t) => `<option>${t}</option>`).join('')}</select></label>
        <label class="campo" style="grid-column:span 2"><span>Título</span><input type="text" id="titulo" placeholder="Preenchido automaticamente"></label>
      </div>
      <div class="campo bloco-bncc-prova">
        <span>Habilidades BNCC <small class="suave" style="text-transform:none;letter-spacing:0">(opcional)</small></span>
        <div class="flex bncc-ferramentas">
          <input type="search" id="bncc-busca" placeholder="Filtrar por código ou palavra (ex.: EF69AR04, cores)" aria-label="Filtrar habilidades BNCC" autocomplete="off">
          <label class="check"><input type="checkbox" id="bncc-todas"> Mostrar todas da BNCC para esta série</label>
        </div>
        <div id="bncc-resumo" class="bncc-resumo"></div>
        <div id="a-bncc" class="lista-bncc-prova"></div>
      </div>
    </div>

    <div class="card">
      <h3>2. Como montar</h3>
      <div class="modos">
        <label class="modo"><input type="radio" name="modo" value="auto" checked>
          <span class="modo-icone">${icone('dado', { tamanho: '30' })}</span><strong>Automática</strong><small>O sistema sorteia as questões.</small></label>
        <label class="modo"><input type="radio" name="modo" value="manual">
          <span class="modo-icone">${icone('lista', { tamanho: '30' })}</span><strong>Manual</strong><small>Você escolhe no banco.</small></label>
      </div>

      <div id="painel-auto" class="mt">
        <div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
          <label class="campo"><span>Questões objetivas</span><input type="number" min="0" max="100" id="a-objetivas" value="${auto.objetivas}"></label>
          <label class="campo"><span>Questões discursivas</span><input type="number" min="0" max="100" id="a-discursivas" value="${auto.discursivas}"></label>
        </div>
        <div class="campo"><span>Assuntos <small class="suave" style="text-transform:none;letter-spacing:0">(opcional)</small></span><div id="a-assuntos" class="flex" style="gap:6px 14px"></div></div>
        <label class="check"><input type="checkbox" id="a-evitar" checked> Evitar questões já usadas nesta série</label><br>
        <label class="check"><input type="checkbox" id="a-semserie"> Incluir questões sem série</label>
        <div id="disponiveis" class="gabarito-box mt"></div>
      </div>

      <div class="flex mt" style="justify-content:flex-end">
        <button class="btn btn-caneta" id="continuar">${icone('dado')} Sortear e montar prova</button>
      </div>
    </div>`;

  const titulo = $('#titulo', el);
  titulo.oninput = () => { tituloEditado = !!titulo.value.trim(); };
  const atualizarTitulo = () => { if (!tituloEditado) titulo.value = tituloSugerido(d); };

  const cfg = () => ({ ...d, ...auto });

  // Habilidades BNCC da disciplina e série, com quantas questões aprovadas cada uma tem no banco.
  // Padrão: só as que têm questões. "Mostrar todas" lista também as da BNCC que ainda não têm questões.
  let bnccTodas = false;
  let bnccBusca = '';
  // Conta exatamente as questões que o sorteio usaria (disciplina, série, dificuldade, assuntos e,
  // no modo automático, só os tipos pedidos) — sem o próprio filtro de BNCC.
  // tipos considerados: no modo automático, só os pedidos (objetivas e/ou discursivas)
  function tiposPedidos() {
    const pedidos = ['objetiva', 'discursiva'].filter((t) => (t === 'objetiva' ? auto.objetivas : auto.discursivas) > 0);
    return d.modo === 'auto' && pedidos.length ? pedidos : ['objetiva', 'discursiva'];
  }
  function contagemBncc() {
    const base = { ...cfg(), bncc: [], dificuldade: d.dificuldade || 'mista' };
    const tipos = tiposPedidos();
    const cont = {};
    tipos.forEach((t) => candidatas(todas, base, t).forEach((q) => (q.bncc || []).forEach((c) => (cont[c] = (cont[c] || 0) + 1))));
    return cont;
  }
  // nenhuma questão aprovada com disciplina/série/dificuldade/assuntos escolhidos (ignorando a BNCC)?
  const semCandidatas = () => {
    const base = { ...cfg(), bncc: [], dificuldade: d.dificuldade || 'mista' };
    return tiposPedidos().every((t) => !candidatas(todas, base, t).length);
  };
  function desenharBncc() {
    const box = $('#a-bncc', el);
    const resumo = $('#bncc-resumo', el);
    if (!d.disciplinaId || !d.serie) {
      auto.bncc = [];
      resumo.innerHTML = '';
      box.innerHTML = '<small class="suave">Escolha disciplina e série.</small>';
      return;
    }
    const cont = contagemBncc();
    let codigos = Object.keys(cont);
    if (bnccTodas) {
      const catalogo = sugerirBncc({ disciplina: nomeDisciplina(d.disciplinaId), serie: d.serie, limite: 1000 }).map((h) => h.c);
      codigos = [...new Set([...codigos, ...catalogo, ...auto.bncc])];
    } else codigos = [...new Set([...codigos, ...auto.bncc])];
    // marcadas primeiro, depois as que têm mais questões, depois pela ordem do código
    codigos.sort((a, b) => (auto.bncc.includes(b) - auto.bncc.includes(a)) || ((cont[b] || 0) - (cont[a] || 0)) || a.localeCompare(b));
    const termo = bnccBusca.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const visiveis = termo
      ? codigos.filter((c) => (c + ' ' + descricaoBncc(c)).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(termo))
      : codigos;

    const comQuestoes = Object.keys(cont).length;
    resumo.innerHTML = `${comQuestoes} habilidade(s) com questões no banco${bnccTodas ? ` · ${codigos.length} na lista` : ''}`
      + (auto.bncc.length ? ` · <b>${auto.bncc.length} marcada(s)</b> <button type="button" class="btn btn-sm btn-fantasma" id="bncc-limpar">Desmarcar todas</button>` : '');
    box.innerHTML = visiveis.length
      ? visiveis.map((c) => {
        const n = cont[c] || 0;
        return `<label class="check check-bncc ${n ? '' : 'sem-questoes'}" title="${esc(descricaoBncc(c))}"><input type="checkbox" value="${c}" ${auto.bncc.includes(c) ? 'checked' : ''}>
          <span><b>${c}</b> <small>${n ? `(${n} ${n === 1 ? 'questão' : 'questões'})` : '(nenhuma questão no banco)'}</small><br>
          <small class="suave">${esc(descricaoBncc(c).slice(0, 130)) || 'Código fora do catálogo do fundamental'}${descricaoBncc(c).length > 130 ? '…' : ''}</small></span></label>`;
      }).join('')
      : `<small class="suave">${termo ? 'Nenhuma habilidade encontrada com esse filtro.'
        : comQuestoes ? '' : semCandidatas() ? 'Nenhuma questão aprovada com estes filtros.' : 'As questões encontradas não têm habilidade BNCC.'}</small>`;
    const limpar = $('#bncc-limpar', el);
    if (limpar) limpar.onclick = () => { auto.bncc = []; desenharBncc(); desenharDisponiveis(); };
  }

  function desenharAssuntos() {
    const lista = d.disciplinaId ? assuntosDa(d.disciplinaId) : [];
    auto.assuntos = auto.assuntos.filter((id) => lista.some((a) => a.id === id));
    $('#a-assuntos', el).innerHTML = lista.length
      ? lista.map((a) => `<label class="check"><input type="checkbox" value="${a.id}" ${auto.assuntos.includes(a.id) ? 'checked' : ''}> ${esc(a.nome)}</label>`).join('')
      : `<small class="suave">${d.disciplinaId ? 'Esta disciplina não tem assuntos cadastrados.' : 'Escolha a disciplina.'}</small>`;
  }

  function desenharDisponiveis() {
    const box = $('#disponiveis', el);
    const f = faltando(d).filter((x) => x !== 'turma');
    if (f.length) {
      box.innerHTML = `Escolha ${f.join(', ')} para ver as questões disponíveis.`;
      return;
    }
    const nObj = candidatas(todas, cfg(), 'objetiva').length;
    const nDisc = candidatas(todas, cfg(), 'discursiva').length;
    const ok = nObj >= auto.objetivas && nDisc >= auto.discursivas;
    box.className = ok ? 'gabarito-box mt' : 'aviso mt';
    box.innerHTML = `<span class="rotulo">Disponíveis no banco:</span> <b>${nObj}</b> objetiva(s) e <b>${nDisc}</b> discursiva(s)
      ${ok ? '' : '<br>Não há questões suficientes — a prova sairá com menos questões. Mude a dificuldade para “Mista”, marque mais assuntos ou habilidades BNCC, ou cadastre novas questões.'}`;
  }

  ligarCampos(el, d, (k) => {
    if (['disciplinaId', 'serie', 'tipo'].includes(k)) atualizarTitulo();
    if (k === 'disciplinaId') desenharAssuntos();
    if (k === 'disciplinaId' || k === 'serie') auto.bncc = [];
    if (['disciplinaId', 'serie', 'dificuldade'].includes(k)) desenharBncc();
    desenharDisponiveis();
  });
  $('#a-objetivas', el).oninput = (e) => { auto.objetivas = qtd(e.target.value); desenharBncc(); desenharDisponiveis(); };
  $('#a-discursivas', el).oninput = (e) => { auto.discursivas = qtd(e.target.value); desenharBncc(); desenharDisponiveis(); };
  // marca/desmarca uma habilidade (as que estão escondidas pela busca continuam marcadas)
  $('#a-bncc', el).onchange = (e) => {
    const c = e.target.value;
    if (!c) return;
    auto.bncc = e.target.checked ? [...new Set([...auto.bncc, c])] : auto.bncc.filter((x) => x !== c);
    desenharBncc();
    desenharDisponiveis();
  };
  $('#bncc-busca', el).oninput = (e) => { bnccBusca = e.target.value; desenharBncc(); };
  $('#bncc-todas', el).onchange = (e) => { bnccTodas = e.target.checked; carregarBncc().then(desenharBncc); };
  $('#a-assuntos', el).onchange = () => { auto.assuntos = $$('#a-assuntos input:checked', el).map((c) => c.value); desenharBncc(); desenharDisponiveis(); };
  $('#a-evitar', el).onchange = (e) => { auto.evitarRepetidas = e.target.checked; };
  $('#a-semserie', el).onchange = (e) => { auto.incluirSemSerie = e.target.checked; desenharBncc(); desenharDisponiveis(); };

  $$('input[name=modo]', el).forEach((r) => (r.onchange = () => {
    d.modo = r.value;
    $('#painel-auto', el).classList.toggle('oculto', d.modo !== 'auto');
    desenharBncc();
    $('#continuar', el).innerHTML = d.modo === 'auto' ? `${icone('dado')} Sortear e montar prova` : `Escolher questões no banco ${icone('avancar')}`;
  }));

  $('#continuar', el).onclick = async () => {
    const f = faltando(d);
    if (f.length) return toast('Preencha: ' + f.join(', ') + '.', 'erro');
    if (atual.itens.length && atual.alterada && !(await confirmar('Substituir prova em montagem', `A prova em montagem atual (${atual.itens.length} questões) será descartada. Continuar?`, 'Continuar', 'btn-caneta'))) return;
    const dados = { ...d, titulo: titulo.value.trim() || tituloSugerido(d), opcoes: { ...OPCOES_PADRAO } };

    if (d.modo === 'manual') {
      montagem.salvar({ provaId: null, dados: { ...dados, auto: { ...auto } }, itens: [], alterada: false });
      filtrarBancoPara({ ...dados, bncc: auto.bncc });
      toast('Banco filtrado para esta prova. Clique em “Adicionar à prova” nas questões desejadas.');
      return ir('/banco');
    }

    if (!auto.objetivas && !auto.discursivas) return toast('Informe quantas questões a prova deve ter.', 'erro');
    const c = cfg();
    const r = sortearProva(todas, c, await buscarUsadas(c.disciplinaId, c.serie));
    if (!r.questoes.length) return toast('Nenhuma questão aprovada encontrada com esses filtros.', 'erro');
    montagem.salvar({ provaId: null, dados: { ...dados, auto: { ...auto } }, itens: r.questoes.map((q) => ({ questaoId: q.id, valor: fmtValor(q.valor) })), alterada: true });
    const faltas = [r.faltaram.objetiva && `${r.faltaram.objetiva} objetiva(s)`, r.faltaram.discursiva && `${r.faltaram.discursiva} discursiva(s)`].filter(Boolean);
    toast(faltas.length ? `Sorteadas ${r.questoes.length} questões — faltaram ${faltas.join(' e ')} no banco.` : `${r.questoes.length} questões sorteadas.`, faltas.length ? 'erro' : 'ok');
    ir('/provas/montar');
  };

  atualizarTitulo();
  desenharAssuntos();
  desenharBncc();
  desenharDisponiveis();
  const barra = barraAcoesMovel(el, [{ html: `${icone('dado')} Sortear e montar prova`, classe: 'btn-caneta', alvo: '#continuar' }]);
  // o texto acompanha o modo escolhido
  $$('input[name=modo]', el).forEach((r) => r.addEventListener('change', () => { barra.querySelector('.btn').innerHTML = $('#continuar', el).innerHTML; }));
}

// ---------------------------------------------------------------------------
// Editor da prova em montagem
// ---------------------------------------------------------------------------
export async function telaProvaEditor(el) {
  const m = montagem.ler();
  if (!m.provaId && !m.itens.length && !m.dados.disciplinaId) return ir('/provas/nova');

  const todas = await api.get('/questoes');
  const porId = Object.fromEntries(todas.map((q) => [q.id, q]));
  const d = m.dados;
  d.opcoes = { ...OPCOES_PADRAO, ...(d.opcoes || {}) };
  if (!d.tipo) d.tipo = 'Prova';
  if (!d.modo) d.modo = 'manual';
  // sugere disciplina/série a partir das questões escolhidas
  if (!d.disciplinaId && m.itens.length) d.disciplinaId = (porId[m.itens[0].questaoId] || {}).disciplinaId || '';
  if (!d.serie && m.itens.length) d.serie = (porId[m.itens[0].questaoId] || {}).serie || '';

  const salvarLocal = () => { m.alterada = true; montagem.salvar(m); };
  const cfgSorteio = () => ({ ...AUTO_PADRAO, ...(d.auto || {}), disciplinaId: d.disciplinaId, serie: d.serie, dificuldade: d.dificuldade || 'mista' });
  let cacheUsadas = { chave: null, ids: new Set() };
  async function usadas() {
    const chave = d.disciplinaId + '|' + d.serie;
    if (cacheUsadas.chave !== chave) cacheUsadas = { chave, ids: await buscarUsadas(d.disciplinaId, d.serie, m.provaId || '') };
    return cacheUsadas.ids;
  }
  // valor total digitado pelo professor x calculado (soma dos valores)
  if (d.valorTotalAuto === undefined) d.valorTotalAuto = !String(d.valorTotal || '').trim();

  el.innerHTML = `
    <div class="cabecalho-pagina">
      <div><h1>${m.provaId ? 'Editar prova' : 'Montar prova'}</h1>
        <p><span class="etiqueta">${d.modo === 'auto' ? icone('dado') + ' Gerada automaticamente' : icone('lista') + ' Montagem manual'}</span>
        </p></div>
      <div class="acoes">
        <button class="btn btn-fantasma btn-perigo" id="descartar">${m.provaId ? 'Cancelar edição' : 'Descartar'}</button>
        <button class="btn" id="ir-banco">${icone('mais')} Adicionar do banco</button>
      </div>
    </div>
    <div class="form-questao">
      <div>
        <div class="card">
          <h3>Cabeçalho da prova</h3>
          <div class="grade">
            <label class="campo" style="grid-column:1/-1"><span>Título *</span><input type="text" data-k="titulo" placeholder="Ex.: Avaliação Bimestral de Matemática" value="${esc(d.titulo || '')}"></label>
            ${htmlCamposBase(d)}
          </div>
          <div class="grade">
            <label class="campo"><span>Tipo</span><select data-k="tipo">${TIPOS_PROVA.map((t) => `<option>${t}</option>`).join('')}</select></label>
            <label class="campo"><span>Bimestre / etapa</span><input type="text" data-k="bimestre" placeholder="Ex.: 2º bimestre" value="${esc(d.bimestre || '')}"></label>
            <label class="campo"><span>Data de aplicação</span><input type="date" data-k="data" value="${esc(d.data || '')}"></label>
            <label class="campo"><span>Valor total</span><input type="text" data-k="valorTotal" placeholder="Soma das questões" value="${esc(d.valorTotalAuto ? '' : d.valorTotal || '')}"></label>
          </div>
          <label class="campo"><span>Instruções ao aluno</span><textarea data-k="instrucoes" rows="2" placeholder="Ex.: Leia com atenção. Use caneta azul ou preta.">${esc(d.instrucoes || '')}</textarea></label>
          <p id="aviso-filtros" class="suave oculto" style="font-size:.85rem;margin:0">Os filtros mudaram; as questões escolhidas continuam na prova.</p>
        </div>

        <div class="card">
          <div class="flex entre"><h3 style="margin:0">Questões (<span id="n-itens">${m.itens.length}</span>)</h3>
            <div class="acoes">
              <button class="btn btn-sm btn-caneta" id="ressortear">${icone('trocar')} Sortear tudo de novo</button>
              <button class="btn btn-sm" id="usar-valores" title="Preenche cada questão com o valor cadastrado nela">Usar valor de cada questão</button>
              <button class="btn btn-sm" id="distribuir">Distribuir valor igualmente</button>
              <button class="btn btn-sm" id="embaralhar">Embaralhar ordem</button></div></div>
          <div id="soma-valores" class="mt"></div>
          <ol class="itens-prova" id="itens"></ol>
        </div>
      </div>

      <aside style="position:sticky;top:20px">
        <div class="card">
          <h3>Impressão</h3>
          <div class="grade" style="grid-template-columns:1fr 1fr">
            <label class="campo"><span>Colunas</span><select data-o="colunas"><option value="1">1 coluna</option><option value="2">2 colunas</option></select></label>
            <label class="campo"><span>Fonte</span><select data-o="fonte">${[11, 12, 13, 14].map((n) => `<option value="${n}">${n} pt</option>`).join('')}</select></label>
            <label class="campo"><span>Versões</span><select data-o="versoes">${[1, 2, 3, 4].map((n) => `<option value="${n}">${n === 1 ? 'Única' : n + ' (' + 'ABCD'.slice(0, n).split('').join(', ') + ')'}</option>`).join('')}</select></label>
            <label class="campo"><span>Cópias</span><input type="number" min="0" data-k="copias" value="${esc(d.copias || '')}" placeholder="Nº de alunos"></label>
          </div>
          <label class="check"><input type="checkbox" data-o="embaralharAlternativas"> Embaralhar alternativas nas versões</label><br>
          <label class="check"><input type="checkbox" data-o="cartaoResposta"> Incluir cartão-resposta</label>
          <hr>
          <button class="btn btn-primario" style="width:100%" id="salvar">Salvar prova</button>
          <button class="btn btn-caneta" style="width:100%;margin-top:8px" id="salvar-enviar">Salvar e enviar para revisão</button>
          <button class="btn" style="width:100%;margin-top:8px" id="previa">Salvar e pré-visualizar</button>
        </div>
      </aside>
    </div>`;

  ligarCampos(el, d, (k) => {
    if (['disciplinaId', 'serie', 'dificuldade'].includes(k) && m.itens.length) $('#aviso-filtros', el).classList.remove('oculto');
    // filtros de assunto/BNCC pertencem à disciplina (e a BNCC também à série): mudou, limpa
    if (d.auto && k === 'disciplinaId') d.auto = { ...d.auto, assuntos: [], bncc: [] };
    if (d.auto && k === 'serie') d.auto = { ...d.auto, bncc: [] };
    if (k === 'valorTotal') { d.valorTotalAuto = !String(d.valorTotal || '').trim(); desenharSoma(); }
    salvarLocal();
  });
  $$('[data-o]', el).forEach((c) => {
    const k = c.dataset.o;
    if (c.type === 'checkbox') c.checked = !!d.opcoes[k];
    else c.value = String(d.opcoes[k]);
    c.addEventListener('change', () => { d.opcoes[k] = c.type === 'checkbox' ? c.checked : Number(c.value); salvarLocal(); });
  });

  // soma dos valores x valor total da prova
  function desenharSoma() {
    const soma = somaValores(m.itens);
    const total = d.valorTotalAuto ? null : numValor(d.valorTotal); // vazio = total acompanha a soma
    const semValor = m.itens.filter((it) => numValor(it.valor) == null).length;
    const box = $('#soma-valores', el);
    if (!m.itens.length) return (box.innerHTML = '');
    const bate = total == null || Math.abs(total - soma) < 0.005;
    box.className = 'mt ' + (bate ? 'gabarito-box' : 'aviso');
    box.innerHTML = `<span class="rotulo">Soma dos valores:</span> <b>${fmtValor(soma) || '0'}</b>${total != null ? ` de <b>${fmtValor(total)}</b>` : ''} pontos`
      + (semValor ? ` · ${semValor} questão(ões) sem valor` : '')
      + (bate ? '' : '<br>A soma é diferente do valor total da prova. Ajuste os valores ou use “Distribuir valor igualmente”.');
  }

  function desenharItens() {
    desenharSoma();
    $('#n-itens', el).textContent = m.itens.length;
    const nObj = m.itens.filter((it) => (porId[it.questaoId] || {}).tipo === 'objetiva').length;
    $('#n-itens', el).title = `${nObj} objetiva(s), ${m.itens.length - nObj} discursiva(s)`;
    $('#itens', el).innerHTML = m.itens.length ? m.itens.map((it, i) => {
      const q = porId[it.questaoId];
      return `<li class="item-prova" data-i="${i}">
        <div class="n">${i + 1}</div>
        <div>${q ? `<div class="meta" style="font-size:.78rem;margin-bottom:4px"><strong>${esc(q.codigo)}</strong> · ${q.tipo === 'objetiva' ? 'Objetiva' : 'Discursiva'}
            ${q.assuntoId ? '· ' + esc(nomeAssunto(q.assuntoId)) : ''} ${(q.bncc || []).map((c) => `<span class="etiqueta etiqueta-bncc" title="${esc(descricaoBncc(c))}">${c}</span>`).join(' ')} ${bolinhas(q.dificuldade)} ${q.status !== 'aprovada' ? badge(q.status) : ''}</div>
          <div class="resumo">${esc(textoPuro(q.enunciado).slice(0, 260))}</div>` : '<em class="suave">Questão indisponível (excluída ou sem acesso)</em>'}</div>
        <label class="campo" style="margin:0"><span>Valor</span><input type="text" inputmode="decimal" data-valor value="${esc(it.valor)}" placeholder="—" aria-label="Valor da questão ${i + 1}"></label>
        <div class="ordem">
          <button class="btn btn-sm btn-fantasma" data-mover="-1" ${i === 0 ? 'disabled' : ''} title="Subir" aria-label="Subir">${icone('cima')}</button>
          <button class="btn btn-sm btn-fantasma" data-mover="1" ${i === m.itens.length - 1 ? 'disabled' : ''} title="Descer" aria-label="Descer">${icone('baixo')}</button>
          <button class="btn btn-sm btn-fantasma" data-trocar title="Trocar por outra sorteada" aria-label="Trocar por outra sorteada" ${q ? '' : 'disabled'}>${icone('trocar')}</button>
          <button class="btn btn-sm btn-fantasma btn-perigo" data-remover title="Remover" aria-label="Remover">${icone('fechar')}</button>
        </div>
      </li>`;
    }).join('') : '<div class="vazio"><strong>Nenhuma questão</strong>Use “Adicionar do banco” ou “Sortear tudo de novo”.</div>';
  }

  $('#itens', el).addEventListener('click', async (e) => {
    const li = e.target.closest('.item-prova');
    if (!li) return;
    const i = Number(li.dataset.i);
    const mover = e.target.closest('[data-mover]');
    if (mover) {
      const j = i + Number(mover.dataset.mover);
      [m.itens[i], m.itens[j]] = [m.itens[j], m.itens[i]];
    } else if (e.target.closest('[data-remover]')) {
      m.itens.splice(i, 1);
    } else if (e.target.closest('[data-trocar]')) {
      if (faltando(d).filter((x) => x !== 'turma').length) return toast('Preencha disciplina, série e dificuldade para sortear.', 'erro');
      const nova = sortearSubstituta(todas, cfgSorteio(), porId[m.itens[i].questaoId], new Set(m.itens.map((x) => x.questaoId)), await usadas());
      if (!nova) return toast('Não há outra questão equivalente no banco para trocar.', 'erro');
      // mantém o valor que já estava na prova; se estava vazio, usa o valor sugerido da nova questão
      m.itens[i] = { questaoId: nova.id, valor: String(m.itens[i].valor || '').trim() ? m.itens[i].valor : fmtValor(nova.valor) };
      toast(`Trocada pela ${nova.codigo}.`, 'ok');
    } else return;
    salvarLocal();
    desenharItens();
  });
  $('#itens', el).addEventListener('input', (e) => {
    if (!e.target.matches('[data-valor]')) return;
    m.itens[Number(e.target.closest('.item-prova').dataset.i)].valor = e.target.value;
    desenharSoma();
    salvarLocal();
  });

  $('#ressortear', el).onclick = async () => {
    if (faltando(d).filter((x) => x !== 'turma').length) return toast('Preencha disciplina, série e dificuldade para sortear.', 'erro');
    // mantém a mesma quantidade de objetivas/discursivas da prova atual (ou a configuração do sorteio)
    const cont = (t) => m.itens.filter((it) => (porId[it.questaoId] || {}).tipo === t).length;
    const base = d.auto || AUTO_PADRAO;
    const cfg = m.itens.length
      ? { ...cfgSorteio(), objetivas: cont('objetiva'), discursivas: cont('discursiva') }
      : { ...cfgSorteio(), objetivas: qtd(base.objetivas), discursivas: qtd(base.discursivas) };
    if (!cfg.objetivas && !cfg.discursivas) return toast('Não há quantidade de questões definida para sortear.', 'erro');
    if (m.itens.length && !(await confirmar('Sortear tudo de novo', `Substituir as ${m.itens.length} questões por um novo sorteio (${cfg.objetivas} objetivas e ${cfg.discursivas} discursivas)?`, 'Sortear', 'btn-caneta'))) return;
    const r = sortearProva(todas, cfg, await usadas());
    if (!r.questoes.length) return toast('Nenhuma questão aprovada encontrada com esses filtros.', 'erro');
    m.itens = r.questoes.map((q) => ({ questaoId: q.id, valor: fmtValor(q.valor) }));
    d.modo = 'auto';
    d.auto = { ...(d.auto || AUTO_PADRAO), objetivas: cfg.objetivas, discursivas: cfg.discursivas };
    salvarLocal();
    desenharItens();
    const falta = r.faltaram.objetiva + r.faltaram.discursiva;
    toast(falta ? `Sorteadas ${r.questoes.length}; faltaram ${falta} questão(ões) no banco.` : 'Novo sorteio feito.', falta ? 'erro' : 'ok');
  };

  $('#ir-banco', el).onclick = () => {
    filtrarBancoPara({ ...d, bncc: (d.auto && d.auto.bncc) || [] });
    ir('/banco');
  };

  $('#usar-valores', el).onclick = () => {
    let n = 0;
    m.itens.forEach((it) => {
      const q = porId[it.questaoId];
      if (q && numValor(q.valor) != null) { it.valor = fmtValor(q.valor); n++; }
    });
    if (!n) return toast('Nenhuma questão desta prova tem valor cadastrado.', 'erro');
    salvarLocal();
    desenharItens();
    toast(`Valores de ${n} questão(ões) aplicados.`, 'ok');
  };
  $('#distribuir', el).onclick = () => {
    const total = parseFloat(String(d.valorTotal || '').replace(',', '.'));
    if (!total || !m.itens.length) return toast('Informe o valor total e adicione questões.', 'erro');
    const cada = Math.floor((total / m.itens.length) * 100) / 100;
    m.itens.forEach((it, i) => {
      const v = i === m.itens.length - 1 ? total - cada * (m.itens.length - 1) : cada;
      it.valor = String(Math.round(v * 100) / 100).replace('.', ',');
    });
    salvarLocal();
    desenharItens();
  };
  $('#embaralhar', el).onclick = () => {
    for (let i = m.itens.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [m.itens[i], m.itens[j]] = [m.itens[j], m.itens[i]];
    }
    salvarLocal();
    desenharItens();
  };
  $('#descartar', el).onclick = async () => {
    if (!(await confirmar(m.provaId ? 'Cancelar edição' : 'Descartar prova', m.provaId ? 'Descartar as alterações não salvas desta prova?' : 'Descartar a prova em montagem e as questões escolhidas?', 'Descartar', 'btn-caneta'))) return;
    const voltar = m.provaId;
    montagem.limpar();
    ir(voltar ? '/provas/' + voltar : '/provas/nova');
  };

  async function salvar() {
    const f = faltando(d);
    if (!String(d.titulo || '').trim()) f.unshift('título');
    if (f.length) throw new Error('Preencha: ' + f.join(', ') + '.');
    const corpo = { ...d, itens: m.itens };
    const p = m.provaId ? await api.put('/provas/' + m.provaId, corpo) : await api.post('/provas', corpo);
    if (p.questoesRemovidas) toast(`${p.questoesRemovidas} questão(ões) foram retiradas: não estão aprovadas ou não existem mais.`, 'erro');
    montagem.limpar();
    return p;
  }
  const comBotoes = (fn) => async () => {
    const bs = $$('aside .btn', el);
    bs.forEach((b) => (b.disabled = true));
    try { await fn(); } catch (e) { erro(e); } finally { bs.forEach((b) => (b.disabled = false)); }
  };
  $('#salvar', el).onclick = comBotoes(async () => {
    const p = await salvar();
    toast('Prova salva.', 'ok');
    ir('/provas/' + p.id);
  });
  $('#salvar-enviar', el).onclick = comBotoes(async () => {
    if (!m.itens.length) return toast('Adicione questões antes de enviar.', 'erro');
    const p = await salvar();
    await api.post(`/provas/${p.id}/enviar`, {});
    toast('Prova enviada para a supervisão.', 'ok');
    ir('/provas/' + p.id);
  });
  $('#previa', el).onclick = comBotoes(async () => {
    const p = await salvar();
    ir('/imprimir/' + p.id);
  });

  desenharItens();
  barraAcoesMovel(el, [
    { texto: 'Salvar', classe: 'btn-primario', alvo: '#salvar' },
    { texto: 'Salvar e enviar', classe: 'btn-caneta', alvo: '#salvar-enviar' },
  ]);
}
