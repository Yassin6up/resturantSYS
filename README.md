# 🍽️ POSQ Restaurant System

A comprehensive, modern restaurant Point of Sale (POS) and QR ordering system with luxury design and full functionality.

## ✨ Features

### 🎨 **Luxury Design**
- **Modern Dark Theme**: Elegant black/gold color scheme with glass morphism effects
- **Responsive Design**: Perfect mobile-first experience with luxury aesthetics
- **Smooth Animations**: Professional hover effects and transitions
- **Glass Morphism**: Beautiful backdrop blur effects throughout the interface

### 📱 **Customer Experience**
- **QR Code Ordering**: Scan table QR codes to access the menu
- **Mobile-First PWA**: Progressive Web App for seamless mobile experience
- **Real-time Cart**: Persistent cart with beautiful bottom bar on mobile
- **Payment Flow**: Complete checkout with QR codes and PIN system
- **Order Tracking**: Real-time order status updates

### 🏪 **Admin Dashboard**
- **Complete Management**: Menu, tables, orders, inventory, reports
- **Role-Based Access**: Admin, manager, cashier, kitchen, waiter roles
- **Real-time Updates**: Live order management and kitchen display
- **Professional Reports**: Excel export with comprehensive analytics

### 🗄️ **Database Flexibility**
- **Dual Mode Support**: Switch between LOCAL (SQLite) and CLOUD (MySQL/PostgreSQL)
- **Easy Migration**: Seamless switching between database modes
- **Production Ready**: Optimized for both local and cloud deployment

## 🚀 Quick Start

### Option 1: SQLite (Local Development)
```bash
# Clone and setup
git clone <repository-url>
cd posq-restaurant-system

# Install dependencies
cd server && npm install
cd ../frontend && npm install

# Run migrations and seeds
cd ../server
npx knex migrate:latest
npx knex seed:run

# Start the system
npm start  # Backend on port 3001
cd ../frontend && npm run dev  # Frontend on port 5173
```

### Option 2: MySQL (Production Ready)
```bash
# Run the automated setup script
./setup-mysql.sh

# Or manual setup:
# 1. Install MySQL
# 2. Create database: CREATE DATABASE posq;
# 3. Update server/.env with MySQL credentials
# 4. Run: cd server && npx knex migrate:latest && npx knex seed:run
```

## 🔧 Configuration

### Environment Variables
Create `server/.env`:
```env
# Database Configuration
DB_TYPE=mysql2  # or sqlite3
DB_HOST=localhost
DB_PORT=3306
DB_USER=posq
DB_PASSWORD=posqpassword
DB_NAME=posq

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Database Switching
The system supports runtime switching between database modes:
1. Go to **Settings** → **Database** tab
2. Choose **LOCAL** (SQLite) or **CLOUD** (MySQL/PostgreSQL)
3. Configure connection details
4. Test connection and apply changes

## 📱 Mobile Experience

### Customer Features
- **QR Code Scanning**: Each table has a unique QR code
- **Mobile Menu**: Touch-friendly interface with luxury design
- **Cart Management**: Beautiful bottom bar with total and checkout
- **Payment Flow**: Complete mobile payment experience
- **Order Tracking**: Real-time status updates

### Staff Features
- **Mobile Admin**: Full admin functionality on mobile devices
- **Kitchen Display**: Real-time order management
- **Table Management**: QR code generation and printing
- **Reports**: Mobile-friendly analytics dashboard

## 🎨 Design System

### Color Palette
- **Primary**: Dark navy (#1a1a2e) with luxury gradients
- **Secondary**: Deep blue (#16213e) for depth
- **Accent**: Elegant red (#e94560) for highlights
- **Gold**: Luxury gold (#ffd700) for premium elements
- **Silver**: Sophisticated silver (#c0c0c0) for details

### Typography
- **Font**: Inter (Google Fonts) for modern readability
- **Hierarchy**: Clear heading structure with luxury styling
- **Responsive**: Scales perfectly across all devices

### Components
- **Buttons**: Gradient backgrounds with hover animations
- **Cards**: Glass morphism with backdrop blur
- **Forms**: Elegant inputs with luxury styling
- **Modals**: Beautiful overlays with smooth transitions

## 🏗️ Architecture

### Backend (Node.js + Express)
- **RESTful API**: Clean, well-documented endpoints
- **Authentication**: JWT with role-based access control
- **Real-time**: Socket.IO for live updates
- **Database**: Knex.js with migration support
- **Security**: Comprehensive validation and sanitization

### Frontend (React + Vite)
- **Modern React**: Hooks, Context API, and best practices
- **State Management**: React Query for server state
- **Styling**: TailwindCSS with custom luxury components
- **PWA**: Progressive Web App capabilities
- **Responsive**: Mobile-first design approach

### Database Schema
- **Users**: Role-based authentication system
- **Branches**: Multi-location support
- **Tables**: QR code management
- **Menu**: Categories, items, modifiers
- **Orders**: Complete order lifecycle
- **Inventory**: Stock management and recipes
- **Reports**: Comprehensive analytics

## 📊 Reports & Analytics

### Available Reports
- **Sales Reports**: Daily, weekly, monthly sales analysis
- **Top Items**: Best-selling menu items
- **Table Turnover**: Table utilization metrics
- **Payment Methods**: Payment analytics
- **Inventory Usage**: Stock consumption reports
- **Cash Reconciliation**: Cash management

### Export Features
- **Excel Export**: Professional Excel files with formatting
- **Date Ranges**: Custom date range selection
- **Real-time Data**: Live data from database
- **Multiple Formats**: Various export options

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Granular permission system
- **Input Validation**: Comprehensive data validation
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Input sanitization
- **CSRF Protection**: Cross-site request forgery prevention
- **Rate Limiting**: API rate limiting
- **Audit Logging**: Complete activity tracking

## 🚀 Deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment
1. **Backend**: Deploy Node.js app with PM2
2. **Frontend**: Build and serve with Nginx
3. **Database**: Setup MySQL/PostgreSQL
4. **SSL**: Configure HTTPS with Let's Encrypt
5. **Monitoring**: Setup logging and monitoring

### Production Checklist
- [ ] Update JWT secrets
- [ ] Configure production database
- [ ] Setup SSL certificates
- [ ] Configure domain and DNS
- [ ] Setup backup strategy
- [ ] Configure monitoring
- [ ] Test all functionality
- [ ] Setup user accounts

## 🎯 Default Credentials

### Admin Access
- **Username**: `admin`
- **Password**: `admin123`

### Test Data
The system comes with sample data:
- **Restaurant**: POSQ Restaurant
- **Tables**: 10 sample tables with QR codes
- **Menu**: Complete menu with categories and items
- **Users**: Various role-based users

## 📞 Support

### Common Issues
1. **Database Connection**: Check environment variables
2. **QR Codes**: Ensure proper URL configuration
3. **Mobile Issues**: Clear browser cache
4. **Performance**: Check database indexes

### Troubleshooting
- Check server logs in `server/logs/`
- Verify database migrations
- Test API endpoints
- Check browser console for errors

## 🎉 Features Completed

✅ **Complete Settings Page** - Full control over colors, restaurant name, database credentials  
✅ **Fixed Cart Issues** - Persistent cart with mobile-friendly interface  
✅ **Dynamic Category Management** - Full CRUD operations with database integration  
✅ **Table Management** - QR generation, printing, and busy/free status  
✅ **Kitchen Display** - Real-time orders for chefs  
✅ **Inventory Management** - Stock management and recipe CRUD  
✅ **Professional Reports** - Excel import/export with dynamic data  
✅ **Luxury Design** - Modern dark theme with gold accents  
✅ **Mobile Experience** - Perfect mobile-first design  
✅ **Database Flexibility** - SQLite/MySQL/PostgreSQL support  

## 🏆 Production Ready

The POSQ Restaurant System is now a **complete, professional, production-ready** restaurant management system with:

- 🎨 **Luxury Design** with modern aesthetics
- 📱 **Perfect Mobile Experience** 
- 🗄️ **Flexible Database Support**
- 🔒 **Enterprise Security**
- 📊 **Professional Analytics**
- 🚀 **Easy Deployment**

Ready for immediate use in any restaurant environment! 🍽️✨