exports.seed = async function(knex) {
  await knex('settings').del();
  
  return knex('settings').insert([
    {
      key: 'operating_mode',
      value: 'LOCAL'
    },
    {
      key: 'tax_rate',
      value: '10'
    },
    {
      key: 'service_charge_rate',
      value: '5'
    },
    {
      key: 'currency',
      value: 'MAD'
    },
    {
      key: 'restaurant_name',
      value: 'Dar Tajine Restaurant'
    },
    {
      key: 'restaurant_address',
      value: '123 Avenue Mohammed V, Casablanca, Morocco'
    },
    {
      key: 'restaurant_phone',
      value: '+212 5 22 123 456'
    },
    {
      key: 'printer_enabled',
      value: 'true'
    },
    {
      key: 'sync_enabled',
      value: 'false'
    },
    {
      key: 'backup_enabled',
      value: 'true'
    },
    {
      key: 'backup_schedule',
      value: '0 2 * * *'
    },
    {
      key: 'backup_retention_days',
      value: '30'
    }
  ]);
};