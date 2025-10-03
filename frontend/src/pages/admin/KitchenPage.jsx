import { useState, useEffect } from 'react'
import AdminLayout from '../../components/Layout/AdminLayout'
import api from '../../services/api'
import socketService from '../../services/socket'
import {
  ClockIcon,
  CheckCircleIcon,
  FireIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'

const KitchenPage = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active') // 'active', 'all'

  useEffect(() => {
    fetchOrders()
    
    // Connect to socket for real-time updates
    socketService.connect()
    socketService.joinBranch(1)
    socketService.joinRoom('branch:1:kitchen')
    socketService.on('order.created', handleOrderUpdate)
    socketService.on('order.updated', handleOrderUpdate)
    
    return () => {
      socketService.off('order.created', handleOrderUpdate)
      socketService.off('order.updated', handleOrderUpdate)
    }
  }, [filter])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = {
        branchId: 1,
        date: new Date().toISOString().split('T')[0]
      }

      if (filter === 'active') {
        // Only show orders that need kitchen attention
        params.status = 'CONFIRMED,PREPARING'
      }

      const response = await api.get('/orders', { params })
      let ordersList = response.data.data

      if (filter === 'active') {
        ordersList = ordersList.filter(order => 
          ['CONFIRMED', 'PREPARING'].includes(order.status)
        )
      }

      // Sort by creation time (oldest first for kitchen priority)
      ordersList.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      
      setOrders(ordersList)
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
      
      if (filter === 'active' && !['CONFIRMED', 'PREPARING'].includes(updatedOrder.status)) {
        // Remove from active view if status changed to non-active
        return prevOrders.filter(o => o.id !== updatedOrder.id)
      }
      
      if (existingIndex >= 0) {
        const newOrders = [...prevOrders]
        newOrders[existingIndex] = updatedOrder
        return newOrders
      } else if (filter === 'all' || ['CONFIRMED', 'PREPARING'].includes(updatedOrder.status)) {
        return [updatedOrder, ...prevOrders]
      }
      
      return prevOrders
    })
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus })
      
      // Send kitchen acknowledgment
      socketService.kitchenAck({
        orderId,
        status: newStatus,
        branchId: 1,
        timestamp: new Date().toISOString()
      })
      
      toast.success(`Order marked as ${newStatus.toLowerCase()}`)
    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error('Failed to update order status')
    }
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getOrderAge = (dateString) => {
    const orderTime = new Date(dateString)
    const now = new Date()
    const diffMinutes = Math.floor((now - orderTime) / (1000 * 60))
    return diffMinutes
  }

  const getOrderPriority = (order) => {
    const age = getOrderAge(order.created_at)
    if (age > 30) return 'urgent'
    if (age > 15) return 'warning'
    return 'normal'
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'border-red-500 bg-red-50'
      case 'warning': return 'border-yellow-500 bg-yellow-50'
      default: return 'border-gray-200 bg-white'
    }
  }

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent': return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      case 'warning': return <ClockIcon className="h-5 w-5 text-yellow-500" />
      default: return <FireIcon className="h-5 w-5 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Kitchen Display">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Kitchen Display">
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-4">
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'active'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Active Orders ({orders.filter(o => ['CONFIRMED', 'PREPARING'].includes(o.status)).length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All Today ({orders.length})
            </button>
          </div>
          
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Orders Grid */}
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <FireIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {filter === 'active' ? 'No active orders' : 'No orders today'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.map((order) => {
              const priority = getOrderPriority(order)
              const age = getOrderAge(order.created_at)
              
              return (
                <div
                  key={order.id}
                  className={`border-2 rounded-lg p-4 ${getPriorityColor(priority)} transition-all duration-200`}
                >
                  {/* Order Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getPriorityIcon(priority)}
                      <h3 className="font-bold text-lg">
                        {order.table_number || 'N/A'}
                      </h3>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{order.order_code}</div>
                      <div className="text-xs text-gray-500">
                        {formatTime(order.created_at)} ({age}m ago)
                      </div>
                    </div>
                  </div>

                  {/* Customer Info */}
                  {order.customer_name && (
                    <div className="text-sm text-gray-600 mb-3">
                      Customer: {order.customer_name}
                    </div>
                  )}

                  {/* Order Items */}
                  <div className="space-y-2 mb-4">
                    {order.items?.map((item, index) => (
                      <div key={index} className="border-b border-gray-200 pb-2 last:border-b-0">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium">
                              {item.quantity}x {item.item_name}
                            </div>
                            
                            {item.modifiers && item.modifiers.length > 0 && (
                              <div className="text-sm text-gray-600 mt-1">
                                + {item.modifiers.map(m => m.modifier_name).join(', ')}
                              </div>
                            )}
                            
                            {item.notes && (
                              <div className="text-sm font-medium text-red-600 mt-1">
                                ⚠️ {item.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Status and Actions */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'CONFIRMED' 
                          ? 'bg-blue-100 text-blue-800'
                          : order.status === 'PREPARING'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      {order.status === 'CONFIRMED' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                          className="flex-1 bg-orange-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-orange-700 transition-colors"
                        >
                          Start Cooking
                        </button>
                      )}
                      
                      {order.status === 'PREPARING' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'READY')}
                          className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                          <CheckCircleIcon className="h-4 w-4 inline mr-1" />
                          Ready
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Kitchen Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">
              {orders.filter(o => o.status === 'CONFIRMED').length}
            </div>
            <div className="text-sm text-gray-600">Waiting to Start</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-orange-600">
              {orders.filter(o => o.status === 'PREPARING').length}
            </div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-red-600">
              {orders.filter(o => getOrderPriority(o) === 'urgent').length}
            </div>
            <div className="text-sm text-gray-600">Urgent (30+ min)</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-green-600">
              {orders.filter(o => o.status === 'READY').length}
            </div>
            <div className="text-sm text-gray-600">Ready to Serve</div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default KitchenPage