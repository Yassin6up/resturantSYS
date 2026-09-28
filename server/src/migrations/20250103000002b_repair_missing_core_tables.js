// Repairs databases created by an interrupted first migration. Some MySQL
// installations recorded the initial migration while only creating its first
// tables; later migrations then failed when they tried to alter `orders`.
exports.up = async function (knex) {
  if (!(await knex.schema.hasTable('modifiers'))) await knex.schema.createTable('modifiers', t => {
    t.increments('id').primary(); t.integer('menu_item_id').unsigned(); t.string('name'); t.decimal('extra_price', 10, 2).defaultTo(0);
  });
  if (!(await knex.schema.hasTable('orders'))) await knex.schema.createTable('orders', t => {
    t.increments('id').primary(); t.integer('branch_id').unsigned(); t.string('order_code').unique(); t.integer('table_id').unsigned();
    t.string('customer_name'); t.decimal('total', 10, 2); t.decimal('tax', 10, 2).defaultTo(0); t.decimal('service_charge', 10, 2).defaultTo(0);
    t.string('status').defaultTo('PENDING'); t.string('payment_status').defaultTo('UNPAID'); t.timestamps(true, true);
  });
  if (!(await knex.schema.hasTable('order_items'))) await knex.schema.createTable('order_items', t => {
    t.increments('id').primary(); t.integer('order_id').unsigned(); t.integer('menu_item_id').unsigned(); t.integer('quantity').defaultTo(1); t.decimal('unit_price', 10, 2); t.text('note'); t.timestamps(true, true);
  });
  if (!(await knex.schema.hasTable('order_item_modifiers'))) await knex.schema.createTable('order_item_modifiers', t => {
    t.increments('id').primary(); t.integer('order_item_id').unsigned(); t.integer('modifier_id').unsigned(); t.decimal('extra_price', 10, 2).defaultTo(0);
  });
  if (!(await knex.schema.hasTable('payments'))) await knex.schema.createTable('payments', t => {
    t.increments('id').primary(); t.integer('order_id').unsigned(); t.string('payment_type'); t.decimal('amount', 10, 2); t.string('transaction_ref'); t.timestamp('paid_at').defaultTo(knex.fn.now());
  });
  if (!(await knex.schema.hasTable('stock_items'))) await knex.schema.createTable('stock_items', t => {
    t.increments('id').primary(); t.integer('branch_id').unsigned(); t.string('name'); t.string('sku'); t.decimal('quantity', 10, 2).defaultTo(0); t.string('unit'); t.decimal('min_threshold', 10, 2).defaultTo(0); t.timestamps(true, true);
  });
  if (!(await knex.schema.hasTable('recipes'))) await knex.schema.createTable('recipes', t => {
    t.increments('id').primary(); t.integer('menu_item_id').unsigned(); t.integer('stock_item_id').unsigned(); t.decimal('qty_per_serving', 10, 2);
  });
  if (!(await knex.schema.hasTable('stock_movements'))) await knex.schema.createTable('stock_movements', t => {
    t.increments('id').primary(); t.integer('stock_item_id').unsigned(); t.decimal('change', 10, 2); t.string('reason'); t.timestamps(true, true);
  });
  if (!(await knex.schema.hasTable('settings'))) await knex.schema.createTable('settings', t => {
    t.increments('id').primary(); t.string('key').unique(); t.text('value'); t.timestamps(true, true);
  });
  if (!(await knex.schema.hasTable('audit_logs'))) await knex.schema.createTable('audit_logs', t => {
    t.increments('id').primary(); t.integer('user_id').unsigned(); t.string('action'); t.text('meta'); t.timestamps(true, true);
  });
  if (!(await knex.schema.hasTable('sync_logs'))) await knex.schema.createTable('sync_logs', t => {
    t.increments('id').primary(); t.string('table_name'); t.integer('record_id'); t.string('operation'); t.text('payload'); t.boolean('synced').defaultTo(false); t.timestamps(true, true);
  });
};
exports.down = async function () {};
