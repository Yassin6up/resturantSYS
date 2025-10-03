// Test setup file
const db = require('../src/database/connection');

beforeAll(async () => {
  // Run migrations for test database
  await db.migrate.latest();
});

afterAll(async () => {
  // Clean up test database
  await db.destroy();
});

// Increase timeout for database operations
jest.setTimeout(10000);