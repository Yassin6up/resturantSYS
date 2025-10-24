const knex = require('knex');
const config = require('../../knexfile');

const db = knex(config[process.env.NODE_ENV || 'development']);

async function applyMultiTenantSchema() {
  try {
    // Check if multi-tenant columns exist, if not add them
    const branchesInfo = await db.raw("PRAGMA table_info('branches')");
    const branchesColumns = branchesInfo.map(col => col.name);
    
    if (!branchesColumns.includes('owner_id')) {
      console.log('📦 Applying multi-tenant schema updates...');
      
      // Add columns to branches table
      await db.schema.table('branches', table => {
        table.integer('owner_id').unsigned();
        table.string('phone');
        table.string('email');
        table.string('logo_url');
        table.text('settings');
        table.boolean('is_active').defaultTo(true);
      });
      
      // Add columns to users table
      const usersInfo = await db.raw("PRAGMA table_info('users')");
      const usersColumns = usersInfo.map(col => col.name);
      
      if (!usersColumns.includes('branch_id')) {
        await db.schema.table('users', table => {
          table.integer('branch_id').unsigned();
          table.string('email');
          table.string('phone');
          table.decimal('salary', 10, 2);
          table.date('hire_date');
        });
      }
      
      console.log('✅ Multi-tenant schema applied');
    }
    
    // Check for additional branch fields (website, description)
    if (!branchesColumns.includes('website')) {
      await db.schema.table('branches', table => {
        table.string('website');
        table.text('description');
      });
      console.log('✅ Branch extended fields applied');
    }
  } catch (error) {
    console.log('⚠️ Multi-tenant schema check skipped or already applied');
  }
}

async function applyCategorySchema() {
  try {
    // Check if category columns exist, if not add them
    const categoriesInfo = await db.raw("PRAGMA table_info('categories')");
    const categoriesColumns = categoriesInfo.map(col => col.name);
    
    if (!categoriesColumns.includes('description')) {
      console.log('📦 Applying category schema updates...');
      
      await db.schema.table('categories', table => {
        table.text('description');
        table.boolean('is_active').defaultTo(true);
      });
      
      console.log('✅ Category schema applied');
    }
  } catch (error) {
    console.log('⚠️ Category schema check skipped or already applied:', error.message);
  }
}

async function initializeDatabase() {
  try {
    // Check if migrations table exists (indicating migrations have run before)
    const hasMigrationsTable = await db.schema.hasTable('knex_migrations');
    
    if (!hasMigrationsTable) {
      // Run migrations only if they haven't run before
      await db.migrate.latest();
      console.log('✅ Database migrations completed');
    } else {
      console.log('✅ Database already initialized');
    }
    
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