const path = require('path');
const express = require('express');
const { query } = require('./lib/db');
const authRoutes = require('./routes/auth');
const checkRoutes = require('./routes/check');
const checksRoutes = require('./routes/checks');
const { requireAuth } = require('./middleware/auth');
const { authLimiter, apiLimiter } = require('./middleware/rateLimit');
const { errorHandler } = require('./middleware/errorHandler');
const { sendError } = require('./lib/apiResponse');

const app = express();

app.use(express.json());

// --- Health (no rate limit — used by load balancers / Docker) ---
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'release-readiness-checker',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/db', async (req, res) => {
  try {
    const { rows } = await query('SELECT 1 AS ok, NOW() AS server_time');
    res.json({
      status: 'ok',
      database: 'connected',
      serverTime: rows[0].server_time,
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      message: err.message,
    });
  }
});

// --- API (rate limited) ---
app.use('/api', apiLimiter);

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/check', checkRoutes);
app.use('/api/checks', checksRoutes);

app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return sendError(res, 404, 'not_found', 'User not found');
    }

    const user = rows[0];
    res.json({
      user: { id: user.id, email: user.email, createdAt: user.created_at },
    });
  } catch (err) {
    return sendError(res, 500, 'internal_error', err.message);
  }
});

// Single-page UI — served after /api routes
app.use(express.static(path.join(__dirname, '..', 'public')));

// Must be last — catches errors passed to next(err)
app.use(errorHandler);

module.exports = app;
