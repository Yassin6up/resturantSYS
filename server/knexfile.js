import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const BASE_CONFIG = {
  migrations: {
    directory: path.resolve('src', 'migrations')
  },
  seeds: {
    directory: path.resolve('src', 'seeds')
  }
};

export default {
  development: {
    client: 'sqlite3',
    connection: {
      filename: process.env.SQLITE_PATH || path.resolve('data', 'posq.sqlite')
    },
    useNullAsDefault: true,
    ...BASE_CONFIG
  },
  production: {
    client: process.env.DB_CLIENT || 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    },
    pool: { min: 2, max: 10 },
    ...BASE_CONFIG
  }
};