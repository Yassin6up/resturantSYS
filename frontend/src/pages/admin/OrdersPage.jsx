import { useState, useEffect } from 'react'
import { useSocket } from '../../contexts/SocketContext'
import { ordersAPI } from '../../services/api'
import { 
  MagnifyingGlassIcon, 
  QrCodeIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  PrinterIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

function OrdersPage() {
  const { socket, updateOrderStatus: socketUpdateOrderStatus } = useSocket()
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    table: '',
    search: ''
  })
  const [searchInput, setSearchInput] = useState('')
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)

  useEffect(() => {
    loadOrders()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [orders, filters])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const response = await ordersAPI.getOrders({ 
        branchId: 1,
        limit: 100 
      })
      
      if (response.data.success) {
        setOrders(response.data.orders)
      } else {
        toast.error('Failed to load orders')
      }
    } catch (error) {
      toast.error('Failed to load orders')
      console.error('Orders load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...orders]

    if (filters.status) {
      filtered = filtered.filter(order => order.status === filters.status)
    }

    if (filters.table) {
      filtered = filtered.filter(order => 
        order.table_number.toLowerCase().includes(filters.table.toLowerCase())
      )
    }

    if (filters.search) {
      filtered = filtered.filter(order => 
        order.order_code.toLowerCase().includes(filters.search.toLowerCase()) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(filters.search.toLowerCase()))
      )
    }

    setFilteredOrders(filtered)
  }

  const handleSearchByCode = async () => {
    if (!searchInput.trim()) {
      toast.error('Please enter an order code')
      return
    }

    try {
      const response = await ordersAPI.getOrderByCode(searchInput.trim())
      if (response.data && response.data.order) {
        setSelectedOrder(response.data.order)
        setShowOrderModal(true)
      }
    } catch (error) {
      toast.error('Order not found')
      console.error('Order search error:', error)
    }
  }

  const handlePaymentConfirmation = async (order) => {
    try {
      const newStatus = order.payment_status === 'PAID' ? 'UNPAID' : 'PAID'
      
      await ordersAPI.updatePayment(order.id, {
        paymentStatus: newStatus,
        paymentMethod: order.payment_method || 'cash'
      })

      // Update local state
      setOrders(prev => prev.map(o => 
        o.id === order.id 
          ? { ...o, payment_status: newStatus, status: newStatus === 'PAID' ? 'CONFIRMED' : o.status }
          : o
      ))

      // Update selected order in modal
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder(prev => ({
          ...prev,
          payment_status: newStatus,
          status: newStatus === 'PAID' ? 'CONFIRMED' : prev.status
        }))
      }

      if (newStatus === 'PAID') {
        // Send to kitchen via Socket.IO when payment is confirmed
        if (socket) {
          socket.emit('order.paid', {
            orderId: order.id,
            branchId: order.branch_id,
            orderCode: order.order_code
          })
        }
        toast.success('Payment confirmed! Order sent to kitchen')
      } else {
        toast.success('Payment status updated')
      }

      loadOrders()
    } catch (error) {
      toast.error('Failed to update payment status')
      console.error('Payment update error:', error)
    }
  }

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await ordersAPI.updateOrderStatus(orderId, newStatus)
      
      // Update local state
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status: newStatus } : o
      ))
      
      // Send status update via Socket.IO for real-time updates
      if (socketUpdateOrderStatus) {
        socketUpdateOrderStatus(orderId, newStatus)
      } else if (socket) {
        socket.emit('order.updated', { orderId, status: newStatus })
      }
      
      toast.success(`Order status updated to ${newStatus}`)
      loadOrders()
    } catch (error) {
      toast.error('Failed to update order status')
      console.error('Status update error:', error)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800'
      case 'PREPARING': return 'bg-orange-100 text-orange-800'
      case 'READY': return 'bg-green-100 text-green-800'
      case 'SERVED': return 'bg-purple-100 text-purple-800'
      case 'COMPLETED': return 'bg-gray-100 text-gray-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800'
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-800'
      case 'UNPAID': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600">Manage customer orders and status</p>
        </div>
        <button
          onClick={loadOrders}
          className="btn-outline"
        >
          Refresh
        </button>
      </div>

      {/* Quick Search by Order Code */}
      <div className="card bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="card-body">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <QrCodeIcon className="h-5 w-5" />
            Quick Order Search
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Enter order code manually or use a QR scanner device/app to scan the payment QR code
          </p>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchByCode()}
                placeholder="Enter order code (e.g., R0120241024001)"
                className="form-input pl-10"
              />
            </div>
            <button
              onClick={handleSearchByCode}
              className="btn-primary px-8 whitespace-nowrap"
            >
              <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
              Search Order
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="form-label">Filter by Code/Customer</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Order code or customer name"
                  className="form-input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="form-input"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PREPARING">Preparing</option>
                <option value="READY">Ready</option>
                <option value="SERVED">Served</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="form-label">Table</label>
              <input
                type="text"
                value={filters.table}
                onChange={(e) => setFilters(prev => ({ ...prev, table: e.target.value }))}
                placeholder="Table number"
                className="form-input"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setFilters({ status: '', table: '', search: '' })}
                className="btn-outline w-full"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <div className="card-body">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Table
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.order_code}</div>
                        <div className="text-sm text-gray-500">#{order.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.table_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.customer_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {order.total.toFixed(2)} MAD
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handlePaymentConfirmation(order)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            order.payment_status === 'PAID'
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                          title="Click to toggle payment status"
                        >
                          {order.payment_status === 'PAID' ? (
                            <>
                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                              PAID
                            </>
                          ) : (
                            <>
                              <XCircleIcon className="h-3 w-3 mr-1" />
                              UNPAID
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                          className={`text-xs font-medium rounded-full px-3 py-1 border-0 ${getStatusColor(order.status)}`}
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="PREPARING">PREPARING</option>
                          <option value="READY">READY</option>
                          <option value="SERVED">SERVED</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => {
                            setSelectedOrder(order)
                            setShowOrderModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Order Details & QR"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
                  <p className="text-gray-600">Order #{selectedOrder.order_code}</p>
                </div>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600">Customer</p>
                  <p className="font-semibold">{selectedOrder.customer_name || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600">Table</p>
                  <p className="font-semibold">{selectedOrder.table_number || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600">Payment Status</p>
                  <span className={`badge ${getPaymentStatusColor(selectedOrder.payment_status)}`}>
                    {selectedOrder.payment_status}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600">Order Status</p>
                  <span className={`badge ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              {/* Total */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Amount:</span>
                  <span className="text-3xl font-bold text-blue-600">
                    {selectedOrder.total.toFixed(2)} MAD
                  </span>
                </div>
              </div>

              {/* Order QR Codes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {selectedOrder.payment_qr_code && (
                  <div className="bg-white border-2 border-blue-100 rounded-2xl p-6 text-center">
                    <h3 className="font-bold text-gray-900 mb-4">Payment QR Code</h3>
                    <img 
                      src={selectedOrder.payment_qr_code} 
                      alt="Payment QR Code"
                      className="w-48 h-48 mx-auto"
                    />
                    <p className="text-sm text-gray-600 mt-4">
                      For cashier payment confirmation
                    </p>
                  </div>
                )}
                {selectedOrder.tracking_qr_code && (
                  <div className="bg-white border-2 border-purple-100 rounded-2xl p-6 text-center">
                    <h3 className="font-bold text-gray-900 mb-4">Tracking QR Code</h3>
                    <img 
                      src={selectedOrder.tracking_qr_code} 
                      alt="Tracking QR Code"
                      className="w-48 h-48 mx-auto"
                    />
                    <p className="text-sm text-gray-600 mt-4">
                      For customer order tracking
                    </p>
                  </div>
                )}
              </div>

              {/* Order Items */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-bold text-gray-900 mb-3">Order Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center bg-gray-50 rounded-lg p-3">
                        <div>
                          <p className="font-medium">{item.item_name}</p>
                          <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-semibold">{item.total.toFixed(2)} MAD</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => handlePaymentConfirmation(selectedOrder)}
                  className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-colors ${
                    selectedOrder.payment_status === 'PAID'
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {selectedOrder.payment_status === 'PAID' ? 'Mark as Unpaid' : 'Confirm Payment'}
                </button>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="flex-1 py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrdersPage
