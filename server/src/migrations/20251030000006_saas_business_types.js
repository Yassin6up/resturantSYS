// Generalizes the platform beyond restaurants: a "branch" row is now any
// kind of store (restaurant, ecommerce, appointments/hotel/office booking).
// business_type drives which storefront + admin sections render on the
// frontend; existing rows default to 'restaurant' so nothing already
// created changes behavior.
exports.up = async function(knex) {
  await knex.schema.table('branches', table => {
    table.string('business_type').defaultTo('restaurant');
  });

  const hasServices = await knex.schema.hasTable('services');
  if (!hasServices) {
    await knex.schema.createTable('services', table => {
      table.increments('id').primary();
      table.integer('branch_id').unsigned().notNullable();
      table.string('name').notNullable();
      table.text('description');
      table.integer('duration_minutes').notNullable().defaultTo(30);
      table.decimal('price', 10, 2).notNullable().defaultTo(0);
      table.string('image_url');
      table.string('category');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      table.foreign('branch_id').references('id').inTable('branches');
      table.index(['branch_id', 'is_active']);
    });
  }

  const hasBookings = await knex.schema.hasTable('bookings');
  if (!hasBookings) {
    await knex.schema.createTable('bookings', table => {
      table.increments('id').primary();
      table.integer('branch_id').unsigned().notNullable();
      table.integer('service_id').unsigned().notNullable();
      table.integer('customer_id').unsigned();
      table.string('customer_name').notNullable();
      table.string('customer_phone').notNullable();
      table.string('customer_email');
      table.dateTime('start_time').notNullable();
      table.dateTime('end_time').notNullable();
      table.string('status').notNullable().defaultTo('pending'); // pending, confirmed, completed, cancelled
      table.text('notes');
      table.timestamps(true, true);
      table.foreign('branch_id').references('id').inTable('branches');
      table.foreign('service_id').references('id').inTable('services');
      table.index(['branch_id', 'start_time']);
      table.index(['service_id', 'start_time']);
    });
  }
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('bookings');
  await knex.schema.dropTableIfExists('services');
  await knex.schema.table('branches', table => {
    table.dropColumn('business_type');
  });
};
