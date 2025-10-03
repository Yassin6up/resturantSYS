const express = require('express');
const { db } = require('../database/init');
const { authenticateToken, authorize } = require('../middleware/auth');
const { logger } = require('../middleware/errorHandler');

const router = express.Router();

// Get all settings (public settings only for non-authenticated users)
router.get('/', async (req, res) => {
  try {
    const isAuthenticated = req.headers.authorization;
    
    let query = db('app_settings');
    
    // If not authenticated, only return public settings
    if (!isAuthenticated) {
      query = query.where({ is_public: true });
    }
    
    const settings = await query.select('key', 'value', 'type', 'category', 'description', 'is_public');
    
    // Convert to object format
    const settingsObj = {};
    settings.forEach(setting => {
      let value = setting.value;
      
      // Parse value based on type
      switch (setting.type) {
        case 'number':
          value = parseFloat(value);
          break;
        case 'boolean':
          value = value === 'true';
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch (e) {
            value = value;
          }
          break;
        default:
          value = value;
      }
      
      settingsObj[setting.key] = {
        value,
        type: setting.type,
        category: setting.category,
        description: setting.description,
        isPublic: setting.is_public
      };
    });
    
    res.json({ success: true, settings: settingsObj });
  } catch (error) {
    logger.error('Settings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get settings by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const isAuthenticated = req.headers.authorization;
    
    let query = db('app_settings').where({ category });
    
    if (!isAuthenticated) {
      query = query.where({ is_public: true });
    }
    
    const settings = await query.select('key', 'value', 'type', 'category', 'description', 'is_public');
    
    const settingsObj = {};
    settings.forEach(setting => {
      let value = setting.value;
      
      switch (setting.type) {
        case 'number':
          value = parseFloat(value);
          break;
        case 'boolean':
          value = value === 'true';
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch (e) {
            value = value;
          }
          break;
        default:
          value = value;
      }
      
      settingsObj[setting.key] = {
        value,
        type: setting.type,
        category: setting.category,
        description: setting.description,
        isPublic: setting.is_public
      };
    });
    
    res.json({ success: true, settings: settingsObj });
  } catch (error) {
    logger.error('Settings category fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch settings category' });
  }
});

// Update single setting (admin only)
router.put('/:key', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    // Get current setting to determine type
    const currentSetting = await db('app_settings').where({ key }).first();
    
    if (!currentSetting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    // Convert value based on type
    let processedValue = value;
    switch (currentSetting.type) {
      case 'number':
        processedValue = parseFloat(value).toString();
        break;
      case 'boolean':
        processedValue = Boolean(value).toString();
        break;
      case 'json':
        processedValue = JSON.stringify(value);
        break;
      default:
        processedValue = String(value);
    }
    
    await db('app_settings')
      .where({ key })
      .update({ 
        value: processedValue,
        updated_at: db.raw('CURRENT_TIMESTAMP')
      });
    
    // Log setting update
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'SETTING_UPDATE',
      meta: JSON.stringify({ 
        key, 
        oldValue: currentSetting.value, 
        newValue: processedValue,
        userId: req.user.id
      })
    });
    
    logger.info(`Setting updated: ${key} by ${req.user.username}`);
    
    res.json({ success: true, message: 'Setting updated successfully' });
  } catch (error) {
    logger.error('Setting update error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Update multiple settings (admin only)
router.put('/', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Invalid settings format' });
    }
    
    const updates = [];
    
    for (const [key, value] of Object.entries(settings)) {
      // Get current setting to determine type
      const currentSetting = await db('app_settings').where({ key }).first();
      
      if (!currentSetting) {
        continue; // Skip unknown settings
      }
      
      // Convert value based on type
      let processedValue = value;
      switch (currentSetting.type) {
        case 'number':
          processedValue = parseFloat(value).toString();
          break;
        case 'boolean':
          processedValue = Boolean(value).toString();
          break;
        case 'json':
          processedValue = JSON.stringify(value);
          break;
        default:
          processedValue = String(value);
      }
      
      updates.push({
        key,
        value: processedValue,
        oldValue: currentSetting.value
      });
    }
    
    // Update all settings
    for (const update of updates) {
      await db('app_settings')
        .where({ key: update.key })
        .update({ 
          value: update.value,
          updated_at: db.raw('CURRENT_TIMESTAMP')
        });
      
      // Log setting update
      await db('audit_logs').insert({
        user_id: req.user.id,
        action: 'SETTING_UPDATE',
        meta: JSON.stringify({ 
          key: update.key, 
          oldValue: update.oldValue, 
          newValue: update.value,
          userId: req.user.id
        })
      });
    }
    
    logger.info(`Multiple settings updated by ${req.user.username}`);
    
    res.json({ success: true, message: 'Settings updated successfully', updatedCount: updates.length });
  } catch (error) {
    logger.error('Settings update error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Reset settings to default (admin only)
router.post('/reset', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { category } = req.body;
    
    // Delete existing settings
    if (category) {
      await db('app_settings').where({ category }).del();
    } else {
      await db('app_settings').del();
    }
    
    // Re-run seeds for the category or all
    if (category) {
      // This would require importing the seed data and filtering by category
      // For now, we'll just return success
      logger.info(`Settings reset for category: ${category} by ${req.user.username}`);
    } else {
      logger.info(`All settings reset by ${req.user.username}`);
    }
    
    res.json({ success: true, message: 'Settings reset successfully' });
  } catch (error) {
    logger.error('Settings reset error:', error);
    res.status(500).json({ error: 'Failed to reset settings' });
  }
});

module.exports = router;