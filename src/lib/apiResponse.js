function sendError(res, status, error, message, details) {
  const body = { error, message };
  if (details !== undefined) {
    body.details = details;
  }
  return res.status(status).json(body);
}

function formatValidationErrors(errors) {
  return errors.array().map((entry) => ({
    field: entry.path,
    message: entry.msg,
  }));
}

module.exports = {
  sendError,
  formatValidationErrors,
};
