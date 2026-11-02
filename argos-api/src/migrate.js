import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pool, { execute, query } from './db.js';

// Runner de migrações em SQL puro. Sem Liquibase de propósito: o Liquibase deste banco é do
// Traccar e não deve ser compartilhado. Cada arquivo roda uma vez e fica registrado em
// argos_schema_version com o checksum, para detectar edição de migração já aplicada.

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

// Divide o arquivo em comandos, ignorando comentários de linha.
const statements = (sql) =>
  sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((it) => it.trim())
    .filter(Boolean);

export const migrate = async () => {
  await execute(`CREATE TABLE IF NOT EXISTS argos_schema_version (
    version    INT          NOT NULL PRIMARY KEY,
    filename   VARCHAR(255) NOT NULL,
    checksum   CHAR(64)     NOT NULL,
    applied_at DATETIME(3)  NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  const applied = await query('SELECT version, filename, checksum FROM argos_schema_version');
  const appliedByVersion = new Map(applied.map((row) => [row.version, row]));

  const files = (await fs.readdir(dir)).filter((name) => name.endsWith('.sql')).sort();

  for (const filename of files) {
    const version = Number(filename.split('_')[0]);
    if (!Number.isFinite(version)) {
      throw new Error(`Migração com nome inválido (esperado NNN_nome.sql): ${filename}`);
    }
    const sql = await fs.readFile(path.join(dir, filename), 'utf8');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');
    const previous = appliedByVersion.get(version);

    if (previous) {
      if (previous.checksum !== checksum) {
        // Não tenta "consertar": avisa, porque reaplicar poderia destruir dados.
        console.warn(
          `[migrate] ${filename} já aplicada com outro conteúdo (checksum diferente). ` +
            'Crie uma migração nova em vez de editar a anterior.',
        );
      }
      continue;
    }

    console.log(`[migrate] aplicando ${filename}`);
    for (const statement of statements(sql)) {
      await pool.query(statement);
    }
    await execute(
      'INSERT INTO argos_schema_version (version, filename, checksum, applied_at) VALUES (?, ?, ?, NOW(3))',
      [version, filename, checksum],
    );
  }
};

// Permite `npm run migrate` isolado do servidor.
if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  migrate()
    .then(() => {
      console.log('[migrate] concluído');
      return pool.end();
    })
    .catch((error) => {
      console.error('[migrate] falhou:', error.message);
      process.exit(1);
    });
}

export default migrate;
