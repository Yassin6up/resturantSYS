import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useSocket } from '../../contexts/SocketContext'
import { useTheme } from '../../contexts/ThemeContext'
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  TableCellsIcon,
  QueueListIcon,
  BeakerIcon,
  ChartBarIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  WifiIcon,
  UserGroupIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon, roles: ['admin', 'manager', 'cashier'] },
  { name: 'POS', href: '/admin/pos', icon: ShoppingCartIcon, roles: ['admin', 'manager', 'cashier'] },
  { name: 'Menu', href: '/admin/menu', icon: ClipboardDocumentListIcon, roles: ['admin', 'manager'] },
  { name: 'Tables', href: '/admin/tables', icon: TableCellsIcon, roles: ['admin', 'manager'] },
  { name: 'Orders', href: '/admin/orders', icon: QueueListIcon, roles: ['admin', 'manager', 'cashier'] },
  { name: 'Kitchen', href: '/admin/kitchen', icon: BeakerIcon, roles: ['admin', 'manager', 'kitchen'] },
  { name: 'Inventory', href: '/admin/inventory', icon: ChartBarIcon, roles: ['admin', 'manager'] },
  { name: 'Employees', href: '/admin/employees', icon: UserGroupIcon, roles: ['admin', 'manager'] },
  { name: 'Reports', href: '/admin/reports', icon: ChartBarIcon, roles: ['admin', 'manager'] },
  { name: 'Settings', href: '/admin/settings', icon: CogIcon, roles: ['admin'] },
]

function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { isConnected } = useSocket()
  const { getAppName, getSetting } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role)
  )

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white border-r border-gray-200">
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
            <h1 className="text-lg font-semibold text-gray-900">{getAppName()} Admin</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close sidebar</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </a>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4 border-b border-gray-200">
            <h1 className="text-lg font-semibold text-gray-900">{getAppName()} Admin</h1>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </a>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Open sidebar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            <div className="flex items-center space-x-4">
              {/* Connection status */}
              <div className="flex items-center text-sm">
                {isConnected ? (
                  <>
                    <WifiIcon className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiIcon className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-red-600">Disconnected</span>
                  </>
                )}
              </div>

              {/* User menu */}
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {user?.fullName || user?.username}
                </span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {user?.role}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-gray-600"
                  title="Logout"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout