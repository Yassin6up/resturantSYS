exports.up = async knex => {
  await knex.schema.createTable('reservations', table => {
    table.increments('id').primary();
    table.integer('branch_id').unsigned().notNullable().references('id').inTable('branches');
    table.integer('table_id').unsigned().notNullable().references('id').inTable('tables');
    table.string('customer_name').notNullable();
    table.string('customer_phone').notNullable();
    table.integer('party_size').notNullable();
    table.dateTime('start_time').notNullable();
    table.dateTime('end_time').notNullable();
    table.string('status').defaultTo('pending');
    table.text('notes');
    table.timestamps(true, true);
    table.index(['branch_id', 'start_time']);
    table.index(['table_id', 'start_time']);
  });
};
exports.down = knex => knex.schema.dropTableIfExists('reservations');
