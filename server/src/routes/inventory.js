const express = require('express');
const { db } = require('../database/init');
const { authenticateToken, authorize } = require('../middleware/auth');
const { logger } = require('../middleware/errorHandler');

const router = express.Router();

// Get all stock items (admin/manager)
router.get('/stock', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }

    const query = db('stock_items')
      .select('stock_items.*', 'branches.name as branch_name')
      .leftJoin('branches', 'stock_items.branch_id', 'branches.id')
      .where({ 'stock_items.branch_id': branchId });

    const stockItems = await query.orderBy('stock_items.name');

    // Add low stock alerts
    for (const item of stockItems) {
      item.isLowStock = item.quantity <= item.min_threshold;
    }

    res.json({ success: true, items: stockItems });
  } catch (error) {
    logger.error('Stock items fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch stock items' });
  }
});

// Create stock item (admin/manager)
router.post('/stock', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { name, sku, unit, minStock, maxStock, currentStock, costPrice, supplier, description, isActive } = req.body;
    
    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const [stockItemId] = await db('stock_items').insert({
      name,
      sku,
      branch_id: branchId,
      unit: unit || 'piece',
      min_stock: minStock || 0,
      max_stock: maxStock || 100,
      current_stock: currentStock || 0,
      cost_price: costPrice || 0,
      supplier: supplier || '',
      description: description || '',
      is_active: isActive !== false
    });

    const stockItem = await db('stock_items')
      .select('stock_items.*', 'branches.name as branch_name')
      .leftJoin('branches', 'stock_items.branch_id', 'branches.id')
      .where({ 'stock_items.id': stockItemId })
      .first();

    // Log stock item creation
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'STOCK_ITEM_CREATE',
      meta: JSON.stringify({ stockItemId, name, sku, branchId })
    });

    res.status(201).json({ success: true, item: stockItem });
  } catch (error) {
    logger.error('Stock item creation error:', error);
    res.status(500).json({ error: 'Failed to create stock item' });
  }
});

// Update stock item (admin/manager)
router.put('/stock/:id', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sku, unit, minThreshold } = req.body;
    
    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }
    
    // Verify the stock item belongs to the user's branch
    const existingItem = await db('stock_items').where({ id }).first();
    if (!existingItem) {
      return res.status(404).json({ error: 'Stock item not found' });
    }
    if (existingItem.branch_id !== branchId) {
      return res.status(403).json({ error: 'Access denied: Stock item belongs to different branch' });
    }

    await db('stock_items')
      .where({ id })
      .update({
        name,
        sku,
        unit,
        min_threshold: minThreshold,
        updated_at: db.raw('CURRENT_TIMESTAMP')
      });

    const stockItem = await db('stock_items')
      .select('stock_items.*', 'branches.name as branch_name')
      .leftJoin('branches', 'stock_items.branch_id', 'branches.id')
      .where({ 'stock_items.id': id })
      .first();

    // Log stock item update
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'STOCK_ITEM_UPDATE',
      meta: JSON.stringify({ stockItemId: id, name, sku })
    });

    res.json({ stockItem });
  } catch (error) {
    logger.error('Stock item update error:', error);
    res.status(500).json({ error: 'Failed to update stock item' });
  }
});

// Delete stock item (admin/manager)
router.delete('/stock/:id', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }
    
    // Verify the stock item belongs to the user's branch
    const existingItem = await db('stock_items').where({ id }).first();
    if (!existingItem) {
      return res.status(404).json({ error: 'Stock item not found' });
    }
    if (existingItem.branch_id !== branchId) {
      return res.status(403).json({ error: 'Access denied: Stock item belongs to different branch' });
    }

    // Check if stock item is used in recipes
    const recipeCount = await db('recipes').where({ stock_item_id: id }).count('id as count').first();
    
    if (recipeCount.count > 0) {
      return res.status(400).json({ error: 'Cannot delete stock item used in recipes' });
    }

    await db('stock_items').where({ id }).del();

    // Log stock item deletion
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'STOCK_ITEM_DELETE',
      meta: JSON.stringify({ stockItemId: id })
    });

    res.json({ message: 'Stock item deleted successfully' });
  } catch (error) {
    logger.error('Stock item deletion error:', error);
    res.status(500).json({ error: 'Failed to delete stock item' });
  }
});

// Record stock movement (admin/manager)
router.post('/stock/:id/move', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { change, reason } = req.body;
    
    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }

    if (!change || !reason) {
      return res.status(400).json({ error: 'Change amount and reason are required' });
    }

    const stockItem = await db('stock_items').where({ id }).first();
    if (!stockItem) {
      return res.status(404).json({ error: 'Stock item not found' });
    }
    if (stockItem.branch_id !== branchId) {
      return res.status(403).json({ error: 'Access denied: Stock item belongs to different branch' });
    }

    // Update stock quantity
    await db('stock_items')
      .where({ id })
      .update({
        quantity: db.raw('quantity + ?', [change]),
        updated_at: db.raw('CURRENT_TIMESTAMP')
      });

    // Log stock movement
    await db('stock_movements').insert({
      stock_item_id: id,
      change,
      reason
    });

    const updatedStockItem = await db('stock_items')
      .select('stock_items.*', 'branches.name as branch_name')
      .leftJoin('branches', 'stock_items.branch_id', 'branches.id')
      .where({ 'stock_items.id': id })
      .first();

    // Log stock movement
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'STOCK_MOVEMENT',
      meta: JSON.stringify({ 
        stockItemId: id, 
        change, 
        reason,
        newQuantity: updatedStockItem.quantity
      })
    });

    logger.info(`Stock movement: ${stockItem.name} ${change > 0 ? '+' : ''}${change} (${reason})`);

    res.json({ 
      stockItem: updatedStockItem,
      message: 'Stock movement recorded successfully' 
    });

  } catch (error) {
    logger.error('Stock movement error:', error);
    res.status(500).json({ error: 'Failed to record stock movement' });
  }
});

// Get stock movements history
router.get('/stock/:id/movements', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }
    
    // Verify the stock item belongs to the user's branch
    const stockItem = await db('stock_items').where({ id }).first();
    if (!stockItem) {
      return res.status(404).json({ error: 'Stock item not found' });
    }
    if (stockItem.branch_id !== branchId) {
      return res.status(403).json({ error: 'Access denied: Stock item belongs to different branch' });
    }

    const movements = await db('stock_movements')
      .where({ stock_item_id: id })
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    res.json({ movements });
  } catch (error) {
    logger.error('Stock movements fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
});

// Get low stock alerts
router.get('/stock/alerts/low', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }

    const query = db('stock_items')
      .select('stock_items.*', 'branches.name as branch_name')
      .leftJoin('branches', 'stock_items.branch_id', 'branches.id')
      .where(db.raw('stock_items.quantity <= stock_items.min_threshold'))
      .where({ 'stock_items.branch_id': branchId });

    const lowStockItems = await query.orderBy('stock_items.name');

    res.json({ lowStockItems });
  } catch (error) {
    logger.error('Low stock alerts fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch low stock alerts' });
  }
});

// Get recipes (admin/manager)
router.get('/recipes', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { menuItemId } = req.query;

    let query = db('recipes')
      .select(
        'recipes.*',
        'menu_items.name as menu_item_name',
        'stock_items.name as stock_item_name',
        'stock_items.sku as stock_item_sku',
        'stock_items.unit'
      )
      .leftJoin('menu_items', 'recipes.menu_item_id', 'menu_items.id')
      .leftJoin('stock_items', 'recipes.stock_item_id', 'stock_items.id');

    if (menuItemId) {
      query = query.where({ 'recipes.menu_item_id': menuItemId });
    }

    const recipes = await query.orderBy('menu_items.name');

    res.json({ recipes });
  } catch (error) {
    logger.error('Recipes fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Create recipe (admin/manager)
router.post('/recipes', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { menuItemId, stockItemId, qtyPerServing } = req.body;

    if (!menuItemId || !stockItemId || !qtyPerServing) {
      return res.status(400).json({ error: 'Menu item ID, stock item ID, and quantity per serving are required' });
    }

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
      .select(
        'recipes.*',
        'menu_items.name as menu_item_name',
        'stock_items.name as stock_item_name',
        'stock_items.sku as stock_item_sku',
        'stock_items.unit'
      )
      .leftJoin('menu_items', 'recipes.menu_item_id', 'menu_items.id')
      .leftJoin('stock_items', 'recipes.stock_item_id', 'stock_items.id')
      .where({ 'recipes.id': recipeId })
      .first();

    // Log recipe creation
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'RECIPE_CREATE',
      meta: JSON.stringify({ recipeId, menuItemId, stockItemId, qtyPerServing })
    });

    res.status(201).json({ recipe });
  } catch (error) {
    logger.error('Recipe creation error:', error);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

// Update recipe (admin/manager)
router.put('/recipes/:id', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { qtyPerServing } = req.body;

    await db('recipes')
      .where({ id })
      .update({ qty_per_serving: qtyPerServing });

    const recipe = await db('recipes')
      .select(
        'recipes.*',
        'menu_items.name as menu_item_name',
        'stock_items.name as stock_item_name',
        'stock_items.sku as stock_item_sku',
        'stock_items.unit'
      )
      .leftJoin('menu_items', 'recipes.menu_item_id', 'menu_items.id')
      .leftJoin('stock_items', 'recipes.stock_item_id', 'stock_items.id')
      .where({ 'recipes.id': id })
      .first();

    // Log recipe update
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'RECIPE_UPDATE',
      meta: JSON.stringify({ recipeId: id, qtyPerServing })
    });

    res.json({ recipe });
  } catch (error) {
    logger.error('Recipe update error:', error);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
});

// Delete recipe (admin/manager)
router.delete('/recipes/:id', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;

    await db('recipes').where({ id }).del();

    // Log recipe deletion
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'RECIPE_DELETE',
      meta: JSON.stringify({ recipeId: id })
    });

    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    logger.error('Recipe deletion error:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

module.exports = router;