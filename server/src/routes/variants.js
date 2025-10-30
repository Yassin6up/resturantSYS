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
      .where({ menu_item_id: menuItemId, is_active: true })
      .orderBy('sort_order', 'asc');

    res.json({ variants });
  } catch (error) {
    logger.error('Get variants error:', error);
    res.status(500).json({ error: 'Failed to get variants' });
  }
});

// Create variant for a menu item
router.post('/menu-item/:menuItemId', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const { name, priceAdjustment, sortOrder } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Variant name is required' });
    }

    // Verify menu item exists and belongs to user's branch
    const menuItem = await db('menu_items')
      .where({ id: menuItemId, branch_id: req.user.branch_id })
      .first();

    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const [variantId] = await db('product_variants').insert({
      menu_item_id: menuItemId,
      name,
      price_adjustment: priceAdjustment || 0,
      sort_order: sortOrder || 0,
      is_active: true
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

// Update variant
router.put('/:variantId', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { variantId } = req.params;
    const { name, priceAdjustment, sortOrder, isActive } = req.body;

    // Verify variant exists and belongs to user's branch
    const variant = await db('product_variants')
      .join('menu_items', 'product_variants.menu_item_id', 'menu_items.id')
      .where({ 'product_variants.id': variantId, 'menu_items.branch_id': req.user.branch_id })
      .select('product_variants.*')
      .first();

    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (priceAdjustment !== undefined) updateData.price_adjustment = priceAdjustment;
    if (sortOrder !== undefined) updateData.sort_order = sortOrder;
    if (isActive !== undefined) updateData.is_active = isActive;

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

// Delete variant
router.delete('/:variantId', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { variantId } = req.params;

    // Verify variant exists and belongs to user's branch
    const variant = await db('product_variants')
      .join('menu_items', 'product_variants.menu_item_id', 'menu_items.id')
      .where({ 'product_variants.id': variantId, 'menu_items.branch_id': req.user.branch_id })
      .select('product_variants.*')
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

module.exports = router;
