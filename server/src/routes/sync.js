const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/connection');
const logger = require('../utils/logger');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Get sync status
router.get('/status', async (req, res) => {
  try {
    const settings = await db('settings')
      .whereIn('key', ['sync_enabled', 'operating_mode', 'central_server_url'])
      .select('key', 'value');

    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    // Get last sync info
    const lastSync = await db('sync_logs')
      .where({ synced: true })
      .orderBy('created_at', 'desc')
      .first();

    // Get pending sync count
    const pendingCount = await db('sync_logs')
      .where({ synced: false })
      .count('* as count')
      .first();

    res.json({
      syncEnabled: settingsObj.sync_enabled === 'true',
      operatingMode: settingsObj.operating_mode,
      centralServerUrl: settingsObj.central_server_url,
      lastSync: lastSync ? lastSync.created_at : null,
      pendingSyncCount: parseInt(pendingCount.count) || 0
    });
  } catch (error) {
    logger.error('Get sync status error:', error);
    res.status(500).json({ error: 'Failed to fetch sync status' });
  }
});

// Manual sync trigger
router.post('/manual', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const settings = await db('settings')
      .whereIn('key', ['sync_enabled', 'operating_mode', 'central_server_url'])
      .select('key', 'value');

    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    if (settingsObj.sync_enabled !== 'true') {
      return res.status(400).json({ error: 'Sync is not enabled' });
    }

    if (settingsObj.operating_mode === 'LOCAL') {
      return res.status(400).json({ error: 'Cannot sync in LOCAL mode' });
    }

    // Get unsynced logs
    const unsyncedLogs = await db('sync_logs')
      .where({ synced: false })
      .orderBy('created_at', 'asc')
      .limit(100);

    if (unsyncedLogs.length === 0) {
      return res.json({ message: 'No pending sync operations' });
    }

    // In a real implementation, you would send these to the central server
    // For now, we'll just mark them as synced
    const logIds = unsyncedLogs.map(log => log.id);
    
    await db('sync_logs')
      .whereIn('id', logIds)
      .update({ synced: true });

    // Log the sync action
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'MANUAL_SYNC',
      meta: JSON.stringify({ 
        logsSynced: unsyncedLogs.length,
        timestamp: new Date().toISOString()
      })
    });

    res.json({
      message: 'Manual sync completed',
      logsSynced: unsyncedLogs.length
    });
  } catch (error) {
    logger.error('Manual sync error:', error);
    res.status(500).json({ error: 'Failed to perform manual sync' });
  }
});

// Push sync data to central server
router.post('/push', [
  body('operations').isArray({ min: 1 }),
  body('operations.*.table_name').notEmpty(),
  body('operations.*.record_id').isInt(),
  body('operations.*.operation').isIn(['INSERT', 'UPDATE', 'DELETE']),
  body('operations.*.payload').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { operations } = req.body;

    // In a real implementation, you would process these operations
    // and apply them to the central database
    // For now, we'll just acknowledge receipt

    const trx = await db.transaction();

    try {
      for (const operation of operations) {
        await trx('sync_logs').insert({
          table_name: operation.table_name,
          record_id: operation.record_id,
          operation: operation.operation,
          payload: operation.payload,
          synced: true
        });
      }

      await trx.commit();

      res.json({
        message: 'Sync operations received and processed',
        operationsReceived: operations.length
      });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Push sync error:', error);
    res.status(500).json({ error: 'Failed to process sync operations' });
  }
});

// Pull sync data from central server
router.get('/pull', async (req, res) => {
  try {
    const { since } = req.query;

    let query = db('sync_logs')
      .where({ synced: true })
      .orderBy('created_at', 'asc');

    if (since) {
      query = query.where('created_at', '>', since);
    }

    const operations = await query.limit(100);

    res.json({
      operations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Pull sync error:', error);
    res.status(500).json({ error: 'Failed to fetch sync operations' });
  }
});

// Get sync logs
router.get('/logs', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { synced, limit = 50, offset = 0 } = req.query;
    
    let query = db('sync_logs');

    if (synced !== undefined) {
      query = query.where({ synced: synced === 'true' });
    }

    const logs = await query
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    res.json(logs);
  } catch (error) {
    logger.error('Get sync logs error:', error);
    res.status(500).json({ error: 'Failed to fetch sync logs' });
  }
});

// Clear sync logs
router.delete('/logs', requireRole(['admin']), async (req, res) => {
  try {
    const { olderThan } = req.query;

    let query = db('sync_logs');
    
    if (olderThan) {
      query = query.where('created_at', '<', olderThan);
    }

    const deletedCount = await query.del();

    res.json({
      message: 'Sync logs cleared',
      deletedCount
    });
  } catch (error) {
    logger.error('Clear sync logs error:', error);
    res.status(500).json({ error: 'Failed to clear sync logs' });
  }
});

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

module.exports = { router, logSyncOperation };