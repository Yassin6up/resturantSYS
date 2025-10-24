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
    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }

    const query = db('tables')
      .select('tables.*', 'branches.name as branch_name')
      .leftJoin('branches', 'tables.branch_id', 'branches.id')
      .where({ 'tables.branch_id': branchId });

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
    const { number, capacity, location, isActive } = req.body;
    
    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }

    if (!number || !capacity) {
      return res.status(400).json({ error: 'Table number and capacity are required' });
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
      qr_code_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/menu?table=${number}&branch=${branchId}`
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
    
    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }

    // Check if table exists and belongs to user's branch
    const existingTable = await db('tables').where({ id }).first();
    if (!existingTable) {
      return res.status(404).json({ error: 'Table not found' });
    }
    if (existingTable.branch_id !== branchId) {
      return res.status(403).json({ error: 'Access denied: Table belongs to different branch' });
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
        qr_code_url: number ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/menu?table=${number}&branch=${existingTable.branch_id}` : existingTable.qr_code_url,
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
    
    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }

    // Check if table exists and belongs to user's branch
    const table = await db('tables').where({ id }).first();
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    if (table.branch_id !== branchId) {
      return res.status(403).json({ error: 'Access denied: Table belongs to different branch' });
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
    
    // Use authenticated user's branch_id for security  
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }

    const table = await db('tables')
      .select('tables.*', 'branches.name as branch_name')
      .leftJoin('branches', 'tables.branch_id', 'branches.id')
      .where({ 'tables.id': id })
      .first();

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    if (table.branch_id !== branchId) {
      return res.status(403).json({ error: 'Access denied: Table belongs to different branch' });
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

// Generate QR code for table
router.get('/:id/qr', authenticateToken, authorize('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'png' } = req.query;
    
    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }

    const table = await db('tables')
      .select('tables.*', 'branches.name as branch_name', 'branches.code as branch_code')
      .leftJoin('branches', 'tables.branch_id', 'branches.id')
      .where({ 'tables.id': id })
      .first();

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    
    // Verify the table belongs to the user's branch
    if (table.branch_id !== branchId) {
      return res.status(403).json({ error: 'Access denied: Table belongs to different branch' });
    }

    // Build QR code URL if not exists
    const qrCodeUrl = table.qr_code_url || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/menu?table=${table.table_number}&branch=${table.branch_id}`;
    
    // Update table with QR code URL if it was null
    if (!table.qr_code_url) {
      await db('tables')
        .where({ id: table.id })
        .update({ qr_code_url: qrCodeUrl });
    }

    if (format === 'dataurl') {
      const qrCodeDataURL = await QRCode.toDataURL(qrCodeUrl);
      res.json({ success: true, qrCodeUrl: qrCodeDataURL, table });
    } else {
      const qrCodeBuffer = await QRCode.toBuffer(qrCodeUrl);
      res.setHeader('Content-Type', 'image/png');
      res.send(qrCodeBuffer);
    }
  } catch (error) {
    logger.error('QR code generation error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Generate QR codes for all tables in a branch
router.get('/branch/:branchId/qr-sheet', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    // Use authenticated user's branch_id for security (ignore path parameter)
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }

    const tables = await db('tables')
      .select('tables.*', 'branches.name as branch_name', 'branches.code as branch_code')
      .leftJoin('branches', 'tables.branch_id', 'branches.id')
      .where({ 'tables.branch_id': branchId })
      .orderBy('tables.table_number');

    const qrCodes = [];
    for (const table of tables) {
      // Build QR code URL if not exists
      const qrCodeUrl = table.qr_code_url || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/menu?table=${table.table_number}&branch=${table.branch_id}`;
      
      // Update table with QR code URL if it was null
      if (!table.qr_code_url) {
        await db('tables')
          .where({ id: table.id })
          .update({ qr_code_url: qrCodeUrl });
      }
      
      const qrCodeDataURL = await QRCode.toDataURL(qrCodeUrl);
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
    
    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }
    
    // Verify the table belongs to the user's branch
    const table = await db('tables').where({ id }).first();
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    if (table.branch_id !== branchId) {
      return res.status(403).json({ error: 'Access denied: Table belongs to different branch' });
    }

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