const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  await knex('users').del();
  
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const cashierPassword = await bcrypt.hash('cashier123', 10);
  
  return knex('users').insert([
    {
      id: 1,
      username: 'admin@posq.com',
      password_hash: hashedPassword,
      full_name: 'System Administrator',
      role: 'admin',
      pin: '0000',
      is_active: true
    },
    {
      id: 2,
      username: 'manager@posq.com',
      password_hash: hashedPassword,
      full_name: 'Restaurant Manager',
      role: 'manager',
      pin: '1111',
      is_active: true
    },
    {
      id: 3,
      username: 'cashier1@posq.com',
      password_hash: cashierPassword,
      full_name: 'Cashier One',
      role: 'cashier',
      pin: '2222',
      is_active: true
    },
    {
      id: 4,
      username: 'kitchen@posq.com',
      password_hash: cashierPassword,
      full_name: 'Kitchen Staff',
      role: 'kitchen',
      pin: '3333',
      is_active: true
    }
  ]);
};