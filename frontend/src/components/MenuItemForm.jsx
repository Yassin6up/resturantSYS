import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { menuAPI } from '../services/api'
import { PlusIcon, TrashIcon, PhotoIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

function MenuItemForm({ 
  item = null, 
  categories = [], 
  onSave, 
  onCancel,
  onImageSearch,
  branchId = 1 
}) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [imageUrl, setImageUrl] = useState(item?.image || '')
  const [variants, setVariants] = useState([])
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const fileInputRef = useRef(null)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
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

  const watchedPrice = watch('price') || 0

  useEffect(() => {
    if (item?.id) {
      loadVariants(item.id)
      if (item.image) {
        setImageUrl(item.image)
        setImagePreview(item.image)
      }
    }
  }, [item])

  useEffect(() => {
    const handleImageSelected = (event) => {
      setImageUrl(event.detail)
      setImagePreview(event.detail)
      setSelectedFile(null) // Clear file selection when using URL
    }

    window.addEventListener('imageSelected', handleImageSelected)
    return () => window.removeEventListener('imageSelected', handleImageSelected)
  }, [])

  const loadVariants = async (menuItemId) => {
    try {
      setLoading(true)
      const response = await menuAPI.getMenuItemVariants(menuItemId)
      setVariants(response.data.variants || [])
    } catch (error) {
      console.error('Failed to load variants:', error)
      toast.error('Failed to load variants')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, WebP, GIF)')
      return
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setSelectedFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target.result)
      setImageUrl('') // Clear URL when using file upload
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImageUrl('')
    setImagePreview('')
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const addVariant = () => {
    setVariants(prev => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        name: '',
        price_adjustment: 0,
        sort_order: prev.length,
        is_active: true
      }
    ])
  }

  const updateVariant = (index, field, value) => {
    setVariants(prev => prev.map((variant, i) => 
      i === index ? { 
        ...variant, 
        [field]: field === 'price_adjustment' || field === 'sort_order' ? 
                 parseFloat(value) || 0 : value 
      } : variant
    ))
  }

  const removeVariant = (index) => {
    setVariants(prev => prev.filter((_, i) => i !== index))
  }

  const calculateVariantPrice = (priceAdjustment) => {
    const basePrice = parseFloat(watchedPrice) || 0
    const adjustment = parseFloat(priceAdjustment) || 0
    return (basePrice + adjustment).toFixed(2)
  }

const onSubmit = async (data) => {
  if (!data.name || !data.price || !data.categoryId) {
    toast.error('Please fill in all required fields')
    return
  }

  // Validate variants
  const invalidVariants = variants.filter(v => !v.name.trim())
  if (invalidVariants.length > 0) {
    toast.error('Please fill in all variant names')
    return
  }

  setSaving(true)
  try {
    // Create FormData object
    const formData = new FormData()
    
    // Append basic fields
    formData.append('name', data.name)
    formData.append('description', data.description || '')
    formData.append('price', parseFloat(data.price))
    formData.append('categoryId', parseInt(data.categoryId))
    formData.append('branchId', parseInt(branchId))
    formData.append('sku', data.sku || '')
    
    // Handle image - either file upload or URL
    if (selectedFile) {
      formData.append('image', selectedFile)
    } else if (imageUrl) {
      formData.append('image', imageUrl)
    }
    
    // Append each variant as individual fields
    variants.forEach((variant, index) => {
      formData.append(`variants[${index}][name]`, variant.name.trim())
      formData.append(`variants[${index}][price_adjustment]`, parseFloat(variant.price_adjustment || 0))
      formData.append(`variants[${index}][sort_order]`, parseInt(variant.sort_order || index))
      formData.append(`variants[${index}][is_active]`, variant.is_active !== false)
    })

    let savedItem
    if (item?.id) {
      const response = await menuAPI.updateMenuItem(item.id, formData)
      savedItem = response.data.item
    } else {
      const response = await menuAPI.createMenuItem(formData)
      savedItem = response.data.item
    }

    onSave(savedItem)
    toast.success(`Menu item ${item ? 'updated' : 'created'} successfully`)
  } catch (error) {
    console.error('Save error:', error)
    toast.error(error.response?.data?.error || `Failed to ${item ? 'update' : 'create'} menu item`)
  } finally {
    setSaving(false)
  }
}

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" encType="multipart/form-data">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item Name *
          </label>
          <input
            type="text"
            {...register('name', { required: 'Item name is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter item name"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SKU
          </label>
          <input
            type="text"
            {...register('sku')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter SKU (optional)"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          {...register('description')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter item description"
        />
      </div>

      {/* Price and Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Base Price (MAD) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('price', { 
              required: 'Price is required',
              min: { value: 0, message: 'Price must be positive' }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0.00"
          />
          {errors.price && (
            <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category *
          </label>
          <select
            {...register('categoryId', { required: 'Category is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
          )}
        </div>
      </div>

      {/* Image Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Item Image
        </label>
        
        {/* Image Preview */}
        {imagePreview && (
          <div className="mb-4">
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="h-32 w-32 object-cover rounded-lg border shadow-sm"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop'
                }}
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Upload Options */}
        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Image File
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              className="hidden"
            />
            <button
              type="button"
              onClick={triggerFileInput}
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors flex flex-col items-center justify-center space-y-2"
            >
              <CloudArrowUpIcon className="h-8 w-8 text-gray-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  Click to upload image
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG, WebP, GIF up to 5MB
                </p>
              </div>
            </button>
            {selectedFile && (
              <p className="mt-2 text-sm text-green-600">
                Selected: {selectedFile.name}
              </p>
            )}
          </div>

          {/* OR Separator */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OR</span>
            </div>
          </div>

          {/* Image URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Use Image URL
            </label>
            <div className="flex space-x-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value)
                  setImagePreview(e.target.value)
                  setSelectedFile(null)
                }}
                placeholder="https://example.com/image.jpg"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={onImageSearch}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center space-x-2 transition-colors"
              >
                <PhotoIcon className="h-4 w-4" />
                <span>Search</span>
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Enter image URL or search for images using Google
            </p>
          </div>
        </div>
      </div>

      {/* Variants Section */}
      <div className="border-t pt-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Variants</h3>
            <p className="text-sm text-gray-500">
              Add size options like Small, Medium, Large with price adjustments
            </p>
          </div>
          <button
            type="button"
            onClick={addVariant}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add Variant</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading variants...</p>
          </div>
        ) : variants.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No variants</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first variant.
            </p>
            <button
              type="button"
              onClick={addVariant}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Variant
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {variants.map((variant, index) => (
              <div key={variant.id || index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Variant Name *
                    </label>
                    <input
                      type="text"
                      value={variant.name}
                      onChange={(e) => updateVariant(index, 'name', e.target.value)}
                      placeholder="e.g., Small, Medium, Large"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price Adjustment (MAD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={variant.price_adjustment}
                      onChange={(e) => updateVariant(index, 'price_adjustment', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Total: {calculateVariantPrice(variant.price_adjustment)} MAD
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={variant.sort_order}
                      onChange={(e) => updateVariant(index, 'sort_order', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-end space-x-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`variant-active-${index}`}
                          checked={variant.is_active}
                          onChange={(e) => updateVariant(index, 'is_active', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor={`variant-active-${index}`} className="ml-2 text-sm text-gray-700">
                          Active
                        </label>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Availability */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="isAvailable"
          {...register('isAvailable')}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="isAvailable" className="ml-2 text-sm text-gray-700">
          Available for ordering
        </label>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          disabled={saving}
        >
          {saving ? (
            <>
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>{item ? 'Updating...' : 'Creating...'}</span>
            </>
          ) : (
            <span>{item ? 'Update Item' : 'Create Item'}</span>
          )}
        </button>
      </div>
    </form>
  )
}

export default MenuItemForm