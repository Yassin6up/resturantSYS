import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { tablesAPI } from '../services/api'
import toast from 'react-hot-toast'

function TableForm({ 
  table = null, 
  onSave, 
  onCancel,
  branchId = 0 
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
      number: table?.number || '',
      capacity: table?.capacity || 4,
      location: table?.location || '',
      branchId: branchId,
      isActive: table?.is_active !== false
    }
  })

  const onSubmit = async (data) => {
    try {
      setLoading(true)
      
      const tableData = {
        ...data,
        branchId: parseInt(data.branchId),
        isActive: data.isActive
      }

      let response
      if (table) {
        // Update existing table
        response = await tablesAPI.updateTable(table.id, tableData)
      } else {
        // Create new table
        response = await tablesAPI.createTable(tableData)
      }

      toast.success(`Table ${table ? 'updated' : 'created'} successfully`)
      onSave(response.data.table)
    } catch (error) {
      console.error('Table save error:', error)
      toast.error(error.response?.data?.error || 'Failed to save table')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">Table Number *</label>
          <input
            type="text"
            {...register('number', { required: 'Table number is required' })}
            className="form-input"
            placeholder="e.g., T1, Table 1"
          />
          {errors.number && (
            <p className="form-error">{errors.number.message}</p>
          )}
        </div>

        <div>
          <label className="form-label">Capacity *</label>
          <input
            type="number"
            min="1"
            max="20"
            {...register('capacity', { 
              required: 'Capacity is required',
              min: { value: 1, message: 'Capacity must be at least 1' },
              max: { value: 20, message: 'Capacity cannot exceed 20' }
            })}
            className="form-input"
            placeholder="4"
          />
          {errors.capacity && (
            <p className="form-error">{errors.capacity.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="form-label">Location</label>
        <input
          type="text"
          {...register('location')}
          className="form-input"
          placeholder="e.g., Main Hall, Terrace, VIP Section"
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
          <span className="ml-2 text-sm text-gray-700">Active (available for customers)</span>
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
              {table ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            table ? 'Update Table' : 'Create Table'
          )}
        </button>
      </div>
    </form>
  )
}

export default TableForm