import { Router } from 'express';
import db from '../../utils/db';
import { authenticate, authorize } from '../../middlewares/auth';

const router = Router();

router.get('/', authenticate, authorize(['admin','manager']), async (_req, res) => {
  const rows = await db('settings');
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json(settings);
});

router.put('/', authenticate, authorize(['admin']), async (req, res) => {
  const entries = Object.entries(req.body || {});
  try {
    await db.transaction(async (trx) => {
      for (const [key, value] of entries) {
        const exists = await trx('settings').where({ key }).first();
        if (exists) await trx('settings').where({ key }).update({ value });
        else await trx('settings').insert({ key, value });
      }
    });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: 'Failed to update settings', details: e.message });
  }
});

export default router;
