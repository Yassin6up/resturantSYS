exports.up = async function(knex) {
  for (const [name, add] of Object.entries({ user_id: t => t.integer('user_id').unsigned(), order_id: t => t.integer('order_id').unsigned(), type: t => t.string('type').defaultTo('manual') })) {
    if (!(await knex.schema.hasColumn('stock_movements', name))) await knex.schema.table('stock_movements', add);
  }
  if (!(await knex.schema.hasTable('low_stock_alerts'))) await knex.schema.createTable('low_stock_alerts', table => {
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
