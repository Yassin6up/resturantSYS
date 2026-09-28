// StockItemForm component - simplified version
import { useState, useEffect } from 'react'

function StockItemForm({ item, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    unit: 'piece',
    quantity: 0,
    min_threshold: 0
  })

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        sku: item.sku || '',
        unit: item.unit || 'piece',
        quantity: item.quantity || 0,
        min_threshold: item.min_threshold || 0
      })
    }
  }, [item])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('quantity') || name.includes('threshold') ? Number(value) : value
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Item Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          value={formData.name}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="sku" className="block text-sm font-medium text-gray-700">
          SKU (Optional)
        </label>
        <input
          type="text"
          id="sku"
          name="sku"
          value={formData.sku}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
          Current Quantity
        </label>
        <input
          type="number"
          id="quantity"
          name="quantity"
          step="0.01"
          min="0"
          value={formData.quantity}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="min_threshold" className="block text-sm font-medium text-gray-700">
          Minimum Threshold
        </label>
        <input
          type="number"
          id="min_threshold"
          name="min_threshold"
          step="0.01"
          min="0"
          value={formData.min_threshold}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
          Unit
        </label>
        <select
          id="unit"
          name="unit"
          value={formData.unit}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="piece">Piece</option>
          <option value="kg">Kilogram</option>
          <option value="g">Gram</option>
          <option value="l">Liter</option>
          <option value="ml">Milliliter</option>
          <option value="box">Box</option>
          <option value="pack">Pack</option>
          <option value="bottle">Bottle</option>
        </select>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          {item ? 'Update' : 'Create'} Stock Item
        </button>
      </div>
    </form>
  )
}

export default StockItemForm