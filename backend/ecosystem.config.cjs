module.exports = {
  apps: [
    {
      name: 'pfm-api',
      script: './dist/index.js',
      exec_mode: 'cluster',
      instances: 'max', // um processo por núcleo (RNF-09)
      max_memory_restart: '400M',
      kill_timeout: 35000, // > 30s do encerramento gracioso da aplicação
      listen_timeout: 10000,
      wait_ready: true, // aguarda process.send('ready')
      autorestart: true,
      max_restarts: 10,
      min_uptime: '20s',
      merge_logs: true,
      time: false, // timestamp já vem do Pino (JSON)
      env_production: {
        NODE_ENV: 'production',
        PORTA: 3333,
      },
    },
  ],
};
