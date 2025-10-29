const { db } = require('../database/init');

async function ensureVariantsTable() {
  try {
    const hasVariantsTable = await db.schema.hasTable('product_variants');
    
    if (!hasVariantsTable) {
      console.log('Creating product_variants table...');
      await db.schema.createTable('product_variants', table => {
        table.increments('id').primary();
        table.integer('menu_item_id').unsigned().notNullable();
        table.string('name').notNullable();
        table.decimal('price_adjustment', 10, 2).defaultTo(0);
        table.integer('sort_order').defaultTo(0);
        table.boolean('is_active').defaultTo(true);
        table.timestamps(true, true);
        table.foreign('menu_item_id').references('id').inTable('menu_items').onDelete('CASCADE');
      });
      console.log('✅ product_variants table created');
    }

    const hasOrderType = await db.schema.hasColumn('orders', 'order_type');
    if (!hasOrderType) {
      console.log('Adding order_type to orders table...');
      await db.schema.table('orders', table => {
        table.string('order_type').defaultTo('DINE_IN');
      });
    }

    const hasAmountPaid = await db.schema.hasColumn('orders', 'amount_paid');
    if (!hasAmountPaid) {
      console.log('Adding payment fields to orders table...');
      await db.schema.table('orders', table => {
        table.decimal('amount_paid', 10, 2);
        table.decimal('change_amount', 10, 2);
        table.string('delivery_address');
        table.string('customer_phone');
      });
    }

    const hasVariantId = await db.schema.hasColumn('order_items', 'variant_id');
    if (!hasVariantId) {
      console.log('Adding variant fields to order_items table...');
      await db.schema.table('order_items', table => {
        table.integer('variant_id').unsigned();
        table.string('variant_name');
        table.decimal('variant_price', 10, 2);
      });
    }

    console.log('✅ All required tables and columns exist');
    return true;
  } catch (error) {
    console.error('Error ensuring variants table:', error);
    return false;
  }
}

module.exports = { ensureVariantsTable };
