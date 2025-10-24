require('dotenv').config();

const config = {
  development: {
          client: 'mysql2',
          connection: {
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: '',
            database: 'resturant'
          },
    migrations: {
      directory: './src/migrations'
    },
    seeds: {
      directory: './src/seeds'
    },
    useNullAsDefault: true
  },

  production: {
          client: 'mysql2',
          connection: {
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: '',
            database: 'resturant'
          },
    migrations: {
      directory: './src/migrations'
    },
    seeds: {
      directory: './src/seeds'
    },
    useNullAsDefault: true,
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
      directory: './src/migrations'
    },
    seeds: {
      directory: './src/seeds'
    },
    useNullAsDefault: true
  }
};

module.exports = config;