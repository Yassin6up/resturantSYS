#!/bin/bash

# POSQ Restaurant POS Setup Script
# This script sets up the development environment

set -e

echo "🚀 Setting up POSQ Restaurant POS..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    print_status "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check if Node.js is installed (for development)
check_node() {
    print_status "Checking Node.js installation..."
    if ! command -v node &> /dev/null; then
        print_warning "Node.js is not installed. You'll need it for development."
        print_warning "Install Node.js 18+ from https://nodejs.org/"
    else
        NODE_VERSION=$(node --version)
        print_success "Node.js $NODE_VERSION is installed"
    fi
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p server/data
    mkdir -p server/logs
    mkdir -p server/uploads
    mkdir -p printer-service/logs
    mkdir -p backups
    
    print_success "Directories created"
}

# Copy environment file
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        cp .env.example .env
        print_success "Environment file created from template"
        print_warning "Please review and update .env file with your configuration"
    else
        print_warning "Environment file already exists, skipping..."
    fi
}

# Install dependencies (if Node.js is available)
install_dependencies() {
    if command -v npm &> /dev/null; then
        print_status "Installing dependencies..."
        
        # Install root dependencies
        npm install
        
        # Install server dependencies
        cd server
        npm install
        cd ..
        
        # Install frontend dependencies
        cd frontend
        npm install
        cd ..
        
        # Install printer service dependencies
        cd printer-service
        npm install
        cd ..
        
        print_success "Dependencies installed"
    else
        print_warning "npm not available, skipping dependency installation"
        print_warning "Run 'npm install' in each directory after installing Node.js"
    fi
}

# Build Docker images
build_docker() {
    print_status "Building Docker images..."
    
    docker-compose build
    
    print_success "Docker images built"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Start only the database services
    docker-compose up -d redis
    
    # Wait for services to be ready
    sleep 5
    
    # Run migrations
    docker-compose run --rm api npm run migrate
    
    print_success "Database migrations completed"
}

# Seed database
seed_database() {
    print_status "Seeding database with initial data..."
    
    docker-compose run --rm api npm run seed
    
    print_success "Database seeded with initial data"
}

# Generate QR codes for tables
generate_qr_codes() {
    print_status "Generating QR codes for tables..."
    
    # This would typically be done by the application
    # For now, we'll create a simple script
    cat > scripts/generate_qr_codes.js << 'EOF'
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

async function generateQRCodes() {
    const tables = [];
    for (let i = 1; i <= 12; i++) {
        const tableNumber = `T${i}`;
        const qrUrl = `http://localhost:5173/menu?table=${tableNumber}&branch=CAS`;
        
        try {
            const qrCodeDataURL = await QRCode.toDataURL(qrUrl);
            tables.push({
                tableNumber,
                qrUrl,
                qrCode: qrCodeDataURL
            });
        } catch (error) {
            console.error(`Error generating QR for table ${tableNumber}:`, error);
        }
    }
    
    // Save QR codes data
    fs.writeFileSync(
        path.join(__dirname, '../qr-codes.json'),
        JSON.stringify(tables, null, 2)
    );
    
    console.log('QR codes generated and saved to qr-codes.json');
}

generateQRCodes().catch(console.error);
EOF

    if command -v node &> /dev/null; then
        cd server && node ../scripts/generate_qr_codes.js && cd ..
        print_success "QR codes generated"
    else
        print_warning "Node.js not available, skipping QR code generation"
    fi
}

# Create startup script
create_startup_script() {
    print_status "Creating startup script..."
    
    cat > start.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting POSQ Restaurant POS..."

# Start all services
docker-compose up --build

echo "✅ POSQ is now running!"
echo ""
echo "📱 Customer PWA: http://localhost:5173"
echo "👨‍💼 Admin Dashboard: http://localhost:5173/admin/login"
echo "🔧 API Server: http://localhost:3000"
echo "🖨️  Printer Service: http://localhost:4000"
echo ""
echo "Demo Credentials:"
echo "  Admin: admin / admin123"
echo "  Cashier: cashier1 / cashier123 (PIN: 5678)"
echo "  Kitchen: kitchen1 / kitchen123 (PIN: 9999)"
EOF

    chmod +x start.sh
    print_success "Startup script created (start.sh)"
}

# Create stop script
create_stop_script() {
    print_status "Creating stop script..."
    
    cat > stop.sh << 'EOF'
#!/bin/bash

echo "🛑 Stopping POSQ Restaurant POS..."

# Stop all services
docker-compose down

echo "✅ POSQ has been stopped"
EOF

    chmod +x stop.sh
    print_success "Stop script created (stop.sh)"
}

# Main setup function
main() {
    echo "=========================================="
    echo "  POSQ Restaurant POS Setup"
    echo "=========================================="
    echo ""
    
    check_docker
    check_node
    create_directories
    setup_environment
    install_dependencies
    build_docker
    run_migrations
    seed_database
    generate_qr_codes
    create_startup_script
    create_stop_script
    
    echo ""
    echo "=========================================="
    echo "  Setup Complete! 🎉"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Review and update .env file if needed"
    echo "2. Run './start.sh' to start the application"
    echo "3. Access the admin dashboard at http://localhost:5173/admin/login"
    echo "4. Use demo credentials to login"
    echo ""
    echo "For development:"
    echo "- Backend: cd server && npm run dev"
    echo "- Frontend: cd frontend && npm run dev"
    echo "- Printer: cd printer-service && npm run dev"
    echo ""
    echo "Documentation: See README.md for detailed instructions"
    echo ""
}

# Run main function
main "$@"