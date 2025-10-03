import path from 'path';
import dotenv from 'dotenv';
import { createHttpAndIo } from './app';
import { migrateAndSeedIfNeeded } from './utils/bootstrap';

dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

async function start() {
  await migrateAndSeedIfNeeded();
  const { httpServer } = createHttpAndIo();
  httpServer.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

start().catch((e) => {
  console.error('Startup failed', e);
  process.exit(1);
});
