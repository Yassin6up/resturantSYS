exports.seed = async function(knex) {
  await knex('branches').del();
  
  return knex('branches').insert([
    {
      id: 1,
      name: 'Casablanca Branch',
      code: 'CAS',
      address: '123 Avenue Mohammed V, Casablanca, Morocco'
    },
    {
      id: 2,
      name: 'Rabat Branch',
      code: 'RAB',
      address: '456 Rue Hassan II, Rabat, Morocco'
    }
  ]);
};