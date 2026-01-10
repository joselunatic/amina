const crypto = require('crypto');

const HASH_KEYLEN = 64;
const HASH_ENCODING = 'hex';

function hashPassword(password, salt = crypto.randomBytes(16).toString(HASH_ENCODING)) {
  const derived = crypto.scryptSync(String(password), salt, HASH_KEYLEN);
  return {
    hash: derived.toString(HASH_ENCODING),
    salt
  };
}

function verifyPassword(password, hash, salt) {
  if (!hash || !salt) return false;
  const derived = crypto.scryptSync(String(password), salt, HASH_KEYLEN).toString(HASH_ENCODING);
  const hashBuf = Buffer.from(hash, HASH_ENCODING);
  const derivedBuf = Buffer.from(derived, HASH_ENCODING);
  if (hashBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(hashBuf, derivedBuf);
}

module.exports = {
  hashPassword,
  verifyPassword
};
