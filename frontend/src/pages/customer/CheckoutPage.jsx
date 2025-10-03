import { useState, useEffect } from 'react'
import { useCart } from '../../contexts/CartContext'
import { useNavigate } from 'react-router-dom'
import { ordersAPI } from '../../services/api'
import { 
  CreditCardIcon, 
  BanknotesIcon, 
  QrCodeIcon,
  CheckIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import QRCode from 'qrcode.react'
import toast from 'react-hot-toast'

function CheckoutPage() {
  const { cartItems, total, clearCart } = useCart()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [orderData, setOrderData] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [customerName, setCustomerName] = useState('')
  const [tableNumber, setTableNumber] = useState('')
  const [showQRCode, setShowQRCode] = useState(false)
  const [orderCode, setOrderCode] = useState('')
  const [pinCode, setPinCode] = useState('')

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/menu')
    }
  }, [cartItems, navigate])

  const calculateTotals = () => {
    const subtotal = total
    const taxRate = 10 // 10% tax
    const serviceChargeRate = 5 // 5% service charge
    
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

    if (!tableNumber.trim()) {
      toast.error('Please enter table number')
      return
    }

    try {
      setLoading(true)
      
      const totals = calculateTotals()
      
      const orderData = {
        branchId: 1,
        tableId: parseInt(tableNumber) || 1,
        customerName: customerName,
        items: cartItems.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          modifiers: item.modifiers?.map(m => m.id) || [],
          note: item.note || ''
        })),
        paymentMethod: paymentMethod
      }

      const response = await ordersAPI.createOrder(orderData)
      
      if (response.data.orderId) {
        setOrderData(response.data)
        setOrderCode(response.data.orderCode)
        setPinCode(response.data.pin)
        setShowQRCode(true)
        
        // Clear cart after successful order
        clearCart()
        
        toast.success('Order placed successfully!')
      }
    } catch (error) {
      console.error('Order creation error:', error)
      toast.error(error.response?.data?.error || 'Failed to place order')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentComplete = () => {
    navigate('/order/' + orderData.id)
  }

  const totals = calculateTotals()

  if (showQRCode && orderData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="card text-center">
            <div className="card-header">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckIcon className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold gradient-text mb-2">Order Placed!</h1>
              <p className="text-gray-600">Your order has been received</p>
            </div>
            
            <div className="card-body space-y-6">
              {/* Order Details */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Order Details</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Code:</span>
                    <span className="font-semibold">{orderCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Table:</span>
                    <span className="font-semibold">{tableNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-semibold">{customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-semibold text-blue-600">{totals.grandTotal.toFixed(2)} MAD</span>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Payment QR Code</h3>
                <div className="flex justify-center mb-4">
                  <QRCode 
                    value={`${window.location.origin}/order/${orderData.id}`}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <p className="text-sm text-gray-600 mb-2">Show this QR code to the cashier</p>
                <p className="text-xs text-gray-500">Or scan to view order details</p>
              </div>

              {/* PIN Code */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Payment PIN</h3>
                <div className="text-3xl font-bold text-blue-600 mb-2">{pinCode}</div>
                <p className="text-sm text-blue-700">Give this PIN to the cashier for payment</p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handlePaymentComplete}
                  className="w-full btn-primary py-3"
                >
                  <CreditCardIcon className="h-5 w-5 mr-2" />
                  Payment Complete
                </button>
                
                <button
                  onClick={() => navigate('/menu')}
                  className="w-full btn-outline py-3"
                >
                  <ArrowLeftIcon className="h-5 w-5 mr-2" />
                  Back to Menu
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CreditCardIcon className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold gradient-text mb-2">Checkout</h1>
        <p className="text-gray-600">Complete your order</p>
      </div>

      <div className="space-y-6">
        {/* Customer Information */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900">Customer Information</h2>
          </div>
          <div className="card-body space-y-4">
            <div>
              <label className="form-label">Your Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="form-input"
                placeholder="Enter your name"
                required
              />
            </div>
            <div>
              <label className="form-label">Table Number</label>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="form-input"
                placeholder="Enter table number"
                required
              />
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900">Order Summary</h2>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {cartItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <img
                      src={item.menuItem.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop'}
                      alt={item.menuItem.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div>
                      <h3 className="font-medium text-gray-900">{item.menuItem.name}</h3>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {item.total.toFixed(2)} MAD
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900">Payment Method</h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex space-x-4">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200 ${
                    paymentMethod === 'cash'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <BanknotesIcon className="h-8 w-8 mx-auto mb-2" />
                  <h3 className="font-semibold">Cash</h3>
                  <p className="text-sm text-gray-600">Pay at cashier</p>
                </button>
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200 ${
                    paymentMethod === 'card'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <CreditCardIcon className="h-8 w-8 mx-auto mb-2" />
                  <h3 className="font-semibold">Card</h3>
                  <p className="text-sm text-gray-600">Online payment</p>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Order Totals */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900">Order Totals</h2>
          </div>
          <div className="card-body">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{totals.subtotal.toFixed(2)} MAD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax (10%):</span>
                <span className="font-medium">{totals.tax.toFixed(2)} MAD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Service Charge (5%):</span>
                <span className="font-medium">{totals.serviceCharge.toFixed(2)} MAD</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                <span>Total:</span>
                <span className="text-blue-600">{totals.grandTotal.toFixed(2)} MAD</span>
              </div>
            </div>
          </div>
        </div>

        {/* Place Order Button */}
        <button
          onClick={handlePlaceOrder}
          disabled={loading || !customerName.trim() || !tableNumber.trim()}
          className="w-full btn-primary py-4 text-lg"
        >
          {loading ? (
            <>
              <div className="loading-spinner mr-2"></div>
              Placing Order...
            </>
          ) : (
            <>
              <QrCodeIcon className="h-5 w-5 mr-2" />
              Place Order
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default CheckoutPage