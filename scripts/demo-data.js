#!/usr/bin/env node

const db = require('../server/src/database/connection');
const bcrypt = require('bcryptjs');

// Demo data for POSQ Restaurant POS
const demoData = {
  branches: [
    {
      id: 1,
      name: 'Dar Tajine Restaurant',
      code: 'CAS',
      address: '123 Avenue Mohammed V, Casablanca, Morocco'
    }
  ],
  
  users: [
    {
      username: 'admin@posq.com',
      password: 'admin123',
      full_name: 'System Administrator',
      role: 'admin',
      pin: '0000'
    },
    {
      username: 'manager@posq.com',
      password: 'admin123',
      full_name: 'Restaurant Manager',
      role: 'manager',
      pin: '1111'
    },
    {
      username: 'cashier1@posq.com',
      password: 'cashier123',
      full_name: 'Cashier One',
      role: 'cashier',
      pin: '2222'
    },
    {
      username: 'kitchen@posq.com',
      password: 'cashier123',
      full_name: 'Kitchen Staff',
      role: 'kitchen',
      pin: '3333'
    }
  ],
  
  categories: [
    { name: 'Appetizers', position: 1 },
    { name: 'Main Courses', position: 2 },
    { name: 'Traditional Tagines', position: 3 },
    { name: 'Couscous', position: 4 },
    { name: 'Grilled Meats', position: 5 },
    { name: 'Seafood', position: 6 },
    { name: 'Vegetarian', position: 7 },
    { name: 'Desserts', position: 8 },
    { name: 'Beverages', position: 9 },
    { name: 'Fresh Juices', position: 10 }
  ],
  
  menuItems: [
    // Appetizers
    { name: 'Harira Soup', description: 'Traditional Moroccan tomato and lentil soup', price: 25.00, sku: 'APP001', category: 'Appetizers' },
    { name: 'Zaalouk', description: 'Grilled eggplant and tomato salad', price: 30.00, sku: 'APP002', category: 'Appetizers' },
    { name: 'Briouat', description: 'Crispy phyllo pastry filled with cheese and herbs', price: 35.00, sku: 'APP003', category: 'Appetizers' },
    
    // Main Courses
    { name: 'Chicken Pastilla', description: 'Traditional Moroccan pie with spiced chicken and almonds', price: 85.00, sku: 'MAIN001', category: 'Main Courses' },
    { name: 'Lamb Mechoui', description: 'Slow-roasted lamb with Moroccan spices', price: 120.00, sku: 'MAIN002', category: 'Main Courses' },
    
    // Traditional Tagines
    { name: 'Chicken Tagine with Olives', description: 'Tender chicken with preserved lemons and green olives', price: 95.00, sku: 'TAG001', category: 'Traditional Tagines' },
    { name: 'Lamb Tagine with Prunes', description: 'Slow-cooked lamb with dried prunes and almonds', price: 110.00, sku: 'TAG002', category: 'Traditional Tagines' },
    { name: 'Fish Tagine', description: 'Fresh fish with tomatoes, peppers, and herbs', price: 90.00, sku: 'TAG003', category: 'Traditional Tagines' },
    
    // Couscous
    { name: 'Couscous with Vegetables', description: 'Traditional couscous with seasonal vegetables', price: 65.00, sku: 'COUS001', category: 'Couscous' },
    { name: 'Couscous with Lamb', description: 'Couscous topped with tender lamb and vegetables', price: 85.00, sku: 'COUS002', category: 'Couscous' },
    
    // Grilled Meats
    { name: 'Mixed Grill Platter', description: 'Selection of grilled lamb, chicken, and beef', price: 130.00, sku: 'GRILL001', category: 'Grilled Meats' },
    { name: 'Grilled Chicken', description: 'Marinated chicken breast with herbs', price: 75.00, sku: 'GRILL002', category: 'Grilled Meats' },
    
    // Seafood
    { name: 'Grilled Fish', description: 'Fresh catch of the day with lemon and herbs', price: 95.00, sku: 'SEA001', category: 'Seafood' },
    { name: 'Seafood Tagine', description: 'Mixed seafood in aromatic tomato sauce', price: 105.00, sku: 'SEA002', category: 'Seafood' },
    
    // Vegetarian
    { name: 'Vegetable Tagine', description: 'Seasonal vegetables in aromatic sauce', price: 55.00, sku: 'VEG001', category: 'Vegetarian' },
    { name: 'Falafel Plate', description: 'Crispy falafel with hummus and salad', price: 45.00, sku: 'VEG002', category: 'Vegetarian' },
    
    // Desserts
    { name: 'Baklava', description: 'Layered phyllo pastry with nuts and honey', price: 35.00, sku: 'DES001', category: 'Desserts' },
    { name: 'Mint Tea', description: 'Traditional Moroccan mint tea', price: 15.00, sku: 'DES002', category: 'Desserts' },
    
    // Beverages
    { name: 'Moroccan Coffee', description: 'Traditional Moroccan coffee', price: 20.00, sku: 'BEV001', category: 'Beverages' },
    { name: 'Sparkling Water', description: 'Bottled sparkling water', price: 10.00, sku: 'BEV002', category: 'Beverages' },
    
    // Fresh Juices
    { name: 'Orange Juice', description: 'Freshly squeezed orange juice', price: 25.00, sku: 'JUICE001', category: 'Fresh Juices' },
    { name: 'Pomegranate Juice', description: 'Fresh pomegranate juice', price: 30.00, sku: 'JUICE002', category: 'Fresh Juices' },
    { name: 'Mixed Fruit Juice', description: 'Blend of seasonal fruits', price: 28.00, sku: 'JUICE003', category: 'Fresh Juices' }
  ],
  
  tables: [
    { number: 'T1', description: 'Table 1 - Indoor' },
    { number: 'T2', description: 'Table 2 - Indoor' },
    { number: 'T3', description: 'Table 3 - Indoor' },
    { number: 'T4', description: 'Table 4 - Indoor' },
    { number: 'T5', description: 'Table 5 - Indoor' },
    { number: 'T6', description: 'Table 6 - Indoor' },
    { number: 'T7', description: 'Table 7 - Indoor' },
    { number: 'T8', description: 'Table 8 - Indoor' },
    { number: 'T9', description: 'Table 9 - Indoor' },
    { number: 'T10', description: 'Table 10 - Indoor' },
    { number: 'T11', description: 'Table 11 - Indoor' },
    { number: 'T12', description: 'Table 12 - Indoor' },
    { number: 'T13', description: 'Table 13 - Indoor' },
    { number: 'T14', description: 'Table 14 - Indoor' },
    { number: 'T15', description: 'Table 15 - Indoor' },
    { number: 'T16', description: 'Table 16 - Indoor' },
    { number: 'T17', description: 'Table 17 - Indoor' },
    { number: 'T18', description: 'Table 18 - Indoor' },
    { number: 'T19', description: 'Table 19 - Indoor' },
    { number: 'T20', description: 'Table 20 - Indoor' },
    { number: 'T21', description: 'Table 21 - Outdoor Terrace' },
    { number: 'T22', description: 'Table 22 - Outdoor Terrace' },
    { number: 'T23', description: 'Table 23 - Outdoor Terrace' },
    { number: 'T24', description: 'Table 24 - Outdoor Terrace' },
    { number: 'T25', description: 'Table 25 - Outdoor Terrace' }
  ],
  
  settings: [
    { key: 'operating_mode', value: 'LOCAL' },
    { key: 'tax_rate', value: '10' },
    { key: 'service_charge_rate', value: '5' },
    { key: 'currency', value: 'MAD' },
    { key: 'restaurant_name', value: 'Dar Tajine Restaurant' },
    { key: 'restaurant_address', value: '123 Avenue Mohammed V, Casablanca, Morocco' },
    { key: 'restaurant_phone', value: '+212 5 22 123 456' },
    { key: 'printer_enabled', value: 'true' },
    { key: 'sync_enabled', value: 'false' },
    { key: 'backup_enabled', value: 'true' },
    { key: 'backup_schedule', value: '0 2 * * *' },
    { key: 'backup_retention_days', value: '30' }
  ]
};

async function clearDatabase() {
  console.log('🧹 Clearing existing data...');
  
  const tables = [
    'audit_logs', 'sync_logs', 'order_item_modifiers', 'order_items', 'orders',
    'payments', 'stock_movements', 'recipes', 'stock_items', 'modifiers',
    'menu_items', 'categories', 'tables', 'users', 'branches', 'settings'
  ];
  
  for (const table of tables) {
    await db(table).del();
  }
}

async function insertDemoData() {
  console.log('📊 Inserting demo data...');
  
  // Insert branches
  await db('branches').insert(demoData.branches);
  console.log('✅ Branches inserted');
  
  // Insert users with hashed passwords
  for (const user of demoData.users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await db('users').insert({
      username: user.username,
      password_hash: hashedPassword,
      full_name: user.full_name,
      role: user.role,
      pin: user.pin,
      is_active: true
    });
  }
  console.log('✅ Users inserted');
  
  // Insert categories
  const categoryMap = {};
  for (const category of demoData.categories) {
    const [categoryId] = await db('categories').insert({
      branch_id: 1,
      name: category.name,
      position: category.position
    });
    categoryMap[category.name] = categoryId;
  }
  console.log('✅ Categories inserted');
  
  // Insert menu items
  for (const item of demoData.menuItems) {
    await db('menu_items').insert({
      branch_id: 1,
      category_id: categoryMap[item.category],
      sku: item.sku,
      name: item.name,
      description: item.description,
      price: item.price,
      is_available: true
    });
  }
  console.log('✅ Menu items inserted');
  
  // Insert tables
  for (const table of demoData.tables) {
    await db('tables').insert({
      branch_id: 1,
      table_number: table.number,
      qr_code: `http://localhost:5173/menu?table=${table.number}&branch=CAS`,
      description: table.description
    });
  }
  console.log('✅ Tables inserted');
  
  // Insert settings
  await db('settings').insert(demoData.settings);
  console.log('✅ Settings inserted');
}

async function main() {
  try {
    console.log('🚀 POSQ Demo Data Generator');
    console.log('============================');
    
    await clearDatabase();
    await insertDemoData();
    
    console.log('');
    console.log('🎉 Demo data inserted successfully!');
    console.log('');
    console.log('📋 Demo Data Summary:');
    console.log(`- Branches: ${demoData.branches.length}`);
    console.log(`- Users: ${demoData.users.length}`);
    console.log(`- Categories: ${demoData.categories.length}`);
    console.log(`- Menu Items: ${demoData.menuItems.length}`);
    console.log(`- Tables: ${demoData.tables.length}`);
    console.log(`- Settings: ${demoData.settings.length}`);
    console.log('');
    console.log('🔐 Default Login Credentials:');
    console.log('Admin: admin@posq.com / admin123');
    console.log('Manager: manager@posq.com / admin123');
    console.log('Cashier: cashier1@posq.com / cashier123 (PIN: 2222)');
    console.log('Kitchen: kitchen@posq.com / cashier123 (PIN: 3333)');
    console.log('');
    console.log('🍽️ Sample Menu Items:');
    demoData.menuItems.slice(0, 5).forEach(item => {
      console.log(`- ${item.name}: ${item.price} MAD`);
    });
    console.log('');
    console.log('💡 Next steps:');
    console.log('1. Start the application: npm run dev');
    console.log('2. Access admin dashboard: http://localhost:5173/admin/login');
    console.log('3. Generate QR codes: node scripts/generate-qr-codes.js');
    
  } catch (error) {
    console.error('❌ Error inserting demo data:', error.message);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { demoData, insertDemoData, clearDatabase };