const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

const validateLogin = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors
];

const validateOrder = [
  body('branchId').isInt().withMessage('Branch ID must be a valid integer'),
  body('customerName').optional().isString().withMessage('Customer name must be a string'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.menuItemId').isInt().withMessage('Menu item ID must be a valid integer'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.note').optional().isString(),
  body('items.*.modifiers').optional().isArray(),
  handleValidationErrors
];

const validateMenuItem = [
  body('name').notEmpty().withMessage('Menu item name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('categoryId').isInt().withMessage('Category ID must be a valid integer'),
  body('branchId').isInt().withMessage('Branch ID must be a valid integer'),
  handleValidationErrors
];

const validateTable = [
  body('tableNumber').notEmpty().withMessage('Table number is required'),
  body('branchId').isInt().withMessage('Branch ID must be a valid integer'),
  handleValidationErrors
];

const validatePayment = [
  body('orderId').isInt().withMessage('Order ID must be a valid integer'),
  body('paymentType').isIn(['CASH', 'CARD', 'ONLINE']).withMessage('Invalid payment type'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  handleValidationErrors
];

const validateId = [
  param('id').isInt().withMessage('ID must be a valid integer'),
  handleValidationErrors
];

module.exports = {
  validateLogin,
  validateOrder,
  validateMenuItem,
  validateTable,
  validatePayment,
  validateId,
  handleValidationErrors
};