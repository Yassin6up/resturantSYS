exports.up = function(knex) {
  return knex.schema
    .table('stock_movements', table => {
      table.integer('user_id').unsigned();
      table.integer('order_id').unsigned();
      table.string('type').defaultTo('manual');
      table.foreign('user_id').references('id').inTable('users');
      table.foreign('order_id').references('id').inTable('orders');
    })
    .createTable('low_stock_alerts', table => {
      table.increments('id').primary();
      table.integer('stock_item_id').unsigned();
      table.integer('branch_id').unsigned();
      table.decimal('current_quantity', 10, 2);
      table.decimal('min_threshold', 10, 2);
      table.boolean('is_resolved').defaultTo(false);
      table.timestamp('resolved_at');
      table.timestamps(true, true);
      table.foreign('stock_item_id').references('id').inTable('stock_items');
      table.foreign('branch_id').references('id').inTable('branches');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('low_stock_alerts')
    .table('stock_movements', table => {
      table.dropForeign('user_id');
      table.dropForeign('order_id');
      table.dropColumn('user_id');
      table.dropColumn('order_id');
      table.dropColumn('type');
    });
};
