require('dotenv').config();

const isSqlite = (process.env.DB_TYPE || 'sqlite3') === 'sqlite3';
const client = isSqlite ? 'sqlite3' : 'mysql2';

const connection = isSqlite
  ? { filename: process.env.DB_PATH || './data/posq.db' }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'posq',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'posq'
    };

const shared = {
  client,
  connection,
  useNullAsDefault: true,
  migrations: {
    directory: './src/migrations'
  },
  seeds: {
    directory: './src/seeds'
  }
};

module.exports = {
  development: shared,
  production: {
    ...shared,
    pool: { min: 2, max: 10 }
  },
  test: {
    client: 'sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
    migrations: { directory: './src/migrations' },
    seeds: { directory: './src/seeds' }
  }
};
