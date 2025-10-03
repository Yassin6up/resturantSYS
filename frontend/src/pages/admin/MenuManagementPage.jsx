import { useState, useEffect } from 'react'
import AdminLayout from '../../components/Layout/AdminLayout'
import api from '../../services/api'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'

const MenuManagementPage = () => {
  const [categories, setCategories] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [showItemModal, setShowItemModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [editingCategory, setEditingCategory] = useState(null)

  useEffect(() => {
    fetchMenuData()
  }, [])

  const fetchMenuData = async () => {
    try {
      setLoading(true)
      const [categoriesRes, menuRes] = await Promise.all([
        api.get('/menu/categories', { params: { branchId: 1 } }),
        api.get('/menu', { params: { branchId: 1 } })
      ])
      
      setCategories(categoriesRes.data.data)
      
      // Flatten menu items from categories
      const items = menuRes.data.data.flatMap(cat => 
        cat.items.map(item => ({ ...item, category_name: cat.name }))
      )
      setMenuItems(items)
      
      if (categoriesRes.data.data.length > 0 && !selectedCategory) {
        setSelectedCategory(categoriesRes.data.data[0].id)
      }
    } catch (error) {
      console.error('Error fetching menu data:', error)
      toast.error('Failed to load menu data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = () => {
    setEditingCategory(null)
    setShowCategoryModal(true)
  }

  const handleEditCategory = (category) => {
    setEditingCategory(category)
    setShowCategoryModal(true)
  }

  const handleCreateItem = () => {
    setEditingItem(null)
    setShowItemModal(true)
  }

  const handleEditItem = (item) => {
    setEditingItem(item)
    setShowItemModal(true)
  }

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category?')) return

    try {
      await api.delete(`/menu/categories/${categoryId}`)
      toast.success('Category deleted successfully')
      fetchMenuData()
    } catch (error) {
      console.error('Error deleting category:', error)
      toast.error(error.response?.data?.error || 'Failed to delete category')
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return

    try {
      await api.delete(`/menu/item/${itemId}`)
      toast.success('Menu item deleted successfully')
      fetchMenuData()
    } catch (error) {
      console.error('Error deleting menu item:', error)
      toast.error('Failed to delete menu item')
    }
  }

  const formatPrice = (price) => {
    return `${price.toFixed(2)} MAD`
  }

  const filteredItems = selectedCategory 
    ? menuItems.filter(item => item.category_id === selectedCategory)
    : menuItems

  if (loading) {
    return (
      <AdminLayout title="Menu Management">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Menu Management">
      <div className="space-y-6">
        {/* Categories Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
            <button
              onClick={handleCreateCategory}
              className="btn-primary"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedCategory === category.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{category.name}</h3>
                    <p className="text-sm text-gray-500">
                      {menuItems.filter(item => item.category_id === category.id).length} items
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditCategory(category)
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCategory(category.id)
                      }}
                      className="text-red-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Menu Items Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Menu Items
              {selectedCategory && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({filteredItems.length} items)
                </span>
              )}
            </h2>
            <button
              onClick={handleCreateItem}
              className="btn-primary"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Item
            </button>
          </div>

          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {selectedCategory ? 'No items in this category' : 'No menu items found'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {item.image && (
                    <div className="aspect-w-16 aspect-h-9">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {item.name}
                      </h3>
                      <span className="text-lg font-bold text-primary-600">
                        {formatPrice(item.price)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{item.category_name}</p>
                    
                    {item.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.is_available 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.is_available ? 'Available' : 'Unavailable'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {item.prep_time} min
                        </span>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditItem(item)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals would go here - simplified for this example */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </h3>
            <p className="text-gray-600 mb-4">
              Category management modal would be implemented here.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowCategoryModal(false)
                  toast.success('Category saved successfully')
                }}
                className="btn-primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">
              {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
            </h3>
            <p className="text-gray-600 mb-4">
              Menu item management modal would be implemented here with form fields for name, description, price, category, modifiers, etc.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowItemModal(false)}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowItemModal(false)
                  toast.success('Menu item saved successfully')
                }}
                className="btn-primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default MenuManagementPage