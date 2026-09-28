const express = require('express');
const { db } = require('../database/init');
const { authenticateToken, authorize } = require('../middleware/auth');
const { logger } = require('../middleware/errorHandler');
const {
  getOrCreateSettings,
  findCustomerByPhone,
  createCustomer,
  listAffordableRewards
} = require('../utils/loyalty');

const router = express.Router();

// All routes here are staff-only, scoped to the caller's own branch.
router.use(authenticateToken);

// ---- Settings ----
router.get('/settings', async (req, res) => {
  const settings = await getOrCreateSettings(req.user.branch_id);
  res.json({ settings });
});

router.put('/settings', authorize('admin', 'manager', 'owner'), async (req, res) => {
  const branchId = req.user.branch_id;
  const { enabled, earnMode, amountPerPoint, minRedeemPoints, pointsExpiryDays, welcomeBonus, birthdayBonus } = req.body;
  await getOrCreateSettings(branchId);
  await db('loyalty_settings').where({ branch_id: branchId }).update({
    ...(enabled !== undefined && { enabled }),
    ...(earnMode && { earn_mode: earnMode }),
    ...(amountPerPoint !== undefined && { amount_per_point: amountPerPoint }),
    ...(minRedeemPoints !== undefined && { min_redeem_points: minRedeemPoints }),
    ...(pointsExpiryDays !== undefined && { points_expiry_days: pointsExpiryDays }),
    ...(welcomeBonus !== undefined && { welcome_bonus: welcomeBonus }),
    ...(birthdayBonus !== undefined && { birthday_bonus: birthdayBonus }),
    updated_at: db.fn.now()
  });
  const settings = await db('loyalty_settings').where({ branch_id: branchId }).first();
  res.json({ settings });
});

// ---- Rewards catalog ----
router.get('/rewards', async (req, res) => {
  const rewards = await db('rewards').where({ branch_id: req.user.branch_id }).orderBy('points_cost');
  res.json({ rewards });
});

router.post('/rewards', authorize('admin', 'manager', 'owner'), async (req, res) => {
  const { name, type, menuItemId, value, pointsCost, stockLimit } = req.body;
  if (!name || !type || !pointsCost) {
    return res.status(400).json({ error: 'name, type and pointsCost are required' });
  }
  const [id] = await db('rewards').insert({
    branch_id: req.user.branch_id,
    name,
    type,
    menu_item_id: menuItemId || null,
    value: value || 0,
    points_cost: pointsCost,
    stock_limit: stockLimit || null
  });
  const reward = await db('rewards').where({ id }).first();
  res.status(201).json({ reward });
});

router.put('/rewards/:id', authorize('admin', 'manager', 'owner'), async (req, res) => {
  const { name, type, menuItemId, value, pointsCost, active, stockLimit } = req.body;
  const updated = await db('rewards')
    .where({ id: req.params.id, branch_id: req.user.branch_id })
    .update({
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(menuItemId !== undefined && { menu_item_id: menuItemId }),
      ...(value !== undefined && { value }),
      ...(pointsCost !== undefined && { points_cost: pointsCost }),
      ...(active !== undefined && { active }),
      ...(stockLimit !== undefined && { stock_limit: stockLimit }),
      updated_at: db.fn.now()
    });
  if (!updated) return res.status(404).json({ error: 'Reward not found' });
  const reward = await db('rewards').where({ id: req.params.id }).first();
  res.json({ reward });
});

router.delete('/rewards/:id', authorize('admin', 'manager', 'owner'), async (req, res) => {
  const deleted = await db('rewards').where({ id: req.params.id, branch_id: req.user.branch_id }).del();
  if (!deleted) return res.status(404).json({ error: 'Reward not found' });
  res.json({ message: 'Reward deleted' });
});

// ---- Customers directory (admin page) ----
router.get('/customers', async (req, res) => {
  const { search, segment } = req.query;
  let query = db('customers').where({ branch_id: req.user.branch_id });
  if (search) {
    query = query.andWhere(builder => {
      builder.where('phone', 'like', `%${search}%`).orWhere('name', 'like', `%${search}%`);
    });
  }
  if (segment === 'new') query = query.andWhere('visits', '<=', 1);
  if (segment === 'vip') query = query.andWhere('total_spent', '>=', 1000);
  const customers = await query.orderBy('last_visit_at', 'desc').limit(200);
  res.json({ customers });
});

router.get('/customers/:id', async (req, res) => {
  const customer = await db('customers').where({ id: req.params.id, branch_id: req.user.branch_id }).first();
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  const ledger = await db('loyalty_ledger')
    .where({ customer_id: customer.id })
    .orderBy('created_at', 'desc')
    .limit(100);
  const orders = await db('orders')
    .where({ customer_id: customer.id })
    .orderBy('created_at', 'desc')
    .limit(50);
  res.json({ customer, ledger, orders });
});

router.post('/customers/:id/adjust', authorize('admin', 'manager', 'owner'), async (req, res) => {
  const { points, note } = req.body;
  if (!points || !Number.isInteger(points)) {
    return res.status(400).json({ error: 'points must be a non-zero integer' });
  }
  const customer = await db('customers').where({ id: req.params.id, branch_id: req.user.branch_id }).first();
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const newBalance = customer.points_balance + points;
  if (newBalance < 0) return res.status(400).json({ error: 'Adjustment would take balance negative' });

  await db('customers').where({ id: customer.id }).update({ points_balance: newBalance });
  await db('loyalty_ledger').insert({
    branch_id: req.user.branch_id,
    customer_id: customer.id,
    type: 'adjust',
    points,
    balance_after: newBalance,
    staff_user_id: req.user.id,
    note: note || 'Manual adjustment'
  });
  await db('audit_logs').insert({
    user_id: req.user.id,
    action: 'LOYALTY_ADJUST',
    meta: JSON.stringify({ customerId: customer.id, points, note })
  });
  logger.info(`Loyalty adjustment for customer ${customer.id}: ${points} by ${req.user.username}`);
  res.json({ customer: { ...customer, points_balance: newBalance } });
});

// ---- POS pay-modal endpoints ----
router.post('/pos/lookup', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone is required' });
  const customer = await findCustomerByPhone(req.user.branch_id, phone);
  if (!customer) return res.json({ found: false });
  const rewards = await listAffordableRewards(req.user.branch_id, customer.points_balance);
  res.json({ found: true, customer, affordableRewards: rewards });
});

router.post('/pos/create', async (req, res) => {
  const { phone, name } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone is required' });
  const existing = await findCustomerByPhone(req.user.branch_id, phone);
  if (existing) return res.status(409).json({ error: 'Customer already exists', customer: existing });
  const customer = await createCustomer(req.user.branch_id, { phone, name });
  logger.info(`Loyalty member created: ${phone} by ${req.user.username}`);
  res.status(201).json({ customer });
});

module.exports = router;
