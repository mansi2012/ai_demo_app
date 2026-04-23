'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'password_reset_tokens',
      {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        token_hash: {
          type: Sequelize.STRING(64),
          allowNull: false
        },
        expires_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        used_at: {
          type: Sequelize.DATE,
          allowNull: true,
          defaultValue: null
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false
        }
      },
      {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci'
      }
    );

    await queryInterface.addIndex('password_reset_tokens', ['token_hash'], {
      name: 'idx_password_reset_tokens_token_hash'
    });

    await queryInterface.addIndex('password_reset_tokens', ['user_id'], {
      name: 'idx_password_reset_tokens_user_id'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('password_reset_tokens');
  }
};
