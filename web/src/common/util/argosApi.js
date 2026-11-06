// Cliente HTTP do argos-api (ordens de instalação, checklists e fotos).
//
// Por padrão o serviço fica no MESMO domínio, sob /argos (proxy do EasyPanel), então a
// requisição é same-origin e o cookie de sessão do Traccar viaja sozinho. Se o deploy usar
// host separado, basta definir VITE_ARGOS_API_URL — aí o modo muda para credenciais
// explícitas (o cookie não atravessa, por SameSite).

const base = (import.meta.env?.VITE_ARGOS_API_URL || '/argos').replace(/\/$/, '');

export const argosUrl = (path) => `${base}/${String(path).replace(/^\//, '')}`;

// Marca de erro "o serviço não está lá". Enquanto a regra de proxy /argos não existir no
// EasyPanel, a requisição cai no servidor web do Traccar, que responde o index.html da
// SPA (ou um 404 em HTML). Sem detectar isso, o trecho de HTML ia cru para o snackbar.
// Quem chama trata `error.unavailable` mostrando uma explicação de verdade.
export const isUnavailable = (error) => Boolean(error?.unavailable);

const looksLikeHtml = (contentType, text) =>
  /text\/html/i.test(contentType || '') || /^\s*<(!doctype|html)/i.test(text || '');

// Resposta sem corpo nosso (HTML da SPA, erro do proxy, serviço fora do ar).
const unavailableError = (status) => {
  const error = new Error(`argos-api indisponível (HTTP ${status || 0})`);
  error.status = status || 0;
  error.unavailable = true;
  return error;
};

// Mesma mensagem de erro que fetchOrThrow mostra no snackbar global.
const throwIfError = async (response) => {
  if (!response.ok) {
    let message = response.statusText;
    let payload = null;
    let text = '';
    try {
      text = await response.text();
      if (text) {
        try {
          payload = JSON.parse(text);
          message = payload.message || text;
        } catch {
          message = text;
        }
      }
    } catch {
      // mantém statusText
    }
    const contentType = response.headers.get('content-type');
    // 404/502/503/504 com corpo em HTML (ou vazio) = o serviço não está roteado aqui.
    if (
      [404, 502, 503, 504].includes(response.status) &&
      (!text || looksLikeHtml(contentType, text))
    ) {
      throw unavailableError(response.status);
    }
    const error = new Error(message);
    error.status = response.status;
    // Alguns erros trazem detalhe estruturado (ex.: `missing` ao concluir uma ordem
    // incompleta); quem chama lê daqui em vez de reparsear a mensagem.
    error.payload = payload;
    throw error;
  }
  return response;
};

export const argosFetch = async (path, { method = 'GET', body, headers = {} } = {}) => {
  let response;
  try {
    response = await fetch(argosUrl(path), {
      method,
      credentials: 'include',
      headers: {
        // Barra CSRF por formulário de outro site: o serviço exige este cabeçalho em
        // requisições que alteram dados.
        'X-Argos-Client': 'web',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Falha de rede: o serviço não respondeu (não confundir com erro de aplicação).
    throw unavailableError(0);
  }
  await throwIfError(response);
  if (response.status === 204) {
    return null;
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

// Upload com progresso. É o único ponto do app que usa XMLHttpRequest em vez de fetch,
// porque o fetch não expõe progresso de upload (não é desvio acidental do padrão).
export const argosUpload = ({ orderId, slot, blob, clientPhotoId, position, onProgress }) =>
  new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', blob, `${slot}.jpg`);
    form.append('slot', slot);
    if (clientPhotoId) {
      form.append('clientPhotoId', clientPhotoId);
    }
    if (position != null) {
      form.append('position', String(position));
    }

    const request = new XMLHttpRequest();
    request.open('POST', argosUrl(`orders/${orderId}/photos`));
    request.withCredentials = true;
    request.setRequestHeader('X-Argos-Client', 'web');
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        try {
          resolve(JSON.parse(request.responseText));
        } catch {
          resolve(null);
        }
      } else if (
        [404, 502, 503, 504].includes(request.status) &&
        (!request.responseText ||
          looksLikeHtml(request.getResponseHeader('content-type'), request.responseText))
      ) {
        reject(unavailableError(request.status));
      } else {
        reject(new Error(request.responseText || request.statusText));
      }
    };
    request.onerror = () => reject(unavailableError(0));
    request.send(form);
  });

export default argosFetch;
