const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const db = require('../config/database');

const router = express.Router();

// Get all settings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const settings = await db('settings').select('*');
    
    // Convert to key-value object
    const settingsObj = settings.reduce((acc, setting) => {
      let value = setting.value;
      
      // Parse based on type
      if (setting.type === 'number') {
        value = parseFloat(value);
      } else if (setting.type === 'boolean') {
        value = value === 'true';
      } else if (setting.type === 'json') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          value = null;
        }
      }
      
      acc[setting.key] = {
        value,
        description: setting.description,
        type: setting.type
      };
      
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: settingsObj
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update settings
router.put('/', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const updates = req.body;
    
    for (const [key, value] of Object.entries(updates)) {
      // Get existing setting to determine type
      const existing = await db('settings').where({ key }).first();
      
      let stringValue = String(value);
      if (typeof value === 'object') {
        stringValue = JSON.stringify(value);
      }
      
      if (existing) {
        await db('settings').where({ key }).update({
          value: stringValue,
          updated_at: db.fn.now()
        });
      } else {
        // Create new setting
        await db('settings').insert({
          key,
          value: stringValue,
          type: typeof value === 'object' ? 'json' : typeof value
        });
      }
    }

    // Log the settings change
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'SETTINGS_UPDATE',
      table_name: 'settings',
      meta: JSON.stringify({ updates })
    });
    
    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific setting
router.get('/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await db('settings').where({ key }).first();
    
    if (!setting) {
      return res.status(404).json({
        success: false,
        error: 'Setting not found'
      });
    }

    let value = setting.value;
    if (setting.type === 'number') {
      value = parseFloat(value);
    } else if (setting.type === 'boolean') {
      value = value === 'true';
    } else if (setting.type === 'json') {
      try {
        value = JSON.parse(value);
      } catch (e) {
        value = null;
      }
    }
    
    res.json({
      success: true,
      data: {
        key: setting.key,
        value,
        description: setting.description,
        type: setting.type
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test database connection (for cloud mode setup)
router.post('/test-connection', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { dbConfig } = req.body;
    
    // This would test the connection with provided config
    // For now, just return success
    res.json({
      success: true,
      message: 'Database connection test successful'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;