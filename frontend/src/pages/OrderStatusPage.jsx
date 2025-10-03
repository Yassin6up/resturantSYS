import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import socketService from '../services/socket'
import QRCode from 'qrcode.react'
import {
  CheckCircleIcon,
  ClockIcon,
  FireIcon,
  TruckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '../components/LoadingSpinner'

const OrderStatusPage = () => {
  const { orderId } = useParams()
  const [searchParams] = useSearchParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const orderCode = searchParams.get('code')

  useEffect(() => {
    fetchOrder()
    
    // Connect to socket for real-time updates
    socketService.connect()
    socketService.on('order.updated', handleOrderUpdate)
    
    return () => {
      socketService.off('order.updated', handleOrderUpdate)
    }
  }, [orderId, orderCode])

  const fetchOrder = async () => {
    try {
      setLoading(true)
      let response
      
      if (orderCode) {
        response = await api.get(`/orders/code/${orderCode}`)
      } else {
        response = await api.get(`/orders/${orderId}`)
      }
      
      setOrder(response.data.data)
      setError(null)
    } catch (error) {
      console.error('Error fetching order:', error)
      setError('Failed to load order information')
    } finally {
      setLoading(false)
    }
  }

  const handleOrderUpdate = (updatedOrder) => {
    if (updatedOrder.id === parseInt(orderId)) {
      setOrder(updatedOrder)
    }
  }

  const getStatusInfo = (status) => {
    const statusMap = {
      'SUBMITTED': {
        icon: ClockIcon,
        text: 'Order Submitted',
        description: 'Your order has been received and is waiting for confirmation.',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100'
      },
      'PENDING': {
        icon: ClockIcon,
        text: 'Pending Confirmation',
        description: 'Waiting for cashier confirmation.',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100'
      },
      'CONFIRMED': {
        icon: CheckCircleIcon,
        text: 'Order Confirmed',
        description: 'Your order has been confirmed and sent to the kitchen.',
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      },
      'PREPARING': {
        icon: FireIcon,
        text: 'Preparing',
        description: 'Our kitchen is preparing your delicious meal.',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100'
      },
      'READY': {
        icon: TruckIcon,
        text: 'Ready for Pickup',
        description: 'Your order is ready! Please come to the counter.',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
      },
      'SERVED': {
        icon: CheckCircleIcon,
        text: 'Served',
        description: 'Your order has been served. Enjoy your meal!',
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      },
      'COMPLETED': {
        icon: CheckCircleIcon,
        text: 'Completed',
        description: 'Thank you for dining with us!',
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      },
      'CANCELLED': {
        icon: ExclamationTriangleIcon,
        text: 'Cancelled',
        description: 'This order has been cancelled.',
        color: 'text-red-600',
        bgColor: 'bg-red-100'
      }
    }

    return statusMap[status] || statusMap['SUBMITTED']
  }

  const formatPrice = (price) => {
    return `${price.toFixed(2)} MAD`
  }

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h2>
          <p className="text-gray-600 mb-8">{error || 'The order you\'re looking for doesn\'t exist.'}</p>
          <a href="/menu" className="btn-primary">
            Back to Menu
          </a>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusInfo(order.status)
  const StatusIcon = statusInfo.icon

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Order Status
            </h1>
            <p className="text-lg text-gray-600">
              Order #{order.order_code}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Status Card */}
          <div className="card text-center">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${statusInfo.bgColor} mb-4`}>
              <StatusIcon className={`h-8 w-8 ${statusInfo.color}`} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {statusInfo.text}
            </h2>
            <p className="text-gray-600 mb-4">
              {statusInfo.description}
            </p>
            <p className="text-sm text-gray-500">
              Ordered at {formatDateTime(order.created_at)}
            </p>
          </div>

          {/* QR Code for Cashier */}
          <div className="card text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Show this QR code to the cashier
            </h3>
            <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
              <QRCode
                value={`${window.location.origin}/order/${order.id}?code=${order.order_code}`}
                size={200}
                level="M"
                includeMargin={true}
              />
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Order Code: <span className="font-mono font-bold">{order.order_code}</span>
            </p>
          </div>

          {/* Order Details */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Order Details
            </h3>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Table:</span>
                <span>{order.table_number}</span>
              </div>
              {order.customer_name && (
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Customer:</span>
                  <span>{order.customer_name}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600">
                <span>Payment:</span>
                <span className="capitalize">{order.payment_method}</span>
              </div>
            </div>

            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {item.quantity}x {item.item_name}
                    </h4>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <p className="text-sm text-gray-600">
                        Add-ons: {item.modifiers.map(m => m.modifier_name).join(', ')}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-sm text-gray-600">
                        Note: {item.notes}
                      </p>
                    )}
                  </div>
                  <span className="font-medium text-gray-900">
                    {formatPrice(item.unit_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatPrice(order.subtotal)}</span>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">{formatPrice(order.tax)}</span>
                </div>
              )}
              {order.service_charge > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service charge</span>
                  <span className="font-medium">{formatPrice(order.service_charge)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                <span>Total</span>
                <span className="text-primary-600">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="text-center">
            <a
              href="/menu"
              className="btn-outline mr-4"
            >
              Order More
            </a>
            <button
              onClick={() => window.print()}
              className="btn-secondary"
            >
              Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderStatusPage