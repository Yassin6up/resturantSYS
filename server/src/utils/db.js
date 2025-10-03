import knex from 'knex';
import { Model } from 'objection';
import path from 'path';
import fs from 'fs';

let db = null;

export function getDb() {
  if (!db) throw new Error('Database is not initialized. Call initDb() first.');
  return db;
}

export async function initDb() {
  const client = process.env.DATABASE_CLIENT || 'sqlite3';
  if (client === 'sqlite3') {
    const filename = process.env.SQLITE_FILENAME || './data/posq.sqlite';
    const abs = path.resolve(process.cwd(), 'server', filename.replace(/^\.\//, ''));
    const dir = path.dirname(abs);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = knex({
      client: 'sqlite3',
      connection: { filename: abs },
      useNullAsDefault: true,
      pool: { afterCreate: (conn, done) => conn.run('PRAGMA foreign_keys = ON', done) }
    });
  } else if (client === 'mysql2') {
    db = knex({
      client: 'mysql2',
      connection: {
        host: process.env.MYSQL_HOST,
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
      }
    });
  } else if (client === 'pg') {
    db = knex({
      client: 'pg',
      connection: {
        host: process.env.POSTGRES_HOST,
        port: Number(process.env.POSTGRES_PORT || 5432),
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DATABASE,
      }
    });
  } else {
    throw new Error(`Unsupported DATABASE_CLIENT: ${client}`);
  }

  Model.knex(db);
  return db;
}

export async function runMigrations() {
  if (!db) throw new Error('DB not initialized');
  // Run latest migrations on startup to ensure schema exists
  await db.migrate?.latest?.().catch(() => {});
}
