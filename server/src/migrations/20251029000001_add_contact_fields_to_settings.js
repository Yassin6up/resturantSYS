exports.up = function(knex) {
  return knex.schema.table('settings', function(table) {
    table.text('restaurant_address').nullable();
    table.string('restaurant_phone', 20).nullable();
    table.string('restaurant_email', 255).nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('settings', function(table) {
    table.dropColumn('restaurant_address');
    table.dropColumn('restaurant_phone');
    table.dropColumn('restaurant_email');
  });
};