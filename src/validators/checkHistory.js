const { query } = require('express-validator');

const VERDICTS = ['ready', 'needs_work', 'not_ready'];

const listChecksQueryRules = [
  query('minScore').optional().isInt({ min: 0, max: 100 }).toInt(),
  query('maxScore').optional().isInt({ min: 0, max: 100 }).toInt(),
  query('verdict').optional().isIn(VERDICTS),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
];

module.exports = { listChecksQueryRules };
