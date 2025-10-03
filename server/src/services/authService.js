const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

class AuthService {
  async login(username, password) {
    const user = await db('users')
      .where({ username, is_active: true })
      .first();

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const accessToken = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role
      }
    };
  }

  async pinLogin(username, pin) {
    const user = await db('users')
      .where({ username, pin, is_active: true })
      .first();

    if (!user) {
      throw new Error('Invalid PIN');
    }

    const accessToken = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role
      }
    };
  }

  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await db('users')
        .where({ id: decoded.userId, is_active: true })
        .first();

      if (!user) {
        throw new Error('Invalid refresh token');
      }

      const accessToken = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      return { accessToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async createUser(userData) {
    const existingUser = await db('users').where({ username: userData.username }).first();
    if (existingUser) {
      throw new Error('Username already exists');
    }

    const passwordHash = await bcrypt.hash(userData.password, 10);
    
    const [userId] = await db('users').insert({
      username: userData.username,
      password_hash: passwordHash,
      full_name: userData.fullName,
      role: userData.role,
      pin: userData.pin,
      is_active: true
    });

    const user = await db('users').where({ id: userId }).first();
    return {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role
    };
  }
}

module.exports = new AuthService();