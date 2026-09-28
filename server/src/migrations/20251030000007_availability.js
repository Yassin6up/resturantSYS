// Real availability management for the appointments/hotel/office verticals -
// a weekly recurring schedule plus one-off blocked dates (holidays, days
// off), the way any dedicated booking SaaS (Calendly, etc.) works. The
// naive fixed 9-18 window used before this is replaced by these tables.
exports.up = async function(knex) {
  const hasHours = await knex.schema.hasTable('business_hours');
  if (!hasHours) {
    await knex.schema.createTable('business_hours', table => {
      table.increments('id').primary();
      table.integer('branch_id').unsigned().notNullable();
      table.integer('day_of_week').notNullable(); // 0 = Sunday ... 6 = Saturday
      table.boolean('is_open').notNullable().defaultTo(true);
      table.string('open_time').notNullable().defaultTo('09:00');
      table.string('close_time').notNullable().defaultTo('18:00');
      table.timestamps(true, true);
      table.foreign('branch_id').references('id').inTable('branches');
      table.unique(['branch_id', 'day_of_week']);
    });
  }

  const hasExceptions = await knex.schema.hasTable('availability_exceptions');
  if (!hasExceptions) {
    await knex.schema.createTable('availability_exceptions', table => {
      table.increments('id').primary();
      table.integer('branch_id').unsigned().notNullable();
      table.date('date').notNullable();
      table.string('reason');
      table.timestamps(true, true);
      table.foreign('branch_id').references('id').inTable('branches');
      table.unique(['branch_id', 'date']);
    });
  }
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('availability_exceptions');
  await knex.schema.dropTableIfExists('business_hours');
};
