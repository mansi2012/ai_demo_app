const jwt = require('jsonwebtoken');
const config = require('../config');

const sign = (payload) =>
  jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

const verify = (token) => jwt.verify(token, config.jwt.secret);

module.exports = { sign, verify };
