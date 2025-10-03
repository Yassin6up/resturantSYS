exports.up = function(knex) {
  return knex.schema.createTable('orders', function(table) {
    table.increments('id').primary();
    table.integer('branch_id').unsigned();
    table.string('order_code').unique();
    table.integer('table_id').unsigned();
    table.string('customer_name');
    table.decimal('total', 10, 2);
    table.decimal('tax', 10, 2).defaultTo(0);
    table.decimal('service_charge', 10, 2).defaultTo(0);
    table.string('status').defaultTo('PENDING');
    table.string('payment_status').defaultTo('UNPAID');
    table.timestamps(true, true);
    
    table.foreign('branch_id').references('id').inTable('branches');
    table.foreign('table_id').references('id').inTable('tables');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('orders');
};