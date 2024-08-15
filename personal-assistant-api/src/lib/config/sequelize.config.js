const config = require('./config/config.js').default;

module.exports = {
  development: config.development,
  test: config.test,
  production: config.production,
};
