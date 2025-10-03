import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCart } from '../../contexts/CartContext'
import { ordersAPI } from '../../services/api'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'

function CheckoutPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const table = searchParams.get('table') || 'T1'
  const branch = searchParams.get('branch') || 'CAS'
  
  const { items, total, clearCart } = useCart()
  const [customerName, setCustomerName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [loading, setLoading] = useState(false)
  const [orderResult, setOrderResult] = useState(null)

  const handleSubmitOrder = async (e) => {
    e.preventDefault()
    
    if (!customerName.trim()) {
      toast.error('Please enter your name')
      return
    }

    if (items.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    setLoading(true)

    try {
      const orderData = {
        branchId: 1, // Default branch
        tableId: parseInt(table.replace('T', '')), // Convert T1 to 1
        customerName: customerName.trim(),
        items: items.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          note: item.note,
          modifiers: item.modifiers.map(m => m.id)
        })),
        paymentMethod,
        clientMeta: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      }

      const response = await ordersAPI.createOrder(orderData)
      const { orderId, orderCode, qr, status } = response.data

      setOrderResult({
        orderId,
        orderCode,
        qr,
        status,
        customerName,
        total
      })

      // Clear cart after successful order
      clearCart()
      
      toast.success('Order placed successfully!')
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to place order'
      toast.error(message)
      console.error('Order creation error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (orderResult) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="card">
          <div className="card-body">
            {/* Success Icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Confirmed!</h1>
            
            <div className="space-y-4 mb-8">
              <div>
                <p className="text-sm text-gray-500">Order Code</p>
                <p className="text-xl font-semibold text-gray-900">{orderResult.orderCode}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="text-lg text-gray-900">{orderResult.customerName}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-xl font-bold text-primary-600">{orderResult.total.toFixed(2)} MAD</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className="badge-warning">{orderResult.status}</span>
              </div>
            </div>

            {/* Order QR Code */}
            <div className="qr-code-container mb-8">
              <p className="text-sm text-gray-500 mb-4">Show this QR code to the cashier</p>
              <QRCodeSVG
                value={orderResult.qr}
                size={200}
                level="M"
                includeMargin={true}
              />
              <p className="text-xs text-gray-400 mt-2">Order #{orderResult.orderId}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate(`/order/${orderResult.orderId}`)}
                className="btn-primary w-full"
              >
                Track Order Status
              </button>
              
              <button
                onClick={() => {
                  setOrderResult(null)
                  navigate('/menu')
                }}
                className="btn-outline w-full"
              >
                Order Again
              </button>
            </div>

            <div className="mt-8 text-sm text-gray-500">
              <p>Your order has been sent to the kitchen</p>
              <p>Please pay at the cashier when ready</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

      {/* Order Summary */}
      <div className="card mb-8">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
        </div>
        <div className="card-body">
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-center">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {item.quantity}x {item.menuItem.name}
                  </p>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <p className="text-sm text-gray-500">
                      With: {item.modifiers.map(m => m.name).join(', ')}
                    </p>
                  )}
                </div>
                <p className="font-medium text-gray-900">
                  {item.total.toFixed(2)} MAD
                </p>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-200 mt-4 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Total:</span>
              <span className="text-xl font-bold text-primary-600">
                {total.toFixed(2)} MAD
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Form */}
      <form onSubmit={handleSubmitOrder} className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
        </div>
        <div className="card-body space-y-6">
          {/* Customer Name */}
          <div>
            <label className="form-label">Your Name *</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter your name"
              className="form-input"
              required
            />
          </div>

          {/* Table Info */}
          <div>
            <label className="form-label">Table</label>
            <input
              type="text"
              value={table}
              className="form-input bg-gray-50"
              disabled
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="form-label">Payment Method</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="CASH"
                  checked={paymentMethod === 'CASH'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="form-radio text-primary-600"
                />
                <span className="ml-2 text-gray-700">Pay at Cashier</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="CARD"
                  checked={paymentMethod === 'CARD'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="form-radio text-primary-600"
                />
                <span className="ml-2 text-gray-700">Pay Online (Card)</span>
              </label>
            </div>
            {paymentMethod === 'CARD' && (
              <p className="text-sm text-gray-500 mt-2">
                You'll be redirected to a secure payment page
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading || items.length === 0}
              className="btn-primary w-full btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="loading-spinner mr-2"></div>
                  Placing Order...
                </>
              ) : (
                `Place Order - ${total.toFixed(2)} MAD`
              )}
            </button>
            
            <button
              type="button"
              onClick={() => navigate('/cart')}
              className="btn-outline w-full"
            >
              Back to Cart
            </button>
          </div>
        </div>
      </form>

      {/* Info */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>Your order will be prepared fresh!</p>
        <p>Estimated preparation time: 15-20 minutes</p>
      </div>
    </div>
  )
}

export default CheckoutPage