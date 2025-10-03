import bcrypt from 'bcrypt';

/** @param {import('knex').Knex} knex */
export async function seed(knex) {
  await knex('sync_logs').del();
  await knex('audit_logs').del();
  await knex('settings').del();
  await knex('stock_movements').del();
  await knex('recipes').del();
  await knex('stock_items').del();
  await knex('payments').del();
  await knex('order_item_modifier').del();
  await knex('order_items').del();
  await knex('orders').del();
  await knex('modifiers').del();
  await knex('menu_items').del();
  await knex('categories').del();
  await knex('tables').del();
  await knex('branches').del();
  await knex('users').del();

  const password_hash = await bcrypt.hash('admin123', 10);
  await knex('users').insert([{ username: 'admin', password_hash, full_name: 'Admin', role: 'admin', pin: '1234' }]);

  const [branchId] = await knex('branches').insert({ name: 'Casablanca', code: 'CAS', address: 'Casablanca, MA' });

  const tableRows = Array.from({ length: 8 }, (_, i) => ({ branch_id: branchId, table_number: `T${i + 1}` }));
  await knex('tables').insert(tableRows);

  const categories = [
    { branch_id: branchId, name: 'Mains', position: 1 },
    { branch_id: branchId, name: 'Sides', position: 2 },
    { branch_id: branchId, name: 'Drinks', position: 3 }
  ];
  await knex('categories').insert(categories);
  const cats = await knex('categories').where({ branch_id: branchId }).orderBy('position');
  const catMainsId = cats.find(c => c.name === 'Mains')?.id || cats[0]?.id;
  const catSidesId = cats.find(c => c.name === 'Sides')?.id || cats[1]?.id;
  const catDrinksId = cats.find(c => c.name === 'Drinks')?.id || cats[2]?.id;

  const items = [
    { branch_id: branchId, category_id: catMainsId, name: 'Tajine', price: 60, description: 'Moroccan tajine' },
    { branch_id: branchId, category_id: catMainsId, name: 'Couscous', price: 55, description: 'Classic couscous' },
    { branch_id: branchId, category_id: catSidesId, name: 'Bread Basket', price: 10 },
    { branch_id: branchId, category_id: catDrinksId, name: 'Orange Juice', price: 20 },
    { branch_id: branchId, category_id: catDrinksId, name: 'Mint Tea', price: 15 }
  ];
  await knex('menu_items').insert(items);
  const allItems = await knex('menu_items').where({ branch_id: branchId });
  const tajine = allItems.find(i => i.name === 'Tajine');
  const couscous = allItems.find(i => i.name === 'Couscous');
  const oj = allItems.find(i => i.name === 'Orange Juice');
  await knex('modifiers').insert([
    { menu_item_id: tajine?.id, name: 'Extra Olives', extra_price: 5 },
    { menu_item_id: couscous?.id, name: 'Spicy Harissa', extra_price: 3 },
    { menu_item_id: oj?.id, name: 'No Ice', extra_price: 0 }
  ]);

  await knex('settings').insert([
    { key: 'mode', value: 'LOCAL' },
    { key: 'tax', value: '0.1' },
    { key: 'service_charge', value: '0.05' }
  ]);
}
