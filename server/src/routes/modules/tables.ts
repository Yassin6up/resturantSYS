import { Router } from 'express';
import db from '../../utils/db';
import { authenticate, authorize } from '../../middlewares/auth';

const router = Router();

router.get('/', async (req, res) => {
  const branchId = Number(req.query.branchId || req.query.branch_id);
  try {
    const tables = await db('tables').where(function() {
      if (branchId) this.where('branch_id', branchId);
    }).orderBy('table_number', 'asc');
    res.json(tables);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load tables' });
  }
});

router.post('/', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const [id] = await db('tables').insert(req.body);
    const t = await db('tables').where({ id }).first();
    res.status(201).json(t);
  } catch (e) {
    res.status(400).json({ error: 'Failed to create table' });
  }
});

export default router;
