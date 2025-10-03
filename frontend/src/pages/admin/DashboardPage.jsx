import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/Layout/AdminLayout'
import api from '../../services/api'
import socketService from '../../services/socket'
import {
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '../../components/LoadingSpinner'

const DashboardPage = () => {
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    activeOrders: 0,
    pendingOrders: 0
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
    
    // Connect to socket for real-time updates
    socketService.connect()
    socketService.joinBranch(1) // Default branch
    socketService.on('order.created', handleOrderUpdate)
    socketService.on('order.updated', handleOrderUpdate)
    
    return () => {
      socketService.off('order.created', handleOrderUpdate)
      socketService.off('order.updated', handleOrderUpdate)
    }
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch today's orders
      const today = new Date().toISOString().split('T')[0]
      const ordersResponse = await api.get('/orders', {
        params: { branchId: 1, date: today }
      })
      
      const orders = ordersResponse.data.data
      
      // Calculate stats
      const todayOrders = orders.length
      const todayRevenue = orders
        .filter(order => order.payment_status === 'PAID')
        .reduce((sum, order) => sum + order.total, 0)
      
      const activeOrders = orders.filter(order => 
        ['SUBMITTED', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(order.status)
      ).length
      
      const pendingOrders = orders.filter(order => 
        ['SUBMITTED', 'PENDING'].includes(order.status)
      ).length

      setStats({
        todayOrders,
        todayRevenue,
        activeOrders,
        pendingOrders
      })

      // Get recent orders (last 10)
      setRecentOrders(orders.slice(0, 10))
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOrderUpdate = () => {
    // Refresh dashboard data when orders are updated
    fetchDashboardData()
  }

  const formatPrice = (price) => {
    return `${price.toFixed(2)} MAD`
  }

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      'SUBMITTED': { color: 'bg-yellow-100 text-yellow-800', text: 'Submitted' },
      'PENDING': { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      'CONFIRMED': { color: 'bg-blue-100 text-blue-800', text: 'Confirmed' },
      'PREPARING': { color: 'bg-orange-100 text-orange-800', text: 'Preparing' },
      'READY': { color: 'bg-green-100 text-green-800', text: 'Ready' },
      'SERVED': { color: 'bg-green-100 text-green-800', text: 'Served' },
      'COMPLETED': { color: 'bg-gray-100 text-gray-800', text: 'Completed' },
      'CANCELLED': { color: 'bg-red-100 text-red-800', text: 'Cancelled' }
    }

    const config = statusConfig[status] || statusConfig['SUBMITTED']
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    )
  }

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClipboardDocumentListIcon className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Today's Orders</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.todayOrders}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Today's Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatPrice(stats.todayRevenue)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Orders</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.activeOrders}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Orders</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pendingOrders}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/admin/orders?status=PENDING"
              className="flex items-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
            >
              <ClockIcon className="h-6 w-6 text-yellow-600 mr-3" />
              <div>
                <p className="font-medium text-yellow-900">Review Pending Orders</p>
                <p className="text-sm text-yellow-700">{stats.pendingOrders} orders waiting</p>
              </div>
            </Link>

            <Link
              to="/admin/kitchen"
              className="flex items-center p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <CheckCircleIcon className="h-6 w-6 text-orange-600 mr-3" />
              <div>
                <p className="font-medium text-orange-900">Kitchen Display</p>
                <p className="text-sm text-orange-700">View active orders</p>
              </div>
            </Link>

            <Link
              to="/admin/menu"
              className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <UserGroupIcon className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-blue-900">Manage Menu</p>
                <p className="text-sm text-blue-700">Update items & prices</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            <Link
              to="/admin/orders"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View all orders →
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No orders yet today</p>
            </div>
          ) : (
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
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.order_code}
                          </div>
                          {order.customer_name && (
                            <div className="text-sm text-gray-500">
                              {order.customer_name}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.table_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatPrice(order.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(order.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default DashboardPage