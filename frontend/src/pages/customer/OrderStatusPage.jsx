import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import { 
  CheckCircleIcon, 
  ClockIcon,
  FireIcon,
  TruckIcon,
  HomeIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import io from 'socket.io-client'

function OrderStatusPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderPin = searchParams.get('pin')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    if (orderId) {
      loadOrder()
      setupSocketConnection()
    }

    return () => {
      if (socket) socket.disconnect()
    }
  }, [orderId])

  const setupSocketConnection = () => {
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001')
    
    newSocket.on('connect', () => {
      console.log('Connected to order status updates')
    })

    newSocket.on('order.updated', (updatedOrder) => {
      if (updatedOrder.id === parseInt(orderId)) {
        setOrder(updatedOrder)
        toast.success(`Order status updated: ${updatedOrder.status}`)
      }
    })

    newSocket.on('order.paid', (paidOrder) => {
      if (paidOrder.id === parseInt(orderId)) {
        setOrder(paidOrder)
        toast.success('Payment confirmed! Your order is being prepared.')
      }
    })

    setSocket(newSocket)
  }

  const loadOrder = async () => {
    try {
      setLoading(true)
      const url = orderPin 
        ? `/api/orders/${orderId}?pin=${orderPin}`
        : `/api/orders/${orderId}`
      const response = await api.get(url)
      setOrder(response.data.order)
    } catch (error) {
      toast.error('Failed to load order details')
      console.error('Order load error:', error)
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
      { key: 'PREPARING', label: 'Preparing', icon: FireIcon },
      { key: 'READY', label: 'Ready', icon: CheckCircleIcon },
      { key: 'SERVED', label: 'Served', icon: HomeIcon }
    ]

    const statusOrder = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED']
    const currentIndex = statusOrder.indexOf(order?.status || 'PENDING')

    return allSteps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex - 1 || order?.status === 'COMPLETED',
      active: step.key === order?.status || (order?.status === 'COMPLETED' && index === allSteps.length - 1)
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-16 w-16 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
          <p className="text-gray-600 font-medium">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Order Not Found</h2>
          <p className="text-gray-600 mb-8">We couldn't find the order you're looking for.</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <button
          onClick={() => navigate('/menu')}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span>Back to Menu</span>
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-3xl mb-4 shadow-xl">
            <StatusIcon className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Order Status
          </h1>
          <p className="text-gray-600 font-medium">Order #{order.order_code}</p>
        </div>

        <div className="space-y-6">
          
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

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white">Order Details</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Table Number</p>
                  <p className="font-bold text-gray-900">#{order.table_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Payment Status</p>
                  <p className={`font-bold ${order.payment_status === 'PAID' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {order.payment_status}
                  </p>
                </div>
              </div>

              <h3 className="font-bold text-gray-900 mb-3">Items Ordered</h3>
              <div className="space-y-3">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-semibold text-gray-900">{item.item_name}</p>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-bold text-gray-900">
                      {(item.quantity * item.unit_price).toFixed(2)} MAD
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t-2 border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-900">Total:</span>
                  <span className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {order.total.toFixed(2)} MAD
                  </span>
                </div>
              </div>
            </div>
          </div>

          {order.status === 'READY' && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 text-center">
              <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-green-900 mb-2">Your Order is Ready!</h3>
              <p className="text-green-700 font-medium">Please collect your order from the counter</p>
            </div>
          )}

          <button
            onClick={() => navigate('/menu')}
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
