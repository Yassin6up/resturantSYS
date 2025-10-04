import { Router } from 'express';
import db from '../../utils/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await db('users').where({ username }).first();
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });
  const payload = { id: user.id, username: user.username, role: user.role };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'devsecretchange', { expiresIn: '1h' });
  const refreshToken = jwt.sign(payload, process.env.REFRESH_SECRET || 'devrefreshsecret', { expiresIn: '7d' });
  res.json({ accessToken, refreshToken, user: payload });
});

router.post('/pin-login', async (req, res) => {
  const { username, pin } = req.body;
  const user = await db('users').where({ username, pin }).first();
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const payload = { id: user.id, username: user.username, role: user.role };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'devsecretchange', { expiresIn: '1h' });
  const refreshToken = jwt.sign(payload, process.env.REFRESH_SECRET || 'devrefreshsecret', { expiresIn: '7d' });
  res.json({ accessToken, refreshToken, user: payload });
});

export default router;
