const knex = require('knex');
const knexConfig = require('../../knexfile');

const environment = process.env.NODE_ENV || 'development';
const operatingMode = process.env.OPERATING_MODE || 'LOCAL';

let config;
if (operatingMode === 'CLOUD') {
  config = knexConfig.production_cloud;
} else if (environment === 'production') {
  config = knexConfig.production_local;
} else {
  config = knexConfig.development;
}

const db = knex(config);

module.exports = db;