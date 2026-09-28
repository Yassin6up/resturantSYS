const ACTIVE_STATUSES = ['pending', 'confirmed'];

function validDate(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
}

// Business hours use the server's configured TZ. Returned instants include UTC
// offsets and are displayed in that same zone by the booking form.
function localDate(value) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function availableSlots(db, branchId, service, date, now = Date.now()) {
  if (!validDate(date)) throw Object.assign(new Error('Use a valid date in YYYY-MM-DD format'), { status: 400 });
  const duration = Number(service.duration_minutes) * 60000;
  if (!Number.isFinite(duration) || duration < 60000) throw Object.assign(new Error('Service duration is invalid'), { status: 400 });
  const blocked = await db('availability_exceptions').where({ branch_id: branchId, date }).first();
  const hours = await db('business_hours').where({ branch_id: branchId, day_of_week: new Date(`${date}T12:00:00`).getDay() }).first();
  if (blocked || (hours && !hours.is_open)) return { slots: [], closed: true, reason: blocked?.reason || 'Closed' };
  const open = new Date(`${date}T${(hours?.open_time || '09:00').slice(0, 5)}:00`);
  const close = new Date(`${date}T${(hours?.close_time || '18:00').slice(0, 5)}:00`);
  const existing = await db('bookings').where({ service_id: service.id, branch_id: branchId })
    .whereIn('status', ACTIVE_STATUSES).where('start_time', '<', close.toISOString()).where('end_time', '>', open.toISOString());
  const slots = [];
  for (let t = open.getTime(); t + duration <= close.getTime(); t += duration) {
    if (t <= now) continue;
    if (!existing.some(b => new Date(b.start_time).getTime() < t + duration && new Date(b.end_time).getTime() > t)) slots.push(new Date(t).toISOString());
  }
  return { slots, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
}

module.exports = { ACTIVE_STATUSES, availableSlots, validDate, localDate };
