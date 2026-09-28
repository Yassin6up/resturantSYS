const router = require('express').Router();
const multer = require('multer');
const { db } = require('../database/init');
const { authenticateToken, authorize } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 }, fileFilter: (req, file, cb) => {
  const ext = file.originalname.toLowerCase();
  cb(null, file.mimetype === 'application/json' || ext.endsWith('.json') || ext.endsWith('.theme'));
} });
const TYPES = ['restaurant', 'ecommerce', 'appointments', 'hotel', 'office'];
const TEMPLATES = {
  restaurant: ['default', 'modern', 'elegant', 'minimal', 'luxury', 'healthy', 'casual', 'cafe', 'steakhouse', 'sushi', 'bar'],
  ecommerce: ['default', 'minimal', 'bold'],
  appointments: ['default', 'calm', 'professional'],
  hotel: ['default', 'calm', 'professional'],
  office: ['default', 'calm', 'professional']
};
const clean = value => typeof value === 'string' ? value.trim().slice(0, 160) : '';
function validateTheme(raw, branchType) {
  const theme = raw && typeof raw === 'object' ? raw : {};
  const businessType = TYPES.includes(theme.businessType) ? theme.businessType : branchType;
  if (businessType !== branchType) throw Object.assign(new Error('Choose a theme for your business type: ' + branchType), { status: 400 });
  const template = clean(theme.template) || (businessType === 'restaurant' ? 'default' : businessType === 'ecommerce' ? 'default' : 'default');
  if (!TEMPLATES[businessType].includes(template)) throw Object.assign(new Error('The selected template is not available for this business type'), { status: 400 });
  const colors = theme.colors && typeof theme.colors === 'object' ? theme.colors : {};
  const color = value => /^#[0-9a-f]{6}$/i.test(value) ? value : undefined;
  return {
    id: clean(theme.id) || `uploaded-${Date.now()}`,
    name: clean(theme.name) || 'Uploaded theme', description: clean(theme.description), businessType, template,
    colors: { primary: color(colors.primary), secondary: color(colors.secondary), accent: color(colors.accent), background: color(colors.background), text: color(colors.text) },
    typography: { heading: clean(theme.typography?.heading).slice(0, 60), body: clean(theme.typography?.body).slice(0, 60) },
    heroTitle: clean(theme.heroTitle), heroSubtitle: clean(theme.heroSubtitle), logoUrl: clean(theme.logoUrl), version: clean(theme.version) || '1.0.0'
  };
}
async function branchFor(req) { return req.user.branch_id ? db('branches').where({ id: req.user.branch_id }).first() : null; }
router.get('/current', authenticateToken, async (req, res) => {
  const branch = await branchFor(req); const settings = branch?.settings ? JSON.parse(branch.settings) : {};
    res.json({ theme: settings.theme_draft || settings.custom_theme || null, publishedTheme: settings.custom_theme || null, businessType: branch?.business_type || 'restaurant' });
});
router.post('/upload', authenticateToken, authorize('admin', 'owner', 'manager'), upload.single('theme'), async (req, res) => {
  try {
    const branch = await branchFor(req); if (!branch) return res.status(400).json({ error: 'No store is assigned to this account' });
    if (!req.file) return res.status(400).json({ error: 'Upload a .json or .theme file' });
    let raw; try { raw = JSON.parse(req.file.buffer.toString('utf8')); } catch { return res.status(400).json({ error: 'Theme file must contain valid JSON' }); }
    const theme = validateTheme(raw, branch.business_type || 'restaurant');
    const settings = branch.settings ? JSON.parse(branch.settings) : {};
    theme.active = false;
    settings.theme_draft = theme;
    await db('branches').where({ id: branch.id }).update({ settings: JSON.stringify(settings), updated_at: db.fn.now() });
    res.status(201).json({ theme, message: 'Theme uploaded and saved. Activate it from the storefront settings.' });
  } catch (error) { res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not save theme' }); }
});
router.post('/activate', authenticateToken, authorize('admin', 'owner', 'manager'), async (req, res) => {
  try {
    const branch = await branchFor(req); if (!branch) return res.status(400).json({ error: 'No store is assigned to this account' });
    const settings = branch.settings ? JSON.parse(branch.settings) : {};
    const draft = settings.theme_draft || settings.custom_theme;
    if (!draft) return res.status(404).json({ error: 'Upload a theme first' });
    if (req.body.active !== false) {
      validateTheme(draft, branch.business_type || 'restaurant');
      settings.custom_theme = { ...draft, active: true };
      settings.theme_draft = settings.custom_theme;
    } else {
      if (settings.custom_theme) settings.custom_theme.active = false;
      if (settings.theme_draft) settings.theme_draft.active = false;
    }
    await db('branches').where({ id: branch.id }).update({ settings: JSON.stringify(settings), updated_at: db.fn.now() });
    res.json({ theme: settings.theme_draft || settings.custom_theme });
  } catch { res.status(500).json({ error: 'Could not activate theme' }); }
});
router.delete('/current', authenticateToken, authorize('admin', 'owner', 'manager'), async (req, res) => {
  const branch = await branchFor(req); if (!branch) return res.status(400).json({ error: 'No store is assigned to this account' });
  const settings = branch.settings ? JSON.parse(branch.settings) : {}; delete settings.custom_theme; delete settings.theme_draft;
  await db('branches').where({ id: branch.id }).update({ settings: JSON.stringify(settings), updated_at: db.fn.now() });
  res.json({ theme: null });
});
module.exports = router;
