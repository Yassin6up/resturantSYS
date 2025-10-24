const express = require('express');
const QRCode = require('qrcode');
const { db } = require('../database/init');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateTable } = require('../middleware/validation');
const { logger } = require('../middleware/errorHandler');

const router = express.Router();

// Get all tables (admin/cashier)
router.get('/', authenticateToken, authorize('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const { branchId } = req.query;

    let query = db('tables')
      .select('tables.*', 'branches.name as branch_name')
      .leftJoin('branches', 'tables.branch_id', 'branches.id');

    if (branchId) {
      query = query.where({ 'tables.branch_id': branchId });
    }

    const tables = await query.orderBy('tables.table_number');

    // Get current order status for each table
    for (const table of tables) {
      const activeOrder = await db('orders')
        .where({ 
          table_id: table.id
        })
        .whereIn('status', ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED'])
        .orderBy('created_at', 'desc')
        .first();

      table.activeOrder = activeOrder;
    }

    res.json({ success: true, tables });
  } catch (error) {
    logger.error('Tables fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// Create table (admin)
router.post('/', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { number, capacity, location, branchId, isActive } = req.body;

    if (!number || !capacity || !branchId) {
      return res.status(400).json({ error: 'Table number, capacity, and branch ID are required' });
    }

    // Check if table number already exists in this branch
    const existingTable = await db('tables')
      .where({ 
        table_number: number,
        branch_id: branchId 
      })
      .first();

    if (existingTable) {
      return res.status(400).json({ error: 'Table number already exists in this branch' });
    }

    const [tableId] = await db('tables').insert({
      table_number: number,
      capacity: parseInt(capacity),
      location: location || '',
      branch_id: branchId,
      is_active: isActive !== false,
      qr_code_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/menu?table=${number}`
    });

    const table = await db('tables').where({ id: tableId }).first();

    // Log table creation
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'TABLE_CREATE',
      meta: JSON.stringify({ tableId, number, capacity, branchId })
    });

    res.status(201).json({ success: true, table });
  } catch (error) {
    logger.error('Table creation error:', error);
    res.status(500).json({ error: 'Failed to create table' });
  }
});

// Update table (admin)
router.put('/:id', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { number, capacity, location, isActive } = req.body;

    // Check if table exists
    const existingTable = await db('tables').where({ id }).first();
    if (!existingTable) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // If table number is being changed, check for duplicates
    if (number && number !== existingTable.table_number) {
      const duplicateTable = await db('tables')
        .where({ 
          table_number: number,
          branch_id: existingTable.branch_id,
          id: { '!=': id }
        })
        .first();

      if (duplicateTable) {
        return res.status(400).json({ error: 'Table number already exists in this branch' });
      }
    }

    await db('tables')
      .where({ id })
      .update({
        table_number: number || existingTable.table_number,
        capacity: capacity ? parseInt(capacity) : existingTable.capacity,
        location: location !== undefined ? location : existingTable.location,
        is_active: isActive !== undefined ? isActive : existingTable.is_active,
        qr_code_url: number ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/menu?table=${number}` : existingTable.qr_code_url,
        updated_at: db.raw('CURRENT_TIMESTAMP')
      });

    const table = await db('tables').where({ id }).first();

    // Log table update
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'TABLE_UPDATE',
      meta: JSON.stringify({ tableId: id, number, capacity })
    });

    res.json({ success: true, table });
  } catch (error) {
    logger.error('Table update error:', error);
    res.status(500).json({ error: 'Failed to update table' });
  }
});

// Delete table (admin)
router.delete('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if table exists
    const table = await db('tables').where({ id }).first();
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Check if table has active orders
    const activeOrder = await db('orders')
      .where({ 
        table_id: id,
        status: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED']
      })
      .first();

    if (activeOrder) {
      return res.status(400).json({ error: 'Cannot delete table with active orders' });
    }

    await db('tables').where({ id }).del();

    // Log table deletion
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'TABLE_DELETE',
      meta: JSON.stringify({ tableId: id, tableNumber: table.table_number })
    });

    res.json({ success: true, message: 'Table deleted successfully' });
  } catch (error) {
    logger.error('Table deletion error:', error);
    res.status(500).json({ error: 'Failed to delete table' });
  }
});

// Get single table
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const table = await db('tables')
      .select('tables.*', 'branches.name as branch_name')
      .leftJoin('branches', 'tables.branch_id', 'branches.id')
      .where({ 'tables.id': id })
      .first();

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Get current order
    const activeOrder = await db('orders')
      .where({ 
        table_id: id,
        status: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED']
      })
      .orderBy('created_at', 'desc')
      .first();

    table.activeOrder = activeOrder;

    res.json({ table });
  } catch (error) {
    logger.error('Table fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch table' });
  }
});

// Create table (admin)
router.post('/', authenticateToken, authorize('admin', 'manager'), validateTable, async (req, res) => {
  try {
    const { tableNumber, branchId, description } = req.body;

    // Check if table number already exists in branch
    const existingTable = await db('tables')
      .where({ table_number: tableNumber, branch_id: branchId })
      .first();

    if (existingTable) {
      return res.status(400).json({ error: 'Table number already exists in this branch' });
    }

    // Generate QR code URL
    const branch = await db('branches').where({ id: branchId }).first();
    const qrCodeUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/menu?table=${tableNumber}&branch=${branch.code}`;

    const [tableId] = await db('tables').insert({
      table_number: tableNumber,
      branch_id: branchId,
      qr_code: qrCodeUrl,
      description
    });

    const table = await db('tables')
      .select('tables.*', 'branches.name as branch_name')
      .leftJoin('branches', 'tables.branch_id', 'branches.id')
      .where({ 'tables.id': tableId })
      .first();

    // Log table creation
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'TABLE_CREATE',
      meta: JSON.stringify({ tableId, tableNumber, branchId })
    });

    res.status(201).json({ table });
  } catch (error) {
    logger.error('Table creation error:', error);
    res.status(500).json({ error: 'Failed to create table' });
  }
});

// Update table (admin)
router.put('/:id', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { tableNumber, description } = req.body;

    const table = await db('tables').where({ id }).first();
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Check if new table number conflicts with existing tables
    if (tableNumber && tableNumber !== table.table_number) {
      const existingTable = await db('tables')
        .where({ table_number: tableNumber, branch_id: table.branch_id })
        .where('id', '!=', id)
        .first();

      if (existingTable) {
        return res.status(400).json({ error: 'Table number already exists in this branch' });
      }
    }

    // Update QR code if table number changed
    let qrCodeUrl = table.qr_code;
    if (tableNumber && tableNumber !== table.table_number) {
      const branch = await db('branches').where({ id: table.branch_id }).first();
      qrCodeUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/menu?table=${tableNumber}&branch=${branch.code}`;
    }

    await db('tables')
      .where({ id })
      .update({
        table_number: tableNumber,
        description,
        qr_code: qrCodeUrl,
        updated_at: db.raw('CURRENT_TIMESTAMP')
      });

    const updatedTable = await db('tables')
      .select('tables.*', 'branches.name as branch_name')
      .leftJoin('branches', 'tables.branch_id', 'branches.id')
      .where({ 'tables.id': id })
      .first();

    // Log table update
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'TABLE_UPDATE',
      meta: JSON.stringify({ tableId: id, tableNumber, description })
    });

    res.json({ table: updatedTable });
  } catch (error) {
    logger.error('Table update error:', error);
    res.status(500).json({ error: 'Failed to update table' });
  }
});

// Delete table (admin)
router.delete('/:id', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if table has active orders
    const activeOrder = await db('orders')
      .where({ 
        table_id: id,
        status: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED']
      })
      .first();

    if (activeOrder) {
      return res.status(400).json({ error: 'Cannot delete table with active orders' });
    }

    await db('tables').where({ id }).del();

    // Log table deletion
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'TABLE_DELETE',
      meta: JSON.stringify({ tableId: id })
    });

    res.json({ message: 'Table deleted successfully' });
  } catch (error) {
    logger.error('Table deletion error:', error);
    res.status(500).json({ error: 'Failed to delete table' });
  }
});

// Generate QR code for table
router.get('/:id/qr', authenticateToken, authorize('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const { id } = req.params;
    const table = await db('tables').where({ id }).first();
    if (!table || !table.qr_code_url) {
      return res.status(404).json({ error: 'Table or QR code URL not found' });
    }
    // Return direct link to QR code image
    const qrImageLink = `${req.protocol}://${req.get('host')}/api/tables/${id}/qrcode`;
    res.json({ success: true, qrImage: qrImageLink });
  } catch (error) {
    logger.error('QR code link error:', error);
    res.status(500).json({ error: 'Failed to generate QR code link' });
  }
});
// Get QR code PNG for a table
router.get('/:id/qrcode', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const table = await db('tables').where({ id }).first();
    if (!table || !table.qr_code_url) {
      return res.status(404).json({ error: 'Table or QR code URL not found' });
    }
    // Generate QR code PNG
    QRCode.toBuffer(table.qr_code_url, { type: 'png' }, (err, buffer) => {
      if (err) {
        logger.error('QR code generation error:', err);
        return res.status(500).json({ error: 'Failed to generate QR code' });
      }
      res.set('Content-Type', 'image/png');
      res.send(buffer);
    });
  } catch (error) {
    logger.error('QR code fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch QR code' });
  }
});

// Generate QR codes for all tables in a branch
router.get('/branch/:branchId/qr-sheet', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { branchId } = req.params;

    const tables = await db('tables')
      .select('tables.*', 'branches.name as branch_name', 'branches.code as branch_code')
      .leftJoin('branches', 'tables.branch_id', 'branches.id')
      .where({ 'tables.branch_id': branchId })
      .orderBy('tables.table_number');

    const qrCodes = [];
    for (const table of tables) {
      const qrCodeDataURL = await QRCode.toDataURL(table.qr_code);
      qrCodes.push({
        table,
        qrCode: qrCodeDataURL
      });
    }

    res.json({ qrCodes });
  } catch (error) {
    logger.error('QR sheet generation error:', error);
    res.status(500).json({ error: 'Failed to generate QR sheet' });
  }
});

// Get table orders history
router.get('/:id/orders', authenticateToken, authorize('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const orders = await db('orders')
      .select('orders.*')
      .where({ 'orders.table_id': id })
      .orderBy('orders.created_at', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    res.json({ orders });
  } catch (error) {
    logger.error('Table orders fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch table orders' });
  }
});

module.exports = router;