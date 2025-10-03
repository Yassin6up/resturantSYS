const orderService = require('../services/orderService');

class OrderController {
  async createOrder(req, res) {
    try {
      const orderData = req.body;
      const order = await orderService.createOrder(orderData);
      
      // Emit real-time event
      const io = req.app.get('io');
      if (io) {
        io.to(`branch:${orderData.branchId}:kitchen`).emit('order.created', order);
        io.to(`branch:${orderData.branchId}:admin`).emit('order.created', order);
      }

      // Generate order QR for cashier scanning
      const orderQr = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/order/${order.id}?token=${order.order_code}`;
      
      res.status(201).json({
        success: true,
        data: {
          orderId: order.id,
          orderCode: order.order_code,
          qr: orderQr,
          status: order.status,
          total: order.total
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async getOrder(req, res) {
    try {
      const { id } = req.params;
      const order = await orderService.getOrder(id);
      
      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }

  async getOrders(req, res) {
    try {
      const filters = {
        branchId: req.query.branchId,
        status: req.query.status,
        paymentStatus: req.query.paymentStatus,
        tableId: req.query.tableId,
        date: req.query.date
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
          delete filters[key];
        }
      });

      const orders = await orderService.getOrders(filters);
      
      res.json({
        success: true,
        data: orders
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.id;

      const order = await orderService.updateOrderStatus(id, status, userId);
      
      // Emit real-time event
      const io = req.app.get('io');
      if (io) {
        io.to(`branch:${order.branch_id}:kitchen`).emit('order.updated', order);
        io.to(`branch:${order.branch_id}:admin`).emit('order.updated', order);
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async cancelOrder(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      const order = await orderService.cancelOrder(id, userId, reason);
      
      // Emit real-time event
      const io = req.app.get('io');
      if (io) {
        io.to(`branch:${order.branch_id}:kitchen`).emit('order.cancelled', order);
        io.to(`branch:${order.branch_id}:admin`).emit('order.cancelled', order);
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async getOrderByCode(req, res) {
    try {
      const { code } = req.params;
      const db = require('../config/database');
      
      const order = await db('orders')
        .select('orders.*', 'tables.table_number', 'branches.name as branch_name')
        .leftJoin('tables', 'orders.table_id', 'tables.id')
        .leftJoin('branches', 'orders.branch_id', 'branches.id')
        .where('orders.order_code', code)
        .first();

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }

      const fullOrder = await orderService.getOrder(order.id);
      
      res.json({
        success: true,
        data: fullOrder
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new OrderController();