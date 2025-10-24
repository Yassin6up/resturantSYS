import { useState } from 'react'
import { ordersAPI } from '../../services/api'
import { 
  MagnifyingGlassIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { formatCurrency } from '../../utils/format'
import { useNavigate } from 'react-router-dom'

function OrderStatusPage() {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    if (!pin.trim()) {
      setError('Please enter your order PIN')
      return
    }

    if (pin.length !== 8) {
      setError('PIN must be 8 digits')
      return
    }

    try {
      setLoading(true)
      setError('')
      
      const response = await ordersAPI.getOrderByPin(pin)
      
      if (response.data.success) {
        setOrder(response.data.order)
      }
    } catch (error) {
      console.error('Order lookup error:', error)
      setError(error.response?.data?.error || 'Order not found')
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING':
        return <ClockIcon className="h-8 w-8 text-yellow-500" />
      case 'CONFIRMED':
        return <CheckCircleIcon className="h-8 w-8 text-blue-500" />
      case 'PREPARING':
        return <ClockIcon className="h-8 w-8 text-orange-500" />
      case 'READY':
        return <CheckCircleIcon className="h-8 w-8 text-green-500" />
      case 'SERVED':
        return <CheckCircleIcon className="h-8 w-8 text-green-600" />
      case 'PAID':
        return <CheckCircleIcon className="h-8 w-8 text-purple-500" />
      case 'COMPLETED':
        return <CheckCircleIcon className="h-8 w-8 text-green-700" />
      case 'CANCELLED':
        return <XCircleIcon className="h-8 w-8 text-red-500" />
      default:
        return <ExclamationTriangleIcon className="h-8 w-8 text-gray-500" />
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'PENDING':
        return 'Order Received'
      case 'CONFIRMED':
        return 'Order Confirmed'
      case 'PREPARING':
        return 'Preparing Your Order'
      case 'READY':
        return 'Ready for Pickup'
      case 'SERVED':
        return 'Order Served'
      case 'PAID':
        return 'Payment Complete'
      case 'COMPLETED':
        return 'Order Completed'
      case 'CANCELLED':
        return 'Order Cancelled'
      default:
        return 'Unknown Status'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-100'
      case 'CONFIRMED':
        return 'text-blue-600 bg-blue-100'
      case 'PREPARING':
        return 'text-orange-600 bg-orange-100'
      case 'READY':
        return 'text-green-600 bg-green-100'
      case 'SERVED':
        return 'text-green-700 bg-green-200'
      case 'PAID':
        return 'text-purple-600 bg-purple-100'
      case 'COMPLETED':
        return 'text-green-800 bg-green-300'
      case 'CANCELLED':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card">
          <div className="card-header text-center">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <MagnifyingGlassIcon className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Check Order Status</h1>
            <p className="text-gray-600">Enter your 8-digit order PIN</p>
          </div>
          
          <div className="card-body space-y-6">
            {/* PIN Input */}
            <div>
              <label className="form-label">Order PIN</label>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="12345678"
                  className="form-input flex-1 text-center text-2xl font-mono tracking-widest"
                  maxLength={8}
                />
                <button
                  onClick={handleSearch}
                  disabled={loading || pin.length !== 8}
                  className="btn-primary px-6"
                >
                  {loading ? (
                    <div className="loading-spinner"></div>
                  ) : (
                    <MagnifyingGlassIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              {error && (
                <p className="form-error mt-2">{error}</p>
              )}
            </div>

            {/* Order Status */}
            {order && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="text-center mb-4">
                    {getStatusIcon(order.status)}
                    <h3 className="text-xl font-bold text-gray-900 mt-2">
                      {getStatusText(order.status)}
                    </h3>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mt-2 ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Code:</span>
                      <span className="text-gray-900 font-mono">{order.orderCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">PIN:</span>
                      <span className="text-blue-600 font-bold font-mono">{order.pin}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Table:</span>
                      <span className="text-gray-900">{order.tableNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="text-blue-600 font-bold">{order.total.toFixed(2)} MAD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ordered:</span>
                      <span className="text-gray-900">
                        {new Date(order.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                {order.items && order.items.length > 0 && (
                  <div className="bg-white rounded-lg p-6 border border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Your Order</h4>
                    <div className="space-y-3">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                          <span className="text-gray-700">
                            {item.quantity}x {item.item_name}
                          </span>
                          <span className="text-gray-900 font-semibold">
                            {(item.price * item.quantity).toFixed(2)} MAD
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Messages */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-blue-800 text-sm text-center">
                    {order.status === 'PENDING' && 'Your order has been received and is being processed.'}
                    {order.status === 'CONFIRMED' && 'Your order has been confirmed and will be prepared shortly.'}
                    {order.status === 'PREPARING' && 'Our kitchen is preparing your delicious meal!'}
                    {order.status === 'READY' && 'Your order is ready! Please come to the counter.'}
                    {order.status === 'SERVED' && 'Your order has been served. Enjoy your meal!'}
                    {order.status === 'PAID' && 'Payment completed. Thank you for your order!'}
                    {order.status === 'COMPLETED' && 'Order completed successfully. Thank you!'}
                    {order.status === 'CANCELLED' && 'This order has been cancelled.'}
                  </p>
                </div>
              </div>
            )}

            {/* Back to Menu */}
            <div className="text-center">
                      <BackToMenu />
                    </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderStatusPage

        function BackToMenu() {
          const navigate = useNavigate()
          return (
            <button
              onClick={() => navigate('/menu')}
              className="btn-outline w-full"
            >
              Back to Menu
            </button>
          )
        }