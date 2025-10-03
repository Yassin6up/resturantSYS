import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'

const CartPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [cart, setCart] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [notes, setNotes] = useState('')

  const table = searchParams.get('table')
  const branch = searchParams.get('branch')

  useEffect(() => {
    // In a real app, you'd get cart from context or localStorage
    // For now, we'll simulate some cart items
    const mockCart = [
      {
        id: '1-1',
        menuItem: {
          id: 1,
          name: 'Chicken Tagine with Olives',
          price: 95.00,
          sku: 'TAG001'
        },
        quantity: 2,
        modifiers: [
          { id: 1, name: 'Extra Spicy', extra_price: 0 }
        ],
        note: 'No spice please'
      },
      {
        id: '2-2',
        menuItem: {
          id: 2,
          name: 'Orange Juice',
          price: 25.00,
          sku: 'JUICE001'
        },
        quantity: 1,
        modifiers: [
          { id: 5, name: 'Large', extra_price: 5.00 }
        ],
        note: ''
      }
    ]
    setCart(mockCart)
  }, [])

  const updateQuantity = (itemId, change) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === itemId) {
          const newQuantity = item.quantity + change
          if (newQuantity <= 0) {
            return null
          }
          return { ...item, quantity: newQuantity }
        }
        return item
      }).filter(Boolean)
    })
  }

  const removeItem = (itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId))
    toast.success('Item removed from cart')
  }

  const getItemTotal = (item) => {
    const itemTotal = item.menuItem.price * item.quantity
    const modifierTotal = item.modifiers.reduce((sum, mod) => sum + mod.extra_price, 0) * item.quantity
    return itemTotal + modifierTotal
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + getItemTotal(item), 0)
  }

  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    if (!customerName.trim()) {
      toast.error('Please enter your name')
      return
    }

    // Navigate to checkout with cart data
    const checkoutData = {
      cart,
      customerName,
      notes,
      table,
      branch,
      total: getCartTotal()
    }

    navigate('/checkout', { state: checkoutData })
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <ShoppingBag className="w-24 h-24 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Your Cart is Empty</h1>
            <p className="text-gray-600 mb-8">Add some delicious items to get started!</p>
            <button
              onClick={() => navigate(`/menu?table=${table}&branch=${branch}`)}
              className="btn-primary"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => navigate(`/menu?table=${table}&branch=${branch}`)}
              className="btn-outline mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Menu
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
              <p className="text-gray-600">Table {table} • {getCartItemCount()} items</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold">Order Items</h2>
              </div>
              <div className="card-body p-0">
                <div className="divide-y divide-gray-200">
                  {cart.map((item) => (
                    <CartItem
                      key={item.id}
                      item={item}
                      onUpdateQuantity={updateQuantity}
                      onRemove={removeItem}
                      getItemTotal={getItemTotal}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="card sticky top-8">
              <div className="card-header">
                <h2 className="text-lg font-semibold">Order Summary</h2>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  <div>
                    <label className="label">Customer Name</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter your name"
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Special Instructions</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any special requests or notes..."
                      rows={3}
                      className="input resize-none"
                    />
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">{getCartTotal().toFixed(2)} MAD</span>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-gray-600">Tax (10%):</span>
                      <span className="font-medium">{(getCartTotal() * 0.1).toFixed(2)} MAD</span>
                    </div>
                    <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span>{(getCartTotal() * 1.1).toFixed(2)} MAD</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    className="w-full btn-primary text-lg py-3"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const CartItem = ({ item, onUpdateQuantity, onRemove, getItemTotal }) => {
  return (
    <div className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{item.menuItem.name}</h3>
          <p className="text-sm text-gray-600">SKU: {item.menuItem.sku}</p>
          
          {item.modifiers && item.modifiers.length > 0 && (
            <div className="mt-1">
              <p className="text-sm text-gray-600">
                + {item.modifiers.map(mod => mod.name).join(', ')}
              </p>
            </div>
          )}

          {item.note && (
            <p className="text-sm text-blue-600 mt-1">
              Note: {item.note}
            </p>
          )}

          <div className="flex items-center mt-2">
            <button
              onClick={() => onUpdateQuantity(item.id, -1)}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="mx-3 font-medium">{item.quantity}</span>
            <button
              onClick={() => onUpdateQuantity(item.id, 1)}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="text-right">
          <p className="font-medium text-gray-900">
            {getItemTotal(item).toFixed(2)} MAD
          </p>
          <button
            onClick={() => onRemove(item.id)}
            className="text-red-600 hover:text-red-700 mt-2"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default CartPage