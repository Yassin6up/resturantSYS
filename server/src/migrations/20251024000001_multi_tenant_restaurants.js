exports.up = async function(knex) {
  const branches = {
    owner_id: t => t.integer('owner_id').unsigned(), phone: t => t.string('phone'), email: t => t.string('email'), website: t => t.string('website'),
    description: t => t.text('description'), logo_url: t => t.string('logo_url'), settings: t => t.text('settings'), is_active: t => t.boolean('is_active').defaultTo(true)
  };
  for (const [name, add] of Object.entries(branches)) if (!(await knex.schema.hasColumn('branches', name))) await knex.schema.table('branches', add);
  const users = {
    branch_id: t => t.integer('branch_id').unsigned(), email: t => t.string('email'), phone: t => t.string('phone'), salary: t => t.decimal('salary', 10, 2), hire_date: t => t.date('hire_date')
  };
  for (const [name, add] of Object.entries(users)) if (!(await knex.schema.hasColumn('users', name))) await knex.schema.table('users', add);
};

exports.down = async function() {};
