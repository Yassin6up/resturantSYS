// CommonJS-style requires so Jest can run without ESM config
const dotenv = require('dotenv/config');
const { initDb, runMigrations, getDb } = require('../../utils/db.js');

// Since index.js starts the server immediately, we cannot import app directly.
// For brevity here, we will just test DB presence and seed sanity.

describe('DB sanity', () => {
  it('has branches and menu', async () => {
    await initDb();
    await runMigrations();
    const db = getDb();
    const branches = await db('branches');
    expect(branches.length).toBeGreaterThan(0);
    const items = await db('menu_items');
    expect(items.length).toBeGreaterThan(0);
  });
});
