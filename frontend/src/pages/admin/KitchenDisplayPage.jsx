import { useState, useEffect } from 'react'
import { ordersAPI } from '../../services/api'
import { useSocket } from '../../contexts/SocketContext'
import { 
  ClockIcon, 
  CheckIcon, 
  ExclamationTriangleIcon,
  PrinterIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

function KitchenDisplayPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, confirmed, preparing, ready
  const { socket } = useSocket()

  useEffect(() => {
    loadOrders()
  }, [])

  useEffect(() => {
    if (socket) {
      // Join kitchen room for real-time updates
      socket.emit('join-kitchen')

      // Listen for order updates
      socket.on('order.created', handleOrderCreated)
      socket.on('order.updated', handleOrderUpdated)
      socket.on('order.confirmed', handleOrderConfirmed)

      return () => {
        socket.emit('leave-kitchen')
        socket.off('order.created')
        socket.off('order.updated')
        socket.off('order.confirmed')
      }
    }
  }, [socket])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const response = await ordersAPI.getOrders({ 
        branchId: 1,
        status: ['CONFIRMED', 'PREPARING', 'READY']
      })
      if (response.data.success) {
        setOrders(response.data.orders)
      }
    } catch (error) {
      toast.error('Failed to load orders')
      console.error('Orders load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOrderCreated = (order) => {
    setOrders(prev => [order, ...prev])
  }

  const handleOrderUpdated = (updatedOrder) => {
    setOrders(prev => prev.map(order => 
      order.id === updatedOrder.id ? updatedOrder : order
    ))
  }

  const handleOrderConfirmed = (order) => {
    setOrders(prev => [order, ...prev])
  }

  const updateOrderStatus = async (orderId, status) => {
    try {
      const response = await ordersAPI.updateOrderStatus(orderId, status)
      if (response.data.success) {
        toast.success(`Order status updated to ${status}`)
        // The socket will handle the real-time update
      }
    } catch (error) {
      console.error('Status update error:', error)
      toast.error('Failed to update order status')
    }
  }

  const acknowledgeOrder = async (orderId) => {
    try {
      await ordersAPI.updateOrderStatus(orderId, 'PREPARING')
      toast.success('Order acknowledged')
    } catch (error) {
      console.error('Acknowledge error:', error)
      toast.error('Failed to acknowledge order')
    }
  }

  const markOrderReady = async (orderId) => {
    try {
      await ordersAPI.updateOrderStatus(orderId, 'READY')
      toast.success('Order marked as ready')
    } catch (error) {
      console.error('Mark ready error:', error)
      toast.error('Failed to mark order as ready')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'PREPARING':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'READY':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH':
        return 'border-l-red-500 bg-red-50'
      case 'MEDIUM':
        return 'border-l-yellow-500 bg-yellow-50'
      case 'LOW':
        return 'border-l-green-500 bg-green-50'
      default:
        return 'border-l-gray-300 bg-white'
    }
  }

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true
    return order.status === filter
  })

  const getTimeElapsed = (createdAt) => {
    const now = new Date()
    const created = new Date(createdAt)
    const diffMs = now - created
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    
    const diffHours = Math.floor(diffMins / 60)
    return `${diffHours}h ${diffMins % 60}m ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-gray-600">Loading kitchen orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Kitchen Display</h1>
          <p className="text-gray-600 mt-2">Real-time order management for kitchen staff</p>
        </div>
        
        {/* Status Filter */}
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({orders.length})
          </button>
          <button
            onClick={() => setFilter('CONFIRMED')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'CONFIRMED'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Confirmed ({orders.filter(o => o.status === 'CONFIRMED').length})
          </button>
          <button
            onClick={() => setFilter('PREPARING')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'PREPARING'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Preparing ({orders.filter(o => o.status === 'PREPARING').length})
          </button>
          <button
            onClick={() => setFilter('READY')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'READY'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Ready ({orders.filter(o => o.status === 'READY').length})
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredOrders.map((order) => (
          <div
            key={order.id}
            className={`card border-l-4 ${getPriorityColor(order.priority || 'LOW')} hover:shadow-lg transition-shadow duration-200`}
          >
            <div className="card-body">
              {/* Order Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Order #{order.order_code}
                  </h3>
                  <p className="text-sm text-gray-600">Table {order.table_number}</p>
                  <p className="text-xs text-gray-500">{order.customer_name}</p>
                </div>
                <div className="text-right">
                  <span className={`badge ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {getTimeElapsed(order.created_at)}
                  </p>
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-3 mb-4">
                <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-1">
                  Items to Prepare:
                </h4>
                {order.items?.map((item, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    {/* Item Image */}
                    <div className="flex-shrink-0">
                      <img
                        src={item.menu_item?.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&h=80&fit=crop'}
                        alt={item.item_name || 'Food item'}
                        className="w-16 h-16 rounded-lg object-cover border border-gray-300"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&h=80&fit=crop'
                        }}
                      />
                    </div>
                    
                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-lg font-bold text-blue-600">
                          {item.quantity}x
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {item.item_name || 'Unknown Item'}
                        </span>
                      </div>
                      
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="text-xs text-gray-600 mb-1">
                          <span className="text-blue-600">Modifiers:</span> {item.modifiers.map(mod => mod.name).join(', ')}
                        </div>
                      )}
                      
                      {item.note && (
                        <div className="text-xs text-blue-700 font-medium bg-blue-50 px-2 py-1 rounded border border-blue-200">
                          📝 Note: {item.note}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Actions */}
              <div className="flex space-x-2">
                {order.status === 'CONFIRMED' && (
                  <button
                    onClick={() => acknowledgeOrder(order.id)}
                    className="flex-1 btn-primary btn-sm"
                  >
                    <CheckIcon className="h-4 w-4 mr-1" />
                    Start Cooking
                  </button>
                )}
                
                {order.status === 'PREPARING' && (
                  <button
                    onClick={() => markOrderReady(order.id)}
                    className="flex-1 btn-success btn-sm"
                  >
                    <CheckIcon className="h-4 w-4 mr-1" />
                    Mark Ready
                  </button>
                )}
                
                {order.status === 'READY' && (
                  <div className="flex-1 text-center">
                    <span className="text-sm font-medium text-green-600">
                      Ready for Service
                    </span>
                  </div>
                )}
                
                <button
                  onClick={() => window.print()}
                  className="btn-outline btn-sm"
                >
                  <PrinterIcon className="h-4 w-4" />
                </button>
              </div>

              {/* Order Total */}
              <div className="mt-4 pt-4 border-t border-yellow-400/30">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Total:</span>
                  <span className="text-lg font-bold text-yellow-400">
                    {order.total?.toFixed(2)} MAD
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClockIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? 'No orders in the kitchen at the moment'
              : `No ${filter.toLowerCase()} orders at the moment`
            }
          </p>
        </div>
      )}

      {/* Kitchen Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="card-body">
            <div className="text-2xl font-bold text-blue-600">
              {orders.filter(o => o.status === 'CONFIRMED').length}
            </div>
            <div className="text-sm text-gray-600">Confirmed</div>
          </div>
        </div>
        
        <div className="card text-center">
          <div className="card-body">
            <div className="text-2xl font-bold text-orange-600">
              {orders.filter(o => o.status === 'PREPARING').length}
            </div>
            <div className="text-sm text-gray-600">Preparing</div>
          </div>
        </div>
        
        <div className="card text-center">
          <div className="card-body">
            <div className="text-2xl font-bold text-green-600">
              {orders.filter(o => o.status === 'READY').length}
            </div>
            <div className="text-sm text-gray-600">Ready</div>
          </div>
        </div>
        
        <div className="card text-center">
          <div className="card-body">
            <div className="text-2xl font-bold text-gray-600">
              {orders.length}
            </div>
            <div className="text-sm text-gray-600">Total Active</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KitchenDisplayPage