import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { menuAPI } from '../services/api'
import ImageUpload from './ImageUpload'
import toast from 'react-hot-toast'

function MenuItemForm({ 
  item = null, 
  categories = [], 
  onSave, 
  onCancel,
  branchId = 1 
}) {
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState(item?.image || '')
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm({
    defaultValues: {
      name: item?.name || '',
      description: item?.description || '',
      price: item?.price || 0,
      sku: item?.sku || '',
      categoryId: item?.category_id || '',
      branchId: branchId,
      isAvailable: item?.is_available !== false
    }
  })

  const onSubmit = async (data) => {
    try {
      setLoading(true)
      
      const menuItemData = {
        ...data,
        image: imageUrl,
        branchId: parseInt(data.branchId),
        categoryId: parseInt(data.categoryId)
      }

      let response
      if (item) {
        // Update existing item
        response = await menuAPI.updateMenuItem(item.id, menuItemData)
      } else {
        // Create new item
        response = await menuAPI.createMenuItem(menuItemData)
      }

      toast.success(`Menu item ${item ? 'updated' : 'created'} successfully`)
      onSave(response.data.item)
    } catch (error) {
      console.error('Menu item save error:', error)
      toast.error(error.response?.data?.error || 'Failed to save menu item')
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

      {/* Price and Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Price (MAD) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('price', { 
              required: 'Price is required',
              min: { value: 0, message: 'Price must be positive' }
            })}
            className="form-input"
            placeholder="0.00"
          />
          {errors.price && (
            <p className="form-error">{errors.price.message}</p>
          )}
        </div>

        <div>
          <label className="form-label">Category *</label>
          <select
            {...register('categoryId', { required: 'Category is required' })}
            className="form-input"
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="form-error">{errors.categoryId.message}</p>
          )}
        </div>
      </div>

      {/* Image Upload */}
      <div>
        <label className="form-label">Item Image</label>
        <ImageUpload
          value={imageUrl}
          onChange={setImageUrl}
          showPreview={true}
          maxSize={5 * 1024 * 1024} // 5MB
        />
        <p className="text-xs text-gray-500 mt-1">
          Upload a high-quality image of your menu item. Recommended size: 400x300px
        </p>
      </div>

      {/* Availability */}
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            {...register('isAvailable')}
            className="form-checkbox"
          />
          <span className="ml-2 text-sm text-gray-700">Available for ordering</span>
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

export default MenuItemForm