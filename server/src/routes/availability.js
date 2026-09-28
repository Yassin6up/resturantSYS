const express = require('express');
const router = express.Router();
const { db } = require('../database/init');
const { authenticateToken, authorize } = require('../middleware/auth');
const { resolveTenant, requireTenant } = require('../middleware/tenant');
const { logger } = require('../middleware/errorHandler');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Default weekly schedule seeded for every new appointments/hotel/office
// store: Mon-Fri 9-18, Sat 10-14, Sun closed.
const DEFAULT_HOURS = [
  { day_of_week: 0, is_open: false, open_time: '09:00', close_time: '18:00' },
  { day_of_week: 1, is_open: true, open_time: '09:00', close_time: '18:00' },
  { day_of_week: 2, is_open: true, open_time: '09:00', close_time: '18:00' },
  { day_of_week: 3, is_open: true, open_time: '09:00', close_time: '18:00' },
  { day_of_week: 4, is_open: true, open_time: '09:00', close_time: '18:00' },
  { day_of_week: 5, is_open: true, open_time: '09:00', close_time: '18:00' },
  { day_of_week: 6, is_open: true, open_time: '10:00', close_time: '14:00' },
];

async function seedDefaultHours(dbOrTrx, branchId) {
  await dbOrTrx('business_hours').insert(
    DEFAULT_HOURS.map(h => ({ branch_id: branchId, ...h }))
  );
}

function resolveManagedBranchId(req) {
  return req.user.branch_id || null;
}

// Admin: get this store's weekly hours + upcoming blocked dates
router.get('/', authenticateToken, async (req, res) => {
  try {
    const branchId = resolveManagedBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'No store associated with this account' });

    let hours = await db('business_hours').where({ branch_id: branchId }).orderBy('day_of_week');
    if (hours.length === 0) {
      await seedDefaultHours(db, branchId);
      hours = await db('business_hours').where({ branch_id: branchId }).orderBy('day_of_week');
    }
    const exceptions = await db('availability_exceptions')
      .where({ branch_id: branchId })
      .where('date', '>=', new Date().toISOString().slice(0, 10))
      .orderBy('date');

    res.json({
      hours: hours.map(h => ({ ...h, day_name: DAY_NAMES[h.day_of_week] })),
      exceptions
    });
  } catch (error) {
    logger.error('Error fetching availability:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// Admin: bulk-update the weekly schedule
router.put('/hours', authenticateToken, authorize('admin', 'owner', 'manager'), async (req, res) => {
  try {
    const branchId = resolveManagedBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'No store associated with this account' });

    const { hours } = req.body;
    if (!Array.isArray(hours)) return res.status(400).json({ error: 'hours must be an array' });

    if (hours.some(h => !Number.isInteger(h.day_of_week) || h.day_of_week < 0 || h.day_of_week > 6 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(h.open_time) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(h.close_time) || (h.is_open && h.open_time >= h.close_time))) return res.status(400).json({ error: 'Each day needs valid opening and closing times, with closing after opening' });
    for (const h of hours) {
      if (h.day_of_week === undefined || h.day_of_week < 0 || h.day_of_week > 6) continue;
      const existing = await db('business_hours').where({ branch_id: branchId, day_of_week: h.day_of_week }).first();
      if (existing) {
        await db('business_hours').where({ id: existing.id }).update({
          is_open: !!h.is_open,
          open_time: h.open_time || existing.open_time,
          close_time: h.close_time || existing.close_time,
          updated_at: db.raw('CURRENT_TIMESTAMP')
        });
      } else {
        await db('business_hours').insert({
          branch_id: branchId,
          day_of_week: h.day_of_week,
          is_open: !!h.is_open,
          open_time: h.open_time || '09:00',
          close_time: h.close_time || '18:00'
        });
      }
    }

    const updated = await db('business_hours').where({ branch_id: branchId }).orderBy('day_of_week');
    res.json({ hours: updated.map(h => ({ ...h, day_name: DAY_NAMES[h.day_of_week] })) });
  } catch (error) {
    logger.error('Error updating business hours:', error);
    res.status(500).json({ error: 'Failed to update business hours' });
  }
});

// Admin: block a specific date (holiday, day off)
router.post('/exceptions', authenticateToken, authorize('admin', 'owner', 'manager'), async (req, res) => {
  try {
    const branchId = resolveManagedBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'No store associated with this account' });

    const { date, reason } = req.body;
    if (!date) return res.status(400).json({ error: 'date is required' });

    const [id] = await db('availability_exceptions').insert({ branch_id: branchId, date, reason: reason || null });
    const exception = await db('availability_exceptions').where({ id }).first();
    res.status(201).json({ exception });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT' || error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'That date is already blocked' });
    }
    logger.error('Error creating availability exception:', error);
    res.status(500).json({ error: 'Failed to block date' });
  }
});

router.delete('/exceptions/:id', authenticateToken, authorize('admin', 'owner', 'manager'), async (req, res) => {
  try {
    const branchId = resolveManagedBranchId(req);
    const deleted = await db('availability_exceptions').where({ id: req.params.id, branch_id: branchId }).del();
    if (!deleted) return res.status(404).json({ error: 'Exception not found' });
    res.json({ message: 'Date unblocked' });
  } catch (error) {
    logger.error('Error deleting availability exception:', error);
    res.status(500).json({ error: 'Failed to unblock date' });
  }
});

module.exports = router;
module.exports.seedDefaultHours = seedDefaultHours;
