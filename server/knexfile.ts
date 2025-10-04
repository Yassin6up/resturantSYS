import type { Knex } from 'knex';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

const mode = process.env.MODE || 'LOCAL';

const common: Partial<Knex.Config> = {
  migrations: {
    directory: path.resolve(process.cwd(), 'src/migrations')
  },
  seeds: {
    directory: path.resolve(process.cwd(), 'src/seeds')
  },
  pool: { min: 1, max: 10 }
};

const sqlite: Knex.Config = {
  client: 'sqlite3',
  connection: {
    filename: process.env.SQLITE_PATH || path.resolve(process.cwd(), 'server/data/posq.sqlite')
  },
  useNullAsDefault: true,
  ...common
};

const mysql: Knex.Config = {
  client: process.env.DB_CLIENT || 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  },
  ...common
};

const config: Knex.Config = mode === 'LOCAL' ? sqlite : mysql;

export default config;
module.exports = config;
