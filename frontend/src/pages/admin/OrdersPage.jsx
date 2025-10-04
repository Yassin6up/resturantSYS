import { useState, useEffect } from 'react'
import { useSocket } from '../../contexts/SocketContext'
import { ordersAPI } from '../../services/api'
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  PrinterIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

function OrdersPage() {
  const { updateOrderStatus } = useSocket()
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    table: '',
    search: ''
  })

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

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await ordersAPI.updateOrderStatus(orderId, newStatus)
      toast.success(`Order status updated to ${newStatus}`)
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

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="form-label">Search</label>
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
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
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
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.order_code}</div>
                        <div className="text-sm text-gray-500">#{order.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.table_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.customer_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${getPaymentStatusColor(order.payment_status)}`}>
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.total.toFixed(2)} MAD
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => window.open(`/order/${order.id}`, '_blank')}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Order"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {/* Print receipt */}}
                          className="text-gray-600 hover:text-gray-900"
                          title="Print Receipt"
                        >
                          <PrinterIcon className="h-4 w-4" />
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

      {/* Order Status Legend */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Order Status Legend</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <span className="badge bg-yellow-100 text-yellow-800">PENDING</span>
              <span className="text-sm text-gray-600">Waiting for confirmation</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="badge bg-blue-100 text-blue-800">CONFIRMED</span>
              <span className="text-sm text-gray-600">Order confirmed</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="badge bg-orange-100 text-orange-800">PREPARING</span>
              <span className="text-sm text-gray-600">Being prepared</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="badge bg-green-100 text-green-800">READY</span>
              <span className="text-sm text-gray-600">Ready for pickup</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrdersPage