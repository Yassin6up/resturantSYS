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
    const { type, host, port, name, user, password, filename } = req.body;
    
    const knex = require('knex');
    let testDb;

    try {
      if (type === 'sqlite3') {
        // Test SQLite connection
        testDb = knex({
          client: 'sqlite3',
          connection: {
            filename: filename || './data/posq.db'
          },
          useNullAsDefault: true
        });
        
        // Test simple query
        await testDb.raw('SELECT 1');
        
        res.json({ 
          success: true,
          message: 'SQLite database connection successful' 
        });
      } else if (type === 'mysql2') {
        // Test MySQL connection
        testDb = knex({
          client: 'mysql2',
          connection: {
            host: host || 'localhost',
            port: parseInt(port) || 3306,
            user: user || 'root',
            password: password || '',
            database: name || 'posq'
          }
        });
        
        // Test connection
        await testDb.raw('SELECT 1');
        
        res.json({ 
          success: true,
          message: 'MySQL database connection successful' 
        });
      } else if (type === 'pg') {
        // Test PostgreSQL connection
        testDb = knex({
          client: 'pg',
          connection: {
            host: host || 'localhost',
            port: parseInt(port) || 5432,
            user: user || 'postgres',
            password: password || '',
            database: name || 'posq'
          }
        });
        
        // Test connection
        await testDb.raw('SELECT 1');
        
        res.json({ 
          success: true,
          message: 'PostgreSQL database connection successful' 
        });
      } else {
        res.status(400).json({ 
          success: false,
          error: 'Unsupported database type' 
        });
      }
    } catch (connError) {
      logger.error('Database connection test failed:', connError);
      res.status(400).json({ 
        success: false,
        error: connError.message || 'Database connection failed' 
      });
    } finally {
      if (testDb) {
        await testDb.destroy();
      }
    }
  } catch (error) {
    logger.error('Database connection test error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Database connection test failed' 
    });
  }
});

// Initialize database (create DB, migrate, seed)
router.post('/database/initialize', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { type, host, port, name, user, password, filename } = req.body;
    
    const knex = require('knex');
    const path = require('path');
    const fs = require('fs');
    const bcrypt = require('bcrypt');
    
    let initDb;
    
    try {
      if (type === 'sqlite3') {
        // Ensure data directory exists
        const dataDir = path.dirname(filename || './data/posq.db');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // Create SQLite database
        initDb = knex({
          client: 'sqlite3',
          connection: {
            filename: filename || './data/posq.db'
          },
          useNullAsDefault: true,
          migrations: {
            directory: path.join(__dirname, '../migrations')
          },
          seeds: {
            directory: path.join(__dirname, '../seeds')
          }
        });
        
        // Run migrations
        await initDb.migrate.latest();
        logger.info('SQLite migrations completed');
        
        // Run minimal seed (admin and owner only)
        const hashedPassword = await bcrypt.hash('admin123', 12);
        
        // Check if admin exists
        const adminExists = await initDb('users').where({ username: 'admin' }).first();
        if (!adminExists) {
          await initDb('users').insert([
            {
              username: 'admin',
              password_hash: hashedPassword,
              full_name: 'System Administrator',
              role: 'admin',
              pin: '1234',
              is_active: true
            }
          ]);
          
          logger.info('Admin user created');
        }
        
        // Check if default branch exists
        const branchExists = await initDb('branches').where({ code: 'MAIN' }).first();
        if (!branchExists) {
          await initDb('branches').insert({
            name: 'Main Branch',
            code: 'MAIN',
            address: 'Default Address'
          });
          logger.info('Default branch created');
        }
        
        res.json({
          success: true,
          message: 'SQLite database initialized successfully'
        });
        
      } else if (type === 'mysql2') {
        // First connect without database to create it
        const mysql = require('mysql2/promise');
        const connection = await mysql.createConnection({
          host: host || 'localhost',
          port: parseInt(port) || 3306,
          user: user || 'root',
          password: password || ''
        });
        
        // Create database if not exists
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${name || 'posq'}\``);
        await connection.end();
        
        logger.info(`MySQL database '${name || 'posq'}' created or already exists`);
        
        // Now connect with database
        initDb = knex({
          client: 'mysql2',
          connection: {
            host: host || 'localhost',
            port: parseInt(port) || 3306,
            user: user || 'root',
            password: password || '',
            database: name || 'posq'
          },
          migrations: {
            directory: path.join(__dirname, '../migrations')
          },
          seeds: {
            directory: path.join(__dirname, '../seeds')
          }
        });
        
        // Run migrations
        await initDb.migrate.latest();
        logger.info('MySQL migrations completed');
        
        // Run minimal seed (admin and owner only)
        const hashedPassword = await bcrypt.hash('admin123', 12);
        
        // Check if admin exists
        const adminExists = await initDb('users').where({ username: 'admin' }).first();
        if (!adminExists) {
          await initDb('users').insert([
            {
              username: 'admin',
              password_hash: hashedPassword,
              full_name: 'System Administrator',
              role: 'admin',
              pin: '1234',
              is_active: true
            }
          ]);
          logger.info('Admin user created');
        }
        
        // Check if default branch exists
        const branchExists = await initDb('branches').where({ code: 'MAIN' }).first();
        if (!branchExists) {
          await initDb('branches').insert({
            name: 'Main Branch',
            code: 'MAIN',
            address: 'Default Address'
          });
          logger.info('Default branch created');
        }
        
        res.json({
          success: true,
          message: `MySQL database '${name || 'posq'}' initialized successfully`
        });
      }
    } catch (initError) {
      logger.error('Database initialization failed:', initError);
      res.status(500).json({
        success: false,
        error: initError.message || 'Database initialization failed'
      });
    } finally {
      if (initDb) {
        await initDb.destroy();
      }
    }
  } catch (error) {
    logger.error('Database initialization error:', error);
    res.status(500).json({
      success: false,
      error: 'Database initialization failed'
    });
  }
});

// Export database
router.get('/database/export', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const dbType = process.env.DB_TYPE || 'sqlite3';
    const path = require('path');
    const fs = require('fs');
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    if (dbType === 'sqlite3') {
      // For SQLite, just send the database file
      const dbPath = process.env.DB_PATH || './data/posq.db';
      const absolutePath = path.resolve(dbPath);
      
      if (!fs.existsSync(absolutePath)) {
        return res.status(404).json({ error: 'Database file not found' });
      }
      
      // Set headers for file download
      res.setHeader('Content-Type', 'application/x-sqlite3');
      res.setHeader('Content-Disposition', `attachment; filename="posq-backup-${Date.now()}.db"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(absolutePath);
      fileStream.pipe(res);
      
    } else if (dbType === 'mysql2') {
      // For MySQL, create SQL dump
      const host = process.env.DB_HOST || 'localhost';
      const port = process.env.DB_PORT || 3306;
      const database = process.env.DB_NAME || 'posq';
      const user = process.env.DB_USER || 'root';
      const password = process.env.DB_PASSWORD || '';
      
      const timestamp = Date.now();
      const dumpFile = path.join('/tmp', `posq-backup-${timestamp}.sql`);
      
      // Create mysqldump command
      const dumpCmd = `mysqldump -h ${host} -P ${port} -u ${user} ${password ? `-p${password}` : ''} ${database} > ${dumpFile}`;
      
      try {
        await execPromise(dumpCmd);
        
        // Set headers for file download
        res.setHeader('Content-Type', 'application/sql');
        res.setHeader('Content-Disposition', `attachment; filename="posq-backup-${timestamp}.sql"`);
        
        // Stream the file
        const fileStream = fs.createReadStream(dumpFile);
        fileStream.pipe(res);
        
        // Clean up temp file after sending
        fileStream.on('end', () => {
          fs.unlinkSync(dumpFile);
        });
      } catch (dumpError) {
        logger.error('MySQL dump failed:', dumpError);
        res.status(500).json({ error: 'Failed to export MySQL database' });
      }
    } else {
      res.status(400).json({ error: 'Database export not supported for this database type' });
    }
  } catch (error) {
    logger.error('Database export error:', error);
    res.status(500).json({ error: 'Failed to export database' });
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