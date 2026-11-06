// Configuração via variáveis de ambiente, validada no boot (fail-fast): é melhor o serviço
// não subir do que subir sem banco e falhar só no primeiro upload.

const required = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
};

const number = (name, fallback) => {
  const value = process.env[name];
  return value ? Number(value) : fallback;
};

const config = {
  port: number('PORT', 8090),
  basePath: process.env.ARGOS_BASE_PATH || '/argos',

  // URL interna do Traccar (rede do EasyPanel), usada para validar a sessão do chamador.
  traccarUrl: (process.env.TRACCAR_URL || 'http://traccar:8082').replace(/\/$/, ''),

  db: {
    host: required('DB_HOST'),
    port: number('DB_PORT', 3306),
    user: required('DB_USER'),
    password: process.env.DB_PASSWORD || '',
    database: required('DB_NAME'),
    connectionLimit: number('DB_POOL_LIMIT', 8),
  },

  storageDir: process.env.STORAGE_DIR || '/data/argos',
  maxUploadBytes: number('MAX_UPLOAD_BYTES', 8 * 1024 * 1024),
  maxPhotosPerOrder: number('MAX_PHOTOS_PER_ORDER', 40),
  sessionCacheTtlMs: number('SESSION_CACHE_TTL_MS', 30000),

  // Origens aceitas em requisições que alteram dados (vazio = não verifica, para dev).
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((it) => it.trim())
    .filter(Boolean),

  runMigrations: (process.env.RUN_MIGRATIONS || 'true') !== 'false',
  logLevel: process.env.LOG_LEVEL || 'info',
};

export default config;
