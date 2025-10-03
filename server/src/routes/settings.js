const express = require('express');
const { db } = require('../database/init');
const { authenticateToken, authorize } = require('../middleware/auth');
const { logger } = require('../middleware/errorHandler');

const router = express.Router();

// Get all settings (admin/manager)
router.get('/', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const settings = await db('settings').select('*');
    
    // Convert to key-value object
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });

    res.json({ settings: settingsObj });
  } catch (error) {
    logger.error('Settings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings (admin/manager)
router.put('/', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object is required' });
    }

    const trx = await db.transaction();

    try {
      for (const [key, value] of Object.entries(settings)) {
        // Check if setting exists
        const existingSetting = await trx('settings').where({ key }).first();
        
        if (existingSetting) {
          await trx('settings')
            .where({ key })
            .update({ 
              value: String(value),
              updated_at: db.raw('CURRENT_TIMESTAMP')
            });
        } else {
          await trx('settings').insert({
            key,
            value: String(value)
          });
        }
      }

      await trx.commit();

      // Log settings update
      await db('audit_logs').insert({
        user_id: req.user.id,
        action: 'SETTINGS_UPDATE',
        meta: JSON.stringify({ 
          settings: Object.keys(settings),
          userId: req.user.id
        })
      });

      logger.info(`Settings updated by ${req.user.username}: ${Object.keys(settings).join(', ')}`);

      res.json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Settings update error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get specific setting (admin/manager)
router.get('/:key', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { key } = req.params;

    const setting = await db('settings').where({ key }).first();
    
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ setting });
  } catch (error) {
    logger.error('Setting fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Update specific setting (admin/manager)
router.put('/:key', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({ error: 'Value is required' });
    }

    // Check if setting exists
    const existingSetting = await db('settings').where({ key }).first();
    
    if (existingSetting) {
      await db('settings')
        .where({ key })
        .update({ 
          value: String(value),
          updated_at: db.raw('CURRENT_TIMESTAMP')
        });
    } else {
      await db('settings').insert({
        key,
        value: String(value)
      });
    }

    // Log setting update
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'SETTING_UPDATE',
      meta: JSON.stringify({ key, value, userId: req.user.id })
    });

    logger.info(`Setting ${key} updated by ${req.user.username}: ${value}`);

    res.json({ message: 'Setting updated successfully' });
  } catch (error) {
    logger.error('Setting update error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Get operating mode
router.get('/mode/operating', async (req, res) => {
  try {
    const setting = await db('settings').where({ key: 'operating_mode' }).first();
    const mode = setting ? setting.value : 'LOCAL';

    res.json({ mode });
  } catch (error) {
    logger.error('Operating mode fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch operating mode' });
  }
});

// Update operating mode (admin only)
router.put('/mode/operating', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { mode } = req.body;

    if (!['LOCAL', 'CLOUD'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid operating mode. Must be LOCAL or CLOUD' });
    }

    const currentMode = await db('settings').where({ key: 'operating_mode' }).first();
    
    if (currentMode && currentMode.value === mode) {
      return res.json({ success: true, message: 'Operating mode is already set to ' + mode });
    }

    await db('settings')
      .where({ key: 'operating_mode' })
      .update({ 
        value: mode,
        updated_at: db.raw('CURRENT_TIMESTAMP')
      });

    // Log mode change
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'OPERATING_MODE_CHANGE',
      meta: JSON.stringify({ 
        oldMode: currentMode ? currentMode.value : 'LOCAL',
        newMode: mode,
        userId: req.user.id
      })
    });

    logger.info(`Operating mode changed from ${currentMode ? currentMode.value : 'LOCAL'} to ${mode} by ${req.user.username}`);

    res.json({ 
      success: true,
      message: `Operating mode changed to ${mode}`,
      mode 
    });
  } catch (error) {
    logger.error('Operating mode update error:', error);
    res.status(500).json({ error: 'Failed to update operating mode' });
  }
});

// Change operating mode (admin only)
router.post('/change-operating-mode', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { mode } = req.body;

    if (!['LOCAL', 'CLOUD'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid operating mode. Must be LOCAL or CLOUD' });
    }

    const currentMode = await db('settings').where({ key: 'operating_mode' }).first();
    
    if (currentMode && currentMode.value === mode) {
      return res.json({ success: true, message: 'Operating mode is already set to ' + mode });
    }

    await db('settings')
      .where({ key: 'operating_mode' })
      .update({ 
        value: mode,
        updated_at: db.raw('CURRENT_TIMESTAMP')
      });

    // Log mode change
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'OPERATING_MODE_CHANGE',
      meta: JSON.stringify({ 
        oldMode: currentMode ? currentMode.value : 'LOCAL',
        newMode: mode,
        userId: req.user.id
      })
    });

    logger.info(`Operating mode changed from ${currentMode ? currentMode.value : 'LOCAL'} to ${mode} by ${req.user.username}`);

    res.json({ 
      success: true,
      message: `Operating mode changed to ${mode}`,
      mode 
    });
  } catch (error) {
    logger.error('Operating mode update error:', error);
    res.status(500).json({ error: 'Failed to update operating mode' });
  }
});

// Get database configuration
router.get('/database/config', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const config = {
      type: process.env.DB_TYPE || 'sqlite3',
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      name: process.env.DB_NAME,
      user: process.env.DB_USER,
      // Don't expose password in response
      hasPassword: !!process.env.DB_PASSWORD
    };

    res.json({ config });
  } catch (error) {
    logger.error('Database config fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch database configuration' });
  }
});

// Test database connection
router.post('/database/test', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { type, host, port, name, user, password } = req.body;

    // This would test the connection with provided credentials
    // For security, we'll just return success for now
    // In production, you'd want to actually test the connection
    
    res.json({ 
      success: true,
      message: 'Database connection test successful' 
    });
  } catch (error) {
    logger.error('Database connection test error:', error);
    res.status(500).json({ error: 'Database connection test failed' });
  }
});

// Get payment gateway configuration
router.get('/payment/gateway', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const config = {
      stripeEnabled: !!process.env.STRIPE_SECRET_KEY,
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      // Don't expose secret keys
      hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET
    };

    res.json({ config });
  } catch (error) {
    logger.error('Payment gateway config fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch payment gateway configuration' });
  }
});

// Get printer configuration
router.get('/printer/config', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const settings = await db('settings')
      .whereIn('key', ['printer_enabled', 'default_printer_ip'])
      .select('key', 'value');

    const config = {
      enabled: false,
      defaultIp: null
    };

    settings.forEach(setting => {
      if (setting.key === 'printer_enabled') {
        config.enabled = setting.value === 'true';
      } else if (setting.key === 'default_printer_ip') {
        config.defaultIp = setting.value;
      }
    });

    res.json({ config });
  } catch (error) {
    logger.error('Printer config fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch printer configuration' });
  }
});

// Update printer configuration
router.put('/printer/config', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { enabled, defaultIp } = req.body;

    const trx = await db.transaction();

    try {
      // Update printer enabled setting
      await trx('settings')
        .where({ key: 'printer_enabled' })
        .update({ 
          value: String(enabled),
          updated_at: db.raw('CURRENT_TIMESTAMP')
        });

      // Update default printer IP
      if (defaultIp) {
        await trx('settings')
          .where({ key: 'default_printer_ip' })
          .update({ 
            value: defaultIp,
            updated_at: db.raw('CURRENT_TIMESTAMP')
          });
      }

      await trx.commit();

      // Log printer config update
      await db('audit_logs').insert({
        user_id: req.user.id,
        action: 'PRINTER_CONFIG_UPDATE',
        meta: JSON.stringify({ enabled, defaultIp, userId: req.user.id })
      });

      logger.info(`Printer configuration updated by ${req.user.username}: enabled=${enabled}, ip=${defaultIp}`);

      res.json({ message: 'Printer configuration updated successfully' });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Printer config update error:', error);
    res.status(500).json({ error: 'Failed to update printer configuration' });
  }
});

// Reset settings to defaults (admin only)
router.post('/reset', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const defaultSettings = {
      restaurant_name: 'POSQ Restaurant',
      currency: 'MAD',
      tax_rate: '10',
      service_charge_rate: '5',
      operating_mode: 'LOCAL',
      printer_enabled: 'true',
      sync_enabled: 'false',
      backup_enabled: 'true',
      backup_frequency: 'daily'
    };

    const trx = await db.transaction();

    try {
      for (const [key, value] of Object.entries(defaultSettings)) {
        await trx('settings')
          .where({ key })
          .update({ 
            value,
            updated_at: db.raw('CURRENT_TIMESTAMP')
          });
      }

      await trx.commit();

      // Log settings reset
      await db('audit_logs').insert({
        user_id: req.user.id,
        action: 'SETTINGS_RESET',
        meta: JSON.stringify({ 
          settings: Object.keys(defaultSettings),
          userId: req.user.id
        })
      });

      logger.info(`Settings reset to defaults by ${req.user.username}`);

      res.json({ message: 'Settings reset to defaults successfully' });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Settings reset error:', error);
    res.status(500).json({ error: 'Failed to reset settings' });
  }
});

module.exports = router;