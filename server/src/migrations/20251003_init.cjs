/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  try { await knex.raw('PRAGMA foreign_keys = ON'); } catch (e) {}
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('username').unique().notNullable();
    t.string('password_hash').notNullable();
    t.string('full_name');
    t.string('role').notNullable();
    t.string('pin');
    t.integer('is_active').defaultTo(1);
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.datetime('updated_at').defaultTo(knex.fn.now());
  });
  await knex.schema.createTable('branches', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.string('code').unique();
    t.string('address');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });
  await knex.schema.createTable('tables', (t) => {
    t.increments('id').primary();
    t.integer('branch_id').references('id').inTable('branches');
    t.string('table_number').notNullable();
    t.string('qr_code');
    t.string('description');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });
  await knex.schema.createTable('categories', (t) => {
    t.increments('id').primary();
    t.integer('branch_id').references('id').inTable('branches');
    t.string('name').notNullable();
    t.integer('position').defaultTo(0);
    t.datetime('created_at').defaultTo(knex.fn.now());
  });
  await knex.schema.createTable('menu_items', (t) => {
    t.increments('id').primary();
    t.integer('branch_id').references('id').inTable('branches');
    t.integer('category_id').references('id').inTable('categories');
    t.string('sku');
    t.string('name').notNullable();
    t.string('description');
    t.float('price').notNullable();
    t.string('image');
    t.integer('is_available').defaultTo(1);
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.datetime('updated_at').defaultTo(knex.fn.now());
  });
  await knex.schema.createTable('modifiers', (t) => {
    t.increments('id').primary();
    t.integer('menu_item_id').references('id').inTable('menu_items');
    t.string('name');
    t.float('extra_price').defaultTo(0);
  });
  await knex.schema.createTable('orders', (t) => {
    t.increments('id').primary();
    t.integer('branch_id');
    t.string('order_code').unique();
    t.integer('table_id');
    t.string('customer_name');
    t.float('total');
    t.float('tax').defaultTo(0);
    t.float('service_charge').defaultTo(0);
    t.string('status').defaultTo('PENDING');
    t.string('payment_status').defaultTo('UNPAID');
    t.datetime('created_at').defaultTo(knex.fn.now());
    t.datetime('updated_at').defaultTo(knex.fn.now());
  });
  await knex.schema.createTable('order_items', (t) => {
    t.increments('id').primary();
    t.integer('order_id').references('id').inTable('orders');
    t.integer('menu_item_id').references('id').inTable('menu_items');
    t.integer('quantity').defaultTo(1);
    t.float('unit_price');
    t.string('note');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });
  await knex.schema.createTable('order_item_modifier', (t) => {
    t.increments('id').primary();
    t.integer('order_item_id').references('id').inTable('order_items');
    t.integer('modifier_id').references('id').inTable('modifiers');
    t.float('extra_price').defaultTo(0);
  });
  await knex.schema.createTable('payments', (t) => {
    t.increments('id').primary();
    t.integer('order_id').references('id').inTable('orders');
    t.string('payment_type');
    t.float('amount');
    t.string('transaction_ref');
    t.datetime('paid_at').defaultTo(knex.fn.now());
  });
  await knex.schema.createTable('stock_items', (t) => {
    t.increments('id').primary();
    t.integer('branch_id');
    t.string('name');
    t.string('sku');
    t.float('quantity').defaultTo(0);
    t.string('unit');
    t.float('min_threshold').defaultTo(0);
  });
  await knex.schema.createTable('recipes', (t) => {
    t.increments('id').primary();
    t.integer('menu_item_id').references('id').inTable('menu_items');
    t.integer('stock_item_id').references('id').inTable('stock_items');
    t.float('qty_per_serving');
  });
  await knex.schema.createTable('stock_movements', (t) => {
    t.increments('id').primary();
    t.integer('stock_item_id').references('id').inTable('stock_items');
    t.float('change');
    t.string('reason');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });
  await knex.schema.createTable('settings', (t) => {
    t.increments('id').primary();
    t.string('key').unique();
    t.string('value');
  });
  await knex.schema.createTable('audit_logs', (t) => {
    t.increments('id').primary();
    t.integer('user_id');
    t.string('action');
    t.text('meta');
    t.datetime('created_at').defaultTo(knex.fn.now());
  });
  await knex.schema.createTable('sync_logs', (t) => {
    t.increments('id').primary();
    t.string('table_name');
    t.integer('record_id');
    t.string('operation');
    t.text('payload');
    t.integer('synced').defaultTo(0);
    t.datetime('created_at').defaultTo(knex.fn.now());
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  await knex.schema
    .dropTableIfExists('sync_logs')
    .dropTableIfExists('audit_logs')
    .dropTableIfExists('settings')
    .dropTableIfExists('stock_movements')
    .dropTableIfExists('recipes')
    .dropTableIfExists('stock_items')
    .dropTableIfExists('payments')
    .dropTableIfExists('order_item_modifier')
    .dropTableIfExists('order_items')
    .dropTableIfExists('orders')
    .dropTableIfExists('modifiers')
    .dropTableIfExists('menu_items')
    .dropTableIfExists('categories')
    .dropTableIfExists('tables')
    .dropTableIfExists('branches')
    .dropTableIfExists('users');
};
