import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSocket } from '../../contexts/SocketContext'
import { 
  ShoppingCart, 
  Users, 
  DollarSign, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  LogOut,
  Settings,
  Menu,
  Package,
  BarChart3
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const DashboardPage = () => {
  const { user, logout } = useAuth()
  const { socket, connected } = useSocket()
  const [stats, setStats] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
    
    // Set up socket listeners
    if (socket) {
      socket.on('order.created', handleNewOrder)
      socket.on('order.updated', handleOrderUpdate)
      socket.on('order.paid', handleOrderPaid)
      
      return () => {
        socket.off('order.created')
        socket.off('order.updated')
        socket.off('order.paid')
      }
    }
  }, [socket])

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, ordersResponse] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/orders?limit=10')
      ])
      
      setStats(statsResponse.data)
      setRecentOrders(ordersResponse.data)
    } catch (error) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleNewOrder = (order) => {
    setRecentOrders(prev => [order, ...prev.slice(0, 9)])
    toast.success(`New order: ${order.order_code}`)
  }

  const handleOrderUpdate = (order) => {
    setRecentOrders(prev => 
      prev.map(o => o.id === order.id ? order : o)
    )
  }

  const handleOrderPaid = (order) => {
    setRecentOrders(prev => 
      prev.map(o => o.id === order.id ? order : o)
    )
    toast.success(`Order ${order.order_code} paid`)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-600 bg-yellow-100'
      case 'CONFIRMED': return 'text-blue-600 bg-blue-100'
      case 'PREPARING': return 'text-purple-600 bg-purple-100'
      case 'READY': return 'text-green-600 bg-green-100'
      case 'SERVED': return 'text-green-600 bg-green-100'
      case 'PAID': return 'text-green-600 bg-green-100'
      case 'COMPLETED': return 'text-gray-600 bg-gray-100'
      case 'CANCELLED': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user.full_name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <div className={`w-2 h-2 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                {connected ? 'Connected' : 'Disconnected'}
              </div>
              <button
                onClick={logout}
                className="btn-outline"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ShoppingCart className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Today's Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.todayStats.totalOrders}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.todayStats.totalRevenue.toFixed(2)} MAD</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.todayStats.avgOrderValue.toFixed(2)} MAD</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.lowStockItems.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold">Recent Orders</h2>
              </div>
              <div className="card-body p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Table
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{order.order_code}</div>
                            <div className="text-sm text-gray-500">{order.customer_name || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.table_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.total.toFixed(2)} MAD
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(order.created_at).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold">Quick Actions</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  <button className="w-full btn-outline text-left">
                    <Menu className="w-4 h-4 mr-2" />
                    Manage Menu
                  </button>
                  <button className="w-full btn-outline text-left">
                    <Users className="w-4 h-4 mr-2" />
                    Manage Tables
                  </button>
                  <button className="w-full btn-outline text-left">
                    <Package className="w-4 h-4 mr-2" />
                    View Orders
                  </button>
                  <button className="w-full btn-outline text-left">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Reports
                  </button>
                  <button className="w-full btn-outline text-left">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </button>
                </div>
              </div>
            </div>

            {/* Order Status Summary */}
            {stats && (
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold">Order Status</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-3">
                    {Object.entries(stats.ordersByStatus).map(([status, count]) => (
                      <div key={status} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{status}</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Low Stock Alerts */}
            {stats && stats.lowStockItems.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-red-600">Low Stock Alert</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-2">
                    {stats.lowStockItems.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <span className="text-gray-900">{item.name}</span>
                        <span className="text-red-600 font-medium">{item.quantity} {item.unit}</span>
                      </div>
                    ))}
                    {stats.lowStockItems.length > 5 && (
                      <p className="text-xs text-gray-500">
                        +{stats.lowStockItems.length - 5} more items
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage