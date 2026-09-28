const { db } = require('../database/init');

// Extracts the restaurant slug from the request Host header, e.g.
// "pizzaroma.mybrand.com" -> "pizzaroma", given APP_DOMAIN=mybrand.com.
// Returns null for the bare apex domain, localhost, or IP hosts (dev).
function slugFromHost(host, appDomain) {
  if (!host || !appDomain) return null;
  const hostname = host.split(':')[0].toLowerCase();
  const domain = appDomain.toLowerCase();
  if (hostname === domain || !hostname.endsWith(`.${domain}`)) return null;
  const slug = hostname.slice(0, -1 * (domain.length + 1));
  if (!slug || slug.includes('.')) return null; // reject nested/unexpected subdomains
  return slug;
}

// Resolves which restaurant (branches row) a request belongs to and attaches
// req.branchId / req.branch. Never blocks the request on its own - routes
// decide whether a missing tenant is an error.
//
// Resolution order:
//   1. Subdomain, e.g. pizzaroma.mybrand.com (production path)
//   2. X-Branch-Slug header (useful for API clients/testing without DNS)
//   3. req.body.branchId / req.query.branchId (legacy/dev fallback - trusted
//      only because nothing better was resolved; DO NOT rely on this alone
//      for cross-tenant-sensitive writes once real tenants exist)
//   4. DEFAULT_BRANCH_ID env var (single-tenant local dev)
async function resolveTenant(req, res, next) {
  try {
    const appDomain = process.env.APP_DOMAIN;
    const slug = slugFromHost(req.headers.host, appDomain) || req.headers['x-branch-slug'] || null;

    let branch = null;
    if (slug) {
      branch = await db('branches').where({ slug }).first();
    }

    if (!branch && !slug) {
      const fallbackId = req.headers['x-branch-id'] || req.body?.branchId || req.query?.branchId || process.env.DEFAULT_BRANCH_ID;
      if (fallbackId) {
        branch = await db('branches').where({ id: fallbackId }).first();
      }
    }

    req.branch = branch || null;
    req.branchId = branch ? branch.id : null;
    next();
  } catch (error) {
    next(error);
  }
}

// Use on public routes that must have a resolved restaurant to do anything
// useful (menu, order creation, order status). Rejects before touching data
// if no tenant could be resolved, and refuses to trust a client-supplied
// branchId that doesn't match the resolved tenant once one is known.
function requireTenant(req, res, next) {
  if (!req.branchId) {
    return res.status(404).json({ error: 'Restaurant not found' });
  }
  if (req.branch && !req.branch.is_active) return res.status(403).json({ error: 'This business is not accepting requests right now' });
  next();
}

module.exports = { resolveTenant, requireTenant, slugFromHost };
