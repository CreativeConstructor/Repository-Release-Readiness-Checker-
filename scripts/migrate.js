/**
 * Applies .sql files in migrations/ in filename order.
 * Tracks applied files in schema_migrations so re-runs are safe.
 *
 * Usage: npm run migrate
 */
const fs = require('fs');
const path = require('path');
const { query, closePool } = require('../src/lib/db');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function ensureMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function isApplied(filename) {
  const { rows } = await query(
    'SELECT 1 FROM schema_migrations WHERE filename = $1',
    [filename]
  );
  return rows.length > 0;
}

async function markApplied(filename) {
  await query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
}

async function runMigrations() {
  await ensureMigrationsTable();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found.');
    return;
  }

  for (const filename of files) {
    if (await isApplied(filename)) {
      console.log(`Skip (already applied): ${filename}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
    await query(sql);
    await markApplied(filename);
    console.log(`Applied: ${filename}`);
  }
}

runMigrations()
  .then(() => {
    console.log('Migrations complete.');
  })
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => closePool());
