function slugify(name, id) {
  const base = String(name || 'restaurant')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'restaurant'}-${id}`;
}

exports.up = async function (knex) {
  const hasSlug = await knex.schema.hasColumn('branches', 'slug');
  if (!hasSlug) {
    await knex.schema.table('branches', table => {
      table.string('slug');
    });
  }

  const branches = await knex('branches').select('id', 'name', 'slug');
  for (const branch of branches) {
    if (!branch.slug) {
      await knex('branches')
        .where({ id: branch.id })
        .update({ slug: slugify(branch.name, branch.id) });
    }
  }

  const hasUniqueIndex = await knex.schema.hasColumn('branches', 'slug');
  if (hasUniqueIndex) {
    await knex.schema.alterTable('branches', table => {
      table.unique('slug');
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.alterTable('branches', table => {
    table.dropUnique('slug');
    table.dropColumn('slug');
  });
};
