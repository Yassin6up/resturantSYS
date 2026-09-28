const express = require('express');
const QRCode = require('qrcode');
const { randomBytes, randomInt } = require('crypto');
const { db } = require('../database/init');
const { authenticateToken, authorize, optionalAuth, requireActiveBranch } = require('../middleware/auth');
const { validateOrder } = require('../middleware/validation');
const { orderRateLimiter } = require('../middleware/rateLimiter');
const { logger } = require('../middleware/errorHandler');
const { TRANSITIONS, canTransition, isConfirmedOrLater } = require('../utils/orderStateMachine');
const { previewReward, applyRedemption, earnPointsForOrder, reverseLoyaltyForOrder } = require('../utils/loyalty');
const { syncMenuItemAvailability } = require('../utils/menuAvailability');

const router = express.Router();

// Updated order creation API - using existing variant fields in order_items
router.post('/', orderRateLimiter, optionalAuth, validateOrder, async (req, res) => {
  const trx = await db.transaction();
  
  try {
    let {
      tableNumber,
      customerName, 
      items, 
      paymentMethod, 
      amountPaid,
      changeAmount,
      deliveryAddress,
      customerPhone ,
      paymentStatus ,
      orderStatus,
      customerId,
      rewardId
    } = req.body;
    // A logged-in staff member's own branch is authoritative and can't be
    // spoofed by the client; only fall back to tenant/body resolution for
    // the anonymous customer QR-ordering flow.
    const branchId = req.user?.branch_id || req.branchId || req.body.branchId;
    if (!branchId) {
      await trx.rollback();
      return res.status(400).json({ error: 'Could not determine which restaurant this order is for' });
    }

    const branchCheck = await trx('branches').where({ id: branchId }).first();
    if (!branchCheck || branchCheck.is_active === false || branchCheck.is_active === 0) {
      await trx.rollback();
      return res.status(403).json({ error: 'This restaurant is not currently accepting orders' });
    }

    console.log('🔵 BACKEND - Received order data:', {
      branchId,
      tableNumber, 
      customerName,
      items: items.map(item => ({
        menuItemId: item.menuItemId,
        variantId: item.variantId,
        quantity: item.quantity
      }))
    });

    const isStaff = req.user && ['admin', 'manager', 'cashier', 'waiter', 'owner'].includes(req.user.role);
    if (!isStaff) {
      paymentStatus = 'UNPAID';
      orderStatus = 'PENDING';
      amountPaid = 0;
      changeAmount = 0;
      customerId = null;
      rewardId = null;
      if (paymentMethod && paymentMethod.toLowerCase() !== 'cash') {
        await trx.rollback();
        return res.status(400).json({ error: 'Online payment is not available in this checkout. Choose pay on collection or delivery.' });
      }
    }
    paymentMethod = (paymentMethod || 'cash').toLowerCase();
    const requestedType = req.body.orderType === 'TAKE_OUT' ? 'TAKEAWAY' : req.body.orderType;
    const orderType = deliveryAddress ? 'DELIVERY' : (requestedType || (tableNumber && tableNumber !== 'null' ? 'DINE_IN' : 'TAKEAWAY'));
    if (!['DINE_IN', 'TAKEAWAY', 'DELIVERY'].includes(orderType) || (orderType === 'DELIVERY' && !deliveryAddress?.trim())) {
      await trx.rollback();
      return res.status(400).json({ error: 'Choose a valid fulfillment method and delivery address' });
    }
    let table = null;
    if (orderType === 'DINE_IN') {
      table = await trx('tables').where({ table_number: String(tableNumber || ''), branch_id: branchId }).first();
    }
    if (orderType === 'DINE_IN' && !table) {
      await trx.rollback();
      return res.status(400).json({ 
        error: `Table "${tableNumber}" not found in branch ${branchId}.`
      });
    }

    // Generate order code
    const branch = await trx('branches').where({ id: branchId }).first();
    if (!branch) {
      await trx.rollback();
      return res.status(400).json({ error: `Branch ${branchId} not found` });
    }

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderCount = await trx('orders')
      .where({ branch_id: branchId })
      .andWhere('created_at', '>=', new Date().toISOString().slice(0, 10))
      .count('id as count')
      .first();
    
    const orderCode = `${branch.code}-${timestamp}-${randomBytes(5).toString('hex').toUpperCase()}`;

    // Generate unique PIN
    let pin;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      pin = randomInt(10000000, 100000000).toString();
      const existingOrder = await trx('orders').where({ pin }).first();
      if (!existingOrder) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      await trx.rollback();
      return res.status(500).json({ error: 'Failed to generate unique PIN' });
    }

    // Calculate totals with variants
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await trx('menu_items').where({ id: item.menuItemId, branch_id: branchId }).first();
      if (!menuItem) {
        await trx.rollback();
        return res.status(400).json({ error: `Menu item ${item.menuItemId} not found` });
      }

      if (!menuItem.is_available) {
        await trx.rollback();
        return res.status(400).json({ error: `Menu item "${menuItem.name}" is not available` });
      }

      // Handle variant price adjustment
      let basePrice = parseFloat(menuItem.price);
      let variantData = null;

      if (item.variantId) {
        const variant = await trx('product_variants')
          .where({ 
            id: item.variantId,
            menu_item_id: item.menuItemId,
            is_active: true 
          })
          .first();
        
        if (!variant) {
          await trx.rollback();
          return res.status(400).json({ error: 'The selected product option is no longer available' });
        }
        if (variant) {
          variantData = variant;
          basePrice += parseFloat(variant.price_adjustment || 0);
          console.log(`✅ Variant applied: ${variant.name}, Price adjustment: ${variant.price_adjustment}`);
        }
      }

      let itemTotal = basePrice * item.quantity;
      const modifiers = [];

      // Add modifier costs
      if (item.modifiers && item.modifiers.length > 0) {
        for (const modifierId of new Set(item.modifiers)) {
          const modifier = await trx('modifiers').where({ id: modifierId, menu_item_id: item.menuItemId }).first();
          if (!modifier) {
            await trx.rollback();
            return res.status(400).json({ error: 'An add-on is not available for this item' });
          }
          if (modifier) {
            itemTotal += parseFloat(modifier.extra_price || 0) * item.quantity;
            modifiers.push(modifier);
          }
        }
      }

      subtotal += itemTotal;
      
      orderItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: basePrice,
        note: item.note || '',
        modifiers,
        variant: variantData,
        itemTotal
      });
    }

    // Calculate tax and totals
    const taxRate = await trx('settings').where({ key: 'tax_rate' }).first();
    const serviceChargeRate = await trx('settings').where({ key: 'service_charge_rate' }).first();
    
    const taxRateValue = parseFloat(taxRate?.value || 10);
    const serviceChargeRateValue = orderType === 'DINE_IN' ? parseFloat(serviceChargeRate?.value ?? 5) : 0;
    
    const tax = subtotal * (taxRateValue / 100);
    const serviceCharge = subtotal * (serviceChargeRateValue / 100);

    let loyaltyDiscount = 0;
    let previewedReward = null;
    if (customerId && rewardId) {
      try {
        const { reward, discount } = await previewReward({ branchId, customerId, rewardId, itemsSubtotal: subtotal }, trx);
        previewedReward = reward;
        loyaltyDiscount = discount;
      } catch (loyaltyError) {
        await trx.rollback();
        return res.status(400).json({ error: loyaltyError.message });
      }
    }

    const total = Math.max(0, subtotal + tax + serviceCharge - loyaltyDiscount);

    // Determine payment status
    // if (amountPaid && parseFloat(amountPaid) >= total) {
    //   paymentStatus = 'PAID';
    // } else if (amountPaid && parseFloat(amountPaid) > 0) {
    //   paymentStatus = 'PARTIALLY_PAID';
    // }

    // Create order
    const [orderId] = await trx('orders').insert({
      branch_id: branchId,
      order_code: orderCode,
      pin: pin,
      table_id: table?.id || null,
      customer_name: customerName,
      customer_phone: customerPhone,
      total: parseFloat(total.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      service_charge: parseFloat(serviceCharge.toFixed(2)),
      status: orderStatus || 'PENDING',
      payment_status: paymentStatus || 'UNPAID',
      payment_method: paymentMethod || 'cash',
      amount_paid: amountPaid ? parseFloat(amountPaid) : 0,
      change_amount: changeAmount ? parseFloat(changeAmount) : 0,
      customer_id: customerId || null,
      redeemed_reward_id: previewedReward ? previewedReward.id : null,
      loyalty_discount: parseFloat(loyaltyDiscount.toFixed(2)),
      delivery_address: deliveryAddress,
      order_type: orderType
    });

    // Create order items using existing variant fields
    for (const orderItem of orderItems) {
      const [orderItemId] = await trx('order_items').insert({
        order_id: orderId,
        menu_item_id: orderItem.menuItemId,
        quantity: orderItem.quantity,
        unit_price: orderItem.unitPrice,
        note: orderItem.note,
        variant_id: orderItem.variant?.id || null,
        variant_name: orderItem.variant?.name || null,
        variant_price: orderItem.variant?.price_adjustment || null
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

    // POS can create orders already past PENDING (orderStatus body param) -
    // those need inventory consumed immediately since they'll never pass
    // through /confirm.
    if (isConfirmedOrLater(orderStatus || 'PENDING')) {
      await consumeInventoryForOrder(orderId).catch(err =>
        logger.error(`Inventory consumption error for new order ${orderId}:`, err)
      );
    }

    if (previewedReward) {
      await applyRedemption({
        branchId, customerId, reward: previewedReward, orderId, staffUserId: req.user?.id
      }).catch(err => logger.error(`Loyalty redemption error for order ${orderId}:`, err));
    }
    // POS can also create an already-PAID cash sale in one shot.
    if ((paymentStatus || 'UNPAID') === 'PAID') {
      await earnPointsForOrder(orderId).catch(err =>
        logger.error(`Loyalty earn error for order ${orderId}:`, err)
      );
    }

    // Generate QR codes
    const orderTrackingUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/order-status?pin=${pin}`;
    const trackingQrCode = await QRCode.toDataURL(orderTrackingUrl);

    let paymentQrCode = null;
    if (paymentMethod === 'cash') {
      const paymentData = JSON.stringify({
        orderCode,
        orderId,
        total: total.toFixed(2),
        tableNumber: table?.table_number || null
      });
      paymentQrCode = await QRCode.toDataURL(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/orders?orderSearchQuery=${pin}`);
    }
// Emit real-time event
const io = req.app.get('io');
if (io) {
  const order = await db('orders')
    .select('orders.*', 'tables.table_number', 'branches.name as branch_name')
    .leftJoin('tables', 'orders.table_id', 'tables.id')
    .leftJoin('branches', 'orders.branch_id', 'branches.id')
    .where({ 'orders.id': orderId })
    .first();

  // Get order items with the exact field names your frontend expects
  const items = await db('order_items')
    .select(
      'order_items.*',
      'menu_items.name as item_name', // This matches your frontend
      'menu_items.image as image' // For item.menu_item?.image
    )
    .leftJoin('menu_items', 'order_items.menu_item_id', 'menu_items.id')
    .where({ 'order_items.order_id': orderId });

  // Get modifiers for each item
  for (let item of items) {
    const modifiers = await db('order_item_modifiers')
      .select('modifiers.name')
      .leftJoin('modifiers', 'order_item_modifiers.modifier_id', 'modifiers.id')
      .where({ 'order_item_modifiers.order_item_id': item.id });

    item.modifiers = modifiers;
    
    // Create menu_item object for image access
    item.menu_item = {
      image: item.image
    };
  }

  // Add items to order
  order.items = items;

  // Emit with correct data structure
  io.to(`branch:${branchId}:kitchen`).emit('order.created', order);
  io.to(`branch:${branchId}:cashier`).emit('order.created', order);
  io.to(`branch:${branchId}`).emit('order.updated', order);
}
    logger.info(`Order created: ${orderCode} (${orderType})`);

    res.status(201).json({
      orderId,
      orderCode,
      pin: pin,
      tableNumber: table?.table_number || null,
      trackingUrl: orderTrackingUrl,
      trackingQrCode: trackingQrCode,
      paymentQrCode: paymentQrCode,
      status: 'PENDING',
      total: parseFloat(total.toFixed(2)),
      paymentMethod: paymentMethod || 'cash',
      amountPaid: amountPaid || 0,
      changeAmount: changeAmount || 0,
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
        'orders.*',
        'tables.table_number',
        'branches.name as branch_name',
        'branches.code as branch_code'
      )
      .leftJoin('tables', 'orders.table_id', 'tables.id')
      .leftJoin('branches', 'orders.branch_id', 'branches.id')
      .where({ 'orders.pin': pin })
      .first();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get order items with full details
    const items = await db('order_items')
      .select(
        'order_items.*',
        'menu_items.name as menu_item_name',
        'menu_items.sku',
        'menu_items.image as menu_item_image'
        // Removed description if it doesn't exist
      )
      .leftJoin('menu_items', 'order_items.menu_item_id', 'menu_items.id')
      .where({ 'order_items.order_id': order.id });

    // Get modifiers for each item - FIXED: removed description column
    for (const item of items) {
      const modifiers = await db('order_item_modifiers')
        .select(
          'modifiers.name',
          // 'modifiers.description', // Remove this if column doesn't exist
          'order_item_modifiers.extra_price'
        )
        .leftJoin('modifiers', 'order_item_modifiers.modifier_id', 'modifiers.id')
        .where({ 'order_item_modifiers.order_item_id': item.id });
      item.modifiers = modifiers;
    }

    order.items = items;

    res.json({ 
      success: true, 
      order: {
        id: order.id,
        branch_id: order.branch_id,
        order_code: order.order_code,
        table_id: order.table_id,
        table_number: order.table_number,
        customer_name: order.customer_name,
        total: order.total,
        tax: order.tax,
        service_charge: order.service_charge,
        status: order.status,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        pin: order.pin,
        branch_name: order.branch_name,
        branch_code: order.branch_code,
        created_at: order.created_at,
        updated_at: order.updated_at,
        items: items
      }
    });
  } catch (error) {
    logger.error('Order PIN lookup error:', error);
    res.status(500).json({ error: 'Failed to lookup order: ' + error.message });
  }
});


// Search order by PIN (admin/cashier endpoint for internal search)
router.get('/search/pin/:pin', authenticateToken, authorize('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const { pin } = req.params;
    const branchId = req.user.branch_id;

    console.log('PIN search request:', { pin, branchId, user: req.user });

    if (!pin || pin.length !== 8) {
      return res.status(400).json({ error: 'Invalid PIN format' });
    }

    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }

    const order = await db('orders')
      .select(
        'orders.*',
        'tables.table_number',
        'branches.name as branch_name',
        'branches.code as branch_code'
      )
      .leftJoin('tables', 'orders.table_id', 'tables.id')
      .leftJoin('branches', 'orders.branch_id', 'branches.id')
      .where({ 
        'orders.pin': pin,
        'orders.branch_id': branchId
      })
      .first();

    console.log('Found order:', order);

    if (!order) {
      // Check if order exists in other branches
      const orderInOtherBranch = await db('orders')
        .select('branch_id')
        .where({ pin: pin })
        .first();
        
      if (orderInOtherBranch) {
        return res.status(403).json({ 
          error: `Order found but belongs to different branch (ID: ${orderInOtherBranch.branch_id})` 
        });
      }
      return res.status(404).json({ error: 'Order not found with this PIN' });
    }

    // Get order items with full details
    const items = await db('order_items')
      .select(
        'order_items.*',
        'menu_items.name as menu_item_name',
        'menu_items.sku',
        'menu_items.image as menu_item_image'
        // Removed description if it doesn't exist
      )
      .leftJoin('menu_items', 'order_items.menu_item_id', 'menu_items.id')
      .where({ 'order_items.order_id': order.id });

    console.log('Found items:', items.length);

    // Get modifiers for each item - FIXED: removed description column
    for (const item of items) {
      const modifiers = await db('order_item_modifiers')
        .select(
          'modifiers.name',
          // 'modifiers.description', // Remove this if column doesn't exist
          'order_item_modifiers.extra_price'
        )
        .leftJoin('modifiers', 'order_item_modifiers.modifier_id', 'modifiers.id')
        .where({ 'order_item_modifiers.order_item_id': item.id });
      item.modifiers = modifiers;
      console.log(`Item ${item.id} modifiers:`, modifiers);
    }

    order.items = items;

    res.json({
      success: true,
      order: order
    });

  } catch (error) {
    console.error('PIN search error:', error);
    logger.error('PIN search error:', error);
    res.status(500).json({ error: 'Failed to search order by PIN: ' + error.message });
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
        'branches.name as branch_name',
        'branches.code as branch_code'
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

    // Get order items with full details
    const items = await db('order_items')
      .select(
        'order_items.*',
        'menu_items.name as menu_item_name',
        'menu_items.sku',
        'menu_items.image as menu_item_image'
        // Removed description if it doesn't exist
      )
      .leftJoin('menu_items', 'order_items.menu_item_id', 'menu_items.id')
      .where({ 'order_items.order_id': order.id });

    // Get modifiers for each item - FIXED: removed description column
    for (const item of items) {
      const modifiers = await db('order_item_modifiers')
        .select(
          'modifiers.name',
          // 'modifiers.description', // Remove this if column doesn't exist
          'order_item_modifiers.extra_price'
        )
        .leftJoin('modifiers', 'order_item_modifiers.modifier_id', 'modifiers.id')
        .where({ 'order_item_modifiers.order_item_id': item.id });
      item.modifiers = modifiers;
    }

    order.items = items;

    res.json({ success: true, order });
  } catch (error) {
    logger.error('Order code lookup error:', error);
    res.status(500).json({ error: 'Failed to lookup order: ' + error.message });
  }
});

// Confirm payment (cashier endpoint)
router.patch('/:id/payment', authenticateToken, requireActiveBranch, authorize('admin', 'manager', 'cashier'), async (req, res) => {
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
    const nextStatus = paymentStatus === 'PAID' ? 'PREPARING' : currentOrder.status;
    await db('orders')
      .where({ id })
      .update({
        payment_status: paymentStatus,
        payment_method: paymentMethod || currentOrder.payment_method,
        status: nextStatus,
        updated_at: db.raw('CURRENT_TIMESTAMP')
      });

    // This can be the first transition past PENDING for some flows (payment
    // confirmed before /confirm was ever called) - consumeInventoryForOrder
    // is idempotent, so this is a no-op if inventory was already deducted.
    if (isConfirmedOrLater(nextStatus)) {
      await consumeInventoryForOrder(id);
    }
    if (paymentStatus === 'PAID') {
      await earnPointsForOrder(id);
    }
    if (nextStatus !== currentOrder.status) {
      await recordOrderEvent(id, currentOrder.status, nextStatus, req.user.id, { via: 'payment' });
    }

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
router.patch('/:id/status', authenticateToken, requireActiveBranch, authorize('admin', 'manager', 'cashier', 'kitchen'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = Object.keys(TRANSITIONS);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const currentOrder = await db('orders').where({ id, branch_id: req.user.branch_id }).first();
    if (!currentOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!canTransition(currentOrder.status, status)) {
      return res.status(409).json({
        error: `Cannot move order from ${currentOrder.status} to ${status}`
      });
    }

    await db('orders')
      .where({ id })
      .update({
        status,
        updated_at: db.raw('CURRENT_TIMESTAMP')
      });

    if (status === 'CANCELLED') {
      await restoreInventoryForOrder(id, 'cancelled');
      await reverseLoyaltyForOrder(id);
    } else if (isConfirmedOrLater(status)) {
      await consumeInventoryForOrder(id);
    }

    await recordOrderEvent(id, currentOrder.status, status, req.user.id);

    const order = await db('orders')
      .select('orders.*', 'tables.table_number')
      .leftJoin('tables', 'orders.table_id', 'tables.id')
      .where({ 'orders.id': id })
      .first();

    // Emit real-time event
    const io = req.app.get('io');
    io.to(`branch:${order.branch_id}:kitchen`).emit('order.updated', order);
    io.to(`branch:${order.branch_id}:cashier`).emit('order.updated', order);
    io.to(`order:${order.id}`).emit('order.updated', order);

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
router.post('/:id/confirm', authenticateToken, requireActiveBranch, authorize('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const { id } = req.params;

    const order = await db('orders').where({ id, branch_id: req.user.branch_id }).first();
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
    await recordOrderEvent(id, order.status, 'CONFIRMED', req.user.id);

    // Emit real-time event
    const io = req.app.get('io');
    const updatedOrder = await db('orders')
      .select('orders.*', 'tables.table_number')
      .leftJoin('tables', 'orders.table_id', 'tables.id')
      .where({ 'orders.id': id })
      .first();

    io.to(`branch:${order.branch_id}:kitchen`).emit('order.confirmed', updatedOrder);
    io.to(`order:${order.id}`).emit('order.updated', updatedOrder);

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

    const order = await db('orders').where({ id, branch_id: req.user.branch_id }).first();
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

    await restoreInventoryForOrder(id, 'cancelled');
    await reverseLoyaltyForOrder(id);
    await recordOrderEvent(id, order.status, 'CANCELLED', req.user.id, { reason });

    // Emit real-time event
    const io = req.app.get('io');
    const updatedOrder = await db('orders')
      .select('orders.*', 'tables.table_number')
      .leftJoin('tables', 'orders.table_id', 'tables.id')
      .where({ 'orders.id': id })
      .first();

    io.to(`branch:${order.branch_id}:kitchen`).emit('order.cancelled', updatedOrder);
    io.to(`branch:${order.branch_id}:cashier`).emit('order.cancelled', updatedOrder);
    io.to(`order:${order.id}`).emit('order.updated', updatedOrder);

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

// Consumes inventory for an order exactly once, no matter which code path
// (creation, /confirm, /status, /payment) triggers it. Guarded by the
// inventory_consumed flag with an atomic conditional update so concurrent
// callers can't double-deduct.
async function consumeInventoryForOrder(orderId) {
  const claimed = await db('orders')
    .where({ id: orderId, inventory_consumed: false })
    .update({ inventory_consumed: true });
  if (!claimed) return; // already consumed (or order missing) - nothing to do

  try {
    const order = await db('orders').where({ id: orderId }).first();
    const orderItems = await db('order_items').where({ order_id: orderId });

    for (const item of orderItems) {
      const recipes = await db('recipes').where({ menu_item_id: item.menu_item_id });
      const menuItem = await db('menu_items').where({ id: item.menu_item_id }).first();

      for (const recipe of recipes) {
        const quantityToConsume = recipe.qty_per_serving * item.quantity;

        await db('stock_items')
          .where({ id: recipe.stock_item_id })
          .decrement('quantity', quantityToConsume);

        await db('stock_movements').insert({
          stock_item_id: recipe.stock_item_id,
          change: -quantityToConsume,
          reason: `Order ${order.order_code} - ${item.quantity}x ${menuItem?.name || 'item'}`,
          order_id: orderId,
          type: 'order'
        });

        const stockItem = await db('stock_items').where({ id: recipe.stock_item_id }).first();
        if (stockItem && stockItem.quantity <= stockItem.min_threshold) {
          const existingAlert = await db('low_stock_alerts')
            .where({ stock_item_id: stockItem.id, is_resolved: false })
            .first();

          if (!existingAlert) {
            await db('low_stock_alerts').insert({
              stock_item_id: stockItem.id,
              branch_id: stockItem.branch_id,
              current_quantity: stockItem.quantity,
              min_threshold: stockItem.min_threshold
            });
            logger.warn(`⚠️ Low stock alert: ${stockItem.name} (${stockItem.quantity} ${stockItem.unit} remaining, min: ${stockItem.min_threshold})`);
          }
        }
        await syncMenuItemAvailability(recipe.stock_item_id);
      }
    }
  } catch (error) {
    // Roll the claim back so a retry (or manual fix) can still consume inventory.
    await db('orders').where({ id: orderId }).update({ inventory_consumed: false });
    logger.error('Inventory consumption error:', error);
    throw error;
  }
}

// Reverses a prior consumeInventoryForOrder call, e.g. on cancellation.
// No-ops if inventory was never consumed for this order.
async function restoreInventoryForOrder(orderId, reasonSuffix = 'cancelled') {
  const claimed = await db('orders')
    .where({ id: orderId, inventory_consumed: true })
    .update({ inventory_consumed: false });
  if (!claimed) return;

  const order = await db('orders').where({ id: orderId }).first();
  const orderItems = await db('order_items').where({ order_id: orderId });

  for (const item of orderItems) {
    const recipes = await db('recipes').where({ menu_item_id: item.menu_item_id });
    const menuItem = await db('menu_items').where({ id: item.menu_item_id }).first();

    for (const recipe of recipes) {
      const quantityToRestore = recipe.qty_per_serving * item.quantity;

      await db('stock_items')
        .where({ id: recipe.stock_item_id })
        .increment('quantity', quantityToRestore);

      await db('stock_movements').insert({
        stock_item_id: recipe.stock_item_id,
        change: quantityToRestore,
        reason: `Order ${order.order_code} - ${item.quantity}x ${menuItem?.name || 'item'} (${reasonSuffix})`,
        order_id: orderId,
        type: 'order_reversal'
      });
      await syncMenuItemAvailability(recipe.stock_item_id);
    }
  }
}

async function recordOrderEvent(orderId, fromStatus, toStatus, userId, meta) {
  await db('order_events').insert({
    order_id: orderId,
    from_status: fromStatus,
    to_status: toStatus,
    user_id: userId || null,
    meta: meta ? JSON.stringify(meta) : null
  });
}

module.exports = router;
