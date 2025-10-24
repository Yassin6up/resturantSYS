exports.up = function(knex) {
  return knex.schema
    // Enhance branches table to become full restaurants
    .table('branches', table => {
      table.integer('owner_id').unsigned();
      table.string('phone');
      table.string('email');
      table.string('logo_url');
      table.text('settings'); // JSON settings for restaurant-specific config
      table.boolean('is_active').defaultTo(true);
      table.foreign('owner_id').references('id').inTable('users');
    })
    
    // Add restaurant/branch assignment to users (employees belong to a restaurant)
    .table('users', table => {
      table.integer('branch_id').unsigned();
      table.string('email');
      table.string('phone');
      table.decimal('salary', 10, 2);
      table.date('hire_date');
      table.foreign('branch_id').references('id').inTable('branches');
    });
};

exports.down = function(knex) {
  return knex.schema
    .table('users', table => {
      table.dropForeign('branch_id');
      table.dropColumn('branch_id');
      table.dropColumn('email');
      table.dropColumn('phone');
      table.dropColumn('salary');
      table.dropColumn('hire_date');
    })
    .table('branches', table => {
      table.dropForeign('owner_id');
      table.dropColumn('owner_id');
      table.dropColumn('phone');
      table.dropColumn('email');
      table.dropColumn('logo_url');
      table.dropColumn('settings');
      table.dropColumn('is_active');
    });
};
