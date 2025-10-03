const knex = require('knex');
const config = require('../../knexfile');

const db = knex(config[process.env.NODE_ENV || 'development']);

async function initializeDatabase() {
  try {
    // Run migrations
    await db.migrate.latest();
    console.log('✅ Database migrations completed');
    
    // Run seeds if in development
    if (process.env.NODE_ENV === 'development') {
      const seedCount = await db.seed.run();
      if (seedCount.length > 0) {
        console.log('✅ Database seeded with initial data');
      }
    }
    
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