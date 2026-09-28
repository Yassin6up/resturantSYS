const { db } = require('../database/init');

// Re-evaluates is_available for every menu item that uses the given stock
// item as an ingredient: unavailable if ANY of its ingredients is depleted,
// available again once ALL of them are back in stock. Called after any
// change to a stock item's quantity (order consumption, manual restock,
// stock moves).
async function syncMenuItemAvailability(stockItemId) {
  const affectedItems = await db('recipes')
    .where({ stock_item_id: stockItemId })
    .distinct('menu_item_id')
    .pluck('menu_item_id');

  for (const menuItemId of affectedItems) {
    const ingredients = await db('recipes')
      .join('stock_items', 'recipes.stock_item_id', 'stock_items.id')
      .where({ 'recipes.menu_item_id': menuItemId })
      .select('stock_items.quantity');

    const inStock = ingredients.every(i => Number(i.quantity) > 0);
    await db('menu_items').where({ id: menuItemId }).update({ is_available: inStock });
  }
}

module.exports = { syncMenuItemAvailability };
