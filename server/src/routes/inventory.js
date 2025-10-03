const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/connection');
const logger = require('../utils/logger');

const router = express.Router();

// Get stock items
router.get('/stock', async (req, res) => {
  try {
    const { branchId, lowStock } = req.query;
    
    let query = db('stock_items');
    
    if (branchId) {
      query = query.where({ branch_id: branchId });
    }
    
    if (lowStock === 'true') {
      query = query.whereRaw('quantity <= min_threshold');
    }

    const stockItems = await query.orderBy('name', 'asc');
    res.json(stockItems);
  } catch (error) {
    logger.error('Get stock items error:', error);
    res.status(500).json({ error: 'Failed to fetch stock items' });
  }
});

// Create stock item
router.post('/stock', [
  body('name').notEmpty().trim(),
  body('branch_id').isInt(),
  body('sku').optional().trim(),
  body('quantity').optional().isFloat({ min: 0 }),
  body('unit').optional().trim(),
  body('min_threshold').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const stockItemData = req.body;
    const [itemId] = await db('stock_items').insert(stockItemData);
    
    const item = await db('stock_items').where({ id: itemId }).first();
    res.status(201).json(item);
  } catch (error) {
    logger.error('Create stock item error:', error);
    res.status(500).json({ error: 'Failed to create stock item' });
  }
});

// Update stock item
router.put('/stock/:id', [
  body('name').optional().notEmpty().trim(),
  body('sku').optional().trim(),
  body('quantity').optional().isFloat({ min: 0 }),
  body('unit').optional().trim(),
  body('min_threshold').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    await db('stock_items').where({ id }).update(updates);
    const item = await db('stock_items').where({ id }).first();

    res.json(item);
  } catch (error) {
    logger.error('Update stock item error:', error);
    res.status(500).json({ error: 'Failed to update stock item' });
  }
});

// Delete stock item
router.delete('/stock/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if item is used in recipes
    const recipesCount = await db('recipes').where({ stock_item_id: id }).count('* as count').first();
    
    if (parseInt(recipesCount.count) > 0) {
      return res.status(400).json({ error: 'Cannot delete stock item used in recipes' });
    }

    await db('stock_items').where({ id }).del();
    res.json({ message: 'Stock item deleted successfully' });
  } catch (error) {
    logger.error('Delete stock item error:', error);
    res.status(500).json({ error: 'Failed to delete stock item' });
  }
});

// Record stock movement
router.post('/stock/move', [
  body('stockItemId').isInt(),
  body('change').isFloat(),
  body('reason').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { stockItemId, change, reason } = req.body;

    const stockItem = await db('stock_items').where({ id: stockItemId }).first();
    if (!stockItem) {
      return res.status(404).json({ error: 'Stock item not found' });
    }

    const trx = await db.transaction();

    try {
      // Update stock quantity
      await trx('stock_items')
        .where({ id: stockItemId })
        .increment('quantity', change);

      // Record movement
      await trx('stock_movements').insert({
        stock_item_id: stockItemId,
        change,
        reason
      });

      await trx.commit();

      const updatedItem = await db('stock_items').where({ id: stockItemId }).first();
      res.json({
        message: 'Stock movement recorded successfully',
        item: updatedItem
      });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Stock movement error:', error);
    res.status(500).json({ error: 'Failed to record stock movement' });
  }
});

// Get stock movements
router.get('/stock/:id/movements', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const movements = await db('stock_movements')
      .where({ stock_item_id: id })
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    res.json(movements);
  } catch (error) {
    logger.error('Get stock movements error:', error);
    res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
});

// Get recipes
router.get('/recipes', async (req, res) => {
  try {
    const { menuItemId } = req.query;
    
    let query = db('recipes')
      .join('menu_items', 'recipes.menu_item_id', 'menu_items.id')
      .join('stock_items', 'recipes.stock_item_id', 'stock_items.id')
      .select(
        'recipes.*',
        'menu_items.name as menu_item_name',
        'stock_items.name as stock_item_name',
        'stock_items.sku',
        'stock_items.unit'
      );

    if (menuItemId) {
      query = query.where('recipes.menu_item_id', menuItemId);
    }

    const recipes = await query.orderBy('menu_items.name', 'asc');
    res.json(recipes);
  } catch (error) {
    logger.error('Get recipes error:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Create recipe
router.post('/recipes', [
  body('menuItemId').isInt(),
  body('stockItemId').isInt(),
  body('qtyPerServing').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { menuItemId, stockItemId, qtyPerServing } = req.body;

    // Check if recipe already exists
    const existingRecipe = await db('recipes')
      .where({ menu_item_id: menuItemId, stock_item_id: stockItemId })
      .first();

    if (existingRecipe) {
      return res.status(400).json({ error: 'Recipe already exists for this menu item and stock item' });
    }

    const [recipeId] = await db('recipes').insert({
      menu_item_id: menuItemId,
      stock_item_id: stockItemId,
      qty_per_serving: qtyPerServing
    });

    const recipe = await db('recipes')
      .join('menu_items', 'recipes.menu_item_id', 'menu_items.id')
      .join('stock_items', 'recipes.stock_item_id', 'stock_items.id')
      .select(
        'recipes.*',
        'menu_items.name as menu_item_name',
        'stock_items.name as stock_item_name',
        'stock_items.sku',
        'stock_items.unit'
      )
      .where('recipes.id', recipeId)
      .first();

    res.status(201).json(recipe);
  } catch (error) {
    logger.error('Create recipe error:', error);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

// Update recipe
router.put('/recipes/:id', [
  body('qtyPerServing').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { qtyPerServing } = req.body;

    await db('recipes').where({ id }).update({
      qty_per_serving: qtyPerServing
    });

    const recipe = await db('recipes')
      .join('menu_items', 'recipes.menu_item_id', 'menu_items.id')
      .join('stock_items', 'recipes.stock_item_id', 'stock_items.id')
      .select(
        'recipes.*',
        'menu_items.name as menu_item_name',
        'stock_items.name as stock_item_name',
        'stock_items.sku',
        'stock_items.unit'
      )
      .where('recipes.id', id)
      .first();

    res.json(recipe);
  } catch (error) {
    logger.error('Update recipe error:', error);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

// Delete recipe
router.delete('/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db('recipes').where({ id }).del();
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    logger.error('Delete recipe error:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

// Get low stock alerts
router.get('/alerts/low-stock', async (req, res) => {
  try {
    const { branchId } = req.query;
    
    let query = db('stock_items')
      .whereRaw('quantity <= min_threshold');

    if (branchId) {
      query = query.where({ branch_id: branchId });
    }

    const lowStockItems = await query.orderBy('name', 'asc');
    res.json(lowStockItems);
  } catch (error) {
    logger.error('Get low stock alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch low stock alerts' });
  }
});

// Bulk stock update (for purchasing)
router.post('/stock/bulk-update', [
  body('updates').isArray({ min: 1 }),
  body('updates.*.stockItemId').isInt(),
  body('updates.*.quantity').isFloat({ min: 0 }),
  body('reason').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { updates, reason } = req.body;

    const trx = await db.transaction();

    try {
      for (const update of updates) {
        const { stockItemId, quantity } = update;

        // Update stock quantity
        await trx('stock_items')
          .where({ id: stockItemId })
          .increment('quantity', quantity);

        // Record movement
        await trx('stock_movements').insert({
          stock_item_id: stockItemId,
          change: quantity,
          reason
        });
      }

      await trx.commit();

      res.json({
        message: 'Bulk stock update completed successfully',
        itemsUpdated: updates.length
      });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Bulk stock update error:', error);
    res.status(500).json({ error: 'Failed to update stock items' });
  }
});

module.exports = router;