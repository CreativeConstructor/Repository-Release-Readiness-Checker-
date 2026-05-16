const rateLimit = require('express-rate-limit');

function rateLimitHandler(req, res) {
  res.status(429).json({
    error: 'rate_limit_exceeded',
    message: 'Too many requests. Please try again later.',
    retryAfter: res.getHeader('Retry-After'),
  });
}

// Stricter on auth — slows password-guessing on /login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

// General cap on all /api routes (check endpoint will use this in Chunk 5+)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

module.exports = {
  authLimiter,
  apiLimiter,
};
