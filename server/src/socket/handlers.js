const { db } = require('../database/init');
const { logger } = require('../middleware/errorHandler');

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join branch-specific rooms
    socket.on('join-branch', (branchId) => {
      socket.join(`branch:${branchId}`);
      socket.join(`branch:${branchId}:kitchen`);
      logger.info(`Socket ${socket.id} joined branch ${branchId}`);
    });

    // Join kitchen room
    socket.on('join-kitchen', (branchId) => {
      socket.join(`branch:${branchId}:kitchen`);
      logger.info(`Socket ${socket.id} joined kitchen for branch ${branchId}`);
    });

    // Join cashier room
    socket.on('join-cashier', (branchId) => {
      socket.join(`branch:${branchId}:cashier`);
      logger.info(`Socket ${socket.id} joined cashier for branch ${branchId}`);
    });

    // Handle order status updates
    socket.on('order-status-update', async (data) => {
      try {
        const { orderId, status, userId } = data;
        
        // Update order status in database
        await db('orders')
          .where({ id: orderId })
          .update({ 
            status,
            updated_at: db.raw('CURRENT_TIMESTAMP')
          });

        // Get updated order with details
        const order = await db('orders')
          .select('orders.*', 'tables.table_number', 'branches.name as branch_name')
          .leftJoin('tables', 'orders.table_id', 'tables.id')
          .leftJoin('branches', 'orders.branch_id', 'branches.id')
          .where('orders.id', orderId)
          .first();

        // Log audit trail
        await db('audit_logs').insert({
          user_id: userId,
          action: 'ORDER_STATUS_UPDATE',
          meta: JSON.stringify({ orderId, status, socketId: socket.id })
        });

        // Emit to relevant rooms
        io.to(`branch:${order.branch_id}:kitchen`).emit('order.updated', order);
        io.to(`branch:${order.branch_id}:cashier`).emit('order.updated', order);
        
        logger.info(`Order ${orderId} status updated to ${status}`);
      } catch (error) {
        logger.error('Error updating order status:', error);
        socket.emit('error', { message: 'Failed to update order status' });
      }
    });

    // Handle kitchen acknowledgment
    socket.on('kitchen-ack', async (data) => {
      try {
        const { orderId, userId } = data;
        
        await db('orders')
          .where({ id: orderId })
          .update({ 
            status: 'PREPARING',
            updated_at: db.raw('CURRENT_TIMESTAMP')
          });

        const order = await db('orders')
          .select('orders.*', 'tables.table_number')
          .leftJoin('tables', 'orders.table_id', 'tables.id')
          .where('orders.id', orderId)
          .first();

        // Emit acknowledgment
        io.to(`branch:${order.branch_id}:cashier`).emit('kitchen.ack', {
          orderId,
          status: 'PREPARING',
          timestamp: new Date().toISOString()
        });

        logger.info(`Kitchen acknowledged order ${orderId}`);
      } catch (error) {
        logger.error('Error processing kitchen acknowledgment:', error);
        socket.emit('error', { message: 'Failed to process kitchen acknowledgment' });
      }
    });

    // Handle payment updates
    socket.on('payment-update', async (data) => {
      try {
        const { orderId, paymentStatus, userId } = data;
        
        await db('orders')
          .where({ id: orderId })
          .update({ 
            payment_status: paymentStatus,
            updated_at: db.raw('CURRENT_TIMESTAMP')
          });

        const order = await db('orders')
          .select('orders.*', 'tables.table_number')
          .leftJoin('tables', 'orders.table_id', 'tables.id')
          .where('orders.id', orderId)
          .first();

        // Emit payment update
        io.to(`branch:${order.branch_id}:cashier`).emit('payment.updated', {
          orderId,
          paymentStatus,
          timestamp: new Date().toISOString()
        });

        logger.info(`Payment status updated for order ${orderId}: ${paymentStatus}`);
      } catch (error) {
        logger.error('Error updating payment status:', error);
        socket.emit('error', { message: 'Failed to update payment status' });
      }
    });

    // Handle printer status
    socket.on('printer-status', (data) => {
      const { printerId, status, error } = data;
      logger.info(`Printer ${printerId} status: ${status}`, error ? { error } : {});
      
      // Broadcast printer status to admin users
      io.emit('printer.status', { printerId, status, error, timestamp: new Date().toISOString() });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error(`Socket error from ${socket.id}:`, error);
    });
  });
}

module.exports = { setupSocketHandlers };