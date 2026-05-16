const config = require('./lib/config');
const app = require('./app');
const { closePool } = require('./lib/db');

const server = app.listen(config.port, () => {
  console.log(
    `API listening on http://localhost:${config.port} (${config.nodeEnv})`
  );
  if (!config.databaseUrl) {
    console.warn('Warning: DATABASE_URL is not set. /health/db will fail.');
  }
  if (!config.jwtSecret) {
    console.warn('Warning: JWT_SECRET is not set. Auth routes will fail.');
  }
  if (!config.githubToken) {
    console.warn(
      'Warning: GITHUB_TOKEN is not set. Public repos work but rate limits are low (60 req/hr).'
    );
  }
  if (!config.googleApiKey) {
    console.warn(
      'Warning: GOOGLE_API_KEY is not set. /api/check will use rule-based fallback scoring.'
    );
  }
  if (!config.redisUrl && !process.env.REDIS_HOST) {
    console.warn(
      'Warning: REDIS_URL is not set. POST /api/check/async will be unavailable.'
    );
  }
});

async function shutdown() {
  console.log('Shutting down...');
  server.close();
  await closePool();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
