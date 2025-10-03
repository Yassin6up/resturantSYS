# POSQ - Restaurant POS & QR Ordering System

A comprehensive restaurant Point of Sale (POS) system with QR code ordering capabilities, built for both local and cloud deployment.

## 🚀 Features

### Customer Experience (PWA)
- **QR Code Ordering**: Customers scan table QR codes to access the menu
- **Mobile-First Design**: Progressive Web App (PWA) for seamless mobile experience
- **Real-time Order Tracking**: Live order status updates
- **Multiple Payment Options**: Pay at cashier or online
- **Order History**: Track previous orders

### Admin Dashboard
- **Live Order Management**: Real-time order queue and status updates
- **Menu Management**: Full CRUD operations for categories, items, and modifiers
- **Table Management**: Generate and manage table QR codes
- **Kitchen Display**: Real-time kitchen order display
- **Inventory Management**: Stock tracking and low-stock alerts
- **Payment Processing**: Cash and card payment handling
- **Reports & Analytics**: Sales reports, top items, table turnover
- **User Management**: Role-based access control (Admin, Manager, Cashier, Kitchen)

### Technical Features
- **Dual Operating Modes**: LOCAL (SQLite) and CLOUD (MySQL/PostgreSQL)
- **Real-time Communication**: Socket.IO for live updates
- **Thermal Printing**: ESC/POS compatible receipt printing
- **Offline Support**: Works without internet connection in LOCAL mode
- **Data Sync**: Optional cloud synchronization
- **Security**: JWT authentication, role-based authorization
- **Docker Support**: Containerized deployment

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **SQLite** (local) / **MySQL/PostgreSQL** (cloud)
- **Socket.IO** for real-time communication
- **JWT** for authentication
- **Knex.js** for database migrations
- **Winston** for logging

### Frontend
- **React 18** with Vite
- **Tailwind CSS** for styling
- **React Router** for navigation
- **React Query** for data fetching
- **Socket.IO Client** for real-time updates
- **PWA** support

### Infrastructure
- **Docker** & Docker Compose
- **Nginx** reverse proxy
- **Redis** for caching
- **Printer Service** for thermal printing

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for development)
- Git

### 1. Clone the Repository
```bash
git clone <repository-url>
cd posq-restaurant-pos
```

### 2. Environment Setup
```bash
# Copy environment file
cp .env.example .env

# Edit configuration (optional)
nano .env
```

### 3. Start with Docker (Recommended)
```bash
# Start all services
docker-compose up --build

# Or run in background
docker-compose up --build -d
```

### 4. Access the Application
- **Customer PWA**: http://localhost:5173
- **Admin Dashboard**: http://localhost:5173/admin/login
- **API Server**: http://localhost:3000
- **Printer Service**: http://localhost:4000

### 5. Demo Credentials
- **Admin**: `admin` / `admin123`
- **Cashier**: `cashier1` / `cashier123` (PIN: `5678`)
- **Kitchen**: `kitchen1` / `kitchen123` (PIN: `9999`)

## 📱 Customer Usage

### 1. Scan QR Code
- Each table has a QR code
- Customers scan with their phone camera
- Automatically opens the menu for that table

### 2. Browse & Order
- Browse menu categories and items
- Add items to cart with customizations
- Add special instructions
- Review order and proceed to checkout

### 3. Checkout
- Enter customer name
- Choose payment method (Cash or Card)
- Receive order confirmation with QR code

### 4. Track Order
- Use order QR code to track status
- Real-time updates on order progress
- Payment confirmation

## 👨‍💼 Admin Usage

### 1. Login
- Access admin dashboard at `/admin/login`
- Use username/password or PIN for quick access
- Role-based permissions

### 2. Dashboard
- Live order queue
- Real-time status updates
- Quick actions (confirm, cancel, print)

### 3. Menu Management
- Create/edit categories
- Add menu items with prices and descriptions
- Set availability and modifiers
- Upload item images

### 4. Table Management
- Add/edit tables
- Generate QR codes
- Print QR code sheets

### 5. Kitchen Display
- Real-time order display
- Order acknowledgment
- Status updates

### 6. Reports
- Daily sales reports
- Top selling items
- Table turnover analysis
- Inventory usage
- Export to CSV/PDF

## ⚙️ Configuration

### Operating Modes

#### LOCAL Mode (Default)
- Uses SQLite database
- Runs entirely on local network
- No internet required
- Perfect for single-location restaurants

#### CLOUD Mode
- Uses MySQL/PostgreSQL
- Requires internet connection
- Supports multiple branches
- Data synchronization

### Environment Variables

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database (LOCAL)
DB_TYPE=sqlite
DB_PATH=./data/posq.db

# Database (CLOUD)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=posq
DB_USER=posq
DB_PASSWORD=posqpassword

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Payment Gateway (Stripe)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Operating Mode
OPERATING_MODE=LOCAL
```

## 🖨️ Printer Setup

### Network Printers
1. Configure printer IP in settings
2. Ensure printer supports ESC/POS
3. Test connection from printer service

### USB Printers
1. Connect printer via USB
2. Install printer drivers
3. Configure in printer service

### Print Templates
- Order receipts
- Kitchen tickets
- Bar tickets
- Test prints

## 📊 Database Schema

### Core Tables
- `users` - System users and roles
- `branches` - Restaurant branches
- `tables` - Restaurant tables with QR codes
- `categories` - Menu categories
- `menu_items` - Menu items with prices
- `modifiers` - Item customizations
- `orders` - Customer orders
- `order_items` - Order line items
- `payments` - Payment records
- `stock_items` - Inventory items
- `recipes` - Menu item recipes
- `settings` - System configuration

## 🔧 Development

### Local Development Setup
```bash
# Install dependencies
npm install

# Start backend
cd server
npm run dev

# Start frontend
cd frontend
npm run dev

# Start printer service
cd printer-service
npm run dev
```

### Database Migrations
```bash
# Run migrations
npm run migrate

# Seed database
npm run seed

# Reset database
npm run db:reset
```

### Testing
```bash
# Run tests
npm test

# Run specific test suites
npm run test:server
npm run test:client
```

## 🚀 Deployment

### Docker Deployment
```bash
# Production build
docker-compose -f docker-compose.prod.yml up --build -d

# Scale services
docker-compose up --scale api=3 --scale frontend=2
```

### Cloud Deployment
1. Set up cloud database (MySQL/PostgreSQL)
2. Configure environment variables
3. Deploy with Docker or directly
4. Set up SSL certificates
5. Configure domain and DNS

### Backup & Recovery
```bash
# Backup SQLite database
cp data/posq.db backups/posq-$(date +%Y%m%d).db

# Backup MySQL database
mysqldump -u posq -p posq > backups/posq-$(date +%Y%m%d).sql

# Restore from backup
cp backups/posq-20240101.db data/posq.db
```

## 🔒 Security

### Authentication
- JWT tokens with refresh mechanism
- Password hashing with bcrypt
- PIN-based quick login for cashiers
- Role-based access control

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting

### Network Security
- HTTPS in production
- CORS configuration
- Secure headers
- Firewall configuration

## 📈 Monitoring & Logging

### Logging
- Winston logger with multiple transports
- Structured logging with metadata
- Log rotation and retention
- Error tracking and alerting

### Health Checks
- API health endpoint
- Database connectivity
- Printer service status
- Real-time connection monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Common Issues

#### Database Connection Issues
- Check database credentials
- Ensure database server is running
- Verify network connectivity

#### Printer Not Working
- Check printer IP address
- Verify ESC/POS compatibility
- Test printer service connection

#### Real-time Updates Not Working
- Check Socket.IO connection
- Verify firewall settings
- Check browser console for errors

### Getting Help
- Check the documentation
- Search existing issues
- Create a new issue with details
- Contact support team

## 🗺️ Roadmap

### Upcoming Features
- [ ] Multi-language support
- [ ] Advanced reporting dashboard
- [ ] Customer loyalty program
- [ ] Integration with accounting software
- [ ] Mobile app for staff
- [ ] Advanced inventory management
- [ ] Supplier management
- [ ] Employee scheduling

### Performance Improvements
- [ ] Database query optimization
- [ ] Caching implementation
- [ ] Image optimization
- [ ] Bundle size reduction

---

**POSQ Restaurant POS** - Streamlining restaurant operations with modern technology.