import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCart } from '../../contexts/CartContext'
import { menuAPI, getImageUrl } from '../../services/api'
import { PlusIcon, MinusIcon } from '@heroicons/react/24/outline'
import CartBottomBar from '../../components/CartBottomBar'
import toast from 'react-hot-toast'

function MenuPage() {
  const [searchParams] = useSearchParams()
  const table = searchParams.get('table')
  const branch = searchParams.get('branch') || '1'
  
  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedModifiers, setSelectedModifiers] = useState([])
  const [note, setNote] = useState('')
  
  const { addItem, setBranchInfo } = useCart()

  useEffect(() => {
    // Set branch info in cart when page loads
    setBranchInfo(parseInt(branch), table)
  }, [branch, table])

  useEffect(() => {
    loadMenu()
  }, [branch])

  const loadMenu = async () => {
    try {
      setLoading(true)
      const response = await menuAPI.getMenu({ branchId: parseInt(branch) })
      setMenu(response.data.categories)
    } catch (error) {
      toast.error('Failed to load menu')
      console.error('Menu load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = () => {
    if (!selectedItem) return

    console.log("item : " , selectedItem)
    addItem(selectedItem, quantity, selectedModifiers, note, parseInt(branch), table)
    
    toast.success(`${quantity}x ${selectedItem.name} added to cart`)
    setSelectedItem(null)
    setQuantity(1)
    setSelectedModifiers([])
    setNote('')
  }

  const toggleModifier = (modifier) => {
    setSelectedModifiers(prev => {
      const exists = prev.find(m => m.id === modifier.id)
      if (exists) {
        return prev.filter(m => m.id !== modifier.id)
      } else {
        return [...prev, modifier]
      }
    })
  }

  const calculateItemTotal = (item) => {
    const modifierTotal = selectedModifiers.reduce((sum, modifier) => {
      return sum + parseFloat(modifier.extra_price || 0)
    }, 0)
    return (parseFloat(item.price || 0) + modifierTotal) * quantity
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading menu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12 animate-fadeInUp">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-6 shadow-xl">
          <span className="text-white font-bold text-2xl">🍽️</span>
        </div>
        <h1 className="text-4xl font-bold gradient-text mb-4">Our Delicious Menu</h1>
        {table && (
          <p className="text-xl text-gray-600">Table {table}</p>
        )}
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">Discover our carefully crafted dishes made with love and the finest ingredients</p>
      </div>

      {/* Menu Categories */}
      <div className="space-y-8">
        {menu.map((category) => (
          <div key={category.id} className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">{category.name}</h2>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.items?.map((item) => (
                  <div
                    key={item.id}
                    className="menu-item-card group"
                    onClick={() => setSelectedItem(item)}
                  >
                    {/* Food Image */}
                    <div className="relative overflow-hidden">
                      <img
                        src={item.image ? getImageUrl(item.image) : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'}
                        alt={item.name}
                        className="menu-item-image"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-semibold text-gray-800 shadow-lg">
                        {parseFloat(item?.price || 0).toFixed(2)} MAD
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-blue-600 transition-colors duration-200">{item.name}</h3>
                      {item.description && (
                        <p className="text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          addItem(item);
                        }}
                        className="btn-primary w-full group-hover:animate-bounce"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Item Selection Modal */}
      {selectedItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            {/* Food Image */}
            <div className="relative overflow-hidden">
              <img
                src={selectedItem.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'}
                alt={selectedItem.name}
                className="w-full h-64 object-cover"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 text-lg font-bold text-gray-800 shadow-lg">
                {parseFloat(selectedItem.price || 0).toFixed(2)} MAD
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{selectedItem.name}</h3>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {selectedItem.description && (
                <p className="text-gray-600 mb-4">{selectedItem.description}</p>
              )}

              {/* Modifiers */}
              {selectedItem.modifiers && selectedItem.modifiers.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Modifiers</h4>
                  <div className="space-y-2">
                    {selectedItem.modifiers.map((modifier) => (
                      <label key={modifier.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedModifiers.some(m => m.id === modifier.id)}
                          onChange={() => toggleModifier(modifier)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {modifier.name}
                          {parseFloat(modifier.extra_price || 0) > 0 && (
                            <span className="text-primary-600 ml-1">
                              (+{parseFloat(modifier.extra_price || 0).toFixed(2)} MAD)
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Note */}
              <div className="mb-4">
                <label className="form-label">Special Instructions</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Any special requests?"
                  className="form-input"
                  rows={3}
                />
              </div>

              {/* Quantity */}
              <div className="mb-6">
                <label className="form-label">Quantity</label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="btn-outline btn-sm"
                  >
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <span className="text-lg font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="btn-outline btn-sm"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center mb-6">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-lg font-bold text-primary-600">
                  {calculateItemTotal(selectedItem).toFixed(2)} MAD
                </span>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddToCart}
                  className="btn-primary flex-1"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Cart Bottom Bar */}
      <CartBottomBar />
    </div>
  )
}

export default MenuPage