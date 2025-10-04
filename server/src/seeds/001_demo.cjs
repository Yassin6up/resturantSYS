/** @param {import('knex').Knex} knex */
const bcrypt = require('bcrypt');
exports.seed = async function seed(knex) {
  // Delete in reverse order to respect foreign key constraints
  try {
    await knex('order_item_modifier').del();
  } catch (e) { /* table doesn't exist */ }
  
  try {
    await knex('order_items').del();
  } catch (e) { /* table doesn't exist */ }
  
  try {
    await knex('payments').del();
  } catch (e) { /* table doesn't exist */ }
  
  try {
    await knex('orders').del();
  } catch (e) { /* table doesn't exist */ }
  
  try {
    await knex('modifiers').del();
  } catch (e) { /* table doesn't exist */ }
  
  try {
    await knex('menu_items').del();
  } catch (e) { /* table doesn't exist */ }
  
  try {
    await knex('categories').del();
  } catch (e) { /* table doesn't exist */ }
  
  try {
    await knex('tables').del();
  } catch (e) { /* table doesn't exist */ }
  
  try {
    await knex('branches').del();
  } catch (e) { /* table doesn't exist */ }
  
  try {
    await knex('users').del();
  } catch (e) { /* table doesn't exist */ }

  const [branchId] = await knex('branches').insert({ name: 'Casablanca', code: 'CAS', address: 'Bd Mohammed V' });
  const tables = Array.from({ length: 8 }).map((_, i) => ({ branch_id: branchId, table_number: `T${i + 1}` }));
  await knex('tables').insert(tables);

  const catIds = await knex('categories')
    .insert([
      { branch_id: branchId, name: 'Tagines', position: 1 },
      { branch_id: branchId, name: 'Couscous', position: 2 },
      { branch_id: branchId, name: 'Drinks', position: 3 }
    ])
    .returning('id');
  const [c1, c2, c3] = catIds.map((x) => (typeof x === 'number' ? x : x.id));

  const menuIds = await knex('menu_items')
    .insert([
      { branch_id: branchId, category_id: c1, name: 'Tajine', price: 60 },
      { branch_id: branchId, category_id: c2, name: 'Couscous', price: 70 },
      { branch_id: branchId, category_id: c3, name: 'Orange Juice', price: 20 }
    ])
    .returning('id');
  const ids = menuIds.map((x) => (typeof x === 'number' ? x : x.id));

  await knex('modifiers').insert([
    { menu_item_id: ids[0], name: 'Extra olives', extra_price: 5 },
    { menu_item_id: ids[1], name: 'Chicken', extra_price: 10 },
    { menu_item_id: ids[2], name: 'No ice', extra_price: 0 }
  ]);

  const password_hash = await bcrypt.hash('admin123', 10);
  await knex('users').insert([{ username: 'admin', password_hash, full_name: 'Admin', role: 'admin', pin: '1234' }]);

  await knex('settings').insert([
    { key: 'mode', value: 'LOCAL' },
    { key: 'tax', value: '0' },
    { key: 'service_charge', value: '0' }
  ]);
};
