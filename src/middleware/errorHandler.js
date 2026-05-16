const config = require('../lib/config');
const { sendError } = require('../lib/apiResponse');

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  console.error(err);

  const message = config.isDev ? err.message : 'Internal server error';
  return sendError(res, err.status || 500, 'internal_error', message);
}

module.exports = { errorHandler };
