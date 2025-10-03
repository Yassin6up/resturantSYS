import { Router } from 'express';
import bcrypt from 'bcrypt';
import { getDb } from '../utils/db.js';
import { auth } from '../middlewares/auth.js';

const router = Router();

// GET /api/users (admin)
router.get('/', auth(['admin']), async (_req, res) => {
  const db = getDb();
  const users = await db('users').select('id','username','full_name','role','is_active','created_at');
  res.json(users);
});

// POST /api/users (admin)
router.post('/', auth(['admin']), async (req, res) => {
  const db = getDb();
  const { username, password, full_name, role, pin } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: 'Missing fields' });
  const password_hash = await bcrypt.hash(password, 10);
  try {
    const [id] = await db('users').insert({ username, password_hash, full_name, role, pin });
    const user = await db('users').where({ id }).first();
    res.status(201).json({ id: user.id, username: user.username, full_name: user.full_name, role: user.role });
  } catch (e) {
    if (String(e.message || '').includes('UNIQUE')) return res.status(400).json({ error: 'Username exists' });
    throw e;
  }
});

export default router;
