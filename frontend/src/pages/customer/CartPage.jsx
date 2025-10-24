import { useCart } from '../../contexts/CartContext'
import { useNavigate } from 'react-router-dom'
import { PlusIcon, MinusIcon, TrashIcon, ShoppingBagIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

function CartPage() {
  const navigate = useNavigate()
  const { items, total, updateQuantity, removeItem, clearCart } = useCart()

  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(itemId)
      toast.success('Item removed from cart')
    } else {
      updateQuantity(itemId, newQuantity)
    }
  }

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error('Your cart is empty')
      return
    }
    navigate('/checkout')
  }

  const handleClearCart = () => {
    if (items.length === 0) return
    
    if (window.confirm('Are you sure you want to clear your cart?')) {
      clearCart()
      toast.success('Cart cleared')
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-6">
            <ShoppingBagIcon className="h-16 w-16 text-gray-400" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Your Cart is Empty</h2>
          <p className="text-lg text-gray-600 mb-8">
            Discover our delicious menu and add your favorite items!
          </p>
          <button
            onClick={() => navigate('/menu')}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 mx-auto"
          >
            <span>Browse Menu</span>
            <ArrowRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Your Cart
            </h1>
            <p className="text-gray-600 font-medium">
              {items.reduce((sum, item) => sum + item.quantity, 0)} items
            </p>
          </div>
          <button
            onClick={handleClearCart}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl transition-all active:scale-95 flex items-center gap-2"
          >
            <TrashIcon className="h-5 w-5" />
            <span>Clear Cart</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-4">
            {items?.map((item) => (
              <div 
                key={item.id} 
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="p-6">
                  <div className="flex gap-4">
                    {item.image && (
                      <div className="flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-24 h-24 object-cover rounded-xl"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop';
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-gray-900 mb-1">{item.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {item?.unitPrice?.toFixed(2) || 0} MAD each
                      </p>
                      
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-semibold text-gray-700 mb-1">Extras:</p>
                          <div className="flex flex-wrap gap-1">
                            {item.modifiers.map((modifier) => (
                              <span 
                                key={modifier.id} 
                                className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg"
                              >
                                {modifier.name}
                                {modifier.extra_price > 0 && (
                                  <span className="ml-1">+{modifier.extra_price.toFixed(2)}</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {item.note && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-xs font-semibold text-yellow-800 mb-1">Note:</p>
                          <p className="text-xs text-yellow-700 italic">"{item.note}"</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => {
                          removeItem(item.id)
                          toast.success('Item removed')
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove item"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          {item.total.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-600">MAD</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-3 bg-gray-50 rounded-xl p-2">
                    <button
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      className="p-2 bg-white hover:bg-gray-100 rounded-lg transition-colors shadow-sm"
                    >
                      <MinusIcon className="h-5 w-5 text-gray-700" />
                    </button>
                    <span className="text-xl font-bold text-gray-900 min-w-[3rem] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      className="p-2 bg-white hover:bg-gray-100 rounded-lg transition-colors shadow-sm"
                    >
                      <PlusIcon className="h-5 w-5 text-gray-700" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-6">
              
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg border-2 border-blue-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{total.toFixed(2)} MAD</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Items:</span>
                    <span className="font-semibold">{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                </div>

                <div className="border-t-2 border-blue-200 pt-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total:</span>
                    <div className="text-right">
                      <div className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {total.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">MAD</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleCheckout}
                    className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRightIcon className="h-5 w-5" />
                  </button>
                  
                  <button
                    onClick={() => navigate('/menu')}
                    className="w-full py-4 px-6 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl border-2 border-gray-200 transition-all active:scale-95"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">🔥</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Fresh & Fast</h3>
                    <p className="text-sm text-gray-600">
                      Your order will be prepared fresh when you complete payment!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartPage
