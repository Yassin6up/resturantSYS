import { Router } from 'express';
import { getDb } from '../utils/db.js';

const router = Router();

// GET /api/settings
router.get('/', async (_req, res) => {
  const db = getDb();
  const rows = await db('settings');
  const map = {};
  for (const r of rows) map[r.key] = r.value;
  res.json(map);
});

// PUT /api/settings
router.put('/', async (req, res) => {
  const db = getDb();
  const entries = Object.entries(req.body || {});
  for (const [key, value] of entries) {
    const exists = await db('settings').where({ key }).first();
    if (exists) await db('settings').where({ key }).update({ value });
    else await db('settings').insert({ key, value });
  }
  res.json({ ok: true });
});

// POST /api/sync/manual
router.post('/sync/manual', async (_req, res) => {
  // TODO: implement sync push/pull; placeholder
  res.json({ ok: true, message: 'Manual sync triggered (stub)' });
});

export default router;
