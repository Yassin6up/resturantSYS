exports.up = function(knex) {
  return knex.schema.createTable('order_items', function(table) {
    table.increments('id').primary();
    table.integer('order_id').unsigned();
    table.integer('menu_item_id').unsigned();
    table.integer('quantity').defaultTo(1);
    table.decimal('unit_price', 10, 2);
    table.text('note');
    table.timestamps(true, true);
    
    table.foreign('order_id').references('id').inTable('orders');
    table.foreign('menu_item_id').references('id').inTable('menu_items');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('order_items');
};