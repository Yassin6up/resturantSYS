const jwt = require('jsonwebtoken');
const { db } = require('../database/init');

async function resolveUserBranch(user) {
  if (user.role !== 'owner') return user;
  // Legacy owner accounts can retain a staff assignment to another business.
  // Only an owned business may supply the owner's operational workspace.
  const assigned = user.branch_id && await db('branches').where({ id: user.branch_id, owner_id: user.id }).first();
  const owned = assigned || await db('branches').where({ owner_id: user.id }).orderBy('id').first();
  user.branch_id = owned?.id || null;
  return user;
}

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db('users').where({ id: decoded.userId }).first();
    
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    // A solo self-signup owner has no branch_id (owners can own several
    // stores, so it's never assigned one at creation) but still needs to run
    // their own store's day-to-day from /admin. Attach their own store's id
    // in-memory only - never persisted - so every existing branch_id-scoped
    // route works for them without each one needing its own owner lookup.
    // A multi-restaurant owner resolves to their first (oldest) store; the
    // multi-store case is still meant to be run via per-branch admin
    // employee accounts, not by the owner logging into /admin directly.
    await resolveUserBranch(user);

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Like authenticateToken, but never rejects the request - it just sets
// req.user when a valid staff token is present, and moves on silently
// otherwise. Used on routes that serve both anonymous customers and logged-in
// staff (e.g. order creation from the POS), so the server can trust the
// staff member's own branch_id instead of a client-supplied one when it can.
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db('users').where({ id: decoded.userId }).first();
    if (user && user.is_active) {
      await resolveUserBranch(user);
      req.user = user;
    }
  } catch (error) {
    // invalid/expired token on an optional-auth route - treat as anonymous
  }
  next();
};

// Blocks write operations for staff of a suspended restaurant. A
// multi-restaurant owner with no resolvable branch_id is never affected
// (their /owner console for managing other stores must stay reachable).
// A solo owner running their own suspended store from /admin is blocked
// like any other staff member - that's the intended enforcement point.
// This is defense-in-depth on top of the frontend's full-screen lockout -
// direct API calls can't bypass it either.
const requireActiveBranch = async (req, res, next) => {
  if (!req.user?.branch_id) return next();
  try {
    const branch = await db('branches').where({ id: req.user.branch_id }).first();
    if (branch && (branch.is_active === false || branch.is_active === 0)) {
      return res.status(403).json({
        error: 'RESTAURANT_SUSPENDED',
        message: 'This restaurant has been suspended. Contact the platform owner to resolve this.'
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Owner sits above every staff role in this app's hierarchy (it already
    // has its own owner-exclusive routes elsewhere) - it satisfies any
    // staff-role check too, so a solo owner can run their own store's admin
    // panel without a separate admin employee account.
    if (req.user.role === 'owner') return next();

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

const authenticatePin = async (req, res, next) => {
  const { username, pin } = req.body;

  if (!username || !pin) {
    return res.status(400).json({ error: 'Username and PIN required' });
  }

  try {
    const user = await db('users').where({ username, pin }).first();
    
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  authorize,
  authenticatePin,
  requireActiveBranch
};
