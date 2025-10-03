exports.seed = async function(knex) {
  await knex('categories').del();
  
  return knex('categories').insert([
    {
      id: 1,
      branch_id: 1,
      name: 'Appetizers',
      position: 1
    },
    {
      id: 2,
      branch_id: 1,
      name: 'Main Courses',
      position: 2
    },
    {
      id: 3,
      branch_id: 1,
      name: 'Traditional Tagines',
      position: 3
    },
    {
      id: 4,
      branch_id: 1,
      name: 'Couscous',
      position: 4
    },
    {
      id: 5,
      branch_id: 1,
      name: 'Grilled Meats',
      position: 5
    },
    {
      id: 6,
      branch_id: 1,
      name: 'Seafood',
      position: 6
    },
    {
      id: 7,
      branch_id: 1,
      name: 'Vegetarian',
      position: 7
    },
    {
      id: 8,
      branch_id: 1,
      name: 'Desserts',
      position: 8
    },
    {
      id: 9,
      branch_id: 1,
      name: 'Beverages',
      position: 9
    },
    {
      id: 10,
      branch_id: 1,
      name: 'Fresh Juices',
      position: 10
    }
  ]);
};