const express = require('express');
const menuController = require('../controllers/menuController');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

const router = express.Router();

// Public routes (for customer menu viewing)
router.get('/', optionalAuth, menuController.getMenu);
router.get('/item/:id', optionalAuth, menuController.getMenuItem);

// Admin routes for menu management
router.post('/item', 
  authenticateToken, 
  requireRole(['admin', 'manager']), 
  validateRequest(schemas.createMenuItem), 
  menuController.createMenuItem
);

router.put('/item/:id', 
  authenticateToken, 
  requireRole(['admin', 'manager']), 
  menuController.updateMenuItem
);

router.delete('/item/:id', 
  authenticateToken, 
  requireRole(['admin', 'manager']), 
  menuController.deleteMenuItem
);

// Category routes
router.get('/categories', optionalAuth, menuController.getCategories);
router.post('/categories', 
  authenticateToken, 
  requireRole(['admin', 'manager']), 
  menuController.createCategory
);

router.put('/categories/:id', 
  authenticateToken, 
  requireRole(['admin', 'manager']), 
  menuController.updateCategory
);

router.delete('/categories/:id', 
  authenticateToken, 
  requireRole(['admin', 'manager']), 
  menuController.deleteCategory
);

module.exports = router;