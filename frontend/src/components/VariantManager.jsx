import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

function VariantManager({ variants = [], onChange }) {
  const [localVariants, setLocalVariants] = useState(variants)
  const [editingId, setEditingId] = useState(null)
  const [newVariant, setNewVariant] = useState({ name: '', priceAdjustment: 0 })
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    setLocalVariants(variants)
  }, [variants])

  const handleAdd = () => {
    if (!newVariant.name.trim()) {
      toast.error('Variant name is required')
      return
    }

    const variant = {
      id: `temp-${Date.now()}`,
      name: newVariant.name,
      price_adjustment: parseFloat(newVariant.priceAdjustment) || 0,
      sort_order: localVariants.length,
      is_active: true
    }

    const updated = [...localVariants, variant]
    setLocalVariants(updated)
    onChange(updated)
    setNewVariant({ name: '', priceAdjustment: 0 })
    setIsAdding(false)
    toast.success('Variant added')
  }

  const handleDelete = (id) => {
    const updated = localVariants.filter(v => v.id !== id)
    setLocalVariants(updated)
    onChange(updated)
    toast.success('Variant removed')
  }

  const handleEdit = (variant) => {
    setEditingId(variant.id)
  }

  const handleSaveEdit = (id, updates) => {
    const updated = localVariants.map(v => 
      v.id === id ? { ...v, ...updates } : v
    )
    setLocalVariants(updated)
    onChange(updated)
    setEditingId(null)
    toast.success('Variant updated')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Product Variants</h3>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Add Variant
          </button>
        )}
      </div>

      {/* Add New Variant Form */}
      {isAdding && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Variant Name *
              </label>
              <input
                type="text"
                value={newVariant.name}
                onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
                placeholder="e.g., Small, Medium, Large"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price Adjustment ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={newVariant.priceAdjustment}
                onChange={(e) => setNewVariant({ ...newVariant, priceAdjustment: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Check size={16} />
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false)
                setNewVariant({ name: '', priceAdjustment: 0 })
              }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Variants List */}
      {localVariants.length > 0 ? (
        <div className="space-y-2">
          {localVariants.map((variant) => (
            <VariantItem
              key={variant.id}
              variant={variant}
              isEditing={editingId === variant.id}
              onEdit={() => handleEdit(variant)}
              onSave={handleSaveEdit}
              onDelete={() => handleDelete(variant.id)}
              onCancelEdit={() => setEditingId(null)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
          <p>No variants added yet</p>
          <p className="text-sm">Click "Add Variant" to add size options, flavors, etc.</p>
        </div>
      )}
    </div>
  )
}

function VariantItem({ variant, isEditing, onEdit, onSave, onDelete, onCancelEdit }) {
  const [editData, setEditData] = useState({
    name: variant.name,
    price_adjustment: variant.price_adjustment
  })

  if (isEditing) {
    return (
      <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <input
            type="text"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="number"
            step="0.01"
            value={editData.price_adjustment}
            onChange={(e) => setEditData({ ...editData, price_adjustment: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSave(variant.id, editData)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            <Check size={14} />
            Save
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
          >
            <X size={14} />
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{variant.name}</h4>
        <p className="text-sm text-gray-600">
          Price adjustment: {variant.price_adjustment >= 0 ? '+' : ''}${parseFloat(variant.price_adjustment).toFixed(2)}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="Edit variant"
        >
          <Edit2 size={16} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Delete variant"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}

export default VariantManager
