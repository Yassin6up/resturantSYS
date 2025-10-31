import { useState, useEffect, useRef } from 'react'
import { ordersAPI, menuAPI, tablesAPI, paymentsAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { useReactToPrint } from 'react-to-print'
import {
  ShoppingCartIcon,
  PrinterIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon,
  XMarkIcon,
  CreditCardIcon,
  PencilIcon
} from '@heroicons/react/24/outline'

function POSPage() {
  const [orderType, setOrderType] = useState('DINE_IN')
  const [selectedTable, setSelectedTable] = useState(null)
  const [tables, setTables] = useState([])
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerName, setCustomerName] = useState('')
  
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [cart, setCart] = useState([])
  
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [showPayment, setShowPayment] = useState(false)
  const [loading, setLoading] = useState(false)
  const [processingCard, setProcessingCard] = useState(false)
  
  const [selectedItem, setSelectedItem] = useState(null)
  const [showItemModal, setShowItemModal] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [note, setNote] = useState('')
  
  const [completedOrder, setCompletedOrder] = useState(null)
  const receiptRef = useRef()

  useEffect(() => {
    loadTables()
    loadMenu()
  }, [])

  const loadTables = async () => {
    try {
      const response = await tablesAPI.getTables()
      setTables(response.data.tables || [])
    } catch (error) {
      console.error('Failed to load tables:', error)
    }
  }

  const loadMenu = async () => {
    try {
      const branchId = 1
      const response = await menuAPI.getMenu({ branchId })
      console.log('Menu response:', response.data)
      setCategories(response.data.categories || [])
      if (response.data.categories?.length > 0) {
        setSelectedCategory(response.data.categories[0].id)
      }
    } catch (error) {
      console.error('Failed to load menu:', error)
      toast.error('Failed to load menu')
    }
  }

  const getTableStatus = (table) => {
    const hasActiveOrder = table.activeOrder !== undefined && table.activeOrder !== null 
    return hasActiveOrder ? 'busy' : 'free'
  }

  const updateTableStatus = (tableId, isBusy) => {
    setTables(prevTables => 
      prevTables.map(table => 
        table.id === tableId 
          ? { ...table, activeOrder: isBusy }
          : table
      )
    )
  }

  const getCurrentItems = () => {
    const category = categories.find(c => c.id === selectedCategory)
    return category?.items || []
  }

  const handleAddItemClick = (item) => {
    // Check if item has variants
    const hasVariants = item.variants && item.variants.length > 0
    
    if (hasVariants || item.modifiers?.length > 0) {
      // Show modal for items with variants or modifiers
      setSelectedItem(item)
      setQuantity(1)
      setSelectedVariant(null)
      setNote('')
      setShowItemModal(true)
    } else {
      // Direct add to cart for items without variants or modifiers
      addToCart(item, null, '')
    }
  }

  const addToCart = (item, variant = null, note = '') => {
    const price = variant ? parseFloat(item.price) + parseFloat(variant.price_adjustment) : parseFloat(item.price)
    const cartItem = {
      id: `${item.id}-${variant?.id || 'base'}-${Date.now()}`,
      menuItemId: item.id,
      name: item.name,
      variant: variant ? variant.name : null,
      variantId: variant?.id,
      price: price,
      quantity: 1,
      note: note,
      modifiers: [] // You can extend this to include modifiers if needed
    }

    setCart(prev => {
      const existing = prev.find(i => 
        i.menuItemId === cartItem.menuItemId && 
        i.variantId === cartItem.variantId && 
        i.note === cartItem.note
      )
      if (existing) {
        return prev.map(i => 
          i.id === existing.id 
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [...prev, cartItem]
    })
    toast.success('Added to cart')
  }

  const handleAddWithOptions = () => {
    if (!selectedItem) return

    addToCart(selectedItem, selectedVariant, note)
    
    // Reset modal
    setShowItemModal(false)
    setSelectedItem(null)
    setQuantity(1)
    setSelectedVariant(null)
    setNote('')
  }

  const updateQuantity = (cartItemId, change) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === cartItemId) {
          const newQty = item.quantity + change
          return newQty > 0 ? { ...item, quantity: newQty } : item
        }
        return item
      }).filter(item => item.quantity > 0)
    })
  }

  const removeFromCart = (cartItemId) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId))
    toast.success('Item removed')
  }

  const editCartItem = (item) => {
    setSelectedItem(item)
    setQuantity(item.quantity)
    setSelectedVariant(item.variantId ? { id: item.variantId, name: item.variant } : null)
    setNote(item.note || '')
    setShowItemModal(true)
  }

  const updateCartItem = () => {
    if (!selectedItem) return

    setCart(prev => prev.map(item => {
      if (item.id === selectedItem.id) {
        const price = selectedVariant ? 
          parseFloat(selectedItem.price) + parseFloat(selectedVariant.price_adjustment) : 
          parseFloat(selectedItem.price)
        
        return {
          ...item,
          quantity: quantity,
          variant: selectedVariant ? selectedVariant.name : null,
          variantId: selectedVariant?.id,
          price: price,
          note: note
        }
      }
      return item
    }))

    setShowItemModal(false)
    setSelectedItem(null)
    setQuantity(1)
    setSelectedVariant(null)
    setNote('')
    toast.success('Item updated')
  }

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  const getChange = () => {
    const paid = parseFloat(paymentAmount) || 0
    const total = getCartTotal()
    return paid - total
  }

  const validateOrder = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty')
      return false
    }

    if (orderType === 'DINE_IN' && !selectedTable) {
      toast.error('Please select a table')
      return false
    }

    return true
  }

  const simulateCardPayment = async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.1
        resolve(success)
      }, 2000)
    })
  }

  const handleSubmitOrder = async () => {
    if (!validateOrder()) return

    if (paymentMethod === 'cash' && (!paymentAmount || parseFloat(paymentAmount) < getCartTotal())) {
      toast.error('Payment amount must be at least the order total')
      return
    }

    try {
      setLoading(true)
      
      const orderData = {
        branchId: 1,
        orderType: orderType,
        tableId: orderType === 'DINE_IN' && selectedTable ? selectedTable.id : null,
        tableNumber: orderType === 'DINE_IN' && selectedTable ? selectedTable.table_number : null,
        customerName: customerName || 'Guest',
        customerPhone: customerPhone || null,
        deliveryAddress: deliveryAddress || null,
        paymentMethod: paymentMethod,
        amountPaid: paymentMethod === 'cash' ? parseFloat(paymentAmount) : getCartTotal(),
        changeAmount: paymentMethod === 'cash' ? getChange() : 0,
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          variantId: item.variantId,
          variantName: item.variant,
          quantity: item.quantity,
          unitPrice: item.price,
          note: item.note
        }))
      }

      let paymentSuccessful = true
      
      if (paymentMethod === 'card') {
        paymentSuccessful = await simulateCardPayment()
        
        if (!paymentSuccessful) {
          toast.error('Card payment failed. Please try again or use cash.')
          return
        }
      }

      const response = await ordersAPI.createOrder(orderData)
      
      if (orderType === 'DINE_IN' && selectedTable) {
        updateTableStatus(selectedTable.id, true)
      }
      
      setCompletedOrder({
        ...response.data.order,
        items: cart,
        amountPaid: paymentMethod === 'cash' ? parseFloat(paymentAmount) : getCartTotal(),
        change: paymentMethod === 'cash' ? getChange() : 0
      })
      
      toast.success(`Order completed successfully! ${paymentMethod === 'card' ? 'Card payment processed.' : ''}`)
      
      // Reset form
      setCart([])
      setPaymentAmount('')
      setShowPayment(false)
      setCustomerName('')
      setCustomerPhone('')
      setDeliveryAddress('')
      if (orderType === 'DINE_IN') {
        setSelectedTable(null)
      }
      
      setTimeout(() => {
        handlePrint()
      }, 100)
      
    } catch (error) {
      console.error('Order submission error:', error)
      toast.error(error.response?.data?.error || 'Failed to submit order')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: `Receipt-${completedOrder?.order_code || 'ORDER'}`,
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Point of Sale</h1>
          <p className="text-gray-600">Complete POS System</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Order Type</h2>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setOrderType('DINE_IN')}
                  className={`py-3 px-4 rounded-lg font-medium transition ${
                    orderType === 'DINE_IN'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Dine In
                </button>
                <button
                  onClick={() => setOrderType('DELIVERY')}
                  className={`py-3 px-4 rounded-lg font-medium transition ${
                    orderType === 'DELIVERY'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Delivery
                </button>
                <button
                  onClick={() => setOrderType('TAKE_OUT')}
                  className={`py-3 px-4 rounded-lg font-medium transition ${
                    orderType === 'TAKE_OUT'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Take Out
                </button>
              </div>

              {orderType === 'DINE_IN' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Table
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {tables.map(table => {
                      const status = getTableStatus(table)
                      const isBusy = status === 'busy'
                      return (
                        <button
                          key={table.id}
                          onClick={() =>  setSelectedTable(table)}
                          className={`py-2 px-3 rounded-lg font-medium transition relative ${
                            selectedTable?.id === table.id
                              ? 'bg-green-600 text-white'
                              : isBusy
                              ? 'bg-red-100 text-red-700 '
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {table.table_number}
                          <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                            isBusy ? 'bg-red-500' : 'bg-green-500'
                          }`}></span>
                          {isBusy && (
                            <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-1 rounded">
                              Busy
                            </span>
                          )}
                          {selectedTable?.id === table.id && !isBusy && (
                            <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs px-1 rounded">
                              Selected
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {orderType === 'DELIVERY' && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Address (Optional)
                    </label>
                    <textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows="2"
                      placeholder="Enter delivery address"
                    />
                  </div>
                </div>
              )}

              {orderType === 'TAKE_OUT' && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Menu</h2>
              
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
                      selectedCategory === category.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {getCurrentItems().map(item => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    onAddToCart={handleAddItemClick}
                  />
                ))}
              </div>

              {getCurrentItems().length === 0 && (
                <p className="text-center text-gray-500 py-8">No items available in this category</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <ShoppingCartIcon className="w-6 h-6" />
                  Cart
                </h2>
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                  {cart.length} items
                </span>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                {cart.map(item => (
                  <div key={item.id} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        {item.variant && (
                          <p className="text-xs text-gray-600">Option: {item.variant}</p>
                        )}
                        {item.note && (
                          <p className="text-xs text-gray-600 mt-1">Note: {item.note}</p>
                        )}
                        <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p>
                      </div>
                      <button
                        onClick={() => editCartItem(item)}
                        className="p-1 hover:bg-gray-200 rounded ml-2"
                      >
                        <PencilIcon className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <MinusIcon className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 hover:bg-red-100 text-red-600 rounded"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {cart.length === 0 && (
                  <p className="text-center text-gray-500 py-8">Cart is empty</p>
                )}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span>${getCartTotal().toFixed(2)}</span>
                </div>

                {showPayment && (
                  <div className="space-y-3 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Method
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('cash')}
                          className={`py-2 px-4 rounded-lg font-medium transition ${
                            paymentMethod === 'cash'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          💵 Cash
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('card')}
                          className={`py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-1 ${
                            paymentMethod === 'card'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <CreditCardIcon className="w-4 h-4" />
                          Card
                        </button>
                      </div>
                    </div>
                    
                    {paymentMethod === 'cash' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Amount Paid
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-lg"
                          placeholder="0.00"
                          autoFocus
                        />
                      </div>
                    )}
                    
                    {paymentMethod === 'cash' && paymentAmount && parseFloat(paymentAmount) >= getCartTotal() && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex justify-between text-lg">
                          <span className="font-medium">Change:</span>
                          <span className="font-bold text-green-600">
                            ${getChange().toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => {
                    if (!showPayment) {
                      setShowPayment(true)
                    } else {
                      handleSubmitOrder()
                    }
                  }}
                  disabled={cart.length === 0 || loading || processingCard}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {processingCard ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Processing Card...
                    </>
                  ) : loading ? (
                    'Processing...'
                  ) : showPayment ? (
                    paymentMethod === 'card' ? 'Process Card Payment' : 'Complete Order'
                  ) : (
                    'Proceed to Payment'
                  )}
                </button>

                {showPayment && (
                  <button
                    onClick={() => {
                      setShowPayment(false)
                      setPaymentAmount('')
                      setPaymentMethod('cash')
                    }}
                    className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition"
                  >
                    Cancel Payment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Item Modal for Variants and Notes */}
      {showItemModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedItem.name}
                </h3>
                <button
                  onClick={() => setShowItemModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {selectedItem.description && (
                <p className="text-gray-600 mb-4 text-sm">{selectedItem.description}</p>
              )}

              {/* Variants Section */}
              {selectedItem.variants && selectedItem.variants.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Options (Optional)</h4>
                  <div className="space-y-2">
                    {selectedItem.variants.map((variant) => (
                      <label key={variant.id} className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedVariant?.id === variant.id}
                          onChange={() => {
                            if (selectedVariant?.id === variant.id) {
                              setSelectedVariant(null)
                            } else {
                              setSelectedVariant(variant)
                            }
                          }}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                        <span className="ml-2 text-sm text-gray-700 flex-1">
                          {variant.name}
                          {parseFloat(variant.price_adjustment || 0) !== 0 && (
                            <span className={`ml-1 ${variant.price_adjustment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {variant.price_adjustment > 0 ? '+' : ''}
                              {parseFloat(variant.price_adjustment || 0).toFixed(2)} MAD
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Note Section */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Instructions
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Any special requests?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              {/* Quantity Section */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    disabled={quantity <= 1}
                  >
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <span className="text-lg font-medium w-8 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowItemModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={selectedItem.id in cart ? updateCartItem : handleAddWithOptions}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  {selectedItem.id in cart ? 'Update Item' : 'Add to Cart'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="hidden">
        <div ref={receiptRef} className="p-8 max-w-md mx-auto">
          {completedOrder && <Receipt order={completedOrder} />}
        </div>
      </div>
    </div>
  )
}

function MenuItemCard({ item, onAddToCart }) {
  const hasVariants = item.variants && item.variants.length > 0
  const hasModifiers = item.modifiers && item.modifiers.length > 0

  return (
    <div className="border rounded-lg overflow-hidden hover:shadow-lg transition">
      {item.image && (
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-32 object-cover"
        />
      )}
      <div className="p-3">
        <h3 className="font-semibold text-sm mb-1">{item.name}</h3>
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{item.description}</p>
        <p className="text-blue-600 font-bold mb-2">${parseFloat(item.price).toFixed(2)}</p>
        
        <button
          onClick={() => onAddToCart(item)}
          className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 transition"
        >
          {hasVariants || hasModifiers ? 'Select Options' : 'Add to Cart'}
        </button>
      </div>
    </div>
  )
}

function Receipt({ order }) {
  return (
    <div className="font-mono text-sm">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold">POSQ Restaurant</h2>
        <p className="text-xs">Order Receipt</p>
        <p className="text-xs mt-2">Order: {order.order_code}</p>
        <p className="text-xs">{new Date().toLocaleString()}</p>
      </div>

      <div className="border-t border-b border-gray-400 py-2 mb-2">
        <p className="text-xs">Type: {order.order_type || 'DINE_IN'}</p>
        {order.table_number && <p className="text-xs">Table: {order.table_number}</p>}
        {order.customer_name && <p className="text-xs">Customer: {order.customer_name}</p>}
      </div>

      <div className="mb-4">
        {order.items.map((item, idx) => (
          <div key={idx} className="text-xs mb-2">
            <div className="flex justify-between">
              <span>
                {item.quantity}x {item.name}
                {item.variant && ` (${item.variant})`}
              </span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
            {item.note && (
              <p className="text-gray-600 mt-1">Note: {item.note}</p>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-gray-400 pt-2 space-y-1">
        <div className="flex justify-between font-bold">
          <span>TOTAL:</span>
          <span>${order?.total?.toFixed(2) || '0.00'}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Paid:</span>
          <span>${order.amountPaid.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs font-bold">
          <span>Change:</span>
          <span>${order.change.toFixed(2)}</span>
        </div>
      </div>

      <div className="text-center mt-4 text-xs">
        <p>Thank you for your order!</p>
        <p>Please come again</p>
      </div>
    </div>
  )
}

export default POSPage