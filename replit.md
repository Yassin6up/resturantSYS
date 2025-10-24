# POSQ Restaurant POS System

## Overview
POSQ is a comprehensive restaurant Point of Sale (POS) and QR ordering system designed for modern eateries. It offers a luxury design, full functionality including customer QR code ordering, an admin dashboard, real-time order tracking, inventory management, and professional reporting. The system aims to provide a robust, multi-tenant solution for single or multiple restaurant management, enhancing operational efficiency and customer experience with features like dynamic database management, customizable menu templates, and a complete table-based ordering flow with cash payment.

## User Preferences
I prefer simple language and iterative development. Ask before making major changes. I want detailed explanations but do not make changes to folder Z or file Y.

## System Architecture
The system employs a client-server architecture with a React + Vite frontend and a Node.js + Express backend. SQLite is used for development, with support for MySQL/PostgreSQL in production. Real-time features are powered by Socket.IO, and the UI is styled with TailwindCSS, incorporating custom luxury components.

**UI/UX Decisions:**
- PWA (Progressive Web App) design with a mobile-first approach.
- Luxury design aesthetic using TailwindCSS for custom theming.
- QR code generation for customer ordering and table identification.
- Admin dashboard with intuitive layouts for management tasks.
- Tabbed interfaces and data tables for detailed views.
- Customizable customer-facing menu page templates (Default-Luxury Gradient, Modern-Minimalist, Elegant-Sophisticated, Minimal-Grid).

**Technical Implementations:**
- **Authentication:** JWT-based authentication with role-based access control (Admin, Owner, Manager, Staff) and automatic token refresh.
- **Database:** Knex.js for schema migrations and query building. Supports multi-tenancy with `branch_id` for data isolation. Dynamic database management allows admin users to configure, initialize, and manage databases.
- **Real-time:** Socket.IO for live updates on orders, kitchen display, and other critical events.
- **File Uploads:** Multer handles image uploads, storing paths (full URLs) in the database and files in a designated directory.
- **Inventory Management:** Automatic stock deduction based on recipes when orders are completed, with stock movement logging.
- **Reporting:** Comprehensive analytics, including sales, inventory usage, top-selling items, and table turnover, with Excel export capabilities.
- **Multi-tenancy:** Strict data isolation enforced across all API endpoints using `req.user.branch_id`.
- **Order Management:** Includes quick order search with QR code support, payment status management (PAID/UNPAID), and real-time order status updates via Socket.IO.
- **Table-Based Ordering Flow:** Captures table number and branch ID from QR code URLs, persists them through the ordering process, and generates secure payment and tracking QR codes for customers.
- **Security:** PIN-based order access for public viewing to prevent enumeration, with payment details restricted to authenticated users. Express trust proxy configured for secure rate limiting.

**Feature Specifications:**
- **Customer QR Ordering:** Customers can scan QR codes to access menus, place orders, and track status.
- **Admin Dashboard:** Full management capabilities for menus, orders, tables, employees, inventory, and reports.
- **Multi-Restaurant Management:** Owners can manage multiple restaurant branches and view aggregated analytics.
- **Employee Management:** CRUD operations for employees with role assignments, PINs, and audit logging.
- **Backup & Restore:** System for creating, restoring, and exporting database backups.
- **Cashier Dashboard:** Dedicated interface for manual order code search, managing pending cash payments, and one-click payment confirmation with real-time updates.

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