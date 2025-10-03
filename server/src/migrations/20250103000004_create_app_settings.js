exports.up = function(knex) {
  return knex.schema.createTable('app_settings', table => {
    table.increments('id').primary();
    table.string('key').unique().notNullable();
    table.text('value');
    table.string('type').defaultTo('string'); // string, number, boolean, json, color
    table.string('category').defaultTo('general'); // general, theme, branding, database, etc.
    table.text('description');
    table.boolean('is_public').defaultTo(false); // Can be accessed without auth
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('app_settings');
};