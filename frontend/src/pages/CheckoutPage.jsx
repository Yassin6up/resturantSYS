import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCartStore } from '../stores/cartStore'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '../components/LoadingSpinner'

const CheckoutPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  
  const {
    items,
    tableInfo,
    customerInfo,
    updateItemQuantity,
    removeItem,
    setCustomerInfo,
    getCartTotal,
    getCartCount,
    clearCart,
    getOrderData
  } = useCartStore()

  const handleCustomerInfoChange = (field, value) => {
    setCustomerInfo({
      ...customerInfo,
      [field]: value
    })
  }

  const handleSubmitOrder = async () => {
    if (!tableInfo) {
      toast.error('Table information is missing')
      return
    }

    if (items.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    setLoading(true)
    
    try {
      const orderData = {
        ...getOrderData(),
        paymentMethod
      }

      const response = await api.post('/orders', orderData)
      const { orderId, orderCode, qr } = response.data.data

      // Clear cart
      clearCart()

      // Navigate to order status page
      navigate(`/order/${orderId}?code=${orderCode}`)
      
      toast.success('Order placed successfully!')
    } catch (error) {
      console.error('Error placing order:', error)
      toast.error(error.response?.data?.error || 'Failed to place order')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price) => {
    return `${price.toFixed(2)} MAD`
  }

  const calculateTax = (subtotal) => {
    return subtotal * 0.20 // 20% VAT
  }

  const calculateServiceCharge = (subtotal) => {
    return subtotal * 0.10 // 10% service charge
  }

  const subtotal = getCartTotal()
  const tax = calculateTax(subtotal)
  const serviceCharge = calculateServiceCharge(subtotal)
  const total = subtotal + tax + serviceCharge

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
          <p className="text-gray-600 mb-8">Add some delicious items from our menu</p>
          <button
            onClick={() => navigate('/menu')}
            className="btn-primary"
          >
            Browse Menu
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/menu')}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
              {tableInfo && (
                <p className="text-sm text-gray-600">
                  Table {tableInfo.table_number}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Customer Information */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Customer Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={customerInfo.name}
                  onChange={(e) => handleCustomerInfoChange('name', e.target.value)}
                  className="input"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone (optional)
                </label>
                <input
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) => handleCustomerInfoChange('phone', e.target.value)}
                  className="input"
                  placeholder="Your phone number"
                />
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Order Summary ({getCartCount()} items)
            </h2>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.menuItem.name}</h3>
                    
                    {item.modifiers.length > 0 && (
                      <div className="mt-1">
                        <p className="text-sm text-gray-600">
                          Add-ons: {item.modifiers.map(m => m.name).join(', ')}
                        </p>
                      </div>
                    )}
                    
                    {item.notes && (
                      <p className="text-sm text-gray-600 mt-1">
                        Note: {item.notes}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                          className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                        >
                          <MinusIcon className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                          className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {formatPrice(item.totalPrice)}
                        </span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Payment Method
            </h2>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="CASH"
                  checked={paymentMethod === 'CASH'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="ml-3 text-sm font-medium text-gray-900">
                  Pay at cashier (Cash)
                </span>
              </label>
              
              <label className="flex items-center opacity-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="CARD"
                  disabled
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="ml-3 text-sm font-medium text-gray-900">
                  Pay by card (Coming soon)
                </span>
              </label>
            </div>
          </div>

          {/* Order Total */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Order Total
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax (20%)</span>
                <span className="font-medium">{formatPrice(tax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Service charge (10%)</span>
                <span className="font-medium">{formatPrice(serviceCharge)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-primary-600">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmitOrder}
            disabled={loading}
            className="w-full btn-primary py-4 text-lg font-semibold"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <LoadingSpinner size="small" className="mr-2" />
                Placing Order...
              </div>
            ) : (
              `Place Order • ${formatPrice(total)}`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CheckoutPage