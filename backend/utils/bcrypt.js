// src/utils/bcrypt.js
const bcrypt = require('bcrypt');
async function hashPassword(pw) {
  return bcrypt.hash(pw, 10);
}
async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
module.exports = { hashPassword, comparePassword };
