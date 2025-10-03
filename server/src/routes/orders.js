const express = require('express');
const orderController = require('../controllers/orderController');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

const router = express.Router();

// Public routes (for customer ordering)
router.post('/', validateRequest(schemas.createOrder), orderController.createOrder);
router.get('/code/:code', orderController.getOrderByCode);

// Protected routes
router.get('/', authenticateToken, orderController.getOrders);
router.get('/:id', authenticateToken, orderController.getOrder);

router.patch('/:id/status', 
  authenticateToken, 
  requireRole(['admin', 'manager', 'cashier', 'kitchen']),
  validateRequest(schemas.updateOrderStatus),
  orderController.updateOrderStatus
);

router.post('/:id/cancel', 
  authenticateToken, 
  requireRole(['admin', 'manager', 'cashier']),
  orderController.cancelOrder
);

module.exports = router;