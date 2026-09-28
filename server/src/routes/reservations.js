const router = require('express').Router();
const { db } = require('../database/init');
const { resolveTenant, requireTenant } = require('../middleware/tenant');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validDate } = require('../utils/bookingSlots');
const active = ['pending', 'confirmed', 'seated'];

async function times(database, branchId, date, partySize) {
  if (!validDate(date) || !Number.isInteger(partySize) || partySize < 1 || partySize > 30) throw Object.assign(new Error('Choose a valid date and a party size from 1 to 30'), { status: 400 });
  const blocked = await database('availability_exceptions').where({ branch_id: branchId, date }).first();
  const hours = await database('business_hours').where({ branch_id: branchId, day_of_week: new Date(`${date}T12:00:00`).getDay() }).first();
  if (blocked || (hours && !hours.is_open)) return [];
  const tables = await database('tables').where({ branch_id: branchId, is_active: true }).where('capacity', '>=', partySize).orderBy('capacity');
  const open = new Date(`${date}T${(hours?.open_time || '12:00').slice(0, 5)}:00`).getTime();
  const close = new Date(`${date}T${(hours?.close_time || '22:00').slice(0, 5)}:00`).getTime();
  const bookings = await database('reservations').where({ branch_id: branchId }).whereIn('status', active)
    .where('start_time', '<', new Date(close).toISOString()).where('end_time', '>', new Date(open).toISOString());
  const slots = [];
  for (let t = open; t + 90 * 60000 <= close; t += 30 * 60000) {
    if (t <= Date.now()) continue;
    const table = tables.find(table => !bookings.some(b => b.table_id === table.id && new Date(b.start_time).getTime() < t + 90 * 60000 && new Date(b.end_time).getTime() > t));
    if (table) slots.push({ time: new Date(t).toISOString(), tableId: table.id });
  }
  return slots;
}
router.get('/availability', resolveTenant, requireTenant, async (req, res) => {
  try {
    res.json({ slots: (await times(db, req.branchId, req.query.date, Number(req.query.partySize))).map(s => s.time), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  } catch (e) { res.status(e.status || 500).json({ error: e.status ? e.message : 'Could not load reservation times' }); }
});
router.post('/', resolveTenant, requireTenant, async (req, res) => {
  try {
    const { date, startTime, customerName, customerPhone, notes } = req.body;
    const partySize = Number(req.body.partySize);
    if (typeof customerName !== 'string' || !customerName.trim() || typeof customerPhone !== 'string' || !customerPhone.trim()) return res.status(400).json({ error: 'Your name and phone are required' });
    const reservation = await db.transaction(async trx => {
      // Lock the restaurant before allocating a table to avoid double booking.
      await trx('branches').where({ id: req.branchId }).update({ updated_at: trx.fn.now() });
      const slot = (await times(trx, req.branchId, date, partySize)).find(s => s.time === startTime);
      if (!slot) throw Object.assign(new Error('That time is no longer available. Choose another time.'), { status: 409 });
      const [id] = await trx('reservations').insert({ branch_id: req.branchId, table_id: slot.tableId,
        customer_name: customerName.trim(), customer_phone: customerPhone.trim(), party_size: partySize,
        start_time: slot.time, end_time: new Date(Date.parse(slot.time) + 90 * 60000).toISOString(), notes: notes || null, status: 'pending' });
      return trx('reservations').where({ id }).first();
    });
    res.status(201).json({ reservation });
  } catch (e) { res.status(e.status || 500).json({ error: e.status ? e.message : 'Could not create reservation' }); }
});
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (!req.user.branch_id) return res.status(400).json({ error: 'Select a restaurant staff account' });
    const reservations = await db('reservations').join('tables', 'tables.id', 'reservations.table_id').where('reservations.branch_id', req.user.branch_id)
      .select('reservations.*', 'tables.table_number').orderBy('start_time', 'desc');
    res.json({ reservations });
  } catch { res.status(500).json({ error: 'Could not load reservations' }); }
});
router.patch('/:id/status', authenticateToken, authorize('admin', 'owner', 'manager', 'waiter'), async (req, res) => {
  try {
    const transitions = { pending: ['confirmed', 'cancelled'], confirmed: ['seated', 'cancelled', 'no_show'], seated: ['completed'], cancelled: [], completed: [], no_show: [] };
    const reservation = await db('reservations').where({ id: req.params.id, branch_id: req.user.branch_id }).first();
    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    if (!transitions[reservation.status]?.includes(req.body.status)) return res.status(409).json({ error: 'This status change is not allowed' });
    await db('reservations').where({ id: reservation.id }).update({ status: req.body.status, updated_at: db.fn.now() });
    res.json({ reservation: { ...reservation, status: req.body.status } });
  } catch { res.status(500).json({ error: 'Could not update reservation' }); }
});
module.exports = router;
