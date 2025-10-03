import { useState, useEffect } from 'react'
import { inventoryAPI } from '../../services/api'
import { 
  PlusIcon, 
  ExclamationTriangleIcon,
  ChartBarIcon,
  CubeIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

function InventoryPage() {
  const [activeTab, setActiveTab] = useState('stock')
  const [stockItems, setStockItems] = useState([])
  const [lowStockItems, setLowStockItems] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadInventoryData()
  }, [])

  const loadInventoryData = async () => {
    try {
      setLoading(true)
      const [stockRes, lowStockRes, recipesRes] = await Promise.all([
        inventoryAPI.getStockItems({ branchId: 1 }),
        inventoryAPI.getLowStockAlerts({ branchId: 1 }),
        inventoryAPI.getRecipes()
      ])
      
      setStockItems(stockRes.data.stockItems)
      setLowStockItems(lowStockRes.data.lowStockItems)
      setRecipes(recipesRes.data.recipes)
    } catch (error) {
      toast.error('Failed to load inventory data')
      console.error('Inventory load error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading inventory data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">Manage stock items, recipes, and low stock alerts</p>
        </div>
        <button className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Stock Item
        </button>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="card border-red-200 bg-red-50">
          <div className="card-header">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
              <h2 className="text-lg font-semibold text-red-800">Low Stock Alerts</h2>
            </div>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStockItems.map((item) => (
                <div key={item.id} className="bg-white border border-red-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                  <div className="mt-2">
                    <span className="text-sm font-medium text-red-600">
                      Current: {item.quantity} {item.unit}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      Min: {item.min_threshold} {item.unit}
                    </span>
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
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CubeIcon className="h-4 w-4 mr-2 inline" />
            Stock Items ({stockItems.length})
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'recipes'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ChartBarIcon className="h-4 w-4 mr-2 inline" />
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
              <button className="btn-primary btn-sm">
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Item
              </button>
            </div>
          </div>
          <div className="card-body">
            {stockItems.length === 0 ? (
              <div className="text-center py-8">
                <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No stock items</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by adding your first stock item.</p>
                <button className="btn-primary mt-4">Add Stock Item</button>
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
                        SKU
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Min Threshold
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
                    {stockItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">{item.unit}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.min_threshold} {item.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`badge ${
                            item.isLowStock ? 'badge-danger' : 'badge-success'
                          }`}>
                            {item.isLowStock ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            Edit
                          </button>
                          <button className="text-green-600 hover:text-green-900">
                            Add Stock
                          </button>
                        </td>
                      </tr>
                    ))}
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
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No recipes</h3>
                <p className="mt-1 text-sm text-gray-500">Create recipes to track ingredient usage.</p>
                <button className="btn-primary mt-4">Add Recipe</button>
              </div>
            ) : (
              <div className="space-y-4">
                {recipes.map((recipe) => (
                  <div key={recipe.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{recipe.menu_item_name}</h3>
                        <p className="text-sm text-gray-500">
                          Uses: {recipe.stock_item_name} ({recipe.qty_per_serving} {recipe.unit} per serving)
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-900 text-sm">
                          Edit
                        </button>
                        <button className="text-red-600 hover:text-red-900 text-sm">
                          Delete
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

      {/* Inventory Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-body text-center">
            <CubeIcon className="mx-auto h-8 w-8 text-blue-600 mb-2" />
            <h3 className="text-lg font-medium text-gray-900">Total Items</h3>
            <p className="text-2xl font-bold text-blue-600">{stockItems.length}</p>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <ExclamationTriangleIcon className="mx-auto h-8 w-8 text-red-600 mb-2" />
            <h3 className="text-lg font-medium text-gray-900">Low Stock</h3>
            <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <ChartBarIcon className="mx-auto h-8 w-8 text-green-600 mb-2" />
            <h3 className="text-lg font-medium text-gray-900">Recipes</h3>
            <p className="text-2xl font-bold text-green-600">{recipes.length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InventoryPage