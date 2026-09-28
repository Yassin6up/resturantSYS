exports.up = async function (knex) {
  await knex.schema.createTable('customers', table => {
    table.increments('id').primary();
    table.integer('branch_id').unsigned().notNullable();
    table.string('phone').notNullable();
    table.string('name');
    table.string('email');
    table.date('birthday');
    table.string('password_hash');
    table.integer('points_balance').defaultTo(0);
    table.integer('lifetime_points').defaultTo(0);
    table.decimal('total_spent', 10, 2).defaultTo(0);
    table.integer('visits').defaultTo(0);
    table.timestamp('last_visit_at');
    table.boolean('marketing_consent').defaultTo(false);
    table.timestamps(true, true);
    table.foreign('branch_id').references('id').inTable('branches').onDelete('CASCADE');
    table.unique(['branch_id', 'phone']);
  });

  await knex.schema.createTable('loyalty_settings', table => {
    table.integer('branch_id').unsigned().primary();
    table.boolean('enabled').defaultTo(true);
    table.string('earn_mode').defaultTo('per_amount'); // 'per_amount' | 'per_item'
    table.decimal('amount_per_point', 10, 2).defaultTo(10); // e.g. 1 point per 10 currency units
    table.integer('min_redeem_points').defaultTo(0);
    table.integer('points_expiry_days');
    table.integer('welcome_bonus').defaultTo(0);
    table.integer('birthday_bonus').defaultTo(0);
    table.timestamps(true, true);
    table.foreign('branch_id').references('id').inTable('branches').onDelete('CASCADE');
  });

  await knex.schema.createTable('rewards', table => {
    table.increments('id').primary();
    table.integer('branch_id').unsigned().notNullable();
    table.string('name').notNullable();
    table.string('type').notNullable(); // 'free_item' | 'amount_off' | 'percent_off'
    table.integer('menu_item_id').unsigned();
    table.decimal('value', 10, 2).defaultTo(0); // amount or percent, ignored for free_item
    table.integer('points_cost').notNullable();
    table.boolean('active').defaultTo(true);
    table.integer('stock_limit');
    table.integer('redeemed_count').defaultTo(0);
    table.timestamps(true, true);
    table.foreign('branch_id').references('id').inTable('branches').onDelete('CASCADE');
    table.foreign('menu_item_id').references('id').inTable('menu_items').onDelete('SET NULL');
  });

  await knex.schema.createTable('loyalty_ledger', table => {
    table.increments('id').primary();
    table.integer('branch_id').unsigned().notNullable();
    table.integer('customer_id').unsigned().notNullable();
    table.integer('order_id').unsigned();
    table.string('type').notNullable(); // 'earn' | 'redeem' | 'adjust' | 'reverse'
    table.integer('points').notNullable(); // signed
    table.integer('balance_after').notNullable();
    table.integer('staff_user_id').unsigned();
    table.string('note');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.foreign('branch_id').references('id').inTable('branches').onDelete('CASCADE');
    table.foreign('customer_id').references('id').inTable('customers').onDelete('CASCADE');
    table.foreign('order_id').references('id').inTable('orders').onDelete('SET NULL');
  });

  await knex.schema.table('menu_items', table => {
    table.integer('loyalty_points'); // fixed points awarded for buying this item (earn_mode = per_item)
  });

  await knex.schema.table('orders', table => {
    table.integer('customer_id').unsigned();
    table.integer('redeemed_reward_id').unsigned();
    table.decimal('loyalty_discount', 10, 2).defaultTo(0);
    table.integer('loyalty_points_earned').defaultTo(0);
    table.boolean('loyalty_processed').defaultTo(false);
    table.foreign('customer_id').references('id').inTable('customers').onDelete('SET NULL');
    table.foreign('redeemed_reward_id').references('id').inTable('rewards').onDelete('SET NULL');
  });
};

exports.down = async function (knex) {
  await knex.schema.table('orders', table => {
    table.dropColumn('customer_id');
    table.dropColumn('redeemed_reward_id');
    table.dropColumn('loyalty_discount');
    table.dropColumn('loyalty_points_earned');
    table.dropColumn('loyalty_processed');
  });
  await knex.schema.table('menu_items', table => table.dropColumn('loyalty_points'));
  await knex.schema.dropTableIfExists('loyalty_ledger');
  await knex.schema.dropTableIfExists('rewards');
  await knex.schema.dropTableIfExists('loyalty_settings');
  await knex.schema.dropTableIfExists('customers');
};
