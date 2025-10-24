import { useState, useEffect } from 'react'
import { ordersAPI } from '../../services/api'
import { 
  MagnifyingGlassIcon, 
  QrCodeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import io from 'socket.io-client'

function CashierDashboard() {
  const [searchCode, setSearchCode] = useState('')
  const [searchedOrder, setSearchedOrder] = useState(null)
  const [pendingOrders, setPendingOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    loadPendingOrders()
    setupSocketConnection()

    return () => {
      if (socket) socket.disconnect()
    }
  }, [])

  const setupSocketConnection = () => {
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001')
    
    newSocket.on('connect', () => {
      console.log('Connected to socket server')
      const branchId = 1
      newSocket.emit('join', { room: `branch:${branchId}:cashier` })
    })

    newSocket.on('order.created', (order) => {
      if (order.payment_status === 'UNPAID' && order.payment_method === 'cash') {
        toast.success(`New order: ${order.order_code}`)
        loadPendingOrders()
      }
    })

    newSocket.on('order.updated', () => {
      loadPendingOrders()
    })

    setSocket(newSocket)
  }

  const loadPendingOrders = async () => {
    try {
      const response = await ordersAPI.getOrders({
        paymentStatus: 'UNPAID',
        paymentMethod: 'cash'
      })
      setPendingOrders(response.data.orders || [])
    } catch (error) {
      console.error('Failed to load pending orders:', error)
    }
  }

  const handleSearch = async () => {
    if (!searchCode.trim()) {
      toast.error('Please enter an order code')
      return
    }

    try {
      setLoading(true)
      const response = await ordersAPI.getOrderByCode(searchCode.trim())
      setSearchedOrder(response.data.order)
      toast.success('Order found!')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Order not found')
      setSearchedOrder(null)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPayment = async (orderId, orderCode) => {
    if (!window.confirm(`Confirm payment for order ${orderCode}?`)) {
      return
    }

    try {
      setLoading(true)
      await ordersAPI.updatePayment(orderId, {
        paymentStatus: 'PAID',
        paymentMethod: 'cash'
      })
      
      toast.success('Payment confirmed! Order sent to kitchen.')
      setSearchedOrder(null)
      setSearchCode('')
      loadPendingOrders()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to confirm payment')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-8">
          <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Cashier Dashboard
          </h1>
          <p className="text-gray-600 font-medium">
            Scan or search for orders to confirm payments
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <QrCodeIcon className="h-8 w-8 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Search Order</h2>
              </div>
              
              <div className="flex gap-3">
                <input
                  type="text"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter order code (e.g., BR1-20251024-0001)"
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  <MagnifyingGlassIcon className="h-5 w-5" />
                  <span>Search</span>
                </button>
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm text-blue-800">
                  💡 Tip: Ask customer to show their QR code or order code from their phone
                </p>
              </div>
            </div>

            {searchedOrder && (
              <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-200 p-6 animate-fadeIn">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">
                      Order {searchedOrder.order_code}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Table #{searchedOrder.table_number}</span>
                      <span>•</span>
                      <span>{searchedOrder.customer_name}</span>
                      <span>•</span>
                      <span>{formatTime(searchedOrder.created_at)}</span>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full font-bold ${
                    searchedOrder.payment_status === 'PAID'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {searchedOrder.payment_status}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <h4 className="font-bold text-gray-900 mb-3">Order Items</h4>
                  <div className="space-y-2">
                    {searchedOrder.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-700">
                          {item.quantity}x {item.item_name}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {(item.quantity * item.unit_price).toFixed(2)} MAD
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total Amount:</span>
                    <span className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {searchedOrder.total.toFixed(2)} MAD
                    </span>
                  </div>
                </div>

                {searchedOrder.payment_status === 'UNPAID' ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSearchedOrder(null)}
                      className="flex-1 py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleConfirmPayment(searchedOrder.id, searchedOrder.order_code)}
                      disabled={loading}
                      className="flex-1 py-3 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <CheckCircleIcon className="h-6 w-6" />
                      <span>Confirm Payment</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl text-center">
                    <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-2" />
                    <p className="font-bold text-green-900">Payment Already Confirmed</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-4 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Pending Payments</h2>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 font-bold rounded-full text-sm">
                  {pendingOrders.length}
                </span>
              </div>

              <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                {pendingOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 font-medium">No pending payments</p>
                  </div>
                ) : (
                  pendingOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => {
                        setSearchCode(order.order_code)
                        setSearchedOrder(order)
                      }}
                      className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl cursor-pointer hover:shadow-lg transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-gray-900">{order.order_code}</p>
                          <p className="text-sm text-gray-600">Table #{order.table_number}</p>
                        </div>
                        <span className="text-lg font-bold text-orange-600">
                          {order.total.toFixed(2)} MAD
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <ClockIcon className="h-4 w-4" />
                        <span>{formatTime(order.created_at)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CashierDashboard
