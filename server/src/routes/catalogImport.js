const router = require('express').Router();
const { db } = require('../database/init');
const { authenticateToken, authorize, requireActiveBranch } = require('../middleware/auth');

router.use(authenticateToken, authorize('admin', 'manager'), requireActiveBranch);
router.use(async (req, res, next) => {
  try {
    const branch = await db('branches').where({ id: req.user.branch_id || 0 }).first();
    if (!branch || !['restaurant', 'ecommerce'].includes(branch.business_type)) return res.status(403).json({ error: 'Imports are available for restaurant and ecommerce accounts.' });
    next();
  } catch (e) { next(e); }
});

// Fetch only the canonical Google CSV endpoint, never arbitrary user URLs.
router.post('/google-sheet', async (req, res) => {
  try {
    let url;
    try { url = new URL(req.body.url); } catch { return res.status(400).json({ error: 'Enter a valid Google Sheets link.' }); }
    const match = url.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/);
    if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com' || url.port || !match || match[1] === 'e') return res.status(400).json({ error: 'Use the normal docs.google.com/spreadsheets/d/... sharing link.' });
    const gid = url.searchParams.get('gid') || new URLSearchParams(url.hash.slice(1)).get('gid') || '0';
    if (!/^\d+$/.test(gid)) return res.status(400).json({ error: 'Invalid sheet tab.' });
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${match[1]}/gviz/tq?tqx=out:csv&headers=1&gid=${gid}`, { redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!response.ok || !response.headers.get('content-type')?.includes('text/csv')) throw new Error('unavailable');
    const chunks = []; let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 5 * 1024 * 1024) return res.status(413).json({ error: 'Sheet exceeds 5 MB. Export a smaller sheet.' });
      chunks.push(Buffer.from(chunk));
    }
    res.json({ csv: Buffer.concat(chunks).toString('utf8') });
  } catch { res.status(400).json({ error: 'Cannot read this sheet. Use a sheet already shared for link viewing, or download it as Excel / CSV and upload that file.' }); }
});

router.post('/', async (req, res, next) => {
  const rows = req.body.rows;
  if (!Array.isArray(rows) || !rows.length || rows.length > 1000) return res.status(400).json({ error: 'Import between 1 and 1,000 rows at a time.' });
  const errors = []; const cleaned = [];
  rows.forEach((row, index) => {
    const text = field => typeof row?.[field] === 'string' ? row[field].trim() : '';
    const name = text('name'), category = text('category') || 'Uncategorized', sku = text('sku'), description = text('description'), image = text('image');
    const price = typeof row?.price === 'number' ? row.price : typeof row?.price === 'string' && /^\d+(?:[.,]\d{1,2})?$/.test(row.price.trim()) ? Number(row.price.trim().replace(',', '.')) : NaN;
    let error = '';
    if (!name || name.length > 255) error = 'Name is required (maximum 255 characters).';
    else if (!Number.isFinite(price) || price < 0 || price > 99999999.99 || Math.abs(price * 100 - Math.round(price * 100)) > 0.00001) error = 'Price must be a nonnegative number with at most two decimals.';
    else if (category.length > 255 || sku.length > 255 || description.length > 5000 || image.length > 255) error = 'Category, SKU, image URL or description is too long.';
    else if (image && !/^https?:\/\//i.test(image)) error = 'Image must be an http(s) URL.';
    if (error) errors.push({ row: index + 2, error });
    cleaned.push({ name, category, sku, description, image, price });
  });
  if (errors.length) return res.status(400).json({ error: 'Fix the invalid rows before importing. Nothing was saved.', errors });
  try {
    const result = await db.transaction(async trx => {
      const branchId = req.user.branch_id;
      await trx('branches').where({ id: branchId }).forUpdate().first();
      const categories = await trx('categories').where({ branch_id: branchId });
      const items = await trx('menu_items').where({ branch_id: branchId });
      const key = value => value.toLocaleLowerCase();
      const categoryMap = new Map(categories.map(c => [key(c.name), c.id]));
      const skus = new Set(items.filter(i => i.sku).map(i => key(i.sku)));
      const names = new Set(items.map(i => `${i.category_id}:${key(i.name)}`));
      let created = 0, skipped = 0, categoriesCreated = 0;
      for (const row of cleaned) {
        let categoryId = categoryMap.get(key(row.category));
        if ((row.sku && skus.has(key(row.sku))) || (categoryId && names.has(`${categoryId}:${key(row.name)}`))) { skipped++; continue; }
        if (!categoryId) {
          [categoryId] = await trx('categories').insert({ name: row.category, branch_id: branchId, position: categories.length + categoriesCreated });
          categoryMap.set(key(row.category), categoryId); categoriesCreated++;
        }
        await trx('menu_items').insert({ branch_id: branchId, category_id: categoryId, name: row.name, price: row.price, sku: row.sku || null, description: row.description, image: row.image || null, is_available: true });
        names.add(`${categoryId}:${key(row.name)}`); if (row.sku) skus.add(key(row.sku)); created++;
      }
      await trx('audit_logs').insert({ user_id: req.user.id, action: 'CATALOG_IMPORT', meta: JSON.stringify({ branchId, created, skipped, categoriesCreated }) });
      return { created, skipped, categoriesCreated };
    });
    res.status(201).json(result);
  } catch (e) { next(e); }
});
module.exports = router;
