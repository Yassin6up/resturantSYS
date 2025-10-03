#!/bin/bash

# POSQ Setup Script
echo "🚀 Setting up POSQ Restaurant POS System..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p data backups logs

# Copy environment file if it doesn't exist
if [ ! -f server/.env ]; then
    echo "📝 Creating environment configuration..."
    cp server/.env.example server/.env
    echo "✅ Environment file created at server/.env"
    echo "⚠️  Please review and update the configuration as needed."
fi

# Generate JWT secrets
if command -v openssl &> /dev/null; then
    echo "🔐 Generating JWT secrets..."
    JWT_SECRET=$(openssl rand -base64 32)
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)
    
    # Update .env file with generated secrets
    sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" server/.env
    sed -i.bak "s/JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET/" server/.env
    rm -f server/.env.bak
    echo "✅ JWT secrets generated and updated in .env file"
fi

# Ask user for deployment type
echo ""
echo "🔧 Choose deployment type:"
echo "1) Local Development (with hot reload)"
echo "2) Production (optimized build)"
echo "3) Production with Cloud Database"
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo "🔨 Setting up development environment..."
        docker-compose -f docker-compose.dev.yml up --build -d
        echo ""
        echo "✅ Development environment started!"
        echo "🌐 Frontend: http://localhost:5173"
        echo "🔧 Backend API: http://localhost:3001"
        echo "📱 Customer Menu: http://localhost:5173/menu?table=T01&branch=casa01"
        echo "👨‍💼 Admin Dashboard: http://localhost:5173/admin"
        ;;
    2)
        echo "🏭 Setting up production environment..."
        docker-compose up --build -d
        echo ""
        echo "✅ Production environment started!"
        echo "🌐 Application: http://localhost:3001"
        echo "📱 Customer Menu: http://localhost:3001/menu?table=T01&branch=casa01"
        echo "👨‍💼 Admin Dashboard: http://localhost:3001/admin"
        ;;
    3)
        echo "☁️ Setting up production with cloud database..."
        echo "⚠️  Make sure to configure your cloud database settings in server/.env"
        read -p "Press Enter to continue..."
        
        # Update operating mode to CLOUD
        sed -i.bak "s/OPERATING_MODE=.*/OPERATING_MODE=CLOUD/" server/.env
        rm -f server/.env.bak
        
        docker-compose --profile cloud up --build -d
        echo ""
        echo "✅ Production environment with cloud database started!"
        echo "🌐 Application: http://localhost:3001"
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
if curl -f http://localhost:3001/health &> /dev/null; then
    echo "✅ Backend service is healthy"
else
    echo "⚠️  Backend service may still be starting up..."
fi

echo ""
echo "🎉 POSQ setup complete!"
echo ""
echo "📋 Default login credentials:"
echo "   Admin: admin / admin123 (PIN: 1234)"
echo "   Cashier: cashier / cashier123 (PIN: 5678)"
echo "   Kitchen: kitchen / kitchen123 (PIN: 9999)"
echo ""
echo "📖 Next steps:"
echo "   1. Access the admin dashboard to configure your restaurant"
echo "   2. Update menu items and categories"
echo "   3. Set up tables and print QR codes"
echo "   4. Configure printers (optional)"
echo "   5. Test the customer ordering flow"
echo ""
echo "🔧 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart: docker-compose restart"
echo ""
echo "📚 For more information, see README.md"