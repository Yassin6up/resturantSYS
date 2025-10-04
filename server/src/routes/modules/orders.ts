import { Router } from 'express';
import db from '../../utils/db';
import { authenticate } from '../../middlewares/auth';

const router = Router();

router.post('/', async (req, res) => {
  const { branchId, tableId, customerName, items, paymentMethod, clientMeta } = req.body;
  let trx = await db.transaction();
  try {
    const [{ cnt }] = await trx('orders').count<{ cnt: number }>('id as cnt');
    const orderCode = `${process.env.BRANCH_CODE || 'BR'}-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Number(cnt) + 1).padStart(4, '0')}`;

    const [orderId] = await trx('orders').insert({
      branch_id: branchId,
      order_code: orderCode,
      table_id: tableId,
      customer_name: customerName,
      status: 'SUBMITTED',
      payment_status: paymentMethod === 'CARD' ? 'PENDING' : 'UNPAID',
      tax: 0,
      service_charge: 0,
      total: 0
    });

    let total = 0;
    for (const it of items || []) {
      const menu = await trx('menu_items').where({ id: it.menuItemId }).first();
      if (!menu) throw new Error('Invalid menu item');
      const unitPrice = menu.price;
      const [orderItemId] = await trx('order_items').insert({
        order_id: orderId,
        menu_item_id: it.menuItemId,
        quantity: it.quantity || 1,
        unit_price: unitPrice,
        note: it.note || null
      });
      total += unitPrice * (it.quantity || 1);

      for (const mod of it.modifiers || []) {
        const m = await trx('modifiers').where({ id: mod.modifierId }).first();
        if (!m) continue;
        await trx('order_item_modifier').insert({
          order_item_id: orderItemId,
          modifier_id: m.id,
          extra_price: m.extra_price || 0
        });
        total += m.extra_price || 0;
      }
    }

    await trx('orders').where({ id: orderId }).update({ total, updated_at: trx.fn.now() });
    await trx.commit();

    const io = (req.app as any).get('io');
    const order = await db('orders').where({ id: orderId }).first();
    io.to(`branch:${branchId}:kitchen`).emit('order.created', order);

    const orderQr = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/order/${orderId}`;
    res.status(201).json({ orderId, orderCode, qr: orderQr, status: 'SUBMITTED' });
  } catch (err: any) {
    if (trx) await trx.rollback();
    res.status(500).json({ error: 'Failed to create order', details: err.message });
  }
});

router.get('/', authenticate, async (req, res) => {
  const status = String(req.query.status || '');
  const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
  let q = db('orders').select('*').orderBy('created_at', 'desc');
  if (status) q = q.where('status', status);
  if (branchId) q = q.where('branch_id', branchId);
  const orders = await q;
  res.json(orders);
});

router.get('/:id', authenticate, async (req, res) => {
  const id = Number(req.params.id);
  const order = await db('orders').where({ id }).first();
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json(order);
});

router.patch('/:id/status', authenticate, async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  const allowed = ['SUBMITTED','PENDING','CONFIRMED','PREPARING','READY','SERVED','PAID','COMPLETED','CANCELLED'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  await db('orders').where({ id }).update({ status, updated_at: db.fn.now() });
  const order = await db('orders').where({ id }).first();
  const io = (req.app as any).get('io');
  io.to(`branch:${order.branch_id}:kitchen`).emit('order.updated', order);
  res.json(order);
});

export default router;
