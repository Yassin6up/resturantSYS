exports.up = function(knex) {
  return knex.schema.createTable('stock_items', function(table) {
    table.increments('id').primary();
    table.integer('branch_id').unsigned();
    table.string('name');
    table.string('sku');
    table.decimal('quantity', 10, 2).defaultTo(0);
    table.string('unit');
    table.decimal('min_threshold', 10, 2).defaultTo(0);
    table.timestamps(true, true);
    
    table.foreign('branch_id').references('id').inTable('branches');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('stock_items');
};