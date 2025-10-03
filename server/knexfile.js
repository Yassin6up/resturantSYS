import 'dotenv/config';
import path from 'path';

const client = process.env.DATABASE_CLIENT || 'sqlite3';

const common = {
  migrations: {
    directory: path.resolve('server/migrations')
  },
  seeds: {
    directory: path.resolve('server/seeds')
  }
};

const config = {
  client: client === 'pg' ? 'pg' : client,
  connection:
    client === 'sqlite3'
      ? { filename: path.resolve('server', (process.env.SQLITE_FILENAME || './data/posq.sqlite').replace(/^\.\//, '')) }
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

export default config;
