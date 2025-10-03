import { Router } from 'express';
import { getDb } from '../utils/db.js';
import { auth } from '../middlewares/auth.js';

const router = Router();

// GET /api/menu?branchId=1
/**
 * @openapi
 * /api/menu:
 *   get:
 *     summary: Get menu by branch
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema: { type: integer }
 *         required: true
 *     responses:
 *       200:
 *         description: Menu categories and items
 */
router.get('/', async (req, res) => {
  const db = getDb();
  const branchId = Number(req.query.branchId);
  if (!branchId) return res.status(400).json({ error: 'branchId required' });
  const categories = await db('categories').where({ branch_id: branchId }).orderBy('position');
  const items = await db('menu_items').where({ branch_id: branchId, is_available: 1 });
  const modifiers = await db('modifiers').whereIn('menu_item_id', items.map(i => i.id));
  const grouped = categories.map(c => ({
    ...c,
    items: items.filter(i => i.category_id === c.id).map(i => ({
      ...i,
      modifiers: modifiers.filter(m => m.menu_item_id === i.id)
    }))
  }));
  res.json({ categories: grouped });
});

// POST /api/menu (admin)
router.post('/', auth(['admin','manager']), async (req, res) => {
  const db = getDb();
  const { branch_id, category_id, name, price, description, image, sku, is_available } = req.body;
  if (!branch_id || !category_id || !name || price == null) return res.status(400).json({ error: 'Missing fields' });
  const [id] = await db('menu_items').insert({ branch_id, category_id, name, price, description, image, sku, is_available: is_available ? 1 : 0 });
  const item = await db('menu_items').where({ id }).first();
  res.status(201).json(item);
});

// PUT /api/menu/:id (admin)
router.put('/:id', auth(['admin','manager']), async (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  await db('menu_items').where({ id }).update({ ...req.body, updated_at: db.raw('CURRENT_TIMESTAMP') });
  const item = await db('menu_items').where({ id }).first();
  res.json(item);
});

export default router;
