const { Op } = require('sequelize');
const { User } = require('../models');
const { sign } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

const register = async ({ firstName, lastName, username, email, password }) => {
  const existing = await User.findOne({
    where: { [Op.or]: [{ username }, { email }] },
  });

  if (existing) {
    const details = [];
    if (existing.username === username) {
      details.push({ field: 'username', message: 'Username already taken' });
    }
    if (existing.email === email) {
      details.push({ field: 'email', message: 'Email already registered' });
    }
    throw ApiError.conflict('User already exists', details);
  }

  const passwordHash = await User.setPassword(password);
  const user = await User.create({
    firstName,
    lastName,
    username,
    email,
    passwordHash,
  });

  const token = sign({ sub: user.id, username: user.username });
  return { user: user.toJSON(), token };
};

const login = async ({ identifier, password }) => {
  const user = await User.findOne({
    where: { [Op.or]: [{ username: identifier }, { email: identifier }] },
  });

  if (!user) throw ApiError.unauthorized('Invalid credentials');

  const ok = await user.verifyPassword(password);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  const token = sign({ sub: user.id, username: user.username });
  return { user: user.toJSON(), token };
};

const getCurrentUser = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) throw ApiError.notFound('User not found');
  return user.toJSON();
};

module.exports = { register, login, getCurrentUser };
