const { db } = require('./src/database/init');

async function updateSchema() {
  try {
    console.log('📦 Updating database schema...');
    
    const stockMovementsInfo = await db.raw("PRAGMA table_info('stock_movements')");
    const stockMovementsColumns = stockMovementsInfo.map(col => col.name);
    
    if (!stockMovementsColumns.includes('user_id')) {
      console.log('Adding user_id, order_id, and type columns to stock_movements...');
      await db.schema.table('stock_movements', table => {
        table.integer('user_id').unsigned();
        table.integer('order_id').unsigned();
        table.string('type').defaultTo('manual');
      });
      console.log('✅ stock_movements table updated');
    } else {
      console.log('✅ stock_movements table already has new columns');
    }
    
    const hasLowStockAlerts = await db.schema.hasTable('low_stock_alerts');
    if (!hasLowStockAlerts) {
      console.log('Creating low_stock_alerts table...');
      await db.schema.createTable('low_stock_alerts', table => {
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
      console.log('✅ low_stock_alerts table created');
    } else {
      console.log('✅ low_stock_alerts table already exists');
    }
    
    console.log('✅ Schema update completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Schema update failed:', error);
    process.exit(1);
  }
}

updateSchema();
