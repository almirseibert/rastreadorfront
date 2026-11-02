import mysql from 'mysql2/promise';
import config from './config.js';

// Pool único compartilhado. Mesmo banco do Traccar, apenas tabelas `argos_*` para escrita.
const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: config.db.connectionLimit,
  queueLimit: 0,
  timezone: 'Z',
  dateStrings: false,
  charset: 'utf8mb4_unicode_ci',
});

export const query = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

export const queryOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

export const execute = async (sql, params = []) => {
  const [result] = await pool.execute(sql, params);
  return result;
};

export const raw = (sql) => pool.query(sql);

export default pool;
