// Single source of truth for legal order status transitions.
// PENDING/AWAITING_PAYMENT are the only pre-confirmation states; once an
// order reaches CONFIRMED, inventory has been committed against it.
const TRANSITIONS = {
  PENDING: ['CONFIRMED', 'AWAITING_PAYMENT', 'CANCELLED'],
  AWAITING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['SERVED', 'CANCELLED'],
  SERVED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: []
};

const CONFIRMED_OR_LATER = ['CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED'];

function canTransition(from, to) {
  if (from === to) return false;
  return Boolean(TRANSITIONS[from]?.includes(to));
}

function isConfirmedOrLater(status) {
  return CONFIRMED_OR_LATER.includes(status);
}

module.exports = { TRANSITIONS, canTransition, isConfirmedOrLater };
