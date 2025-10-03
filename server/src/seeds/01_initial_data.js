const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('sync_logs').del();
  await knex('audit_logs').del();
  await knex('settings').del();
  await knex('stock_movements').del();
  await knex('recipes').del();
  await knex('stock_items').del();
  await knex('payments').del();
  await knex('order_item_modifiers').del();
  await knex('order_items').del();
  await knex('orders').del();
  await knex('modifiers').del();
  await knex('menu_items').del();
  await knex('categories').del();
  await knex('tables').del();
  await knex('branches').del();
  await knex('users').del();

  // Insert seed entries
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  // Users
  await knex('users').insert([
    {
      id: 1,
      username: 'admin',
      password_hash: hashedPassword,
      full_name: 'System Administrator',
      role: 'admin',
      pin: '1234',
      is_active: true
    },
    {
      id: 2,
      username: 'cashier1',
      password_hash: await bcrypt.hash('cashier123', 12),
      full_name: 'Cashier One',
      role: 'cashier',
      pin: '5678',
      is_active: true
    },
    {
      id: 3,
      username: 'kitchen1',
      password_hash: await bcrypt.hash('kitchen123', 12),
      full_name: 'Kitchen Staff',
      role: 'kitchen',
      pin: '9999',
      is_active: true
    }
  ]);

  // Branches
  await knex('branches').insert([
    {
      id: 1,
      name: 'Casablanca Main',
      code: 'CAS',
      address: '123 Avenue Mohammed V, Casablanca, Morocco'
    }
  ]);

  // Tables
  const tables = [];
  for (let i = 1; i <= 12; i++) {
    tables.push({
      id: i,
      branch_id: 1,
      table_number: `T${i}`,
      qr_code: `https://posq.local/menu?table=T${i}&branch=CAS`,
      description: `Table ${i}`
    });
  }
  await knex('tables').insert(tables);

  // Categories
  await knex('categories').insert([
    { id: 1, branch_id: 1, name: 'Appetizers', position: 1 },
    { id: 2, branch_id: 1, name: 'Main Courses', position: 2 },
    { id: 3, branch_id: 1, name: 'Desserts', position: 3 },
    { id: 4, branch_id: 1, name: 'Beverages', position: 4 },
    { id: 5, branch_id: 1, name: 'Traditional Dishes', position: 5 }
  ]);

    // Menu Items
    await knex('menu_items').insert([
      // Appetizers
      { id: 1, branch_id: 1, category_id: 1, sku: 'APP001', name: 'Hummus', description: 'Creamy chickpea dip with olive oil', price: 25.00, image: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400&h=300&fit=crop', is_available: true },
      { id: 2, branch_id: 1, category_id: 1, sku: 'APP002', name: 'Baba Ganoush', description: 'Smoky eggplant dip', price: 28.00, image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop', is_available: true },
      { id: 3, branch_id: 1, category_id: 1, sku: 'APP003', name: 'Falafel Plate', description: 'Crispy chickpea balls with tahini', price: 35.00, image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop', is_available: true },
      
      // Main Courses
      { id: 4, branch_id: 1, category_id: 2, sku: 'MAIN001', name: 'Grilled Chicken', description: 'Marinated chicken breast with herbs', price: 85.00, image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400&h=300&fit=crop', is_available: true },
      { id: 5, branch_id: 1, category_id: 2, sku: 'MAIN002', name: 'Beef Kebab', description: 'Tender beef cubes with vegetables', price: 95.00, image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=300&fit=crop', is_available: true },
      { id: 6, branch_id: 1, category_id: 2, sku: 'MAIN003', name: 'Fish Tagine', description: 'Fresh fish with preserved lemons', price: 90.00, image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=300&fit=crop', is_available: true },
      
      // Traditional Dishes
      { id: 7, branch_id: 1, category_id: 5, sku: 'TRAD001', name: 'Couscous Royal', description: 'Traditional couscous with lamb and vegetables', price: 120.00, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop', is_available: true },
      { id: 8, branch_id: 1, category_id: 5, sku: 'TRAD002', name: 'Tajine Lamb', description: 'Slow-cooked lamb with prunes and almonds', price: 110.00, image: 'https://images.unsplash.com/photo-1563379091339-03246963d4a1?w=400&h=300&fit=crop', is_available: true },
      { id: 9, branch_id: 1, category_id: 5, sku: 'TRAD003', name: 'Pastilla', description: 'Sweet and savory pigeon pie', price: 100.00, image: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400&h=300&fit=crop', is_available: true },
      
      // Desserts
      { id: 10, branch_id: 1, category_id: 3, sku: 'DES001', name: 'Baklava', description: 'Layered pastry with nuts and honey', price: 45.00, image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop', is_available: true },
      { id: 11, branch_id: 1, category_id: 3, sku: 'DES002', name: 'Mint Tea', description: 'Traditional Moroccan mint tea', price: 15.00, image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop', is_available: true },
      
      // Beverages
      { id: 12, branch_id: 1, category_id: 4, sku: 'BEV001', name: 'Fresh Orange Juice', description: 'Freshly squeezed orange juice', price: 20.00, image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&h=300&fit=crop', is_available: true },
      { id: 13, branch_id: 1, category_id: 4, sku: 'BEV002', name: 'Moroccan Coffee', description: 'Traditional Moroccan coffee', price: 18.00, image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop', is_available: true },
      { id: 14, branch_id: 1, category_id: 4, sku: 'BEV003', name: 'Sparkling Water', description: 'Bottled sparkling water', price: 12.00, image: 'https://images.unsplash.com/photo-1548839140-5d6c0b0b0b0b?w=400&h=300&fit=crop', is_available: true }
    ]);

  // Modifiers
  await knex('modifiers').insert([
    { id: 1, menu_item_id: 4, name: 'Extra Spicy', extra_price: 0 },
    { id: 2, menu_item_id: 4, name: 'No Spice', extra_price: 0 },
    { id: 3, menu_item_id: 5, name: 'Well Done', extra_price: 0 },
    { id: 4, menu_item_id: 5, name: 'Medium Rare', extra_price: 0 },
    { id: 5, menu_item_id: 12, name: 'Large Size', extra_price: 5.00 },
    { id: 6, menu_item_id: 13, name: 'Extra Sugar', extra_price: 0 },
    { id: 7, menu_item_id: 13, name: 'No Sugar', extra_price: 0 }
  ]);

  // Stock Items
  await knex('stock_items').insert([
    { id: 1, branch_id: 1, name: 'Chicken Breast', sku: 'CHK001', quantity: 50.0, unit: 'kg', min_threshold: 10.0 },
    { id: 2, branch_id: 1, name: 'Beef Cubes', sku: 'BEEF001', quantity: 30.0, unit: 'kg', min_threshold: 5.0 },
    { id: 3, branch_id: 1, name: 'Fresh Fish', sku: 'FISH001', quantity: 20.0, unit: 'kg', min_threshold: 5.0 },
    { id: 4, branch_id: 1, name: 'Couscous', sku: 'COUS001', quantity: 100.0, unit: 'kg', min_threshold: 20.0 },
    { id: 5, branch_id: 1, name: 'Oranges', sku: 'ORG001', quantity: 200.0, unit: 'pieces', min_threshold: 50.0 },
    { id: 6, branch_id: 1, name: 'Coffee Beans', sku: 'COF001', quantity: 25.0, unit: 'kg', min_threshold: 5.0 }
  ]);

  // Recipes (menu item to stock item mapping)
  await knex('recipes').insert([
    { menu_item_id: 4, stock_item_id: 1, qty_per_serving: 0.3 }, // Grilled Chicken -> Chicken Breast
    { menu_item_id: 5, stock_item_id: 2, qty_per_serving: 0.4 }, // Beef Kebab -> Beef Cubes
    { menu_item_id: 6, stock_item_id: 3, qty_per_serving: 0.5 }, // Fish Tagine -> Fresh Fish
    { menu_item_id: 7, stock_item_id: 4, qty_per_serving: 0.2 }, // Couscous Royal -> Couscous
    { menu_item_id: 12, stock_item_id: 5, qty_per_serving: 2.0 }, // Orange Juice -> Oranges
    { menu_item_id: 13, stock_item_id: 6, qty_per_serving: 0.02 } // Moroccan Coffee -> Coffee Beans
  ]);

  // Settings
  await knex('settings').insert([
    { key: 'restaurant_name', value: 'POSQ Restaurant' },
    { key: 'currency', value: 'MAD' },
    { key: 'tax_rate', value: '10' },
    { key: 'service_charge_rate', value: '5' },
    { key: 'operating_mode', value: 'LOCAL' },
    { key: 'printer_enabled', value: 'true' },
    { key: 'sync_enabled', value: 'false' },
    { key: 'backup_enabled', value: 'true' },
    { key: 'backup_frequency', value: 'daily' }
  ]);
};