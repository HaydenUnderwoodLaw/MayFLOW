module.exports = {
  apps: [
    {
      name: 'ProjectAmerika',
      script: 'npm run start',
      env_development: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      watch: ['dist'],
      watch_delay: 1000,
      ignore_watch: ['node_modules'],
    },
  ],
};
