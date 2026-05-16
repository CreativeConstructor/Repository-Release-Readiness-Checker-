const { body } = require('express-validator');

const registerRules = [
  body('email').trim().isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 8, max: 72 })
    .withMessage('Password must be 8–72 characters'),
];

const loginRules = [
  body('email').trim().isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

module.exports = {
  registerRules,
  loginRules,
};
