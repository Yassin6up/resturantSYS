exports.up = async function (knex) {
  const hasFlag = await knex.schema.hasColumn('orders', 'inventory_consumed');
  if (!hasFlag) {
    await knex.schema.table('orders', table => {
      table.boolean('inventory_consumed').defaultTo(false);
    });
  }

  const hasEvents = await knex.schema.hasTable('order_events');
  if (!hasEvents) {
    await knex.schema.createTable('order_events', table => {
      table.increments('id').primary();
      table.integer('order_id').unsigned().notNullable();
      table.string('from_status');
      table.string('to_status').notNullable();
      table.integer('user_id').unsigned();
      table.text('meta');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.foreign('order_id').references('id').inTable('orders').onDelete('CASCADE');
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('order_events');
  await knex.schema.table('orders', table => {
    table.dropColumn('inventory_consumed');
  });
};
