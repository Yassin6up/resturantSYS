exports.up = async function (knex) {
  if (!(await knex.schema.hasTable('plans'))) await knex.schema.createTable('plans', table => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.integer('base_price_cents').notNullable();
    table.string('currency').defaultTo('usd');
    table.string('interval').defaultTo('month'); // month | year
    table.string('stripe_product_id'); // Stripe Product this plan maps to
    table.string('stripe_price_id'); // Stripe Price for the base amount
    table.text('features_json');
    table.boolean('active').defaultTo(true);
    table.timestamps(true, true);
  });

  const branchColumns = [
    ['plan_id', table => table.integer('plan_id').unsigned()],
    ['custom_price_cents', table => table.integer('custom_price_cents')],
    ['stripe_customer_id', table => table.string('stripe_customer_id')],
    ['stripe_subscription_id', table => table.string('stripe_subscription_id')],
    ['subscription_status', table => table.string('subscription_status')],
    ['subscription_status_changed_at', table => table.timestamp('subscription_status_changed_at').nullable()],
    ['trial_ends_at', table => table.timestamp('trial_ends_at').nullable()],
    ['current_period_end', table => table.timestamp('current_period_end').nullable()]
  ];
  for (const [name, add] of branchColumns) {
    if (!(await knex.schema.hasColumn('branches', name))) await knex.schema.table('branches', add);
  }
  if (await knex.schema.hasColumn('branches', 'plan_id')) {
    try { await knex.schema.table('branches', table => table.foreign('plan_id').references('id').inTable('plans').onDelete('SET NULL')); } catch (_) {}
  }

  if (!(await knex.schema.hasTable('subscription_events'))) await knex.schema.createTable('subscription_events', table => {
    table.increments('id').primary();
    table.integer('branch_id').unsigned();
    table.string('stripe_event_id').unique().notNullable();
    table.string('type').notNullable();
    table.text('payload');
    table.timestamp('created_at').nullable().defaultTo(knex.fn.now());
    table.foreign('branch_id').references('id').inTable('branches').onDelete('SET NULL');
  });

  if (!(await knex.schema.hasTable('platform_invoices'))) await knex.schema.createTable('platform_invoices', table => {
    table.increments('id').primary();
    table.integer('branch_id').unsigned().notNullable();
    table.string('stripe_invoice_id').unique();
    table.integer('amount_cents').notNullable();
    table.string('currency').defaultTo('usd');
    table.string('status'); // draft | open | paid | uncollectible | void
    table.string('hosted_invoice_url');
    table.timestamp('period_start').nullable();
    table.timestamp('period_end').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.foreign('branch_id').references('id').inTable('branches').onDelete('CASCADE');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('platform_invoices');
  await knex.schema.dropTableIfExists('subscription_events');
  await knex.schema.table('branches', table => {
    table.dropColumn('plan_id');
    table.dropColumn('custom_price_cents');
    table.dropColumn('stripe_customer_id');
    table.dropColumn('stripe_subscription_id');
    table.dropColumn('subscription_status');
    table.dropColumn('subscription_status_changed_at');
    table.dropColumn('trial_ends_at');
    table.dropColumn('current_period_end');
  });
  await knex.schema.dropTableIfExists('plans');
};
