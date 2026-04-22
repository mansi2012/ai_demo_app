const { User } = require('../models');

const DEFAULT_ADMIN = {
  firstName: 'Admin',
  lastName: 'User',
  username: 'admin',
  email: 'admin@example.com',
  password: 'Admin@123',
};

async function seedAdmin(overrides = {}) {
  const data = { ...DEFAULT_ADMIN, ...overrides };

  const existing = await User.findOne({ where: { username: data.username } });
  if (existing) {
    return { user: existing, created: false };
  }

  const passwordHash = await User.setPassword(data.password);
  const user = await User.create({
    firstName: data.firstName,
    lastName: data.lastName,
    username: data.username,
    email: data.email,
    passwordHash,
  });
  return { user, created: true };
}

module.exports = { seedAdmin, DEFAULT_ADMIN };
