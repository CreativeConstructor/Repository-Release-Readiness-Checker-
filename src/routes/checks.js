const express = require('express');
const { param } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const { sendError } = require('../lib/apiResponse');
const { listChecksQueryRules } = require('../validators/checkHistory');
const { listChecks, getCheckById, getTrends } = require('../services/checkStore');

const router = express.Router();

router.use(requireAuth);

// GET /api/checks/trends — must be before /:id
router.get('/trends', async (req, res) => {
  try {
    const trends = await getTrends(req.user.id);
    res.json({ trends });
  } catch (err) {
    return sendError(res, 500, 'internal_error', err.message);
  }
});

// GET /api/checks?minScore=50&maxScore=100&limit=20&offset=0
router.get('/', listChecksQueryRules, handleValidation, async (req, res) => {
  const minScore = req.query.minScore;
  const maxScore = req.query.maxScore;

  if (minScore !== undefined && maxScore !== undefined && minScore > maxScore) {
    return sendError(
      res,
      400,
      'validation_failed',
      'minScore cannot be greater than maxScore'
    );
  }

  try {
    const verdict = req.query.verdict;

    const checks = await listChecks(req.user.id, {
      minScore,
      maxScore,
      verdict,
      limit: req.query.limit ?? 20,
      offset: req.query.offset ?? 0,
    });

    res.json({
      count: checks.length,
      filters: { minScore, maxScore, verdict },
      checks,
    });
  } catch (err) {
    return sendError(res, 500, 'internal_error', err.message);
  }
});

// GET /api/checks/:id
router.get(
  '/:id',
  [param('id').isInt({ min: 1 }).toInt()],
  handleValidation,
  async (req, res) => {
    try {
      const check = await getCheckById(req.user.id, req.params.id);

      if (!check) {
        return sendError(res, 404, 'not_found', 'Check not found');
      }

      res.json({ check });
    } catch (err) {
      return sendError(res, 500, 'internal_error', err.message);
    }
  }
);

module.exports = router;
