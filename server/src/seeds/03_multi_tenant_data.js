const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Create owner users first
  const ownerPassword = await bcrypt.hash('owner123', 12);
  
  // Check if owner already exists
  const existingOwner = await knex('users').where({ username: 'owner' }).first();
  
  if (!existingOwner) {
    await knex('users').insert([
      {
        id: 100,
        username: 'owner',
        password_hash: ownerPassword,
        full_name: 'Restaurant Owner',
        role: 'owner',
        pin: '0000',
        email: 'owner@posq.com',
        phone: '+212-600-000000',
        is_active: true
      }
    ]);
  }
  
  // Update existing branch to have owner
  await knex('branches')
    .where({ id: 1 })
    .update({
      owner_id: 100,
      phone: '+212-522-123456',
      email: 'casablanca@posq.com',
      logo_url: null,
      settings: JSON.stringify({
        currency: 'MAD',
        tax_rate: 10,
        service_charge: 5,
        timezone: 'Africa/Casablanca',
        language: 'en'
      }),
      is_active: true
    });
  
  // Update existing users to belong to branch 1
  await knex('users')
    .whereIn('id', [1, 2, 3])
    .update({
      branch_id: 1,
      email: knex.raw("CONCAT(username, '@posq.com')"),
      phone: '+212-600-000001',
      hire_date: knex.fn.now()
    });
  
  // Add a second restaurant for the same owner
  const existingBranch2 = await knex('branches').where({ code: 'RBT' }).first();
  
  if (!existingBranch2) {
    await knex('branches').insert([
      {
        id: 2,
        name: 'Rabat Downtown',
        code: 'RBT',
        address: '456 Avenue Hassan II, Rabat, Morocco',
        owner_id: 100,
        phone: '+212-537-654321',
        email: 'rabat@posq.com',
        logo_url: null,
        settings: JSON.stringify({
          currency: 'MAD',
          tax_rate: 10,
          service_charge: 5,
          timezone: 'Africa/Casablanca',
          language: 'en'
        }),
        is_active: true
      }
    ]);
    
    // Add admin for second restaurant
    await knex('users').insert([
      {
        id: 101,
        username: 'admin2',
        password_hash: await bcrypt.hash('admin123', 12),
        full_name: 'Rabat Admin',
        role: 'admin',
        pin: '2222',
        email: 'admin2@posq.com',
        phone: '+212-600-000002',
        branch_id: 2,
        is_active: true,
        hire_date: knex.fn.now()
      }
    ]);
    
    // Add some tables for branch 2
    const tables2 = [];
    for (let i = 1; i <= 8; i++) {
      tables2.push({
        branch_id: 2,
        table_number: `T${i}`,
        qr_code: `https://posq.local/menu?table=T${i}&branch=RBT`,
        description: `Table ${i}`
      });
    }
    await knex('tables').insert(tables2);
    
    // Add categories for branch 2
    await knex('categories').insert([
      { branch_id: 2, name: 'Appetizers', position: 1 },
      { branch_id: 2, name: 'Main Courses', position: 2 },
      { branch_id: 2, name: 'Desserts', position: 3 },
      { branch_id: 2, name: 'Beverages', position: 4 }
    ]);
  }
};
