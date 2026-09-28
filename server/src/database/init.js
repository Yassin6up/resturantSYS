const knex = require('knex');
const config = require('../../knexfile');

const db = knex(config[process.env.NODE_ENV || 'development']);

async function applyMultiTenantSchema() {
  try {
    const branchColumns = [
      ['owner_id', table => table.integer('owner_id').unsigned()], ['phone', table => table.string('phone')],
      ['email', table => table.string('email')], ['logo_url', table => table.string('logo_url')],
      ['settings', table => table.text('settings')], ['is_active', table => table.boolean('is_active').defaultTo(true)],
      ['website', table => table.string('website')], ['description', table => table.text('description')]
    ];
    for (const [name, add] of branchColumns) if (!(await db.schema.hasColumn('branches', name))) await db.schema.table('branches', add);
    const userColumns = [
      ['branch_id', table => table.integer('branch_id').unsigned()], ['email', table => table.string('email')],
      ['phone', table => table.string('phone')], ['salary', table => table.decimal('salary', 10, 2)], ['hire_date', table => table.date('hire_date')]
    ];
    for (const [name, add] of userColumns) if (!(await db.schema.hasColumn('users', name))) await db.schema.table('users', add);
  } catch (error) {
    console.log('⚠️ Multi-tenant schema check skipped:', error.message);
  }
}

async function applyCategorySchema() {
  try {
    if (!(await db.schema.hasColumn('categories', 'description'))) {
      console.log('📦 Applying category schema updates...');
      
      await db.schema.table('categories', table => {
        table.text('description');
        table.boolean('is_active').defaultTo(true);
      });
      
      console.log('✅ Category schema applied');
    }
  } catch (error) {
    console.log('⚠️ Category schema check skipped:', error.message);
  }
}

async function initializeDatabase() {
  try {
    // Apply pending migrations on both new and existing installations.
    await db.migrate.latest();
    // Apply multi-tenant schema updates
    await applyMultiTenantSchema();
    
    // Apply category schema updates
    await applyCategorySchema();
    
    // Run seeds if in development
    // if (process.env.NODE_ENV === 'development') {
    //   const seedCount = await db.seed.run();
    //   if (seedCount.length > 0) {
    //     console.log('✅ Database seeded with initial data');
    //   }
    // }
    
    return db;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

module.exports = {
  db,
  initializeDatabase
};
