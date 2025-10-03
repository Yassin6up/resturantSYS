import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, CreditCard, Banknote, CheckCircle } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

const CheckoutPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  })

  const checkoutData = location.state

  useEffect(() => {
    if (!checkoutData) {
      navigate('/menu')
      return
    }
  }, [checkoutData, navigate])

  const handlePayment = async () => {
    if (!checkoutData) return

    setLoading(true)
    try {
      const orderData = {
        branchId: 1, // In real app, get from branch code
        tableId: 1, // In real app, get from table number
        customerName: checkoutData.customerName,
        items: checkoutData.cart.map(item => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          note: item.note,
          modifiers: item.modifiers.map(mod => mod.id)
        })),
        paymentMethod,
        clientMeta: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      }

      const response = await api.post('/orders', orderData)
      const { orderId, orderCode, qr } = response.data

      toast.success('Order placed successfully!')
      navigate(`/order/${orderId}`, {
        state: {
          orderCode,
          qr,
          total: checkoutData.total * 1.1 // Include tax
        }
      })
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to place order')
    } finally {
      setLoading(false)
    }
  }

  if (!checkoutData) {
    return null
  }

  const totalWithTax = checkoutData.total * 1.1

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => navigate('/cart')}
              className="btn-outline mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cart
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
              <p className="text-gray-600">Complete your order</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment Method */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Payment Method</h2>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                {/* Cash Payment */}
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="CASH"
                    checked={paymentMethod === 'CASH'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <div className="ml-3">
                    <div className="flex items-center">
                      <Banknote className="w-5 h-5 text-green-600 mr-2" />
                      <span className="font-medium">Pay at Cashier</span>
                    </div>
                    <p className="text-sm text-gray-600">Pay with cash when your order is ready</p>
                  </div>
                </label>

                {/* Card Payment */}
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="CARD"
                    checked={paymentMethod === 'CARD'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <div className="ml-3">
                    <div className="flex items-center">
                      <CreditCard className="w-5 h-5 text-blue-600 mr-2" />
                      <span className="font-medium">Pay with Card</span>
                    </div>
                    <p className="text-sm text-gray-600">Secure online payment</p>
                  </div>
                </label>
              </div>

              {/* Card Details Form */}
              {paymentMethod === 'CARD' && (
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="label">Card Number</label>
                    <input
                      type="text"
                      value={cardDetails.cardNumber}
                      onChange={(e) => setCardDetails(prev => ({
                        ...prev,
                        cardNumber: e.target.value.replace(/\D/g, '').slice(0, 16)
                      }))}
                      placeholder="1234 5678 9012 3456"
                      className="input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Expiry Date</label>
                      <input
                        type="text"
                        value={cardDetails.expiryDate}
                        onChange={(e) => setCardDetails(prev => ({
                          ...prev,
                          expiryDate: e.target.value.replace(/\D/g, '').slice(0, 4)
                        }))}
                        placeholder="MM/YY"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">CVV</label>
                      <input
                        type="text"
                        value={cardDetails.cvv}
                        onChange={(e) => setCardDetails(prev => ({
                          ...prev,
                          cvv: e.target.value.replace(/\D/g, '').slice(0, 3)
                        }))}
                        placeholder="123"
                        className="input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardDetails.cardholderName}
                      onChange={(e) => setCardDetails(prev => ({
                        ...prev,
                        cardholderName: e.target.value
                      }))}
                      placeholder="John Doe"
                      className="input"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Order Summary</h2>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                {/* Customer Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900">Customer Information</h3>
                  <p className="text-gray-600">{checkoutData.customerName}</p>
                  <p className="text-gray-600">Table {checkoutData.table}</p>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Order Items</h3>
                  <div className="space-y-2">
                    {checkoutData.cart.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <div>
                          <span className="font-medium">{item.menuItem.name}</span>
                          <span className="text-gray-600 ml-2">x{item.quantity}</span>
                          {item.modifiers.length > 0 && (
                            <div className="text-xs text-gray-500">
                              + {item.modifiers.map(mod => mod.name).join(', ')}
                            </div>
                          )}
                        </div>
                        <span className="font-medium">
                          {(item.menuItem.price * item.quantity + 
                            item.modifiers.reduce((sum, mod) => sum + mod.extra_price, 0) * item.quantity
                          ).toFixed(2)} MAD
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Special Instructions */}
                {checkoutData.notes && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-900">Special Instructions</h3>
                    <p className="text-blue-800 text-sm">{checkoutData.notes}</p>
                  </div>
                )}

                {/* Totals */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{checkoutData.total.toFixed(2)} MAD</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Tax (10%):</span>
                    <span className="font-medium">{(checkoutData.total * 0.1).toFixed(2)} MAD</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>{totalWithTax.toFixed(2)} MAD</span>
                  </div>
                </div>

                {/* Place Order Button */}
                <button
                  onClick={handlePayment}
                  disabled={loading || (paymentMethod === 'CARD' && !cardDetails.cardNumber)}
                  className="w-full btn-primary text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Place Order
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  By placing this order, you agree to our terms and conditions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutPage