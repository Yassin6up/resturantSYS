exports.up = function(knex) {
  return knex.schema
    .createTable('users', table => {
      table.increments('id').primary();
      table.string('username').unique().notNullable();
      table.string('password_hash').notNullable();
      table.string('full_name');
      table.string('role').notNullable();
      table.string('pin');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })
    
    .createTable('branches', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('code').unique();
      table.text('address');
      table.timestamps(true, true);
    })
    
    .createTable('tables', table => {
      table.increments('id').primary();
      table.integer('branch_id').unsigned();
      table.string('table_number').notNullable();
      table.string('qr_code');
      table.text('description');
      table.timestamps(true, true);
      table.foreign('branch_id').references('id').inTable('branches');
    })
    
    .createTable('categories', table => {
      table.increments('id').primary();
      table.integer('branch_id').unsigned();
      table.string('name').notNullable();
      table.integer('position').defaultTo(0);
      table.timestamps(true, true);
      table.foreign('branch_id').references('id').inTable('branches');
    })
    
    .createTable('menu_items', table => {
      table.increments('id').primary();
      table.integer('branch_id').unsigned();
      table.integer('category_id').unsigned();
      table.string('sku');
      table.string('name').notNullable();
      table.text('description');
      table.decimal('price', 10, 2).notNullable();
      table.string('image');
      table.boolean('is_available').defaultTo(true);
      table.timestamps(true, true);
      table.foreign('branch_id').references('id').inTable('branches');
      table.foreign('category_id').references('id').inTable('categories');
    })
    
    .createTable('modifiers', table => {
      table.increments('id').primary();
      table.integer('menu_item_id').unsigned();
      table.string('name');
      table.decimal('extra_price', 10, 2).defaultTo(0);
      table.foreign('menu_item_id').references('id').inTable('menu_items');
    })
    
    .createTable('orders', table => {
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
    })
    
    .createTable('order_items', table => {
      table.increments('id').primary();
      table.integer('order_id').unsigned();
      table.integer('menu_item_id').unsigned();
      table.integer('quantity').defaultTo(1);
      table.decimal('unit_price', 10, 2);
      table.text('note');
      table.timestamps(true, true);
      table.foreign('order_id').references('id').inTable('orders');
      table.foreign('menu_item_id').references('id').inTable('menu_items');
    })
    
    .createTable('order_item_modifiers', table => {
      table.increments('id').primary();
      table.integer('order_item_id').unsigned();
      table.integer('modifier_id').unsigned();
      table.decimal('extra_price', 10, 2).defaultTo(0);
      table.foreign('order_item_id').references('id').inTable('order_items');
      table.foreign('modifier_id').references('id').inTable('modifiers');
    })
    
    .createTable('payments', table => {
      table.increments('id').primary();
      table.integer('order_id').unsigned();
      table.string('payment_type');
      table.decimal('amount', 10, 2);
      table.string('transaction_ref');
      table.timestamp('paid_at').defaultTo(knex.fn.now());
      table.foreign('order_id').references('id').inTable('orders');
    })
    
    .createTable('stock_items', table => {
      table.increments('id').primary();
      table.integer('branch_id').unsigned();
      table.string('name');
      table.string('sku');
      table.decimal('quantity', 10, 2).defaultTo(0);
      table.string('unit');
      table.decimal('min_threshold', 10, 2).defaultTo(0);
      table.timestamps(true, true);
      table.foreign('branch_id').references('id').inTable('branches');
    })
    
    .createTable('recipes', table => {
      table.increments('id').primary();
      table.integer('menu_item_id').unsigned();
      table.integer('stock_item_id').unsigned();
      table.decimal('qty_per_serving', 10, 2);
      table.foreign('menu_item_id').references('id').inTable('menu_items');
      table.foreign('stock_item_id').references('id').inTable('stock_items');
    })
    
    .createTable('stock_movements', table => {
      table.increments('id').primary();
      table.integer('stock_item_id').unsigned();
      table.decimal('change', 10, 2);
      table.string('reason');
      table.timestamps(true, true);
      table.foreign('stock_item_id').references('id').inTable('stock_items');
    })
    
    .createTable('settings', table => {
      table.increments('id').primary();
      table.string('key').unique();
      table.text('value');
      table.timestamps(true, true);
    })
    
    .createTable('audit_logs', table => {
      table.increments('id').primary();
      table.integer('user_id').unsigned();
      table.string('action');
      table.text('meta');
      table.timestamps(true, true);
      table.foreign('user_id').references('id').inTable('users');
    })
    
    .createTable('sync_logs', table => {
      table.increments('id').primary();
      table.string('table_name');
      table.integer('record_id');
      table.string('operation');
      table.text('payload');
      table.boolean('synced').defaultTo(false);
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('sync_logs')
    .dropTableIfExists('audit_logs')
    .dropTableIfExists('settings')
    .dropTableIfExists('stock_movements')
    .dropTableIfExists('recipes')
    .dropTableIfExists('stock_items')
    .dropTableIfExists('payments')
    .dropTableIfExists('order_item_modifiers')
    .dropTableIfExists('order_items')
    .dropTableIfExists('orders')
    .dropTableIfExists('modifiers')
    .dropTableIfExists('menu_items')
    .dropTableIfExists('categories')
    .dropTableIfExists('tables')
    .dropTableIfExists('branches')
    .dropTableIfExists('users');
};