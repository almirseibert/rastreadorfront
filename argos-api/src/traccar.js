import crypto from 'node:crypto';
import config from './config.js';

// O argos-api não tem usuários nem sessão própria: a identidade do chamador é sempre
// resolvida pelo Traccar, repassando a credencial recebida do navegador. Isso evita
// reimplementar (e divergir de) o grafo de permissões usuário → grupo → dispositivo.

const cache = new Map(); // hash da credencial -> { value, expiresAt }
const MAX_CACHE = 1000;

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');

const cacheGet = (key) => {
  const entry = cache.get(key);
  if (!entry) {
    return undefined;
  }
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
};

const cacheSet = (key, value, ttl) => {
  if (cache.size >= MAX_CACHE) {
    cache.clear();
  }
  cache.set(key, { value, expiresAt: Date.now() + ttl });
};

// Extrai da requisição apenas o que autentica no Traccar. Nunca é gravado em disco nem logado.
export const credentialsOf = (req) => {
  const cookie = req.headers.cookie
    ?.split(';')
    .map((it) => it.trim())
    .find((it) => it.startsWith('JSESSIONID='));
  const authorization = req.headers.authorization;
  if (!cookie && !authorization) {
    return null;
  }
  return { cookie, authorization };
};

const headersOf = (credentials) => {
  const headers = {};
  if (credentials.cookie) {
    headers.cookie = credentials.cookie;
  }
  if (credentials.authorization) {
    headers.authorization = credentials.authorization;
  }
  return headers;
};

const keyOf = (credentials) => hash(`${credentials.cookie || ''}|${credentials.authorization || ''}`);

export const getSession = async (credentials) => {
  const key = `session:${keyOf(credentials)}`;
  const cached = cacheGet(key);
  if (cached !== undefined) {
    return cached;
  }

  let session = null;
  const response = await fetch(`${config.traccarUrl}/api/session`, {
    headers: headersOf(credentials),
  });
  if (response.ok) {
    const user = await response.json();
    session = {
      userId: user.id,
      name: user.name,
      administrator: !!user.administrator,
      manager: !!user.administrator || (user.userLimit || 0) !== 0,
      readonly: !!user.readonly,
      attributes: user.attributes || {},
    };
  }

  // TTL curto para negativo, para não martelar o Traccar numa rajada de uploads inválidos.
  cacheSet(key, session, session ? config.sessionCacheTtlMs : 5000);
  return session;
};

// O device é visível para o chamador? Resposta vazia significa sem acesso.
export const getVisibleDevice = async (credentials, deviceId) => {
  const key = `device:${keyOf(credentials)}:${deviceId}`;
  const cached = cacheGet(key);
  if (cached !== undefined) {
    return cached;
  }

  let device = null;
  const response = await fetch(`${config.traccarUrl}/api/devices?id=${encodeURIComponent(deviceId)}`, {
    headers: headersOf(credentials),
  });
  if (response.ok) {
    const items = await response.json();
    device = items.length ? items[0] : null;
  }

  cacheSet(key, device, device ? config.sessionCacheTtlMs : 5000);
  return device;
};
