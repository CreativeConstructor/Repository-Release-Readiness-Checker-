const jwt = require('jsonwebtoken');
const config = require('./config');

function assertJwtSecret() {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not set. Copy .env.example to .env and add a secret.');
  }
}

function signToken(user) {
  assertJwtSecret();
  return jwt.sign(
    { userId: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function verifyToken(token) {
  assertJwtSecret();
  return jwt.verify(token, config.jwtSecret);
}

module.exports = {
  signToken,
  verifyToken,
};
