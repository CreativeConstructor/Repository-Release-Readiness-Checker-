require('dotenv').config();

const port = Number(process.env.PORT) || 3000;
const nodeEnv = process.env.NODE_ENV || 'development';

module.exports = {
  port,
  nodeEnv,
  isDev: nodeEnv === 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  githubToken: process.env.GITHUB_TOKEN,
  googleApiKey: process.env.GOOGLE_API_KEY,
  googleModel: process.env.GOOGLE_MODEL || 'gemini-2.0-flash-lite',
  aiForceFallback: process.env.AI_FORCE_FALLBACK === 'true',
  googleAiMaxRetries: Number(process.env.GOOGLE_AI_MAX_RETRIES) || 3,
  googleAiRetryDelayMs: Number(process.env.GOOGLE_AI_RETRY_DELAY_MS) || 2000,
  googleAiFallbackOnRateLimit: process.env.GOOGLE_AI_FALLBACK_ON_RATE_LIMIT !== 'false',
  redisUrl: process.env.REDIS_URL,
  redisHost: process.env.REDIS_HOST || '127.0.0.1',
  redisPort: Number(process.env.REDIS_PORT) || 6379,
};
