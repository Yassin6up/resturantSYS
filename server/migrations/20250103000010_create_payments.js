exports.up = function(knex) {
  return knex.schema.createTable('payments', function(table) {
    table.increments('id').primary();
    table.integer('order_id').unsigned();
    table.string('payment_type');
    table.decimal('amount', 10, 2);
    table.string('transaction_ref');
    table.timestamp('paid_at').defaultTo(knex.fn.now());
    
    table.foreign('order_id').references('id').inTable('orders');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('payments');
};