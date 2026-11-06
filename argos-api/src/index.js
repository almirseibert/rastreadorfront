import fs from 'node:fs/promises';
import express from 'express';
import config from './config.js';
import pool from './db.js';
import migrate from './migrate.js';
import { requireSameOrigin, requireSession } from './auth.js';
import ordersRouter from './routes/orders.js';
import photosRouter from './routes/photos.js';
import templatesRouter from './routes/templates.js';
import reportRouter from './routes/report.js';

const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');

const api = express.Router();

// /health é público (sonda do EasyPanel) e confere banco + armazenamento gravável.
api.get('/health', async (req, res) => {
  const result = { status: 'ok', db: false, storage: false };
  try {
    await pool.query('SELECT 1');
    result.db = true;
  } catch (error) {
    result.dbError = error.message;
  }
  try {
    await fs.mkdir(config.storageDir, { recursive: true });
    await fs.access(config.storageDir);
    result.storage = true;
  } catch (error) {
    result.storageError = error.message;
  }
  res.status(result.db && result.storage ? 200 : 503).json(result);
});

// Tudo abaixo exige sessão válida do Traccar.
api.use(requireSameOrigin);
api.use(requireSession);

api.get('/me', (req, res) => {
  const { userId, name, administrator, manager } = req.session;
  res.json({ userId, name, administrator, manager });
});

// O parser JSON vem depois do multipart das fotos para não consumir o corpo errado.
api.use(express.json({ limit: '256kb' }));

api.use(photosRouter);
api.use(ordersRouter);
api.use(templatesRouter);
api.use(reportRouter);

app.use(config.basePath, api);

// Traduz o erro técnico para algo que faça sentido no snackbar do instalador, em campo.
// Sem isso, o limite do multer virava 500 ("File too large") e um erro de SQL expunha a
// mensagem do driver MySQL para o usuário final.
const describe = (error) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    const mb = Math.round(config.maxUploadBytes / 1048576);
    return { status: 413, message: `Imagem acima do limite de ${mb} MB` };
  }
  if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
    return { status: 400, message: 'Envie uma imagem por vez' };
  }
  if (error.name === 'MulterError') {
    return { status: 400, message: 'Falha ao receber o arquivo' };
  }
  // Erro vindo do MySQL: registra o detalhe no log e devolve algo genérico.
  if (error.sqlState || String(error.code || '').startsWith('ER_')) {
    return { status: 500, message: 'Falha ao acessar o banco de dados' };
  }
  return { status: error.status || 500, message: error.message || 'Erro interno' };
};

// Handler final: mensagem em texto puro, que é o que o fetchOrThrow do frontend exibe.
app.use((error, req, res, next) => {
  const { status, message } = describe(error);
  // O log guarda o detalhe completo; a resposta, só o que ajuda quem está instalando.
  console.error('[argos-api]', req.method, req.originalUrl, status, error.stack || error.message);
  if (res.headersSent) {
    next(error);
    return;
  }
  res.status(status).send(message);
});

const start = async () => {
  if (config.runMigrations) {
    await migrate();
  }
  await fs.mkdir(config.storageDir, { recursive: true });
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`[argos-api] ouvindo em 0.0.0.0:${config.port}${config.basePath}`);
  });
};

start().catch((error) => {
  console.error('[argos-api] falha no boot:', error.message);
  process.exit(1);
});
