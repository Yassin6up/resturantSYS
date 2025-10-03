import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCart } from '../../contexts/CartContext'
import { menuAPI } from '../../services/api'
import { PlusIcon, MinusIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

function MenuPage() {
  const [searchParams] = useSearchParams()
  const table = searchParams.get('table')
  const branch = searchParams.get('branch')
  
  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedModifiers, setSelectedModifiers] = useState([])
  const [note, setNote] = useState('')
  
  const { addItem } = useCart()

  useEffect(() => {
    loadMenu()
  }, [branch])

  const loadMenu = async () => {
    try {
      setLoading(true)
      const response = await menuAPI.getMenu({ branchId: 1 }) // Default branch
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

    addItem(selectedItem, quantity, selectedModifiers, note)
    
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
    const modifierTotal = selectedModifiers.reduce((sum, modifier) => sum + modifier.extra_price, 0)
    return (item.price + modifierTotal) * quantity
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
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Our Menu</h1>
        {table && (
          <p className="text-gray-600">Table {table}</p>
        )}
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
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      <span className="text-sm font-semibold text-primary-600">
                        {item.price.toFixed(2)} MAD
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                    )}
                    <button className="btn-primary btn-sm w-full">
                      Add to Cart
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Item Selection Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
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
                          {modifier.extra_price > 0 && (
                            <span className="text-primary-600 ml-1">
                              (+{modifier.extra_price.toFixed(2)} MAD)
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
    </div>
  )
}

export default MenuPage