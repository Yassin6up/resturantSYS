import { useState, useEffect } from 'react'
import { useCart } from '../../contexts/CartContext'
import { useNavigate } from 'react-router-dom'
import { ordersAPI } from '../../services/api'
import { 
  CheckCircleIcon,
  ArrowLeftIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'

function CheckoutPage() {
  const { items: cartItems, total, clearCart, branchId, tableNumber } = useCart()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentQRCode, setPaymentQRCode] = useState(null)
  const [orderDetails, setOrderDetails] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [customerName, setCustomerName] = useState('')
  const [searchParams] = useSearchParams()
  const table = searchParams.get("table")
  const branch = searchParams.get("branch") || "1"

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate(`/menu?table=${table}&branch=${branch}`)
    }
  }, [cartItems, navigate])

  const calculateTotals = () => {
    const subtotal = total
    const taxRate = 10
    const serviceChargeRate = 5
    
    const tax = (subtotal * taxRate) / 100
    const serviceCharge = (subtotal * serviceChargeRate) / 100
    const grandTotal = subtotal + tax + serviceCharge

    return {
      subtotal,
      tax,
      serviceCharge,
      grandTotal
    }
  }

  const handlePlaceOrder = async () => {
    if (!customerName.trim()) {
      toast.error('Please enter your name')
      return
    }

    if (!table) {
      toast.error('Table not found. Please scan the QR code at your table.')
      return
    }

    try {
      setLoading(true)
      
      const orderData = {
        branchId: parseInt(branch) || 1,
        tableNumber: table, // Send table number instead of table ID
        customerName: customerName.trim(),
        items: cartItems.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          modifiers: item.modifiers?.map(m => m.id) || [],
          note: item.note || ''
        })),
        paymentMethod: paymentMethod
      }



      console.log('🟡 FRONTEND - Before API call:');
      console.log('Full orderData:', JSON.stringify(orderData, null, 2));
      console.log('tableNumber value:', orderData.tableNumber, 'type:', typeof orderData.tableNumber);
      console.log('table value from URL:', table, 'type:', typeof table);

      const response = await ordersAPI.createOrder(orderData)
      
      if (response.data.orderId) {
        setOrderDetails(response.data)
        
        if (paymentMethod === 'cash' && response.data.paymentQrCode) {
          setPaymentQRCode(response.data.paymentQrCode)
          setShowPaymentModal(true)
        } else {
          setTimeout(() => {
            navigate(`/order-status/${response.data.orderId}?pin=${response.data.pin}`)
          }, 1500)
        }
        
        // clearCart()
        toast.success('Order placed successfully!')
      }
    } catch (error) {
      console.error('Order creation error:', error)
      if (error.response?.data?.error) {
        toast.error(error.response.data.error)
      } else {
        toast.error('Failed to place order. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const totals = calculateTotals()

  if (showPaymentModal && orderDetails) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                <CheckCircleIcon className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Order Placed!</h2>
              <p className="text-gray-600">Order #{orderDetails.orderCode}</p>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-100">
                <h3 className="font-bold text-gray-900 mb-4 text-center text-lg">
                  Show this QR code to the cashier
                </h3>
                {paymentQRCode && (
                  <div className="flex justify-center p-4 bg-white rounded-xl">
                    <img 
                      src={paymentQRCode} 
                      alt="Payment QR Code"
                      className="w-64 h-64"
                    />
                  </div>
                )}
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600 mb-1">Order Code:</p>
                  <p className="text-2xl font-bold text-gray-900">{orderDetails.orderCode}</p>
                  <p className="text-sm text-gray-600 mt-2">PIN: {orderDetails.pin}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-5">
                <h4 className="font-semibold text-gray-900 mb-3">Order Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium">{customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Table:</span>
                    <span className="font-medium">#{table}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Items:</span>
                    <span className="font-medium">{cartItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="font-medium capitalize">{orderDetails.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="text-gray-900 font-semibold">Total:</span>
                    <span className="font-bold text-blue-600">{orderDetails.total.toFixed(2)} MAD</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => navigate(`/order-status/${orderDetails.orderId}?pin=${orderDetails.pin}`)}
                  className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
                >
                  Track Order Status
                </button>
                
                <button
                  onClick={() => navigate(`/menu?table=${table}&branch=${branch}`)}
                  className="w-full py-4 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                  <span>Back to Menu</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-3xl mb-4 shadow-xl">
            <span className="text-4xl">🛒</span>
          </div>
          <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Checkout
          </h1>
          <p className="text-gray-600 font-medium">Complete your order</p>
        </div>

        <div className="space-y-6">
          
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white">Customer Information</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block font-semibold text-gray-900 mb-2">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="Enter your name"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-900 mb-2">Table Number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={table || 'Not set'}
                    readOnly
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-700 cursor-not-allowed"
                  />
                  {table && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <CheckCircleIcon className="h-6 w-6 text-green-500" />
                    </div>
                  )}
                </div>
                {table && (
                  <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                    <CheckCircleIcon className="h-4 w-4" />
                    Table detected from QR code
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white">Order Summary</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {cartItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 rounded-lg object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop';
                      }}
                    />
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <p className="text-xs text-gray-500">
                          Modifiers: {item.modifiers.map(m => m.name).join(', ')}
                        </p>
                      )}
                      {item.note && (
                        <p className="text-xs text-gray-500">Note: {item.note}</p>
                      )}
                    </div>
                    <span className="font-bold text-gray-900">
                      {item.total.toFixed(2)} MAD
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white">Payment Method</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-6 rounded-xl border-3 transition-all ${
                    paymentMethod === 'cash'
                      ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-4xl mb-2">💵</div>
                  <h3 className="font-bold text-lg text-gray-900">Cash</h3>
                  <p className="text-sm text-gray-600">Pay at cashier</p>
                </button>
                
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`p-6 rounded-xl border-3 transition-all ${
                    paymentMethod === 'card'
                      ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-4xl mb-2">💳</div>
                  <h3 className="font-bold text-lg text-gray-900">Card</h3>
                  <p className="text-sm text-gray-600">Online payment</p>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg border-2 border-blue-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Total Breakdown</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal:</span>
                <span className="font-semibold">{totals.subtotal.toFixed(2)} MAD</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Tax (10%):</span>
                <span className="font-semibold">{totals.tax.toFixed(2)} MAD</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Service Charge (5%):</span>
                <span className="font-semibold">{totals.serviceCharge.toFixed(2)} MAD</span>
              </div>
              <div className="flex justify-between text-2xl font-bold border-t-2 border-blue-200 pt-3">
                <span className="text-gray-900">Grand Total:</span>
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {totals.grandTotal.toFixed(2)} MAD
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={loading || !customerName.trim() || !table}
            className="w-full py-5 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                <span>Placing Order...</span>
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-6 w-6" />
                <span>Place Order</span>
              </>
            )}
          </button>

          <button
            onClick={() => navigate('/cart')}
            className="w-full py-4 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>Back to Cart</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default CheckoutPage