function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'restaurant';
}

const RESERVED_SLUGS = new Set(['www', 'admin', 'api', 'app', 'mail', 'static', 'assets', 'cdn']);

// Generates a unique, URL-safe slug for a new restaurant, avoiding reserved
// subdomains and any slug already used by another branch.
async function generateUniqueSlug(db, desired) {
  const base = slugify(desired);
  let candidate = base;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const taken = RESERVED_SLUGS.has(candidate) || await db('branches').where({ slug: candidate }).first();
    if (!taken) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

module.exports = { slugify, generateUniqueSlug, RESERVED_SLUGS };
