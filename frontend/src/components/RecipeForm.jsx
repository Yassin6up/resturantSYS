import { useState, useEffect } from 'react'
import { menuAPI, inventoryAPI } from '../services/api'
import toast from 'react-hot-toast'

function RecipeForm({ onSave, onCancel }) {
  const [menuItems, setMenuItems] = useState([])
  const [stockItems, setStockItems] = useState([])
  const [selectedMenuItem, setSelectedMenuItem] = useState('')
  const [ingredients, setIngredients] = useState([{ stockItemId: '', quantity: '' }])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [menuRes, stockRes] = await Promise.all([
        menuAPI.getMenuItems(),
        inventoryAPI.getStockItems()
      ])
      
      if (menuRes.data.success) {
        setMenuItems(menuRes.data.items || [])
      }
      if (stockRes.data.success) {
        setStockItems(stockRes.data.items || [])
      }
    } catch (error) {
      toast.error('Failed to load data')
      console.error('Recipe form load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { stockItemId: '', quantity: '' }])
  }

  const handleRemoveIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...ingredients]
    newIngredients[index][field] = value
    setIngredients(newIngredients)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!selectedMenuItem) {
      toast.error('Please select a menu item')
      return
    }

    const validIngredients = ingredients.filter(
      ing => ing.stockItemId && ing.quantity && parseFloat(ing.quantity) > 0
    )

    if (validIngredients.length === 0) {
      toast.error('Please add at least one ingredient')
      return
    }

    try {
      for (const ingredient of validIngredients) {
        await inventoryAPI.createRecipe({
          menuItemId: selectedMenuItem,
          stockItemId: ingredient.stockItemId,
          qtyPerServing: parseFloat(ingredient.quantity)
        })
      }
      
      toast.success('Recipe saved successfully')
      onSave()
    } catch (error) {
      console.error('Recipe save error:', error)
      toast.error(error.response?.data?.error || 'Failed to save recipe')
    }
  }

  if (loading) {
    return <div className="text-center py-4">Loading...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Menu Item
        </label>
        <select
          value={selectedMenuItem}
          onChange={(e) => setSelectedMenuItem(e.target.value)}
          className="input"
          required
        >
          <option value="">Select a menu item</option>
          {menuItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} - {item.price} MAD
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ingredients
        </label>
        <div className="space-y-2">
          {ingredients.map((ingredient, index) => (
            <div key={index} className="flex gap-2">
              <select
                value={ingredient.stockItemId}
                onChange={(e) => handleIngredientChange(index, 'stockItemId', e.target.value)}
                className="input flex-1"
                required
              >
                <option value="">Select ingredient</option>
                {stockItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.unit})
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={ingredient.quantity}
                onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                placeholder="Quantity"
                className="input w-32"
                required
              />
              {ingredients.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveIngredient(index)}
                  className="btn-secondary text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handleAddIngredient}
          className="btn-secondary mt-2"
        >
          + Add Ingredient
        </button>
      </div>

      <div className="flex gap-2 pt-4">
        <button type="submit" className="btn-primary flex-1">
          Save Recipe
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          Cancel
        </button>
      </div>
    </form>
  )
}

export default RecipeForm
