const express = require('express');
const QRCode = require('qrcode');
const { db } = require('../database/init');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateOrder } = require('../middleware/validation');
const { orderRateLimiter } = require('../middleware/rateLimiter');
const { logger } = require('../middleware/errorHandler');

const router = express.Router();

// Create new order (public endpoint for customers)
router.post('/', orderRateLimiter, validateOrder, async (req, res) => {
  const trx = await db.transaction();
  
  try {
    const { branchId, tableId, customerName, items, paymentMethod, clientMeta } = req.body;

    // Generate order code
    const branch = await trx('branches').where({ id: branchId }).first();
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderCount = await trx('orders').where({ branch_id: branchId }).count('id as count').first();
    const orderCode = `${branch.code}-${timestamp}-${String(orderCount.count + 1).padStart(4, '0')}`;

    // Generate unique 8-digit PIN
    let pin;
    let isUnique = false;
    while (!isUnique) {
      pin = Math.floor(10000000 + Math.random() * 90000000).toString();
      const existingOrder = await trx('orders').where({ pin }).first();
      if (!existingOrder) {
        isUnique = true;
      }
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await trx('menu_items').where({ id: item.menuItemId }).first();
      if (!menuItem || !menuItem.is_available) {
        throw new Error(`Menu item ${item.menuItemId} not available`);
      }

      let itemTotal = menuItem.price * item.quantity;
      const modifiers = [];

      // Add modifier costs
      if (item.modifiers && item.modifiers.length > 0) {
        for (const modifierId of item.modifiers) {
          const modifier = await trx('modifiers').where({ id: modifierId }).first();
          if (modifier) {
            itemTotal += modifier.extra_price * item.quantity;
            modifiers.push(modifier);
          }
        }
      }

      subtotal += itemTotal;
      orderItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: menuItem.price,
        note: item.note,
        modifiers
      });
    }

    // Get tax and service charge rates
    const taxRate = await trx('settings').where({ key: 'tax_rate' }).first();
    const serviceChargeRate = await trx('settings').where({ key: 'service_charge_rate' }).first();
    
    const tax = subtotal * (parseFloat(taxRate?.value || 0) / 100);
    const serviceCharge = subtotal * (parseFloat(serviceChargeRate?.value || 0) / 100);
    const total = subtotal + tax + serviceCharge;

    // Create order
    const [orderId] = await trx('orders').insert({
      branch_id: branchId,
      order_code: orderCode,
      pin: pin,
      table_id: tableId,
      customer_name: customerName,
      total,
      tax,
      service_charge: serviceCharge,
      status: paymentMethod === 'CARD' ? 'AWAITING_PAYMENT' : 'PENDING',
      payment_status: 'UNPAID',
      payment_method: paymentMethod || 'cash'
    });

    // Create order items
    for (const orderItem of orderItems) {
      const [orderItemId] = await trx('order_items').insert({
        order_id: orderId,
        menu_item_id: orderItem.menuItemId,
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

    // Generate order tracking QR code for customer
    const orderTrackingUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/order-status/${orderId}`;
    const trackingQrCode = await QRCode.toDataURL(orderTrackingUrl);

    // Generate payment QR code for cashier (cash payments only)
    let paymentQrCode = null;
    if (paymentMethod === 'cash' || !paymentMethod) {
      paymentQrCode = await QRCode.toDataURL(orderCode, {
        width: 300,
        margin: 2
      });
    }

    // Emit real-time event
    const io = req.app.get('io');
    const order = await db('orders')
      .select('orders.*', 'tables.table_number', 'branches.name as branch_name')
      .leftJoin('tables', 'orders.table_id', 'tables.id')
      .leftJoin('branches', 'orders.branch_id', 'branches.id')
      .where({ 'orders.id': orderId })
      .first();

    io.to(`branch:${branchId}:kitchen`).emit('order.created', order);
    io.to(`branch:${branchId}:cashier`).emit('order.created', order);

    // Log order creation
    await db('audit_logs').insert({
      user_id: null,
      action: 'ORDER_CREATE',
      meta: JSON.stringify({ 
        orderId, 
        orderCode, 
        tableId, 
        customerName, 
        total,
        paymentMethod,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      })
    });

    logger.info(`Order created: ${orderCode} for table ${tableId} - Payment: ${paymentMethod || 'cash'}`);

    res.status(201).json({
      orderId,
      orderCode,
      pin: pin,
      trackingUrl: orderTrackingUrl,
      trackingQrCode: trackingQrCode,
      paymentQrCode: paymentQrCode,
      status: order.status,
      total,
      paymentMethod: order.payment_method,
      message: 'Order created successfully'
    });

  } catch (error) {
    await trx.rollback();
    logger.error('Order creation error:', error);
    res.status(500).json({ error: error.message || 'Failed to create order' });
  }
});

// Get orders (admin/cashier)
router.get('/', authenticateToken, authorize('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }
    
    const { status, tableId, limit = 50, offset = 0 } = req.query;

    let query = db('orders')
      .select(
        'orders.*',
        'tables.table_number',
        'branches.name as branch_name'
      )
      .leftJoin('tables', 'orders.table_id', 'tables.id')
      .leftJoin('branches', 'orders.branch_id', 'branches.id')
      .where({ 'orders.branch_id': branchId });

    if (status) {
      if (Array.isArray(status)) {
        query = query.whereIn('orders.status', status);
      } else {
        query = query.where({ 'orders.status': status });
      }
    }

    if (tableId) {
      query = query.where({ 'orders.table_id': tableId });
    }

    const orders = await query
      .orderBy('orders.created_at', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    // Get order items for each order
    for (const order of orders) {
      const items = await db('order_items')
        .select(
          'order_items.*',
          'menu_items.name as item_name',
          'menu_items.sku'
        )
        .leftJoin('menu_items', 'order_items.menu_item_id', 'menu_items.id')
        .where({ 'order_items.order_id': order.id });

      // Get modifiers for each item
      for (const item of items) {
        const modifiers = await db('order_item_modifiers')
          .select('modifiers.name', 'order_item_modifiers.extra_price')
          .leftJoin('modifiers', 'order_item_modifiers.modifier_id', 'modifiers.id')
          .where({ 'order_item_modifiers.order_item_id': item.id });

        item.modifiers = modifiers;
      }

      order.items = items;
    }

    res.json({ success: true, orders });
  } catch (error) {
    logger.error('Orders fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get order by PIN (public endpoint for customers)
router.get('/pin/:pin', async (req, res) => {
  try {
    const { pin } = req.params;

    if (!pin || pin.length !== 8) {
      return res.status(400).json({ error: 'Invalid PIN format' });
    }

    const order = await db('orders')
      .select(
        'orders.id',
        'orders.order_code',
        'orders.pin',
        'orders.status',
        'orders.payment_status',
        'orders.total',
        'orders.created_at',
        'orders.updated_at',
        'tables.table_number',
        'branches.name as branch_name'
      )
      .leftJoin('tables', 'orders.table_id', 'tables.id')
      .leftJoin('branches', 'orders.branch_id', 'branches.id')
      .where({ 'orders.pin': pin })
      .first();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get order items (only basic info for customer view)
    const items = await db('order_items')
      .select(
        'order_items.quantity',
        'menu_items.name as item_name',
        'menu_items.price'
      )
      .leftJoin('menu_items', 'order_items.menu_item_id', 'menu_items.id')
      .where({ 'order_items.order_id': order.id });

    order.items = items;

    res.json({ 
      success: true,
      order: {
        id: order.id,
        orderCode: order.order_code,
        pin: order.pin,
        status: order.status,
        paymentStatus: order.payment_status,
        total: order.total,
        tableNumber: order.table_number,
        branchName: order.branch_name,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        items: items
      }
    });
  } catch (error) {
    logger.error('Order PIN lookup error:', error);
    res.status(500).json({ error: 'Failed to lookup order' });
  }
});

// Get order by code (cashier endpoint for QR code scanning/search)
router.get('/code/:code', authenticateToken, authorize('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const { code } = req.params;
    const branchId = req.user.branch_id;

    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }

    const order = await db('orders')
      .select(
        'orders.*',
        'tables.table_number',
        'branches.name as branch_name'
      )
      .leftJoin('tables', 'orders.table_id', 'tables.id')
      .leftJoin('branches', 'orders.branch_id', 'branches.id')
      .where({ 
        'orders.order_code': code,
        'orders.branch_id': branchId
      })
      .first();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get order items
    const items = await db('order_items')
      .select(
        'order_items.*',
        'menu_items.name as item_name',
        'menu_items.sku'
      )
      .leftJoin('menu_items', 'order_items.menu_item_id', 'menu_items.id')
      .where({ 'order_items.order_id': order.id });

    // Get modifiers for each item
    for (const item of items) {
      const modifiers = await db('order_item_modifiers')
        .select('modifiers.name', 'order_item_modifiers.extra_price')
        .leftJoin('modifiers', 'order_item_modifiers.modifier_id', 'modifiers.id')
        .where({ 'order_item_modifiers.order_item_id': item.id });
      item.modifiers = modifiers;
    }

    order.items = items;

    res.json({ success: true, order });
  } catch (error) {
    logger.error('Order code lookup error:', error);
    res.status(500).json({ error: 'Failed to lookup order' });
  }
});

// Confirm payment (cashier endpoint)
router.patch('/:id/payment', authenticateToken, authorize('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentMethod } = req.body;
    const branchId = req.user.branch_id;

    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }

    // Validate payment status
    const validPaymentStatuses = ['PAID', 'UNPAID'];
    if (!validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({ error: 'Invalid payment status' });
    }

    // Get current order
    const currentOrder = await db('orders')
      .where({ id, branch_id: branchId })
      .first();

    if (!currentOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update payment status
    await db('orders')
      .where({ id })
      .update({
        payment_status: paymentStatus,
        payment_method: paymentMethod || currentOrder.payment_method,
        status: paymentStatus === 'PAID' ? 'PREPARING' : currentOrder.status,
        updated_at: db.raw('CURRENT_TIMESTAMP')
      });

    // Get updated order with details
    const order = await db('orders')
      .select('orders.*', 'tables.table_number', 'branches.name as branch_name')
      .leftJoin('tables', 'orders.table_id', 'tables.id')
      .leftJoin('branches', 'orders.branch_id', 'branches.id')
      .where({ 'orders.id': id })
      .first();

    // Get order items for kitchen notification
    const items = await db('order_items')
      .select('order_items.*', 'menu_items.name as item_name')
      .leftJoin('menu_items', 'order_items.menu_item_id', 'menu_items.id')
      .where({ 'order_items.order_id': id });

    order.items = items;

    // Emit real-time events
    const io = req.app.get('io');
    
    if (paymentStatus === 'PAID') {
      // Notify kitchen to start preparation
      io.to(`branch:${branchId}:kitchen`).emit('order.paid', order);
      
      // Notify cashier dashboard
      io.to(`branch:${branchId}:cashier`).emit('order.updated', order);
      
      // Update revenue
      io.to(`branch:${branchId}:admin`).emit('revenue.updated', {
        amount: order.total,
        orderId: order.id,
        orderCode: order.order_code
      });

      logger.info(`Payment confirmed for order ${order.order_code} - Total: ${order.total}`);
    }

    // Log payment action
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: paymentStatus === 'PAID' ? 'PAYMENT_CONFIRMED' : 'PAYMENT_REVERTED',
      meta: JSON.stringify({
        orderId: id,
        orderCode: order.order_code,
        paymentStatus,
        paymentMethod,
        total: order.total
      })
    });

    res.json({
      success: true,
      message: `Payment ${paymentStatus === 'PAID' ? 'confirmed' : 'reverted'} successfully`,
      order
    });
  } catch (error) {
    logger.error('Payment confirmation error:', error);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

// Get single order (secured endpoint - requires auth or PIN)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { pin } = req.query;
    const token = req.headers.authorization;

    // Check if user is authenticated
    const isAuthenticated = !!token;

    const order = await db('orders')
      .select(
        'orders.*',
        'tables.table_number',
        'branches.name as branch_name'
      )
      .leftJoin('tables', 'orders.table_id', 'tables.id')
      .leftJoin('branches', 'orders.branch_id', 'branches.id')
      .where({ 'orders.id': id })
      .first();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // For unauthenticated requests, verify PIN
    if (!isAuthenticated) {
      if (!pin || pin !== order.pin) {
        return res.status(403).json({ error: 'Invalid PIN or authentication required' });
      }
    }

    // Get order items
    const items = await db('order_items')
      .select(
        'order_items.*',
        'menu_items.name as item_name',
        'menu_items.sku',
        'menu_items.description as item_description'
      )
      .leftJoin('menu_items', 'order_items.menu_item_id', 'menu_items.id')
      .where({ 'order_items.order_id': id });

    // Get modifiers for each item
    for (const item of items) {
      const modifiers = await db('order_item_modifiers')
        .select('modifiers.name', 'order_item_modifiers.extra_price')
        .leftJoin('modifiers', 'order_item_modifiers.modifier_id', 'modifiers.id')
        .where({ 'order_item_modifiers.order_item_id': item.id });

      item.modifiers = modifiers;
    }

    order.items = items;

    // Only include payments for authenticated users
    if (isAuthenticated) {
      const payments = await db('payments').where({ order_id: id });
      order.payments = payments;
    }

    res.json({ order });
  } catch (error) {
    logger.error('Order fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Update order status (admin/cashier/kitchen)
router.patch('/:id/status', authenticateToken, authorize('admin', 'manager', 'cashier', 'kitchen'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get current order status before updating
    const currentOrder = await db('orders').where({ id }).first();
    
    if (!currentOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await db('orders')
      .where({ id })
      .update({
        status,
        updated_at: db.raw('CURRENT_TIMESTAMP')
      });

    const order = await db('orders')
      .select('orders.*', 'tables.table_number')
      .leftJoin('tables', 'orders.table_id', 'tables.id')
      .where({ 'orders.id': id })
      .first();

    // Automatic inventory deduction when order is completed
    if (status === 'COMPLETED' && currentOrder.status !== 'COMPLETED') {
      try {
        // Get all order items
        const orderItems = await db('order_items')
          .select('menu_item_id', 'quantity')
          .where({ order_id: id });

        for (const item of orderItems) {
          // Get recipes for this menu item
          const recipes = await db('recipes')
            .select('stock_item_id', 'qty_per_serving')
            .where({ menu_item_id: item.menu_item_id });

          for (const recipe of recipes) {
            const deductionQty = recipe.qty_per_serving * item.quantity;
            
            // Update stock quantity
            await db('stock_items')
              .where({ id: recipe.stock_item_id })
              .decrement('quantity', deductionQty);

            // Record the movement
            await db('stock_movements').insert({
              stock_item_id: recipe.stock_item_id,
              movement_type: 'OUT',
              quantity: deductionQty,
              reference_type: 'ORDER',
              reference_id: id,
              notes: `Auto-deduction for order ${order.order_code}`,
              created_by: req.user.id
            });
          }
        }

        logger.info(`Inventory deducted for completed order ${order.order_code}`);
      } catch (invError) {
        logger.error(`Inventory deduction error for order ${id}:`, invError);
        // Don't fail the entire request if inventory deduction fails
      }
    }

    // Emit real-time event
    const io = req.app.get('io');
    io.to(`branch:${order.branch_id}:kitchen`).emit('order.updated', order);
    io.to(`branch:${order.branch_id}:cashier`).emit('order.updated', order);

    // Log status change
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'ORDER_STATUS_UPDATE',
      meta: JSON.stringify({ orderId: id, status, userId: req.user.id })
    });

    logger.info(`Order ${id} status updated to ${status} by ${req.user.username}`);

    res.json({ order });
  } catch (error) {
    logger.error('Order status update error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Confirm order (cashier)
router.post('/:id/confirm', authenticateToken, authorize('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const { id } = req.params;

    const order = await db('orders').where({ id }).first();
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'PENDING' && order.status !== 'AWAITING_PAYMENT') {
      return res.status(400).json({ error: 'Order cannot be confirmed in current status' });
    }

    await db('orders')
      .where({ id })
      .update({
        status: 'CONFIRMED',
        updated_at: db.raw('CURRENT_TIMESTAMP')
      });

    // Consume inventory
    await consumeInventoryForOrder(id);

    // Emit real-time event
    const io = req.app.get('io');
    const updatedOrder = await db('orders')
      .select('orders.*', 'tables.table_number')
      .leftJoin('tables', 'orders.table_id', 'tables.id')
      .where({ 'orders.id': id })
      .first();

    io.to(`branch:${order.branch_id}:kitchen`).emit('order.confirmed', updatedOrder);

    // Log confirmation
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'ORDER_CONFIRM',
      meta: JSON.stringify({ orderId: id, userId: req.user.id })
    });

    logger.info(`Order ${id} confirmed by ${req.user.username}`);

    res.json({ order: updatedOrder, message: 'Order confirmed successfully' });
  } catch (error) {
    logger.error('Order confirmation error:', error);
    res.status(500).json({ error: 'Failed to confirm order' });
  }
});

// Cancel order (admin/cashier)
router.post('/:id/cancel', authenticateToken, authorize('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await db('orders').where({ id }).first();
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Order cannot be cancelled in current status' });
    }

    await db('orders')
      .where({ id })
      .update({
        status: 'CANCELLED',
        updated_at: db.raw('CURRENT_TIMESTAMP')
      });

    // Emit real-time event
    const io = req.app.get('io');
    const updatedOrder = await db('orders')
      .select('orders.*', 'tables.table_number')
      .leftJoin('tables', 'orders.table_id', 'tables.id')
      .where({ 'orders.id': id })
      .first();

    io.to(`branch:${order.branch_id}:kitchen`).emit('order.cancelled', updatedOrder);
    io.to(`branch:${order.branch_id}:cashier`).emit('order.cancelled', updatedOrder);

    // Log cancellation
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'ORDER_CANCEL',
      meta: JSON.stringify({ orderId: id, reason, userId: req.user.id })
    });

    logger.info(`Order ${id} cancelled by ${req.user.username}: ${reason}`);

    res.json({ order: updatedOrder, message: 'Order cancelled successfully' });
  } catch (error) {
    logger.error('Order cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Helper function to consume inventory
async function consumeInventoryForOrder(orderId) {
  try {
    const orderItems = await db('order_items').where({ order_id: orderId });
    
    for (const item of orderItems) {
      const recipes = await db('recipes').where({ menu_item_id: item.menu_item_id });
      
      for (const recipe of recipes) {
        const quantityToConsume = recipe.qty_per_serving * item.quantity;
        
        // Update stock quantity
        await db('stock_items')
          .where({ id: recipe.stock_item_id })
          .decrement('quantity', quantityToConsume);

        // Log stock movement
        await db('stock_movements').insert({
          stock_item_id: recipe.stock_item_id,
          change: -quantityToConsume,
          reason: `Order ${orderId} - ${item.quantity}x menu item ${item.menu_item_id}`
        });
      }
    }
  } catch (error) {
    logger.error('Inventory consumption error:', error);
    throw error;
  }
}

module.exports = router;