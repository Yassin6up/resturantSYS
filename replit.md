# POSQ Restaurant POS System

## Overview
POSQ is a comprehensive restaurant Point of Sale (POS) and QR ordering system designed for modern eateries. It offers a luxury design, full functionality including customer QR code ordering, an admin dashboard, real-time order tracking, inventory management, and professional reporting. The system aims to provide a robust, multi-tenant solution for single or multiple restaurant management, enhancing operational efficiency and customer experience.

## User Preferences
I prefer simple language and iterative development. Ask before making major changes. I want detailed explanations but do not make changes to folder Z or file Y.

## System Architecture
The system employs a client-server architecture with a React + Vite frontend and a Node.js + Express backend. SQLite is used for development, with support for MySQL/PostgreSQL in production. Real-time features are powered by Socket.IO, and the UI is styled with TailwindCSS, incorporating custom luxury components.

**UI/UX Decisions:**
- PWA (Progressive Web App) design with a mobile-first approach.
- Luxury design aesthetic using TailwindCSS for custom theming.
- QR code generation for customer ordering and table identification.
- Admin dashboard with intuitive layouts for management tasks.
- Tabbed interfaces and data tables for detailed views (e.g., Restaurant Details, Activity Logs).

**Technical Implementations:**
- **Authentication:** JWT-based authentication with role-based access control (Admin, Owner, Manager, Staff) and automatic token refresh.
- **Database:** Knex.js for schema migrations and query building. Supports multi-tenancy with `branch_id` for data isolation.
- **Real-time:** Socket.IO for live updates on orders, kitchen display, and other critical events.
- **File Uploads:** Multer handles image uploads, storing paths (full URLs) in the database and files in a designated directory.
- **Inventory Management:** Automatic stock deduction based on recipes when orders are completed, with stock movement logging.
- **Reporting:** Comprehensive analytics, including sales, inventory usage, top-selling items, and table turnover, with Excel export capabilities.
- **Multi-tenancy:** Strict data isolation enforced across all API endpoints using `req.user.branch_id` to prevent cross-branch access.

**Feature Specifications:**
- **Customer QR Ordering:** Customers can scan QR codes to access menus, place orders, and track status.
- **Admin Dashboard:** Full management capabilities for menus, orders, tables, employees, inventory, and reports.
- **Multi-Restaurant Management:** Owners can manage multiple restaurant branches, view aggregated analytics, and activity logs.
- **Employee Management:** CRUD operations for employees with role assignments, PINs, and audit logging.
- **Backup & Restore:** System for creating, restoring, and deleting database backups.

## External Dependencies
- **Frontend:**
    - React
    - Vite
    - TailwindCSS
    - Socket.IO Client
- **Backend:**
    - Node.js
    - Express.js
    - Socket.IO
    - SQLite (development database)
    - Knex.js (database migrations and query builder)
    - bcrypt (password hashing)
    - Multer (file uploads)
    - JWT (JSON Web Tokens for authentication)

## Recent Changes (October 24, 2025)

### API Endpoint for Image Serving ✅
- **New Endpoint**: `GET /api/upload/image/:filename` serves images with proper headers
- **Security**: Path validation prevents directory traversal attacks
- **Performance**: 1-year cache headers for optimal loading
- **Auto Content-Type**: Detects and sets correct MIME types (jpeg, png, gif, webp)
- **URL Format**: `https://domain.com/api/upload/image/menu-item-123456.png`

### Cart System Bug Fixed ✅
- **Problem**: Cart items missing name, image, and price properties causing empty cart display
- **Solution**: Modified CartContext `addItem()` to extract and store essential item properties
- **Cart Item Structure**:
  ```js
  {
    menuItemId, name, image, price,  // Essential properties now stored
    quantity, unitPrice, total, modifiers, note, branchId, tableNumber
  }
  ```
- **Result**: Cart now displays correctly with images, names, and prices
- **localStorage**: Cart persists properly across page refreshes

### Files Modified
- `server/src/routes/upload.js` - Added image serving API endpoint
- `frontend/src/contexts/CartContext.jsx` - Fixed addItem to store item properties
- `frontend/src/components/CartBottomBar.jsx` - Uses direct image URLs
- `frontend/src/pages/customer/MenuPage.jsx` - Uses direct image URLs