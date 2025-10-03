const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class OrderService {
  async createOrder(orderData) {
    const trx = await db.transaction();
    
    try {
      // Generate order code
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const orderCount = await trx('orders')
        .whereRaw('DATE(created_at) = CURRENT_DATE')
        .count('id as count')
        .first();
      
      const orderNumber = String(orderCount.count + 1).padStart(4, '0');
      const orderCode = `ORD-${today}-${orderNumber}`;

      // Calculate totals
      let subtotal = 0;
      const orderItems = [];

      for (const item of orderData.items) {
        const menuItem = await trx('menu_items').where({ id: item.menuItemId }).first();
        if (!menuItem) {
          throw new Error(`Menu item ${item.menuItemId} not found`);
        }

        let itemTotal = menuItem.price * item.quantity;
        
        // Add modifier prices
        if (item.modifiers && item.modifiers.length > 0) {
          const modifiers = await trx('modifiers')
            .whereIn('id', item.modifiers.map(m => m.modifierId));
          
          for (const modifier of modifiers) {
            itemTotal += modifier.extra_price * item.quantity;
          }
        }

        subtotal += itemTotal;
        orderItems.push({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: menuItem.price,
          notes: item.notes,
          modifiers: item.modifiers || []
        });
      }

      // Get tax and service charge settings
      const taxSetting = await trx('settings').where({ key: 'tax_rate' }).first();
      const serviceSetting = await trx('settings').where({ key: 'service_charge_rate' }).first();
      
      const taxRate = taxSetting ? parseFloat(taxSetting.value) : 0;
      const serviceRate = serviceSetting ? parseFloat(serviceSetting.value) : 0;
      
      const tax = subtotal * taxRate;
      const serviceCharge = subtotal * serviceRate;
      const total = subtotal + tax + serviceCharge;

      // Create order
      const [orderId] = await trx('orders').insert({
        branch_id: orderData.branchId,
        order_code: orderCode,
        table_id: orderData.tableId,
        customer_name: orderData.customerName,
        customer_phone: orderData.customerPhone,
        subtotal: subtotal,
        tax: tax,
        service_charge: serviceCharge,
        total: total,
        payment_method: orderData.paymentMethod || 'CASH',
        notes: orderData.notes,
        status: 'SUBMITTED'
      });

      // Create order items
      for (const item of orderItems) {
        const [orderItemId] = await trx('order_items').insert({
          order_id: orderId,
          menu_item_id: item.menuItemId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          notes: item.notes
        });

        // Create order item modifiers
        if (item.modifiers.length > 0) {
          const modifierInserts = item.modifiers.map(modifier => ({
            order_item_id: orderItemId,
            modifier_id: modifier.modifierId,
            extra_price: 0 // Will be updated with actual price
          }));

          await trx('order_item_modifiers').insert(modifierInserts);

          // Update modifier prices
          const modifiers = await trx('modifiers')
            .whereIn('id', item.modifiers.map(m => m.modifierId));
          
          for (const modifier of modifiers) {
            await trx('order_item_modifiers')
              .where({ order_item_id: orderItemId, modifier_id: modifier.id })
              .update({ extra_price: modifier.extra_price });
          }
        }
      }

      await trx.commit();

      // Return created order
      return await this.getOrder(orderId);
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async getOrder(id) {
    const order = await db('orders')
      .select('orders.*', 'tables.table_number', 'branches.name as branch_name')
      .leftJoin('tables', 'orders.table_id', 'tables.id')
      .leftJoin('branches', 'orders.branch_id', 'branches.id')
      .where('orders.id', id)
      .first();

    if (!order) {
      throw new Error('Order not found');
    }

    const orderItems = await db('order_items')
      .select('order_items.*', 'menu_items.name as item_name', 'menu_items.description')
      .join('menu_items', 'order_items.menu_item_id', 'menu_items.id')
      .where('order_items.order_id', id);

    // Get modifiers for each order item
    for (const item of orderItems) {
      const modifiers = await db('order_item_modifiers')
        .select('order_item_modifiers.*', 'modifiers.name as modifier_name')
        .join('modifiers', 'order_item_modifiers.modifier_id', 'modifiers.id')
        .where('order_item_modifiers.order_item_id', item.id);
      
      item.modifiers = modifiers;
    }

    return {
      ...order,
      items: orderItems
    };
  }

  async getOrders(filters = {}) {
    let query = db('orders')
      .select('orders.*', 'tables.table_number', 'branches.name as branch_name')
      .leftJoin('tables', 'orders.table_id', 'tables.id')
      .leftJoin('branches', 'orders.branch_id', 'branches.id');

    if (filters.branchId) {
      query = query.where('orders.branch_id', filters.branchId);
    }

    if (filters.status) {
      query = query.where('orders.status', filters.status);
    }

    if (filters.paymentStatus) {
      query = query.where('orders.payment_status', filters.paymentStatus);
    }

    if (filters.tableId) {
      query = query.where('orders.table_id', filters.tableId);
    }

    if (filters.date) {
      query = query.whereRaw('DATE(orders.created_at) = ?', [filters.date]);
    }

    return await query.orderBy('orders.created_at', 'desc');
  }

  async updateOrderStatus(id, status, userId) {
    const order = await db('orders').where({ id }).first();
    if (!order) {
      throw new Error('Order not found');
    }

    // Validate status transition
    const validTransitions = {
      'SUBMITTED': ['PENDING', 'CONFIRMED', 'CANCELLED'],
      'PENDING': ['CONFIRMED', 'CANCELLED'],
      'CONFIRMED': ['PREPARING', 'CANCELLED'],
      'PREPARING': ['READY', 'CANCELLED'],
      'READY': ['SERVED'],
      'SERVED': ['COMPLETED'],
      'AWAITING_PAYMENT': ['PENDING', 'CANCELLED']
    };

    if (!validTransitions[order.status] || !validTransitions[order.status].includes(status)) {
      throw new Error(`Invalid status transition from ${order.status} to ${status}`);
    }

    await db('orders').where({ id }).update({
      status: status,
      updated_at: db.fn.now()
    });

    // If confirming order, consume stock
    if (status === 'CONFIRMED') {
      await this.consumeStock(id);
    }

    // Log the status change
    await db('audit_logs').insert({
      user_id: userId,
      action: 'ORDER_STATUS_UPDATE',
      table_name: 'orders',
      record_id: id,
      meta: JSON.stringify({ from: order.status, to: status })
    });

    return await this.getOrder(id);
  }

  async consumeStock(orderId) {
    const orderItems = await db('order_items')
      .where({ order_id: orderId });

    for (const item of orderItems) {
      const recipes = await db('recipes')
        .where({ menu_item_id: item.menu_item_id });

      for (const recipe of recipes) {
        const consumeQty = recipe.qty_per_serving * item.quantity;
        
        // Update stock quantity
        await db('stock_items')
          .where({ id: recipe.stock_item_id })
          .decrement('quantity', consumeQty);

        // Record stock movement
        await db('stock_movements').insert({
          stock_item_id: recipe.stock_item_id,
          change: -consumeQty,
          reason: 'CONSUMPTION',
          reference: `order_${orderId}`,
          notes: `Consumed for order ${orderId}`
        });
      }
    }
  }

  async cancelOrder(id, userId, reason) {
    const order = await db('orders').where({ id }).first();
    if (!order) {
      throw new Error('Order not found');
    }

    if (!['SUBMITTED', 'PENDING', 'CONFIRMED', 'PREPARING'].includes(order.status)) {
      throw new Error('Cannot cancel order in current status');
    }

    await db('orders').where({ id }).update({
      status: 'CANCELLED',
      notes: order.notes ? `${order.notes}\n\nCANCELLED: ${reason}` : `CANCELLED: ${reason}`,
      updated_at: db.fn.now()
    });

    // If order was confirmed, restore stock
    if (order.status === 'CONFIRMED' || order.status === 'PREPARING') {
      await this.restoreStock(id);
    }

    // Log the cancellation
    await db('audit_logs').insert({
      user_id: userId,
      action: 'ORDER_CANCELLED',
      table_name: 'orders',
      record_id: id,
      meta: JSON.stringify({ reason })
    });

    return await this.getOrder(id);
  }

  async restoreStock(orderId) {
    const orderItems = await db('order_items')
      .where({ order_id: orderId });

    for (const item of orderItems) {
      const recipes = await db('recipes')
        .where({ menu_item_id: item.menu_item_id });

      for (const recipe of recipes) {
        const restoreQty = recipe.qty_per_serving * item.quantity;
        
        // Update stock quantity
        await db('stock_items')
          .where({ id: recipe.stock_item_id })
          .increment('quantity', restoreQty);

        // Record stock movement
        await db('stock_movements').insert({
          stock_item_id: recipe.stock_item_id,
          change: restoreQty,
          reason: 'ADJUSTMENT',
          reference: `order_${orderId}_cancelled`,
          notes: `Restored from cancelled order ${orderId}`
        });
      }
    }
  }
}

module.exports = new OrderService();