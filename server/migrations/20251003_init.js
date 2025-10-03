/** @param {import('knex').Knex} knex */
export async function up(knex) {
  if (knex.client.config.client === 'sqlite3') {
    await knex.raw('PRAGMA foreign_keys = ON');
  }

  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('username').unique().notNullable();
    t.string('password_hash').notNullable();
    t.string('full_name');
    t.string('role').notNullable();
    t.string('pin');
    t.boolean('is_active').defaultTo(1);
    t.dateTime('created_at').defaultTo(knex.fn.now());
    t.dateTime('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('branches', (t) => {
    t.increments('id').primary();
    t.string('name').notNullable();
    t.string('code').unique();
    t.string('address');
    t.dateTime('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('tables', (t) => {
    t.increments('id').primary();
    t.integer('branch_id').references('branches.id');
    t.string('table_number').notNullable();
    t.string('qr_code');
    t.string('description');
    t.dateTime('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('categories', (t) => {
    t.increments('id').primary();
    t.integer('branch_id').references('branches.id');
    t.string('name').notNullable();
    t.integer('position').defaultTo(0);
    t.dateTime('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('menu_items', (t) => {
    t.increments('id').primary();
    t.integer('branch_id').references('branches.id');
    t.integer('category_id').references('categories.id');
    t.string('sku');
    t.string('name').notNullable();
    t.string('description');
    t.decimal('price').notNullable();
    t.string('image');
    t.boolean('is_available').defaultTo(1);
    t.dateTime('created_at').defaultTo(knex.fn.now());
    t.dateTime('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('modifiers', (t) => {
    t.increments('id').primary();
    t.integer('menu_item_id').references('menu_items.id');
    t.string('name');
    t.decimal('extra_price').defaultTo(0);
  });

  await knex.schema.createTable('orders', (t) => {
    t.increments('id').primary();
    t.integer('branch_id');
    t.string('order_code').unique();
    t.integer('table_id').references('tables.id');
    t.string('customer_name');
    t.decimal('total');
    t.decimal('tax').defaultTo(0);
    t.decimal('service_charge').defaultTo(0);
    t.string('status').defaultTo('PENDING');
    t.string('payment_status').defaultTo('UNPAID');
    t.dateTime('created_at').defaultTo(knex.fn.now());
    t.dateTime('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('order_items', (t) => {
    t.increments('id').primary();
    t.integer('order_id').references('orders.id');
    t.integer('menu_item_id').references('menu_items.id');
    t.integer('quantity').defaultTo(1);
    t.decimal('unit_price');
    t.string('note');
    t.dateTime('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('order_item_modifier', (t) => {
    t.increments('id').primary();
    t.integer('order_item_id').references('order_items.id');
    t.integer('modifier_id').references('modifiers.id');
    t.decimal('extra_price').defaultTo(0);
  });

  await knex.schema.createTable('payments', (t) => {
    t.increments('id').primary();
    t.integer('order_id').references('orders.id');
    t.string('payment_type');
    t.decimal('amount');
    t.string('transaction_ref');
    t.dateTime('paid_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('stock_items', (t) => {
    t.increments('id').primary();
    t.integer('branch_id').references('branches.id');
    t.string('name');
    t.string('sku');
    t.decimal('quantity').defaultTo(0);
    t.string('unit');
    t.decimal('min_threshold').defaultTo(0);
  });

  await knex.schema.createTable('recipes', (t) => {
    t.increments('id').primary();
    t.integer('menu_item_id').references('menu_items.id');
    t.integer('stock_item_id').references('stock_items.id');
    t.decimal('qty_per_serving');
  });

  await knex.schema.createTable('stock_movements', (t) => {
    t.increments('id').primary();
    t.integer('stock_item_id').references('stock_items.id');
    t.decimal('change');
    t.string('reason');
    t.dateTime('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('settings', (t) => {
    t.increments('id').primary();
    t.string('key').unique();
    t.text('value');
  });

  await knex.schema.createTable('audit_logs', (t) => {
    t.increments('id').primary();
    t.integer('user_id');
    t.string('action');
    t.text('meta');
    t.dateTime('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('sync_logs', (t) => {
    t.increments('id').primary();
    t.string('table_name');
    t.integer('record_id');
    t.string('operation');
    t.text('payload');
    t.boolean('synced').defaultTo(0);
    t.dateTime('created_at').defaultTo(knex.fn.now());
  });
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  const tables = [
    'sync_logs','audit_logs','settings','stock_movements','recipes','stock_items','payments','order_item_modifier','order_items','orders','modifiers','menu_items','categories','tables','branches','users'
  ];
  for (const t of tables) {
    await knex.schema.dropTableIfExists(t);
  }
}
