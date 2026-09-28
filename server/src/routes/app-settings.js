const router = require('express').Router();
const { db } = require('../database/init');
const { authenticateToken, optionalAuth, authorize } = require('../middleware/auth');

function parse(value) { try { return JSON.parse(value || '{}'); } catch { return {}; } }
const templateKeys = ['menu_template', 'store_template', 'booking_template'];
async function readSettings(req, category) {
  let query = db('app_settings');
  if (!req.user) query = query.where({ is_public: true });
  if (category) query = query.where({ category });
  const rows = await query;
  const branchId = req.user?.branch_id || req.branchId;
  const branch = branchId ? await db('branches').where({ id: branchId }).first() : null;
  const overrides = parse(branch?.settings);
  const settings = {};
  for (const row of rows) {
    let value = row.value;
    if (row.type === 'number') value = Number(value);
    if (row.type === 'boolean') value = value === 'true';
    if (row.type === 'json') value = parse(value);
    settings[row.key] = { value: overrides[row.key] ?? value, type: row.type, category: row.category, description: row.description, isPublic: row.is_public };
  }
  if (!category) for (const key of templateKeys) settings[key] = {value: overrides[key] || 'default',type:'string',category:'appearance',isPublic:true};
  return settings;
}
router.get('/', optionalAuth, async (req,res) => {
  try { res.json({success:true,settings:await readSettings(req)}); }
  catch { res.status(500).json({error:'Failed to load settings'}); }
});
router.get('/category/:category', optionalAuth, async (req,res) => {
  try { res.json({success:true,settings:await readSettings(req,req.params.category)}); }
  catch { res.status(500).json({error:'Failed to load settings'}); }
});
async function save(req,res,values) {
  if (!req.user.branch_id) return res.status(400).json({error:'Select a store before updating its settings'});
  if (!values || Array.isArray(values) || typeof values !== 'object') return res.status(400).json({error:'Invalid settings format'});
  const definitions = await db('app_settings');
  const allowed = new Set([...definitions.map(s=>s.key),...templateKeys]);
  const accepted = Object.fromEntries(Object.entries(values).filter(([key])=>allowed.has(key)));
  const choices = {menu_template:['default','modern','elegant','minimal','luxury','healthy','casual','cafe','steakhouse','sushi','bar'],store_template:['default','minimal','bold'],booking_template:['default','calm','professional']};
  for (const key of templateKeys) if (accepted[key] !== undefined && !choices[key].includes(accepted[key])) return res.status(400).json({error:'Choose a valid template'});
  await db.transaction(async trx => {
    await trx('branches').where({id:req.user.branch_id}).update({updated_at:trx.fn.now()});
    const branch=await trx('branches').where({id:req.user.branch_id}).first();
    await trx('branches').where({id:branch.id}).update({settings:JSON.stringify({...parse(branch.settings),...accepted})});
  });
  res.json({success:true,updatedCount:Object.keys(accepted).length});
}
router.put('/',authenticateToken,authorize('admin','owner'),async(req,res)=>{
  try { await save(req,res,req.body.settings); } catch {res.status(500).json({error:'Failed to save settings'});}
});
router.put('/:key',authenticateToken,authorize('admin','owner'),async(req,res)=>{
  try { await save(req,res,{[req.params.key]:req.body.value}); } catch {res.status(500).json({error:'Failed to save setting'});}
});
router.post('/reset',authenticateToken,authorize('admin','owner'),async(req,res)=>{
  try {
    if(!req.user.branch_id) return res.status(400).json({error:'Select a store first'});
    const rows=await db('app_settings').modify(q=>{if(req.body.category) q.where({category:req.body.category});});
    const branch=await db('branches').where({id:req.user.branch_id}).first();
    const settings=parse(branch.settings);
    for(const row of rows) delete settings[row.key];
    if(!req.body.category) for(const key of templateKeys) delete settings[key];
    await db('branches').where({id:branch.id}).update({settings:JSON.stringify(settings)});
    res.json({success:true});
  } catch {res.status(500).json({error:'Failed to reset settings'});}
});
module.exports=router;
