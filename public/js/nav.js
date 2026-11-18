// Navegação compartilhada entre as telas (evita importar app.js nas telas).
export const guarda = { sujo: null }; // tela com formulário registra () => boolean

export function ir(hash) {
  location.hash = hash;
}

// pede ao app para recarregar configurações (disciplinas, escola...) e redesenhar a tela atual
export function recarregarConfig() {
  return new Promise((resolve) => window.dispatchEvent(new CustomEvent('recarregar-config', { detail: resolve })));
}
