const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/connection');
const logger = require('../utils/logger');
const { requireRole } = require('../middleware/auth');
const QRCode = require('qrcode');

const router = express.Router();

// Get dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const { branchId } = req.query;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let baseQuery = db('orders');
    if (branchId) {
      baseQuery = baseQuery.where({ branch_id: branchId });
    }

    // Today's stats
    const todayStats = await baseQuery.clone()
      .whereBetween('created_at', [today, tomorrow])
      .select(
        db.raw('COUNT(*) as total_orders'),
        db.raw('SUM(total) as total_revenue'),
        db.raw('AVG(total) as avg_order_value')
      )
      .first();

    // Orders by status
    const ordersByStatus = await baseQuery.clone()
      .select('status')
      .count('* as count')
      .groupBy('status');

    // Top menu items
    const topItems = await db('order_items')
      .join('menu_items', 'order_items.menu_item_id', 'menu_items.id')
      .join('orders', 'order_items.order_id', 'orders.id')
      .select(
        'menu_items.name',
        'menu_items.sku',
        db.raw('SUM(order_items.quantity) as total_sold'),
        db.raw('SUM(order_items.quantity * order_items.unit_price) as total_revenue')
      )
      .whereBetween('orders.created_at', [today, tomorrow]);

    if (branchId) {
      topItems.where('orders.branch_id', branchId);
    }

    const topItemsResult = await topItems
      .groupBy('menu_items.id')
      .orderBy('total_sold', 'desc')
      .limit(10);

    // Low stock alerts
    const lowStockItems = await db('stock_items')
      .whereRaw('quantity <= min_threshold')
      .where(branchId ? { branch_id: branchId } : {})
      .orderBy('name', 'asc');

    res.json({
      todayStats: {
        totalOrders: parseInt(todayStats.total_orders) || 0,
        totalRevenue: parseFloat(todayStats.total_revenue) || 0,
        avgOrderValue: parseFloat(todayStats.avg_order_value) || 0
      },
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      topItems: topItemsResult,
      lowStockItems
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get users
router.get('/users', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const users = await db('users')
      .select('id', 'username', 'full_name', 'role', 'pin', 'is_active', 'created_at')
      .orderBy('created_at', 'desc');

    res.json(users);
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create user
router.post('/users', requireRole(['admin']), [
  body('username').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('full_name').notEmpty().trim(),
  body('role').isIn(['admin', 'manager', 'cashier', 'kitchen', 'waiter']),
  body('pin').optional().isLength({ min: 4, max: 4 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const bcrypt = require('bcryptjs');
    const { username, password, full_name, role, pin } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const [userId] = await db('users').insert({
      username,
      password_hash: hashedPassword,
      full_name,
      role,
      pin: pin || null,
      is_active: true
    });

    const user = await db('users')
      .select('id', 'username', 'full_name', 'role', 'pin', 'is_active', 'created_at')
      .where({ id: userId })
      .first();

    res.status(201).json(user);
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/users/:id', requireRole(['admin', 'manager']), [
  body('full_name').optional().notEmpty().trim(),
  body('role').optional().isIn(['admin', 'manager', 'cashier', 'kitchen', 'waiter']),
  body('pin').optional().isLength({ min: 4, max: 4 }),
  body('is_active').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    // Don't allow non-admin to change roles
    if (req.user.role !== 'admin' && updates.role) {
      delete updates.role;
    }

    await db('users').where({ id }).update(updates);
    
    const user = await db('users')
      .select('id', 'username', 'full_name', 'role', 'pin', 'is_active', 'created_at')
      .where({ id })
      .first();

    res.json(user);
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Get tables
router.get('/tables', async (req, res) => {
  try {
    const { branchId } = req.query;
    
    let query = db('tables')
      .join('branches', 'tables.branch_id', 'branches.id')
      .select('tables.*', 'branches.name as branch_name');

    if (branchId) {
      query = query.where('tables.branch_id', branchId);
    }

    const tables = await query.orderBy('tables.table_number', 'asc');
    res.json(tables);
  } catch (error) {
    logger.error('Get tables error:', error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// Create table
router.post('/tables', [
  body('branch_id').isInt(),
  body('table_number').notEmpty().trim(),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { branch_id, table_number, description } = req.body;

    // Check if table number already exists for this branch
    const existingTable = await db('tables')
      .where({ branch_id, table_number })
      .first();

    if (existingTable) {
      return res.status(400).json({ error: 'Table number already exists for this branch' });
    }

    const branch = await db('branches').where({ id: branch_id }).first();
    const qrCode = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/menu?table=${table_number}&branch=${branch.code}`;

    const [tableId] = await db('tables').insert({
      branch_id,
      table_number,
      qr_code: qrCode,
      description
    });

    const table = await db('tables')
      .join('branches', 'tables.branch_id', 'branches.id')
      .select('tables.*', 'branches.name as branch_name')
      .where('tables.id', tableId)
      .first();

    res.status(201).json(table);
  } catch (error) {
    logger.error('Create table error:', error);
    res.status(500).json({ error: 'Failed to create table' });
  }
});

// Update table
router.put('/tables/:id', [
  body('table_number').optional().notEmpty().trim(),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    // If table number is being updated, check for duplicates
    if (updates.table_number) {
      const table = await db('tables').where({ id }).first();
      const existingTable = await db('tables')
        .where({ branch_id: table.branch_id, table_number: updates.table_number })
        .where('id', '!=', id)
        .first();

      if (existingTable) {
        return res.status(400).json({ error: 'Table number already exists for this branch' });
      }

      // Update QR code
      const branch = await db('branches').where({ id: table.branch_id }).first();
      updates.qr_code = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/menu?table=${updates.table_number}&branch=${branch.code}`;
    }

    await db('tables').where({ id }).update(updates);
    
    const table = await db('tables')
      .join('branches', 'tables.branch_id', 'branches.id')
      .select('tables.*', 'branches.name as branch_name')
      .where('tables.id', id)
      .first();

    res.json(table);
  } catch (error) {
    logger.error('Update table error:', error);
    res.status(500).json({ error: 'Failed to update table' });
  }
});

// Delete table
router.delete('/tables/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if table has orders
    const ordersCount = await db('orders').where({ table_id: id }).count('* as count').first();
    
    if (parseInt(ordersCount.count) > 0) {
      return res.status(400).json({ error: 'Cannot delete table with existing orders' });
    }

    await db('tables').where({ id }).del();
    res.json({ message: 'Table deleted successfully' });
  } catch (error) {
    logger.error('Delete table error:', error);
    res.status(500).json({ error: 'Failed to delete table' });
  }
});

// Generate QR code for table
router.get('/tables/:id/qr', async (req, res) => {
  try {
    const { id } = req.params;

    const table = await db('tables')
      .join('branches', 'tables.branch_id', 'branches.id')
      .select('tables.*', 'branches.code as branch_code')
      .where('tables.id', id)
      .first();

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const qrData = {
      table: table.table_number,
      branch: table.branch_code,
      url: table.qr_code
    };

    const qrCodeBuffer = await QRCode.toBuffer(JSON.stringify(qrData), {
      type: 'png',
      width: 200,
      margin: 2
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="table-${table.table_number}-qr.png"`);
    res.send(qrCodeBuffer);
  } catch (error) {
    logger.error('Generate QR code error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Get settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await db('settings').select('key', 'value');
    
    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    res.json(settingsObj);
  } catch (error) {
    logger.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings
router.put('/settings', [
  body('settings').isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { settings } = req.body;

    const trx = await db.transaction();

    try {
      for (const [key, value] of Object.entries(settings)) {
        await trx('settings')
          .insert({ key, value })
          .onConflict('key')
          .merge({ value });
      }

      await trx.commit();

      res.json({ message: 'Settings updated successfully' });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get audit logs
router.get('/audit-logs', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { userId, action, limit = 50, offset = 0 } = req.query;
    
    let query = db('audit_logs')
      .join('users', 'audit_logs.user_id', 'users.id')
      .select(
        'audit_logs.*',
        'users.username',
        'users.full_name'
      );

    if (userId) {
      query = query.where('audit_logs.user_id', userId);
    }
    
    if (action) {
      query = query.where('audit_logs.action', action);
    }

    const logs = await query
      .orderBy('audit_logs.created_at', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    res.json(logs);
  } catch (error) {
    logger.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get branches
router.get('/branches', async (req, res) => {
  try {
    const branches = await db('branches').orderBy('name', 'asc');
    res.json(branches);
  } catch (error) {
    logger.error('Get branches error:', error);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

// Create branch
router.post('/branches', requireRole(['admin']), [
  body('name').notEmpty().trim(),
  body('code').notEmpty().trim(),
  body('address').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, code, address } = req.body;

    // Check if code already exists
    const existingBranch = await db('branches').where({ code }).first();
    if (existingBranch) {
      return res.status(400).json({ error: 'Branch code already exists' });
    }

    const [branchId] = await db('branches').insert({
      name,
      code,
      address
    });

    const branch = await db('branches').where({ id: branchId }).first();
    res.status(201).json(branch);
  } catch (error) {
    logger.error('Create branch error:', error);
    res.status(500).json({ error: 'Failed to create branch' });
  }
});

module.exports = router;