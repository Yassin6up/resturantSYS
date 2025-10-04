import { Router } from 'express';
import db from '../../utils/db';
import { authenticate } from '../../middlewares/auth';

const router = Router();

router.post('/', authenticate, async (req, res) => {
  const { orderId, payment_type, amount, transaction_ref } = req.body;
  try {
    await db.transaction(async (trx) => {
      await trx('payments').insert({ order_id: orderId, payment_type, amount, transaction_ref });
      await trx('orders').where({ id: orderId }).update({ payment_status: 'PAID', status: 'PAID', updated_at: trx.fn.now() });
    });
    const order = await db('orders').where({ id: orderId }).first();
    const io = (req.app as any).get('io');
    io.to(`branch:${order.branch_id}:kitchen`).emit('order.paid', { orderId, amount, payment_type });
    res.status(201).json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: 'Payment recording failed', details: e.message });
  }
});

export default router;
