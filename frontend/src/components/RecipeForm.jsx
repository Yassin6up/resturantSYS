import { useState, useEffect, useRef } from 'react'
import { inventoryAPI } from '../services/api'
import { PlusIcon, MinusIcon, PhotoIcon, ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

function RecipeForm({ onSave, onCancel, menuItems = [], stockItems = [], editingRecipe = null }) {
  const [selectedMenuItem, setSelectedMenuItem] = useState('')
  const [ingredients, setIngredients] = useState([{ stockItemId: '', quantity: '' }])
  const [submitting, setSubmitting] = useState(false)
  const [showMenuDropdown, setShowMenuDropdown] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowMenuDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Handle editing mode
  useEffect(() => {
    if (editingRecipe) {
      setSelectedMenuItem(editingRecipe.menuItemId)
      setIngredients(editingRecipe.ingredients)
    } else {
      setSelectedMenuItem('')
      setIngredients([{ stockItemId: '', quantity: '' }])
    }
  }, [editingRecipe])

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { stockItemId: '', quantity: '' }])
  }

  const handleRemoveIngredient = (index) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index))
    }
  }

  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...ingredients]
    newIngredients[index][field] = value
    setIngredients(newIngredients)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    if (!selectedMenuItem) {
      toast.error('Please select a menu item')
      setSubmitting(false)
      return
    }

    const validIngredients = ingredients.filter(
      ing => ing.stockItemId && ing.quantity && parseFloat(ing.quantity) > 0
    )

    if (validIngredients.length === 0) {
      toast.error('Please add at least one ingredient')
      setSubmitting(false)
      return
    }

    try {
      if (editingRecipe) {
        // Edit mode: Delete existing ingredients and create new ones
        // First, delete all existing ingredients for this menu item
        const existingRecipes = await inventoryAPI.getRecipes()
        const recipesToDelete = existingRecipes.data.recipes?.filter(
          recipe => recipe.menu_item_id == selectedMenuItem
        ) || []

        // Delete all existing ingredients
        const deletePromises = recipesToDelete.map(recipe =>
          inventoryAPI.deleteRecipe(recipe.id)
        )
        await Promise.all(deletePromises)

        // Then create new ingredients
        const createPromises = validIngredients.map(ingredient =>
          inventoryAPI.createRecipe({
            menu_item_id: selectedMenuItem,
            stock_item_id: ingredient.stockItemId,
            qty_per_serving: parseFloat(ingredient.quantity)
          })
        )

        await Promise.all(createPromises)
        toast.success(`Recipe updated with ${validIngredients.length} ingredient${validIngredients.length !== 1 ? 's' : ''}`)
      } else {
        // Create mode: Just create new ingredients
        const recipePromises = validIngredients.map(ingredient =>
          inventoryAPI.createRecipe({
            menu_item_id: selectedMenuItem,
            stock_item_id: ingredient.stockItemId,
            qty_per_serving: parseFloat(ingredient.quantity)
          })
        )

        await Promise.all(recipePromises)
        toast.success(`Recipe created with ${validIngredients.length} ingredient${validIngredients.length !== 1 ? 's' : ''}`)
      }
      
      onSave()
    } catch (error) {
      console.error('Recipe save error:', error)
      toast.error(error.response?.data?.error || `Failed to ${editingRecipe ? 'update' : 'create'} recipe`)
    } finally {
      setSubmitting(false)
    }
  }

  const getSelectedMenuItem = () => {
    return menuItems.find(item => item.id == selectedMenuItem)
  }

  // Filter menu items based on search term
  const filteredMenuItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedMenu = getSelectedMenuItem()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Menu Item Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Menu Item *
        </label>
        
        {/* Custom Select Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowMenuDropdown(!showMenuDropdown)}
            disabled={editingRecipe} // Disable menu item selection in edit mode
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-left flex items-center justify-between transition-colors ${
              editingRecipe 
                ? 'bg-gray-100 cursor-not-allowed text-gray-500' 
                : 'hover:border-gray-400'
            }`}
          >
            {selectedMenu ? (
              <div className="flex items-center gap-3">
                {selectedMenu.image ? (
                  <img 
                    src={selectedMenu.image} 
                    alt={selectedMenu.name}
                    className="w-8 h-8 rounded object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                    <PhotoIcon className="h-4 w-4 text-gray-400" />
                  </div>
                )}
                <span className="font-medium">{selectedMenu.name}</span>
                <span className="text-gray-500">- {selectedMenu.price} MAD</span>
              </div>
            ) : (
              <span className="text-gray-500">
                {editingRecipe ? 'Loading...' : 'Select a menu item'}
              </span>
            )}
            {!editingRecipe && (
              <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${showMenuDropdown ? 'rotate-180' : ''}`} />
            )}
          </button>

          {!editingRecipe && showMenuDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
              {/* Search Bar */}
              <div className="p-3 border-b border-gray-200">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search menu items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    autoFocus
                  />
                </div>
              </div>

              {/* Menu Items List */}
              <div className="max-h-60 overflow-y-auto">
                {filteredMenuItems.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <PhotoIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No menu items found</p>
                    <p className="text-xs">Try a different search term</p>
                  </div>
                ) : (
                  filteredMenuItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedMenuItem(item.id)
                        setShowMenuDropdown(false)
                        setSearchTerm('') // Clear search when item is selected
                      }}
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                        selectedMenuItem == item.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="flex-shrink-0 w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
                        {item.image ? (
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <PhotoIcon className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {item.name}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              {item.category_name}
                            </p>
                            {item.description && (
                              <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-green-600 ml-2 whitespace-nowrap">
                            {item.price} MAD
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Results Count */}
              {filteredMenuItems.length > 0 && (
                <div className="p-2 border-t border-gray-200 bg-gray-50">
                  <p className="text-xs text-gray-500 text-center">
                    {filteredMenuItems.length} item{filteredMenuItems.length !== 1 ? 's' : ''} found
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {selectedMenu && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-4">
              {selectedMenu.image ? (
                <img 
                  src={selectedMenu.image} 
                  alt={selectedMenu.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-blue-100 flex items-center justify-center">
                  <PhotoIcon className="h-8 w-8 text-blue-400" />
                </div>
              )}
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900">{selectedMenu.name}</h4>
                <p className="text-blue-700 text-sm">
                  {selectedMenu.price} MAD • {selectedMenu.category_name}
                </p>
                {selectedMenu.description && (
                  <p className="text-blue-600 text-xs mt-1">{selectedMenu.description}</p>
                )}
                {editingRecipe && (
                  <p className="text-blue-500 text-xs mt-2 font-medium">
                    Editing recipe - Menu item cannot be changed
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ingredients Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ingredients *
        </label>
        <div className="space-y-3">
          {ingredients.map((ingredient, index) => {
            const selectedStockItem = stockItems.find(item => item.id == ingredient.stockItemId)
            
            return (
              <div key={index} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Ingredient
                    </label>
                    <select
                      value={ingredient.stockItemId}
                      onChange={(e) => handleIngredientChange(index, 'stockItemId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      required
                    >
                      <option value="">Select ingredient</option>
                      {stockItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.unit}) - Stock: {item.quantity || 0}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Quantity per serving
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={ingredient.quantity}
                      onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      required
                    />
                  </div>
                </div>
                
                {selectedStockItem && (
                  <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                    Stock: {selectedStockItem.quantity} {selectedStockItem.unit}
                  </div>
                )}
                
                {ingredients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(index)}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove ingredient"
                  >
                    <MinusIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
        
        <button
          type="button"
          onClick={handleAddIngredient}
          className="mt-3 flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Another Ingredient
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={submitting}
        >
          {submitting 
            ? (editingRecipe ? 'Updating...' : 'Saving...') 
            : (editingRecipe ? 'Update Recipe' : 'Save Recipe')
          }
        </button>
      </div>
    </form>
  )
}

export default RecipeForm