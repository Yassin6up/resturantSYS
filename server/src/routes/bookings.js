const express = require('express');
const router = express.Router();
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const { resolveTenant, requireTenant } = require('../middleware/tenant');
const { logger } = require('../middleware/errorHandler');

const { availableSlots, localDate } = require('../utils/bookingSlots');

async function resolveManagedBranchId(req) {
  if (req.user.branch_id) return req.user.branch_id;
  if (req.user.role === 'owner') {
    const branch = await db('branches').where({ owner_id: req.user.id }).orderBy('id').first();
    return branch ? branch.id : null;
  }
  return null;
}

// Public: create a booking (customer-facing appointments/hotel/office storefront)
router.post('/', resolveTenant, requireTenant, async (req, res) => {
  try {
    const { serviceId, customerName, customerPhone, customerEmail, startTime, notes } = req.body;

    if (!serviceId || !customerName || !customerPhone || !startTime) {
      return res.status(400).json({ error: 'Service, name, phone, and start time are required' });
    }

    const service = await db('services')
      .where({ id: serviceId, branch_id: req.branchId, is_active: true })
      .first();
    if (!service) return res.status(404).json({ error: 'Service not found' });

    const start = new Date(startTime);
    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({ error: 'Invalid start time' });
    }
    const end = new Date(start.getTime() + service.duration_minutes * 60000);

    if (start.getTime() <= Date.now() || !customerName.trim() || !customerPhone.trim()) {
      return res.status(400).json({ error: 'Choose a future time and provide your name and phone' });
    }
    const booking = await db.transaction(async trx => {
      // Serialize availability checks for this resource across concurrent requests.
      await trx('services').where({ id: service.id }).update({ updated_at: trx.fn.now() });
      const availability = await availableSlots(trx, req.branchId, service, localDate(start));
      if (!availability.slots.includes(start.toISOString())) {
        throw Object.assign(new Error('This time is no longer available. Please choose another time.'), { status: 409 });
      }
      const [id] = await trx('bookings').insert({
        branch_id: req.branchId, service_id: service.id, customer_id: null,
        customer_name: customerName.trim(), customer_phone: customerPhone.trim(),
        customer_email: customerEmail || null, start_time: start.toISOString(),
        end_time: end.toISOString(), status: 'pending', notes: notes || null
      });
      return trx('bookings').where({ id }).first();
    });

    res.status(201).json({ booking });
  } catch (error) {
    logger.error('Error creating booking:', error);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to create booking' });
  }
});

// Public: available slots for a service on a given date, driven by the
// store's own configured weekly hours + blocked dates (see availability.js) -
// not a fixed window every store is stuck with.
router.get('/availability', resolveTenant, requireTenant, async (req, res) => {
  try {
    const { serviceId, date } = req.query;
    if (!serviceId || !date) return res.status(400).json({ error: 'serviceId and date are required' });

    const service = await db('services').where({ id: serviceId, branch_id: req.branchId, is_active: true }).first();
    if (!service) return res.status(404).json({ error: 'Service not found' });

    res.json(await availableSlots(db, req.branchId, service, date));
  } catch (error) {
    logger.error('Error computing availability:', error);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to compute availability' });
  }
});

// Admin: list bookings for the logged-in staff member's branch
router.get('/', authenticateToken, async (req, res) => {
  try {
    const branchId = await resolveManagedBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'No store associated with this account' });

    const bookings = await db('bookings')
      .join('services', 'bookings.service_id', 'services.id')
      .where('bookings.branch_id', branchId)
      .select('bookings.*', 'services.name as service_name')
      .orderBy('bookings.start_time', 'desc');

    res.json({ bookings });
  } catch (error) {
    logger.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const branchId = await resolveManagedBranchId(req);
    const { status } = req.body;
    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const booking = await db('bookings').where({ id: req.params.id, branch_id: branchId }).first();
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (['completed', 'cancelled'].includes(booking.status) && status !== booking.status) return res.status(409).json({ error: 'A closed booking cannot be reopened. Create a new booking.' });
    await db('bookings').where({ id: req.params.id }).update({ status, updated_at: db.raw('CURRENT_TIMESTAMP') });
    const updated = await db('bookings').where({ id: req.params.id }).first();
    res.json({ booking: updated });
  } catch (error) {
    logger.error('Error updating booking status:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

module.exports = router;
