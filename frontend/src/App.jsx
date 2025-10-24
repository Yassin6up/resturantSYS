import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import { CartProvider } from './contexts/CartContext'
import { ThemeProvider } from './contexts/ThemeContext'

// Public routes (Customer PWA)
import MenuPage from './pages/customer/MenuPage'
import CartPage from './pages/customer/CartPage'
import CheckoutPage from './pages/customer/CheckoutPage'
import OrderStatusPage from './pages/customer/OrderStatusPage'

// Protected routes (Admin Dashboard)
import LoginPage from './pages/admin/LoginPage'
import DashboardPage from './pages/admin/DashboardPage'
import MenuManagementPage from './pages/admin/MenuManagementPage'
import TableManagementPage from './pages/admin/TableManagementPage'
import OrdersPage from './pages/admin/OrdersPage'
import KitchenDisplayPage from './pages/admin/KitchenDisplayPage'
import InventoryPage from './pages/admin/InventoryPage'
import ReportsPage from './pages/admin/ReportsPage'
import SettingsPage from './pages/admin/SettingsPage'
import EmployeesPage from './pages/admin/EmployeesPage'

// Owner routes (Multi-tenant Management)
import OwnerDashboard from './pages/owner/OwnerDashboard'

// Layout components
import CustomerLayout from './components/layout/CustomerLayout'
import AdminLayout from './components/layout/AdminLayout'
import OwnerLayout from './components/layout/OwnerLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <CartProvider>
            <Routes>
            {/* Public Customer Routes */}
            <Route path="/" element={<CustomerLayout />}>
              <Route index element={<MenuPage />} />
              <Route path="menu" element={<MenuPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="order/:orderId" element={<OrderStatusPage />} />
              <Route path="order-status" element={<OrderStatusPage />} />
            </Route>

            {/* Admin Authentication */}
            <Route path="/admin/login" element={<LoginPage />} />

            {/* Protected Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<DashboardPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="menu" element={<MenuManagementPage />} />
              <Route path="tables" element={<TableManagementPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="kitchen" element={<KitchenDisplayPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Protected Owner Routes (Multi-tenant Management) */}
            <Route path="/owner" element={
              <ProtectedRoute requiredRoles={['owner']}>
                <OwnerLayout />
              </ProtectedRoute>
            }>
              <Route index element={<OwnerDashboard />} />
              <Route path="dashboard" element={<OwnerDashboard />} />
            </Route>

            {/* Catch all route */}
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-gray-600 mb-8">Page not found</p>
                  <a 
                    href="/" 
                    className="btn-primary"
                  >
                    Go Home
                  </a>
                </div>
              </div>
            } />
            </Routes>
          </CartProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App