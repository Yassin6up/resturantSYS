const express = require('express');
const { db } = require('../database/init');
const { authenticateToken, authorize } = require('../middleware/auth');
const { logger } = require('../middleware/errorHandler');
const billing = require('../services/billing');

const router = express.Router();

function centsToDisplay(cents, currency) {
  return { amount: (cents / 100).toFixed(2), currency: (currency || 'usd').toUpperCase() };
}

// ---- Plans (owner only) ----
router.get('/plans', authenticateToken, authorize('owner'), async (req, res) => {
  const plans = await db('plans').orderBy('base_price_cents');
  res.json({ plans });
});

router.post('/plans', authenticateToken, authorize('owner'), async (req, res) => {
  const { name, basePriceCents, currency, interval, features } = req.body;
  if (!name || !basePriceCents) {
    return res.status(400).json({ error: 'name and basePriceCents are required' });
  }
  const [id] = await db('plans').insert({
    name,
    base_price_cents: basePriceCents,
    currency: (currency || 'usd').toLowerCase(),
    interval: interval || 'month',
    features_json: features ? JSON.stringify(features) : null
  });
  const plan = await db('plans').where({ id }).first();
  res.status(201).json({ plan });
});

router.put('/plans/:id', authenticateToken, authorize('owner'), async (req, res) => {
  const { name, basePriceCents, active, features } = req.body;
  await db('plans').where({ id: req.params.id }).update({
    ...(name !== undefined && { name }),
    ...(basePriceCents !== undefined && { base_price_cents: basePriceCents }),
    ...(active !== undefined && { active }),
    ...(features !== undefined && { features_json: JSON.stringify(features) }),
    updated_at: db.fn.now()
  });
  const plan = await db('plans').where({ id: req.params.id }).first();
  res.json({ plan });
});

// ---- Per-restaurant billing management (owner only) ----
router.get('/restaurants/:id', authenticateToken, authorize('owner'), async (req, res) => {
  const branch = await db('branches').where({ id: req.params.id, owner_id: req.user.id }).first();
  if (!branch) return res.status(404).json({ error: 'Restaurant not found' });

  const plan = branch.plan_id ? await db('plans').where({ id: branch.plan_id }).first() : null;
  const invoices = await db('platform_invoices')
    .where({ branch_id: branch.id })
    .orderBy('created_at', 'desc')
    .limit(24);

  const effectiveCents = branch.custom_price_cents != null ? branch.custom_price_cents : plan?.base_price_cents;

  res.json({
    subscriptionStatus: branch.subscription_status,
    trialEndsAt: branch.trial_ends_at,
    currentPeriodEnd: branch.current_period_end,
    hasStripeCustomer: !!branch.stripe_customer_id,
    hasActiveSubscription: !!branch.stripe_subscription_id,
    plan,
    price: effectiveCents != null ? centsToDisplay(effectiveCents, plan?.currency) : null,
    isCustomPrice: branch.custom_price_cents != null,
    invoices: invoices.map(inv => ({
      ...inv,
      display: centsToDisplay(inv.amount_cents, inv.currency)
    }))
  });
});

router.post('/restaurants/:id/plan', authenticateToken, authorize('owner'), async (req, res) => {
  const { planId } = req.body;
  const branch = await db('branches').where({ id: req.params.id, owner_id: req.user.id }).first();
  if (!branch) return res.status(404).json({ error: 'Restaurant not found' });

  await db('branches').where({ id: branch.id }).update({ plan_id: planId, custom_price_cents: null });
  res.json({ message: 'Plan assigned' });
});

router.post('/restaurants/:id/price', authenticateToken, authorize('owner'), async (req, res) => {
  const { amountCents, applyImmediately } = req.body;
  if (!amountCents || amountCents < 0) {
    return res.status(400).json({ error: 'amountCents must be a positive number' });
  }
  const branch = await db('branches').where({ id: req.params.id, owner_id: req.user.id }).first();
  if (!branch) return res.status(404).json({ error: 'Restaurant not found' });

  try {
    if (branch.stripe_subscription_id) {
      await billing.changePrice(branch.id, amountCents, !!applyImmediately);
    } else {
      // No live subscription yet (e.g. still pre-checkout) - just record the
      // intended price; it's applied when the checkout session is created.
      await db('branches').where({ id: branch.id }).update({ custom_price_cents: amountCents });
    }
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'BILLING_PRICE_CHANGE',
      meta: JSON.stringify({ branchId: branch.id, amountCents, applyImmediately: !!applyImmediately })
    });
    res.json({ message: 'Price updated' });
  } catch (error) {
    logger.error('Billing price change error:', error);
    res.status(400).json({ error: error.code === 'STRIPE_NOT_CONFIGURED' ? error.message : 'Failed to update price' });
  }
});

router.post('/restaurants/:id/checkout-link', authenticateToken, authorize('owner'), async (req, res) => {
  const { successUrl, cancelUrl, trialDays } = req.body;
  const branch = await db('branches').where({ id: req.params.id, owner_id: req.user.id }).first();
  if (!branch) return res.status(404).json({ error: 'Restaurant not found' });

  try {
    const url = await billing.startSubscriptionCheckout(branch.id, {
      successUrl: successUrl || `${process.env.FRONTEND_URL}/owner/restaurants/${branch.id}?billing=success`,
      cancelUrl: cancelUrl || `${process.env.FRONTEND_URL}/owner/restaurants/${branch.id}?billing=cancelled`,
      trialDays: trialDays ?? 14
    });
    res.json({ url });
  } catch (error) {
    logger.error('Checkout link error:', error);
    res.status(400).json({ error: error.code === 'STRIPE_NOT_CONFIGURED' ? error.message : error.message || 'Failed to create checkout link' });
  }
});

router.post('/restaurants/:id/cancel', authenticateToken, authorize('owner'), async (req, res) => {
  const branch = await db('branches').where({ id: req.params.id, owner_id: req.user.id }).first();
  if (!branch) return res.status(404).json({ error: 'Restaurant not found' });

  try {
    await billing.cancelSubscription(branch.id, req.body.atPeriodEnd !== false);
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'BILLING_SUBSCRIPTION_CANCEL',
      meta: JSON.stringify({ branchId: branch.id })
    });
    res.json({ message: 'Subscription cancellation scheduled' });
  } catch (error) {
    logger.error('Cancel subscription error:', error);
    res.status(400).json({ error: error.message || 'Failed to cancel subscription' });
  }
});

// ---- Restaurant's own billing (admin role, their own branch) ----
router.get('/my/status', authenticateToken, authorize('admin'), async (req, res) => {
  const branch = await db('branches').where({ id: req.user.branch_id }).first();
  if (!branch) return res.status(404).json({ error: 'Restaurant not found' });
  const plan = branch.plan_id ? await db('plans').where({ id: branch.plan_id }).first() : null;
  const effectiveCents = branch.custom_price_cents != null ? branch.custom_price_cents : plan?.base_price_cents;

  res.json({
    subscriptionStatus: branch.subscription_status,
    trialEndsAt: branch.trial_ends_at,
    currentPeriodEnd: branch.current_period_end,
    planName: plan?.name || null,
    price: effectiveCents != null ? centsToDisplay(effectiveCents, plan?.currency) : null
  });
});

router.get('/my/portal', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const url = await billing.createPortalSession(
      req.user.branch_id,
      `${process.env.FRONTEND_URL}/admin/settings`
    );
    res.json({ url });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to open billing portal' });
  }
});

// ---- Stripe webhook ----
// Uses req.rawBody (stashed by the global express.json() verify hook in
// index.js) rather than an express.raw() middleware here, which would
// receive an already-drained stream and get nothing to verify.
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_BILLING_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('Billing webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    await billing.handleWebhookEvent(event);
    res.json({ received: true });
  } catch (error) {
    logger.error('Billing webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
