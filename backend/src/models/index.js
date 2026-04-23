'use strict';
const { Sequelize } = require('sequelize');
const config = require('../config/index');

const sequelize = new Sequelize(
  config.db.name,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: 'mysql',
    dialectModule: require('mysql2'),
    logging: config.env === 'development' ? console.log : false,
    define: {
      underscored: true,
      timestamps: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    }
  }
);

const User = require('./user.model')(sequelize);
const PasswordResetToken = require('./passwordResetToken.model')(sequelize);

const models = { User, PasswordResetToken };

Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(models);
  }
});

module.exports = { sequelize, Sequelize, ...models };
