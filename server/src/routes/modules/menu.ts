import { Router } from 'express';
import db from '../../utils/db';
import { authenticate, authorize } from '../../middlewares/auth';

const router = Router();

router.get('/', async (req, res) => {
  const branchId = Number(req.query.branchId || req.query.branch_id);
  try {
    const categories = await db('categories').where(function() {
      if (branchId) this.where('branch_id', branchId);
    }).orderBy('position', 'asc');

    const items = await db('menu_items').where(function() {
      if (branchId) this.where('branch_id', branchId);
    }).andWhere('is_available', 1);

    res.json({ categories, items });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load menu' });
  }
});

router.post('/', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const [id] = await db('menu_items').insert(req.body);
    const item = await db('menu_items').where({ id }).first();
    res.status(201).json(item);
  } catch (e) {
    res.status(400).json({ error: 'Failed to create item' });
  }
});

router.put('/:id', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  const id = Number(req.params.id);
  try {
    await db('menu_items').where({ id }).update({ ...req.body, updated_at: db.fn.now() });
    const item = await db('menu_items').where({ id }).first();
    res.json(item);
  } catch (e) {
    res.status(400).json({ error: 'Failed to update item' });
  }
});

export default router;
