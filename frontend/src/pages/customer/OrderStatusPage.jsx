import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api  from '../../services/api'
import { useSocket } from '../../contexts/SocketContext'
import { 
  CheckCircleIcon, 
  ClockIcon,
  FireIcon,
  TruckIcon,
  HomeIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  WifiIcon,
  PhotoIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
function OrderStatusPage() {
      const [searchParams] = useSearchParams()

  const navigate = useNavigate()
  const orderPin = searchParams.get('pin')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const table = searchParams.get("table")
  const branch = searchParams.get("branch") || "1"

  // Use your existing socket context
  const { socket, isConnected, orders } = useSocket()

  useEffect(() => {
    if (orderPin) {
      loadOrderByPin()
    } else {
      setError('No order PIN provided')
      setLoading(false)
    }
  }, [orderPin])

  // Listen for order updates from socket
  useEffect(() => {
    if (!socket || !order) return

    const handleOrderUpdated = (updatedOrder) => {
      console.log('Order update received:', updatedOrder)
      if (updatedOrder.id === order.id) {
        setOrder(updatedOrder)
        toast.success(`Order status updated: ${updatedOrder.status}`)
      }
    }

    const handleOrderPaid = (paidOrder) => {
      console.log('Payment update received:', paidOrder)
      if (paidOrder.id === order.id) {
        setOrder(paidOrder)
        toast.success('Payment confirmed! Your order is being prepared.')
      }
    }

    const handleOrderConfirmed = (confirmedOrder) => {
      console.log('Order confirmed:', confirmedOrder)
      if (confirmedOrder.id === order.id) {
        setOrder(confirmedOrder)
        toast.success('Order confirmed and sent to kitchen!')
      }
    }

    // Listen for order events
    socket.on('order.updated', handleOrderUpdated)
    socket.on('order.paid', handleOrderPaid)
    socket.on('order.confirmed', handleOrderConfirmed)
    socket.on('payment.recorded', (data) => {
      if (data.orderId === order.id) {
        loadOrderByPin() // Reload to get updated payment status
        toast.success('Payment recorded successfully!')
      }
    })

    // Cleanup listeners
    return () => {
      socket.off('order.updated', handleOrderUpdated)
      socket.off('order.paid', handleOrderPaid)
      socket.off('order.confirmed', handleOrderConfirmed)
      socket.off('payment.recorded')
    }
  }, [socket, order])

  // Also check if order exists in socket context orders
  useEffect(() => {
    if (orders.length > 0 && order) {
      const socketOrder = orders.find(o => o.id === order.id)
      if (socketOrder && socketOrder.updated_at > order.updated_at) {
        setOrder(socketOrder)
      }
    }
  }, [orders, order])

  const loadOrderByPin = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!orderPin) {
        throw new Error('No order PIN provided')
      }
      
      const url = `/api/orders/pin/${orderPin}`
      
      console.log('📡 Fetching order by PIN:', url)
      
      const response = await api.get(url)
      console.log('📦 API Response:', response.data)

      let orderData = null
      
      if (response.data.order) {
        orderData = response.data.order
      } else if (response.data) {
        orderData = response.data
      } else if (response.data?.data) {
        orderData = response.data.data
      }

      if (orderData) {
        console.log('✅ Setting order data:', orderData)
        setOrder(orderData)
      } else {
        throw new Error('No order data found in response')
      }

    } catch (error) {
      console.error('❌ Order load error:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load order details'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      'PENDING': 'text-yellow-600 bg-yellow-50 border-yellow-200',
      'CONFIRMED': 'text-blue-600 bg-blue-50 border-blue-200',
      'PREPARING': 'text-orange-600 bg-orange-50 border-orange-200',
      'READY': 'text-green-600 bg-green-50 border-green-200',
      'SERVED': 'text-purple-600 bg-purple-50 border-purple-200',
      'COMPLETED': 'text-green-600 bg-green-50 border-green-200',
      'CANCELLED': 'text-red-600 bg-red-50 border-red-200'
    }
    return colors[status] || 'text-gray-600 bg-gray-50 border-gray-200'
  }

  const getStatusIcon = (status) => {
    const icons = {
      'PENDING': ClockIcon,
      'CONFIRMED': CheckCircleIcon,
      'PREPARING': FireIcon,
      'READY': TruckIcon,
      'SERVED': HomeIcon,
      'COMPLETED': CheckCircleIcon,
      'CANCELLED': ClockIcon
    }
    return icons[status] || ClockIcon
  }

  const getStatusSteps = () => {
    const allSteps = [
      { key: 'PENDING', label: 'Order Placed', icon: ClockIcon },
      { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircleIcon },
      { key: 'PREPARING', label: 'Preparing', icon: FireIcon },
      { key: 'READY', label: 'Ready', icon: TruckIcon },
      { key: 'SERVED', label: 'Served', icon: HomeIcon }
    ]

    if (!order) return allSteps

    const statusOrder = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED']
    const currentIndex = statusOrder.indexOf(order.status || 'PENDING')

    return allSteps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex - 1 || order.status === 'COMPLETED',
      active: step.key === order.status || (order.status === 'COMPLETED' && index === allSteps.length - 1)
    }))
  }

  // Function to get image URL with fallback
  const getItemImage = (item) => {
    const imageUrl = item.image || item.menu_item?.image || item.menu_item_image
    
    if (imageUrl) {
      // Handle both relative and absolute URLs
      if (imageUrl.startsWith('http') || imageUrl.startsWith('/')) {
        return imageUrl
      } else {
        return `/uploads/${imageUrl}`
      }
    }
    
    return null
  }

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-16 w-16 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
          <p className="text-gray-600 font-medium">Loading order details...</p>
          <p className="text-sm text-gray-500 mt-2">PIN: {orderPin}</p>
        </div>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Error Loading Order</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-3">
            <button
              onClick={loadOrderByPin}
              className="w-full px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/menu')}
              className="w-full px-8 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render no order state
  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Order Not Found</h2>
          <p className="text-gray-600 mb-4">No order found with PIN: {orderPin}</p>
          <button
            onClick={() => navigate('/menu')}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            Back to Menu
          </button>
        </div>
      </div>
    )
  }

  const StatusIcon = getStatusIcon(order.status)
  const statusSteps = getStatusSteps()

  // Safe data access with fallbacks
  const tableNumber = order.table_number || order.table?.table_number || 'N/A'
  const items = order.items || order.order_items || []
  const total = order.total || 0
  const orderCode = order.order_code || 'N/A'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Connection status indicator */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate('/menu')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>Back to Menu</span>
          </button>
          
          <div className={`px-3 py-1 rounded-full flex items-center gap-2 text-sm font-medium ${
            isConnected 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
          }`}>
            <WifiIcon className={`h-4 w-4 ${isConnected ? 'text-green-600' : 'text-yellow-600'}`} />
            {isConnected ? 'Live Updates' : 'Connecting...'}
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-3xl mb-4 shadow-xl">
            <StatusIcon className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Order Status
          </h1>
          <p className="text-gray-600 font-medium">Order #{orderCode}</p>
          <p className="text-gray-500 text-sm">PIN: {orderPin}</p>
        </div>

        <div className="space-y-6">
          
          {/* Current Status Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white">Current Status</h2>
            </div>
            <div className="p-6">
              <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-xl border-2 ${getStatusColor(order.status)}`}>
                <StatusIcon className="h-6 w-6" />
                <span className="font-bold text-lg">{order.status}</span>
              </div>

              {order.payment_status === 'UNPAID' && (
                <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                  <p className="text-yellow-800 font-semibold flex items-center gap-2">
                    <ClockIcon className="h-5 w-5" />
                    Waiting for payment confirmation from cashier
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Progress Steps */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white">Order Progress</h2>
            </div>
            <div className="p-8">
              <div className="relative">
                <div className="absolute left-8 top-0 bottom-0 w-1 bg-gray-200"></div>
                
                <div className="space-y-8">
                  {statusSteps.map((step, index) => {
                    const StepIcon = step.icon
                    return (
                      <div key={step.key} className="relative flex items-center gap-4">
                        <div className={`relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 transition-all ${
                          step.active 
                            ? 'bg-gradient-to-br from-blue-600 to-purple-600 border-blue-600 shadow-lg scale-110' 
                            : step.completed
                            ? 'bg-green-500 border-green-500'
                            : 'bg-white border-gray-300'
                        }`}>
                          <StepIcon className={`h-8 w-8 ${
                            step.active || step.completed ? 'text-white' : 'text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <h3 className={`font-bold text-lg ${
                            step.active || step.completed ? 'text-gray-900' : 'text-gray-400'
                          }`}>
                            {step.label}
                          </h3>
                          {step.active && (
                            <p className="text-sm text-blue-600 font-semibold">In Progress...</p>
                          )}
                          {step.completed && !step.active && (
                            <p className="text-sm text-green-600 font-semibold">✓ Completed</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white">Order Details</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Table Number</p>
                  <p className="font-bold text-gray-900">#{tableNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Payment Status</p>
                  <p className={`font-bold ${order.payment_status === 'PAID' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {order.payment_status || 'UNPAID'}
                  </p>
                </div>
              </div>

              <h3 className="font-bold text-gray-900 mb-3">Items Ordered</h3>
              <div className="space-y-4">
                {items.length > 0 ? (
                  items.map((item, idx) => {
                    const itemImage = getItemImage(item)
                    const itemName = item.menu_item_name || item.name || item.menu_item?.name || `Item ${idx + 1}`
                    const quantity = item.quantity || 1
                    const unitPrice = item.unit_price || item.price || 0
                    const totalPrice = quantity * unitPrice

                    return (
                      <div key={idx} className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        {/* Item Image */}
                        <div className="flex-shrink-0">
                          {itemImage ? (
                            <img 
                              src={itemImage} 
                              alt={itemName}
                              className="w-16 h-16 rounded-lg object-cover shadow-sm"
                              onError={(e) => {
                                e.target.style.display = 'none'
                                e.target.nextElementSibling.style.display = 'flex'
                              }}
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                              <PhotoIcon className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 truncate">
                                {itemName}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                Quantity: {quantity}
                              </p>
                              {item.note && (
                                <p className="text-sm text-gray-500 italic mt-1">
                                  Note: {item.note}
                                </p>
                              )}
                            </div>
                            <p className="font-bold text-gray-900 text-lg ml-4">
                              {totalPrice.toFixed(2)} MAD
                            </p>
                          </div>
                          
                          {/* Unit Price */}
                          <div className="flex justify-between items-center mt-2">
                            <p className="text-sm text-gray-500">
                              {unitPrice.toFixed(2)} MAD each
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-gray-500 text-center py-4">No items found in this order</p>
                )}
              </div>

              {/* Order Summary */}
              <div className="mt-6 pt-4 border-t-2 border-gray-200">
                <div className="space-y-2">
                  {order.tax > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Tax:</span>
                      <span>{order.tax.toFixed(2)} MAD</span>
                    </div>
                  )}
                  {order.service_charge > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Service Charge:</span>
                      <span>{order.service_charge.toFixed(2)} MAD</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-xl font-bold text-gray-900">Total:</span>
                    <span className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {total.toFixed(2)} MAD
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ready for pickup notification */}
          {order.status === 'READY' && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 text-center">
              <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-green-900 mb-2">Your Order is Ready!</h3>
              <p className="text-green-700 font-medium">Please collect your order from the counter</p>
            </div>
          )}

          {/* Completed order notification */}
          {order.status === 'COMPLETED' && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 text-center">
              <CheckCircleIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-blue-900 mb-2">Order Completed!</h3>
              <p className="text-blue-700 font-medium">Thank you for your order!</p>
            </div>
          )}

          <button
            onClick={() => navigate(`/menu?table=${table}&branch=${branch}`)}
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            Order More Items
          </button>
        </div>
      </div>
    </div>
  )
}

export default OrderStatusPage