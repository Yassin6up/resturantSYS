import path from 'path';
import db from './db';

export async function migrateAndSeedIfNeeded() {
  const migrationsDir = path.resolve(process.cwd(), 'src/migrations');
  const seedsDir = path.resolve(process.cwd(), 'src/seeds');
  await (db as any).migrate.latest({ directory: migrationsDir });
  const [{ cnt }] = await db('users').count<{ cnt: number }>('id as cnt');
  if (Number(cnt) === 0) {
    await (db as any).seed.run({ directory: seedsDir });
  }
}
