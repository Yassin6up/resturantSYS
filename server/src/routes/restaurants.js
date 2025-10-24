const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { db } = require('../database/init');
const { authenticateToken, authorize } = require('../middleware/auth');
const { logger } = require('../middleware/errorHandler');

// Get all restaurants for an owner
router.get('/', authenticateToken, authorize('owner'), async (req, res) => {
  try {
    const restaurants = await db('branches')
      .select(
        'branches.*',
        db.raw('COUNT(DISTINCT users.id) as employee_count'),
        db.raw('COUNT(DISTINCT tables.id) as table_count'),
        db.raw('COUNT(DISTINCT menu_items.id) as menu_item_count')
      )
      .leftJoin('users', 'branches.id', 'users.branch_id')
      .leftJoin('tables', 'branches.id', 'tables.branch_id')
      .leftJoin('menu_items', 'branches.id', 'menu_items.branch_id')
      .where('branches.owner_id', req.user.id)
      .groupBy('branches.id')
      .orderBy('branches.created_at', 'desc');

    // Parse settings JSON
    const restaurantsWithSettings = restaurants.map(r => ({
      ...r,
      settings: r.settings ? JSON.parse(r.settings) : {}
    }));

    res.json(restaurantsWithSettings);
  } catch (error) {
    logger.error('Error fetching restaurants:', error);
    res.status(500).json({ error: 'Failed to fetch restaurants' });
  }
});

// Get activity logs (owner only) - MUST be before /:id route
router.get('/logs', authenticateToken, authorize('owner'), async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    // Get all branches owned by this user
    const branches = await db('branches')
      .select('id')
      .where('owner_id', req.user.id);
    
    const branchIds = branches.map(b => b.id);

    // Get audit logs for all owned branches
    const logs = await db('audit_logs')
      .select(
        'audit_logs.*',
        'users.username',
        'users.full_name',
        'branches.name as branch_name'
      )
      .leftJoin('users', 'audit_logs.user_id', 'users.id')
      .leftJoin('branches', 'users.branch_id', 'branches.id')
      .whereIn('users.branch_id', branchIds)
      .orWhere('audit_logs.user_id', req.user.id)
      .orderBy('audit_logs.created_at', 'desc')
      .limit(parseInt(limit));

    res.json({ logs });
  } catch (error) {
    logger.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Get single restaurant details (owner/admin/manager only)
router.get('/:id', authenticateToken, authorize('owner', 'admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const restaurant = await db('branches')
      .select('branches.*')
      .where('branches.id', id)
      .first();

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Check authorization
    if (req.user.role === 'owner' && restaurant.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Admin/manager can only view their own restaurant
    if (['admin', 'manager'].includes(req.user.role) && restaurant.id !== req.user.branch_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get detailed stats
    const stats = await db('branches')
      .select(
        db.raw('COUNT(DISTINCT users.id) as employee_count'),
        db.raw('COUNT(DISTINCT tables.id) as table_count'),
        db.raw('COUNT(DISTINCT menu_items.id) as menu_item_count'),
        db.raw('COUNT(DISTINCT orders.id) as total_orders'),
        db.raw('SUM(CASE WHEN orders.created_at >= DATE("now", "-30 days") THEN orders.total ELSE 0 END) as monthly_revenue')
      )
      .leftJoin('users', 'branches.id', 'users.branch_id')
      .leftJoin('tables', 'branches.id', 'tables.branch_id')
      .leftJoin('menu_items', 'branches.id', 'menu_items.branch_id')
      .leftJoin('orders', 'branches.id', 'orders.branch_id')
      .where('branches.id', id)
      .first();

    res.json({
      restaurant: {
        ...restaurant,
        settings: restaurant.settings ? JSON.parse(restaurant.settings) : {},
        stats
      }
    });
  } catch (error) {
    logger.error('Error fetching restaurant:', error);
    res.status(500).json({ error: 'Failed to fetch restaurant' });
  }
});

// Create new restaurant (owner only)
router.post('/', authenticateToken, authorize('owner'), async (req, res) => {
  try {
    const { name, code, address, phone, email, website, description, logo_url, settings, isActive, is_active } = req.body;

    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    // Check if code already exists
    const existing = await db('branches').where({ code }).first();
    if (existing) {
      return res.status(400).json({ error: 'Restaurant code already exists' });
    }

    // Create restaurant
    const [id] = await db('branches').insert({
      name,
      code: code.toUpperCase(),
      address,
      phone,
      email,
      website,
      description,
      logo_url,
      owner_id: req.user.id,
      settings: settings ? JSON.stringify(settings) : JSON.stringify({
        currency: 'MAD',
        tax_rate: 10,
        service_charge: 5,
        timezone: 'Africa/Casablanca',
        language: 'en'
      }),
      is_active: isActive !== undefined ? isActive : (is_active !== undefined ? is_active : true)
    });

    // Create default categories for new restaurant
    await db('categories').insert([
      { branch_id: id, name: 'Appetizers', position: 1 },
      { branch_id: id, name: 'Main Courses', position: 2 },
      { branch_id: id, name: 'Desserts', position: 3 },
      { branch_id: id, name: 'Beverages', position: 4 }
    ]);

    // Log the action
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'CREATE_RESTAURANT',
      meta: JSON.stringify({ restaurant_id: id, name, code })
    });

    logger.info(`Owner ${req.user.username} created restaurant: ${name} (${code})`);

    const restaurant = await db('branches').where({ id }).first();
    res.status(201).json({
      ...restaurant,
      settings: JSON.parse(restaurant.settings)
    });
  } catch (error) {
    logger.error('Error creating restaurant:', error);
    res.status(500).json({ error: 'Failed to create restaurant' });
  }
});

// Update restaurant (owner/admin only - manager cannot modify)
router.put('/:id', authenticateToken, authorize('owner', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, address, phone, email, website, description, logo_url, settings, is_active, isActive } = req.body;

    const restaurant = await db('branches').where({ id }).first();
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Check authorization
    if (req.user.role === 'owner' && restaurant.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Admin can only update their own restaurant and limited fields
    if (req.user.role === 'admin' && restaurant.id !== req.user.branch_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = {};
    if (name) updates.name = name;
    if (address !== undefined) updates.address = address;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (website !== undefined) updates.website = website;
    if (description !== undefined) updates.description = description;
    if (logo_url !== undefined) updates.logo_url = logo_url;
    
    // Only owner can change code and active status
    if (req.user.role === 'owner') {
      if (code) updates.code = code.toUpperCase();
      // Handle both isActive and is_active
      if (isActive !== undefined) updates.is_active = isActive;
      else if (is_active !== undefined) updates.is_active = is_active;
    }
    
    if (settings) {
      updates.settings = JSON.stringify(settings);
    }

    await db('branches').where({ id }).update(updates);

    // Log the action
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'UPDATE_RESTAURANT',
      meta: JSON.stringify({ restaurant_id: id, updates })
    });

    logger.info(`User ${req.user.username} updated restaurant ${id}`);

    const updated = await db('branches').where({ id }).first();
    res.json({
      ...updated,
      settings: updated.settings ? JSON.parse(updated.settings) : {}
    });
  } catch (error) {
    logger.error('Error updating restaurant:', error);
    res.status(500).json({ error: 'Failed to update restaurant' });
  }
});

// Deactivate restaurant (owner only)
router.delete('/:id', authenticateToken, authorize('owner'), async (req, res) => {
  try {
    const { id } = req.params;

    const restaurant = await db('branches').where({ id }).first();
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (restaurant.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Soft delete - just deactivate
    await db('branches').where({ id }).update({ is_active: false });

    // Log the action
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'DEACTIVATE_RESTAURANT',
      meta: JSON.stringify({ restaurant_id: id, name: restaurant.name })
    });

    logger.info(`Owner ${req.user.username} deactivated restaurant ${id}`);

    res.json({ message: 'Restaurant deactivated successfully' });
  } catch (error) {
    logger.error('Error deactivating restaurant:', error);
    res.status(500).json({ error: 'Failed to deactivate restaurant' });
  }
});

// Activate restaurant (owner only)
router.post('/:id/activate', authenticateToken, authorize('owner'), async (req, res) => {
  try {
    const { id } = req.params;

    const restaurant = await db('branches').where({ id }).first();
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (restaurant.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db('branches').where({ id }).update({ is_active: true });

    // Log the action
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'ACTIVATE_RESTAURANT',
      meta: JSON.stringify({ restaurant_id: id, name: restaurant.name })
    });

    logger.info(`Owner ${req.user.username} activated restaurant ${id}`);

    res.json({ message: 'Restaurant activated successfully' });
  } catch (error) {
    logger.error('Error activating restaurant:', error);
    res.status(500).json({ error: 'Failed to activate restaurant' });
  }
});

// Get restaurant dashboard stats (for owner/admin/manager dashboard)
router.get('/:id/dashboard', authenticateToken, authorize('owner', 'admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;

    const restaurant = await db('branches').where({ id }).first();
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Check authorization
    if (req.user.role === 'owner' && restaurant.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Admin/manager can only view their own restaurant
    if (['admin', 'manager'].includes(req.user.role) && restaurant.id !== req.user.branch_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get comprehensive stats
    const stats = {
      // Today's stats
      todayOrders: await db('orders')
        .where('branch_id', id)
        .whereRaw('DATE(created_at) = DATE("now")')
        .count('id as count')
        .first()
        .then(r => r.count || 0),
      
      todayRevenue: await db('orders')
        .where('branch_id', id)
        .where('payment_status', 'PAID')
        .whereRaw('DATE(created_at) = DATE("now")')
        .sum('total as total')
        .first()
        .then(r => parseFloat(r.total || 0)),
      
      // Monthly stats
      monthlyOrders: await db('orders')
        .where('branch_id', id)
        .whereRaw('created_at >= DATE("now", "-30 days")')
        .count('id as count')
        .first()
        .then(r => r.count || 0),
      
      monthlyRevenue: await db('orders')
        .where('branch_id', id)
        .where('payment_status', 'PAID')
        .whereRaw('created_at >= DATE("now", "-30 days")')
        .sum('total as total')
        .first()
        .then(r => parseFloat(r.total || 0)),
      
      // Employee counts
      activeEmployees: await db('users')
        .where('branch_id', id)
        .where('is_active', true)
        .count('id as count')
        .first()
        .then(r => r.count || 0),
      
      // Current pending orders
      pendingOrders: await db('orders')
        .where('branch_id', id)
        .whereIn('status', ['PENDING', 'PREPARING', 'READY'])
        .count('id as count')
        .first()
        .then(r => r.count || 0),
      
      // Tables and menu
      totalTables: await db('tables')
        .where('branch_id', id)
        .count('id as count')
        .first()
        .then(r => r.count || 0),
      
      menuItems: await db('menu_items')
        .where('branch_id', id)
        .where('is_available', true)
        .count('id as count')
        .first()
        .then(r => r.count || 0)
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching restaurant dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get detailed analytics for a restaurant
router.get('/:id/analytics', authenticateToken, authorize('owner', 'admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const restaurant = await db('branches').where('id', id).first();
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Check authorization
    if (req.user.role === 'owner' && restaurant.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (['admin', 'manager'].includes(req.user.role) && restaurant.id !== req.user.branch_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get comprehensive analytics
    const analytics = {
      // Total revenue
      totalRevenue: await db('orders')
        .where('branch_id', id)
        .whereIn('status', ['CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED'])
        .sum('total as total')
        .first()
        .then(r => r.total || 0),
      
      // Total orders
      totalOrders: await db('orders')
        .where('branch_id', id)
        .count('id as count')
        .first()
        .then(r => r.count || 0),
      
      // Total menu items
      totalMenuItems: await db('menu_items')
        .where('branch_id', id)
        .count('id as count')
        .first()
        .then(r => r.count || 0),
      
      // Total employees
      totalEmployees: await db('users')
        .where('branch_id', id)
        .count('id as count')
        .first()
        .then(r => r.count || 0),
      
      // Recent orders (last 10)
      recentOrders: await db('orders')
        .select('orders.*')
        .where('branch_id', id)
        .orderBy('created_at', 'desc')
        .limit(10),
      
      // Top selling products
      topProducts: await db('order_items')
        .select(
          'menu_items.id',
          'menu_items.name',
          'menu_items.price',
          'categories.name as category_name',
          db.raw('COUNT(order_items.id) as total_sold'),
          db.raw('SUM(order_items.quantity) as quantity_sold')
        )
        .leftJoin('menu_items', 'order_items.menu_item_id', 'menu_items.id')
        .leftJoin('categories', 'menu_items.category_id', 'categories.id')
        .leftJoin('orders', 'order_items.order_id', 'orders.id')
        .where('menu_items.branch_id', id)
        .groupBy('menu_items.id', 'menu_items.name', 'menu_items.price', 'categories.name')
        .orderBy('quantity_sold', 'desc')
        .limit(10),
      
      // Employees
      employees: await db('users')
        .select('id', 'full_name', 'role', 'email', 'is_active', 'hire_date')
        .where('branch_id', id)
        .orderBy('full_name'),
      
      // Inventory status
      inventory: await db('stock_items')
        .select('id', 'name', 'sku', 'current_stock', 'min_stock', 'unit')
        .where('branch_id', id)
        .orderBy('name')
        .limit(20)
    };

    res.json(analytics);
  } catch (error) {
    logger.error('Error fetching restaurant analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
