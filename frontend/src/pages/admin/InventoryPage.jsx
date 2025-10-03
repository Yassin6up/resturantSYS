import { useState, useEffect } from 'react'
import { inventoryAPI } from '../../services/api'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  ExclamationTriangleIcon,
  TrendingUpIcon,
  TrendingDownIcon
} from '@heroicons/react/24/outline'
import StockItemForm from '../../components/StockItemForm'
import toast from 'react-hot-toast'

function InventoryPage() {
  const [activeTab, setActiveTab] = useState('stock')
  const [stockItems, setStockItems] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showStockForm, setShowStockForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [lowStockItems, setLowStockItems] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [stockRes, recipesRes, lowStockRes] = await Promise.all([
        inventoryAPI.getStockItems(),
        inventoryAPI.getRecipes(),
        inventoryAPI.getLowStockItems()
      ])
      
      if (stockRes.data.success) {
        setStockItems(stockRes.data.items)
      }
      if (recipesRes.data.success) {
        setRecipes(recipesRes.data.recipes)
      }
      if (lowStockRes.data.success) {
        setLowStockItems(lowStockRes.data.items)
      }
    } catch (error) {
      toast.error('Failed to load inventory data')
      console.error('Inventory load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddStockItem = () => {
    setEditingItem(null)
    setShowStockForm(true)
  }

  const handleEditStockItem = (item) => {
    setEditingItem(item)
    setShowStockForm(true)
  }

  const handleSaveStockItem = (savedItem) => {
    if (editingItem) {
      // Update existing item
      setStockItems(prev => prev.map(item => 
        item.id === savedItem.id ? savedItem : item
      ))
    } else {
      // Add new item
      setStockItems(prev => [savedItem, ...prev])
    }
    setShowStockForm(false)
    setEditingItem(null)
  }

  const handleCancelStockForm = () => {
    setShowStockForm(false)
    setEditingItem(null)
  }

  const handleDeleteStockItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this stock item? This action cannot be undone.')) {
      return
    }

    try {
      await inventoryAPI.deleteStockItem(itemId)
      setStockItems(prev => prev.filter(item => item.id !== itemId))
      toast.success('Stock item deleted successfully')
    } catch (error) {
      console.error('Stock item deletion error:', error)
      toast.error(error.response?.data?.error || 'Failed to delete stock item')
    }
  }

  const handleStockMovement = async (itemId, type, quantity, reason) => {
    try {
      const response = await inventoryAPI.recordStockMovement(itemId, {
        type,
        quantity: parseFloat(quantity),
        reason: reason || 'Manual adjustment'
      })
      
      if (response.data.success) {
        // Reload data to get updated stock levels
        await loadData()
        toast.success('Stock movement recorded successfully')
      }
    } catch (error) {
      console.error('Stock movement error:', error)
      toast.error('Failed to record stock movement')
    }
  }

  const getStockStatus = (item) => {
    if (item.current_stock <= item.min_stock) {
      return { status: 'low', color: 'text-red-600', bgColor: 'bg-red-50' }
    } else if (item.current_stock >= item.max_stock) {
      return { status: 'high', color: 'text-green-600', bgColor: 'bg-green-50' }
    } else {
      return { status: 'normal', color: 'text-gray-600', bgColor: 'bg-gray-50' }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Inventory Management</h1>
          <p className="text-gray-600 mt-2">Manage stock items, recipes, and inventory levels</p>
        </div>
        <button
          onClick={handleAddStockItem}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Stock Item
        </button>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="card border-l-4 border-l-red-500 bg-red-50">
          <div className="card-body">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Low Stock Alert</h3>
                <p className="text-red-700">
                  {lowStockItems.length} item(s) are running low on stock
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockItems.slice(0, 6).map((item) => (
                <div key={item.id} className="bg-white rounded-lg p-3 border border-red-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">{item.name}</span>
                    <span className="text-sm text-red-600 font-semibold">
                      {item.current_stock} {item.unit}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Min: {item.min_stock} {item.unit}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('stock')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stock'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Stock Items ({stockItems.length})
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'recipes'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Recipes ({recipes.length})
          </button>
        </nav>
      </div>

      {/* Stock Items Tab */}
      {activeTab === 'stock' && (
        <div className="card">
          <div className="card-header">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Stock Items</h2>
              <button 
                onClick={handleAddStockItem}
                className="btn-primary btn-sm"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Item
              </button>
            </div>
          </div>
          <div className="card-body">
            {stockItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No stock items found</p>
                <button 
                  onClick={handleAddStockItem}
                  className="btn-primary mt-4"
                >
                  Add First Stock Item
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Min/Max
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stockItems.map((item) => {
                      const stockStatus = getStockStatus(item)
                      return (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.name}</div>
                              <div className="text-sm text-gray-500">{item.sku || 'No SKU'}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className={`text-sm font-semibold ${stockStatus.color}`}>
                                {item.current_stock} {item.unit}
                              </span>
                              {stockStatus.status === 'low' && (
                                <TrendingDownIcon className="h-4 w-4 text-red-500 ml-1" />
                              )}
                              {stockStatus.status === 'high' && (
                                <TrendingUpIcon className="h-4 w-4 text-green-500 ml-1" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.min_stock} / {item.max_stock} {item.unit}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.cost_price?.toFixed(2) || '0.00'} MAD
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`badge ${stockStatus.bgColor} ${stockStatus.color}`}>
                              {stockStatus.status === 'low' ? 'Low Stock' : 
                               stockStatus.status === 'high' ? 'High Stock' : 'Normal'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button 
                              onClick={() => handleEditStockItem(item)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteStockItem(item.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recipes Tab */}
      {activeTab === 'recipes' && (
        <div className="card">
          <div className="card-header">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Recipes</h2>
              <button className="btn-primary btn-sm">
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Recipe
              </button>
            </div>
          </div>
          <div className="card-body">
            {recipes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No recipes found</p>
                <button className="btn-primary mt-4">
                  Add First Recipe
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {recipes.map((recipe) => (
                  <div key={recipe.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{recipe.name}</h3>
                        <p className="text-sm text-gray-600">{recipe.description}</p>
                        <div className="mt-2">
                          <span className="text-sm font-medium text-gray-700">Ingredients:</span>
                          <div className="mt-1 space-y-1">
                            {recipe.ingredients?.map((ingredient, index) => (
                              <div key={index} className="text-sm text-gray-600">
                                {ingredient.quantity} {ingredient.unit} {ingredient.stock_item?.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stock Item Form Modal */}
      {showStockForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingItem ? 'Edit Stock Item' : 'Add New Stock Item'}
                </h2>
                <button
                  onClick={handleCancelStockForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <StockItemForm
                item={editingItem}
                onSave={handleSaveStockItem}
                onCancel={handleCancelStockForm}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryPage