import { useState, useEffect } from 'react'
import { inventoryAPI, menuAPI } from '../../services/api'
import { PlusIcon, TrashIcon, DocumentTextIcon, PencilIcon } from '@heroicons/react/24/outline'
import RecipeForm from '../../components/RecipeForm'
import toast from 'react-hot-toast'

function RecipesManagementTab() {
  const [recipes, setRecipes] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [stockItems, setStockItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRecipeForm, setShowRecipeForm] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState(null)
  const [groupedRecipes, setGroupedRecipes] = useState({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [recipesRes, menuRes, stockRes] = await Promise.all([
        inventoryAPI.getRecipes(),
        menuAPI.getMenuItems(),
        inventoryAPI.getStockItems()
      ])
      
      if (recipesRes.data) {
        const recipesData = recipesRes.data.recipes || recipesRes.data.data || []
        setRecipes(recipesData)
        
        // Group recipes by menu item
        const grouped = recipesData.reduce((acc, recipe) => {
          const menuItemId = recipe.menu_item_id
          if (!acc[menuItemId]) {
            acc[menuItemId] = {
              menuItem: recipe.menu_item_name || recipe.menu_item?.name || 'Unknown Menu Item',
              menuItemPrice: recipe.menu_item?.price || 0,
              menuItemId: menuItemId,
              ingredients: []
            }
          }
          acc[menuItemId].ingredients.push(recipe)
          return acc
        }, {})
        setGroupedRecipes(grouped)
      }
      
      setMenuItems(menuRes.data.items || menuRes.data.data || [])
      console.log('menu items loaded:', menuRes.data.items || menuRes.data.data || [])
      
      if (stockRes.data?.success) {
        setStockItems(stockRes.data.items || stockRes.data.data || [])
      }
    } catch (error) {
      toast.error('Failed to load recipes')
      console.error('Recipes load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRecipeIngredient = async (recipeId) => {
    if (!window.confirm('Are you sure you want to delete this recipe ingredient?')) {
      return
    }

    try {
      const response = await inventoryAPI.deleteRecipe(recipeId)
      if (response.data.success) {
        toast.success('Recipe ingredient deleted successfully')
        loadData()
      }
    } catch (error) {
      console.error('Delete recipe error:', error)
      toast.error(error.response?.data?.error || 'Failed to delete recipe ingredient')
    }
  }

  const handleDeleteEntireRecipe = async (menuItemId) => {
    const recipeGroup = groupedRecipes[menuItemId]
    if (!recipeGroup) return

    if (!window.confirm(`Are you sure you want to delete the entire recipe for "${recipeGroup.menuItem}"? This will remove all ${recipeGroup.ingredients.length} ingredients.`)) {
      return
    }

    try {
      // Delete all ingredients for this menu item
      const deletePromises = recipeGroup.ingredients.map(ingredient =>
        inventoryAPI.deleteRecipe(ingredient.id)
      )
      
      await Promise.all(deletePromises)
      toast.success(`Recipe for "${recipeGroup.menuItem}" deleted successfully`)
      loadData()
    } catch (error) {
      console.error('Delete entire recipe error:', error)
      toast.error('Failed to delete recipe')
    }
  }

  const handleEditRecipe = (menuItemId) => {
    const recipeGroup = groupedRecipes[menuItemId]
    if (!recipeGroup) return

    // Set the editing state with the current recipe data
    setEditingRecipe({
      menuItemId: recipeGroup.menuItemId,
      ingredients: recipeGroup.ingredients.map(ingredient => ({
        stockItemId: ingredient.stock_item_id,
        quantity: ingredient.qty_per_serving
      }))
    })
    setShowRecipeForm(true)
  }

  const handleSaveRecipe = () => {
    setShowRecipeForm(false)
    setEditingRecipe(null)
    loadData()
  }

  const handleCancelRecipeForm = () => {
    setShowRecipeForm(false)
    setEditingRecipe(null)
  }

  const handleAddRecipe = () => {
    setEditingRecipe(null)
    setShowRecipeForm(true)
  }

  const calculateTotalCost = (ingredients) => {
    return ingredients.reduce((total, ingredient) => {
      const cost = (ingredient.stock_item?.cost_price || 0) * (ingredient.qty_per_serving || 0)
      return total + cost
    }, 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading recipes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recipe Management</h2>
          <p className="text-gray-600 mt-1">
            Link menu items with their ingredients to enable automatic inventory deduction
          </p>
        </div>
        <button
          onClick={handleAddRecipe}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Add Recipe
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-blue-50 border-blue-200">
          <div className="card-body">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-blue-600">Total Recipes</p>
                <p className="text-2xl font-bold text-blue-900">{Object.keys(groupedRecipes).length}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="card bg-green-50 border-green-200">
          <div className="card-body">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-green-600 text-sm font-bold">🍽️</span>
              </div>
              <div>
                <p className="text-sm font-medium text-green-600">Menu Items</p>
                <p className="text-2xl font-bold text-green-900">{menuItems.length}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="card bg-purple-50 border-purple-200">
          <div className="card-body">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-purple-600 text-sm font-bold">📦</span>
              </div>
              <div>
                <p className="text-sm font-medium text-purple-600">Ingredients</p>
                <p className="text-2xl font-bold text-purple-900">{recipes.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recipes List */}
      {Object.keys(groupedRecipes).length === 0 ? (
        <div className="card text-center py-12">
          <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Recipes Found</h3>
          <p className="text-gray-500 mb-6">Get started by creating your first recipe</p>
          <button
            onClick={handleAddRecipe}
            className="btn-primary"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create First Recipe
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedRecipes).map(([menuItemId, data]) => {
            const totalCost = calculateTotalCost(data.ingredients)
            const profitMargin = data.menuItemPrice ? ((data.menuItemPrice - totalCost) / data.menuItemPrice * 100) : 0
            
            return (
              <div key={menuItemId} className="card">
                <div className="card-header border-b border-gray-200 pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {data.menuItem}
                          </h3>
                          {data.menuItemPrice > 0 && (
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-sm text-gray-600">
                                Price: <span className="font-semibold">{data.menuItemPrice} MAD</span>
                              </span>
                              <span className="text-sm text-gray-600">
                                Cost: <span className="font-semibold">{totalCost.toFixed(2)} MAD</span>
                              </span>
                              <span className={`text-sm font-semibold ${
                                profitMargin >= 30 ? 'text-green-600' : 
                                profitMargin >= 20 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                Margin: {profitMargin.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditRecipe(menuItemId)}
                            className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit recipe"
                          >
                            <PencilIcon className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteEntireRecipe(menuItemId)}
                            className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete entire recipe"
                          >
                            <TrashIcon className="h-4 w-4" />
                            Delete Recipe
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="flex justify-between items-center mb-4">
                    <span className="badge bg-blue-100 text-blue-800">
                      {data.ingredients.length} ingredient{data.ingredients.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {data.ingredients.map((recipe) => (
                      <div 
                        key={recipe.id}
                        className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-900">
                              {recipe.stock_item_name || recipe.stock_item?.name}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm text-gray-700">
                              {recipe.qty_per_serving} {recipe.unit || recipe.stock_item?.unit} per serving
                            </span>
                            {(recipe.stock_item_sku || recipe.stock_item?.sku) && (
                              <span className="ml-2 text-xs text-gray-500 bg-white px-2 py-1 rounded">
                                SKU: {recipe.stock_item_sku || recipe.stock_item?.sku}
                              </span>
                            )}
                          </div>
                          {recipe.stock_item?.current_stock !== undefined && (
                            <div className="text-xs text-gray-500 mt-1">
                              Current stock: {recipe.stock_item.current_stock} {recipe.unit || recipe.stock_item?.unit}
                            </div>
                          )}
                        </div>
                        {/* <button
                          onClick={() => handleDeleteRecipeIngredient(recipe.id)}
                          className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete ingredient"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button> */}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Recipe Form Modal */}
      {showRecipeForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingRecipe ? 'Edit Recipe' : 'Add Recipe'}
                </h2>
                <button
                  onClick={handleCancelRecipeForm}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <RecipeForm
                onSave={handleSaveRecipe}
                onCancel={handleCancelRecipeForm}
                menuItems={menuItems}
                stockItems={stockItems}
                editingRecipe={editingRecipe}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RecipesManagementTab