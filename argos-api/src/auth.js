import config from './config.js';
import { credentialsOf, getSession, getVisibleDevice } from './traccar.js';
import { queryOne } from './db.js';

// Middlewares de identidade e autorização. Erros respondem TEXTO PURO porque o frontend usa
// fetchOrThrow(), que faz `new Error(await response.text())` e joga a mensagem no snackbar.

export const requireSession = async (req, res, next) => {
  try {
    const credentials = credentialsOf(req);
    if (!credentials) {
      res.status(401).send('Sessão ausente');
      return;
    }
    const session = await getSession(credentials);
    if (!session) {
      res.status(401).send('Sessão inválida ou expirada');
      return;
    }
    req.credentials = credentials;
    req.session = session;
    next();
  } catch (error) {
    next(error);
  }
};

// Defesa de CSRF em requisições que alteram dados. O cookie do Traccar é tratado como
// SameSite=Lax pelos navegadores, então o vetor já é estreito; estas duas checagens cobrem
// o resto sem exigir um token de sincronismo (que o Traccar não emite).
export const requireSameOrigin = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }
  if (req.headers['x-argos-client'] !== 'web') {
    res.status(403).send('Cabeçalho X-Argos-Client ausente');
    return;
  }
  if (config.allowedOrigins.length) {
    const origin = req.headers.origin;
    if (!origin || !config.allowedOrigins.includes(origin)) {
      res.status(403).send('Origem não permitida');
      return;
    }
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.session?.administrator) {
    res.status(403).send('Apenas administradores');
    return;
  }
  next();
};

export const requireReviewer = (req, res, next) => {
  if (!req.session?.manager) {
    res.status(403).send('Apenas administradores e gestores');
    return;
  }
  next();
};

// Carrega a ordem e decide o acesso:
//  - admin/gestor: todas;
//  - instalador: as que ele mesmo criou;
//  - cliente: as do dispositivo que ele consegue ver no Traccar.
export const loadOrder = async (req, res, next) => {
  try {
    const order = await queryOne('SELECT * FROM argos_install_order WHERE id = ?', [
      Number(req.params.id),
    ]);
    if (!order) {
      res.status(404).send('Ordem não encontrada');
      return;
    }

    const { session, credentials } = req;
    let allowed = session.manager || order.installer_user_id === session.userId;
    if (!allowed && order.device_id) {
      allowed = !!(await getVisibleDevice(credentials, order.device_id));
    }
    if (!allowed) {
      res.status(403).send('Sem acesso a esta ordem');
      return;
    }

    req.order = order;
    req.canReview = !!session.manager;
    req.isOwner = order.installer_user_id === session.userId;
    next();
  } catch (error) {
    next(error);
  }
};
