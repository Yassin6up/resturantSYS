exports.up = async function (knex) {
  if (!(await knex.schema.hasTable('whatsapp_sessions'))) {
    await knex.schema.createTable('whatsapp_sessions', table => {
      table.integer('branch_id').unsigned().primary();
      table.string('status').defaultTo('disconnected');
      table.string('connected_number');
      table.timestamp('connected_at').nullable();
      table.timestamp('last_sent_at').nullable();
      table.timestamps(true, true);
      table.foreign('branch_id').references('id').inTable('branches').onDelete('CASCADE');
    });
  }

  if (!(await knex.schema.hasTable('whatsapp_campaigns'))) await knex.schema.createTable('whatsapp_campaigns', table => {
    table.increments('id').primary();
    table.integer('branch_id').unsigned().notNullable();
    table.text('message').notNullable();
    table.string('image_path');
    table.string('status').defaultTo('queued'); // queued | sending | completed | cancelled | failed
    table.integer('created_by').unsigned();
    table.integer('total_recipients').defaultTo(0);
    table.integer('sent_count').defaultTo(0);
    table.integer('failed_count').defaultTo(0);
    table.timestamp('completed_at');
    table.timestamps(true, true);
    table.foreign('branch_id').references('id').inTable('branches').onDelete('CASCADE');
    table.foreign('created_by').references('id').inTable('users').onDelete('SET NULL');
  });

  if (!(await knex.schema.hasTable('whatsapp_campaign_recipients'))) await knex.schema.createTable('whatsapp_campaign_recipients', table => {
    table.increments('id').primary();
    table.integer('campaign_id').unsigned().notNullable();
    table.integer('customer_id').unsigned();
    table.string('phone').notNullable();
    table.string('status').defaultTo('pending'); // pending | sent | failed
    table.string('error');
    table.timestamp('sent_at');
    table.foreign('campaign_id').references('id').inTable('whatsapp_campaigns').onDelete('CASCADE');
    table.foreign('customer_id').references('id').inTable('customers').onDelete('SET NULL');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('whatsapp_campaign_recipients');
  await knex.schema.dropTableIfExists('whatsapp_campaigns');
  await knex.schema.dropTableIfExists('whatsapp_sessions');
};
