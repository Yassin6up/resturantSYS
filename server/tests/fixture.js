const bcrypt = require('bcryptjs');
const { db } = require('../src/database/init');
module.exports = async function fixture() {
  await db.migrate.latest();
  await db('branches').insert([
    { id: 1, name: 'Test Restaurant', code: 'TEST', slug: 'test-restaurant', business_type: 'restaurant', is_active: true },
    { id: 2, name: 'Test Store', code: 'SHOP', slug: 'test-store', business_type: 'ecommerce', is_active: true }
  ]);
  await db('users').insert([
    { id: 1, username: 'admin', password_hash: await bcrypt.hash('admin123', 4), role: 'admin', branch_id: 1, is_active: true },
    { id: 2, username: 'cashier1', password_hash: await bcrypt.hash('cashier123', 4), pin: '5678', role: 'cashier', branch_id: 1, is_active: true }
  ]);
  await db('tables').insert({ id: 1, branch_id: 1, table_number: 'T1', capacity: 4, is_active: true });
  await db('categories').insert([{ id: 1, branch_id: 1, name: 'Menu' }, { id: 2, branch_id: 2, name: 'Products' }]);
  await db('menu_items').insert([
    { id: 1, branch_id: 1, category_id: 1, name: 'Lunch', price: 100, is_available: true },
    { id: 2, branch_id: 2, category_id: 2, name: 'Shirt', price: 200, is_available: true }
  ]);
  await db('product_variants').insert({ id: 1, menu_item_id: 2, name: 'Large', price_adjustment: 25, is_active: true });
  await db('services').insert({ id: 1, branch_id: 1, name: 'Consultation', price: 50, duration_minutes: 30, is_active: true });
  await db('business_hours').insert(Array.from({length: 7}, (_, day_of_week) => ({ branch_id: 1, day_of_week, is_open: true, open_time: '09:00', close_time: '18:00' })));
};
