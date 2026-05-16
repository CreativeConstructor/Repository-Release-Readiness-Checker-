const { Queue } = require('bullmq');
const { getRedisConnection } = require('../lib/redis');

const QUEUE_NAME = 'release-checks';

let queue;

function getCheckQueue() {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, {
      connection: getRedisConnection(),
    });
  }
  return queue;
}

async function enqueueCheck(userId, repoUrl) {
  const job = await getCheckQueue().add(
    'run-check',
    { userId, repoUrl },
    {
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );
  return job.id;
}

async function getJobForUser(jobId, userId) {
  const job = await getCheckQueue().getJob(jobId);

  if (!job) {
    return null;
  }

  if (job.data.userId !== userId) {
    return { forbidden: true };
  }

  const state = await job.getState();

  return {
    job,
    state,
    progress: job.progress,
    result: job.returnvalue,
    failedReason: job.failedReason,
  };
}

module.exports = {
  QUEUE_NAME,
  getCheckQueue,
  enqueueCheck,
  getJobForUser,
};
