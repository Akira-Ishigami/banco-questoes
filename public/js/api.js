// Comunicação com o servidor
export class ErroApi extends Error {
  constructor(status, msg) {
    super(msg);
    this.status = status;
  }
}

async function chamar(metodo, url, corpo) {
  const opts = { method: metodo, headers: {}, credentials: 'same-origin' };
  if (corpo !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(corpo);
  }
  let res;
  try {
    res = await fetch('/api' + url, opts);
  } catch {
    throw new ErroApi(0, 'Não foi possível falar com o servidor. Ele está ligado?');
  }
  const dados = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && url !== '/login') window.dispatchEvent(new CustomEvent('sessao-expirada'));
    throw new ErroApi(res.status, dados.erro || 'Erro ' + res.status);
  }
  return dados;
}

export const api = {
  get: (url) => chamar('GET', url),
  post: (url, corpo = {}) => chamar('POST', url, corpo),
  put: (url, corpo = {}) => chamar('PUT', url, corpo),
  del: (url) => chamar('DELETE', url),
};
