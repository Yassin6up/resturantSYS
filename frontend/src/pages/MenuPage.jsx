import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useCartStore } from '../stores/cartStore'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  ShoppingCartIcon,
  PlusIcon,
  MinusIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '../components/LoadingSpinner'
import MenuItemModal from '../components/MenuItemModal'

const MenuPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [menu, setMenu] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [tableInfo, setTableInfo] = useState(null)
  
  const { items, addItem, getCartCount, getCartTotal, setTableInfo: setCartTableInfo } = useCartStore()

  const tableNumber = searchParams.get('table')
  const branchCode = searchParams.get('branch')

  useEffect(() => {
    if (tableNumber) {
      fetchTableInfo()
    }
    fetchMenu()
  }, [tableNumber, branchCode])

  const fetchTableInfo = async () => {
    try {
      // Find table by table number - we'll need to get all tables and filter
      const response = await api.get('/tables', { params: { branchId: 1 } })
      const table = response.data.data.find(t => t.table_number === tableNumber)
      
      if (table) {
        setTableInfo(table)
        setCartTableInfo(table)
      } else {
        toast.error('Table not found')
      }
    } catch (error) {
      console.error('Error fetching table info:', error)
      toast.error('Failed to load table information')
    }
  }

  const fetchMenu = async () => {
    try {
      setLoading(true)
      const response = await api.get('/menu', { params: { branchId: 1 } })
      setMenu(response.data.data)
      
      // Set first category as selected
      if (response.data.data.length > 0) {
        setSelectedCategory(response.data.data[0].id)
      }
    } catch (error) {
      console.error('Error fetching menu:', error)
      toast.error('Failed to load menu')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = (menuItem, quantity = 1, modifiers = [], notes = '') => {
    addItem(menuItem, quantity, modifiers, notes)
    toast.success(`${menuItem.name} added to cart`)
  }

  const handleItemClick = (item) => {
    if (item.modifiers && item.modifiers.length > 0) {
      setSelectedItem(item)
    } else {
      handleAddToCart(item)
    }
  }

  const formatPrice = (price) => {
    return `${price.toFixed(2)} MAD`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  const selectedCategoryData = menu.find(cat => cat.id === selectedCategory)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
              {tableInfo && (
                <p className="text-sm text-gray-600">
                  Table {tableInfo.table_number} • {tableInfo.description}
                </p>
              )}
            </div>
            
            {/* Cart Button */}
            <button
              onClick={() => navigate('/checkout')}
              className="relative inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <ShoppingCartIcon className="h-5 w-5 mr-2" />
              Cart
              {getCartCount() > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                  {getCartCount()}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Categories Sidebar */}
          <div className="lg:w-64">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Categories</h2>
              <nav className="space-y-2">
                {menu.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {category.name}
                    <span className="ml-2 text-xs text-gray-500">
                      ({category.items.length})
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Menu Items */}
          <div className="flex-1">
            {selectedCategoryData && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedCategoryData.name}
                  </h2>
                  {selectedCategoryData.description && (
                    <p className="text-gray-600">{selectedCategoryData.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {selectedCategoryData.items.map((item) => (
                    <div
                      key={item.id}
                      className="menu-item-card cursor-pointer"
                      onClick={() => handleItemClick(item)}
                    >
                      {item.image && (
                        <div className="aspect-w-16 aspect-h-9">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-48 object-cover"
                          />
                        </div>
                      )}
                      
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {item.name}
                          </h3>
                          <span className="text-lg font-bold text-primary-600">
                            {formatPrice(item.price)}
                          </span>
                        </div>
                        
                        {item.description && (
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm text-gray-500">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            {item.prep_time} min
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleItemClick(item)
                            }}
                            className="inline-flex items-center px-3 py-1 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors"
                          >
                            <PlusIcon className="h-4 w-4 mr-1" />
                            Add
                          </button>
                        </div>
                        
                        {item.modifiers && item.modifiers.length > 0 && (
                          <div className="mt-2 text-xs text-gray-500">
                            Customizable options available
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Cart Summary */}
      {getCartCount() > 0 && (
        <div className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-80">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">
                {getCartCount()} items in cart
              </span>
              <span className="text-lg font-bold text-primary-600">
                {formatPrice(getCartTotal())}
              </span>
            </div>
            <button
              onClick={() => navigate('/checkout')}
              className="w-full btn-primary"
            >
              View Cart & Checkout
            </button>
          </div>
        </div>
      )}

      {/* Menu Item Modal */}
      {selectedItem && (
        <MenuItemModal
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onAddToCart={handleAddToCart}
        />
      )}
    </div>
  )
}

export default MenuPage