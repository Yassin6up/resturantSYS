exports.up = function(knex) {
  return knex.schema.alterTable('tables', table => {
    table.integer('capacity').defaultTo(4);
    table.string('location');
    table.boolean('is_active').defaultTo(true);
    table.string('qr_code_url');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('tables', table => {
    table.dropColumn('capacity');
    table.dropColumn('location');
    table.dropColumn('is_active');
    table.dropColumn('qr_code_url');
  });
};