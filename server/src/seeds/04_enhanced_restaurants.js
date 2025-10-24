const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Add more restaurants for the owner with complete data
  const ownerUser = await knex('users').where({ username: 'owner' }).first();
  
  if (!ownerUser) {
    console.log('Owner user not found. Please run previous seeds first.');
    return;
  }
  
  const restaurants = [
    {
      name: 'Marrakech Medina',
      code: 'MRK',
      address: '789 Jemaa el-Fnaa, Marrakech, Morocco',
      phone: '+212-524-123789',
      email: 'marrakech@posq.com',
      website: 'https://marrakech.posq.com',
      description: 'Traditional Moroccan cuisine in the heart of Marrakech medina',
      owner_id: ownerUser.id,
      settings: JSON.stringify({
        currency: 'MAD',
        tax_rate: 10,
        service_charge: 5,
        timezone: 'Africa/Casablanca',
        language: 'en'
      }),
      is_active: true
    },
    {
      name: 'Tangier Seaside',
      code: 'TNG',
      address: '321 Boulevard Pasteur, Tangier, Morocco',
      phone: '+212-539-987654',
      email: 'tangier@posq.com',
      website: 'https://tangier.posq.com',
      description: 'Mediterranean fusion restaurant with ocean views',
      owner_id: ownerUser.id,
      settings: JSON.stringify({
        currency: 'MAD',
        tax_rate: 10,
        service_charge: 7,
        timezone: 'Africa/Casablanca',
        language: 'en'
      }),
      is_active: true
    },
    {
      name: 'Fes Heritage',
      code: 'FES',
      address: '555 Bab Boujloud, Fes, Morocco',
      phone: '+212-535-456789',
      email: 'fes@posq.com',
      website: 'https://fes.posq.com',
      description: 'Authentic Fassi cuisine in a restored riad',
      owner_id: ownerUser.id,
      settings: JSON.stringify({
        currency: 'MAD',
        tax_rate: 10,
        service_charge: 5,
        timezone: 'Africa/Casablanca',
        language: 'en'
      }),
      is_active: true
    }
  ];
  
  for (const restaurant of restaurants) {
    // Check if restaurant already exists
    const existing = await knex('branches').where({ code: restaurant.code }).first();
    
    if (!existing) {
      const [branchId] = await knex('branches').insert(restaurant).returning('id');
      const actualBranchId = branchId?.id || branchId;
      
      console.log(`Created restaurant: ${restaurant.name} (${restaurant.code})`);
      
      // Create admin user for this restaurant
      const adminPassword = await bcrypt.hash('admin123', 12);
      await knex('users').insert({
        username: `admin_${restaurant.code.toLowerCase()}`,
        password_hash: adminPassword,
        full_name: `${restaurant.name} Admin`,
        role: 'admin',
        pin: '1234',
        email: `admin@${restaurant.code.toLowerCase()}.posq.com`,
        phone: restaurant.phone.replace(/\d{3}$/, '001'),
        branch_id: actualBranchId,
        is_active: true,
        hire_date: knex.fn.now()
      });
      
      // Create manager user
      const managerPassword = await bcrypt.hash('manager123', 12);
      await knex('users').insert({
        username: `manager_${restaurant.code.toLowerCase()}`,
        password_hash: managerPassword,
        full_name: `${restaurant.name} Manager`,
        role: 'manager',
        pin: '5678',
        email: `manager@${restaurant.code.toLowerCase()}.posq.com`,
        phone: restaurant.phone.replace(/\d{3}$/, '002'),
        branch_id: actualBranchId,
        is_active: true,
        hire_date: knex.fn.now()
      });
      
      // Create tables (10 tables per restaurant)
      const tables = [];
      for (let i = 1; i <= 10; i++) {
        tables.push({
          branch_id: actualBranchId,
          table_number: `T${i}`,
          qr_code: `https://posq.local/menu?table=T${i}&branch=${restaurant.code}`,
          description: `Table ${i}`,
          capacity: i <= 4 ? 2 : (i <= 8 ? 4 : 6)
        });
      }
      await knex('tables').insert(tables);
      
      // Create default categories
      await knex('categories').insert([
        { branch_id: actualBranchId, name: 'Appetizers', position: 1 },
        { branch_id: actualBranchId, name: 'Main Courses', position: 2 },
        { branch_id: actualBranchId, name: 'Desserts', position: 3 },
        { branch_id: actualBranchId, name: 'Beverages', position: 4 }
      ]);
      
      // Add sample menu items
      const categories = await knex('categories')
        .where({ branch_id: actualBranchId })
        .select('id', 'name');
      
      const menuItems = [];
      for (const category of categories) {
        if (category.name === 'Appetizers') {
          menuItems.push(
            { branch_id: actualBranchId, category_id: category.id, name: 'Moroccan Salad', price: 45, description: 'Fresh seasonal vegetables with olive oil', is_available: true },
            { branch_id: actualBranchId, category_id: category.id, name: 'Zaalouk', price: 40, description: 'Traditional eggplant and tomato salad', is_available: true }
          );
        } else if (category.name === 'Main Courses') {
          menuItems.push(
            { branch_id: actualBranchId, category_id: category.id, name: 'Chicken Tagine', price: 120, description: 'Slow-cooked chicken with preserved lemon and olives', is_available: true },
            { branch_id: actualBranchId, category_id: category.id, name: 'Lamb Couscous', price: 150, description: 'Steamed couscous with tender lamb and vegetables', is_available: true }
          );
        } else if (category.name === 'Desserts') {
          menuItems.push(
            { branch_id: actualBranchId, category_id: category.id, name: 'Moroccan Pastries', price: 50, description: 'Assorted traditional pastries with honey', is_available: true }
          );
        } else if (category.name === 'Beverages') {
          menuItems.push(
            { branch_id: actualBranchId, category_id: category.id, name: 'Mint Tea', price: 20, description: 'Traditional Moroccan mint tea', is_available: true },
            { branch_id: actualBranchId, category_id: category.id, name: 'Fresh Orange Juice', price: 25, description: 'Freshly squeezed orange juice', is_available: true }
          );
        }
      }
      
      if (menuItems.length > 0) {
        await knex('menu_items').insert(menuItems);
      }
      
      // Add sample stock items
      await knex('stock_items').insert([
        { branch_id: actualBranchId, name: 'Chicken', sku: 'CHK001', quantity: 50, min_threshold: 10, unit: 'kg' },
        { branch_id: actualBranchId, name: 'Lamb', sku: 'LMB001', quantity: 30, min_threshold: 5, unit: 'kg' },
        { branch_id: actualBranchId, name: 'Tomatoes', sku: 'TMT001', quantity: 100, min_threshold: 20, unit: 'kg' },
        { branch_id: actualBranchId, name: 'Olive Oil', sku: 'OIL001', quantity: 20, min_threshold: 5, unit: 'liters' },
        { branch_id: actualBranchId, name: 'Mint', sku: 'MNT001', quantity: 15, min_threshold: 3, unit: 'bunches' }
      ]);
      
      console.log(`✅ Successfully set up restaurant: ${restaurant.name}`);
    } else {
      console.log(`Restaurant ${restaurant.name} already exists, skipping...`);
    }
  }
  
  console.log('✅ Restaurant seed completed!');
};
