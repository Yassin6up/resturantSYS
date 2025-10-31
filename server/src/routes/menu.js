const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../database/init');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateMenuItem } = require('../middleware/validation');
const { logger } = require('../middleware/errorHandler');

const router = express.Router();

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'menu-item-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

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

      // Get modifiers and variants for each item
      for (const item of items) {
        // Get modifiers for the item
        const modifiers = await db('modifiers')
          .select('modifiers.*')
          .where({ 'modifiers.menu_item_id': item.id });

        item.modifiers = modifiers;

        // Get variants for the item
        const variants = await db('product_variants')
          .select('*')
          .where({ 
            'product_variants.menu_item_id': item.id,
            'product_variants.is_active': true
          })
          .orderBy('product_variants.sort_order', 'asc');

        item.variants = variants;
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

    // Get modifiers and variants for each item
    for (const item of items) {
      const modifiers = await db('modifiers')
        .select('modifiers.*')
        .where({ 'modifiers.menu_item_id': item.id });

      const variants = await db('product_variants')
        .select('*')
        .where({ 'menu_item_id': item.id, 'is_active': true })
        .orderBy('sort_order', 'asc');

      item.modifiers = modifiers;
      item.variants = variants;
    }

    res.json({ items });
  } catch (error) {
    logger.error('Menu items fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// Create menu item (admin)
router.post('/items', authenticateToken, authorize('admin', 'manager'), upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, categoryId, sku, modifiers, variants, image } = req.body;
    
    console.log('data received:', req.body);
    
    // Parse variants if it's a string
    let parsedVariants = [];
    if (variants) {
      try {
        parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
        console.log('parsed variants:', parsedVariants);
      } catch (parseError) {
        console.error('Failed to parse variants:', parseError);
        return res.status(400).json({ error: 'Invalid variants format' });
      }
    }

    // Parse modifiers if provided
    let parsedModifiers = [];
    if (modifiers) {
      try {
        parsedModifiers = typeof modifiers === 'string' ? JSON.parse(modifiers) : modifiers;
      } catch (parseError) {
        console.error('Failed to parse modifiers:', parseError);
        return res.status(400).json({ error: 'Invalid modifiers format' });
      }
    }
    
    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }

    // Validate required fields
    if (!name || !price || !categoryId) {
      return res.status(400).json({ error: 'Name, price, and category are required' });
    }

    // Get image URL - either from file upload or from body (pre-uploaded via /api/upload/image)
    let imageUrl = image || null;
    
    if (req.file) {
      // Construct full URL for uploaded file
      const protocol = req.protocol;
      const host = req.get('host');
      imageUrl = `${protocol}://${host}/api/upload/image/${req.file.filename}`;
      console.log('Generated image URL:', imageUrl);
    }

    const [itemId] = await db('menu_items').insert({
      name,
      description,
      price,
      category_id: categoryId,
      branch_id: branchId,
      sku,
      image: imageUrl  // Store full URL instead of just path
    });

    // Add modifiers if provided
    if (parsedModifiers && parsedModifiers.length > 0) {
      const modifierData = parsedModifiers.map(modifier => ({
        menu_item_id: itemId,
        name: modifier.name,
        extra_price: modifier.extra_price || 0
      }));

      await db('modifiers').insert(modifierData);
    }

    // Add variants if provided
    if (parsedVariants && parsedVariants.length > 0) {
      const variantData = parsedVariants.map((variant, index) => ({
        menu_item_id: itemId,
        name: variant.name,
        price_adjustment: variant.price_adjustment || variant.priceAdjustment || 0,
        sort_order: variant.sort_order || variant.sortOrder || index,
        is_active: variant.is_active !== false
      }));

      await db('product_variants').insert(variantData);
    }

    const item = await db('menu_items')
      .select('menu_items.*', 'categories.name as category_name')
      .leftJoin('categories', 'menu_items.category_id', 'categories.id')
      .where({ 'menu_items.id': itemId })
      .first();

    // Get modifiers and variants
    const itemModifiers = await db('modifiers')
      .select('modifiers.*')
      .where({ 'modifiers.menu_item_id': itemId });

    const itemVariants = await db('product_variants')
      .select('*')
      .where({ 'menu_item_id': itemId })
      .orderBy('sort_order', 'asc');

    item.modifiers = itemModifiers;
    item.variants = itemVariants;

    // Log menu item creation
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'MENU_ITEM_CREATE',
      meta: JSON.stringify({ itemId, name, price, categoryId, branchId })
    });

    res.status(201).json({ item });
  } catch (error) {
    console.error('Menu item creation error:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});


// Update menu item (admin)
router.put('/items/:id', authenticateToken, authorize('admin', 'manager'), upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, categoryId, sku, isAvailable, modifiers, variants, image } = req.body;
    
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

    // Prepare update data
    const updateData = {
      name,
      description,
      price,
      category_id: categoryId,
      sku,
      is_available: isAvailable,
      updated_at: db.raw('CURRENT_TIMESTAMP')
    };

    // Update image if new one uploaded via file or pre-uploaded via /api/upload/image
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
      
      // Delete old image if exists
      if (existingItem.image) {
        const oldImagePath = path.join(__dirname, '../../', existingItem.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    } else if (image && image !== existingItem.image) {
      // Image URL provided from separate upload
      updateData.image = image;
      
      // Delete old image if exists
      if (existingItem.image && existingItem.image !== image) {
        const oldImagePath = path.join(__dirname, '../../', existingItem.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }

    await db('menu_items')
      .where({ id })
      .update(updateData);

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

    // Update variants if provided
    if (variants) {
      // Delete existing variants
      await db('product_variants').where({ menu_item_id: id }).del();

      // Insert new variants
      if (variants.length > 0) {
        const variantData = variants.map((variant, index) => ({
          menu_item_id: id,
          name: variant.name,
          price_adjustment: variant.price_adjustment || variant.priceAdjustment || 0,
          sort_order: variant.sort_order || variant.sortOrder || index,
          is_active: true
        }));

        await db('product_variants').insert(variantData);
      }
    }

    const item = await db('menu_items')
      .select('menu_items.*', 'categories.name as category_name')
      .leftJoin('categories', 'menu_items.category_id', 'categories.id')
      .where({ 'menu_items.id': id })
      .first();

    // Get modifiers and variants
    const itemModifiers = await db('modifiers')
      .select('modifiers.*')
      .where({ 'modifiers.menu_item_id': id });

    const itemVariants = await db('product_variants')
      .select('*')
      .where({ 'menu_item_id': id })
      .orderBy('sort_order', 'asc');

    item.modifiers = itemModifiers;
    item.variants = itemVariants;

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

    // Check if item exists
    const menuItem = await db('menu_items').where({ id }).first();
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Check if item has orders
    const orderCount = await db('order_items').where({ menu_item_id: id }).count('id as count').first();
    
    if (orderCount.count > 0) {
      return res.status(400).json({ error: 'Cannot delete menu item with existing orders' });
    }

    // Delete related records in the correct order to respect foreign key constraints
    await db.transaction(async (trx) => {
      // 1. Delete variants first (if they exist)
      await trx('product_variants').where({ menu_item_id: id }).del();
      
      // 2. Delete modifiers
      await trx('modifiers').where({ menu_item_id: id }).del();
      
      // 3. Delete recipes (this is the missing constraint from your error)
      await trx('recipes').where({ menu_item_id: id }).del();
      
      // 4. Finally delete the menu item
      await trx('menu_items').where({ id }).del();
    });

    // Log menu item deletion
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'MENU_ITEM_DELETE',
      meta: JSON.stringify({ itemId: id })
    });

    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    logger.error('Menu item deletion error:', error);
    
    // Provide more specific error messages
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ 
        error: 'Cannot delete menu item. It is referenced in other records. Please remove all associations first.' 
      });
    }
    
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