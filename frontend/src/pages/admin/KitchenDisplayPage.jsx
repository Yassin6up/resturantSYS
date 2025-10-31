import React, { useState, useEffect, useRef } from 'react'
import { ordersAPI } from '../../services/api'
import { useSocket } from '../../contexts/SocketContext'
import { 
  ClockIcon, 
  CheckIcon, 
  ExclamationTriangleIcon,
  PrinterIcon,
  EyeIcon,
  FireIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useReactToPrint } from 'react-to-print'

// Kitchen Order Print Component
const KitchenOrderPrint = React.forwardRef(({ order, urgency, currentTime }, ref) => {
  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'very-late': return 'bg-red-500 text-white'
      case 'late': return 'bg-orange-500 text-white'
      case 'new': return 'bg-green-500 text-white'
      default: return 'bg-blue-500 text-white'
    }
  }

  const getUrgencyText = (urgency) => {
    switch (urgency) {
      case 'very-late': return 'VERY LATE - URGENT'
      case 'late': return 'LATE - PRIORITY'
      case 'new': return 'NEW ORDER'
      default: return 'NORMAL'
    }
  }

  const calculateWaitTime = (createdAt) => {
    const created = new Date(createdAt)
    const diffMs = currentTime - created
    const diffMins = Math.floor(diffMs / 60000)
    return diffMins
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  return (
    <div ref={ref} className="p-4 bg-white" style={{ 
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      width: '80mm'
    }}>
      {/* Header */}
      <div className="text-center border-b-2 border-gray-800 pb-2 mb-3">
        <h1 className="text-lg font-bold uppercase">KITCHEN ORDER</h1>
        <div className={`inline-block px-2 py-1 rounded text-xs font-bold mt-1 ${getUrgencyColor(urgency)}`}>
          {getUrgencyText(urgency)}
        </div>
      </div>

      {/* Order Info */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div>
          <p><strong>Order:</strong> #{order.order_code}</p>
          <p><strong>Table:</strong> {order.table_number || 'TAKEAWAY'}</p>
          <p><strong>Customer:</strong> {order.customer_name || 'WALK-IN'}</p>
        </div>
        <div className="text-right">
          <p><strong>Time:</strong> {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
          <p><strong>Wait:</strong> {calculateWaitTime(order.created_at)}min</p>
          <p><strong>Status:</strong> {order.status}</p>
        </div>
      </div>

      {/* Items */}
      <table className="w-full border-collapse border border-gray-300 mb-3 text-xs">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="border border-gray-300 p-1 text-left">Qty</th>
            <th className="border border-gray-300 p-1 text-left">Item</th>
            <th className="border border-gray-300 p-1 text-left">Price</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item, index) => {
            const itemTotal = (item.unit_price * item.quantity) + 
              (item.modifiers?.reduce((sum, mod) => sum + mod.extra_price, 0) * item.quantity || 0)
            
            return (
              <tr key={index}>
                <td className="border border-gray-300 p-1 text-center font-bold">
                  {item.quantity}x
                </td>
                <td className="border border-gray-300 p-1">
                  <div className="font-semibold">{item.menu_item_name || item.item_name}</div>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="text-xs text-gray-600">
                      + {item.modifiers.map(mod => mod.name).join(', ')}
                    </div>
                  )}
                  {item.note && (
                    <div className="text-xs text-blue-600 font-medium">
                      Note: {item.note}
                    </div>
                  )}
                </td>
                <td className="border border-gray-300 p-1 text-right">
                  {formatCurrency(itemTotal)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div className="border-t border-gray-800 pt-2 mb-3">
        <div className="flex justify-between text-sm font-bold">
          <span>SUBTOTAL:</span>
          <span>{formatCurrency(order.total - (order.tax || 0) - (order.service_charge || 0))}</span>
        </div>
        {order.tax > 0 && (
          <div className="flex justify-between text-xs">
            <span>Tax:</span>
            <span>{formatCurrency(order.tax)}</span>
          </div>
        )}
        {order.service_charge > 0 && (
          <div className="flex justify-between text-xs">
            <span>Service:</span>
            <span>{formatCurrency(order.service_charge)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold border-t border-gray-300 mt-1 pt-1">
          <span>TOTAL:</span>
          <span>{formatCurrency(order.total)}</span>
        </div>
      </div>

      {/* Special Instructions */}
      {order.items?.some(item => item.note) && (
        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
          <h3 className="font-bold mb-1">SPECIAL INSTRUCTIONS:</h3>
          {order.items?.filter(item => item.note).map((item, index) => (
            <p key={index} className="mb-1">
              <strong>{item.menu_item_name}:</strong> {item.note}
            </p>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="text-center border-t border-gray-800 pt-2 text-xs">
        <p>Printed: {new Date(currentTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
        <p className="text-gray-600">Kitchen Display System</p>
      </div>
    </div>
  )
})

function KitchenDisplayPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [currentTime, setCurrentTime] = useState(new Date())
  const { socket } = useSocket()
  const [printOrder, setPrintOrder] = useState(null)
  const printRef = useRef()
  const audioRef = useRef(null)

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Kitchen-Order-${printOrder?.order_code}`,
    onAfterPrint: () => setPrintOrder(null),
    pageStyle: `
      @media print {
        @page { size: 80mm; margin: 0; }
        body { margin: 0; }
        * { -webkit-print-color-adjust: exact; }
      }
    `,
  })

  useEffect(() => {
    if (printOrder) {
      setTimeout(() => {
        handlePrint()
      }, 100)
    }
  }, [printOrder, handlePrint])

  useEffect(() => {
    loadOrders()
  }, [])

  useEffect(() => {
    if (socket) {
      // Join kitchen room for real-time updates
      socket.emit('join-kitchen', 1) // branchId = 1

      // Listen for order updates
      socket.on('order.created', handleOrderCreated)
      socket.on('order.paid', handleOrderCreated) // When order is paid, treat it as new order
      socket.on('order.updated', handleOrderUpdated)
      socket.on('order.confirmed', handleOrderConfirmed)
      socket.on('order.status.updated', handleOrderStatusUpdated)

      return () => {
        socket.emit('leave-kitchen')
        socket.off('order.created')
        socket.off('order.paid')
        socket.off('order.updated')
        socket.off('order.confirmed')
        socket.off('order.status.updated')
      }
    }
  }, [socket])

  // Play notification sound
  const playNotificationSound = () => {
    try {
      // Create audio context and play a beep sound
      if (!audioRef.current) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.value = 800
        oscillator.type = 'sine'
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
        
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.5)
        
        // Play three beeps
        setTimeout(() => {
          const osc2 = audioContext.createOscillator()
          const gain2 = audioContext.createGain()
          osc2.connect(gain2)
          gain2.connect(audioContext.destination)
          osc2.frequency.value = 800
          osc2.type = 'sine'
          gain2.gain.setValueAtTime(0.3, audioContext.currentTime)
          gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
          osc2.start(audioContext.currentTime)
          osc2.stop(audioContext.currentTime + 0.5)
        }, 200)
        
        setTimeout(() => {
          const osc3 = audioContext.createOscillator()
          const gain3 = audioContext.createGain()
          osc3.connect(gain3)
          gain3.connect(audioContext.destination)
          osc3.frequency.value = 1000
          osc3.type = 'sine'
          gain3.gain.setValueAtTime(0.3, audioContext.currentTime)
          gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.7)
          osc3.start(audioContext.currentTime)
          osc3.stop(audioContext.currentTime + 0.7)
        }, 400)
      }
      toast.success('🔔 New Order Received!', {
        duration: 3000,
        style: {
          background: '#10B981',
          color: '#fff',
          fontSize: '16px',
          fontWeight: 'bold'
        }
      })
    } catch (error) {
      console.error('Error playing sound:', error)
    }
  }

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
    console.log('🔔 New order received in kitchen:', order)
    setOrders(prev => [order, ...prev])
    playNotificationSound()
  }

  const handleOrderUpdated = (updatedOrder) => {
    setOrders(prev => prev.map(order => 
      order.id === updatedOrder.id ? { ...updatedOrder, updated_at: new Date().toISOString() } : order
    ))
  }

  const handleOrderConfirmed = (order) => {
    setOrders(prev => [order, ...prev])
  }

  const handleOrderStatusUpdated = ({ orderId, status }) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status, updated_at: new Date().toISOString() } : order
    ))
  }

  const updateOrderStatus = async (orderId, status) => {
    try {
      const response = await ordersAPI.updateOrderStatus(orderId, status)
      if (response.data.success) {
        toast.success(`Order status updated to ${status}`)
        // Socket will handle the real-time update
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

  const getOrderUrgency = (order) => {
    const created = new Date(order.created_at)
    const diffMs = currentTime - created
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins > 30) return 'very-late'
    if (diffMins > 15) return 'late'
    if (diffMins <= 5) return 'new'
    return 'normal'
  }

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'very-late':
        return 'border-l-red-500 bg-red-50 hover:bg-red-100'
      case 'late':
        return 'border-l-orange-500 bg-orange-50 hover:bg-orange-100'
      case 'new':
        return 'border-l-green-500 bg-green-50 hover:bg-green-100'
      default:
        return 'border-l-blue-500 bg-blue-50 hover:bg-blue-100'
    }
  }

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'very-late':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'late':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'new':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getUrgencyIcon = (urgency) => {
    switch (urgency) {
      case 'very-late':
        return <FireIcon className="h-4 w-4 text-red-600" />
      case 'late':
        return <ExclamationTriangleIcon className="h-4 w-4 text-orange-600" />
      case 'new':
        return <ClockIcon className="h-4 w-4 text-green-600" />
      default:
        return <ClockIcon className="h-4 w-4 text-blue-600" />
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

  const getTimeElapsed = (createdAt) => {
    const created = new Date(createdAt)
    const diffMs = currentTime - created
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    
    const diffHours = Math.floor(diffMins / 60)
    return `${diffHours}h ${diffMins % 60}m ago`
  }

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true
    return order.status === filter
  })

  // Sort orders by urgency and time
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const urgencyA = getOrderUrgency(a)
    const urgencyB = getOrderUrgency(b)
    
    const urgencyOrder = { 'very-late': 0, 'late': 1, 'new': 2, 'normal': 3 }
    
    if (urgencyOrder[urgencyA] !== urgencyOrder[urgencyB]) {
      return urgencyOrder[urgencyA] - urgencyOrder[urgencyB]
    }
    
    return new Date(a.created_at) - new Date(b.created_at)
  })

  // Statistics
  const stats = {
    total: orders.length,
    confirmed: orders.filter(o => o.status === 'CONFIRMED').length,
    preparing: orders.filter(o => o.status === 'PREPARING').length,
    ready: orders.filter(o => o.status === 'READY').length,
    veryLate: orders.filter(o => getOrderUrgency(o) === 'very-late').length,
    late: orders.filter(o => getOrderUrgency(o) === 'late').length,
    new: orders.filter(o => getOrderUrgency(o) === 'new').length,
    normal: orders.filter(o => getOrderUrgency(o) === 'normal').length,
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
      {/* Print Component (hidden) */}
      {printOrder && (
        <div className="hidden">
          <KitchenOrderPrint 
            ref={printRef} 
            order={printOrder} 
            urgency={getOrderUrgency(printOrder)} 
            currentTime={currentTime}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Kitchen Display</h1>
          <p className="text-gray-600 mt-2">
            Real-time order management • {currentTime.toLocaleTimeString()}
          </p>
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
            Confirmed ({stats.confirmed})
          </button>
          <button
            onClick={() => setFilter('PREPARING')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'PREPARING'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Preparing ({stats.preparing})
          </button>
          <button
            onClick={() => setFilter('READY')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'READY'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Ready ({stats.ready})
          </button>
        </div>
      </div>

      {/* Urgency Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center bg-green-50 border-green-200">
          <div className="card-body">
            <div className="text-2xl font-bold text-green-600">{stats.new}</div>
            <div className="text-sm text-green-700">New (0-5min)</div>
          </div>
        </div>
        
        <div className="card text-center bg-blue-50 border-blue-200">
          <div className="card-body">
            <div className="text-2xl font-bold text-blue-600">{stats.normal}</div>
            <div className="text-sm text-blue-700">Normal (6-15min)</div>
          </div>
        </div>
        
        <div className="card text-center bg-orange-50 border-orange-200">
          <div className="card-body">
            <div className="text-2xl font-bold text-orange-600">{stats.late}</div>
            <div className="text-sm text-orange-700">Late (16-30min)</div>
          </div>
        </div>
        
        <div className="card text-center bg-red-50 border-red-200">
          <div className="card-body">
            <div className="text-2xl font-bold text-red-600">{stats.veryLate}</div>
            <div className="text-sm text-red-700">Very Late (30+ min)</div>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {sortedOrders.map((order) => {
          const urgency = getOrderUrgency(order)
          return (
            <div
              key={order.id}
              className={`card border-l-4 ${getUrgencyColor(urgency)} hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]`}
            >
              <div className="card-body">
                {/* Order Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      {getUrgencyIcon(urgency)}
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{order.order_code}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600">Table {order.table_number || 'Takeaway'}</p>
                    <p className="text-xs text-gray-500">{order.customer_name || 'Walk-in Customer'}</p>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                    <span className={`badge ${getUrgencyBadge(urgency)} text-xs mt-1`}>
                      {urgency === 'very-late' ? 'URGENT' : 
                       urgency === 'late' ? 'PRIORITY' : 
                       urgency === 'new' ? 'NEW' : 'NORMAL'}
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
                    <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200">
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
                    onClick={() => setPrintOrder(order)}
                    className="btn-outline btn-sm"
                    title="Print Kitchen Ticket"
                  >
                    <PrinterIcon className="h-4 w-4" />
                  </button>
                </div>

                {/* Order Total */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total:</span>
                    <span className="text-lg font-bold text-blue-600">
                      {order.total?.toFixed(2)} MAD
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
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

      {/* Kitchen Status Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="card-body">
            <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
            <div className="text-sm text-gray-600">Confirmed</div>
          </div>
        </div>
        
        <div className="card text-center">
          <div className="card-body">
            <div className="text-2xl font-bold text-orange-600">{stats.preparing}</div>
            <div className="text-sm text-gray-600">Preparing</div>
          </div>
        </div>
        
        <div className="card text-center">
          <div className="card-body">
            <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
            <div className="text-sm text-gray-600">Ready</div>
          </div>
        </div>
        
        <div className="card text-center">
          <div className="card-body">
            <div className="text-2xl font-bold text-gray-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Active</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KitchenDisplayPage