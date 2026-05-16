const { validationResult } = require('express-validator');
const { sendError, formatValidationErrors } = require('../lib/apiResponse');

function handleValidation(req, res, next) {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    return sendError(
      res,
      400,
      'validation_failed',
      'Request failed validation',
      formatValidationErrors(result)
    );
  }

  next();
}

module.exports = { handleValidation };
