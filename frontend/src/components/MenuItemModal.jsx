import { useState, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline'

const MenuItemModal = ({ item, isOpen, onClose, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1)
  const [selectedModifiers, setSelectedModifiers] = useState([])
  const [notes, setNotes] = useState('')

  const handleModifierChange = (modifier, checked) => {
    if (checked) {
      setSelectedModifiers([...selectedModifiers, modifier])
    } else {
      setSelectedModifiers(selectedModifiers.filter(m => m.id !== modifier.id))
    }
  }

  const calculateTotal = () => {
    const basePrice = item.price * quantity
    const modifierPrice = selectedModifiers.reduce((sum, modifier) => 
      sum + (modifier.extra_price * quantity), 0
    )
    return basePrice + modifierPrice
  }

  const handleAddToCart = () => {
    onAddToCart(item, quantity, selectedModifiers, notes)
    onClose()
    // Reset form
    setQuantity(1)
    setSelectedModifiers([])
    setNotes('')
  }

  const formatPrice = (price) => {
    return `${price.toFixed(2)} MAD`
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    {item.name}
                  </Dialog.Title>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {item.image && (
                  <div className="mb-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}

                {item.description && (
                  <p className="text-gray-600 text-sm mb-4">{item.description}</p>
                )}

                <div className="mb-4">
                  <span className="text-xl font-bold text-primary-600">
                    {formatPrice(item.price)}
                  </span>
                </div>

                {/* Modifiers */}
                {item.modifiers && item.modifiers.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      Customize your order
                    </h4>
                    <div className="space-y-2">
                      {item.modifiers.map((modifier) => (
                        <label
                          key={modifier.id}
                          className="flex items-center justify-between p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              onChange={(e) => handleModifierChange(modifier, e.target.checked)}
                            />
                            <span className="ml-3 text-sm text-gray-900">
                              {modifier.name}
                            </span>
                          </div>
                          {modifier.extra_price > 0 && (
                            <span className="text-sm text-gray-600">
                              +{formatPrice(modifier.extra_price)}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Special Notes */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Special instructions (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="input"
                    placeholder="e.g., no spice, extra sauce..."
                  />
                </div>

                {/* Quantity and Add to Cart */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-900">Quantity:</span>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                      >
                        <MinusIcon className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(quantity + 1)}
                        className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="btn-primary"
                  >
                    Add {formatPrice(calculateTotal())}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default MenuItemModal