exports.seed = async function(knex) {
  await knex('menu_items').del();
  
  return knex('menu_items').insert([
    // Appetizers
    {
      id: 1,
      branch_id: 1,
      category_id: 1,
      sku: 'APP001',
      name: 'Harira Soup',
      description: 'Traditional Moroccan tomato and lentil soup',
      price: 25.00,
      is_available: true
    },
    {
      id: 2,
      branch_id: 1,
      category_id: 1,
      sku: 'APP002',
      name: 'Zaalouk',
      description: 'Grilled eggplant and tomato salad',
      price: 30.00,
      is_available: true
    },
    {
      id: 3,
      branch_id: 1,
      category_id: 1,
      sku: 'APP003',
      name: 'Briouat',
      description: 'Crispy phyllo pastry filled with cheese and herbs',
      price: 35.00,
      is_available: true
    },
    
    // Main Courses
    {
      id: 4,
      branch_id: 1,
      category_id: 2,
      sku: 'MAIN001',
      name: 'Chicken Pastilla',
      description: 'Traditional Moroccan pie with spiced chicken and almonds',
      price: 85.00,
      is_available: true
    },
    {
      id: 5,
      branch_id: 1,
      category_id: 2,
      sku: 'MAIN002',
      name: 'Lamb Mechoui',
      description: 'Slow-roasted lamb with Moroccan spices',
      price: 120.00,
      is_available: true
    },
    
    // Traditional Tagines
    {
      id: 6,
      branch_id: 1,
      category_id: 3,
      sku: 'TAG001',
      name: 'Chicken Tagine with Olives',
      description: 'Tender chicken with preserved lemons and green olives',
      price: 95.00,
      is_available: true
    },
    {
      id: 7,
      branch_id: 1,
      category_id: 3,
      sku: 'TAG002',
      name: 'Lamb Tagine with Prunes',
      description: 'Slow-cooked lamb with dried prunes and almonds',
      price: 110.00,
      is_available: true
    },
    {
      id: 8,
      branch_id: 1,
      category_id: 3,
      sku: 'TAG003',
      name: 'Fish Tagine',
      description: 'Fresh fish with tomatoes, peppers, and herbs',
      price: 90.00,
      is_available: true
    },
    
    // Couscous
    {
      id: 9,
      branch_id: 1,
      category_id: 4,
      sku: 'COUS001',
      name: 'Couscous with Vegetables',
      description: 'Traditional couscous with seasonal vegetables',
      price: 65.00,
      is_available: true
    },
    {
      id: 10,
      branch_id: 1,
      category_id: 4,
      sku: 'COUS002',
      name: 'Couscous with Lamb',
      description: 'Couscous topped with tender lamb and vegetables',
      price: 85.00,
      is_available: true
    },
    
    // Grilled Meats
    {
      id: 11,
      branch_id: 1,
      category_id: 5,
      sku: 'GRILL001',
      name: 'Mixed Grill Platter',
      description: 'Selection of grilled lamb, chicken, and beef',
      price: 130.00,
      is_available: true
    },
    {
      id: 12,
      branch_id: 1,
      category_id: 5,
      sku: 'GRILL002',
      name: 'Grilled Chicken',
      description: 'Marinated chicken breast with herbs',
      price: 75.00,
      is_available: true
    },
    
    // Seafood
    {
      id: 13,
      branch_id: 1,
      category_id: 6,
      sku: 'SEA001',
      name: 'Grilled Fish',
      description: 'Fresh catch of the day with lemon and herbs',
      price: 95.00,
      is_available: true
    },
    {
      id: 14,
      branch_id: 1,
      category_id: 6,
      sku: 'SEA002',
      name: 'Seafood Tagine',
      description: 'Mixed seafood in aromatic tomato sauce',
      price: 105.00,
      is_available: true
    },
    
    // Vegetarian
    {
      id: 15,
      branch_id: 1,
      category_id: 7,
      sku: 'VEG001',
      name: 'Vegetable Tagine',
      description: 'Seasonal vegetables in aromatic sauce',
      price: 55.00,
      is_available: true
    },
    {
      id: 16,
      branch_id: 1,
      category_id: 7,
      sku: 'VEG002',
      name: 'Falafel Plate',
      description: 'Crispy falafel with hummus and salad',
      price: 45.00,
      is_available: true
    },
    
    // Desserts
    {
      id: 17,
      branch_id: 1,
      category_id: 8,
      sku: 'DES001',
      name: 'Baklava',
      description: 'Layered phyllo pastry with nuts and honey',
      price: 35.00,
      is_available: true
    },
    {
      id: 18,
      branch_id: 1,
      category_id: 8,
      sku: 'DES002',
      name: 'Mint Tea',
      description: 'Traditional Moroccan mint tea',
      price: 15.00,
      is_available: true
    },
    
    // Beverages
    {
      id: 19,
      branch_id: 1,
      category_id: 9,
      sku: 'BEV001',
      name: 'Moroccan Coffee',
      description: 'Traditional Moroccan coffee',
      price: 20.00,
      is_available: true
    },
    {
      id: 20,
      branch_id: 1,
      category_id: 9,
      sku: 'BEV002',
      name: 'Sparkling Water',
      description: 'Bottled sparkling water',
      price: 10.00,
      is_available: true
    },
    
    // Fresh Juices
    {
      id: 21,
      branch_id: 1,
      category_id: 10,
      sku: 'JUICE001',
      name: 'Orange Juice',
      description: 'Freshly squeezed orange juice',
      price: 25.00,
      is_available: true
    },
    {
      id: 22,
      branch_id: 1,
      category_id: 10,
      sku: 'JUICE002',
      name: 'Pomegranate Juice',
      description: 'Fresh pomegranate juice',
      price: 30.00,
      is_available: true
    },
    {
      id: 23,
      branch_id: 1,
      category_id: 10,
      sku: 'JUICE003',
      name: 'Mixed Fruit Juice',
      description: 'Blend of seasonal fruits',
      price: 28.00,
      is_available: true
    }
  ]);
};