const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Create new order (public endpoint for customers)
router.post('/', [
  body('branchId').isInt(),
  body('tableId').isInt(),
  body('customerName').optional().trim(),
  body('items').isArray({ min: 1 }),
  body('items.*.menuItemId').isInt(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.note').optional().trim(),
  body('items.*.modifiers').optional().isArray(),
  body('paymentMethod').isIn(['CASH', 'CARD'])
], async (req, res) => {
  const trx = await db.transaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await trx.rollback();
      return res.status(400).json({ errors: errors.array() });
    }

    const { branchId, tableId, customerName, items, paymentMethod, clientMeta } = req.body;

    // Generate order code
    const branch = await db('branches').where({ id: branchId }).first();
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = await db('orders').where({ branch_id: branchId }).count('* as count').first();
    const orderCode = `${branch.code}-${today}-${String(parseInt(orderNumber.count) + 1).padStart(4, '0')}`;

    // Calculate total
    let total = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await db('menu_items').where({ id: item.menuItemId }).first();
      if (!menuItem) {
        await trx.rollback();
        return res.status(400).json({ error: `Menu item ${item.menuItemId} not found` });
      }

      let itemTotal = menuItem.price * item.quantity;
      const modifiers = [];

      // Add modifier prices
      if (item.modifiers && item.modifiers.length > 0) {
        for (const modifierId of item.modifiers) {
          const modifier = await db('modifiers').where({ id: modifierId }).first();
          if (modifier) {
            itemTotal += modifier.extra_price * item.quantity;
            modifiers.push(modifier);
          }
        }
      }

      total += itemTotal;
      orderItems.push({
        menuItem,
        quantity: item.quantity,
        unitPrice: menuItem.price,
        note: item.note,
        modifiers,
        itemTotal
      });
    }

    // Create order
    const [orderId] = await trx('orders').insert({
      branch_id: branchId,
      table_id: tableId,
      order_code: orderCode,
      customer_name: customerName,
      total,
      status: paymentMethod === 'CARD' ? 'AWAITING_PAYMENT' : 'PENDING',
      payment_status: 'UNPAID',
      created_at: db.raw('CURRENT_TIMESTAMP'),
      updated_at: db.raw('CURRENT_TIMESTAMP')
    });

    // Create order items
    for (const orderItem of orderItems) {
      const [orderItemId] = await trx('order_items').insert({
        order_id: orderId,
        menu_item_id: orderItem.menuItem.id,
        quantity: orderItem.quantity,
        unit_price: orderItem.unitPrice,
        note: orderItem.note
      });

      // Create order item modifiers
      for (const modifier of orderItem.modifiers) {
        await trx('order_item_modifiers').insert({
          order_item_id: orderItemId,
          modifier_id: modifier.id,
          extra_price: modifier.extra_price
        });
      }
    }

    await trx.commit();

    // Emit real-time event
    const io = req.app.get('io');
    const order = await db('orders')
      .join('tables', 'orders.table_id', 'tables.id')
      .select('orders.*', 'tables.table_number')
      .where('orders.id', orderId)
      .first();

    io.to(`branch:${branchId}:kitchen`).emit('order.created', order);

    // Generate order QR
    const orderQr = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/order/${orderId}`;

    res.status(201).json({
      orderId,
      orderCode,
      qr: orderQr,
      status: order.status,
      total
    });

  } catch (error) {
    logger.error('Create order error:', error);
    if (trx) await trx.rollback();
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get orders (admin)
router.get('/', async (req, res) => {
  try {
    const { branchId, status, tableId, limit = 50, offset = 0 } = req.query;
    
    let query = db('orders')
      .join('tables', 'orders.table_id', 'tables.id')
      .join('branches', 'orders.branch_id', 'branches.id')
      .select(
        'orders.*',
        'tables.table_number',
        'branches.name as branch_name'
      );

    if (branchId) {
      query = query.where('orders.branch_id', branchId);
    }
    
    if (status) {
      query = query.where('orders.status', status);
    }
    
    if (tableId) {
      query = query.where('orders.table_id', tableId);
    }

    const orders = await query
      .orderBy('orders.created_at', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await db('order_items')
          .join('menu_items', 'order_items.menu_item_id', 'menu_items.id')
          .leftJoin('order_item_modifiers', 'order_items.id', 'order_item_modifiers.order_item_id')
          .leftJoin('modifiers', 'order_item_modifiers.modifier_id', 'modifiers.id')
          .select(
            'order_items.*',
            'menu_items.name as item_name',
            'menu_items.sku',
            db.raw('GROUP_CONCAT(modifiers.name) as modifier_names'),
            db.raw('SUM(order_item_modifiers.extra_price) as modifier_total')
          )
          .where('order_items.order_id', order.id)
          .groupBy('order_items.id');

        return {
          ...order,
          items
        };
      })
    );

    res.json(ordersWithItems);
  } catch (error) {
    logger.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single order
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await db('orders')
      .join('tables', 'orders.table_id', 'tables.id')
      .join('branches', 'orders.branch_id', 'branches.id')
      .select(
        'orders.*',
        'tables.table_number',
        'branches.name as branch_name'
      )
      .where('orders.id', id)
      .first();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = await db('order_items')
      .join('menu_items', 'order_items.menu_item_id', 'menu_items.id')
      .leftJoin('order_item_modifiers', 'order_items.id', 'order_item_modifiers.order_item_id')
      .leftJoin('modifiers', 'order_item_modifiers.modifier_id', 'modifiers.id')
      .select(
        'order_items.*',
        'menu_items.name as item_name',
        'menu_items.sku',
        db.raw('GROUP_CONCAT(modifiers.name) as modifier_names'),
        db.raw('SUM(order_item_modifiers.extra_price) as modifier_total')
      )
      .where('order_items.order_id', id)
      .groupBy('order_items.id');

    res.json({
      ...order,
      items
    });
  } catch (error) {
    logger.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Update order status (admin)
router.patch('/:id/status', [
  body('status').isIn(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'PAID', 'COMPLETED', 'CANCELLED'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    const order = await db('orders').where({ id }).first();
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await db('orders').where({ id }).update({
      status,
      updated_at: db.raw('CURRENT_TIMESTAMP')
    });

    // Emit real-time event
    const io = req.app.get('io');
    const updatedOrder = await db('orders')
      .join('tables', 'orders.table_id', 'tables.id')
      .select('orders.*', 'tables.table_number')
      .where('orders.id', id)
      .first();

    io.to(`branch:${order.branch_id}:kitchen`).emit('order.updated', updatedOrder);

    // If order is confirmed, consume inventory
    if (status === 'CONFIRMED') {
      await consumeInventory(id);
    }

    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    logger.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Cancel order
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await db('orders').where({ id }).first();
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Cannot cancel completed or already cancelled order' });
    }

    await db('orders').where({ id }).update({
      status: 'CANCELLED',
      updated_at: db.raw('CURRENT_TIMESTAMP')
    });

    // Emit real-time event
    const io = req.app.get('io');
    const updatedOrder = await db('orders')
      .join('tables', 'orders.table_id', 'tables.id')
      .select('orders.*', 'tables.table_number')
      .where('orders.id', id)
      .first();

    io.to(`branch:${order.branch_id}:kitchen`).emit('order.cancelled', updatedOrder);

    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    logger.error('Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Helper function to consume inventory
async function consumeInventory(orderId) {
  try {
    const orderItems = await db('order_items')
      .join('recipes', 'order_items.menu_item_id', 'recipes.menu_item_id')
      .where('order_items.order_id', orderId);

    for (const item of orderItems) {
      const consumption = item.qty_per_serving * item.quantity;
      
      await db('stock_items')
        .where({ id: item.stock_item_id })
        .decrement('quantity', consumption);

      await db('stock_movements').insert({
        stock_item_id: item.stock_item_id,
        change: -consumption,
        reason: `Order ${orderId} consumption`
      });
    }
  } catch (error) {
    logger.error('Inventory consumption error:', error);
  }
}

module.exports = router;