const express = require('express');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { authenticateToken, authorize } = require('../middleware/auth');
const { logger } = require('../middleware/errorHandler');

const router = express.Router();

const BACKUP_DIR = path.join(__dirname, '../../../backups');
const SCRIPTS_DIR = path.join(__dirname, '../../../scripts');

router.post('/create', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const dbType = process.env.DB_TYPE || 'sqlite3';
    const scriptPath = path.join(SCRIPTS_DIR, 'backup.sh');
    
    const dbTypeMap = {
      'sqlite3': 'sqlite',
      'mysql2': 'mysql',
      'pg': 'postgresql'
    };
    
    const backupType = dbTypeMap[dbType] || 'sqlite';
    
    exec(`bash "${scriptPath}" "${backupType}"`, {
      env: {
        ...process.env,
        DB_PATH: process.env.SQLITE_PATH || './data/posq.db',
        DB_TYPE: backupType
      }
    }, async (error, stdout, stderr) => {
      if (error) {
        logger.error('Backup creation error:', error);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to create backup',
          details: stderr
        });
      }
      
      await require('../database/init').db('audit_logs').insert({
        user_id: req.user.id,
        action: 'BACKUP_CREATE',
        meta: JSON.stringify({ dbType, userId: req.user.id })
      });
      
      logger.info(`Database backup created by ${req.user.username}`);
      
      res.json({ 
        success: true,
        message: 'Backup created successfully',
        output: stdout
      });
    });
    
  } catch (error) {
    logger.error('Backup creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create backup' });
  }
});

router.get('/list', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    
    const files = await fs.readdir(BACKUP_DIR);
    const backups = [];
    
    for (const file of files) {
      if (file.endsWith('.gz') || file.endsWith('.db')) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = await fs.stat(filePath);
        
        backups.push({
          filename: file,
          size: stats.size,
          created: stats.mtime,
          type: file.includes('sqlite') ? 'sqlite' : file.includes('mysql') ? 'mysql' : 'postgresql'
        });
      }
    }
    
    backups.sort((a, b) => b.created - a.created);
    
    res.json({ success: true, backups });
    
  } catch (error) {
    logger.error('Backup list error:', error);
    res.status(500).json({ success: false, error: 'Failed to list backups' });
  }
});

router.post('/restore', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ success: false, error: 'Filename is required' });
    }
    
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Invalid filename' });
    }
    
    if (!/^posq_(sqlite|mysql|postgresql)_\d{8}_\d{6}\.(db|sql)(\.gz)?$/.test(filename)) {
      return res.status(400).json({ success: false, error: 'Invalid backup filename format' });
    }
    
    const backupPath = path.join(BACKUP_DIR, filename);
    const resolvedPath = path.resolve(backupPath);
    const resolvedBackupDir = path.resolve(BACKUP_DIR);
    
    if (!resolvedPath.startsWith(resolvedBackupDir)) {
      return res.status(400).json({ success: false, error: 'Invalid backup path' });
    }
    
    try {
      await fs.access(backupPath);
    } catch {
      return res.status(404).json({ success: false, error: 'Backup file not found' });
    }
    
    const dbType = filename.includes('sqlite') ? 'sqlite' : filename.includes('mysql') ? 'mysql' : 'postgresql';
    const scriptPath = path.join(SCRIPTS_DIR, 'restore.sh');
    
    exec(`bash "${scriptPath}" "${dbType}" "${backupPath}"`, {
      env: {
        ...process.env,
        DB_PATH: process.env.SQLITE_PATH || './data/posq.db'
      }
    }, async (error, stdout, stderr) => {
      if (error) {
        logger.error('Backup restore error:', error);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to restore backup',
          details: stderr
        });
      }
      
      await require('../database/init').db('audit_logs').insert({
        user_id: req.user.id,
        action: 'BACKUP_RESTORE',
        meta: JSON.stringify({ filename, userId: req.user.id })
      });
      
      logger.info(`Database restored from ${filename} by ${req.user.username}`);
      
      res.json({ 
        success: true,
        message: 'Backup restored successfully',
        output: stdout
      });
    });
    
  } catch (error) {
    logger.error('Backup restore error:', error);
    res.status(500).json({ success: false, error: 'Failed to restore backup' });
  }
});

router.delete('/:filename', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { filename } = req.params;
    
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Invalid filename' });
    }
    
    if (!/^posq_(sqlite|mysql|postgresql)_\d{8}_\d{6}\.(db|sql)(\.gz)?$/.test(filename)) {
      return res.status(400).json({ success: false, error: 'Invalid backup filename format' });
    }
    
    const backupPath = path.join(BACKUP_DIR, filename);
    const resolvedPath = path.resolve(backupPath);
    const resolvedBackupDir = path.resolve(BACKUP_DIR);
    
    if (!resolvedPath.startsWith(resolvedBackupDir)) {
      return res.status(400).json({ success: false, error: 'Invalid backup path' });
    }
    
    try {
      await fs.access(backupPath);
      await fs.unlink(backupPath);
      
      await require('../database/init').db('audit_logs').insert({
        user_id: req.user.id,
        action: 'BACKUP_DELETE',
        meta: JSON.stringify({ filename, userId: req.user.id })
      });
      
      logger.info(`Backup ${filename} deleted by ${req.user.username}`);
      
      res.json({ success: true, message: 'Backup deleted successfully' });
    } catch {
      return res.status(404).json({ success: false, error: 'Backup file not found' });
    }
    
  } catch (error) {
    logger.error('Backup deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete backup' });
  }
});

module.exports = router;
