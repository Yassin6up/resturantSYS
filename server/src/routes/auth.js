const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database/init');
const { authenticateToken, authenticatePin } = require('../middleware/auth');
const { validateLogin } = require('../middleware/validation');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { logger } = require('../middleware/errorHandler');
const { generateUniqueSlug } = require('../utils/slugify');
const { seedDefaultHours } = require('./availability');

const router = express.Router();

const VALID_BUSINESS_TYPES = ['restaurant', 'ecommerce', 'appointments', 'hotel', 'office'];
const BOOKING_TYPES = ['appointments', 'hotel', 'office'];

// Self-service SaaS signup: creates an owner account plus their first store
// in one step (the "get started" onboarding wizard). Distinct from the
// staff-only /admin/login flow - this is how a new customer joins the
// platform without a platform operator creating their account for them.
router.post('/register', authRateLimiter, async (req, res) => {
  const trx = await db.transaction();
  try {
    const { fullName, email, username, password, storeName, businessType } = req.body;

    if (!fullName || !username || !password || !storeName) {
      await trx.rollback();
      return res.status(400).json({ error: 'Full name, username, password, and store name are required' });
    }
    if (password.length < 6) {
      await trx.rollback();
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await trx('users').where({ username }).first();
    if (existingUser) {
      await trx.rollback();
      return res.status(400).json({ error: 'That username is already taken' });
    }

    const type = VALID_BUSINESS_TYPES.includes(businessType) ? businessType : 'restaurant';
    const slug = await generateUniqueSlug(trx, storeName);
    const code = slug.slice(0, 10).toUpperCase();

    const [branchId] = await trx('branches').insert({
      name: storeName,
      code,
      slug,
      email: email || null,
      business_type: type,
      is_active: true,
      settings: JSON.stringify({
        currency: 'MAD',
        tax_rate: 10,
        service_charge: 0,
        timezone: 'Africa/Casablanca',
        language: 'en'
      })
    });

    if (type === 'restaurant') {
      await trx('categories').insert([
        { branch_id: branchId, name: 'Appetizers', position: 1 },
        { branch_id: branchId, name: 'Main Courses', position: 2 },
        { branch_id: branchId, name: 'Desserts', position: 3 },
        { branch_id: branchId, name: 'Beverages', position: 4 }
      ]);
    } else if (type === 'ecommerce') {
      await trx('categories').insert([
        { branch_id: branchId, name: 'Featured', position: 1 },
        { branch_id: branchId, name: 'New Arrivals', position: 2 }
      ]);
    } else if (BOOKING_TYPES.includes(type)) {
      await seedDefaultHours(trx, branchId);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [userId] = await trx('users').insert({
      username,
      password_hash: passwordHash,
      full_name: fullName,
      email: email || null,
      role: 'owner',
      is_active: true
    });

    // The owner account owns the store it just created.
    await trx('branches').where({ id: branchId }).update({ owner_id: userId });

    await trx.commit();

    const user = await db('users').where({ id: userId }).first();

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

    logger.info(`New owner account ${username} registered with store "${storeName}" (${type})`);

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, fullName: user.full_name, role: user.role },
      store: { id: branchId, name: storeName, slug, businessType: type }
    });
  } catch (error) {
    await trx.rollback();
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

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
      .select('id', 'username', 'full_name', 'role', 'created_at', 'branch_id')
      .where({ id: req.user.id })
      .first();

    let branch = null;
    const branchId = req.user.branch_id;
    user.branch_id = branchId;
    if (branchId) {
      branch = await db('branches')
        .select('id', 'name', 'is_active', 'business_type')
        .where({ id: branchId })
        .first();
    }

    res.json({ user, branch });
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
