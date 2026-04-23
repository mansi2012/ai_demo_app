const sequelize = require('../src/config/database');
const config = require('../src/config');
const { seedAdmin } = require('../src/seeders/admin.seeder');

async function main() {
  console.log(
    `[seed] Connecting to ${config.db.dialect}://${config.db.username}@${config.db.host}:${config.db.port}/${config.db.database}`
  );

  try {
    await sequelize.authenticate();
    console.log('[seed] DB connected');

    await sequelize.sync();
    console.log('[seed] Models synced');

    const { user, created } = await seedAdmin();
    if (created) {
      console.log(`[seed] Created admin user: ${user.username} (${user.email})`);
    } else {
      console.log(`[seed] Admin user already exists: ${user.username} (${user.email}) — skipped`);
    }

    await sequelize.close();
    console.log('[seed] Done');
    process.exit(0);
  } catch (err) {
    console.error('[seed] Failed:', err);
    try { await sequelize.close(); } catch {}
    process.exit(1);
  }
}

main();
