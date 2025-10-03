import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useEffect } from 'react'

// Public pages
import MenuPage from './pages/MenuPage'
import OrderStatusPage from './pages/OrderStatusPage'
import CheckoutPage from './pages/CheckoutPage'

// Admin pages
import LoginPage from './pages/admin/LoginPage'
import DashboardPage from './pages/admin/DashboardPage'
import MenuManagementPage from './pages/admin/MenuManagementPage'
import OrdersPage from './pages/admin/OrdersPage'
import TablesPage from './pages/admin/TablesPage'
import KitchenPage from './pages/admin/KitchenPage'
import SettingsPage from './pages/admin/SettingsPage'
import ReportsPage from './pages/admin/ReportsPage'

// Components
import ProtectedRoute from './components/ProtectedRoute'
import LoadingSpinner from './components/LoadingSpinner'

function App() {
  const { user, loading, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <Routes>
      {/* Public Routes - Customer PWA */}
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/order/:orderId" element={<OrderStatusPage />} />
      
      {/* Admin Routes */}
      <Route path="/admin/login" element={<LoginPage />} />
      
      <Route path="/admin/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/menu" element={
        <ProtectedRoute roles={['admin', 'manager']}>
          <MenuManagementPage />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/orders" element={
        <ProtectedRoute roles={['admin', 'manager', 'cashier']}>
          <OrdersPage />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/tables" element={
        <ProtectedRoute roles={['admin', 'manager']}>
          <TablesPage />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/kitchen" element={
        <ProtectedRoute roles={['admin', 'manager', 'kitchen']}>
          <KitchenPage />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/reports" element={
        <ProtectedRoute roles={['admin', 'manager']}>
          <ReportsPage />
        </ProtectedRoute>
      } />
      
      <Route path="/admin/settings" element={
        <ProtectedRoute roles={['admin']}>
          <SettingsPage />
        </ProtectedRoute>
      } />
      
      {/* Redirects */}
      <Route path="/admin" element={
        user ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/admin/login" replace />
      } />
      
      <Route path="/" element={<Navigate to="/menu" replace />} />
      
      {/* 404 */}
      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
            <p className="text-gray-600 mb-8">Page not found</p>
            <a href="/" className="btn-primary">Go Home</a>
          </div>
        </div>
      } />
    </Routes>
  )
}

export default App