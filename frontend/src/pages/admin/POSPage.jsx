import { useState, useEffect, useRef } from 'react'
import { ordersAPI, menuAPI, tablesAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { useReactToPrint } from 'react-to-print'
import {
  ShoppingCartIcon,
  PrinterIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon,
  XMarkIcon
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
  const [showPayment, setShowPayment] = useState(false)
  const [loading, setLoading] = useState(false)
  
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
      setCategories(response.data.categories || [])
      if (response.data.categories?.length > 0) {
        setSelectedCategory(response.data.categories[0].id)
      }
    } catch (error) {
      console.error('Failed to load menu:', error)
      toast.error('Failed to load menu')
    }
  }

  const getCurrentItems = () => {
    const category = categories.find(c => c.id === selectedCategory)
    return category?.items || []
  }

  const addToCart = (item, variant = null) => {
    const price = variant ? parseFloat(item.price) + parseFloat(variant.price_adjustment) : parseFloat(item.price)
    const cartItem = {
      id: `${item.id}-${variant?.id || 'base'}`,
      menuItemId: item.id,
      name: item.name,
      variant: variant ? variant.name : null,
      variantId: variant?.id,
      price: price,
      quantity: 1
    }

    setCart(prev => {
      const existing = prev.find(i => i.id === cartItem.id)
      if (existing) {
        return prev.map(i => 
          i.id === cartItem.id 
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [...prev, cartItem]
    })
    toast.success('Added to cart')
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

    if (orderType === 'DELIVERY' && !deliveryAddress) {
      toast.error('Please enter delivery address')
      return false
    }

    if ((orderType === 'DELIVERY' || orderType === 'TAKE_OUT') && !customerPhone) {
      toast.error('Please enter customer phone number')
      return false
    }

    return true
  }

  const handleSubmitOrder = async () => {
    if (!validateOrder()) return

    if (!paymentAmount || parseFloat(paymentAmount) < getCartTotal()) {
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
        customerPhone: orderType !== 'DINE_IN' ? customerPhone : null,
        deliveryAddress: orderType === 'DELIVERY' ? deliveryAddress : null,
        paymentMethod: 'cash',
        amountPaid: parseFloat(paymentAmount),
        changeAmount: getChange(),
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          variantId: item.variantId,
          variantName: item.variant,
          quantity: item.quantity,
          unitPrice: item.price
        }))
      }

      const response = await ordersAPI.createOrder(orderData)
      
      setCompletedOrder({
        ...response.data.order,
        items: cart,
        amountPaid: parseFloat(paymentAmount),
        change: getChange()
      })
      
      toast.success('Order completed successfully!')
      
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
                    {tables.map(table => (
                      <button
                        key={table.id}
                        onClick={() => setSelectedTable(table)}
                        className={`py-2 px-3 rounded-lg font-medium transition ${
                          selectedTable?.id === table.id
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {table.table_number}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {orderType === 'DELIVERY' && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name
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
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Enter phone number"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Address *
                    </label>
                    <textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows="2"
                      placeholder="Enter delivery address"
                      required
                    />
                  </div>
                </div>
              )}

              {orderType === 'TAKE_OUT' && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name
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
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Enter phone number"
                      required
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
                    onAddToCart={addToCart}
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
                  <div key={item.id} className="flex items-start justify-between border-b pb-3">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      {item.variant && (
                        <p className="text-sm text-gray-600">{item.variant}</p>
                      )}
                      <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <MinusIcon className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 hover:bg-red-100 text-red-600 rounded ml-2"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
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

                    {paymentAmount && parseFloat(paymentAmount) >= getCartTotal() && (
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
                  disabled={cart.length === 0 || loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                >
                  {loading ? 'Processing...' : showPayment ? 'Complete Order' : 'Proceed to Payment'}
                </button>

                {showPayment && (
                  <button
                    onClick={() => {
                      setShowPayment(false)
                      setPaymentAmount('')
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

      <div className="hidden">
        <div ref={receiptRef} className="p-8 max-w-md mx-auto">
          {completedOrder && <Receipt order={completedOrder} />}
        </div>
      </div>
    </div>
  )
}

function MenuItemCard({ item, onAddToCart }) {
  const [showVariants, setShowVariants] = useState(false)
  const hasVariants = item.variants && item.variants.length > 0

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
        
        {hasVariants ? (
          <button
            onClick={() => setShowVariants(!showVariants)}
            className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 transition"
          >
            {showVariants ? 'Hide Options' : 'Select Size'}
          </button>
        ) : (
          <button
            onClick={() => onAddToCart(item)}
            className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 transition"
          >
            Add to Cart
          </button>
        )}

        {showVariants && hasVariants && (
          <div className="mt-2 space-y-2">
            {item.variants.map(variant => (
              <button
                key={variant.id}
                onClick={() => {
                  onAddToCart(item, variant)
                  setShowVariants(false)
                }}
                className="w-full bg-gray-100 hover:bg-gray-200 py-2 px-3 rounded text-sm flex justify-between items-center transition"
              >
                <span>{variant.name}</span>
                <span className="font-semibold">
                  +${parseFloat(variant.price_adjustment).toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        )}
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
          <div key={idx} className="flex justify-between text-xs mb-1">
            <span>
              {item.quantity}x {item.name}
              {item.variant && ` (${item.variant})`}
            </span>
            <span>${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-400 pt-2 space-y-1">
        <div className="flex justify-between font-bold">
          <span>TOTAL:</span>
          <span>${order.total.toFixed(2)}</span>
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
