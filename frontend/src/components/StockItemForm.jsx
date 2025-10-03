import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { inventoryAPI } from '../services/api'
import toast from 'react-hot-toast'

function StockItemForm({ 
  item = null, 
  onSave, 
  onCancel 
}) {
  const [loading, setLoading] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm({
    defaultValues: {
      name: item?.name || '',
      sku: item?.sku || '',
      description: item?.description || '',
      unit: item?.unit || 'piece',
      currentStock: item?.current_stock || 0,
      minStock: item?.min_stock || 0,
      maxStock: item?.max_stock || 100,
      costPrice: item?.cost_price || 0,
      supplier: item?.supplier || '',
      isActive: item?.is_active !== false
    }
  })

  const onSubmit = async (data) => {
    try {
      setLoading(true)
      
      const itemData = {
        ...data,
        current_stock: parseFloat(data.currentStock),
        min_stock: parseFloat(data.minStock),
        max_stock: parseFloat(data.maxStock),
        cost_price: parseFloat(data.costPrice),
        is_active: data.isActive
      }

      let response
      if (item) {
        // Update existing item
        response = await inventoryAPI.updateStockItem(item.id, itemData)
      } else {
        // Create new item
        response = await inventoryAPI.createStockItem(itemData)
      }

      toast.success(`Stock item ${item ? 'updated' : 'created'} successfully`)
      onSave(response.data.item)
    } catch (error) {
      console.error('Stock item save error:', error)
      toast.error(error.response?.data?.error || 'Failed to save stock item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Item Name *</label>
          <input
            type="text"
            {...register('name', { required: 'Item name is required' })}
            className="form-input"
            placeholder="Enter item name"
          />
          {errors.name && (
            <p className="form-error">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="form-label">SKU</label>
          <input
            type="text"
            {...register('sku')}
            className="form-input"
            placeholder="Enter SKU (optional)"
          />
        </div>
      </div>

      <div>
        <label className="form-label">Description</label>
        <textarea
          {...register('description')}
          rows={3}
          className="form-input"
          placeholder="Enter item description"
        />
      </div>

      {/* Stock Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Unit *</label>
          <select
            {...register('unit', { required: 'Unit is required' })}
            className="form-input"
          >
            <option value="piece">Piece</option>
            <option value="kg">Kilogram</option>
            <option value="g">Gram</option>
            <option value="liter">Liter</option>
            <option value="ml">Milliliter</option>
            <option value="box">Box</option>
            <option value="pack">Pack</option>
          </select>
          {errors.unit && (
            <p className="form-error">{errors.unit.message}</p>
          )}
        </div>

        <div>
          <label className="form-label">Current Stock *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            {...register('currentStock', { 
              required: 'Current stock is required',
              min: { value: 0, message: 'Stock cannot be negative' }
            })}
            className="form-input"
            placeholder="0"
          />
          {errors.currentStock && (
            <p className="form-error">{errors.currentStock.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Minimum Stock</label>
          <input
            type="number"
            min="0"
            step="0.01"
            {...register('minStock', { 
              min: { value: 0, message: 'Minimum stock cannot be negative' }
            })}
            className="form-input"
            placeholder="0"
          />
          {errors.minStock && (
            <p className="form-error">{errors.minStock.message}</p>
          )}
        </div>

        <div>
          <label className="form-label">Maximum Stock</label>
          <input
            type="number"
            min="0"
            step="0.01"
            {...register('maxStock', { 
              min: { value: 0, message: 'Maximum stock cannot be negative' }
            })}
            className="form-input"
            placeholder="100"
          />
          {errors.maxStock && (
            <p className="form-error">{errors.maxStock.message}</p>
          )}
        </div>
      </div>

      {/* Cost Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Cost Price</label>
          <input
            type="number"
            min="0"
            step="0.01"
            {...register('costPrice', { 
              min: { value: 0, message: 'Cost price cannot be negative' }
            })}
            className="form-input"
            placeholder="0.00"
          />
          {errors.costPrice && (
            <p className="form-error">{errors.costPrice.message}</p>
          )}
        </div>

        <div>
          <label className="form-label">Supplier</label>
          <input
            type="text"
            {...register('supplier')}
            className="form-input"
            placeholder="Enter supplier name"
          />
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            {...register('isActive')}
            className="form-checkbox"
          />
          <span className="ml-2 text-sm text-gray-700">Active (available for recipes)</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="btn-outline"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="loading-spinner mr-2"></div>
              {item ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            item ? 'Update Item' : 'Create Item'
          )}
        </button>
      </div>
    </form>
  )
}

export default StockItemForm