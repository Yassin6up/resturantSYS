import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { initDb, getDb } from '../src/utils/db.js';

(async () => {
  await initDb();
  const db = getDb();
  const tables = await db('tables');
  const outDir = path.resolve('server/qrcodes');
  fs.mkdirSync(outDir, { recursive: true });
  for (const t of tables) {
    const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/menu?table=${encodeURIComponent(t.table_number)}&branchId=${t.branch_id}`;
    const file = path.join(outDir, `table_${t.table_number}.png`);
    await QRCode.toFile(file, url, { width: 512 });
    console.log('Generated', file, '->', url);
  }
  process.exit(0);
})();