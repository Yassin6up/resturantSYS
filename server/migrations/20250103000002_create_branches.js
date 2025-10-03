exports.up = function(knex) {
  return knex.schema.createTable('branches', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('code').unique();
    table.text('address');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('branches');
};