import { useCart } from '../../contexts/CartContext'
import { useNavigate } from 'react-router-dom'
import { PlusIcon, MinusIcon, TrashIcon } from '@heroicons/react/24/outline'
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
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="mb-8">
          <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
        <p className="text-gray-600 mb-8">Add some delicious items from our menu!</p>
        <button
          onClick={() => navigate('/menu')}
          className="btn-primary"
        >
          Browse Menu
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Your Cart</h1>
        <button
          onClick={handleClearCart}
          className="text-red-600 hover:text-red-700 text-sm font-medium"
        >
          Clear Cart
        </button>
      </div>

      {/* Cart Items */}
      <div className="space-y-4 mb-8">
        {items?.map((item) => (
          <div key={item.id} className="card">
            <div className="card-body">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{item.menuItem.name}</h3>
                  <p className="text-sm text-gray-600">
                    {item?.total?.toFixed(2)|| 0 } MAD each
                  </p>
                  
                  {/* Modifiers */}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">With:</p>
                      {item.modifiers.map((modifier) => (
                        <p key={modifier.id} className="text-xs text-gray-500 ml-2">
                          • {modifier.name}
                          {modifier.extra_price > 0 && (
                            <span className="text-primary-600">
                              {' '}(+{modifier.extra_price.toFixed(2)} MAD)
                            </span>
                          )}
                        </p>
                      ))}
                    </div>
                  )}
                  
                  {/* Note */}
                  {item.note && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">Note:</p>
                      <p className="text-xs text-gray-600 ml-2 italic">"{item.note}"</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3 ml-4">
                  {/* Quantity Controls */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      className="btn-outline btn-sm"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-medium w-8 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      className="btn-outline btn-sm"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Item Total */}
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {item.total.toFixed(2)} MAD
                    </p>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => {
                      removeItem(item.id)
                      toast.success('Item removed from cart')
                    }}
                    className="text-red-600 hover:text-red-700 p-1"
                    title="Remove item"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cart Summary */}
      <div className="card">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold text-gray-900">Total:</span>
            <span className="text-2xl font-bold text-primary-600">
              {total.toFixed(2)} MAD
            </span>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleCheckout}
              className="btn-primary w-full btn-lg"
            >
              Proceed to Checkout
            </button>
            
            <button
              onClick={() => navigate('/menu')}
              className="btn-outline w-full"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>You can pay at the cashier or online</p>
        <p>Your order will be prepared fresh!</p>
      </div>
    </div>
  )
}

export default CartPage