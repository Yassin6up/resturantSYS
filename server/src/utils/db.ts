import knex, { Knex } from 'knex';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

const mode = process.env.MODE || 'LOCAL';

let db: Knex;

if (mode === 'LOCAL') {
  db = knex({
    client: 'sqlite3',
    connection: {
      filename: process.env.SQLITE_PATH || path.resolve(process.cwd(), 'server/data/posq.sqlite')
    },
    useNullAsDefault: true
  });
} else {
  db = knex({
    client: (process.env.DB_CLIENT || 'mysql2') as any,
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    }
  });
}

export default db;
