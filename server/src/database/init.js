const knex = require('knex');
const config = require('../../knexfile');

const db = knex(config[process.env.NODE_ENV || 'development']);

async function initializeDatabase() {
  try {
    // Check if migrations table exists (indicating migrations have run before)
    const hasMigrationsTable = await db.schema.hasTable('knex_migrations');
    
    if (!hasMigrationsTable) {
      // Run migrations only if they haven't run before
      await db.migrate.latest();
      console.log('✅ Database migrations completed');
    } else {
      console.log('✅ Database already initialized, skipping migrations');
    }
    
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