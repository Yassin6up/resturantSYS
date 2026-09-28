const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database/init');
const { requireTenant } = require('../middleware/tenant');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { findCustomerByPhone, createCustomer } = require('../utils/loyalty');

const router = express.Router();

// Every route here needs a resolved restaurant (subdomain or X-Branch-Slug) -
// a customer account is scoped to exactly one restaurant.
router.use(requireTenant);

function issueToken(customer) {
  return jwt.sign(
    { type: 'customer', customerId: customer.id, branchId: customer.branch_id },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// NOTE: this is phone + password, not phone + SMS/WhatsApp OTP. Real OTP
// needs a provider account (Twilio/Infobip) that hasn't been set up yet -
// swap this for a send-code/verify-code pair once one is chosen, without
// changing the token shape or downstream routes.
router.post('/register', authRateLimiter, async (req, res) => {
  const { phone, name, password } = req.body;
  if (!phone || !password || password.length < 6) {
    return res.status(400).json({ error: 'Phone and a password of at least 6 characters are required' });
  }
  const existing = await findCustomerByPhone(req.branchId, phone);
  if (existing) return res.status(409).json({ error: 'An account with this phone number already exists' });

  const passwordHash = await bcrypt.hash(password, 10);
  const customer = await createCustomer(req.branchId, { phone, name, passwordHash });
  res.status(201).json({ token: issueToken(customer), customer: sanitize(customer) });
});

router.post('/login', authRateLimiter, async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Phone and password are required' });

  const customer = await findCustomerByPhone(req.branchId, phone);
  if (!customer || !customer.password_hash) {
    return res.status(401).json({ error: 'Invalid phone number or password' });
  }
  const valid = await bcrypt.compare(password, customer.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid phone number or password' });

  res.json({ token: issueToken(customer), customer: sanitize(customer) });
});

function sanitize(customer) {
  const { password_hash, ...rest } = customer;
  return rest;
}

module.exports = router;
