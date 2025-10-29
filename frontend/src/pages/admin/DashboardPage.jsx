import { useState, useEffect } from 'react'
import { useSocket } from '../../contexts/SocketContext'
import { ordersAPI, reportsAPI, inventoryAPI } from '../../services/api'
import { 
  QueueListIcon, 
  CurrencyDollarIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

function DashboardPage() {
  const { orders, updateOrderStatus } = useSocket()
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0
  })
  const [lowStockAlerts, setLowStockAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load today's orders
      const ordersResponse = await ordersAPI.getOrders({ 
        limit: 100,
        branchId: 1 
      })
      
      // Load today's sales report
      const today = new Date().toISOString().split('T')[0]
      const salesResponse = await reportsAPI.getDailySales({ 
        date: today,
        branchId: 1 
      })

      // Load low stock alerts
      const alertsResponse = await inventoryAPI.getAlerts()
      
      const ordersData = ordersResponse.data.orders
      const salesData = salesResponse.data.summary
      
      setStats({
        totalOrders: ordersData.length,
        pendingOrders: ordersData.filter(o => ['PENDING', 'CONFIRMED', 'PREPARING'].includes(o.status)).length,
        totalRevenue: parseFloat(salesData.total_revenue || 0),
        averageOrderValue: parseFloat(salesData.average_order_value || 0)
      })

      if (alertsResponse.data.success) {
        setLowStockAlerts(alertsResponse.data.alerts || [])
      }
      
    } catch (error) {
      toast.error('Failed to load dashboard data')
      console.error('Dashboard load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOrderAction = async (orderId, action) => {
    try {
      if (action === 'confirm') {
        await ordersAPI.confirmOrder(orderId)
        toast.success('Order confirmed')
      } else if (action === 'cancel') {
        await ordersAPI.cancelOrder(orderId, 'Cancelled from dashboard')
        toast.success('Order cancelled')
      } else {
        await ordersAPI.updateOrderStatus(orderId, action)
        toast.success(`Order status updated to ${action}`)
      }
      
      // Refresh data
      loadDashboardData()
    } catch (error) {
      toast.error('Failed to update order')
      console.error('Order update error:', error)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800'
      case 'PREPARING': return 'bg-orange-100 text-orange-800'
      case 'READY': return 'bg-green-100 text-green-800'
      case 'SERVED': return 'bg-purple-100 text-purple-800'
      case 'COMPLETED': return 'bg-gray-100 text-gray-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800'
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-800'
      case 'UNPAID': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Restaurant operations overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <QueueListIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Orders</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalOrders}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Orders</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pendingOrders}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Today's Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalRevenue.toFixed(2)} MAD</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Order Value</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.averageOrderValue.toFixed(2)} MAD</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockAlerts.length > 0 && (
        <div className="card border-l-4 border-l-red-500 bg-red-50">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-red-800">Low Stock Alert</h3>
                  <p className="text-red-700">
                    {lowStockAlerts.length} item(s) are running low on stock
                  </p>
                </div>
              </div>
              <Link to="/admin/inventory" className="btn-secondary text-sm">
                View Inventory
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockAlerts.slice(0, 6).map((alert) => (
                <div key={alert.id} className="bg-white rounded-lg p-3 border border-red-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">
                        {alert.stock_item_name}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-red-600 font-semibold">
                          {alert.current_stock} {alert.unit}
                        </span>
                        <span className="text-xs text-gray-500">
                          / Min: {alert.min_threshold} {alert.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="card">
        <div className="card-header">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            <button
              onClick={loadDashboardData}
              className="btn-outline btn-sm"
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="card-body">
          {orders.length === 0 ? (
            <div className="text-center py-8">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No orders</h3>
              <p className="mt-1 text-sm text-gray-500">No recent orders found.</p>
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
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.slice(0, 10).map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.order_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.table_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.customer_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${getPaymentStatusColor(order.payment_status)}`}>
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.total.toFixed(2)} MAD
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {order.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleOrderAction(order.id, 'confirm')}
                              className="text-green-600 hover:text-green-900"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => handleOrderAction(order.id, 'cancel')}
                              className="text-red-600 hover:text-red-900"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {order.status === 'CONFIRMED' && (
                          <button
                            onClick={() => handleOrderAction(order.id, 'PREPARING')}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Start Prep
                          </button>
                        )}
                        {order.status === 'PREPARING' && (
                          <button
                            onClick={() => handleOrderAction(order.id, 'READY')}
                            className="text-orange-600 hover:text-orange-900"
                          >
                            Mark Ready
                          </button>
                        )}
                        {order.status === 'READY' && (
                          <button
                            onClick={() => handleOrderAction(order.id, 'SERVED')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Mark Served
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-body text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Menu Management</h3>
            <p className="text-sm text-gray-500 mb-4">Manage categories, items, and modifiers</p>
            <a href="/admin/menu" className="btn-primary w-full">
              Manage Menu
            </a>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Table Management</h3>
            <p className="text-sm text-gray-500 mb-4">Generate QR codes and manage tables</p>
            <a href="/admin/tables" className="btn-primary w-full">
              Manage Tables
            </a>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Reports</h3>
            <p className="text-sm text-gray-500 mb-4">View sales reports and analytics</p>
            <a href="/admin/reports" className="btn-primary w-full">
              View Reports
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage