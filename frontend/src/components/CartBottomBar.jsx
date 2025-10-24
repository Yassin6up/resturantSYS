import { useState } from 'react'
import { useCart } from '../contexts/CartContext'
import { getImageUrl } from '../services/api'
import { ShoppingCartIcon, CreditCardIcon, QrCodeIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'

function CartBottomBar() {
  const { cartItems, total, itemCount } = useCart()
  const [showCart, setShowCart] = useState(false)
  const navigate = useNavigate()

  const handleCheckout = () => {
    if (cartItems?.length === 0) {
      return
    }
    navigate('/checkout')
  }

  if (cartItems?.length === 0) {
    return null
  }

  return (
    <>
      {/* Cart Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-yellow-400/30 shadow-2xl z-50 md:hidden">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setShowCart(true)}
            className="flex items-center space-x-3 flex-1"
          >
            <div className="relative">
              <ShoppingCartIcon className="h-8 w-8 text-yellow-400" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                  {itemCount}
                </span>
              )}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-white">{itemCount} items</p>
              <p className="text-lg font-bold text-yellow-400">{total.toFixed(2)} MAD</p>
            </div>
          </button>
          
          <button
            onClick={handleCheckout}
            className="btn-primary px-6 py-3 rounded-xl"
          >
            <CreditCardIcon className="h-5 w-5 mr-2" />
            Pay Now
          </button>
        </div>
      </div>

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-end z-50 md:hidden">
          <div className="bg-black/90 backdrop-blur-md rounded-t-2xl w-full max-h-[80vh] overflow-hidden border-t border-yellow-400/30">
            <div className="p-4 border-b border-yellow-400/30">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Your Order</h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-96">
              {cartItems?.map((item, index) => (
                <div key={index} className="p-4 border-b border-yellow-400/20">
                  <div className="flex items-center space-x-3">
                    <img
                      src={item.image ? getImageUrl(item.image) : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop'}
                      alt={item.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-white">{item.name}</h3>
                      <p className="text-sm text-gray-300">Qty: {item.quantity}</p>
                      <p className="text-sm font-semibold text-yellow-400">
                        {(item.price * item.quantity)?.toFixed(2)} MAD
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-yellow-400/30">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-white">Total:</span>
                <span className="text-2xl font-bold text-yellow-400">{total.toFixed(2)} MAD</span>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={handleCheckout}
                  className="w-full btn-primary py-3 rounded-xl"
                >
                  <CreditCardIcon className="h-5 w-5 mr-2" />
                  Proceed to Payment
                </button>
                
                <button
                  onClick={() => setShowCart(false)}
                  className="w-full btn-outline py-3 rounded-xl"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default CartBottomBar