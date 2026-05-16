const { Pool } = require('pg');
const config = require('./config');

let pool;

function getPool() {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env and configure Postgres.');
  }
  if (!pool) {
    pool = new Pool({ connectionString: config.databaseUrl });
  }
  return pool;
}

async function query(text, params) {
  return getPool().query(text, params);
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getPool,
  query,
  closePool,
};
