const { createHttpError } = require('./common');

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function validateNewPassword(password, minLength = 6) {
  if (typeof password !== 'string' || password.trim().length < minLength) {
    throw createHttpError(400, `Password must be at least ${minLength} characters.`);
  }
}

module.exports = {
  normalizeUsername,
  validateNewPassword
};
