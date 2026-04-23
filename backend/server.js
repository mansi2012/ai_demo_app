const app = require('./src/app');
const sequelize = require('./src/config/database');
const config = require('./src/config');

const start = async () => {
  const missing = ['database', 'username'].filter((k) => !config.db[k]);
  if (missing.length) {
    console.error(
      `[startup] Missing required DB env vars: ${missing
        .map((k) => (k === 'database' ? 'DB_NAME' : 'DB_USERNAME'))
        .join(', ')}`
    );
    process.exit(1);
  }

  console.log(
    `[db] Connecting to ${config.db.dialect}://${config.db.username}@${config.db.host}:${config.db.port}/${config.db.database}`
  );

  try {
    await sequelize.authenticate();
    console.log('[db] Connected');

    await sequelize.sync();
    console.log('[db] Models synced');

    app.listen(config.port, () => {
      console.log(`[server] Listening on http://localhost:${config.port}`);
    });
  } catch (err) {
    console.error('[startup] Failed to start server:', err);
    process.exit(1);
  }
};

start();
