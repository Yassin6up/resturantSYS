import { useState, useEffect } from 'react'
import { X, Search, Loader } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

function GoogleImageSearchModal({ isOpen, onClose, onSelectImage, searchQuery = '' }) {
  const [query, setQuery] = useState(searchQuery)
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState(null)

  useEffect(() => {
    if (searchQuery && isOpen) {
      setQuery(searchQuery)
      handleSearch(searchQuery)
    }
  }, [searchQuery, isOpen])

  const handleSearch = async (searchTerm = query) => {
    if (!searchTerm.trim()) {
      toast.error('Please enter a search term')
      return
    }

    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const response = await axios.get(`${API_URL}/api/google-images/search`, {
        params: { query: searchTerm, num: 10 },
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.images && response.data.images.length > 0) {
        setImages(response.data.images)
      } else {
        toast.info('No images found for this search')
        setImages([])
      }
    } catch (error) {
      console.error('Image search error:', error)
      toast.error(error.response?.data?.error || 'Failed to search images')
      setImages([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectImage = () => {
    if (selectedImageUrl) {
      onSelectImage(selectedImageUrl)
      onClose()
      setSelectedImageUrl(null)
      setImages([])
      setQuery('')
    } else {
      toast.error('Please select an image first')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Search Google Images</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for images (e.g., pizza, burger, coffee)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  Searching...
                </>
              ) : (
                <>
                  <Search size={20} />
                  Search
                </>
              )}
            </button>
          </div>
        </div>

        {/* Image Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader className="animate-spin text-blue-600" size={48} />
            </div>
          ) : images.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {images.map((image, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedImageUrl(image.url)}
                  className={`cursor-pointer rounded-lg overflow-hidden border-4 transition-all ${
                    selectedImageUrl === image.url
                      ? 'border-blue-600 shadow-lg scale-105'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <img
                    src={image.thumbnail}
                    alt={image.title}
                    className="w-full h-40 object-cover"
                    loading="lazy"
                  />
                  <div className="p-2 bg-gray-50">
                    <p className="text-xs text-gray-600 truncate" title={image.title}>
                      {image.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {image.width} × {image.height}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Search size={64} className="mb-4" />
              <p className="text-lg">Search for images to get started</p>
              <p className="text-sm">Enter a search term and click Search</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            {selectedImageUrl ? 'Click "Use Selected Image" to apply' : 'Select an image from the results'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSelectImage}
              disabled={!selectedImageUrl}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Use Selected Image
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GoogleImageSearchModal
