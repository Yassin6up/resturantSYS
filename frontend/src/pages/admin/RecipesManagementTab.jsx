import { useState, useEffect } from 'react'
import { inventoryAPI, menuAPI } from '../../services/api'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import RecipeForm from '../../components/RecipeForm'
import toast from 'react-hot-toast'

function RecipesManagementTab() {
  const [recipes, setRecipes] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRecipeForm, setShowRecipeForm] = useState(false)
  const [groupedRecipes, setGroupedRecipes] = useState({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [recipesRes, menuRes] = await Promise.all([
        inventoryAPI.getRecipes(),
        menuAPI.getMenuItems()
      ])
      
      if (recipesRes.data) {
        const recipesData = recipesRes.data.recipes || []
        setRecipes(recipesData)
        
        // Group recipes by menu item
        const grouped = recipesData.reduce((acc, recipe) => {
          const menuItemId = recipe.menu_item_id
          if (!acc[menuItemId]) {
            acc[menuItemId] = {
              menuItem: recipe.menu_item_name,
              ingredients: []
            }
          }
          acc[menuItemId].ingredients.push(recipe)
          return acc
        }, {})
        setGroupedRecipes(grouped)
      }
      
      if (menuRes.data.success) {
        setMenuItems(menuRes.data.items || [])
      }
    } catch (error) {
      toast.error('Failed to load recipes')
      console.error('Recipes load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRecipe = async (recipeId) => {
    if (!window.confirm('Are you sure you want to delete this recipe ingredient?')) {
      return
    }

    try {
      await inventoryAPI.deleteRecipe(recipeId)
      toast.success('Recipe ingredient deleted')
      loadData()
    } catch (error) {
      console.error('Delete recipe error:', error)
      toast.error('Failed to delete recipe ingredient')
    }
  }

  const handleSaveRecipe = () => {
    setShowRecipeForm(false)
    loadData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-gray-600">Loading recipes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Link menu items with their ingredients to enable automatic inventory deduction
        </p>
        <button
          onClick={() => setShowRecipeForm(true)}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Recipe
        </button>
      </div>

      {Object.keys(groupedRecipes).length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <p className="text-gray-500 mb-4">No recipes configured yet</p>
            <button
              onClick={() => setShowRecipeForm(true)}
              className="btn-primary"
            >
              Create First Recipe
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedRecipes).map(([menuItemId, data]) => (
            <div key={menuItemId} className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900">
                  {data.menuItem}
                </h3>
              </div>
              <div className="card-body">
                <div className="space-y-2">
                  {data.ingredients.map((recipe) => (
                    <div 
                      key={recipe.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">
                          {recipe.stock_item_name}
                        </span>
                        <span className="mx-2 text-gray-400">→</span>
                        <span className="text-sm text-gray-700">
                          {recipe.qty_per_serving} {recipe.unit} per serving
                        </span>
                        {recipe.stock_item_sku && (
                          <span className="ml-2 text-xs text-gray-500">
                            (SKU: {recipe.stock_item_sku})
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteRecipe(recipe.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recipe Form Modal */}
      {showRecipeForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Add Recipe
                </h2>
                <button
                  onClick={() => setShowRecipeForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <RecipeForm
                onSave={handleSaveRecipe}
                onCancel={() => setShowRecipeForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RecipesManagementTab
