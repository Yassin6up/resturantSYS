const express = require('express');
const { db } = require('../database/init');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateMenuItem } = require('../middleware/validation');
const { logger } = require('../middleware/errorHandler');

const router = express.Router();

// Get menu for a specific branch (public endpoint)
router.get('/', async (req, res) => {
  try {
    const { branchId, table } = req.query;

    if (!branchId) {
      return res.status(400).json({ error: 'Branch ID is required' });
    }

    // Get categories with menu items
    const categories = await db('categories')
      .select('categories.*')
      .where({ 'categories.branch_id': branchId })
      .orderBy('categories.position');

    // Get menu items for each category
    for (const category of categories) {
      const items = await db('menu_items')
        .select('menu_items.*')
        .where({ 
          'menu_items.branch_id': branchId,
          'menu_items.category_id': category.id,
          'menu_items.is_available': true
        })
        .orderBy('menu_items.name');

      // Get modifiers for each item
      for (const item of items) {
        const modifiers = await db('modifiers')
          .select('modifiers.*')
          .where({ 'modifiers.menu_item_id': item.id });

        item.modifiers = modifiers;
      }

      category.items = items;
    }

    // Log menu access
    if (table) {
      await db('audit_logs').insert({
        user_id: null,
        action: 'MENU_ACCESS',
        meta: JSON.stringify({ branchId, table, ip: req.ip })
      });
    }

    res.json({ categories });
  } catch (error) {
    logger.error('Menu fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// Get all categories (admin)
router.get('/categories', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }

    const categories = await db('categories')
      .select('categories.*')
      .where({ 'categories.branch_id': branchId })
      .orderBy('categories.position');

    res.json({ categories });
  } catch (error) {
    logger.error('Categories fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create category (admin)
router.post('/categories', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { name, position, description, isActive } = req.body;
    
    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const [categoryId] = await db('categories').insert({
      name,
      branch_id: branchId,
      position: position || 0,
      description: description || '',
      is_active: isActive !== false
    });

    const category = await db('categories').where({ id: categoryId }).first();

    // Log category creation
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'CATEGORY_CREATE',
      meta: JSON.stringify({ categoryId, name, branchId })
    });

    res.status(201).json({ success: true, category });
  } catch (error) {
    logger.error('Category creation error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category (admin)
router.put('/categories/:id', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, position, description, isActive } = req.body;
    
    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }
    
    // Verify the category belongs to the user's branch
    const existingCategory = await db('categories').where({ id }).first();
    if (!existingCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (existingCategory.branch_id !== branchId) {
      return res.status(403).json({ error: 'Access denied: Category belongs to different branch' });
    }

    await db('categories')
      .where({ id })
      .update({
        name,
        position,
        description: description || '',
        is_active: isActive !== false,
        updated_at: db.raw('CURRENT_TIMESTAMP')
      });

    const category = await db('categories').where({ id }).first();

    // Log category update
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'CATEGORY_UPDATE',
      meta: JSON.stringify({ categoryId: id, name, position })
    });

    res.json({ success: true, category });
  } catch (error) {
    logger.error('Category update error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category (admin)
router.delete('/categories/:id', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }
    
    // Verify the category belongs to the user's branch
    const existingCategory = await db('categories').where({ id }).first();
    if (!existingCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (existingCategory.branch_id !== branchId) {
      return res.status(403).json({ error: 'Access denied: Category belongs to different branch' });
    }

    // Check if category has menu items
    const itemCount = await db('menu_items').where({ category_id: id }).count('id as count').first();
    
    if (itemCount.count > 0) {
      return res.status(400).json({ error: 'Cannot delete category with existing menu items' });
    }

    await db('categories').where({ id }).del();

    // Log category deletion
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'CATEGORY_DELETE',
      meta: JSON.stringify({ categoryId: id })
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    logger.error('Category deletion error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Get all menu items (admin)
router.get('/items', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }
    
    const { categoryId } = req.query;

    let query = db('menu_items')
      .select('menu_items.*', 'categories.name as category_name')
      .leftJoin('categories', 'menu_items.category_id', 'categories.id')
      .where({ 'menu_items.branch_id': branchId });

    if (categoryId) {
      query = query.where({ 'menu_items.category_id': categoryId });
    }

    const items = await query.orderBy('menu_items.name');

    // Get modifiers for each item
    for (const item of items) {
      const modifiers = await db('modifiers')
        .select('modifiers.*')
        .where({ 'modifiers.menu_item_id': item.id });

      item.modifiers = modifiers;
    }

    res.json({ items });
  } catch (error) {
    logger.error('Menu items fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// Create menu item (admin)
router.post('/items', authenticateToken, authorize('admin', 'manager'), validateMenuItem, async (req, res) => {
  try {
    const { name, description, price, categoryId, sku, modifiers } = req.body;
    
    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }

    const [itemId] = await db('menu_items').insert({
      name,
      description,
      price,
      category_id: categoryId,
      branch_id: branchId,
      sku
    });

    // Add modifiers if provided
    if (modifiers && modifiers.length > 0) {
      const modifierData = modifiers.map(modifier => ({
        menu_item_id: itemId,
        name: modifier.name,
        extra_price: modifier.extra_price || 0
      }));

      await db('modifiers').insert(modifierData);
    }

    const item = await db('menu_items')
      .select('menu_items.*', 'categories.name as category_name')
      .leftJoin('categories', 'menu_items.category_id', 'categories.id')
      .where({ 'menu_items.id': itemId })
      .first();

    // Get modifiers
    const itemModifiers = await db('modifiers')
      .select('modifiers.*')
      .where({ 'modifiers.menu_item_id': itemId });

    item.modifiers = itemModifiers;

    // Log menu item creation
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'MENU_ITEM_CREATE',
      meta: JSON.stringify({ itemId, name, price, categoryId, branchId })
    });

    res.status(201).json({ item });
  } catch (error) {
    logger.error('Menu item creation error:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// Update menu item (admin)
router.put('/items/:id', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, categoryId, sku, isAvailable, modifiers } = req.body;
    
    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }
    
    // Verify the item belongs to the user's branch
    const existingItem = await db('menu_items').where({ id }).first();
    if (!existingItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    if (existingItem.branch_id !== branchId) {
      return res.status(403).json({ error: 'Access denied: Item belongs to different branch' });
    }

    await db('menu_items')
      .where({ id })
      .update({
        name,
        description,
        price,
        category_id: categoryId,
        sku,
        is_available: isAvailable,
        updated_at: db.raw('CURRENT_TIMESTAMP')
      });

    // Update modifiers if provided
    if (modifiers) {
      // Delete existing modifiers
      await db('modifiers').where({ menu_item_id: id }).del();

      // Insert new modifiers
      if (modifiers.length > 0) {
        const modifierData = modifiers.map(modifier => ({
          menu_item_id: id,
          name: modifier.name,
          extra_price: modifier.extra_price || 0
        }));

        await db('modifiers').insert(modifierData);
      }
    }

    const item = await db('menu_items')
      .select('menu_items.*', 'categories.name as category_name')
      .leftJoin('categories', 'menu_items.category_id', 'categories.id')
      .where({ 'menu_items.id': id })
      .first();

    // Get modifiers
    const itemModifiers = await db('modifiers')
      .select('modifiers.*')
      .where({ 'modifiers.menu_item_id': id });

    item.modifiers = itemModifiers;

    // Log menu item update
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'MENU_ITEM_UPDATE',
      meta: JSON.stringify({ itemId: id, name, price, categoryId })
    });

    res.json({ item });
  } catch (error) {
    logger.error('Menu item update error:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// Delete menu item (admin)
router.delete('/items/:id', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if item has orders
    const orderCount = await db('order_items').where({ menu_item_id: id }).count('id as count').first();
    
    if (orderCount.count > 0) {
      return res.status(400).json({ error: 'Cannot delete menu item with existing orders' });
    }

    // Delete modifiers first
    await db('modifiers').where({ menu_item_id: id }).del();

    // Delete menu item
    await db('menu_items').where({ id }).del();

    // Log menu item deletion
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'MENU_ITEM_DELETE',
      meta: JSON.stringify({ itemId: id })
    });

    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    logger.error('Menu item deletion error:', error);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

// Toggle menu item availability (admin/cashier)
router.patch('/items/:id/availability', authenticateToken, authorize('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    await db('menu_items')
      .where({ id })
      .update({
        is_available: isAvailable,
        updated_at: db.raw('CURRENT_TIMESTAMP')
      });

    const item = await db('menu_items').where({ id }).first();

    // Log availability change
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'MENU_ITEM_AVAILABILITY',
      meta: JSON.stringify({ itemId: id, isAvailable })
    });

    res.json({ item });
  } catch (error) {
    logger.error('Menu item availability toggle error:', error);
    res.status(500).json({ error: 'Failed to toggle menu item availability' });
  }
});

module.exports = router;