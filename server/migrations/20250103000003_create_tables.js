exports.up = function(knex) {
  return knex.schema.createTable('tables', function(table) {
    table.increments('id').primary();
    table.integer('branch_id').unsigned();
    table.string('table_number').notNullable();
    table.string('qr_code');
    table.text('description');
    table.timestamps(true, true);
    
    table.foreign('branch_id').references('id').inTable('branches');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('tables');
};