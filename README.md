# POSQ - Restaurant POS + QR Ordering System

A comprehensive web application for restaurant management featuring QR-driven customer ordering and a full admin dashboard. Built with Node.js, React, and SQLite/MySQL support.

## 🚀 Features

### Customer Experience (PWA)
- **QR Code Ordering**: Customers scan table QR codes to access the menu
- **Mobile-First Design**: Responsive PWA optimized for mobile devices
- **Real-time Updates**: Live order status updates
- **Multiple Payment Options**: Cash and card payment support
- **Order Tracking**: QR code-based order tracking

### Admin Dashboard
- **Live Order Management**: Real-time order queue and status updates
- **Menu Management**: Full CRUD operations for categories and menu items
- **Table Management**: Generate and manage table QR codes
- **Inventory Tracking**: Stock management with low-stock alerts
- **Kitchen Display**: Dedicated kitchen interface for order preparation
- **User Management**: Role-based access control (Admin, Manager, Cashier, Kitchen, Waiter)
- **Reports & Analytics**: Sales reports, top items, and business insights
- **Settings Management**: Operating mode toggle (LOCAL/CLOUD)

### Technical Features
- **Dual Database Support**: SQLite for local operation, MySQL/PostgreSQL for cloud
- **Real-time Communication**: Socket.IO for live updates
- **Thermal Printer Integration**: ESC/POS printer support
- **Sync Capabilities**: Data synchronization between local and cloud modes
- **Security**: JWT authentication, role-based authorization, input validation
- **Backup System**: Automated database backups
- **Docker Support**: Containerized deployment

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **SQLite** (local) / **MySQL/PostgreSQL** (cloud)
- **Socket.IO** for real-time communication
- **JWT** for authentication
- **Knex.js** for database migrations and queries
- **Stripe** for payment processing
- **ESC/POS** for thermal printer support

### Frontend
- **React 18** with Vite
- **TailwindCSS** for styling
- **React Router** for navigation
- **React Query** for data fetching
- **Socket.IO Client** for real-time updates
- **PWA** support with service workers

### DevOps
- **Docker** and Docker Compose
- **Nginx** for reverse proxy
- **Redis** for caching and sessions

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- Docker and Docker Compose (recommended)
- Git

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd posq-restaurant-pos
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the application**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Admin Dashboard: http://localhost:5173/admin/login

### Manual Installation

1. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install server dependencies
   cd server && npm install
   
   # Install frontend dependencies
   cd ../frontend && npm install
   ```

2. **Set up the database**
   ```bash
   cd server
   npm run migrate
   npm run seed
   ```

3. **Start the development servers**
   ```bash
   # From root directory
   npm run dev
   ```

## 🔧 Configuration

### Environment Variables

Key environment variables in `.env`:

```env
# Database Configuration
DB_TYPE=sqlite                    # sqlite, mysql, postgresql
DB_PATH=./data/posq.db           # SQLite file path
DB_HOST=localhost                # Database host
DB_PORT=3306                     # Database port
DB_NAME=posq                     # Database name
DB_USER=posq                     # Database user
DB_PASSWORD=posqpassword         # Database password

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production

# Payment Gateway (Stripe)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Printer Configuration
PRINTER_SERVICE_URL=http://localhost:4000
DEFAULT_PRINTER_IP=192.168.1.100
```

### Operating Modes

#### LOCAL Mode
- Uses SQLite database
- Offline-first operation
- Suitable for single-location restaurants
- No internet connection required

#### CLOUD Mode
- Uses MySQL/PostgreSQL database
- Online synchronization
- Multi-branch support
- Requires internet connection

## 📱 Usage

### For Customers

1. **Scan QR Code**: Use your phone's camera to scan the table QR code
2. **Browse Menu**: View categories and menu items
3. **Add to Cart**: Select items, add modifiers, and special notes
4. **Checkout**: Choose payment method (cash or card)
5. **Track Order**: Use the order QR code to track your order status

### For Staff

#### Admin/Manager
- Access admin dashboard at `/admin/login`
- Manage menu items, categories, and tables
- View reports and analytics
- Configure system settings
- Manage user accounts

#### Cashier
- Quick PIN login for fast access
- Process orders and payments
- Handle cash transactions
- Print receipts

#### Kitchen Staff
- Access kitchen display interface
- View incoming orders
- Update order status
- Print kitchen tickets

## 🔐 Default Credentials

```
Admin: admin@posq.com / admin123
Manager: manager@posq.com / admin123
Cashier: cashier1@posq.com / cashier123 (PIN: 2222)
Kitchen: kitchen@posq.com / cashier123 (PIN: 3333)
```

## 🖨️ Printer Setup

### Thermal Printer Configuration

1. **Network Printers**: Configure IP address and port
2. **USB Printers**: Connect via USB and configure drivers
3. **Test Printing**: Use the test print function in admin settings

### Supported Printers
- ESC/POS compatible thermal printers
- Network printers (TCP/IP)
- USB printers (with proper drivers)

## 📊 Database Schema

The system includes comprehensive database tables:

- **Users**: User accounts and roles
- **Branches**: Restaurant locations
- **Tables**: Dining tables with QR codes
- **Categories**: Menu categories
- **Menu Items**: Food and beverage items
- **Modifiers**: Item customization options
- **Orders**: Customer orders
- **Order Items**: Individual order line items
- **Payments**: Payment transactions
- **Stock Items**: Inventory items
- **Recipes**: Menu item recipes
- **Settings**: System configuration

## 🚀 Deployment

### Local Deployment
Perfect for single-location restaurants:

```bash
docker-compose up -d
```

### Cloud Deployment
For multi-branch operations:

1. **Set up cloud database** (MySQL/PostgreSQL)
2. **Configure environment variables**
3. **Deploy with Docker** or traditional hosting
4. **Set up SSL certificates**
5. **Configure domain and DNS**

### Production Considerations

- Use HTTPS in production
- Set up proper SSL certificates
- Configure firewall rules
- Set up monitoring and logging
- Regular database backups
- Update security keys

## 🧪 Testing

### Run Tests
```bash
# Server tests
cd server && npm test

# Frontend tests
cd frontend && npm test

# E2E tests
npm run test:e2e
```

### Test Coverage
- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for user workflows

## 📈 Monitoring

### Health Checks
- API health endpoint: `/health`
- Database connection monitoring
- Real-time system status

### Logging
- Structured logging with Winston
- Error tracking and monitoring
- Audit logs for financial operations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the troubleshooting guide

## 🔄 Updates

### Version 1.0.0
- Initial release
- Core POS functionality
- QR ordering system
- Admin dashboard
- Multi-mode support (LOCAL/CLOUD)
- Printer integration
- Payment processing

---

**POSQ Restaurant POS System** - Streamlining restaurant operations with modern technology.