import { icone } from './icones.js';

// Utilitários de interface: escape, sanitização, toasts, modal, editor rico.

export const esc = (v) =>
  String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

// --- Sanitização: só tags de formatação simples; nada de scripts/eventos.
const TAGS_OK = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'SUB', 'SUP', 'BR', 'P', 'DIV', 'SPAN', 'UL', 'OL', 'LI', 'IMG', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'BLOCKQUOTE', 'H4', 'S', 'HR']);
export function sanitizar(html) {
  const doc = new DOMParser().parseFromString('<div>' + String(html || '') + '</div>', 'text/html');
  const limpar = (no) => {
    for (const filho of [...no.childNodes]) {
      if (filho.nodeType === 3) continue;
      if (filho.nodeType !== 1 || ['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META'].includes(filho.tagName)) {
        filho.remove();
        continue;
      }
      if (!TAGS_OK.has(filho.tagName)) {
        limpar(filho);
        filho.replaceWith(...filho.childNodes);
        continue;
      }
      for (const at of [...filho.attributes]) {
        const ok = (filho.tagName === 'IMG' && at.name === 'src' && /^(data:image\/|https?:)/i.test(at.value)) ||
          (['TD', 'TH'].includes(filho.tagName) && ['colspan', 'rowspan'].includes(at.name));
        if (!ok) filho.removeAttribute(at.name);
      }
      limpar(filho);
    }
  };
  const raiz = doc.body.firstChild;
  limpar(raiz);
  return raiz.innerHTML;
}
export const textoPuro = (html) => {
  const d = document.createElement('div');
  d.innerHTML = sanitizar(html);
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
};

// --- Toasts
export function toast(msg, tipo = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + tipo;
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), tipo === 'erro' ? 6000 : 3500);
}
export const erro = (e) => toast(e && e.message ? e.message : String(e), 'erro');

// --- Modal (usa <dialog>). Retorna {el, fechar}. Botões com data-acao chamam acoes[acao].
export function modal({ titulo, corpo, botoes = [], largura }) {
  const d = document.createElement('dialog');
  d.className = 'modal';
  if (largura) d.style.width = `min(${largura}px, calc(100vw - 32px))`;
  d.innerHTML = `
    <div class="modal-cab"><h2>${esc(titulo)}</h2><button class="btn btn-fantasma btn-sm btn-icone" data-fechar aria-label="Fechar">${icone('fechar')}</button></div>
    <div class="modal-corpo">${corpo}</div>
    ${botoes.length ? `<div class="modal-pe">${botoes.map((b, i) => `<button class="btn ${b.classe || ''}" data-i="${i}">${b.html || esc(b.texto)}</button>`).join('')}</div>` : ''}`;
  document.body.appendChild(d);
  const fechar = () => { d.close(); d.remove(); };
  d.addEventListener('click', async (ev) => {
    if (ev.target === d || ev.target.closest('[data-fechar]')) return fechar();
    const b = ev.target.closest('[data-i]');
    if (!b) return;
    const def = botoes[Number(b.dataset.i)];
    if (!def.acao) return fechar();
    b.disabled = true;
    try {
      const r = await def.acao(d);
      if (r !== false) fechar();
    } catch (e) {
      erro(e);
    } finally {
      b.disabled = false;
    }
  });
  d.addEventListener('cancel', (ev) => { ev.preventDefault(); fechar(); });
  d.showModal();
  return { el: d, fechar };
}

export function confirmar(titulo, mensagem, textoOk = 'Confirmar', classe = 'btn-primario') {
  return new Promise((resolve) => {
    let ok = false;
    const m = modal({
      titulo,
      corpo: `<p>${mensagem}</p>`,
      botoes: [{ texto: 'Cancelar' }, { texto: textoOk, classe, acao: () => { ok = true; } }],
    });
    const obs = new MutationObserver(() => { if (!document.body.contains(m.el)) { obs.disconnect(); resolve(ok); } });
    obs.observe(document.body, { childList: true });
  });
}

// pede um texto (ex.: comentário de revisão)
export function pedirTexto(titulo, rotulo, { obrigatorio = false, textoOk = 'Enviar', classe = 'btn-primario', valor = '' } = {}) {
  return new Promise((resolve) => {
    let resultado = null;
    const m = modal({
      titulo,
      corpo: `<label class="campo"><span>${esc(rotulo)}</span><textarea rows="4" id="txt-pedido">${esc(valor)}</textarea></label>`,
      botoes: [
        { texto: 'Cancelar' },
        {
          texto: textoOk, classe,
          acao: (d) => {
            const v = d.querySelector('#txt-pedido').value.trim();
            if (obrigatorio && !v) { toast('Escreva um comentário.', 'erro'); return false; }
            resultado = v;
          },
        },
      ],
    });
    setTimeout(() => m.el.querySelector('textarea').focus(), 50);
    const obs = new MutationObserver(() => { if (!document.body.contains(m.el)) { obs.disconnect(); resolve(resultado); } });
    obs.observe(document.body, { childList: true });
  });
}

// --- Barra de ações fixa no rodapé (só aparece no celular/tablet).
// Cada botão apenas "clica" no botão real da tela, assim validações e regras continuam iguais.
export function barraAcoesMovel(raiz, botoes) {
  const barra = document.createElement('div');
  barra.className = 'acoes-movel';
  barra.innerHTML = botoes.map((b, i) => `<button type="button" class="btn ${b.classe || ''}" data-i="${i}">${b.html || esc(b.texto)}</button>`).join('');
  barra.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (!b) return;
    const real = raiz.querySelector(botoes[Number(b.dataset.i)].alvo);
    if (real && !real.disabled) real.click();
  });
  raiz.appendChild(barra);
  return barra;
}

// --- Datas
export const dataBR = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '');
export const dataHoraBR = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '');

// --- Imagens: reduz para no máx. 900px e converte em JPEG/PNG base64 (economiza espaço no banco)
export function lerImagem(arquivo, maxLado = 900) {
  return new Promise((resolve, reject) => {
    if (!arquivo.type.startsWith('image/')) return reject(new Error('Escolha um arquivo de imagem.'));
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagem inválida.'));
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * escala);
        c.height = Math.round(img.height * escala);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        // PNG preserva traços finos (gráficos); JPEG é menor para fotos
        const png = c.toDataURL('image/png');
        const jpg = c.toDataURL('image/jpeg', 0.85);
        resolve(png.length < jpg.length * 1.3 ? png : jpg);
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

// --- Editor de texto rico simples (contenteditable)
export function editorHtml(id, valor = '', { placeholder = '', pequeno = false } = {}) {
  return `
  <div class="editor" data-editor="${id}">
    <div class="editor-barra">
      <button type="button" data-cmd="bold" title="Negrito"><b>N</b></button>
      <button type="button" data-cmd="italic" title="Itálico"><i>I</i></button>
      <button type="button" data-cmd="underline" title="Sublinhado"><u>S</u></button>
      <button type="button" data-cmd="superscript" title="Sobrescrito (x²)">x²</button>
      <button type="button" data-cmd="subscript" title="Subscrito (H₂O)">x₂</button>
      <button type="button" data-cmd="insertUnorderedList" title="Lista">${icone('lista')} Lista</button>
      <button type="button" data-cmd="imagem" title="Inserir imagem">${icone('imagem')} Imagem</button>
      <button type="button" data-cmd="removeFormat" title="Limpar formatação">Limpar formatação</button>
      <input type="file" accept="image/*" hidden>
    </div>
    <div class="editor-area ${pequeno ? 'pequeno' : ''}" contenteditable="true" id="${id}" data-placeholder="${esc(placeholder)}">${sanitizar(valor)}</div>
  </div>`;
}

export function ativarEditores(raiz) {
  $$('[data-editor]', raiz).forEach((ed) => {
    const area = $('.editor-area', ed);
    const arquivo = $('input[type=file]', ed);
    ed.querySelector('.editor-barra').addEventListener('mousedown', (e) => e.preventDefault()); // mantém a seleção
    ed.querySelector('.editor-barra').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cmd]');
      if (!b) return;
      area.focus();
      if (b.dataset.cmd === 'imagem') return arquivo.click();
      document.execCommand(b.dataset.cmd, false, null);
    });
    arquivo.addEventListener('change', async () => {
      if (!arquivo.files[0]) return;
      try {
        const src = await lerImagem(arquivo.files[0]);
        area.focus();
        document.execCommand('insertHTML', false, `<img src="${src}">`);
      } catch (e) {
        erro(e);
      }
      arquivo.value = '';
    });
    // colar: aceita imagens da área de transferência e limpa HTML de Word/sites
    area.addEventListener('paste', async (e) => {
      const itens = [...(e.clipboardData?.items || [])];
      const img = itens.find((i) => i.type.startsWith('image/'));
      e.preventDefault();
      if (img) {
        try {
          const src = await lerImagem(img.getAsFile());
          document.execCommand('insertHTML', false, `<img src="${src}">`);
        } catch (er) { erro(er); }
        return;
      }
      const html = e.clipboardData.getData('text/html');
      if (html) document.execCommand('insertHTML', false, sanitizar(html.replace(/<!--[\s\S]*?-->/g, '')));
      else document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    });
  });
}
export const valorEditor = (id, raiz = document) => sanitizar($('#' + id, raiz).innerHTML).replace(/^(<br>)+$/, '');

// --- Embaralhamento determinístico (mesma versão = mesma ordem sempre)
export function rngComSemente(semente) {
  let h = 1779033703 ^ semente.length;
  for (let i = 0; i < semente.length; i++) {
    h = Math.imul(h ^ semente.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}
export function embaralhar(lista, rng) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const LETRAS = 'ABCDEF';
