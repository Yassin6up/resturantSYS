import { Router } from 'express';
import { getDb } from '../utils/db.js';

const router = Router();

// GET /api/stock
router.get('/', async (_req, res) => {
  const db = getDb();
  const rows = await db('stock_items');
  res.json(rows);
});

// POST /api/stock/move
router.post('/move', async (req, res) => {
  const db = getDb();
  const { stock_item_id, change, reason } = req.body;
  if (!stock_item_id || !change) return res.status(400).json({ error: 'Missing fields' });
  const [id] = await db('stock_movements').insert({ stock_item_id, change, reason });
  await db('stock_items').where({ id: stock_item_id }).increment('quantity', change);
  res.status(201).json({ id });
});

export default router;
