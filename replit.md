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
- **Multi-Tenant Restaurant Management**: Full implementation
  - Database schema enhancements: branches (restaurants) with owner_id, users with branch_id
  - Owner role support with complete authentication and authorization
  - Backend API routes (`/api/restaurants`) with full CRUD operations
  - Security: Role-based access control (owner-only for create/delete, owner/admin for update)
  - Owner Dashboard with restaurant portfolio overview and statistics
  - OwnerLayout component with professional UI
  - Role-based login redirects (owner → /owner, others → /admin)
  - Multi-restaurant seed data with 2 demo restaurants
  - Security audit passed: All routes properly protected from unauthorized access

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
