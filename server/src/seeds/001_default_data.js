const bcrypt = require('bcryptjs');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Clear existing entries
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
  await knex('printers').del();
  await knex('branches').del();
  await knex('users').del();

  // Insert default admin user
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const cashierPasswordHash = await bcrypt.hash('cashier123', 10);
  
  await knex('users').insert([
    {
      id: 1,
      username: 'admin',
      password_hash: adminPasswordHash,
      full_name: 'System Administrator',
      role: 'admin',
      pin: '1234',
      is_active: true
    },
    {
      id: 2,
      username: 'cashier',
      password_hash: cashierPasswordHash,
      full_name: 'Main Cashier',
      role: 'cashier',
      pin: '5678',
      is_active: true
    },
    {
      id: 3,
      username: 'kitchen',
      password_hash: await bcrypt.hash('kitchen123', 10),
      full_name: 'Kitchen Staff',
      role: 'kitchen',
      pin: '9999',
      is_active: true
    }
  ]);

  // Insert default branch
  await knex('branches').insert([
    {
      id: 1,
      name: 'Restaurant Casablanca',
      code: 'CASA01',
      address: 'Boulevard Mohammed V, Casablanca, Morocco',
      phone: '+212 522-123-456',
      email: 'casa@restaurant.ma'
    }
  ]);

  // Insert tables
  const tables = [];
  for (let i = 1; i <= 12; i++) {
    tables.push({
      id: i,
      branch_id: 1,
      table_number: `T${i.toString().padStart(2, '0')}`,
      qr_code: `http://localhost:5173/menu?table=T${i.toString().padStart(2, '0')}&branch=casa01`,
      description: `Table ${i}`,
      capacity: i <= 4 ? 2 : i <= 8 ? 4 : 6
    });
  }
  await knex('tables').insert(tables);

  // Insert categories
  await knex('categories').insert([
    {
      id: 1,
      branch_id: 1,
      name: 'Entrées / Starters',
      description: 'Traditional Moroccan appetizers',
      position: 1,
      is_active: true
    },
    {
      id: 2,
      branch_id: 1,
      name: 'Plats Principaux / Main Dishes',
      description: 'Traditional tagines and main courses',
      position: 2,
      is_active: true
    },
    {
      id: 3,
      branch_id: 1,
      name: 'Boissons / Beverages',
      description: 'Fresh juices and traditional drinks',
      position: 3,
      is_active: true
    },
    {
      id: 4,
      branch_id: 1,
      name: 'Desserts',
      description: 'Traditional Moroccan sweets',
      position: 4,
      is_active: true
    }
  ]);

  // Insert menu items
  await knex('menu_items').insert([
    // Starters
    {
      id: 1,
      branch_id: 1,
      category_id: 1,
      sku: 'ST001',
      name: 'Salade Marocaine',
      description: 'Fresh tomatoes, cucumbers, onions with olive oil and herbs',
      price: 35.00,
      is_available: true,
      prep_time: 10
    },
    {
      id: 2,
      branch_id: 1,
      category_id: 1,
      sku: 'ST002',
      name: 'Zaalouk',
      description: 'Traditional eggplant and tomato salad with spices',
      price: 28.00,
      is_available: true,
      prep_time: 5
    },
    {
      id: 3,
      branch_id: 1,
      category_id: 1,
      sku: 'ST003',
      name: 'Briouates au Fromage',
      description: 'Crispy pastry triangles filled with cheese and herbs',
      price: 42.00,
      is_available: true,
      prep_time: 15
    },

    // Main Dishes
    {
      id: 4,
      branch_id: 1,
      category_id: 2,
      sku: 'MD001',
      name: 'Tajine Poulet aux Olives',
      description: 'Chicken tagine with green olives and preserved lemons',
      price: 85.00,
      is_available: true,
      prep_time: 35
    },
    {
      id: 5,
      branch_id: 1,
      category_id: 2,
      sku: 'MD002',
      name: 'Tajine Agneau aux Pruneaux',
      description: 'Lamb tagine with prunes and almonds',
      price: 95.00,
      is_available: true,
      prep_time: 45
    },
    {
      id: 6,
      branch_id: 1,
      category_id: 2,
      sku: 'MD003',
      name: 'Couscous Royal',
      description: 'Traditional couscous with chicken, lamb, and vegetables',
      price: 110.00,
      is_available: true,
      prep_time: 40
    },
    {
      id: 7,
      branch_id: 1,
      category_id: 2,
      sku: 'MD004',
      name: 'Pastilla au Poulet',
      description: 'Traditional chicken pastilla with almonds and cinnamon',
      price: 75.00,
      is_available: true,
      prep_time: 25
    },

    // Beverages
    {
      id: 8,
      branch_id: 1,
      category_id: 3,
      sku: 'BV001',
      name: 'Jus d\'Orange Frais',
      description: 'Fresh squeezed orange juice',
      price: 18.00,
      is_available: true,
      prep_time: 5
    },
    {
      id: 9,
      branch_id: 1,
      category_id: 3,
      sku: 'BV002',
      name: 'Thé à la Menthe',
      description: 'Traditional Moroccan mint tea',
      price: 15.00,
      is_available: true,
      prep_time: 8
    },
    {
      id: 10,
      branch_id: 1,
      category_id: 3,
      sku: 'BV003',
      name: 'Café Noir',
      description: 'Traditional Moroccan black coffee',
      price: 12.00,
      is_available: true,
      prep_time: 5
    },
    {
      id: 11,
      branch_id: 1,
      category_id: 3,
      sku: 'BV004',
      name: 'Jus d\'Avocat',
      description: 'Fresh avocado juice with milk and sugar',
      price: 25.00,
      is_available: true,
      prep_time: 7
    },

    // Desserts
    {
      id: 12,
      branch_id: 1,
      category_id: 4,
      sku: 'DS001',
      name: 'Chebakia',
      description: 'Traditional honey-coated sesame cookies',
      price: 20.00,
      is_available: true,
      prep_time: 5
    },
    {
      id: 13,
      branch_id: 1,
      category_id: 4,
      sku: 'DS002',
      name: 'Cornes de Gazelle',
      description: 'Almond-filled crescent pastries',
      price: 30.00,
      is_available: true,
      prep_time: 5
    }
  ]);

  // Insert modifiers
  await knex('modifiers').insert([
    // For main dishes
    { id: 1, menu_item_id: 4, name: 'Extra Olives', extra_price: 5.00 },
    { id: 2, menu_item_id: 4, name: 'Spicy', extra_price: 0.00 },
    { id: 3, menu_item_id: 5, name: 'Extra Almonds', extra_price: 8.00 },
    { id: 4, menu_item_id: 6, name: 'Extra Vegetables', extra_price: 10.00 },
    { id: 5, menu_item_id: 6, name: 'Extra Meat', extra_price: 20.00 },
    
    // For beverages
    { id: 6, menu_item_id: 8, name: 'Large Size', extra_price: 5.00 },
    { id: 7, menu_item_id: 9, name: 'Extra Sweet', extra_price: 0.00 },
    { id: 8, menu_item_id: 11, name: 'With Honey', extra_price: 3.00 }
  ]);

  // Insert stock items
  await knex('stock_items').insert([
    { id: 1, branch_id: 1, name: 'Chicken Breast', sku: 'CHKN001', quantity: 50, unit: 'kg', min_threshold: 10, cost_per_unit: 45.00 },
    { id: 2, branch_id: 1, name: 'Lamb Meat', sku: 'LAMB001', quantity: 30, unit: 'kg', min_threshold: 5, cost_per_unit: 120.00 },
    { id: 3, branch_id: 1, name: 'Green Olives', sku: 'OLIV001', quantity: 20, unit: 'kg', min_threshold: 3, cost_per_unit: 25.00 },
    { id: 4, branch_id: 1, name: 'Oranges', sku: 'ORNG001', quantity: 100, unit: 'kg', min_threshold: 20, cost_per_unit: 8.00 },
    { id: 5, branch_id: 1, name: 'Mint Leaves', sku: 'MINT001', quantity: 5, unit: 'kg', min_threshold: 1, cost_per_unit: 15.00 },
    { id: 6, branch_id: 1, name: 'Almonds', sku: 'ALMD001', quantity: 15, unit: 'kg', min_threshold: 3, cost_per_unit: 80.00 }
  ]);

  // Insert recipes (menu item -> stock item mappings)
  await knex('recipes').insert([
    { menu_item_id: 4, stock_item_id: 1, qty_per_serving: 0.3 }, // Chicken tagine needs 300g chicken
    { menu_item_id: 4, stock_item_id: 3, qty_per_serving: 0.05 }, // and 50g olives
    { menu_item_id: 5, stock_item_id: 2, qty_per_serving: 0.25 }, // Lamb tagine needs 250g lamb
    { menu_item_id: 5, stock_item_id: 6, qty_per_serving: 0.03 }, // and 30g almonds
    { menu_item_id: 8, stock_item_id: 4, qty_per_serving: 0.4 }, // Orange juice needs 400g oranges
    { menu_item_id: 9, stock_item_id: 5, qty_per_serving: 0.01 } // Mint tea needs 10g mint
  ]);

  // Insert default settings
  await knex('settings').insert([
    { key: 'operating_mode', value: 'LOCAL', description: 'Operating mode: LOCAL or CLOUD', type: 'string' },
    { key: 'tax_rate', value: '0.20', description: 'Tax rate (20% VAT)', type: 'number' },
    { key: 'service_charge_rate', value: '0.10', description: 'Service charge rate (10%)', type: 'number' },
    { key: 'currency', value: 'MAD', description: 'Currency code', type: 'string' },
    { key: 'restaurant_name', value: 'Restaurant Casablanca', description: 'Restaurant name', type: 'string' },
    { key: 'receipt_footer', value: 'Merci pour votre visite!', description: 'Receipt footer message', type: 'string' },
    { key: 'enable_online_payments', value: 'false', description: 'Enable online card payments', type: 'boolean' },
    { key: 'stripe_publishable_key', value: '', description: 'Stripe publishable key', type: 'string' },
    { key: 'auto_confirm_orders', value: 'false', description: 'Auto-confirm orders without cashier approval', type: 'boolean' },
    { key: 'kitchen_display_enabled', value: 'true', description: 'Enable kitchen display', type: 'boolean' }
  ]);

  // Insert a sample printer
  await knex('printers').insert([
    {
      id: 1,
      branch_id: 1,
      name: 'Kitchen Printer',
      type: 'NETWORK',
      connection_string: '192.168.1.100:9100',
      categories: JSON.stringify([2]), // Main dishes
      is_active: true
    },
    {
      id: 2,
      branch_id: 1,
      name: 'Bar Printer',
      type: 'NETWORK', 
      connection_string: '192.168.1.101:9100',
      categories: JSON.stringify([3]), // Beverages
      is_active: true
    }
  ]);
};