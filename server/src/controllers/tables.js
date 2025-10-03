import { Router } from 'express';
import { getDb } from '../utils/db.js';
import { auth } from '../middlewares/auth.js';

const router = Router();

// GET /api/tables?branchId=1
router.get('/', async (req, res) => {
  const db = getDb();
  const branchId = Number(req.query.branchId);
  if (!branchId) return res.status(400).json({ error: 'branchId required' });
  const tables = await db('tables').where({ branch_id: branchId });
  res.json(tables);
});

// POST /api/tables (admin)
router.post('/', auth(['admin','manager']), async (req, res) => {
  const db = getDb();
  const { branch_id, table_number, description } = req.body;
  if (!branch_id || !table_number) return res.status(400).json({ error: 'Missing fields' });
  const [id] = await db('tables').insert({ branch_id, table_number, description });
  const row = await db('tables').where({ id }).first();
  res.status(201).json(row);
});

export default router;
