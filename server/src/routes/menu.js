const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/connection');
const logger = require('../utils/logger');

const router = express.Router();

// Get menu for a specific table/branch (public endpoint)
router.get('/', async (req, res) => {
  try {
    const { table, branch } = req.query;

    if (!table || !branch) {
      return res.status(400).json({ error: 'Table and branch parameters required' });
    }

    // Get branch info
    const branchInfo = await db('branches').where({ code: branch }).first();
    if (!branchInfo) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    // Get table info
    const tableInfo = await db('tables')
      .where({ branch_id: branchInfo.id, table_number: table })
      .first();
    
    if (!tableInfo) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Get categories with menu items
    const categories = await db('categories')
      .where({ branch_id: branchInfo.id })
      .orderBy('position', 'asc');

    const menuData = await Promise.all(
      categories.map(async (category) => {
        const items = await db('menu_items')
          .where({ 
            branch_id: branchInfo.id, 
            category_id: category.id,
            is_available: true 
          })
          .orderBy('name', 'asc');

        const itemsWithModifiers = await Promise.all(
          items.map(async (item) => {
            const modifiers = await db('modifiers')
              .where({ menu_item_id: item.id });
            
            return {
              ...item,
              modifiers
            };
          })
        );

        return {
          ...category,
          items: itemsWithModifiers
        };
      })
    );

    res.json({
      branch: branchInfo,
      table: tableInfo,
      menu: menuData
    });
  } catch (error) {
    logger.error('Get menu error:', error);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

// Get all categories (admin)
router.get('/categories', async (req, res) => {
  try {
    const { branchId } = req.query;
    
    let query = db('categories');
    if (branchId) {
      query = query.where({ branch_id: branchId });
    }
    
    const categories = await query.orderBy('position', 'asc');
    res.json(categories);
  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create category (admin)
router.post('/categories', [
  body('name').notEmpty().trim(),
  body('branch_id').isInt(),
  body('position').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, branch_id, position = 0 } = req.body;

    const [categoryId] = await db('categories').insert({
      name,
      branch_id,
      position
    });

    const category = await db('categories').where({ id: categoryId }).first();
    res.status(201).json(category);
  } catch (error) {
    logger.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category (admin)
router.put('/categories/:id', [
  body('name').optional().notEmpty().trim(),
  body('position').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    await db('categories').where({ id }).update(updates);
    const category = await db('categories').where({ id }).first();

    res.json(category);
  } catch (error) {
    logger.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category (admin)
router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has menu items
    const itemsCount = await db('menu_items').where({ category_id: id }).count('* as count').first();
    
    if (parseInt(itemsCount.count) > 0) {
      return res.status(400).json({ error: 'Cannot delete category with menu items' });
    }

    await db('categories').where({ id }).del();
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    logger.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Get menu items (admin)
router.get('/items', async (req, res) => {
  try {
    const { branchId, categoryId, available } = req.query;
    
    let query = db('menu_items')
      .join('categories', 'menu_items.category_id', 'categories.id')
      .select('menu_items.*', 'categories.name as category_name');

    if (branchId) {
      query = query.where('menu_items.branch_id', branchId);
    }
    
    if (categoryId) {
      query = query.where('menu_items.category_id', categoryId);
    }
    
    if (available !== undefined) {
      query = query.where('menu_items.is_available', available === 'true');
    }

    const items = await query.orderBy('menu_items.name', 'asc');
    
    // Get modifiers for each item
    const itemsWithModifiers = await Promise.all(
      items.map(async (item) => {
        const modifiers = await db('modifiers').where({ menu_item_id: item.id });
        return {
          ...item,
          modifiers
        };
      })
    );

    res.json(itemsWithModifiers);
  } catch (error) {
    logger.error('Get menu items error:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// Create menu item (admin)
router.post('/items', [
  body('name').notEmpty().trim(),
  body('price').isFloat({ min: 0 }),
  body('branch_id').isInt(),
  body('category_id').isInt(),
  body('sku').optional().trim(),
  body('description').optional().trim(),
  body('is_available').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const menuItemData = req.body;
    const [itemId] = await db('menu_items').insert(menuItemData);
    
    const item = await db('menu_items')
      .join('categories', 'menu_items.category_id', 'categories.id')
      .select('menu_items.*', 'categories.name as category_name')
      .where('menu_items.id', itemId)
      .first();

    res.status(201).json(item);
  } catch (error) {
    logger.error('Create menu item error:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// Update menu item (admin)
router.put('/items/:id', [
  body('name').optional().notEmpty().trim(),
  body('price').optional().isFloat({ min: 0 }),
  body('sku').optional().trim(),
  body('description').optional().trim(),
  body('is_available').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    await db('menu_items').where({ id }).update(updates);
    
    const item = await db('menu_items')
      .join('categories', 'menu_items.category_id', 'categories.id')
      .select('menu_items.*', 'categories.name as category_name')
      .where('menu_items.id', id)
      .first();

    res.json(item);
  } catch (error) {
    logger.error('Update menu item error:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// Delete menu item (admin)
router.delete('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if item has been ordered
    const ordersCount = await db('order_items').where({ menu_item_id: id }).count('* as count').first();
    
    if (parseInt(ordersCount.count) > 0) {
      return res.status(400).json({ error: 'Cannot delete menu item that has been ordered' });
    }

    await db('menu_items').where({ id }).del();
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    logger.error('Delete menu item error:', error);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

module.exports = router;