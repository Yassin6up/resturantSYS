const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { db } = require('../database/init');
const { authenticateToken, authorize } = require('../middleware/auth');
const { logger } = require('../middleware/errorHandler');

router.get('/', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }

    const employees = await db('users')
      .select(
        'id',
        'username',
        'full_name',
        'role',
        'pin',
        'salary',
        'phone',
        'email',
        'hire_date',
        'is_active',
        'branch_id',
        'created_at'
      )
      .where({ branch_id: branchId })
      .orderBy('created_at', 'desc');

    res.json({
      success: true,
      employees
    });
  } catch (error) {
    logger.error('Failed to fetch employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

router.get('/:id', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }
    
    const employee = await db('users')
      .select(
        'id',
        'username',
        'full_name',
        'role',
        'pin',
        'salary',
        'phone',
        'email',
        'hire_date',
        'is_active',
        'branch_id',
        'created_at'
      )
      .where({ id, branch_id: branchId })
      .first();

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({
      success: true,
      employee
    });
  } catch (error) {
    logger.error('Failed to fetch employee:', error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

router.post('/', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const {
      username,
      password,
      full_name,
      role,
      pin,
      salary,
      phone,
      email,
      hire_date
    } = req.body;

    // Use authenticated user's branch_id for security
    const branchId = req.user.branch_id;
    
    if (!branchId) {
      return res.status(400).json({ error: 'User is not assigned to a branch' });
    }

    if (!username || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingUser = await db('users')
      .where({ username })
      .orWhere({ pin })
      .first();

    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      if (existingUser.pin === pin) {
        return res.status(400).json({ error: 'PIN already in use' });
      }
    }

    const password_hash = await bcrypt.hash(password, 12);

    const [employeeId] = await db('users').insert({
      username,
      password_hash,
      full_name,
      role,
      pin: pin || null,
      salary: salary || null,
      phone: phone || null,
      email: email || null,
      hire_date: hire_date || new Date().toISOString().split('T')[0],
      is_active: true,
      branch_id: branchId
    });

    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'CREATE_EMPLOYEE',
      entity_type: 'user',
      entity_id: employeeId,
      meta: JSON.stringify({ username, full_name, role })
    });

    logger.info(`Employee ${username} created by ${req.user.username}`);

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      employeeId
    });
  } catch (error) {
    logger.error('Failed to create employee:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

router.put('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      username,
      password,
      full_name,
      role,
      pin,
      salary,
      phone,
      email,
      hire_date,
      is_active
    } = req.body;

    const employee = await db('users').where({ id }).first();
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    if (username && username !== employee.username) {
      const existingUsername = await db('users')
        .where({ username })
        .whereNot({ id })
        .first();
      
      if (existingUsername) {
        return res.status(400).json({ error: 'Username already exists' });
      }
    }

    if (pin && pin !== employee.pin) {
      const existingPin = await db('users')
        .where({ pin })
        .whereNot({ id })
        .first();
      
      if (existingPin) {
        return res.status(400).json({ error: 'PIN already in use' });
      }
    }

    const updateData = {
      username: username || employee.username,
      full_name: full_name || employee.full_name,
      role: role || employee.role,
      pin: pin !== undefined ? pin : employee.pin,
      salary: salary !== undefined ? salary : employee.salary,
      phone: phone !== undefined ? phone : employee.phone,
      email: email !== undefined ? email : employee.email,
      hire_date: hire_date || employee.hire_date,
      is_active: is_active !== undefined ? is_active : employee.is_active
    };

    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 12);
    }

    await db('users')
      .where({ id })
      .update(updateData);

    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'UPDATE_EMPLOYEE',
      entity_type: 'user',
      entity_id: id,
      meta: JSON.stringify({ changes: updateData })
    });

    logger.info(`Employee ${id} updated by ${req.user.username}`);

    res.json({
      success: true,
      message: 'Employee updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

router.delete('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const employee = await db('users').where({ id }).first();
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await db('users')
      .where({ id })
      .update({ is_active: false });

    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'DELETE_EMPLOYEE',
      entity_type: 'user',
      entity_id: id,
      meta: JSON.stringify({ username: employee.username })
    });

    logger.info(`Employee ${id} deactivated by ${req.user.username}`);

    res.json({
      success: true,
      message: 'Employee deactivated successfully'
    });
  } catch (error) {
    logger.error('Failed to delete employee:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

router.post('/:id/activate', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await db('users').where({ id }).first();
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await db('users')
      .where({ id })
      .update({ is_active: true });

    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'ACTIVATE_EMPLOYEE',
      entity_type: 'user',
      entity_id: id,
      meta: JSON.stringify({ username: employee.username })
    });

    logger.info(`Employee ${id} activated by ${req.user.username}`);

    res.json({
      success: true,
      message: 'Employee activated successfully'
    });
  } catch (error) {
    logger.error('Failed to activate employee:', error);
    res.status(500).json({ error: 'Failed to activate employee' });
  }
});

module.exports = router;
