const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database/init');
const { authenticateToken, authenticatePin } = require('../middleware/auth');
const { validateLogin } = require('../middleware/validation');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { logger } = require('../middleware/errorHandler');

const router = express.Router();

// Login with username/password
router.post('/login', authRateLimiter, validateLogin, async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await db('users').where({ username }).first();
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    // Log successful login
    await db('audit_logs').insert({
      user_id: user.id,
      action: 'LOGIN',
      meta: JSON.stringify({ ip: req.ip, userAgent: req.get('User-Agent') })
    });

    logger.info(`User ${username} logged in successfully`);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Quick PIN login for cashiers
router.post('/pin-login', authRateLimiter, authenticatePin, async (req, res) => {
  try {
    const user = req.user;

    const accessToken = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' } // Shorter expiry for PIN login
    );

    // Log PIN login
    await db('audit_logs').insert({
      user_id: user.id,
      action: 'PIN_LOGIN',
      meta: JSON.stringify({ ip: req.ip, userAgent: req.get('User-Agent') })
    });

    logger.info(`User ${user.username} logged in with PIN`);

    res.json({
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('PIN login error:', error);
    res.status(500).json({ error: 'PIN login failed' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await db('users').where({ id: decoded.userId }).first();

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const accessToken = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    res.json({ accessToken });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await db('users')
      .select('id', 'username', 'full_name', 'role', 'created_at')
      .where({ id: req.user.id })
      .first();

    res.json({ user });
  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Logout (client-side token invalidation)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Log logout
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'LOGOUT',
      meta: JSON.stringify({ ip: req.ip, userAgent: req.get('User-Agent') })
    });

    logger.info(`User ${req.user.username} logged out`);

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await db('users').where({ id: req.user.id }).first();
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await db('users')
      .where({ id: req.user.id })
      .update({ 
        password_hash: hashedNewPassword,
        updated_at: db.raw('CURRENT_TIMESTAMP')
      });

    // Log password change
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'PASSWORD_CHANGE',
      meta: JSON.stringify({ ip: req.ip })
    });

    logger.info(`User ${req.user.username} changed password`);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;