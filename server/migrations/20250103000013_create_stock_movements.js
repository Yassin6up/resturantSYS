exports.up = function(knex) {
  return knex.schema.createTable('stock_movements', function(table) {
    table.increments('id').primary();
    table.integer('stock_item_id').unsigned();
    table.decimal('change', 10, 2);
    table.string('reason');
    table.timestamps(true, true);
    
    table.foreign('stock_item_id').references('id').inTable('stock_items');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('stock_movements');
};