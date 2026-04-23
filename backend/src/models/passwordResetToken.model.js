'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class PasswordResetToken extends Model {
    static associate(models) {
      PasswordResetToken.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }

  PasswordResetToken.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      tokenHash: {
        type: DataTypes.STRING(64),
        allowNull: false
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      usedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
      }
    },
    {
      sequelize,
      modelName: 'PasswordResetToken',
      tableName: 'password_reset_tokens',
      underscored: true,
      timestamps: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      indexes: [
        {
          fields: ['token_hash']
        },
        {
          fields: ['user_id']
        }
      ]
    }
  );

  return PasswordResetToken;
};
