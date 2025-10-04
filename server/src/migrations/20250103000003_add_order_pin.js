exports.up = function(knex) {
  return knex.schema.alterTable('orders', table => {
    table.string('pin', 8).unique();
    table.string('payment_method').defaultTo('cash');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('orders', table => {
    table.dropColumn('pin');
    table.dropColumn('payment_method');
  });
};