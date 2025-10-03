import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, Clock, QrCode, Copy, Share2 } from 'lucide-react'
import QRCode from 'qrcode.react'
import api from '../services/api'
import toast from 'react-hot-toast'

const OrderConfirmationPage = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  const orderData = location.state

  useEffect(() => {
    if (orderData) {
      setOrder(orderData)
      setLoading(false)
    } else {
      fetchOrder()
    }
  }, [orderId])

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/${orderId}`)
      setOrder(response.data)
    } catch (error) {
      toast.error('Failed to load order details')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const shareOrder = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Order - POSQ Restaurant',
          text: `Order ${order.orderCode} at POSQ Restaurant`,
          url: window.location.href
        })
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      copyToClipboard(window.location.href)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'badge-warning'
      case 'CONFIRMED':
        return 'badge-info'
      case 'PREPARING':
        return 'badge-info'
      case 'READY':
        return 'badge-success'
      case 'SERVED':
        return 'badge-success'
      case 'PAID':
        return 'badge-success'
      case 'COMPLETED':
        return 'badge-success'
      case 'CANCELLED':
        return 'badge-danger'
      default:
        return 'badge-gray'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'PENDING':
        return 'Waiting for confirmation'
      case 'CONFIRMED':
        return 'Order confirmed'
      case 'PREPARING':
        return 'Being prepared'
      case 'READY':
        return 'Ready for pickup'
      case 'SERVED':
        return 'Order served'
      case 'PAID':
        return 'Payment completed'
      case 'COMPLETED':
        return 'Order completed'
      case 'CANCELLED':
        return 'Order cancelled'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
          <p className="text-gray-600 mb-8">The order you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/menu')}
            className="btn-primary"
          >
            Back to Menu
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Order Confirmation</h1>
              <p className="text-gray-600">Thank you for your order!</p>
            </div>
            <button
              onClick={shareOrder}
              className="btn-outline"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Details */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="card">
              <div className="card-body text-center">
                <div className="flex justify-center mb-4">
                  {order.status === 'COMPLETED' ? (
                    <CheckCircle className="w-16 h-16 text-green-500" />
                  ) : (
                    <Clock className="w-16 h-16 text-blue-500" />
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Order {order.orderCode}
                </h2>
                <span className={`badge ${getStatusColor(order.status)} text-lg px-4 py-2`}>
                  {getStatusText(order.status)}
                </span>
                <p className="text-gray-600 mt-4">
                  {order.status === 'PENDING' 
                    ? 'Your order is waiting for confirmation from our staff.'
                    : order.status === 'PREPARING'
                    ? 'Our kitchen is preparing your delicious meal!'
                    : order.status === 'READY'
                    ? 'Your order is ready for pickup!'
                    : 'Thank you for choosing POSQ Restaurant!'
                  }
                </p>
              </div>
            </div>

            {/* Order Information */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold">Order Information</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Code:</span>
                    <div className="flex items-center">
                      <span className="font-medium">{order.orderCode}</span>
                      <button
                        onClick={() => copyToClipboard(order.orderCode)}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Table:</span>
                    <span className="font-medium">{order.table_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium">{order.customer_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Time:</span>
                    <span className="font-medium">
                      {new Date(order.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-bold text-lg">
                      {(order.total + (order.tax || 0) + (order.service_charge || 0)).toFixed(2)} MAD
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            {order.items && order.items.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold">Order Items</h3>
                </div>
                <div className="card-body p-0">
                  <div className="divide-y divide-gray-200">
                    {order.items.map((item, index) => (
                      <div key={index} className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{item.item_name}</h4>
                            <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                            <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                            {item.note && (
                              <p className="text-sm text-blue-600 mt-1">
                                Note: {item.note}
                              </p>
                            )}
                            {item.modifier_names && (
                              <p className="text-sm text-gray-600 mt-1">
                                + {item.modifier_names}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {(item.unit_price * item.quantity + (item.modifier_total || 0)).toFixed(2)} MAD
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* QR Code */}
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold">Order QR Code</h3>
              </div>
              <div className="card-body text-center">
                <div className="bg-white p-6 rounded-lg border-2 border-gray-200 inline-block">
                  <QRCode
                    value={order.qr || `${window.location.origin}/order/${orderId}`}
                    size={200}
                    level="M"
                    includeMargin={true}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  Show this QR code to our staff for order tracking
                </p>
                <button
                  onClick={() => copyToClipboard(order.qr || `${window.location.origin}/order/${orderId}`)}
                  className="btn-outline mt-4"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy QR Link
                </button>
              </div>
            </div>

            {/* Restaurant Info */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold">Restaurant Information</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-900">Dar Tajine Restaurant</h4>
                    <p className="text-gray-600">123 Avenue Mohammed V</p>
                    <p className="text-gray-600">Casablanca, Morocco</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Phone: +212 5 22 123 456</p>
                    <p className="text-gray-600">Email: info@dartajine.com</p>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600">
                      Thank you for choosing POSQ Restaurant! We hope you enjoy your meal.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <button
                onClick={() => navigate('/menu')}
                className="w-full btn-primary"
              >
                Order Again
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full btn-outline"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderConfirmationPage