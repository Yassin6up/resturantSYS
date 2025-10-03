import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ShoppingCart, Plus, Minus } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

const MenuPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [menu, setMenu] = useState(null)
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState(null)

  const table = searchParams.get('table')
  const branch = searchParams.get('branch')

  useEffect(() => {
    if (!table || !branch) {
      toast.error('Invalid table or branch')
      navigate('/')
      return
    }

    fetchMenu()
  }, [table, branch])

  const fetchMenu = async () => {
    try {
      const response = await api.get(`/menu?table=${table}&branch=${branch}`)
      setMenu(response.data)
      setSelectedCategory(response.data.menu[0])
      setLoading(false)
    } catch (error) {
      toast.error('Failed to load menu')
      setLoading(false)
    }
  }

  const addToCart = (item, modifiers = []) => {
    const cartItem = {
      id: `${item.id}-${modifiers.map(m => m.id).join('-')}`,
      menuItem: item,
      quantity: 1,
      modifiers,
      note: ''
    }

    setCart(prev => {
      const existing = prev.find(c => c.id === cartItem.id)
      if (existing) {
        return prev.map(c => 
          c.id === cartItem.id 
            ? { ...c, quantity: c.quantity + 1 }
            : c
        )
      }
      return [...prev, cartItem]
    })

    toast.success(`${item.name} added to cart`)
  }

  const updateCartItemQuantity = (itemId, change) => {
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

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId))
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      const itemTotal = item.menuItem.price * item.quantity
      const modifierTotal = item.modifiers.reduce((sum, mod) => sum + mod.extra_price, 0) * item.quantity
      return total + itemTotal + modifierTotal
    }, 0)
  }

  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!menu) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Menu Not Found</h1>
          <p className="text-gray-600">Please check your QR code and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{menu.branch.name}</h1>
              <p className="text-gray-600">Table {menu.table.table_number}</p>
            </div>
            <button
              onClick={() => navigate('/cart')}
              className="relative btn-primary"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Cart ({getCartItemCount()})
              {getCartItemCount() > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {getCartItemCount()}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Categories Sidebar */}
          <div className="lg:w-1/4">
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold">Categories</h2>
              </div>
              <div className="card-body p-0">
                <nav className="space-y-1">
                  {menu.menu.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full text-left px-4 py-3 text-sm font-medium rounded-none ${
                        selectedCategory?.id === category.id
                          ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="lg:w-3/4">
            {selectedCategory && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {selectedCategory.name}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedCategory.items.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      onAddToCart={addToCart}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Cart Summary */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Cart Total:</span>
            <span className="font-bold text-lg">{getCartTotal().toFixed(2)} MAD</span>
          </div>
          <button
            onClick={() => navigate('/cart')}
            className="w-full btn-primary"
          >
            View Cart ({getCartItemCount()})
          </button>
        </div>
      )}
    </div>
  )
}

const MenuItemCard = ({ item, onAddToCart }) => {
  const [selectedModifiers, setSelectedModifiers] = useState([])
  const [showModifiers, setShowModifiers] = useState(false)

  const handleModifierToggle = (modifier) => {
    setSelectedModifiers(prev => {
      const exists = prev.find(m => m.id === modifier.id)
      if (exists) {
        return prev.filter(m => m.id !== modifier.id)
      }
      return [...prev, modifier]
    })
  }

  const handleAddToCart = () => {
    onAddToCart(item, selectedModifiers)
    setSelectedModifiers([])
    setShowModifiers(false)
  }

  const getTotalPrice = () => {
    const modifierTotal = selectedModifiers.reduce((sum, mod) => sum + mod.extra_price, 0)
    return item.price + modifierTotal
  }

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="card-body">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
            {item.description && (
              <p className="text-gray-600 text-sm mt-1">{item.description}</p>
            )}
            <p className="text-primary-600 font-bold text-lg mt-2">
              {item.price.toFixed(2)} MAD
            </p>
          </div>
          {item.image && (
            <img
              src={item.image}
              alt={item.name}
              className="w-20 h-20 object-cover rounded-lg"
            />
          )}
        </div>

        {item.modifiers && item.modifiers.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowModifiers(!showModifiers)}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              {showModifiers ? 'Hide' : 'Show'} Options ({item.modifiers.length})
            </button>
            
            {showModifiers && (
              <div className="mt-2 space-y-2">
                {item.modifiers.map((modifier) => (
                  <label key={modifier.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedModifiers.some(m => m.id === modifier.id)}
                      onChange={() => handleModifierToggle(modifier)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm">
                      {modifier.name}
                      {modifier.extra_price > 0 && (
                        <span className="text-primary-600 font-medium">
                          {' '}(+{modifier.extra_price.toFixed(2)} MAD)
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleAddToCart}
          className="w-full btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add to Cart
          {selectedModifiers.length > 0 && (
            <span className="ml-2">
              ({getTotalPrice().toFixed(2)} MAD)
            </span>
          )}
        </button>
      </div>
    </div>
  )
}

export default MenuPage