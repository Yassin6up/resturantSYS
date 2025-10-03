import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ordersAPI } from '../../services/api'
import { QRCodeSVG } from 'qrcode.react'
import { ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const statusConfig = {
  PENDING: { color: 'yellow', icon: ClockIcon, text: 'Waiting for confirmation' },
  AWAITING_PAYMENT: { color: 'blue', icon: ClockIcon, text: 'Awaiting payment' },
  CONFIRMED: { color: 'blue', icon: CheckCircleIcon, text: 'Order confirmed' },
  PREPARING: { color: 'orange', icon: ClockIcon, text: 'Being prepared' },
  READY: { color: 'green', icon: CheckCircleIcon, text: 'Ready for pickup' },
  SERVED: { color: 'purple', icon: CheckCircleIcon, text: 'Served' },
  COMPLETED: { color: 'gray', icon: CheckCircleIcon, text: 'Completed' },
  CANCELLED: { color: 'red', icon: XCircleIcon, text: 'Cancelled' }
}

function OrderStatusPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadOrder()
  }, [orderId])

  const loadOrder = async () => {
    try {
      setLoading(true)
      const response = await ordersAPI.getOrder(orderId)
      setOrder(response.data.order)
    } catch (error) {
      setError('Order not found')
      toast.error('Order not found')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const config = statusConfig[status] || statusConfig.PENDING
    return `text-${config.color}-600 bg-${config.color}-100`
  }

  const getStatusIcon = (status) => {
    const config = statusConfig[status] || statusConfig.PENDING
    return config.icon
  }

  const getStatusText = (status) => {
    const config = statusConfig[status] || statusConfig.PENDING
    return config.text
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="loading-spinner mx-auto mb-4"></div>
        <p className="text-gray-600">Loading order details...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
          <XCircleIcon className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
        <p className="text-gray-600 mb-8">The order you're looking for doesn't exist or has been removed.</p>
        <button
          onClick={() => navigate('/menu')}
          className="btn-primary"
        >
          Browse Menu
        </button>
      </div>
    )
  }

  const StatusIcon = getStatusIcon(order.status)

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Status</h1>
        <p className="text-gray-600">Order #{order.order_code}</p>
      </div>

      {/* Order Status Card */}
      <div className="card mb-8">
        <div className="card-body text-center">
          <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 ${
            order.status === 'COMPLETED' ? 'bg-green-100' :
            order.status === 'CANCELLED' ? 'bg-red-100' :
            order.status === 'READY' ? 'bg-green-100' :
            'bg-blue-100'
          }`}>
            <StatusIcon className={`h-8 w-8 ${
              order.status === 'COMPLETED' ? 'text-green-600' :
              order.status === 'CANCELLED' ? 'text-red-600' :
              order.status === 'READY' ? 'text-green-600' :
              'text-blue-600'
            }`} />
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {getStatusText(order.status)}
          </h2>
          
          <span className={`badge ${getStatusColor(order.status)}`}>
            {order.status}
          </span>
        </div>
      </div>

      {/* Order Details */}
      <div className="card mb-8">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Order Code:</span>
              <span className="font-medium">{order.order_code}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Customer:</span>
              <span className="font-medium">{order.customer_name}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Table:</span>
              <span className="font-medium">{order.table_number}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Ordered:</span>
              <span className="font-medium">
                {new Date(order.created_at).toLocaleString()}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Payment Status:</span>
              <span className={`font-medium ${
                order.payment_status === 'PAID' ? 'text-green-600' :
                order.payment_status === 'PARTIAL' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {order.payment_status}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Total:</span>
              <span className="font-bold text-lg text-primary-600">
                {order.total.toFixed(2)} MAD
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="card mb-8">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Items Ordered</h2>
        </div>
        <div className="card-body">
          <div className="space-y-3">
            {order.items?.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {item.quantity}x {item.item_name}
                  </p>
                  {item.note && (
                    <p className="text-sm text-gray-500 italic">Note: {item.note}</p>
                  )}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <p className="text-sm text-gray-500">
                      With: {item.modifiers.map(m => m.name).join(', ')}
                    </p>
                  )}
                </div>
                <p className="font-medium text-gray-900">
                  {(item.quantity * item.unit_price).toFixed(2)} MAD
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Order QR Code */}
      <div className="card mb-8">
        <div className="card-body text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order QR Code</h2>
          <div className="qr-code-container">
            <QRCodeSVG
              value={`${window.location.origin}/order/${order.id}`}
              size={200}
              level="M"
              includeMargin={true}
            />
            <p className="text-xs text-gray-400 mt-2">Show to cashier for payment</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={() => navigate('/menu')}
          className="btn-primary w-full"
        >
          Order Again
        </button>
        
        <button
          onClick={() => window.location.reload()}
          className="btn-outline w-full"
        >
          Refresh Status
        </button>
      </div>

      {/* Status Messages */}
      <div className="mt-8 text-center text-sm text-gray-500">
        {order.status === 'PENDING' && (
          <p>Your order is waiting for confirmation from the cashier.</p>
        )}
        {order.status === 'CONFIRMED' && (
          <p>Your order has been confirmed and sent to the kitchen!</p>
        )}
        {order.status === 'PREPARING' && (
          <p>Your order is being prepared by our kitchen staff.</p>
        )}
        {order.status === 'READY' && (
          <p>Your order is ready! Please come to the counter to collect it.</p>
        )}
        {order.status === 'SERVED' && (
          <p>Your order has been served. Enjoy your meal!</p>
        )}
        {order.status === 'COMPLETED' && (
          <p>Thank you for your order! We hope you enjoyed your meal.</p>
        )}
        {order.status === 'CANCELLED' && (
          <p>This order has been cancelled. Please contact staff if you have any questions.</p>
        )}
      </div>
    </div>
  )
}

export default OrderStatusPage