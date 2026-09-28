const express = require('express');
const { db } = require('../database/init');
const { authenticateCustomer } = require('../middleware/customerAuth');
const { getOrCreateSettings } = require('../utils/loyalty');

const router = express.Router();

router.use(authenticateCustomer);

router.get('/me', async (req, res) => {
  const { password_hash, ...customer } = req.customer;
  res.json({ customer });
});

router.put('/me', async (req, res) => {
  const { name, email, birthday, marketingConsent } = req.body;
  await db('customers')
    .where({ id: req.customer.id })
    .update({
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(birthday !== undefined && { birthday }),
      ...(marketingConsent !== undefined && { marketing_consent: marketingConsent }),
      updated_at: db.fn.now()
    });
  const { password_hash, ...customer } = await db('customers').where({ id: req.customer.id }).first();
  res.json({ customer });
});

router.get('/orders', async (req, res) => {
  const orders = await db('orders')
    .where({ customer_id: req.customer.id })
    .orderBy('created_at', 'desc')
    .limit(100);
  res.json({ orders });
});

router.get('/ledger', async (req, res) => {
  const ledger = await db('loyalty_ledger')
    .where({ customer_id: req.customer.id })
    .orderBy('created_at', 'desc')
    .limit(100);
  res.json({ ledger });
});

router.get('/rewards', async (req, res) => {
  const rewards = await db('rewards')
    .where({ branch_id: req.customer.branch_id, active: true })
    .orderBy('points_cost');
  const withAffordability = rewards.map(r => ({
    ...r,
    affordable: req.customer.points_balance >= r.points_cost,
    pointsShort: Math.max(0, r.points_cost - req.customer.points_balance)
  }));
  res.json({ rewards: withAffordability, pointsBalance: req.customer.points_balance });
});

router.get('/settings', async (req, res) => {
  const settings = await getOrCreateSettings(req.customer.branch_id);
  res.json({ settings: { enabled: settings.enabled, amountPerPoint: settings.amount_per_point } });
});

module.exports = router;
