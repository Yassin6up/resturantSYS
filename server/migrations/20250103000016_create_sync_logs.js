exports.up = function(knex) {
  return knex.schema.createTable('sync_logs', function(table) {
    table.increments('id').primary();
    table.string('table_name');
    table.integer('record_id');
    table.string('operation');
    table.text('payload');
    table.boolean('synced').defaultTo(false);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('sync_logs');
};