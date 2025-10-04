import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { menuAPI } from '../services/api'
import toast from 'react-hot-toast'

function CategoryForm({ 
  category = null, 
  onSave, 
  onCancel,
  branchId = 1 
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
      name: category?.name || '',
      description: category?.description || '',
      position: category?.position || 1,
      isActive: category?.is_active !== false,
      branchId: branchId
    }
  })

  const onSubmit = async (data) => {
    try {
      setLoading(true)
      
      const categoryData = {
        ...data,
        branchId: parseInt(data.branchId),
        isActive: data.isActive
      }

      let response
      if (category) {
        // Update existing category
        response = await menuAPI.updateCategory(category.id, categoryData)
      } else {
        // Create new category
        response = await menuAPI.createCategory(categoryData)
      }

      toast.success(`Category ${category ? 'updated' : 'created'} successfully`)
      onSave(response.data.category)
    } catch (error) {
      console.error('Category save error:', error)
      toast.error(error.response?.data?.error || 'Failed to save category')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Category Name *</label>
          <input
            type="text"
            {...register('name', { required: 'Category name is required' })}
            className="form-input"
            placeholder="Enter category name"
          />
          {errors.name && (
            <p className="form-error">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="form-label">Position</label>
          <input
            type="number"
            min="1"
            {...register('position', { 
              required: 'Position is required',
              min: { value: 1, message: 'Position must be at least 1' }
            })}
            className="form-input"
            placeholder="1"
          />
          {errors.position && (
            <p className="form-error">{errors.position.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="form-label">Description</label>
        <textarea
          {...register('description')}
          rows={3}
          className="form-input"
          placeholder="Enter category description"
        />
      </div>

      {/* Status */}
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            {...register('isActive')}
            className="form-checkbox"
          />
          <span className="ml-2 text-sm text-gray-700">Active (visible to customers)</span>
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
              {category ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            category ? 'Update Category' : 'Create Category'
          )}
        </button>
      </div>
    </form>
  )
}

export default CategoryForm