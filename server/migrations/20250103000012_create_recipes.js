exports.up = function(knex) {
  return knex.schema.createTable('recipes', function(table) {
    table.increments('id').primary();
    table.integer('menu_item_id').unsigned();
    table.integer('stock_item_id').unsigned();
    table.decimal('qty_per_serving', 10, 2);
    
    table.foreign('menu_item_id').references('id').inTable('menu_items');
    table.foreign('stock_item_id').references('id').inTable('stock_items');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('recipes');
};