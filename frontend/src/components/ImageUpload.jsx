import { useState, useRef } from 'react'
import { uploadAPI } from '../services/api'
import { PhotoIcon, XMarkIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

function ImageUpload({ 
  value = '', 
  onChange, 
  className = '', 
  disabled = false,
  showPreview = true,
  maxSize = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
}) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = async (file) => {
    if (!file) return

    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, GIF, WebP)')
      return
    }

    // Validate file size
    if (file.size > maxSize) {
      toast.error(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`)
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await uploadAPI.uploadImage(formData)
      
      if (response.data.success) {
        onChange(response.data.imageUrl)
        toast.success('Image uploaded successfully')
      } else {
        throw new Error('Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error.response?.data?.error || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const removeImage = () => {
    onChange('')
  }

  const openFileDialog = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
          dragActive
            ? 'border-blue-500 bg-blue-50 scale-105 shadow-lg'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 hover:scale-102'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center">
            <div className="loading-spinner mb-4"></div>
            <p className="text-lg text-gray-600 font-medium">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <CloudArrowUpIcon className="h-8 w-8 text-white" />
            </div>
            <p className="text-lg text-gray-700 mb-2">
              <span className="font-semibold gradient-text">Click to upload</span> or drag and drop
            </p>
            <p className="text-sm text-gray-500">
              PNG, JPG, GIF, WebP up to {Math.round(maxSize / 1024 / 1024)}MB
            </p>
          </div>
        )}
      </div>

      {/* Image Preview */}
      {showPreview && value && (
        <div className="relative animate-fadeInUp">
          <div className="relative inline-block">
            <img
              src={value}
              alt="Uploaded"
              className="h-40 w-40 object-cover rounded-2xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=128&h=128&fit=crop'
              }}
            />
            {!disabled && (
              <button
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full p-2 hover:from-red-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:scale-110"
                type="button"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-2 font-medium">Click the X to remove</p>
        </div>
      )}

      {/* Current Image URL (for debugging) */}
      {value && (
        <div className="text-xs text-gray-500 break-all">
          <span className="font-medium">Current image:</span> {value}
        </div>
      )}
    </div>
  )
}

export default ImageUpload