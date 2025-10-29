exports.up = async function(knex) {
  await knex.schema.createTable('product_variants', table => {
    table.increments('id').primary();
    table.integer('menu_item_id').unsigned().notNullable();
    table.string('name').notNullable();
    table.decimal('price_adjustment', 10, 2).defaultTo(0);
    table.integer('sort_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    table.foreign('menu_item_id').references('id').inTable('menu_items').onDelete('CASCADE');
  });

  const hasOrderType = await knex.schema.hasColumn('orders', 'order_type');
  if (!hasOrderType) {
    await knex.schema.table('orders', table => {
      table.string('order_type').defaultTo('DINE_IN');
    });
  }

  const hasAmountPaid = await knex.schema.hasColumn('orders', 'amount_paid');
  if (!hasAmountPaid) {
    await knex.schema.table('orders', table => {
      table.decimal('amount_paid', 10, 2);
    });
  }

  const hasChangeAmount = await knex.schema.hasColumn('orders', 'change_amount');
  if (!hasChangeAmount) {
    await knex.schema.table('orders', table => {
      table.decimal('change_amount', 10, 2);
    });
  }

  const hasDeliveryAddress = await knex.schema.hasColumn('orders', 'delivery_address');
  if (!hasDeliveryAddress) {
    await knex.schema.table('orders', table => {
      table.string('delivery_address');
    });
  }

  const hasCustomerPhone = await knex.schema.hasColumn('orders', 'customer_phone');
  if (!hasCustomerPhone) {
    await knex.schema.table('orders', table => {
      table.string('customer_phone');
    });
  }

  const hasVariantId = await knex.schema.hasColumn('order_items', 'variant_id');
  if (!hasVariantId) {
    await knex.schema.table('order_items', table => {
      table.integer('variant_id').unsigned();
      table.string('variant_name');
      table.decimal('variant_price', 10, 2);
      table.foreign('variant_id').references('id').inTable('product_variants').onDelete('SET NULL');
    });
  }
};

exports.down = async function(knex) {
  const hasVariantId = await knex.schema.hasColumn('order_items', 'variant_id');
  if (hasVariantId) {
    await knex.schema.table('order_items', table => {
      table.dropForeign('variant_id');
      table.dropColumn('variant_id');
      table.dropColumn('variant_name');
      table.dropColumn('variant_price');
    });
  }

  const hasOrderType = await knex.schema.hasColumn('orders', 'order_type');
  if (hasOrderType) {
    await knex.schema.table('orders', table => {
      table.dropColumn('order_type');
    });
  }

  const hasAmountPaid = await knex.schema.hasColumn('orders', 'amount_paid');
  if (hasAmountPaid) {
    await knex.schema.table('orders', table => {
      table.dropColumn('amount_paid');
      table.dropColumn('change_amount');
      table.dropColumn('delivery_address');
      table.dropColumn('customer_phone');
    });
  }

  await knex.schema.dropTableIfExists('product_variants');
};
