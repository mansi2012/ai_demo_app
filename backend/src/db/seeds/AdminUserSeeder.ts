import { exec } from 'child_process';
import { promisify } from 'util';
import { QueryInterface } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import bcrypt from 'bcrypt';

const execPromise = promisify(exec);

interface SeedOptions {
  email: string;
  name: string;
  username: string;
  password: string;
  businessId?: number;
}

const seedAdminUser = async (sequelize: Sequelize, options: SeedOptions) => {
  const t = await sequelize.transaction();

  try {
    const { email, name, username, password, businessId = 1 } = options;

    // Check if user exists in this business scope
    const [user] = await sequelize.query(
      'SELECT id FROM users WHERE email = :email AND businessId = :businessId',
      {
        replacements: { email, businessId },
        type: 'SELECT',
        transaction: t,
      }
    );

    if (!user) {
      const passwordHash = bcrypt.hashSync(password, 10);

      await sequelize.query(
        'INSERT INTO users (name, username, email, password_hash, businessId, createdAt, updatedAt) VALUES (:name, :username, :email, :passwordHash, :businessId, NOW(), NOW())',
        {
          replacements: {
            name,
            username,
            email,
            passwordHash,
            businessId,
          },
          type: 'INSERT',
          transaction: t,
        }
      );

      console.log(`[SEED] Admin user created: ${email} (businessId: ${businessId})`);
    } else {
      console.log(`[SEED] Admin user already exists: ${email}`);
    }

    await t.commit();
    console.log('[SEED] Transaction committed successfully');
  } catch (error) {
    await t.rollback();
    console.error('[SEED] Transaction failed:', error);
    throw error;
  }
};

export const runAdminUserSeeder = async (sequelize: Sequelize) => {
  const adminEmail = 'mansimistry.di@gmail.com';
  const adminName = 'Mansi Mistry';
  const adminUsername = 'mansi_mistry';
  const adminPassword = 'mansi123##';

  try {
    await seedAdminUser(sequelize, {
      email: adminEmail,
      name: adminName,
      username: adminUsername,
      password: adminPassword,
      businessId: 1,
    });
  } catch (err) {
    console.error('Failed to run admin seeder:', err);
    process.exit(1);
  }
};
