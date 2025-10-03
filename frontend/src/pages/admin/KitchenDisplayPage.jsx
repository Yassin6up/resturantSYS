import { useState, useEffect } from 'react'
import { Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { useSocket } from '../../contexts/SocketContext'
import api from '../../services/api'
import toast from 'react-hot-toast'

const KitchenDisplayPage = () => {
  const { socket } = useSocket()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchKitchenOrders()
    
    if (socket) {
      socket.on('order.created', handleNewOrder)
      socket.on('order.updated', handleOrderUpdate)
      
      return () => {
        socket.off('order.created')
        socket.off('order.updated')
      }
    }
  }, [socket])

  const fetchKitchenOrders = async () => {
    try {
      const response = await api.get('/orders?status=PREPARING&status=CONFIRMED')
      setOrders(response.data)
    } catch (error) {
      toast.error('Failed to load kitchen orders')
    } finally {
      setLoading(false)
    }
  }

  const handleNewOrder = (order) => {
    if (order.status === 'CONFIRMED' || order.status === 'PREPARING') {
      setOrders(prev => [order, ...prev])
      toast.success(`New order: ${order.order_code}`)
    }
  }

  const handleOrderUpdate = (order) => {
    setOrders(prev => 
      prev.map(o => o.id === order.id ? order : o)
    )
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus })
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus }
            : order
        )
      )
      toast.success('Order status updated')
    } catch (error) {
      toast.error('Failed to update order status')
    }
  }

  const getUrgencyColor = (order) => {
    const now = new Date()
    const orderTime = new Date(order.created_at)
    const minutesElapsed = (now - orderTime) / (1000 * 60)
    
    if (minutesElapsed > 30) return 'border-red-500 bg-red-50'
    if (minutesElapsed > 15) return 'border-yellow-500 bg-yellow-50'
    return 'border-green-500 bg-green-50'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold">Kitchen Display</h1>
              <p className="text-gray-400">Live order queue for kitchen staff</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Active Orders</div>
              <div className="text-2xl font-bold text-green-400">{orders.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {orders.length === 0 ? (
          <div className="text-center py-16">
            <AlertCircle className="w-24 h-24 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-400 mb-2">No Active Orders</h2>
            <p className="text-gray-500">Waiting for new orders...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className={`border-2 rounded-lg p-6 ${getUrgencyColor(order)}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{order.order_code}</h3>
                    <p className="text-gray-600">Table {order.table_number}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === 'CONFIRMED' 
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {order.status}
                  </span>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Items:</h4>
                  <div className="space-y-1">
                    {order.items?.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-700">
                          {item.quantity}x {item.item_name}
                        </span>
                        <span className="text-gray-500">
                          {item.note && `(${item.note})`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2">
                  {order.status === 'CONFIRMED' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                      className="flex-1 btn-primary py-2"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Start Preparing
                    </button>
                  )}
                  {order.status === 'PREPARING' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'READY')}
                      className="flex-1 btn-success py-2"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Ready
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default KitchenDisplayPage