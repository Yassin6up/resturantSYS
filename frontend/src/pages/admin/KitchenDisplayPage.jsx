import { useState, useEffect } from 'react'
import { useSocket } from '../../contexts/SocketContext'
import { ordersAPI } from '../../services/api'
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

function KitchenDisplayPage() {
  const { orders, acknowledgeOrder } = useSocket()
  const [kitchenOrders, setKitchenOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadKitchenOrders()
  }, [])

  useEffect(() => {
    // Filter orders for kitchen display
    const kitchenOrders = orders.filter(order => 
      ['CONFIRMED', 'PREPARING'].includes(order.status)
    )
    setKitchenOrders(kitchenOrders)
  }, [orders])

  const loadKitchenOrders = async () => {
    try {
      setLoading(true)
      const response = await ordersAPI.getOrders({ 
        branchId: 1,
        status: 'CONFIRMED,PREPARING',
        limit: 50
      })
      // Orders are managed by Socket context
    } catch (error) {
      toast.error('Failed to load kitchen orders')
      console.error('Kitchen orders load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAcknowledge = async (orderId) => {
    try {
      await acknowledgeOrder(orderId)
      toast.success('Order acknowledged')
    } catch (error) {
      toast.error('Failed to acknowledge order')
      console.error('Acknowledge error:', error)
    }
  }

  const getOrderPriority = (order) => {
    const createdAt = new Date(order.created_at)
    const now = new Date()
    const minutesSinceCreated = (now - createdAt) / (1000 * 60)
    
    if (minutesSinceCreated > 30) return 'high'
    if (minutesSinceCreated > 15) return 'medium'
    return 'low'
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-50'
      case 'medium': return 'border-yellow-500 bg-yellow-50'
      default: return 'border-gray-300 bg-white'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">Kitchen Display</h1>
          <p className="text-gray-600">Live kitchen order queue</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            {kitchenOrders.length} active orders
          </div>
          <button
            onClick={loadKitchenOrders}
            className="btn-outline btn-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Kitchen Orders Grid */}
      {kitchenOrders.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No active orders</h3>
            <p className="mt-1 text-sm text-gray-500">All caught up! New orders will appear here.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {kitchenOrders.map((order) => {
            const priority = getOrderPriority(order)
            const priorityColor = getPriorityColor(priority)
            
            return (
              <div key={order.id} className={`card border-2 ${priorityColor}`}>
                <div className="card-body">
                  {/* Order Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {order.order_code}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Table {order.table_number} • {order.customer_name || 'Walk-in'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`badge ${
                        order.status === 'CONFIRMED' ? 'badge-blue' : 'badge-orange'
                      }`}>
                        {order.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2 mb-4">
                    {order.items?.map((item) => (
                      <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {item.quantity}x {item.item_name}
                          </p>
                          {item.note && (
                            <p className="text-sm text-gray-500 italic">
                              Note: {item.note}
                            </p>
                          )}
                          {item.modifiers && item.modifiers.length > 0 && (
                            <p className="text-sm text-gray-500">
                              With: {item.modifiers.map(m => m.name).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Total */}
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-medium text-gray-500">Total:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {order.total.toFixed(2)} MAD
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    {order.status === 'CONFIRMED' && (
                      <button
                        onClick={() => handleAcknowledge(order.id)}
                        className="btn-primary w-full"
                      >
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                        Start Preparing
                      </button>
                    )}
                    
                    {order.status === 'PREPARING' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {/* Mark as ready */}}
                          className="btn-primary flex-1"
                        >
                          Mark Ready
                        </button>
                        <button
                          onClick={() => {/* View details */}}
                          className="btn-outline flex-1"
                        >
                          View Details
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Priority Indicator */}
                  {priority === 'high' && (
                    <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-center">
                      <p className="text-sm font-medium text-red-800">
                        ⚠️ High Priority - Overdue Order
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Kitchen Instructions */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Kitchen Instructions</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Order Flow</h3>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. Order appears when confirmed</li>
                <li>2. Click "Start Preparing" to acknowledge</li>
                <li>3. Prepare items according to specifications</li>
                <li>4. Click "Mark Ready" when complete</li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Priority Colors</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-gray-600">High Priority (30+ min)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span className="text-gray-600">Medium Priority (15+ min)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-500 rounded"></div>
                  <span className="text-gray-600">Normal Priority</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Tips</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Check special instructions carefully</li>
                <li>• Pay attention to modifiers</li>
                <li>• Update status promptly</li>
                <li>• Ask for help if unclear</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KitchenDisplayPage