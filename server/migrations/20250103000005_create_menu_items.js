exports.up = function(knex) {
  return knex.schema.createTable('menu_items', function(table) {
    table.increments('id').primary();
    table.integer('branch_id').unsigned();
    table.integer('category_id').unsigned();
    table.string('sku');
    table.string('name').notNullable();
    table.text('description');
    table.decimal('price', 10, 2).notNullable();
    table.string('image');
    table.boolean('is_available').defaultTo(true);
    table.timestamps(true, true);
    
    table.foreign('branch_id').references('id').inTable('branches');
    table.foreign('category_id').references('id').inTable('categories');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('menu_items');
};