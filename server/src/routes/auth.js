const express = require('express');
const authController = require('../controllers/authController');
const { validateRequest, schemas } = require('../middleware/validation');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/login', validateRequest(schemas.login), authController.login);
router.post('/pin-login', validateRequest(schemas.pinLogin), authController.pinLogin);
router.post('/refresh', authController.refreshToken);

// Protected routes
router.get('/me', authenticateToken, authController.me);
router.post('/users', authenticateToken, requireRole(['admin']), authController.createUser);

module.exports = router;