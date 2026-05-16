const { body } = require('express-validator');

// Used by POST /api/check in Chunk 5+
const repoUrlRules = [
  body('repoUrl')
    .trim()
    .notEmpty()
    .withMessage('repoUrl is required')
    .isURL({ require_protocol: true, protocols: ['http', 'https'] })
    .withMessage('repoUrl must be a valid URL')
    .matches(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/i)
    .withMessage('repoUrl must be a GitHub repository URL (https://github.com/owner/repo)'),
];

module.exports = { repoUrlRules };
