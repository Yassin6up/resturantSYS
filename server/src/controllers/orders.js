import { Router } from 'express';
import { getDb } from '../utils/db.js';

const router = Router();

// Helper to generate order code
function generateOrderCode(branchCode) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const ts = `${y}${m}${d}`;
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${branchCode || 'BR'}-${ts}-${rand}`;
}

// POST /api/orders
/**
 * @openapi
 * /api/orders:
 *   post:
 *     summary: Create an order
 *     requestBody:
 *       required: true
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', async (req, res) => {
  const db = getDb();
  const { branchId, tableId, customerName, items = [], paymentMethod, clientMeta } = req.body;
  if (!branchId || !tableId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  let trx;
  try {
    trx = await db.transaction();

    const branch = await trx('branches').where({ id: branchId }).first();
    const orderCode = generateOrderCode(branch?.code);

    const amounts = await Promise.all(
      items.map(async (it) => {
        const mi = await trx('menu_items').where({ id: it.menuItemId }).first();
        const mods = (it.modifiers || []).map((m) => m.extra_price || 0).reduce((a, b) => a + b, 0);
        return (mi?.price || 0) * (it.quantity || 1) + mods;
      })
    );
    const total = amounts.reduce((a, b) => a + b, 0);

    const [orderId] = await trx('orders').insert({
      branch_id: branchId,
      order_code: orderCode,
      table_id: tableId,
      customer_name: customerName,
      total,
      status: 'SUBMITTED',
      payment_status: paymentMethod === 'CARD' ? 'PENDING' : 'UNPAID'
    });

    for (const it of items) {
      const mi = await trx('menu_items').where({ id: it.menuItemId }).first();
      const [orderItemId] = await trx('order_items').insert({
        order_id: orderId,
        menu_item_id: it.menuItemId,
        quantity: it.quantity || 1,
        unit_price: mi?.price || 0,
        note: it.note || null
      });
      for (const m of it.modifiers || []) {
        // If modifierId provided, fetch extra price; otherwise accept provided extra_price
        let extra = m.extra_price;
        if (m.modifierId && (extra == null)) {
          const mod = await trx('modifiers').where({ id: m.modifierId }).first();
          extra = mod?.extra_price || 0;
        }
        await trx('order_item_modifier').insert({ order_item_id: orderItemId, modifier_id: m.modifierId || null, extra_price: extra || 0 });
      }
    }

    await trx('sync_logs').insert({ table_name: 'orders', record_id: orderId, operation: 'INSERT', payload: JSON.stringify(req.body) });

    await trx.commit();

    const io = req.app.get('io');
    const order = await db('orders').where({ id: orderId }).first();
    io.to(`branch:${branchId}:kitchen`).emit('order.created', order);

    const orderQr = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/order/${orderId}`;

    res.status(201).json({ orderId, orderCode, qr: orderQr, status: 'SUBMITTED' });
  } catch (err) {
    if (trx) await trx.rollback();
    console.error(err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// GET /api/orders
router.get('/', async (req, res) => {
  const db = getDb();
  const { status } = req.query;
  let q = db('orders').select('*');
  if (status) q = q.where({ status });
  const rows = await q.orderBy('created_at', 'desc');
  res.json(rows);
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  const order = await db('orders').where({ id }).first();
  if (!order) return res.status(404).json({ error: 'Not found' });
  const items = await db('order_items').where({ order_id: id });
  const mods = await db('order_item_modifier').whereIn('order_item_id', items.map(i => i.id));
  res.json({ ...order, items: items.map(i => ({ ...i, modifiers: mods.filter(m => m.order_item_id === i.id) })) });
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', async (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  const { status } = req.body;
  const allowed = ['SUBMITTED','AWAITING_PAYMENT','PENDING','CONFIRMED','PREPARING','READY','SERVED','PAID','COMPLETED','CANCELLED'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  await db('orders').where({ id }).update({ status, updated_at: db.raw('CURRENT_TIMESTAMP') });
  const order = await db('orders').where({ id }).first();
  const io = req.app.get('io');
  io.to(`branch:${order.branch_id}:kitchen`).emit('order.updated', order);
  res.json(order);
});

export default router;
