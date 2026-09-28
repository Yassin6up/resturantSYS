import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import { CartProvider } from './contexts/CartContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { CustomerAuthProvider } from './contexts/CustomerAuthContext'
import { TenantProvider } from './contexts/TenantContext'

// Public routes (Customer PWA)
import StorefrontIndex from './pages/customer/StorefrontIndex'
import MenuPage from './pages/customer/MenuPage'
import CartPage from './pages/customer/CartPage'
import CheckoutPage from './pages/customer/CheckoutPage'
import OrderStatusPage from './pages/customer/OrderStatusPage'
import ReservationPage from './pages/customer/ReservationPage'
import ReservationsPage from './pages/admin/ReservationsPage'
import AccountPage from './pages/customer/AccountPage'

// Marketing (bare apex domain - no tenant resolved)
import LandingPage from './pages/marketing/LandingPage'
import GetStartedPage from './pages/marketing/GetStartedPage'

// Protected routes (Admin Dashboard)
import LoginPage from './pages/admin/LoginPage'
import DashboardPage from './pages/admin/DashboardPage'
import MenuManagementPage from './pages/admin/MenuManagementPage'
import TableManagementPage from './pages/admin/TableManagementPage'
import OrdersPage from './pages/admin/OrdersPage'
import KitchenDisplayPage from './pages/admin/KitchenDisplayPage'
import CashierDashboard from './pages/admin/CashierDashboard'
import POSPage from './pages/admin/POSPage'
import InventoryPage from './pages/admin/InventoryPage'
import ReportsPage from './pages/admin/ReportsPage'
import SettingsPage from './pages/admin/SettingsPage'
import WebsitePage from './pages/admin/WebsitePage'
import EmployeesPage from './pages/admin/EmployeesPage'
import CustomersPage from './pages/admin/CustomersPage'
import WhatsAppMarketingPage from './pages/admin/WhatsAppMarketingPage'
import ServicesManagementPage from './pages/admin/ServicesManagementPage'
import BookingsPage from './pages/admin/BookingsPage'
import AvailabilityPage from './pages/admin/AvailabilityPage'

// Owner routes (Multi-tenant Management)
import OwnerDashboard from './pages/owner/OwnerDashboard'
import RestaurantForm from './pages/owner/RestaurantForm'
import RestaurantDetails from './pages/owner/RestaurantDetails'
import ActivityLogs from './pages/owner/ActivityLogs'
import PlansPage from './pages/owner/PlansPage'

// Layout components
import CustomerLayout from './components/layout/CustomerLayout'
import AdminLayout from './components/layout/AdminLayout'
import OwnerLayout from './components/layout/OwnerLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'

function App() {
  return (
    <ThemeProvider>
      <TenantProvider>
      <AuthProvider>
        <CustomerAuthProvider>
        <SocketProvider>
          <CartProvider>
            <Routes>
            {/* Get-started onboarding wizard - full-screen, no store chrome */}
            <Route path="/get-started" element={<GetStartedPage />} />

            {/* Public Customer Routes */}
            <Route path="/" element={<CustomerLayout />}>
              <Route index element={<StorefrontIndex />} />
              <Route path="menu" element={<StorefrontIndex />} />
              <Route path="reservations" element={<ReservationPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="order/:orderId" element={<OrderStatusPage />} />
              <Route path="order-status" element={<OrderStatusPage />} />
              <Route path="account" element={<AccountPage />} />
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
              <Route path="products" element={<MenuManagementPage />} />
              <Route path="categories" element={<MenuManagementPage />} />
              <Route path="tables" element={<TableManagementPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="kitchen" element={<KitchenDisplayPage />} />
              <Route path="cashier" element={<CashierDashboard />} />
              <Route path="pos" element={<POSPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="services" element={<ServicesManagementPage />} />
              <Route path="bookings" element={<BookingsPage />} />
              <Route path="reservations" element={<ReservationsPage />} />
              <Route path="availability" element={<AvailabilityPage />} />
              <Route path="whatsapp" element={<WhatsAppMarketingPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="website" element={<WebsitePage />} />
            </Route>

            {/* Protected Owner Routes (Multi-tenant Management) */}
            <Route path="/owner" element={
              <ProtectedRoute requiredRoles={['owner']}>
                <OwnerLayout />
              </ProtectedRoute>
            }>
              <Route index element={<OwnerDashboard />} />
              <Route path="dashboard" element={<OwnerDashboard />} />
              <Route path="restaurants/new" element={<RestaurantForm />} />
              <Route path="restaurants/:id" element={<RestaurantDetails />} />
              <Route path="restaurants/:id/edit" element={<RestaurantForm />} />
              <Route path="logs" element={<ActivityLogs />} />
              <Route path="plans" element={<PlansPage />} />
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
        </CustomerAuthProvider>
      </AuthProvider>
      </TenantProvider>
    </ThemeProvider>
  )
}

export default App
