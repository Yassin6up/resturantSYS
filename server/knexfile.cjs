require('dotenv/config');
const path = require('path');

const client = process.env.DATABASE_CLIENT || 'sqlite3';

const baseDir = path.resolve(__dirname);

const common = {
  migrations: {
    directory: path.join(baseDir, 'migrations')
  },
  seeds: {
    directory: path.join(baseDir, 'seeds')
  }
};

const config = {
  client: client === 'pg' ? 'pg' : client,
  connection:
    client === 'sqlite3'
      ? { filename: path.join(baseDir, (process.env.SQLITE_FILENAME || './data/posq.sqlite').replace(/^\.\//, '')) }
      : client === 'mysql2'
      ? {
          host: process.env.MYSQL_HOST,
          port: Number(process.env.MYSQL_PORT || 3306),
          user: process.env.MYSQL_USER,
          password: process.env.MYSQL_PASSWORD,
          database: process.env.MYSQL_DATABASE
        }
      : {
          host: process.env.POSTGRES_HOST,
          port: Number(process.env.POSTGRES_PORT || 5432),
          user: process.env.POSTGRES_USER,
          password: process.env.POSTGRES_PASSWORD,
          database: process.env.POSTGRES_DATABASE
        },
  useNullAsDefault: client === 'sqlite3',
  ...common
};

module.exports = config;
