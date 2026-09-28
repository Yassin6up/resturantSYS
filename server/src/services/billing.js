const { db } = require('../database/init');
const { logger } = require('../middleware/errorHandler');

function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    const err = new Error('Stripe is not configured on this server (STRIPE_SECRET_KEY missing)');
    err.code = 'STRIPE_NOT_CONFIGURED';
    throw err;
  }
  // Constructed lazily so a missing key doesn't crash the whole process at
  // require-time - it only breaks the specific billing action attempted.
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
}

async function ensurePlanStripeProduct(plan) {
  if (plan.stripe_product_id && plan.stripe_price_id) return plan;
  const stripe = stripeClient();

  let productId = plan.stripe_product_id;
  if (!productId) {
    const product = await stripe.products.create({
      name: plan.name,
      metadata: { plan_id: String(plan.id) }
    });
    productId = product.id;
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: plan.base_price_cents,
    currency: plan.currency,
    recurring: { interval: plan.interval }
  });

  await db('plans').where({ id: plan.id }).update({
    stripe_product_id: productId,
    stripe_price_id: price.id
  });

  return db('plans').where({ id: plan.id }).first();
}

async function ensureCustomer(branch) {
  if (branch.stripe_customer_id) return branch.stripe_customer_id;
  const stripe = stripeClient();
  const customer = await stripe.customers.create({
    name: branch.name,
    email: branch.email || undefined,
    metadata: { branch_id: String(branch.id) }
  });
  await db('branches').where({ id: branch.id }).update({ stripe_customer_id: customer.id });
  return customer.id;
}

// Stripe prices are immutable, so a custom per-restaurant amount means
// finding-or-creating a Price for that exact amount under the plan's
// product, and reusing it for any other restaurant that happens to pay the
// same custom amount - rather than minting a new Price object every time.
async function getOrCreatePriceForAmount(productId, amountCents, currency, interval) {
  const stripe = stripeClient();
  const existing = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const match = existing.data.find(p =>
    p.unit_amount === amountCents && p.currency === currency && p.recurring?.interval === interval
  );
  if (match) return match.id;

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: amountCents,
    currency,
    recurring: { interval }
  });
  return price.id;
}

// Returns a Stripe Checkout URL that starts the restaurant's subscription.
// The owner sends this link to the restaurant, or the restaurant's own
// admin can be given the link to complete signup themselves.
async function startSubscriptionCheckout(branchId, { successUrl, cancelUrl, trialDays = 14 }) {
  const stripe = stripeClient();
  const branch = await db('branches').where({ id: branchId }).first();
  if (!branch) throw new Error('Restaurant not found');
  if (!branch.plan_id) throw new Error('Assign a plan to this restaurant first');

  let plan = await db('plans').where({ id: branch.plan_id }).first();
  plan = await ensurePlanStripeProduct(plan);

  const customerId = await ensureCustomer(branch);

  const priceId = branch.custom_price_cents != null
    ? await getOrCreatePriceForAmount(plan.stripe_product_id, branch.custom_price_cents, plan.currency, plan.interval)
    : plan.stripe_price_id;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: trialDays > 0 ? { trial_period_days: trialDays } : undefined,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { branch_id: String(branchId) }
  });

  return session.url;
}

// Changes what a restaurant is charged going forward. `immediate: true`
// prorates and charges the difference now; otherwise it takes effect at the
// next billing cycle.
async function changePrice(branchId, newAmountCents, immediate = false) {
  const stripe = stripeClient();
  const branch = await db('branches').where({ id: branchId }).first();
  if (!branch?.stripe_subscription_id) throw new Error('This restaurant has no active subscription');

  let plan = await db('plans').where({ id: branch.plan_id }).first();
  plan = await ensurePlanStripeProduct(plan);

  const newPriceId = await getOrCreatePriceForAmount(plan.stripe_product_id, newAmountCents, plan.currency, plan.interval);
  const subscription = await stripe.subscriptions.retrieve(branch.stripe_subscription_id);
  const itemId = subscription.items.data[0].id;

  await stripe.subscriptions.update(branch.stripe_subscription_id, {
    items: [{ id: itemId, price: newPriceId }],
    proration_behavior: immediate ? 'create_prorations' : 'none'
  });

  await db('branches').where({ id: branchId }).update({ custom_price_cents: newAmountCents });
}

async function cancelSubscription(branchId, atPeriodEnd = true) {
  const stripe = stripeClient();
  const branch = await db('branches').where({ id: branchId }).first();
  if (!branch?.stripe_subscription_id) throw new Error('This restaurant has no active subscription');

  if (atPeriodEnd) {
    await stripe.subscriptions.update(branch.stripe_subscription_id, { cancel_at_period_end: true });
  } else {
    await stripe.subscriptions.cancel(branch.stripe_subscription_id);
  }
}

async function createPortalSession(branchId, returnUrl) {
  const stripe = stripeClient();
  const branch = await db('branches').where({ id: branchId }).first();
  if (!branch?.stripe_customer_id) throw new Error('This restaurant has no billing account yet');

  const session = await stripe.billingPortal.sessions.create({
    customer: branch.stripe_customer_id,
    return_url: returnUrl
  });
  return session.url;
}

// Idempotent: Stripe can (and does) redeliver the same event, so every
// webhook is recorded by its Stripe event id before being acted on.
async function handleWebhookEvent(event) {
  const already = await db('subscription_events').where({ stripe_event_id: event.id }).first();
  if (already) return { alreadyProcessed: true };

  const obj = event.data.object;
  const branchId = obj.metadata?.branch_id
    ? Number(obj.metadata.branch_id)
    : await resolveBranchIdFromStripeObject(obj);

  await db('subscription_events').insert({
    branch_id: branchId || null,
    stripe_event_id: event.id,
    type: event.type,
    payload: JSON.stringify(obj).slice(0, 20000)
  });

  switch (event.type) {
    case 'checkout.session.completed': {
      if (branchId && obj.subscription) {
        await setSubscriptionStatus(branchId, 'trialing', { stripe_subscription_id: obj.subscription });
        logger.info(`Restaurant ${branchId} completed subscription checkout`);
      }
      break;
    }

    case 'customer.subscription.updated': {
      if (branchId) {
        await setSubscriptionStatus(branchId, obj.status, {
          current_period_end: new Date(obj.current_period_end * 1000)
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      if (branchId) {
        await setSubscriptionStatus(branchId, 'canceled', { is_active: false });
        logger.warn(`Restaurant ${branchId} subscription cancelled - suspended`);
      }
      break;
    }

    case 'invoice.paid': {
      if (branchId) {
        await setSubscriptionStatus(branchId, 'active');
        await recordInvoice(branchId, obj, 'paid');
      }
      break;
    }

    case 'invoice.payment_failed': {
      if (branchId) {
        await setSubscriptionStatus(branchId, 'past_due');
        await recordInvoice(branchId, obj, 'open');
        logger.warn(`Payment failed for restaurant ${branchId} - marked past_due`);
      }
      break;
    }

    default:
      break;
  }

  return { processed: true };
}

async function recordInvoice(branchId, invoiceObj, status) {
  const existing = await db('platform_invoices').where({ stripe_invoice_id: invoiceObj.id }).first();
  const fields = {
    branch_id: branchId,
    stripe_invoice_id: invoiceObj.id,
    amount_cents: invoiceObj.amount_paid || invoiceObj.amount_due,
    currency: invoiceObj.currency,
    status,
    hosted_invoice_url: invoiceObj.hosted_invoice_url,
    period_start: invoiceObj.period_start ? new Date(invoiceObj.period_start * 1000) : null,
    period_end: invoiceObj.period_end ? new Date(invoiceObj.period_end * 1000) : null
  };
  if (existing) {
    await db('platform_invoices').where({ id: existing.id }).update(fields);
  } else {
    await db('platform_invoices').insert(fields);
  }
}

async function setSubscriptionStatus(branchId, status, extraFields = {}) {
  await db('branches').where({ id: branchId }).update({
    subscription_status: status,
    subscription_status_changed_at: db.fn.now(),
    ...extraFields
  });
}

async function resolveBranchIdFromStripeObject(obj) {
  if (!obj.customer) return null;
  const branch = await db('branches').where({ stripe_customer_id: obj.customer }).first();
  return branch?.id || null;
}

// Suspends any restaurant whose subscription has been past_due for more
// than the grace period. Ties directly into the suspension mechanism
// already enforced across the menu, ordering, and admin UI.
const PAST_DUE_GRACE_DAYS = 7;
async function suspendOverdueRestaurants() {
  const cutoff = new Date(Date.now() - PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000);
  const overdue = await db('branches')
    .where({ subscription_status: 'past_due', is_active: true })
    .andWhere('subscription_status_changed_at', '<=', cutoff);

  for (const branch of overdue) {
    await db('branches').where({ id: branch.id }).update({ is_active: false });
    logger.warn(`Restaurant ${branch.id} auto-suspended: past_due beyond ${PAST_DUE_GRACE_DAYS}-day grace period`);
  }
}

module.exports = {
  ensurePlanStripeProduct,
  ensureCustomer,
  startSubscriptionCheckout,
  changePrice,
  cancelSubscription,
  createPortalSession,
  handleWebhookEvent,
  suspendOverdueRestaurants
};
