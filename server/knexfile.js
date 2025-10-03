require('dotenv').config();

const config = {
  development: {
    client: process.env.DB_TYPE || 'sqlite3',
    connection: process.env.DB_TYPE === 'sqlite3' 
      ? {
          filename: process.env.DB_PATH || './data/posq.db'
        }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 3306,
          user: process.env.DB_USER || 'posq',
          password: process.env.DB_PASSWORD || 'posqpassword',
          database: process.env.DB_NAME || 'posq'
        },
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    },
    useNullAsDefault: process.env.DB_TYPE === 'sqlite3'
  },

  production: {
    client: process.env.DB_TYPE || 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    },
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    },
    pool: {
      min: 2,
      max: 10
    }
  },

  test: {
    client: 'sqlite3',
    connection: {
      filename: ':memory:'
    },
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    },
    useNullAsDefault: true
  }
};

module.exports = config;