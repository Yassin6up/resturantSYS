#!/bin/bash

# POSQ Restaurant POS Setup Script
echo "🚀 Setting up POSQ Restaurant POS System..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed. You can still run the application manually."
    DOCKER_AVAILABLE=false
else
    echo "✅ Docker $(docker --version) detected"
    DOCKER_AVAILABLE=true
fi

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo "✅ Environment file created. Please edit .env with your configuration."
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p server/data
mkdir -p server/logs
mkdir -p server/uploads
mkdir -p frontend/dist

# Run database migrations
echo "🗄️  Setting up database..."
cd server
npm run migrate
npm run seed
cd ..

echo "✅ Database setup complete"

# Run tests
echo "🧪 Running tests..."
npm test

if [ $? -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "⚠️  Some tests failed. Please check the output above."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Start the development server: npm run dev"
echo "3. Access the application:"
echo "   - Frontend: http://localhost:5173"
echo "   - Admin: http://localhost:5173/admin/login"
echo ""
echo "🔐 Default credentials:"
echo "   Admin: admin@posq.com / admin123"
echo "   Manager: manager@posq.com / admin123"
echo "   Cashier: cashier1@posq.com / cashier123 (PIN: 2222)"
echo "   Kitchen: kitchen@posq.com / cashier123 (PIN: 3333)"
echo ""

if [ "$DOCKER_AVAILABLE" = true ]; then
    echo "🐳 Docker commands:"
    echo "   Start with Docker: docker-compose up --build"
    echo "   Stop Docker: docker-compose down"
    echo ""
fi

echo "📚 For more information, see README.md"