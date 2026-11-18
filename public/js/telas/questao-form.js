// Cadastro / edição de questão com gabarito.
import { api } from '../api.js';
import { esc, $, $$, toast, erro, editorHtml, ativarEditores, valorEditor, pedirTexto, LETRAS, barraAcoesMovel } from '../ui.js';
import { estado, pode, disciplinasAtivas, assuntosDa, DIFICULDADE, ORIGENS, cartaoQuestao, ultimoComentario, badge, fmtValor, nomeDisciplina } from '../estado.js';
import { montarCampoBncc, codigosNoTexto } from '../bncc.js';
import { icone } from '../icones.js';
import { ir, guarda } from '../nav.js';

export async function telaQuestaoForm(el, { params }) {
  const id = params[0];
  const q = id
    ? await api.get('/questoes/' + id)
    : {
      tipo: 'objetiva', dificuldade: '', origem: 'Autoral', fonte: '', serie: '', linhas: 5,
      disciplinaId: estado.eu.disciplinas[0] || '', assuntoId: '', enunciado: '', resolucao: '', respostaEsperada: '',
      alternativas: [0, 1, 2, 3, 4].map(() => ({ texto: '', correta: false })),
    };
  const ehRevisor = pode('questoes.editar_todas');
  const dono = !id || q.autorId === estado.eu.id;
  if (id && !ehRevisor && !(dono && q.status !== 'em_revisao')) {
    el.innerHTML = '<div class="vazio"><strong>Esta questão não pode ser editada agora</strong>Ela está em revisão pela supervisão.</div>';
    return;
  }

  // disciplinas do professor aparecem primeiro
  const minhas = new Set(estado.eu.disciplinas);
  const discs = disciplinasAtivas().sort((a, b) => (minhas.has(b.id) - minhas.has(a.id)) || a.nome.localeCompare(b.nome));

  el.innerHTML = `
    <div class="cabecalho-pagina">
      <div><h1>${id ? 'Editar questão ' + esc(q.codigo) : 'Cadastrar questão'}</h1>
      ${id ? `<p>${badge(q.status)}${q.status === 'aprovada' && !ehRevisor ? ' Ao salvar, a questão volta para revisão.' : ''}</p>` : ''}</div>
      <div class="acoes"><a class="btn btn-fantasma" href="#/banco?escopo=minhas">Cancelar</a></div>
    </div>
    ${id && q.status === 'devolvida' ? ultimoComentario(q) + '<div style="height:16px"></div>' : ''}
    <form class="form-questao" id="fq" autocomplete="off">
      <div>
        <div class="card">
          <h3>Classificação</h3>
          <div class="grade">
            <label class="campo"><span>Disciplina *</span><select name="disciplinaId" required>
              <option value="">Escolha…</option>
              ${minhas.size
                ? `<optgroup label="Suas disciplinas">${discs.filter((d) => minhas.has(d.id)).map((d) => `<option value="${d.id}">${esc(d.nome)}</option>`).join('')}</optgroup>
                   <optgroup label="Outras disciplinas">${discs.filter((d) => !minhas.has(d.id)).map((d) => `<option value="${d.id}">${esc(d.nome)}</option>`).join('')}</optgroup>`
                : discs.map((d) => `<option value="${d.id}">${esc(d.nome)}</option>`).join('')}</select></label>
            <label class="campo"><span>Assunto</span>
              <div class="flex" style="flex-wrap:nowrap"><select name="assuntoId"></select><button type="button" class="btn btn-sm" id="novo-assunto" title="Novo assunto">+</button></div></label>
            <label class="campo"><span>Série / ano *</span><select name="serie" required><option value="">Escolha…</option>${estado.series.map((s) => `<option>${esc(s)}</option>`).join('')}</select></label>
          </div>
          <div class="grade">
            <label class="campo"><span>Tipo</span><select name="tipo"><option value="objetiva">Objetiva (múltipla escolha)</option><option value="discursiva">Discursiva (aberta)</option></select></label>
            <label class="campo"><span>Dificuldade *</span><select name="dificuldade" required><option value="">Escolha…</option>${Object.entries(DIFICULDADE).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
            <label class="campo"><span>Origem</span><select name="origem">${ORIGENS.map((o) => `<option>${o}</option>`).join('')}</select></label>
            <label class="campo"><span>Fonte / ano</span><input type="text" name="fonte" placeholder="Ex.: ENEM 2019, livro X p. 42" value="${esc(q.fonte)}"></label>
            <label class="campo"><span>Valor (pontos)</span><input type="text" name="valor" inputmode="decimal" placeholder="Ex.: 0,5" value="${esc(fmtValor(q.valor))}" pattern="\\s*\\d{0,3}([.,]\\d{1,2})?\\s*" title="Use um número, como 0,5 ou 2">
              </label>
          </div>
        </div>

        <div class="card">
          <h3>Habilidades BNCC</h3>
          <div id="campo-bncc"></div>
          <div id="bncc-detectado"></div>
        </div>

        <div class="card">
          <h3>Enunciado *</h3>
          ${editorHtml('ed-enunciado', q.enunciado, { placeholder: 'Digite ou cole o enunciado. Você pode colar imagens (Ctrl+V).' })}
        </div>

        <div class="card" id="bloco-objetiva">
          <div class="flex entre"><h3 style="margin:0">Alternativas e gabarito *</h3><small>Marque a correta</small></div>
          <label class="check mt"><input type="checkbox" name="alternativasNoEnunciado" ${q.alternativasNoEnunciado ? 'checked' : ''}>
            Alternativas dentro do enunciado (imagem) — informar só a letra</label>
          <div id="alternativas" class="mt"></div>
          <button type="button" class="btn btn-sm" id="add-alt">${icone('mais')} Alternativa</button>
        </div>

        <div class="card" id="bloco-discursiva">
          <h3>Resposta esperada <small class="suave">(opcional)</small></h3>
          ${editorHtml('ed-resposta', q.respostaEsperada, { placeholder: 'Opcional: pontos que a resposta deve conter, critérios de correção…', pequeno: true })}
          <label class="campo mt" style="max-width:260px"><span>Linhas para resposta na prova</span><input type="number" name="linhas" min="0" max="40" value="${q.linhas || 5}"></label>
        </div>

        <div class="card">
          <h3>Resolução <small class="suave">(opcional)</small></h3>
          <textarea name="resolucao" rows="3" placeholder="Explique como chegar à resposta.">${esc(q.resolucao)}</textarea>
        </div>
      </div>

      <aside style="position:sticky;top:20px">
        <div class="card">
          <h3>Salvar</h3>
          ${ehRevisor
            ? `<button type="submit" class="btn btn-primario" style="width:100%" data-enviar="0">Salvar</button>
               ${!id || ['rascunho', 'devolvida'].includes(q.status) ? '<button type="submit" class="btn" style="width:100%;margin-top:8px" data-enviar="1">Salvar e enviar para revisão</button>' : ''}`
            : `<button type="submit" class="btn btn-caneta" style="width:100%" data-enviar="1">Salvar e enviar para revisão</button>
               <button type="submit" class="btn" style="width:100%;margin-top:8px" data-enviar="0">Salvar como rascunho</button>`}
          ${!id ? '<label class="check mt"><input type="checkbox" id="outra"> Cadastrar outra em seguida</label>' : ''}
        </div>
        <div class="mt"><div class="rotulo" style="margin-bottom:6px">Prévia</div><div id="previa"></div></div>
      </aside>
    </form>`;

  const f = $('#fq', el);
  f.disciplinaId.value = q.disciplinaId;
  f.serie.value = q.serie;
  f.tipo.value = q.tipo;
  f.dificuldade.value = String(q.dificuldade);
  f.origem.value = ORIGENS.includes(q.origem) ? q.origem : 'Outra';
  ativarEditores(el);

  // habilidades BNCC: sugestões seguem a disciplina e a série escolhidas
  let pronto = false; // evita redesenhar a prévia antes de tudo estar montado
  const campoBncc = montarCampoBncc($('#campo-bncc', el), {
    valores: q.bncc || [],
    contexto: () => ({ disciplina: nomeDisciplina(f.disciplinaId.value), serie: f.serie.value }),
    aoMudar: () => { if (pronto) { previa(); detectarBncc(); } },
  });
  // códigos escritos no enunciado (ex.: "(EF69AR04) Quanto à combinação...") viram sugestão de um clique
  function detectarBncc() {
    const achados = codigosNoTexto($('#ed-enunciado', el).textContent).filter((c) => !campoBncc.valor().includes(c));
    $('#bncc-detectado', el).innerHTML = achados.length
      ? `<div class="aviso mt">Encontrei no enunciado: ${achados.map((c) => `<b>${c}</b>`).join(', ')}
          <button type="button" class="btn btn-sm" id="usar-bncc-enunciado" style="margin-left:8px">Adicionar como habilidade</button></div>`
      : '';
    const b = $('#usar-bncc-enunciado', el);
    if (b) b.onclick = () => { achados.forEach((c) => campoBncc.adicionar(c)); detectarBncc(); };
  }
  $('#ed-enunciado', el).addEventListener('input', detectarBncc);

  let alternativas = q.alternativas.length ? q.alternativas.map((a) => ({ ...a })) : [{ texto: '', correta: false }, { texto: '', correta: false }];

  const preencherAssuntos = () => {
    const lista = assuntosDa(f.disciplinaId.value);
    f.assuntoId.innerHTML = `<option value="">${f.disciplinaId.value ? '— sem assunto —' : 'Escolha a disciplina'}</option>` + lista.map((a) => `<option value="${a.id}">${esc(a.nome)}</option>`).join('');
    if (lista.some((a) => a.id === q.assuntoId)) f.assuntoId.value = q.assuntoId;
  };
  preencherAssuntos();

  // ao "cadastrar outra", reaproveita a classificação anterior
  if (!id) {
    try {
      const ult = JSON.parse(sessionStorage.getItem('ultimaClassificacao') || 'null');
      sessionStorage.removeItem('ultimaClassificacao');
      if (ult) {
        ['disciplinaId', 'serie', 'tipo', 'dificuldade', 'origem', 'fonte', 'valor'].forEach((k) => (f[k].value = String(ult[k] ?? '')));
        q.assuntoId = ult.assuntoId;
        (ult.bncc || []).forEach((c) => campoBncc.adicionar(c));
        preencherAssuntos();
      }
    } catch { /* ignore */ }
  }

  f.disciplinaId.onchange =() => { q.assuntoId = ''; preencherAssuntos(); previa(); };
  f.assuntoId.onchange = () => { q.assuntoId = f.assuntoId.value; previa(); };

  $('#novo-assunto', el).onclick = async () => {
    if (!f.disciplinaId.value) return toast('Escolha a disciplina primeiro.', 'erro');
    const nome = await pedirTexto('Novo assunto', 'Nome do assunto (ex.: Frações, Ecologia)', { obrigatorio: true, textoOk: 'Criar' });
    if (!nome) return;
    try {
      const a = await api.post('/assuntos', { disciplinaId: f.disciplinaId.value, nome });
      if (!estado.assuntos.some((x) => x.id === a.id)) estado.assuntos.push(a);
      q.assuntoId = a.id;
      preencherAssuntos();
      previa();
    } catch (e) { erro(e); }
  };

  const soLetras = () => f.alternativasNoEnunciado.checked;
  f.alternativasNoEnunciado.onchange = () => {
    if (soLetras()) while (alternativas.length < 5) alternativas.push({ texto: '', correta: false });
    desenharAlternativas();
    previa();
  };

  function desenharAlternativas() {
    $('#alternativas', el).innerHTML = alternativas.map((a, i) => `
      <div class="alt-linha ${a.correta ? 'eh-correta' : ''}" data-i="${i}">
        <span class="letra">${LETRAS[i]}</span>
        <label class="alt-correta" title="Marcar como correta"><input type="radio" name="correta" ${a.correta ? 'checked' : ''}></label>
        ${soLetras() ? `<span style="padding-top:8px" class="suave">${a.correta ? icone('check') + ' resposta correta' : ''}</span>` : `<textarea rows="1" placeholder="Texto da alternativa ${LETRAS[i]}">${esc(a.texto)}</textarea>`}
        <button type="button" class="btn btn-fantasma btn-sm" data-remover title="Remover alternativa" aria-label="Remover alternativa" ${alternativas.length <= 2 ? 'disabled' : ''}>${icone('fechar')}</button>
      </div>`).join('');
    $('#add-alt', el).disabled = alternativas.length >= 6;
    $$('#alternativas textarea', el).forEach(autoAltura);
  }
  function autoAltura(t) {
    t.style.height = 'auto';
    t.style.height = t.scrollHeight + 2 + 'px';
  }
  $('#alternativas', el).addEventListener('input', (e) => {
    if (e.target.tagName !== 'TEXTAREA') return;
    alternativas[Number(e.target.closest('.alt-linha').dataset.i)].texto = e.target.value;
    autoAltura(e.target);
    previa();
  });
  $('#alternativas', el).addEventListener('change', (e) => {
    if (e.target.name !== 'correta') return;
    const i = Number(e.target.closest('.alt-linha').dataset.i);
    alternativas.forEach((a, j) => (a.correta = j === i));
    desenharAlternativas();
    previa();
  });
  $('#alternativas', el).addEventListener('click', (e) => {
    if (!e.target.closest('[data-remover]')) return;
    alternativas.splice(Number(e.target.closest('.alt-linha').dataset.i), 1);
    desenharAlternativas();
    previa();
  });
  $('#add-alt', el).onclick = () => { alternativas.push({ texto: '', correta: false }); desenharAlternativas(); $$('#alternativas textarea', el).pop().focus(); };

  const alternarTipo = () => {
    const obj = f.tipo.value === 'objetiva';
    $('#bloco-objetiva', el).classList.toggle('oculto', !obj);
    $('#bloco-discursiva', el).classList.toggle('oculto', obj);
  };
  f.tipo.onchange = () => { alternarTipo(); previa(); };

  function coletar() {
    return {
      disciplinaId: f.disciplinaId.value,
      assuntoId: f.assuntoId.value,
      serie: f.serie.value,
      tipo: f.tipo.value,
      dificuldade: Number(f.dificuldade.value),
      origem: f.origem.value,
      fonte: f.fonte.value,
      valor: f.valor.value,
      bncc: campoBncc.valor(),
      enunciado: valorEditor('ed-enunciado', el),
      alternativasNoEnunciado: f.tipo.value === 'objetiva' && soLetras(),
      alternativas: f.tipo.value !== 'objetiva' ? []
        : soLetras() ? alternativas.map((a, i) => ({ texto: LETRAS[i], correta: a.correta }))
          : alternativas.filter((a) => a.texto.trim()),
      respostaEsperada: valorEditor('ed-resposta', el),
      linhas: Number(f.linhas.value) || 0,
      resolucao: f.resolucao.value,
    };
  }

  function previa() {
    const d = coletar();
    if (d.tipo === 'objetiva') d.alternativas = alternativas.map((a) => ({ ...a, texto: a.texto || '…' }));
    $('#previa', el).innerHTML = cartaoQuestao({ ...q, ...d, codigo: q.codigo || 'Nova', autorId: q.autorId || estado.eu.id, status: q.status || 'rascunho', enunciado: d.enunciado || '<p class="suave">O enunciado aparece aqui…</p>' }, { mostrarStatus: false });
  }

  const inicial = JSON.stringify(coletar());
  let salvo = false;
  guarda.sujo = () => !salvo && JSON.stringify(coletar()) !== inicial;

  el.addEventListener('input', (e) => { if (e.target.closest('.editor-area, input, select, textarea')) previa(); });
  let enviar = false;
  $$('[data-enviar]', el).forEach((b) => (b.onclick = () => (enviar = b.dataset.enviar === '1')));
  f.onsubmit = async (e) => {
    e.preventDefault();
    const dados = coletar();
    if (dados.tipo === 'objetiva' && !dados.alternativas.some((a) => a.correta)) return toast('Marque a alternativa correta (gabarito).', 'erro');
    const botoes = $$('[data-enviar]', el);
    botoes.forEach((b) => (b.disabled = true));
    try {
      const salva = id ? await api.put('/questoes/' + id, { ...dados, enviar }) : await api.post('/questoes', { ...dados, enviar });
      salvo = true;
      toast(`Questão ${salva.codigo} salva${salva.status === 'em_revisao' ? ' e enviada para revisão' : ''}.`, 'ok');
      if (!id && $('#outra', el)?.checked) {
        // mantém a classificação para agilizar o cadastro em sequência
        const manter = { disciplinaId: dados.disciplinaId, assuntoId: dados.assuntoId, serie: dados.serie, tipo: dados.tipo, dificuldade: dados.dificuldade, origem: dados.origem, fonte: dados.fonte, valor: dados.valor, bncc: dados.bncc };
        sessionStorage.setItem('ultimaClassificacao', JSON.stringify(manter));
        guarda.sujo = null;
        return telaQuestaoForm(el, { params: [] });
      }
      ir('/banco?escopo=minhas');
    } catch (er) {
      erro(er);
    } finally {
      botoes.forEach((b) => (b.disabled = false));
    }
  };

  desenharAlternativas();
  alternarTipo();
  pronto = true;
  detectarBncc();
  previa();

  // celular: botões de salvar sempre à mão no rodapé
  barraAcoesMovel(el, ehRevisor
    ? [{ texto: 'Salvar', classe: 'btn-primario', alvo: '[data-enviar="0"]' }].concat($('[data-enviar="1"]', el) ? [{ texto: 'Enviar p/ revisão', alvo: '[data-enviar="1"]' }] : [])
    : [{ texto: 'Rascunho', alvo: '[data-enviar="0"]' }, { texto: 'Salvar e enviar', classe: 'btn-caneta', alvo: '[data-enviar="1"]' }]);
}
