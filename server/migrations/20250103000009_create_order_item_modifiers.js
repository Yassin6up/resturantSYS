exports.up = function(knex) {
  return knex.schema.createTable('order_item_modifiers', function(table) {
    table.increments('id').primary();
    table.integer('order_item_id').unsigned();
    table.integer('modifier_id').unsigned();
    table.decimal('extra_price', 10, 2).defaultTo(0);
    
    table.foreign('order_item_id').references('id').inTable('order_items');
    table.foreign('modifier_id').references('id').inTable('modifiers');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('order_item_modifiers');
};