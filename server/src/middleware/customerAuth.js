const jwt = require('jsonwebtoken');
const { db } = require('../database/init');

// Verifies a customer-scoped JWT (distinct from staff tokens via `type`).
// A customer token from restaurant A's subdomain must not authenticate
// requests made against restaurant B's data, so branch_id is re-checked
// against the resolved tenant on every request, not just at login time.
async function authenticateCustomer(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Login required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'customer') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const customer = await db('customers').where({ id: decoded.customerId }).first();
    if (!customer) return res.status(401).json({ error: 'Invalid token' });
    if (req.branchId && customer.branch_id !== req.branchId) {
      return res.status(401).json({ error: 'Invalid token for this restaurant' });
    }
    req.customer = customer;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authenticateCustomer };
