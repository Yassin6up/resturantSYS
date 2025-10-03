const express = require('express');
const { db } = require('../database/init');
const { authenticateToken, authorize } = require('../middleware/auth');
const { logger } = require('../middleware/errorHandler');

const router = express.Router();

// Get daily sales report
router.get('/sales/daily', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { date, branchId } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    let query = db('orders')
      .select(
        db.raw('COUNT(*) as total_orders'),
        db.raw('SUM(total) as total_revenue'),
        db.raw('SUM(tax) as total_tax'),
        db.raw('SUM(service_charge) as total_service_charge'),
        db.raw('AVG(total) as average_order_value')
      )
      .where(db.raw('DATE(created_at) = ?', [targetDate]));

    if (branchId) {
      query = query.where({ branch_id: branchId });
    }

    const summary = await query.first();

    // Get orders by status
    const statusBreakdown = await db('orders')
      .select('status')
      .count('id as count')
      .where(db.raw('DATE(created_at) = ?', [targetDate]))
      .groupBy('status');

    // Get hourly breakdown
    const hourlyBreakdown = await db('orders')
      .select(db.raw('HOUR(created_at) as hour'))
      .count('id as count')
      .sum('total as revenue')
      .where(db.raw('DATE(created_at) = ?', [targetDate]))
      .groupBy(db.raw('HOUR(created_at)'))
      .orderBy('hour');

    res.json({
      date: targetDate,
      summary,
      statusBreakdown,
      hourlyBreakdown
    });
  } catch (error) {
    logger.error('Daily sales report error:', error);
    res.status(500).json({ error: 'Failed to generate daily sales report' });
  }
});

// Get sales report by date range
router.get('/sales/range', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    let query = db('orders')
      .select(
        db.raw('DATE(created_at) as date'),
        db.raw('COUNT(*) as total_orders'),
        db.raw('SUM(total) as total_revenue'),
        db.raw('SUM(tax) as total_tax'),
        db.raw('SUM(service_charge) as total_service_charge'),
        db.raw('AVG(total) as average_order_value')
      )
      .whereBetween('created_at', [startDate, endDate])
      .groupBy(db.raw('DATE(created_at)'))
      .orderBy('date');

    if (branchId) {
      query = query.where({ branch_id: branchId });
    }

    const dailyData = await query;

    // Calculate totals
    const totals = dailyData.reduce((acc, day) => ({
      totalOrders: acc.totalOrders + parseInt(day.total_orders),
      totalRevenue: acc.totalRevenue + parseFloat(day.total_revenue || 0),
      totalTax: acc.totalTax + parseFloat(day.total_tax || 0),
      totalServiceCharge: acc.totalServiceCharge + parseFloat(day.total_service_charge || 0)
    }), {
      totalOrders: 0,
      totalRevenue: 0,
      totalTax: 0,
      totalServiceCharge: 0
    });

    totals.averageOrderValue = totals.totalOrders > 0 ? totals.totalRevenue / totals.totalOrders : 0;

    res.json({
      startDate,
      endDate,
      dailyData,
      totals
    });
  } catch (error) {
    logger.error('Sales range report error:', error);
    res.status(500).json({ error: 'Failed to generate sales range report' });
  }
});

// Get top selling items report
router.get('/items/top', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { startDate, endDate, branchId, limit = 20 } = req.query;

    let query = db('order_items')
      .select(
        'menu_items.name as item_name',
        'menu_items.sku',
        'categories.name as category_name',
        db.raw('SUM(order_items.quantity) as total_quantity'),
        db.raw('SUM(order_items.quantity * order_items.unit_price) as total_revenue'),
        db.raw('COUNT(DISTINCT order_items.order_id) as order_count')
      )
      .leftJoin('menu_items', 'order_items.menu_item_id', 'menu_items.id')
      .leftJoin('categories', 'menu_items.category_id', 'categories.id')
      .leftJoin('orders', 'order_items.order_id', 'orders.id')
      .where('orders.status', '!=', 'CANCELLED')
      .groupBy('menu_items.id', 'menu_items.name', 'menu_items.sku', 'categories.name')
      .orderBy('total_quantity', 'desc')
      .limit(parseInt(limit));

    if (startDate && endDate) {
      query = query.whereBetween('orders.created_at', [startDate, endDate]);
    }

    if (branchId) {
      query = query.where({ 'orders.branch_id': branchId });
    }

    const topItems = await query;

    res.json({ topItems });
  } catch (error) {
    logger.error('Top items report error:', error);
    res.status(500).json({ error: 'Failed to generate top items report' });
  }
});

// Get table turnover report
router.get('/tables/turnover', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;

    let query = db('orders')
      .select(
        'tables.table_number',
        db.raw('COUNT(*) as total_orders'),
        db.raw('SUM(total) as total_revenue'),
        db.raw('AVG(total) as average_order_value'),
        db.raw('AVG(TIMESTAMPDIFF(MINUTE, created_at, updated_at)) as average_service_time')
      )
      .leftJoin('tables', 'orders.table_id', 'tables.id')
      .where('orders.status', '!=', 'CANCELLED')
      .groupBy('tables.id', 'tables.table_number')
      .orderBy('total_orders', 'desc');

    if (startDate && endDate) {
      query = query.whereBetween('orders.created_at', [startDate, endDate]);
    }

    if (branchId) {
      query = query.where({ 'orders.branch_id': branchId });
    }

    const tableTurnover = await query;

    res.json({ tableTurnover });
  } catch (error) {
    logger.error('Table turnover report error:', error);
    res.status(500).json({ error: 'Failed to generate table turnover report' });
  }
});

// Get inventory usage report
router.get('/inventory/usage', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;

    let query = db('stock_movements')
      .select(
        'stock_items.name as item_name',
        'stock_items.sku',
        'stock_items.unit',
        db.raw('SUM(CASE WHEN stock_movements.change < 0 THEN ABS(stock_movements.change) ELSE 0 END) as total_consumed'),
        db.raw('SUM(CASE WHEN stock_movements.change > 0 THEN stock_movements.change ELSE 0 END) as total_received'),
        db.raw('COUNT(CASE WHEN stock_movements.change < 0 THEN 1 END) as consumption_count'),
        db.raw('COUNT(CASE WHEN stock_movements.change > 0 THEN 1 END) as receipt_count')
      )
      .leftJoin('stock_items', 'stock_movements.stock_item_id', 'stock_items.id')
      .groupBy('stock_items.id', 'stock_items.name', 'stock_items.sku', 'stock_items.unit')
      .orderBy('total_consumed', 'desc');

    if (startDate && endDate) {
      query = query.whereBetween('stock_movements.created_at', [startDate, endDate]);
    }

    if (branchId) {
      query = query.where({ 'stock_items.branch_id': branchId });
    }

    const inventoryUsage = await query;

    res.json({ inventoryUsage });
  } catch (error) {
    logger.error('Inventory usage report error:', error);
    res.status(500).json({ error: 'Failed to generate inventory usage report' });
  }
});

// Get payment method report
router.get('/payments/methods', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { startDate, endDate, branchId } = req.query;

    let query = db('payments')
      .select(
        'payments.payment_type',
        db.raw('COUNT(*) as transaction_count'),
        db.raw('SUM(amount) as total_amount'),
        db.raw('AVG(amount) as average_amount')
      )
      .leftJoin('orders', 'payments.order_id', 'orders.id')
      .groupBy('payments.payment_type')
      .orderBy('total_amount', 'desc');

    if (startDate && endDate) {
      query = query.whereBetween('payments.paid_at', [startDate, endDate]);
    }

    if (branchId) {
      query = query.where({ 'orders.branch_id': branchId });
    }

    const paymentMethods = await query;

    res.json({ paymentMethods });
  } catch (error) {
    logger.error('Payment methods report error:', error);
    res.status(500).json({ error: 'Failed to generate payment methods report' });
  }
});

// Get cash reconciliation report
router.get('/cash/reconciliation', authenticateToken, authorize('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const { date, branchId } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Get cash payments for the day
    let cashQuery = db('payments')
      .select(
        db.raw('SUM(amount) as total_cash_received'),
        db.raw('COUNT(*) as cash_transaction_count')
      )
      .leftJoin('orders', 'payments.order_id', 'orders.id')
      .where('payments.payment_type', 'CASH')
      .where(db.raw('DATE(payments.paid_at) = ?', [targetDate]));

    if (branchId) {
      cashQuery = cashQuery.where({ 'orders.branch_id': branchId });
    }

    const cashSummary = await cashQuery.first();

    // Get refunds
    let refundQuery = db('payments')
      .select(
        db.raw('SUM(ABS(amount)) as total_refunds'),
        db.raw('COUNT(*) as refund_count')
      )
      .leftJoin('orders', 'payments.order_id', 'orders.id')
      .where('payments.payment_type', 'REFUND')
      .where(db.raw('DATE(payments.paid_at) = ?', [targetDate]));

    if (branchId) {
      refundQuery = refundQuery.where({ 'orders.branch_id': branchId });
    }

    const refundSummary = await refundQuery.first();

    res.json({
      date: targetDate,
      cashSummary,
      refundSummary,
      netCash: (cashSummary.total_cash_received || 0) - (refundSummary.total_refunds || 0)
    });
  } catch (error) {
    logger.error('Cash reconciliation report error:', error);
    res.status(500).json({ error: 'Failed to generate cash reconciliation report' });
  }
});

// Export report data as CSV
router.get('/export/:reportType', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { reportType } = req.params;
    const { startDate, endDate, branchId } = req.query;

    let data = [];
    let filename = '';

    switch (reportType) {
      case 'sales':
        data = await getSalesData(startDate, endDate, branchId);
        filename = `sales_report_${startDate || 'all'}_${endDate || 'all'}.csv`;
        break;
      case 'items':
        data = await getTopItemsData(startDate, endDate, branchId);
        filename = `top_items_report_${startDate || 'all'}_${endDate || 'all'}.csv`;
        break;
      case 'inventory':
        data = await getInventoryUsageData(startDate, endDate, branchId);
        filename = `inventory_usage_report_${startDate || 'all'}_${endDate || 'all'}.csv`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    // Convert to CSV format
    const csv = convertToCSV(data);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);

  } catch (error) {
    logger.error('Report export error:', error);
    res.status(500).json({ error: 'Failed to export report' });
  }
});

// Helper functions for data export
async function getSalesData(startDate, endDate, branchId) {
  let query = db('orders')
    .select(
      'orders.order_code',
      'orders.created_at',
      'orders.total',
      'orders.tax',
      'orders.service_charge',
      'orders.status',
      'tables.table_number',
      'branches.name as branch_name'
    )
    .leftJoin('tables', 'orders.table_id', 'tables.id')
    .leftJoin('branches', 'orders.branch_id', 'branches.id')
    .orderBy('orders.created_at', 'desc');

  if (startDate && endDate) {
    query = query.whereBetween('orders.created_at', [startDate, endDate]);
  }

  if (branchId) {
    query = query.where({ 'orders.branch_id': branchId });
  }

  return await query;
}

async function getTopItemsData(startDate, endDate, branchId) {
  let query = db('order_items')
    .select(
      'menu_items.name as item_name',
      'menu_items.sku',
      'categories.name as category_name',
      db.raw('SUM(order_items.quantity) as total_quantity'),
      db.raw('SUM(order_items.quantity * order_items.unit_price) as total_revenue')
    )
    .leftJoin('menu_items', 'order_items.menu_item_id', 'menu_items.id')
    .leftJoin('categories', 'menu_items.category_id', 'categories.id')
    .leftJoin('orders', 'order_items.order_id', 'orders.id')
    .where('orders.status', '!=', 'CANCELLED')
    .groupBy('menu_items.id', 'menu_items.name', 'menu_items.sku', 'categories.name')
    .orderBy('total_quantity', 'desc');

  if (startDate && endDate) {
    query = query.whereBetween('orders.created_at', [startDate, endDate]);
  }

  if (branchId) {
    query = query.where({ 'orders.branch_id': branchId });
  }

  return await query;
}

async function getInventoryUsageData(startDate, endDate, branchId) {
  let query = db('stock_movements')
    .select(
      'stock_items.name as item_name',
      'stock_items.sku',
      'stock_items.unit',
      'stock_movements.change',
      'stock_movements.reason',
      'stock_movements.created_at'
    )
    .leftJoin('stock_items', 'stock_movements.stock_item_id', 'stock_items.id')
    .orderBy('stock_movements.created_at', 'desc');

  if (startDate && endDate) {
    query = query.whereBetween('stock_movements.created_at', [startDate, endDate]);
  }

  if (branchId) {
    query = query.where({ 'stock_items.branch_id': branchId });
  }

  return await query;
}

function convertToCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

module.exports = router;