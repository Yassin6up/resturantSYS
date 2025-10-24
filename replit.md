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

### ✅ Complete Table-Based Ordering Flow with Cash Payment System

#### Backend Enhancements:
1. **Cashier Payment Endpoints**:
   - `GET /api/orders/code/:code` - Lookup orders by order code (for QR scanning)
   - `PATCH /api/orders/:id/payment` - Confirm payment with automatic kitchen notification
   - Socket.IO events: `order.paid`, `order.updated`, `revenue.updated`

2. **Order Creation Updates**:
   - Generates two QR codes: `paymentQrCode` (for cashier) and `trackingQrCode` (for customer)
   - Payment QR contains order code for cashier scanning
   - Tracking QR links to real-time order status page
   - Automatic kitchen notification only after payment confirmation

3. **Secure Public Order Viewing**:
   - `GET /api/orders/:id` requires either authentication OR high-entropy 8-digit PIN
   - PIN-based authentication prevents order enumeration attacks
   - Customers can securely view their order status by providing PIN
   - Payment details only visible to authenticated admin users

#### Frontend Customer Pages - Complete Redesign:
1. **MenuPage** (`/menu`):
   - Modern gradient hero with luxury design
   - Extracts table number from URL params (`?table=5`)
   - Stores table in CartContext for entire session
   - Responsive grid layout with hover effects
   - Quick add buttons + detailed modal for customization

2. **CartPage** (`/cart`):
   - Luxury two-column layout with sticky sidebar
   - Modern gradient cards with smooth animations
   - Real-time total calculations
   - Mobile-first responsive design

3. **CheckoutPage** (`/checkout`):
   - Table number auto-filled from CartContext (readonly)
   - Modern payment method selector (cash/card)
   - Shows payment QR code modal for cash orders
   - Auto-redirect to order status after card payment
   - Gradient totals breakdown

4. **OrderStatusPage** (`/order-status/:orderId`):
   - Real-time Socket.IO updates for order status
   - Visual progress timeline with icons
   - Shows current status with color coding
   - Auto-updates when cashier confirms payment
   - Order details and items display

#### Cashier Dashboard (`/admin/cashier`):
1. **Features**:
   - Manual order code search (for QR scanning)
   - Live list of pending cash payments
   - One-click payment confirmation
   - Real-time Socket.IO updates
   - Modern gradient design matching customer pages

2. **Payment Flow**:
   - Search order by code (from QR or manual entry)
   - View order details and total
   - Confirm payment → Triggers kitchen notification
   - Order automatically sent to kitchen display
   - Updates today's revenue

#### Table & Branch ID Persistence:
- Table number and branch ID captured from QR code URL (`/menu?table=5&branch=1`)
- Both values stored in CartContext with localStorage
- Persists through: Menu → Cart → Checkout
- No manual table or branch input required from customer
- QR codes automatically generated with both parameters when creating/updating tables

#### Complete Flow:
1. Customer scans table QR → Lands on menu with table ID
2. Browses menu, adds items to cart
3. Proceeds to checkout (table pre-filled)
4. Places cash order → Gets payment QR code + unique 8-digit PIN
5. Shows QR to cashier
6. Cashier scans/searches → Confirms payment
7. System auto-sends order to kitchen
8. Customer redirected to order status page (URL includes secure PIN)
9. Real-time status updates via Socket.IO
10. Customer can refresh/share order status URL securely (PIN required)

### Security Implementation:
**PIN-Based Order Access**:
- Each order generates a unique 8-digit high-entropy PIN
- Public order viewing requires PIN verification to prevent enumeration
- URL format: `/order-status/:orderId?pin=12345678`
- Prevents unauthorized users from guessing/iterating order IDs
- Payment details restricted to authenticated users only

### Files Created/Modified:
**Backend**:
- `server/src/routes/orders.js` - Added cashier endpoints, payment QR generation, PIN-secured order viewing
- `server/src/routes/tables.js` - Updated QR code generation to include both table and branch parameters

**Frontend**:
- `frontend/src/pages/customer/MenuPage.jsx` - Complete redesign with modern UI, extracts both table & branch from URL
- `frontend/src/pages/customer/CartPage.jsx` - Luxury redesign with sidebar
- `frontend/src/pages/customer/CheckoutPage.jsx` - Payment QR modal, readonly table, uses branch from cart
- `frontend/src/pages/customer/OrderStatusPage.jsx` - Real-time tracking with Socket.IO
- `frontend/src/pages/admin/CashierDashboard.jsx` - NEW: Cashier payment management
- `frontend/src/services/api.js` - Added `getOrderByCode()` and `updatePayment()` methods
- `frontend/src/App.jsx` - Added `/admin/cashier` route
- `frontend/src/contexts/CartContext.jsx` - Already supports both table & branch persistence in localStorage