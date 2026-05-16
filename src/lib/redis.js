const config = require('./config');

// BullMQ requires maxRetriesPerRequest: null on ioredis connections
function getRedisConnection() {
  if (config.redisUrl) {
    return {
      url: config.redisUrl,
      maxRetriesPerRequest: null,
    };
  }

  return {
    host: config.redisHost,
    port: config.redisPort,
    maxRetriesPerRequest: null,
  };
}

function isRedisConfigured() {
  return Boolean(config.redisUrl || config.redisHost);
}

module.exports = {
  getRedisConnection,
  isRedisConfigured,
};
