import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDb } from '../utils/db.js';

const router = Router();

function signTokens(user) {
  const payload = { id: user.id, username: user.username, role: user.role };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign(payload, process.env.REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  const db = getDb();
  const { username, password } = req.body;
  const user = await db('users').where({ username }).first();
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
  const tokens = signTokens(user);
  res.json({ ...tokens, user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name } });
});

/**
 * POST /api/auth/pin-login
 */
router.post('/pin-login', async (req, res) => {
  const db = getDb();
  const { username, pin } = req.body;
  const user = await db('users').where({ username, pin }).first();
  if (!user) return res.status(400).json({ error: 'Invalid PIN' });
  const tokens = signTokens(user);
  res.json({ ...tokens, user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name } });
});

export default router;
