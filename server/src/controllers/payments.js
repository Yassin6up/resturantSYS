import { Router } from 'express';
import { getDb } from '../utils/db.js';

const router = Router();

// POST /api/payments
router.post('/', async (req, res) => {
  const db = getDb();
  const { order_id, payment_type, amount, transaction_ref } = req.body;
  if (!order_id || !payment_type || amount == null) return res.status(400).json({ error: 'Missing fields' });
  const [id] = await db('payments').insert({ order_id, payment_type, amount, transaction_ref });
  const order = await db('orders').where({ id: order_id }).first();
  if (order) {
    await db('orders').where({ id: order_id }).update({ payment_status: 'PAID', status: 'PAID', updated_at: db.raw('CURRENT_TIMESTAMP') });
    const io = req.app.get('io');
    io.to(`branch:${order.branch_id}:kitchen`).emit('order.paid', { order_id, payment_type, amount });
  }
  res.status(201).json({ id });
});

export default router;
