const express = require('express');
const bcrypt = require('bcrypt');
const { query } = require('../lib/db');
const { signToken } = require('../lib/jwt');
const { sendError } = require('../lib/apiResponse');
const { handleValidation } = require('../middleware/validate');
const { registerRules, loginRules } = require('../validators/auth');

const router = express.Router();
const SALT_ROUNDS = 10;

// POST /api/auth/register
router.post(
  '/register',
  registerRules,
  handleValidation,
  async (req, res) => {
    const { email, password } = req.body;

    try {
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      const { rows } = await query(
        `INSERT INTO users (email, password_hash)
         VALUES ($1, $2)
         RETURNING id, email, created_at`,
        [email, passwordHash]
      );

      const user = rows[0];
      const token = signToken(user);

      res.status(201).json({
        user: { id: user.id, email: user.email, createdAt: user.created_at },
        token,
      });
    } catch (err) {
      if (err.code === '23505') {
        return sendError(res, 409, 'conflict', 'Email already registered');
      }
      return sendError(res, 500, 'internal_error', err.message);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  loginRules,
  handleValidation,
  async (req, res) => {
    const { email, password } = req.body;

    try {
      const { rows } = await query(
        'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
        [email]
      );

      if (rows.length === 0) {
        return sendError(res, 401, 'unauthorized', 'Invalid email or password');
      }

      const user = rows[0];
      const passwordMatches = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatches) {
        return sendError(res, 401, 'unauthorized', 'Invalid email or password');
      }

      const token = signToken(user);

      res.json({
        user: { id: user.id, email: user.email, createdAt: user.created_at },
        token,
      });
    } catch (err) {
      return sendError(res, 500, 'internal_error', err.message);
    }
  }
);

module.exports = router;
