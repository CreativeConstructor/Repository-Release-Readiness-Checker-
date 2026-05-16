const { verifyToken } = require('../lib/jwt');
const { sendError } = require('../lib/apiResponse');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return sendError(
      res,
      401,
      'unauthorized',
      'Missing or invalid Authorization header. Use: Bearer <token>'
    );
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.userId, email: payload.email };
    next();
  } catch {
    return sendError(res, 401, 'unauthorized', 'Invalid or expired token');
  }
}

module.exports = { requireAuth };
