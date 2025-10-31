const express = require('express');
const router = express.Router();
const { db } = require('../database/init');
const { authenticateToken, authorize } = require('../middleware/auth');
const logger = require('winston');

// Get all variants for a menu item
router.get('/menu-item/:menuItemId', authenticateToken, async (req, res) => {
  try {
    const { menuItemId } = req.params;

    const variants = await db('product_variants')
      .where({ menu_item_id: menuItemId })
      .orderBy('sort_order', 'asc');

    res.json({ variants });
  } catch (error) {
    logger.error('Get variants error:', error);
    res.status(500).json({ error: 'Failed to get variants' });
  }
});

// Get specific variant
router.get('/:variantId', authenticateToken, async (req, res) => {
  try {
    const { variantId } = req.params;

    const variant = await db('product_variants')
      .where({ id: variantId })
      .first();

    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    res.json({ variant });
  } catch (error) {
    logger.error('Get variant error:', error);
    res.status(500).json({ error: 'Failed to get variant' });
  }
});

// Create variant for a menu item
router.post('/menu-item/:menuItemId', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const { name, price_adjustment, sort_order, is_active } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Variant name is required' });
    }

    // Verify menu item exists
    const menuItem = await db('menu_items')
      .where({ id: menuItemId })
      .first();

    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const [variantId] = await db('product_variants').insert({
      menu_item_id: menuItemId,
      name: name.trim(),
      price_adjustment: parseFloat(price_adjustment) || 0,
      sort_order: parseInt(sort_order) || 0,
      is_active: is_active !== false
    });

    const variant = await db('product_variants')
      .where({ id: variantId })
      .first();

    res.status(201).json({ variant });
  } catch (error) {
    logger.error('Create variant error:', error);
    res.status(500).json({ error: 'Failed to create variant' });
  }
});

// Create multiple variants for a menu item
router.post('/menu-item/:menuItemId/bulk', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const { variants } = req.body;

    if (!Array.isArray(variants)) {
      return res.status(400).json({ error: 'Variants array is required' });
    }

    // Verify menu item exists
    const menuItem = await db('menu_items')
      .where({ id: menuItemId })
      .first();

    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const variantData = variants.map((variant, index) => ({
      menu_item_id: menuItemId,
      name: variant.name.trim(),
      price_adjustment: parseFloat(variant.price_adjustment) || 0,
      sort_order: parseInt(variant.sort_order) || index,
      is_active: variant.is_active !== false
    }));

    const insertedIds = await db('product_variants').insert(variantData);

    const createdVariants = await db('product_variants')
      .whereIn('id', insertedIds)
      .orderBy('sort_order', 'asc');

    res.status(201).json({ variants: createdVariants });
  } catch (error) {
    logger.error('Create bulk variants error:', error);
    res.status(500).json({ error: 'Failed to create variants' });
  }
});

// Update variant
router.put('/:variantId', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { variantId } = req.params;
    const { name, price_adjustment, sort_order, is_active } = req.body;

    // Verify variant exists
    const variant = await db('product_variants')
      .where({ id: variantId })
      .first();

    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (price_adjustment !== undefined) updateData.price_adjustment = parseFloat(price_adjustment);
    if (sort_order !== undefined) updateData.sort_order = parseInt(sort_order);
    if (is_active !== undefined) updateData.is_active = is_active;

    await db('product_variants')
      .where({ id: variantId })
      .update(updateData);

    const updatedVariant = await db('product_variants')
      .where({ id: variantId })
      .first();

    res.json({ variant: updatedVariant });
  } catch (error) {
    logger.error('Update variant error:', error);
    res.status(500).json({ error: 'Failed to update variant' });
  }
});

// Update multiple variants
router.put('/menu-item/:menuItemId/bulk', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const { variants } = req.body;

    if (!Array.isArray(variants)) {
      return res.status(400).json({ error: 'Variants array is required' });
    }

    const updatePromises = variants.map(variant => {
      const updateData = {};
      if (variant.name !== undefined) updateData.name = variant.name.trim();
      if (variant.price_adjustment !== undefined) updateData.price_adjustment = parseFloat(variant.price_adjustment);
      if (variant.sort_order !== undefined) updateData.sort_order = parseInt(variant.sort_order);
      if (variant.is_active !== undefined) updateData.is_active = variant.is_active;

      return db('product_variants')
        .where({ id: variant.id, menu_item_id: menuItemId })
        .update(updateData);
    });

    await Promise.all(updatePromises);

    const updatedVariants = await db('product_variants')
      .where({ menu_item_id: menuItemId })
      .orderBy('sort_order', 'asc');

    res.json({ variants: updatedVariants });
  } catch (error) {
    logger.error('Update bulk variants error:', error);
    res.status(500).json({ error: 'Failed to update variants' });
  }
});

// Delete variant
router.delete('/:variantId', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { variantId } = req.params;

    // Verify variant exists
    const variant = await db('product_variants')
      .where({ id: variantId })
      .first();

    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    await db('product_variants')
      .where({ id: variantId })
      .del();

    res.json({ success: true, message: 'Variant deleted successfully' });
  } catch (error) {
    logger.error('Delete variant error:', error);
    res.status(500).json({ error: 'Failed to delete variant' });
  }
});

// Delete all variants for a menu item
router.delete('/menu-item/:menuItemId', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { menuItemId } = req.params;

    // Verify menu item exists
    const menuItem = await db('menu_items')
      .where({ id: menuItemId })
      .first();

    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    await db('product_variants')
      .where({ menu_item_id: menuItemId })
      .del();

    res.json({ success: true, message: 'All variants deleted successfully' });
  } catch (error) {
    logger.error('Delete menu item variants error:', error);
    res.status(500).json({ error: 'Failed to delete variants' });
  }
});

module.exports = router;