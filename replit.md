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
- **Username**: `admin`
- **Password**: `admin123`

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

## Recent Changes (Replit Setup)
- Configured Vite to run on port 5000 with allowed hosts for Replit proxy
- Updated CORS to allow all origins in development
- Set up proper workflows for both frontend and backend
- Configured deployment for VM target
- Created comprehensive .gitignore for Node.js project
