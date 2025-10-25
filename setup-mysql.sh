#!/bin/bash

# POSQ Restaurant System - MySQL Setup Script
echo "🍽️  Setting up POSQ Restaurant System with MySQL..."

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL is not installed. Please install MySQL first."
    echo "   On Ubuntu/Debian: sudo apt-get install mysql-server"
    echo "   On macOS: brew install mysql"
    echo "   On Windows: Download from https://dev.mysql.com/downloads/mysql/"
    exit 1
fi

# Check if MySQL service is running
if ! systemctl is-active --quiet mysql 2>/dev/null && ! brew services list | grep mysql | grep started >/dev/null 2>&1; then
    echo "⚠️  MySQL service is not running. Starting MySQL..."
    if command -v systemctl &> /dev/null; then
        sudo systemctl start mysql
    elif command -v brew &> /dev/null; then
        brew services start mysql
    else
        echo "❌ Please start MySQL service manually"
        exit 1
    fi
fi

# Create database and user
echo "📊 Creating database and user..."

mysql -u root -p << EOF
CREATE DATABASE IF NOT EXISTS posq CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'posq'@'localhost' IDENTIFIED BY 'posqpassword';
GRANT ALL PRIVILEGES ON posq.* TO 'posq'@'localhost';
FLUSH PRIVILEGES;
EOF

if [ $? -eq 0 ]; then
    echo "✅ Database and user created successfully!"
else
    echo "❌ Failed to create database. Please check MySQL connection."
    exit 1
fi

# Install MySQL dependencies
echo "📦 Installing MySQL dependencies..."
cd server
npm install mysql2

# Run migrations
echo "🔄 Running database migrations..."
npx knex migrate:latest

# Run seeds
echo "🌱 Seeding database with initial data..."
npx knex seed:run

echo "🎉 Setup complete! Your POSQ Restaurant System is ready with MySQL!"
echo ""
echo "📋 Next steps:"
echo "   1. Start the server: cd server && npm start"
echo "   2. Start the frontend: cd frontend && npm run dev"
echo "   3. Access the system at: http://localhost:5173"
echo ""
echo "🔐 Default admin credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "💡 You can now switch between LOCAL (SQLite) and CLOUD (MySQL) modes in the Settings page!"