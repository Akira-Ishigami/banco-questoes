// Ícones do sistema (SVG próprio, traço uniforme, cor do texto ao redor).
// Uso: icone('impressora')  ->  <svg ...>  |  no tutorial: "[i:dado]" vira o ícone (ver comIcones).

const P = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  fechar: '<path d="M6 6l12 12M18 6 6 18"/>',
  ajuda: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.5"/><path d="M12 17h.01"/>',
  dado: '<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><circle cx="8.5" cy="8.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="8.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="8.5" cy="15.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.1" fill="currentColor" stroke="none"/>',
  lista: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="m3.5 6 1.5 1.5L7.5 5M3.5 12 5 13.5 7.5 11M3.5 18 5 19.5 7.5 17"/>',
  impressora: '<path d="M7 9V3.5h10V9"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/>',
  filtros: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  capelo: '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c0 1.2 2.7 3 6 3s6-1.8 6-3v-5"/><path d="M22 9v6"/>',
  lapis: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  cima: '<path d="m6 15 6-6 6 6"/>',
  baixo: '<path d="m6 9 6 6 6-6"/>',
  trocar: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3.5V8h4.5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20.5V16h-4.5"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  voltar: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  avancar: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  cadeado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  cadeadoAberto: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7.5a4 4 0 0 1 7.6-1.7"/>',
  casa: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  documento: '<path d="M14 3H6.5A2.5 2.5 0 0 0 4 5.5v13A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  entrada: '<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5.5 5h13l2.5 8v5.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5V13z"/>',
  checkCirculo: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
  camadas: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  escola: '<path d="M3 21h18"/><path d="M5 21V9.5L12 5l7 4.5V21"/><path d="M10 21v-5h4v5"/><path d="M12 5V2.5h3"/>',
  usuarios: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  chave: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16.5 6.5l3 3M14 9l2 2"/>',
  disco: '<path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8V3M7 21v-7h10v7"/>',
  imagem: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-9 9"/>',
  baixar: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',
  aviso: '<path d="M12 3 2 20h20z"/><path d="M12 10v4.5M12 17.5h.01"/>',
};

export function icone(nome, { tamanho = '1.15em', classe = '' } = {}) {
  const corpo = P[nome];
  if (!corpo) return '';
  return `<svg class="ico ${classe}" width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${corpo}</svg>`;
}

// Troca marcadores "[i:nome]" por ícones (usado nos textos do tutorial)
export const comIcones = (texto) => String(texto).replace(/\[i:(\w+)\]/g, (_, n) => icone(n));
