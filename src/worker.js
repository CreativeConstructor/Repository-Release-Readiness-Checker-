require('dotenv').config();

const { Worker } = require('bullmq');
const { getRedisConnection } = require('./lib/redis');
const { QUEUE_NAME } = require('./queues/checkQueue');
const { runFullCheck, CheckPipelineError } = require('./services/runCheck');

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const { userId, repoUrl } = job.data;

    await job.updateProgress(10);
    const result = await runFullCheck(userId, repoUrl);
    await job.updateProgress(100);

    return result;
  },
  {
    connection: getRedisConnection(),
    concurrency: 2,
  }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed — checkId ${job.returnvalue?.checkId}`);
});

worker.on('failed', (job, err) => {
  const id = job?.id ?? 'unknown';
  console.error(`Job ${id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('Worker error:', err.message);
});

console.log(`Worker listening on queue "${QUEUE_NAME}"`);

async function shutdown() {
  console.log('Worker shutting down...');
  await worker.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
