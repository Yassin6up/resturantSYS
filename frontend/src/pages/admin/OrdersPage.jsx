import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/Layout/AdminLayout'
import api from '../../services/api'
import socketService from '../../services/socket'
import {
  EyeIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'

const OrdersPage = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    date: new Date().toISOString().split('T')[0],
    table: ''
  })
  const [updating, setUpdating] = useState({})

  useEffect(() => {
    fetchOrders()
    
    // Connect to socket for real-time updates
    socketService.connect()
    socketService.joinBranch(1)
    socketService.on('order.created', handleOrderUpdate)
    socketService.on('order.updated', handleOrderUpdate)
    
    return () => {
      socketService.off('order.created', handleOrderUpdate)
      socketService.off('order.updated', handleOrderUpdate)
    }
  }, [filters])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = {
        branchId: 1,
        ...filters
      }
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key]
      })

      const response = await api.get('/orders', { params })
      setOrders(response.data.data)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const handleOrderUpdate = (updatedOrder) => {
    setOrders(prevOrders => {
      const existingIndex = prevOrders.findIndex(o => o.id === updatedOrder.id)
      if (existingIndex >= 0) {
        const newOrders = [...prevOrders]
        newOrders[existingIndex] = updatedOrder
        return newOrders
      } else {
        return [updatedOrder, ...prevOrders]
      }
    })
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setUpdating(prev => ({ ...prev, [orderId]: true }))
      
      await api.patch(`/orders/${orderId}/status`, { status: newStatus })
      toast.success(`Order status updated to ${newStatus}`)
    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error('Failed to update order status')
    } finally {
      setUpdating(prev => ({ ...prev, [orderId]: false }))
    }
  }

  const cancelOrder = async (orderId, reason = 'Cancelled by staff') => {
    if (!confirm('Are you sure you want to cancel this order?')) return

    try {
      setUpdating(prev => ({ ...prev, [orderId]: true }))
      
      await api.post(`/orders/${orderId}/cancel`, { reason })
      toast.success('Order cancelled successfully')
    } catch (error) {
      console.error('Error cancelling order:', error)
      toast.error('Failed to cancel order')
    } finally {
      setUpdating(prev => ({ ...prev, [orderId]: false }))
    }
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

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      'SUBMITTED': 'CONFIRMED',
      'PENDING': 'CONFIRMED',
      'CONFIRMED': 'PREPARING',
      'PREPARING': 'READY',
      'READY': 'SERVED',
      'SERVED': 'COMPLETED'
    }
    return statusFlow[currentStatus]
  }

  const canUpdateStatus = (status) => {
    return ['SUBMITTED', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED'].includes(status)
  }

  const canCancel = (status) => {
    return ['SUBMITTED', 'PENDING', 'CONFIRMED', 'PREPARING'].includes(status)
  }

  return (
    <AdminLayout title="Orders">
      <div className="space-y-6">
        {/* Filters */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <FunnelIcon className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="input"
              >
                <option value="">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PREPARING">Preparing</option>
                <option value="READY">Ready</option>
                <option value="SERVED">Served</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                className="input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Table
              </label>
              <input
                type="text"
                value={filters.table}
                onChange={(e) => setFilters(prev => ({ ...prev, table: e.target.value }))}
                placeholder="Table number"
                className="input"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ status: '', date: new Date().toISOString().split('T')[0], table: '' })}
                className="btn-outline"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Orders ({orders.length})
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="large" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No orders found</p>
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
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Link
                          to={`/order/${order.id}?code=${order.order_code}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <EyeIcon className="h-4 w-4 inline" />
                        </Link>
                        
                        {canUpdateStatus(order.status) && getNextStatus(order.status) && (
                          <button
                            onClick={() => updateOrderStatus(order.id, getNextStatus(order.status))}
                            disabled={updating[order.id]}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          >
                            {updating[order.id] ? (
                              <LoadingSpinner size="small" />
                            ) : (
                              <CheckCircleIcon className="h-4 w-4 inline" />
                            )}
                          </button>
                        )}
                        
                        {canCancel(order.status) && (
                          <button
                            onClick={() => cancelOrder(order.id)}
                            disabled={updating[order.id]}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            <XMarkIcon className="h-4 w-4 inline" />
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
    </AdminLayout>
  )
}

export default OrdersPage