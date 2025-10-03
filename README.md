# POSQ - Restaurant POS & QR Ordering System

A comprehensive, full-stack restaurant management system combining a Point of Sale (POS) system with QR code-based customer ordering. Built with Node.js, React, and SQLite/MySQL.

## 🌟 Features

### Customer Experience (PWA)
- **QR Code Ordering**: Scan table QR codes to access menu
- **Mobile-First Design**: Optimized for smartphones and tablets  
- **Real-Time Menu**: Browse categories, items, and modifiers
- **Cart Management**: Add items, customize orders, view totals
- **Order Tracking**: Real-time status updates via WebSocket
- **Offline Support**: PWA capabilities for reliable performance

### Admin Dashboard
- **Order Management**: Live order queue, status updates, kitchen display
- **Menu Management**: CRUD operations for categories, items, and modifiers
- **Table Management**: Create tables, generate QR codes, print sheets
- **Inventory Tracking**: Stock management with automatic consumption
- **User Management**: Role-based access (admin, manager, cashier, kitchen)
- **Reports & Analytics**: Sales reports, popular items, revenue tracking
- **Settings**: Operating mode toggle (LOCAL/CLOUD), payment configuration

### Technical Features
- **Dual Operating Modes**: LOCAL (SQLite) or CLOUD (MySQL/PostgreSQL)
- **Real-Time Updates**: Socket.IO for live order notifications
- **Thermal Printing**: ESC/POS printer integration for receipts and kitchen tickets
- **Multi-Branch Support**: Scalable architecture for restaurant chains
- **Security**: JWT authentication, role-based authorization, input validation
- **Backup & Recovery**: Automated backups with retention policies

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Git

### 1. Clone and Setup
```bash
git clone <repository-url>
cd posq-restaurant-pos
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### 2. Choose Deployment Mode
The setup script will ask you to choose:
1. **Local Development** - Hot reload, separate frontend/backend
2. **Production** - Optimized build, single container
3. **Production + Cloud DB** - With MySQL/PostgreSQL

### 3. Access the System
- **Customer Menu**: `http://localhost:3001/menu?table=T01&branch=casa01`
- **Admin Dashboard**: `http://localhost:3001/admin`

### 4. Default Login Credentials
- **Admin**: `admin` / `admin123` (PIN: 1234)
- **Cashier**: `cashier` / `cashier123` (PIN: 5678)  
- **Kitchen**: `kitchen` / `kitchen123` (PIN: 9999)

## 📱 Customer Ordering Flow

1. **Scan QR Code** - Customer scans table QR code with phone
2. **Browse Menu** - View categories and menu items with descriptions
3. **Customize Order** - Add items, select modifiers, add special notes
4. **Review Cart** - Check order details and pricing
5. **Place Order** - Submit order with customer information
6. **Get Confirmation** - Receive order code and QR for cashier
7. **Track Status** - Real-time updates on order preparation
8. **Payment** - Pay at cashier or online (if enabled)

## 🏪 Admin Workflow

### Order Management
1. **Monitor Orders** - Live dashboard shows incoming orders
2. **Confirm Orders** - Cashier confirms and processes payments
3. **Kitchen Display** - Kitchen staff see preparation queue
4. **Status Updates** - Update order status as it progresses
5. **Completion** - Mark orders as served and completed

### Menu Management
1. **Categories** - Create and organize menu categories
2. **Items** - Add menu items with descriptions, prices, images
3. **Modifiers** - Set up customization options (size, extras, etc.)
4. **Availability** - Enable/disable items based on stock

### Table Management
1. **Create Tables** - Add tables with numbers and descriptions
2. **Generate QR Codes** - Automatic QR code generation for each table
3. **Print QR Sheet** - Generate printable QR code sheets
4. **Table Status** - Monitor table occupancy and orders

## 🛠️ Configuration

### Environment Variables
Copy `server/.env.example` to `server/.env` and configure:

```env
# Operating Mode
OPERATING_MODE=LOCAL  # or CLOUD

# Database (LOCAL mode)
DB_PATH=./data/posq.db

# Database (CLOUD mode)
DB_CLIENT=mysql2
DB_HOST=localhost
DB_PORT=3306
DB_USER=posq_user
DB_PASSWORD=posq_password
DB_NAME=posq_db

# Security
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Payment Gateway (optional)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### Operating Modes

#### LOCAL Mode (Default)
- Uses SQLite database stored locally
- Perfect for single restaurant locations
- No internet required for core functionality
- Automatic database creation and migrations

#### CLOUD Mode
- Uses MySQL or PostgreSQL database
- Supports multiple restaurant locations
- Centralized data management
- Real-time synchronization across locations

## 🖨️ Printer Integration

### Setup Thermal Printers
1. **Start Printer Service**:
   ```bash
   docker-compose --profile printer up -d
   ```

2. **Configure Printers** in Admin Dashboard:
   - Add network printers (IP:port)
   - Add USB printers (device path)
   - Map categories to specific printers

3. **Test Printing**:
   - Use test print function in admin
   - Verify receipt and kitchen ticket formats

### Supported Printer Types
- **Network Printers**: ESC/POS compatible thermal printers
- **USB Printers**: Direct USB connection
- **Bluetooth**: Mobile thermal printers

## 📊 Database Schema

### Core Tables
- `users` - System users with role-based access
- `branches` - Restaurant locations
- `tables` - Table management with QR codes
- `categories` - Menu categories
- `menu_items` - Menu items with pricing
- `modifiers` - Item customization options
- `orders` - Customer orders
- `order_items` - Order line items
- `payments` - Payment records
- `stock_items` - Inventory management
- `settings` - System configuration

### Sample Data
The system includes sample Moroccan restaurant data:
- Traditional dishes (Tajine, Couscous, Pastilla)
- Beverages (Mint tea, Fresh juices)
- Appetizers and desserts
- 12 pre-configured tables

## 🔧 Development

### Local Development Setup
```bash
# Install dependencies
npm install
cd server && npm install
cd ../frontend && npm install

# Start development servers
npm run dev
```

### Project Structure
```
posq-restaurant-pos/
├── server/                 # Backend (Node.js + Express)
│   ├── src/
│   │   ├── controllers/    # API controllers
│   │   ├── services/       # Business logic
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth, validation, etc.
│   │   └── migrations/     # Database migrations
│   └── package.json
├── frontend/               # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── components/     # Reusable components
│   │   ├── stores/         # State management (Zustand)
│   │   └── services/       # API services
│   └── package.json
├── printer-service/        # Thermal printer service
├── scripts/                # Utility scripts
└── docker-compose.yml      # Docker configuration
```

### API Documentation
The API follows RESTful conventions:

- `POST /api/auth/login` - User authentication
- `GET /api/menu` - Get menu items
- `POST /api/orders` - Create new order
- `GET /api/orders` - List orders with filters
- `PATCH /api/orders/:id/status` - Update order status
- `GET /api/tables` - Get tables
- `GET /api/settings` - Get system settings

### Testing
```bash
# Run backend tests
cd server && npm test

# Run frontend tests  
cd frontend && npm test

# Run integration tests
npm run test:integration
```

## 🚀 Deployment

### Production Deployment
```bash
# Build and start production containers
docker-compose up --build -d

# With cloud database
docker-compose --profile cloud up --build -d
```

### Cloud Deployment (VPS/Server)
1. **Server Setup**:
   ```bash
   # Install Docker and Docker Compose
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

2. **SSL Certificate** (recommended):
   ```bash
   # Using Let's Encrypt with Certbot
   sudo apt install certbot
   sudo certbot --nginx -d yourdomain.com
   ```

3. **Environment Configuration**:
   - Update `server/.env` with production values
   - Set strong JWT secrets
   - Configure database connection
   - Set up payment gateway credentials

4. **Start Services**:
   ```bash
   docker-compose --profile production up -d
   ```

### Backup Strategy
```bash
# Manual backup
./scripts/backup.sh

# Automated backups (cron)
0 2 * * * /path/to/posq/scripts/backup.sh
```

## 🔒 Security

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- PIN-based quick login for cashiers
- Session management and timeout

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Rate limiting on API endpoints

### Best Practices
- Regular security updates
- Strong password policies
- Database encryption at rest
- HTTPS in production
- Audit logging for financial transactions

## 📈 Monitoring & Maintenance

### Health Checks
- Application health endpoint: `/health`
- Database connectivity monitoring
- Real-time error logging
- Performance metrics

### Backup & Recovery
- Automated daily backups
- 30-day retention policy
- One-click restore functionality
- Database migration tools

### Updates
```bash
# Update to latest version
git pull origin main
docker-compose down
docker-compose up --build -d
```

## 🆘 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check database file permissions
ls -la data/posq.db
# Recreate database
rm data/posq.db
docker-compose restart
```

**Port Already in Use**
```bash
# Check what's using the port
sudo lsof -i :3001
# Kill the process or change port in .env
```

**QR Codes Not Working**
- Verify `FRONTEND_URL` in environment
- Check table configuration in admin
- Ensure QR codes point to correct domain

**Printer Not Working**
- Check printer service logs: `docker-compose logs printer-service`
- Verify printer IP and port
- Test network connectivity to printer

### Logs
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f app
docker-compose logs -f printer-service
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by real restaurant operational needs
- Designed for ease of use and reliability
- Community-driven development

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the API documentation
- Contact the development team

---

**POSQ** - Making restaurant management simple, efficient, and modern. 🍽️✨