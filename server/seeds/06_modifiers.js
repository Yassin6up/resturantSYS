exports.seed = async function(knex) {
  await knex('modifiers').del();
  
  return knex('modifiers').insert([
    // Spice level modifiers for main dishes
    {
      id: 1,
      menu_item_id: 6,
      name: 'Extra Spicy',
      extra_price: 0.00
    },
    {
      id: 2,
      menu_item_id: 6,
      name: 'Mild',
      extra_price: 0.00
    },
    {
      id: 3,
      menu_item_id: 7,
      name: 'Extra Spicy',
      extra_price: 0.00
    },
    {
      id: 4,
      menu_item_id: 7,
      name: 'Mild',
      extra_price: 0.00
    },
    
    // Size modifiers for drinks
    {
      id: 5,
      menu_item_id: 21,
      name: 'Large',
      extra_price: 5.00
    },
    {
      id: 6,
      menu_item_id: 22,
      name: 'Large',
      extra_price: 5.00
    },
    {
      id: 7,
      menu_item_id: 23,
      name: 'Large',
      extra_price: 5.00
    },
    
    // Protein additions
    {
      id: 8,
      menu_item_id: 9,
      name: 'Extra Lamb',
      extra_price: 15.00
    },
    {
      id: 9,
      menu_item_id: 9,
      name: 'Extra Chicken',
      extra_price: 12.00
    },
    
    // Side additions
    {
      id: 10,
      menu_item_id: 11,
      name: 'Extra Rice',
      extra_price: 8.00
    },
    {
      id: 11,
      menu_item_id: 11,
      name: 'Extra Salad',
      extra_price: 5.00
    }
  ]);
};