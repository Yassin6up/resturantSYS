const db = require('../config/database');

class MenuService {
  async getMenu(branchId) {
    const categories = await db('categories')
      .where({ branch_id: branchId, is_active: true })
      .orderBy('position', 'asc');

    const menuItems = await db('menu_items')
      .where({ branch_id: branchId, is_available: true })
      .orderBy('name', 'asc');

    const modifiers = await db('modifiers')
      .whereIn('menu_item_id', menuItems.map(item => item.id));

    // Group modifiers by menu item
    const modifiersByItem = modifiers.reduce((acc, modifier) => {
      if (!acc[modifier.menu_item_id]) {
        acc[modifier.menu_item_id] = [];
      }
      acc[modifier.menu_item_id].push(modifier);
      return acc;
    }, {});

    // Group menu items by category
    const itemsByCategory = menuItems.reduce((acc, item) => {
      if (!acc[item.category_id]) {
        acc[item.category_id] = [];
      }
      acc[item.category_id].push({
        ...item,
        modifiers: modifiersByItem[item.id] || []
      });
      return acc;
    }, {});

    return categories.map(category => ({
      ...category,
      items: itemsByCategory[category.id] || []
    }));
  }

  async getMenuItem(id) {
    const item = await db('menu_items').where({ id }).first();
    if (!item) {
      throw new Error('Menu item not found');
    }

    const modifiers = await db('modifiers').where({ menu_item_id: id });
    
    return {
      ...item,
      modifiers
    };
  }

  async createMenuItem(itemData) {
    const [itemId] = await db('menu_items').insert({
      branch_id: itemData.branchId,
      category_id: itemData.categoryId,
      sku: itemData.sku,
      name: itemData.name,
      description: itemData.description,
      price: itemData.price,
      image: itemData.image,
      prep_time: itemData.prepTime || 15,
      allergens: JSON.stringify(itemData.allergens || [])
    });

    return await this.getMenuItem(itemId);
  }

  async updateMenuItem(id, itemData) {
    const exists = await db('menu_items').where({ id }).first();
    if (!exists) {
      throw new Error('Menu item not found');
    }

    await db('menu_items').where({ id }).update({
      category_id: itemData.categoryId,
      sku: itemData.sku,
      name: itemData.name,
      description: itemData.description,
      price: itemData.price,
      image: itemData.image,
      is_available: itemData.isAvailable,
      prep_time: itemData.prepTime,
      allergens: JSON.stringify(itemData.allergens || []),
      updated_at: db.fn.now()
    });

    return await this.getMenuItem(id);
  }

  async deleteMenuItem(id) {
    const exists = await db('menu_items').where({ id }).first();
    if (!exists) {
      throw new Error('Menu item not found');
    }

    await db('menu_items').where({ id }).del();
    return { success: true };
  }

  async getCategories(branchId) {
    return await db('categories')
      .where({ branch_id: branchId })
      .orderBy('position', 'asc');
  }

  async createCategory(categoryData) {
    const [categoryId] = await db('categories').insert({
      branch_id: categoryData.branchId,
      name: categoryData.name,
      description: categoryData.description,
      image: categoryData.image,
      position: categoryData.position || 0
    });

    return await db('categories').where({ id: categoryId }).first();
  }

  async updateCategory(id, categoryData) {
    const exists = await db('categories').where({ id }).first();
    if (!exists) {
      throw new Error('Category not found');
    }

    await db('categories').where({ id }).update({
      name: categoryData.name,
      description: categoryData.description,
      image: categoryData.image,
      position: categoryData.position,
      is_active: categoryData.isActive,
      updated_at: db.fn.now()
    });

    return await db('categories').where({ id }).first();
  }

  async deleteCategory(id) {
    const exists = await db('categories').where({ id }).first();
    if (!exists) {
      throw new Error('Category not found');
    }

    // Check if category has menu items
    const itemCount = await db('menu_items').where({ category_id: id }).count('id as count').first();
    if (itemCount.count > 0) {
      throw new Error('Cannot delete category with menu items');
    }

    await db('categories').where({ id }).del();
    return { success: true };
  }
}

module.exports = new MenuService();