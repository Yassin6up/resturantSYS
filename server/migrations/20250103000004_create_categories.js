exports.up = function(knex) {
  return knex.schema.createTable('categories', function(table) {
    table.increments('id').primary();
    table.integer('branch_id').unsigned();
    table.string('name').notNullable();
    table.integer('position').defaultTo(0);
    table.timestamps(true, true);
    
    table.foreign('branch_id').references('id').inTable('branches');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('categories');
};