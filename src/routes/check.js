const express = require('express');
const { param } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const { repoUrlRules } = require('../validators/check');
const { sendError } = require('../lib/apiResponse');
const { isRedisConfigured } = require('../lib/redis');
const { enqueueCheck, getJobForUser } = require('../queues/checkQueue');
const { runFullCheck, CheckPipelineError } = require('../services/runCheck');

const router = express.Router();

function handlePipelineError(res, err) {
  if (err instanceof CheckPipelineError) {
    return sendError(res, err.status, err.errorCode, err.message);
  }
  return sendError(res, 500, 'internal_error', err.message);
}

// POST /api/check — synchronous (same request waits for full pipeline)
router.post(
  '/',
  requireAuth,
  repoUrlRules,
  handleValidation,
  async (req, res) => {
    try {
      const result = await runFullCheck(req.user.id, req.body.repoUrl);

      res.status(201).json({
        status: 'complete',
        mode: 'sync',
        message: 'Release readiness analysis saved.',
        ...result,
      });
    } catch (err) {
      return handlePipelineError(res, err);
    }
  }
);

// POST /api/check/async — enqueue BullMQ job (requires Redis + worker process)
router.post(
  '/async',
  requireAuth,
  repoUrlRules,
  handleValidation,
  async (req, res) => {
    if (!isRedisConfigured()) {
      return sendError(
        res,
        503,
        'queue_unavailable',
        'Redis is not configured. Set REDIS_URL in .env and start the worker.'
      );
    }

    try {
      const jobId = await enqueueCheck(req.user.id, req.body.repoUrl);

      res.status(202).json({
        status: 'queued',
        mode: 'async',
        jobId,
        message: 'Check queued. Poll GET /api/check/jobs/:jobId for status.',
      });
    } catch (err) {
      return sendError(
        res,
        503,
        'queue_error',
        err.message || 'Failed to enqueue check job. Is Redis running?'
      );
    }
  }
);

// GET /api/check/jobs/:jobId — job status / result
router.get(
  '/jobs/:jobId',
  requireAuth,
  [param('jobId').notEmpty()],
  handleValidation,
  async (req, res) => {
    if (!isRedisConfigured()) {
      return sendError(res, 503, 'queue_unavailable', 'Redis is not configured.');
    }

    try {
      const jobInfo = await getJobForUser(req.params.jobId, req.user.id);

      if (!jobInfo) {
        return sendError(res, 404, 'not_found', 'Job not found');
      }
      if (jobInfo.forbidden) {
        return sendError(res, 403, 'forbidden', 'You do not have access to this job');
      }

      const { state, progress, result, failedReason } = jobInfo;

      if (state === 'completed') {
        return res.json({
          status: 'completed',
          jobId: req.params.jobId,
          progress: 100,
          result,
        });
      }

      if (state === 'failed') {
        return res.json({
          status: 'failed',
          jobId: req.params.jobId,
          error: failedReason || 'Job failed',
        });
      }

      return res.json({
        status: state,
        jobId: req.params.jobId,
        progress: progress || 0,
      });
    } catch (err) {
      return sendError(
        res,
        503,
        'queue_error',
        err.message || 'Failed to read job status. Is Redis running?'
      );
    }
  }
);

module.exports = router;
