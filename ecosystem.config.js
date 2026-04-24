module.exports = {
  apps: [{
    name: 'mission-control',
    script: 'node_modules/.bin/next',
    args: 'start -p 3333 -H 0.0.0.0',
    cwd: __dirname,
    env: {
      NODE_ENV: 'production',
      PORT: '3333',
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: '3333',
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
  }],
}
