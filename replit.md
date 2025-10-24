# POSQ Restaurant POS System - Replit Configuration

## Project Overview
A comprehensive restaurant Point of Sale (POS) and QR ordering system with luxury design and full functionality.

## Technology Stack
- **Frontend**: React + Vite (Port 5000)
- **Backend**: Node.js + Express (Port 3001)
- **Database**: SQLite (development) with support for MySQL/PostgreSQL
- **Real-time**: Socket.IO for live updates
- **Styling**: TailwindCSS with custom luxury components

## Setup on Replit

### Environment Configuration
- Frontend runs on port 5000 (configured in `frontend/vite.config.js`)
- Backend runs on port 3001 (configured in `server/.env`)
- Vite configured to allow all hosts for Replit proxy compatibility
- CORS configured to allow all origins in development mode

### Database
- SQLite database located at `server/data/posq.db`
- Migrations run automatically on server start
- Seeded with demo data including admin user and sample menu

### Default Credentials

**Restaurant Admin:**
- **Username**: `admin`
- **Password**: `admin123`
- **Access**: Single restaurant management

**Restaurant Owner (Multi-tenant):**
- **Username**: `owner`
- **Password**: `owner123`
- **Access**: Multiple restaurant portfolio management

## Development Workflow

### Workflows
1. **Frontend** - Runs the React development server on port 5000
2. **Backend** - Runs the Node.js API server on port 3001

Both workflows start automatically and are configured in the Replit workspace.

### Key Files
- `frontend/vite.config.js` - Frontend build configuration
- `server/index.js` - Backend server entry point
- `server/.env` - Backend environment variables
- `frontend/.env` - Frontend environment variables

## Deployment Configuration
- **Type**: VM (maintains state and supports real-time features)
- **Build**: Builds the React frontend for production
- **Run**: Starts the backend server

## Features
- Customer QR code ordering
- Admin dashboard with full management
- Real-time order tracking with Socket.IO
- Inventory management
- Professional reports with Excel export
- Mobile-first PWA design
- Role-based access control

## Architecture Notes
- Frontend communicates with backend via REST API and Socket.IO
- Database migrations managed by Knex.js
- JWT authentication with role-based permissions
- File uploads handled via Multer

## Recent Changes

### Latest (October 24, 2025)

- **Admin Features & Table Management Improvements**: ✅
  - **Restaurant Admin Employee Creation**: Option to create admin employee during restaurant setup
    - Checkbox in restaurant creation form to create admin user
    - Validates username, password (min 6 characters), email, phone
    - Backend hashes password with bcrypt and links user to new restaurant
    - Implemented in `frontend/src/pages/owner/RestaurantForm.jsx` and `server/src/routes/restaurants.js`
  
  - **Menu Item Image Uploads**: Complete implementation with multer
    - POST/PUT endpoints handle file uploads with 5MB limit
    - Strict file type validation (jpeg, png, webp only)
    - Images saved to `server/uploads` folder, path stored in database
    - Old images automatically deleted on update
    - Implemented in `server/src/routes/menu.js`
  
  - **Category Management**: Fixed schema and creation flow
    - Added `description` (TEXT) and `is_active` (INTEGER) columns to categories table
    - Created `applyCategorySchema` function in database init for automatic migration
    - Category creation now works without 500 errors
    - Implemented in `server/src/database/init.js`
  
  - **Table Management Enhancements**: Complete overhaul with all features working
    - **Dynamic Status**: Tables show "Free" or "Busy" based on active orders
      - Status determined by checking for PENDING, CONFIRMED, PREPARING, READY, or SERVED orders
      - Uses activeOrder field from backend to display current order info
    - **Fixed Field Mappings**: Corrected all `tableNumber` → `table_number` field references
    - **Full Data Reload**: After create/edit, fetches complete table list to preserve activeOrder metadata
    - **Edit Functionality**: Opens modal with pre-populated data, updates correctly
    - **Delete Functionality**: Removes tables with confirmation dialog
    - **QR Code Printing**: Opens styled print window with browser window.print()
      - Formatted layout with restaurant name, table number, and scannable QR code
    - Implemented across `frontend/src/pages/admin/TableManagementPage.jsx` and `frontend/src/components/TableForm.jsx`

- **Bug Fixes & Database Enhancements**: ✅
  - Fixed analytics endpoint inventory query (changed `current_stock` to `quantity`, `min_stock` to `min_threshold`)
  - Fixed WebSocket connection issue (updated frontend .env to use correct API URL instead of localhost)
  - Added `website` and `description` columns to branches table
  - Frontend inventory display now uses correct column names
  - Created comprehensive restaurant seed with 3 additional demo restaurants

- **Enhanced Restaurant Seed Data**: ✅
  - **Marrakech Medina (MRK)**: Traditional Moroccan cuisine with sample menu, staff, and inventory
  - **Tangier Seaside (TNG)**: Mediterranean fusion restaurant
  - **Fes Heritage (FES)**: Authentic Fassi cuisine
  - Each restaurant includes: admin user, manager, 10 tables, categories, menu items, and stock items
  - All restaurants owned by the main owner account for testing multi-restaurant management

### Previous Updates
- **Owner Dashboard - Complete Multi-Restaurant Management**: PRODUCTION-READY ✅
  - **Restaurant Creation/Edit Form** (`frontend/src/pages/owner/RestaurantForm.jsx`):
    - Full CRUD form for restaurant management
    - All fields: name, code, address, phone, email, website, description
    - Settings: currency, tax rate, service charge, timezone, language
    - Active/inactive status toggle
    - Comprehensive validation and error handling
    - Pre-populates data in edit mode
  - **Restaurant Details Page** (`frontend/src/pages/owner/RestaurantDetails.jsx`):
    - Detailed analytics dashboard with 4 key metrics (revenue, orders, menu items, employees)
    - Tabbed interface: Overview, Top Products, Employees, Inventory
    - Recent orders display with status indicators
    - Top selling products ranking with sales data
    - Complete employee list with roles and status
    - Inventory status with low stock alerts
    - Quick edit navigation
  - **Activity Logs Page** (`frontend/src/pages/owner/ActivityLogs.jsx`):
    - Centralized activity logs across all owned restaurants
    - Search functionality (actions, users, branches)
    - Filter by action type (LOGIN, CREATE, UPDATE, DELETE, RESTAURANT)
    - Date-based filtering
    - Color-coded action badges
    - Metadata display for each log entry
  - **Backend API Enhancements** (`server/src/routes/restaurants.js`):
    - GET /api/restaurants/:id/analytics - Comprehensive analytics endpoint
    - GET /api/restaurants/logs - Activity logs for owner's restaurants
    - Proper route ordering (specific routes before parameterized routes)
    - API response shape alignment with frontend expectations
    - Full field support: website, description, isActive handling
    - Owner-only access with strict authorization checks
  - **Routing & Navigation**:
    - /owner/restaurants/new - Create new restaurant
    - /owner/restaurants/:id - View restaurant details
    - /owner/restaurants/:id/edit - Edit restaurant
    - /owner/logs - View all activity logs
  - **Architect-Verified**: All features tested and approved for production

- **Multi-Tenant Security Hardening**: PRODUCTION-READY ✅
  - **Comprehensive Data Isolation** across all admin/manager/staff endpoints
  - **Menu API**: All routes use `req.user.branch_id` for filtering and verify ownership before mutations
  - **Tables API**: Complete security overhaul - all CRUD operations enforce branch isolation, QR generation secured
  - **Orders API**: Filtered by authenticated user's branch only
  - **Inventory API**: Full ownership verification on all stock operations, movements, and alerts
  - **Security Measures**:
    - Zero tolerance for client-supplied `branchId` in admin/manager/staff endpoints
    - All queries filter by `req.user.branch_id` automatically
    - All mutations verify resource ownership before execution
    - 403/404 responses for cross-branch access attempts
    - Removed all duplicate insecure route handlers
  - **Architect-Verified**: Multi-tenant isolation tested and approved for production

- **Multi-Tenant Foundation**: Database schema and authentication
  - Database schema enhancements: branches (restaurants) with owner_id, users with branch_id
  - Owner role support with complete authentication and authorization
  - Role-based login redirects (owner → /owner, others → /admin)
  - Multi-restaurant seed data with 2 demo restaurants

- **Employee Management System**: Full CRUD implementation
  - Backend API routes (`/api/employees`) with role-based access control
  - Create, update, deactivate, and reactivate employees
  - Comprehensive employee data: roles, salaries, contact info, hire dates, PINs
  - Frontend Employee Management page with data tables, search, filters, and modal forms
  - Audit logging for all employee actions
  - Security: bcrypt password hashing, admin/manager-only access

- **Enhanced Reports Page**: Comprehensive analytics and data tables
  - Top Selling Items with ranked table view
  - Table Turnover analysis with detailed statistics
  - Daily sales, sales range, inventory usage reports
  - Payment methods and cash reconciliation
  - Excel export functionality for all reports
  - Real-time data fetching from backend APIs

- **Authentication System**: Production-ready token refresh
  - Automatic token refresh with deadlock prevention
  - Seamless session management without forced logouts
  - Request queue handling for expired tokens
  - Security fixes reviewed and approved

- **Backup & Restore System**: Complete implementation
  - Backend API routes (`/api/backup`) with admin authentication
  - Security: Path traversal protection, filename validation, audit logging
  - Frontend UI in Settings page with create/restore/delete functionality
  - Supports SQLite, MySQL, and PostgreSQL backups

- **QR Code System**: Verified table QR codes use user-friendly table numbers
- **Customer Ordering**: Full implementation with menu, cart, checkout, order tracking

### Replit Setup
- Configured Vite to run on port 5000 with allowed hosts for Replit proxy
- Updated CORS to allow all origins in development
- Set up proper workflows for both frontend and backend
- Configured deployment for VM target
- Created comprehensive .gitignore for Node.js project
