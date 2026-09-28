const express = require('express');
const router = express.Router();
const { db } = require('../database/init');
const { authenticateToken, authorize } = require('../middleware/auth');
const { resolveTenant, requireTenant } = require('../middleware/tenant');
const { logger } = require('../middleware/errorHandler');

// Staff (admin/manager) have branch_id set directly. A solo owner who
// self-signed-up has no branch_id (owners can own many stores) - fall back
// to their own store so a fresh signup can manage it immediately without
// needing a separate admin account.
async function resolveManagedBranchId(req) {
  if (req.user.branch_id) return req.user.branch_id;
  if (req.user.role === 'owner') {
    const branch = await db('branches').where({ owner_id: req.user.id }).orderBy('id').first();
    return branch ? branch.id : null;
  }
  return null;
}

// Public: list bookable services for the resolved tenant (appointments/hotel/office storefront)
router.get('/public', resolveTenant, requireTenant, async (req, res) => {
  try {
    const services = await db('services')
      .where({ branch_id: req.branchId, is_active: true })
      .orderBy('category')
      .orderBy('name');
    res.json({ services });
  } catch (error) {
    logger.error('Error fetching public services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Admin: list all services (including inactive) for the logged-in account's store
router.get('/', authenticateToken, async (req, res) => {
  try {
    const branchId = await resolveManagedBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'No store associated with this account' });

    const services = await db('services').where({ branch_id: branchId }).orderBy('name');
    res.json({ services });
  } catch (error) {
    logger.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

router.post('/', authenticateToken, authorize('admin', 'owner', 'manager'), async (req, res) => {
  try {
    const branchId = await resolveManagedBranchId(req);
    if (!branchId) return res.status(400).json({ error: 'No store associated with this account' });

    const { name, description, duration_minutes, price, image_url, category, is_active } = req.body;
    if (!name || price === undefined || !Number.isFinite(Number(price)) || Number(price) < 0) return res.status(400).json({ error: 'Name and price are required' });

    if (duration_minutes !== undefined && (!Number.isInteger(Number(duration_minutes)) || Number(duration_minutes) < 1 || Number(duration_minutes) > 1440)) return res.status(400).json({ error: 'Duration must be between 1 and 1440 minutes' });
    const [id] = await db('services').insert({
      branch_id: branchId,
      name,
      description,
      duration_minutes: duration_minutes || 30,
      price,
      image_url,
      category,
      is_active: is_active !== undefined ? is_active : true
    });

    const service = await db('services').where({ id }).first();
    res.status(201).json({ service });
  } catch (error) {
    logger.error('Error creating service:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

router.put('/:id', authenticateToken, authorize('admin', 'owner', 'manager'), async (req, res) => {
  try {
    const branchId = await resolveManagedBranchId(req);
    const service = await db('services').where({ id: req.params.id, branch_id: branchId }).first();
    if (!service) return res.status(404).json({ error: 'Service not found' });

    const { name, description, duration_minutes, price, image_url, category, is_active } = req.body;
    if ((duration_minutes !== undefined && (!Number.isInteger(Number(duration_minutes)) || Number(duration_minutes) < 1 || Number(duration_minutes) > 1440)) || (price !== undefined && (!Number.isFinite(Number(price)) || Number(price) < 0))) return res.status(400).json({ error: 'Provide a valid price and duration' });
    await db('services').where({ id: req.params.id }).update({
      name: name ?? service.name,
      description: description ?? service.description,
      duration_minutes: duration_minutes ?? service.duration_minutes,
      price: price ?? service.price,
      image_url: image_url ?? service.image_url,
      category: category ?? service.category,
      is_active: is_active !== undefined ? is_active : service.is_active,
      updated_at: db.raw('CURRENT_TIMESTAMP')
    });

    const updated = await db('services').where({ id: req.params.id }).first();
    res.json({ service: updated });
  } catch (error) {
    logger.error('Error updating service:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

router.delete('/:id', authenticateToken, authorize('admin', 'owner', 'manager'), async (req, res) => {
  try {
    const branchId = await resolveManagedBranchId(req);
    const deleted = await db('services').where({ id: req.params.id, branch_id: branchId }).update({ is_active: false });
    if (!deleted) return res.status(404).json({ error: 'Service not found' });
    res.json({ message: 'Service deleted' });
  } catch (error) {
    logger.error('Error deleting service:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

module.exports = router;
