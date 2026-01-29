/**
 * PM2 ecosystem config
 * - 本项目后端使用 SQLite（better-sqlite3），生产环境建议先用单实例（fork 模式）。
 * - 如需多实例，请先评估 SQLite 并发写入/锁与 WAL 策略，或迁移到服务型数据库。
 */
module.exports = {
  apps: [
    {
      name: 'pixel-art-api',
      script: 'server/index.js',
      exec_mode: 'fork',
      instances: 1,
      time: true,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        PORT: 4571,
        LOG_LEVEL: 'info',
        DATABASE_PATH: './data/pixelart.db',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4571,
        LOG_LEVEL: 'info',
        DATABASE_PATH: './data/pixelart.db',
      },
    },
  ],
};
