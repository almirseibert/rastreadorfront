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

// Handler final: mensagem em texto puro, que é o que o fetchOrThrow do frontend exibe.
app.use((error, req, res, next) => {
  console.error('[argos-api]', error.message);
  if (res.headersSent) {
    next(error);
    return;
  }
  res.status(error.status || 500).send(error.message || 'Erro interno');
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
