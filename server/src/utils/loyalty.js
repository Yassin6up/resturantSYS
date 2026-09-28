const { db } = require('../database/init');

async function getOrCreateSettings(branchId) {
  let settings = await db('loyalty_settings').where({ branch_id: branchId }).first();
  if (!settings) {
    await db('loyalty_settings').insert({ branch_id: branchId }).onConflict('branch_id').ignore();
    settings = await db('loyalty_settings').where({ branch_id: branchId }).first();
  }
  return settings;
}

async function findCustomerByPhone(branchId, phone) {
  return db('customers').where({ branch_id: branchId, phone }).first();
}

async function createCustomer(branchId, { phone, name, passwordHash = null }) {
  const settings = await getOrCreateSettings(branchId);
  const [id] = await db('customers').insert({
    branch_id: branchId,
    phone,
    name: name || null,
    password_hash: passwordHash,
    points_balance: settings.welcome_bonus || 0,
    lifetime_points: settings.welcome_bonus || 0
  });
  if (settings.welcome_bonus) {
    await db('loyalty_ledger').insert({
      branch_id: branchId,
      customer_id: id,
      type: 'earn',
      points: settings.welcome_bonus,
      balance_after: settings.welcome_bonus,
      note: 'Welcome bonus'
    });
  }
  return db('customers').where({ id }).first();
}

// Rewards a customer in `branchId` can currently afford, cheapest first.
async function listAffordableRewards(branchId, pointsBalance) {
  return db('rewards')
    .where({ branch_id: branchId, active: true })
    .andWhere('points_cost', '<=', pointsBalance)
    .orderBy('points_cost', 'asc');
}

function computeDiscount(reward, itemsSubtotal, menuItemPrice) {
  if (reward.type === 'free_item') return menuItemPrice || 0;
  if (reward.type === 'percent_off') return Number((itemsSubtotal * (reward.value / 100)).toFixed(2));
  if (reward.type === 'amount_off') return Math.min(Number(reward.value), itemsSubtotal);
  return 0;
}

// Read-only: validates a reward is redeemable by this customer right now and
// computes the discount it would produce. Safe to call before an order
// exists yet (e.g. to size the order total before insert).
// `conn` defaults to the module connection, but MUST be passed as the active
// transaction when called from inside one (e.g. order creation) - SQLite
// only allows one writer connection at a time, so querying through a second
// connection while a transaction is open on the first deadlocks the pool.
async function previewReward({ branchId, customerId, rewardId, itemsSubtotal }, conn = db) {
  const reward = await conn('rewards').where({ id: rewardId, branch_id: branchId, active: true }).first();
  if (!reward) throw new Error('Reward not found or inactive');
  if (reward.stock_limit != null && reward.redeemed_count >= reward.stock_limit) {
    throw new Error('Reward is no longer available');
  }

  const customer = await conn('customers').where({ id: customerId, branch_id: branchId }).first();
  if (!customer) throw new Error('Customer not found');
  if (customer.points_balance < reward.points_cost) throw new Error('Not enough points for this reward');

  let menuItemPrice = 0;
  if (reward.type === 'free_item' && reward.menu_item_id) {
    const item = await conn('menu_items').where({ id: reward.menu_item_id }).first();
    menuItemPrice = item ? Number(item.price) : 0;
  }
  const discount = computeDiscount(reward, itemsSubtotal, menuItemPrice);
  return { reward, discount };
}

// Writes the effects of a redemption already sized by previewReward:
// deducts points, bumps the reward's redeemed_count, logs the ledger entry.
// Re-validates the balance so a race between preview and apply can't put a
// customer's points negative.
async function applyRedemption({ branchId, customerId, reward, orderId, staffUserId }) {
  const customer = await db('customers').where({ id: customerId, branch_id: branchId }).first();
  if (!customer || customer.points_balance < reward.points_cost) {
    throw new Error('Customer no longer has enough points for this reward');
  }
  const newBalance = customer.points_balance - reward.points_cost;
  await db('customers').where({ id: customerId }).update({ points_balance: newBalance });
  await db('rewards').where({ id: reward.id }).increment('redeemed_count', 1);
  await db('loyalty_ledger').insert({
    branch_id: branchId,
    customer_id: customerId,
    order_id: orderId || null,
    type: 'redeem',
    points: -reward.points_cost,
    balance_after: newBalance,
    staff_user_id: staffUserId || null,
    note: `Redeemed: ${reward.name}`
  });
}

// Awards points for a paid order, exactly once (guarded by loyalty_processed).
// earn_mode 'per_item' sums menu_items.loyalty_points across order items;
// 'per_amount' divides the paid amount (after any loyalty discount) by
// settings.amount_per_point.
async function earnPointsForOrder(orderId) {
  const claimed = await db('orders')
    .where({ id: orderId, loyalty_processed: false })
    .update({ loyalty_processed: true });
  if (!claimed) return;

  const order = await db('orders').where({ id: orderId }).first();
  if (!order.customer_id) return; // no loyalty customer attached to this order

  const settings = await getOrCreateSettings(order.branch_id);
  if (!settings.enabled) return;

  let points = 0;
  if (settings.earn_mode === 'per_item') {
    const items = await db('order_items')
      .join('menu_items', 'order_items.menu_item_id', 'menu_items.id')
      .where({ 'order_items.order_id': orderId })
      .select('menu_items.loyalty_points', 'order_items.quantity');
    points = items.reduce((sum, i) => sum + (i.loyalty_points || 0) * i.quantity, 0);
  } else {
    const netPaid = Math.max(0, Number(order.total) - Number(order.loyalty_discount || 0));
    const unit = Number(settings.amount_per_point) || 10;
    points = Math.floor(netPaid / unit);
  }

  if (points <= 0) return;

  const customer = await db('customers').where({ id: order.customer_id }).first();
  if (!customer) return;

  const newBalance = customer.points_balance + points;
  await db('customers')
    .where({ id: customer.id })
    .update({
      points_balance: newBalance,
      lifetime_points: customer.lifetime_points + points,
      total_spent: Number(customer.total_spent) + Number(order.total),
      visits: customer.visits + 1,
      last_visit_at: db.fn.now()
    });
  await db('orders').where({ id: orderId }).update({ loyalty_points_earned: points });
  await db('loyalty_ledger').insert({
    branch_id: order.branch_id,
    customer_id: customer.id,
    order_id: orderId,
    type: 'earn',
    points,
    balance_after: newBalance,
    note: `Order ${order.order_code}`
  });
}

// Reverses whatever loyalty effects (earn and/or redeem) an order caused,
// e.g. on cancellation/refund. Safe to call on an order with no loyalty
// activity at all.
async function reverseLoyaltyForOrder(orderId) {
  const order = await db('orders').where({ id: orderId }).first();
  if (!order || !order.customer_id) return;

  const entries = await db('loyalty_ledger').where({ order_id: orderId });
  if (!entries.length) return;

  const netPoints = entries.reduce((sum, e) => sum + e.points, 0);
  if (netPoints === 0) return;

  const customer = await db('customers').where({ id: order.customer_id }).first();
  if (!customer) return;

  // Reversing an 'earn' (positive) subtracts; reversing a 'redeem' (negative) adds back.
  const newBalance = customer.points_balance - netPoints;
  await db('customers').where({ id: customer.id }).update({ points_balance: newBalance });
  await db('loyalty_ledger').insert({
    branch_id: order.branch_id,
    customer_id: customer.id,
    order_id: orderId,
    type: 'reverse',
    points: -netPoints,
    balance_after: newBalance,
    note: `Reversal for order ${order.order_code}`
  });
  await db('orders').where({ id: orderId }).update({ loyalty_processed: false, loyalty_points_earned: 0 });
}

module.exports = {
  getOrCreateSettings,
  findCustomerByPhone,
  createCustomer,
  listAffordableRewards,
  computeDiscount,
  previewReward,
  applyRedemption,
  earnPointsForOrder,
  reverseLoyaltyForOrder
};
