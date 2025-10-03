const express = require('express');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const db = require('../config/database');
const QRCode = require('qrcode');

const router = express.Router();

// Get tables for a branch
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { branchId = 1 } = req.query;
    
    const tables = await db('tables')
      .where({ branch_id: branchId })
      .orderBy('table_number', 'asc');
    
    res.json({
      success: true,
      data: tables
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get single table
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const table = await db('tables')
      .select('tables.*', 'branches.name as branch_name', 'branches.code as branch_code')
      .join('branches', 'tables.branch_id', 'branches.id')
      .where('tables.id', id)
      .first();
    
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }
    
    res.json({
      success: true,
      data: table
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create table
router.post('/', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { branchId, tableNumber, description, capacity } = req.body;
    
    // Check if table number already exists for this branch
    const existing = await db('tables')
      .where({ branch_id: branchId, table_number: tableNumber })
      .first();
    
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Table number already exists for this branch'
      });
    }

    // Get branch info for QR code
    const branch = await db('branches').where({ id: branchId }).first();
    if (!branch) {
      return res.status(400).json({
        success: false,
        error: 'Branch not found'
      });
    }

    // Generate QR code URL
    const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/menu?table=${tableNumber}&branch=${branch.code || 'default'}`;
    
    const [tableId] = await db('tables').insert({
      branch_id: branchId,
      table_number: tableNumber,
      qr_code: qrUrl,
      description: description,
      capacity: capacity || 4
    });

    const table = await db('tables').where({ id: tableId }).first();
    
    res.status(201).json({
      success: true,
      data: table
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update table
router.put('/:id', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { tableNumber, description, capacity } = req.body;
    
    const table = await db('tables').where({ id }).first();
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }

    // Check if new table number conflicts
    if (tableNumber && tableNumber !== table.table_number) {
      const existing = await db('tables')
        .where({ branch_id: table.branch_id, table_number: tableNumber })
        .whereNot({ id })
        .first();
      
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Table number already exists for this branch'
        });
      }
    }

    await db('tables').where({ id }).update({
      table_number: tableNumber || table.table_number,
      description: description !== undefined ? description : table.description,
      capacity: capacity !== undefined ? capacity : table.capacity,
      updated_at: db.fn.now()
    });

    const updatedTable = await db('tables').where({ id }).first();
    
    res.json({
      success: true,
      data: updatedTable
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Delete table
router.delete('/:id', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const table = await db('tables').where({ id }).first();
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }

    // Check if table has active orders
    const activeOrders = await db('orders')
      .where({ table_id: id })
      .whereNotIn('status', ['COMPLETED', 'CANCELLED'])
      .count('id as count')
      .first();

    if (activeOrders.count > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete table with active orders'
      });
    }

    await db('tables').where({ id }).del();
    
    res.json({
      success: true,
      message: 'Table deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Generate QR code image for table
router.get('/:id/qr', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const table = await db('tables').where({ id }).first();
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }

    const qrCodeDataURL = await QRCode.toDataURL(table.qr_code, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      success: true,
      data: {
        qrCode: qrCodeDataURL,
        url: table.qr_code,
        tableNumber: table.table_number
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;