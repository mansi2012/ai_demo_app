// PM2 ecosystem config for ai-orchestrator
// Usage on the server:
//   npm install
//   pm2 start ecosystem.config.cjs --env production
//   pm2 save
//   pm2 startup   (follow the printed command to enable auto-start on boot)
//
// Useful commands once running:
//   pm2 ls
//   pm2 logs ai-orchestrator
//   pm2 restart ai-orchestrator
//   pm2 monit

module.exports = {
  apps: [
    {
      name: 'ai-orchestrator',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,              // DO NOT raise — runs are single-tenant (see activeRunId guard)
      exec_mode: 'fork',
      autorestart: true,
      watch: false,              // don't hot-reload in prod
      max_memory_restart: '1G',  // restart if process grows past 1 GB
      env: {
        NODE_ENV: 'development',
        UI_PORT: '3500',
      },
      env_production: {
        NODE_ENV: 'production',
        UI_PORT: '3500',
        // Real secrets belong in ai-orchestrator/.env (loaded by dotenv), not here.
        // That keeps them out of git and out of `pm2 dump`.
      },
      // Logs go under ~/.pm2/logs by default. Uncomment to pin them next to the app:
      // out_file: './logs/out.log',
      // error_file: './logs/error.log',
      time: true,                // prefix log lines with timestamp
    },
  ],
};
