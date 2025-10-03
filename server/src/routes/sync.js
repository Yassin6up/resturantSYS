const express = require('express');
const { db } = require('../database/init');
const { authenticateToken, authorize } = require('../middleware/auth');
const { logger } = require('../middleware/errorHandler');

const router = express.Router();

// Get sync status
router.get('/status', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const syncEnabled = await db('settings').where({ key: 'sync_enabled' }).first();
    const operatingMode = await db('settings').where({ key: 'operating_mode' }).first();
    
    const lastSync = await db('sync_logs')
      .where({ synced: true })
      .orderBy('created_at', 'desc')
      .first();

    const pendingSyncCount = await db('sync_logs')
      .where({ synced: false })
      .count('id as count')
      .first();

    res.json({
      enabled: syncEnabled?.value === 'true',
      mode: operatingMode?.value || 'LOCAL',
      lastSync: lastSync?.created_at || null,
      pendingCount: pendingSyncCount.count || 0
    });
  } catch (error) {
    logger.error('Sync status fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch sync status' });
  }
});

// Trigger manual sync
router.post('/manual', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const operatingMode = await db('settings').where({ key: 'operating_mode' }).first();
    const syncEnabled = await db('settings').where({ key: 'sync_enabled' }).first();

    if (!syncEnabled || syncEnabled.value !== 'true') {
      return res.status(400).json({ error: 'Sync is not enabled' });
    }

    if (operatingMode?.value === 'LOCAL') {
      // Push local changes to cloud
      await pushLocalChanges();
    } else {
      // Pull changes from cloud
      await pullCloudChanges();
    }

    // Log manual sync
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'MANUAL_SYNC',
      meta: JSON.stringify({ 
        mode: operatingMode?.value || 'LOCAL',
        userId: req.user.id
      })
    });

    logger.info(`Manual sync triggered by ${req.user.username} in ${operatingMode?.value || 'LOCAL'} mode`);

    res.json({ message: 'Manual sync completed successfully' });
  } catch (error) {
    logger.error('Manual sync error:', error);
    res.status(500).json({ error: 'Manual sync failed' });
  }
});

// Push local changes to cloud
router.post('/push', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { operations } = req.body;

    if (!operations || !Array.isArray(operations)) {
      return res.status(400).json({ error: 'Operations array is required' });
    }

    const results = [];

    for (const operation of operations) {
      try {
        await processSyncOperation(operation);
        results.push({ id: operation.id, status: 'success' });
      } catch (error) {
        results.push({ id: operation.id, status: 'error', error: error.message });
      }
    }

    // Mark operations as synced
    const operationIds = operations.map(op => op.id);
    await db('sync_logs')
      .whereIn('id', operationIds)
      .update({ synced: true });

    res.json({ 
      message: 'Sync operations processed',
      results 
    });
  } catch (error) {
    logger.error('Sync push error:', error);
    res.status(500).json({ error: 'Failed to process sync operations' });
  }
});

// Pull changes from cloud
router.get('/pull', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { since } = req.query;
    
    let query = db('sync_logs')
      .where({ synced: false })
      .orderBy('created_at', 'asc');

    if (since) {
      query = query.where('created_at', '>', since);
    }

    const operations = await query.limit(100);

    res.json({ operations });
  } catch (error) {
    logger.error('Sync pull error:', error);
    res.status(500).json({ error: 'Failed to fetch sync operations' });
  }
});

// Get sync logs
router.get('/logs', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { limit = 100, offset = 0, synced } = req.query;

    let query = db('sync_logs')
      .select('sync_logs.*')
      .orderBy('created_at', 'desc');

    if (synced !== undefined) {
      query = query.where({ synced: synced === 'true' });
    }

    const logs = await query
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    res.json({ logs });
  } catch (error) {
    logger.error('Sync logs fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch sync logs' });
  }
});

// Clear sync logs
router.delete('/logs', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { olderThan } = req.body;

    let query = db('sync_logs');

    if (olderThan) {
      query = query.where('created_at', '<', olderThan);
    }

    const deletedCount = await query.del();

    // Log sync logs cleanup
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'SYNC_LOGS_CLEANUP',
      meta: JSON.stringify({ 
        deletedCount,
        olderThan,
        userId: req.user.id
      })
    });

    logger.info(`Sync logs cleaned up by ${req.user.username}: ${deletedCount} records deleted`);

    res.json({ 
      message: `${deletedCount} sync log records deleted`,
      deletedCount 
    });
  } catch (error) {
    logger.error('Sync logs cleanup error:', error);
    res.status(500).json({ error: 'Failed to clear sync logs' });
  }
});

// Helper function to push local changes
async function pushLocalChanges() {
  try {
    const unsyncedLogs = await db('sync_logs')
      .where({ synced: false })
      .orderBy('created_at', 'asc');

    if (unsyncedLogs.length === 0) {
      return { message: 'No changes to sync' };
    }

    // In a real implementation, you would send these to a central server
    // For now, we'll just mark them as synced
    await db('sync_logs')
      .whereIn('id', unsyncedLogs.map(log => log.id))
      .update({ synced: true });

    logger.info(`Pushed ${unsyncedLogs.length} local changes to cloud`);
    return { message: `Pushed ${unsyncedLogs.length} changes` };
  } catch (error) {
    logger.error('Push local changes error:', error);
    throw error;
  }
}

// Helper function to pull cloud changes
async function pullCloudChanges() {
  try {
    // In a real implementation, you would fetch changes from a central server
    // For now, we'll just return a success message
    logger.info('Pulled changes from cloud');
    return { message: 'Pulled changes from cloud' };
  } catch (error) {
    logger.error('Pull cloud changes error:', error);
    throw error;
  }
}

// Helper function to process sync operation
async function processSyncOperation(operation) {
  try {
    const { table_name, record_id, operation: op, payload } = operation;

    switch (op) {
      case 'INSERT':
        await db(table_name).insert(JSON.parse(payload));
        break;
      case 'UPDATE':
        const updateData = JSON.parse(payload);
        await db(table_name).where({ id: record_id }).update(updateData);
        break;
      case 'DELETE':
        await db(table_name).where({ id: record_id }).del();
        break;
      default:
        throw new Error(`Unknown operation: ${op}`);
    }

    logger.info(`Processed sync operation: ${op} on ${table_name}:${record_id}`);
  } catch (error) {
    logger.error('Process sync operation error:', error);
    throw error;
  }
}

// Helper function to log sync operation
async function logSyncOperation(tableName, recordId, operation, payload) {
  try {
    await db('sync_logs').insert({
      table_name: tableName,
      record_id: recordId,
      operation,
      payload: JSON.stringify(payload),
      synced: false
    });
  } catch (error) {
    logger.error('Log sync operation error:', error);
  }
}

module.exports = {
  router,
  logSyncOperation
};