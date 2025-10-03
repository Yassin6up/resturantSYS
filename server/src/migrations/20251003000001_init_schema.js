/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Enable foreign keys for SQLite
  if (knex.client.config.client === 'sqlite3') {
    await knex.raw('PRAGMA foreign_keys = ON');
  }

  // Users & Roles
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('username').unique().notNullable();
    table.string('password_hash').notNullable();
    table.string('full_name');
    table.enum('role', ['admin', 'manager', 'cashier', 'kitchen', 'waiter']).notNullable();
    table.string('pin', 6);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Branches (for multi-branch support)
  await knex.schema.createTable('branches', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('code').unique();
    table.text('address');
    table.string('phone');
    table.string('email');
    table.timestamps(true, true);
  });

  // Tables
  await knex.schema.createTable('tables', (table) => {
    table.increments('id').primary();
    table.integer('branch_id').unsigned().references('id').inTable('branches').onDelete('CASCADE');
    table.string('table_number').notNullable();
    table.text('qr_code');
    table.text('description');
    table.integer('capacity').defaultTo(4);
    table.timestamps(true, true);
    table.unique(['branch_id', 'table_number']);
  });

  // Categories
  await knex.schema.createTable('categories', (table) => {
    table.increments('id').primary();
    table.integer('branch_id').unsigned().references('id').inTable('branches').onDelete('CASCADE');
    table.string('name').notNullable();
    table.text('description');
    table.string('image');
    table.integer('position').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Menu Items
  await knex.schema.createTable('menu_items', (table) => {
    table.increments('id').primary();
    table.integer('branch_id').unsigned().references('id').inTable('branches').onDelete('CASCADE');
    table.integer('category_id').unsigned().references('id').inTable('categories').onDelete('CASCADE');
    table.string('sku').unique();
    table.string('name').notNullable();
    table.text('description');
    table.decimal('price', 10, 2).notNullable();
    table.string('image');
    table.boolean('is_available').defaultTo(true);
    table.integer('prep_time').defaultTo(15); // minutes
    table.json('allergens'); // JSON array of allergen info
    table.timestamps(true, true);
  });

  // Modifiers
  await knex.schema.createTable('modifiers', (table) => {
    table.increments('id').primary();
    table.integer('menu_item_id').unsigned().references('id').inTable('menu_items').onDelete('CASCADE');
    table.string('name').notNullable();
    table.decimal('extra_price', 10, 2).defaultTo(0);
    table.boolean('is_required').defaultTo(false);
    table.timestamps(true, true);
  });

  // Orders
  await knex.schema.createTable('orders', (table) => {
    table.increments('id').primary();
    table.integer('branch_id').unsigned().references('id').inTable('branches').onDelete('CASCADE');
    table.string('order_code').unique().notNullable();
    table.integer('table_id').unsigned().references('id').inTable('tables').onDelete('SET NULL');
    table.string('customer_name');
    table.string('customer_phone');
    table.decimal('subtotal', 10, 2).defaultTo(0);
    table.decimal('tax', 10, 2).defaultTo(0);
    table.decimal('service_charge', 10, 2).defaultTo(0);
    table.decimal('total', 10, 2).defaultTo(0);
    table.enum('status', ['DRAFT', 'SUBMITTED', 'AWAITING_PAYMENT', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED']).defaultTo('SUBMITTED');
    table.enum('payment_status', ['UNPAID', 'PARTIAL', 'PAID', 'REFUNDED']).defaultTo('UNPAID');
    table.enum('payment_method', ['CASH', 'CARD', 'ONLINE']).defaultTo('CASH');
    table.text('notes');
    table.timestamps(true, true);
  });

  // Order Items
  await knex.schema.createTable('order_items', (table) => {
    table.increments('id').primary();
    table.integer('order_id').unsigned().references('id').inTable('orders').onDelete('CASCADE');
    table.integer('menu_item_id').unsigned().references('id').inTable('menu_items').onDelete('CASCADE');
    table.integer('quantity').defaultTo(1);
    table.decimal('unit_price', 10, 2).notNullable();
    table.text('notes');
    table.timestamps(true, true);
  });

  // Order Item Modifiers
  await knex.schema.createTable('order_item_modifiers', (table) => {
    table.increments('id').primary();
    table.integer('order_item_id').unsigned().references('id').inTable('order_items').onDelete('CASCADE');
    table.integer('modifier_id').unsigned().references('id').inTable('modifiers').onDelete('CASCADE');
    table.decimal('extra_price', 10, 2).defaultTo(0);
    table.timestamps(true, true);
  });

  // Payments
  await knex.schema.createTable('payments', (table) => {
    table.increments('id').primary();
    table.integer('order_id').unsigned().references('id').inTable('orders').onDelete('CASCADE');
    table.enum('payment_type', ['CASH', 'CARD', 'ONLINE']).notNullable();
    table.decimal('amount', 10, 2).notNullable();
    table.string('transaction_ref');
    table.string('gateway'); // stripe, cmi, etc.
    table.json('gateway_response');
    table.integer('processed_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);
  });

  // Stock Items
  await knex.schema.createTable('stock_items', (table) => {
    table.increments('id').primary();
    table.integer('branch_id').unsigned().references('id').inTable('branches').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('sku').unique();
    table.decimal('quantity', 10, 3).defaultTo(0);
    table.string('unit').defaultTo('pcs'); // pcs, kg, liter, etc.
    table.decimal('min_threshold', 10, 3).defaultTo(0);
    table.decimal('cost_per_unit', 10, 2).defaultTo(0);
    table.timestamps(true, true);
  });

  // Recipes (Menu Item -> Stock Items mapping)
  await knex.schema.createTable('recipes', (table) => {
    table.increments('id').primary();
    table.integer('menu_item_id').unsigned().references('id').inTable('menu_items').onDelete('CASCADE');
    table.integer('stock_item_id').unsigned().references('id').inTable('stock_items').onDelete('CASCADE');
    table.decimal('qty_per_serving', 10, 3).notNullable();
    table.timestamps(true, true);
    table.unique(['menu_item_id', 'stock_item_id']);
  });

  // Stock Movements
  await knex.schema.createTable('stock_movements', (table) => {
    table.increments('id').primary();
    table.integer('stock_item_id').unsigned().references('id').inTable('stock_items').onDelete('CASCADE');
    table.decimal('change', 10, 3).notNullable(); // positive for addition, negative for consumption
    table.enum('reason', ['PURCHASE', 'CONSUMPTION', 'ADJUSTMENT', 'WASTE']).notNullable();
    table.string('reference'); // order_id, purchase_id, etc.
    table.text('notes');
    table.integer('created_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);
  });

  // Settings
  await knex.schema.createTable('settings', (table) => {
    table.increments('id').primary();
    table.string('key').unique().notNullable();
    table.text('value');
    table.text('description');
    table.enum('type', ['string', 'number', 'boolean', 'json']).defaultTo('string');
    table.timestamps(true, true);
  });

  // Audit Logs
  await knex.schema.createTable('audit_logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.string('action').notNullable();
    table.string('table_name');
    table.integer('record_id');
    table.json('meta');
    table.string('ip_address');
    table.timestamps(true, true);
  });

  // Sync Logs (for hybrid LOCAL/CLOUD sync)
  await knex.schema.createTable('sync_logs', (table) => {
    table.increments('id').primary();
    table.string('table_name').notNullable();
    table.integer('record_id').notNullable();
    table.enum('operation', ['CREATE', 'UPDATE', 'DELETE']).notNullable();
    table.json('payload');
    table.boolean('synced').defaultTo(false);
    table.timestamp('synced_at');
    table.timestamps(true, true);
  });

  // Printers
  await knex.schema.createTable('printers', (table) => {
    table.increments('id').primary();
    table.integer('branch_id').unsigned().references('id').inTable('branches').onDelete('CASCADE');
    table.string('name').notNullable();
    table.enum('type', ['NETWORK', 'USB', 'BLUETOOTH']).notNullable();
    table.string('connection_string'); // IP:port, USB path, etc.
    table.json('categories'); // JSON array of category IDs to print
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const tables = [
    'sync_logs', 'audit_logs', 'settings', 'stock_movements', 'recipes', 
    'stock_items', 'payments', 'order_item_modifiers', 'order_items', 
    'orders', 'modifiers', 'menu_items', 'categories', 'tables', 
    'branches', 'users', 'printers'
  ];
  
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
};