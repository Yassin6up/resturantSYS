exports.up = function(knex) {
  return knex.schema.createTable('modifiers', function(table) {
    table.increments('id').primary();
    table.integer('menu_item_id').unsigned();
    table.string('name');
    table.decimal('extra_price', 10, 2).defaultTo(0);
    
    table.foreign('menu_item_id').references('id').inTable('menu_items');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('modifiers');
};