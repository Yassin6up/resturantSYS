import { useState, useEffect } from 'react'
import { useSocket } from '../../contexts/SocketContext'
import { ordersAPI, appSettingsAPI , settingsAPI } from '../../services/api'
import { 
  MagnifyingGlassIcon, 
  QrCodeIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  PrinterIcon,
  KeyIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import InvoiceRenderer from '../../components/InvoiceRender'

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
  const [searchParams, setSearchParams] = useSearchParams()
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('default')
  const [businessInfo, setBusinessInfo] = useState(null)
  const [loadingBusinessInfo, setLoadingBusinessInfo] = useState(true)

  console.log('OrdersPage render with orders:', selectedOrder)

  useEffect(() => {
    loadOrders()
    loadBusinessInfo()
    
    // Check for URL parameters to show modal directly
    const orderSearchQuery = searchParams.get('orderSearchQuery')
    if (orderSearchQuery) {
      handleSearchByCodeOrPin(orderSearchQuery)
    }
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

const loadBusinessInfo = async () => {
  try {
    setLoadingBusinessInfo(true)
    
    // Fetch from both APIs
    const [appSettingsResponse, settingsResponse] = await Promise.all([
      appSettingsAPI.getSettings(),
      settingsAPI.getSettings()
    ]);

    let businessData = {
      name: 'Restaurant',
      description: 'Modern Restaurant Management System',
      currency: 'MAD',
      taxRate: 0,
      serviceCharge: 0,
      welcomeMessage: 'Thank you for your business!',
      address: '',
      phone: '',
      email: '',
      logoUrl: '',
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF'
    };

    // Process app settings API response
    if (appSettingsResponse.data && appSettingsResponse.data.settings) {
      const appSettings = appSettingsResponse.data.settings;
      
console.log('🟠 App settings fetched:', appSettings);
      // Helper function to safely extract value
      const getValue = (setting) => {
        if (!setting) return '';
        return typeof setting === 'object' && setting !== null && 'value' in setting 
          ? setting.value 
          : setting;
      };

      businessData = {
        ...businessData,
        name: getValue(appSettings.app_name) || getValue(appSettings.name) || businessData.name,
        description: getValue(appSettings.app_description) || getValue(appSettings.description) || businessData.description,
        currency: getValue(appSettings.currency) || businessData.currency,
        taxRate: parseFloat(getValue(appSettings.tax_rate)) || businessData.taxRate,
        serviceCharge: parseFloat(getValue(appSettings.service_charge)) || businessData.serviceCharge,
        welcomeMessage: getValue(appSettings.welcome_message) || businessData.welcomeMessage,
        address: getValue(appSettings.restaurant_address) || businessData.address,
        phone: getValue(appSettings.restaurant_phone) || businessData.phone,
        email: getValue(appSettings.restaurant_email) || businessData.email,
        logoUrl: appSettings.logo_url.value || businessData.logoUrl,
        primaryColor: getValue(appSettings.primary_color) || businessData.primaryColor,
        secondaryColor: getValue(appSettings.secondary_color) || businessData.secondaryColor
      };
    }

    // Process settings API response (overrides app settings with more specific values)
    if (settingsResponse.data && settingsResponse.data.settings) {
      const settings = settingsResponse.data.settings;
      
      // Find specific settings by key
  
      console.log('🟠 Settings fetched:', settings);
      businessData = {
        ...businessData,
        name: settings.restaurant_name || businessData.name,
        currency: settings.currency || businessData.currency,
        taxRate: parseFloat(settings.tax_rate) || businessData.taxRate,
        serviceCharge: parseFloat(settings.service_charge_rate) || businessData.serviceCharge,
      };
    }

    setBusinessInfo(businessData);
    console.log('Business info loaded:', businessData);
    
  } catch (error) {
    console.error('Failed to load business info:', error);
    // Set default business info if API fails
    setBusinessInfo({
      name: 'Restaurant',
      description: 'Modern Restaurant Management System',
      currency: 'MAD',
      taxRate: 0,
      serviceCharge: 0,
      welcomeMessage: 'Thank you for your business!',
      address: '',
      phone: '',
      email: '',
      logoUrl: '',
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF'
    });
  } finally {
    setLoadingBusinessInfo(false);
  }
};
  const applyFilters = () => {
    let filtered = [...orders]

    if (filters.status) {
      filtered = filtered.filter(order => order.status === filters.status)
    }

    if (filters.table) {
      filtered = filtered.filter(order => 
        order.table_number && order.table_number.toLowerCase().includes(filters.table.toLowerCase())
      )
    }

    if (filters.search) {
      filtered = filtered.filter(order => 
        order.order_code.toLowerCase().includes(filters.search.toLowerCase()) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(filters.search.toLowerCase())) ||
        (order.pin && order.pin.includes(filters.search))
      )
    }

    setFilteredOrders(filtered)
  }

  const handleSearchByCodeOrPin = async (searchValue) => {
    if (!searchValue.trim()) {
      toast.error('Please enter an order code or PIN')
      return
    }

    try {
      // Check if it's a PIN (8 digits) or order code
      const isPin = /^\d{8}$/.test(searchValue.trim());
      
      if (isPin) {
        // Search by PIN using the internal search endpoint (requires auth)
        const pinResponse = await ordersAPI.searchOrderByPin(searchValue.trim())
        if (pinResponse.data && pinResponse.data.order) {
          setSelectedOrder(pinResponse.data.order)
          setShowOrderModal(true)
          setSearchParams({ orderSearchQuery: searchValue.trim() })
          return
        }
      } else {
        // Search by order code
        const response = await ordersAPI.getOrderByCode(searchValue.trim())
        if (response.data && response.data.order) {
          setSelectedOrder(response.data.order)
          setShowOrderModal(true)
          setSearchParams({ orderSearchQuery: searchValue.trim() })
          return
        }
      }
      
      toast.error('Order not found with the provided code or PIN')
    } catch (error) {
      toast.error('Order not found with the provided code or PIN')
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
      
      // Update selected order in modal
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({
          ...prev,
          status: newStatus
        }))
      }
      
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

  const handlePrintInvoice = (order) => {
    setSelectedOrder(order)
    setShowInvoiceModal(true)
  }

  const closeModal = () => {
    setShowOrderModal(false)
    setSelectedOrder(null)
    // Remove search query from URL when closing modal
    setSearchParams({})
  }

  const closeInvoiceModal = () => {
    setShowInvoiceModal(false)
    setSelectedOrder(null)
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
          className="btn-outline rounded-lg px-4 py-2 flex items-center gap-2"
        >
          Refresh
        </button>
      </div>

      {/* Quick Search by Order Code or PIN */}
      <div className="card bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="card-body">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <QrCodeIcon className="h-5 w-5" />
            Quick Order Search
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Enter order code or PIN manually, or use a QR scanner device/app to scan the payment QR code
          </p>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchByCodeOrPin(searchInput)}
                placeholder="Enter order code or PIN (e.g., CAS-20251028-0002 or 69709299)"
                className="form-input pl-10"
              />
            </div>
            <button
              onClick={() => handleSearchByCodeOrPin(searchInput)}
              className="btn-primary px-8 whitespace-nowrap rounded-lg flex items-center justify-center "
            >
              <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
              Search Order
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
            <KeyIcon className="h-4 w-4" />
            <span>You can search by order code (CAS-20251028-0002) or PIN (69709299)</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="form-label">Filter by Code/Customer/PIN</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Order code, customer name, or PIN"
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
                className="btn-outline w-full rounded-lg h-10"
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
                        <div className="text-sm text-gray-500">PIN: {order.pin}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.table_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.customer_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {order.total?.toFixed(2)} MAD
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
                          title="View Order Details"
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
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
                  <p className="text-gray-600">Order #{selectedOrder.order_code}</p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Order Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600">Customer Name</p>
                  <p className="font-semibold text-lg">{selectedOrder.customer_name || 'No Name'}</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600">Table Number</p>
                  <p className="font-semibold text-lg">{selectedOrder.table_number || 'No Table'}</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600">Order PIN</p>
                  <p className="font-semibold text-lg font-mono">{selectedOrder.pin || 'No PIN'}</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600">Branch</p>
                  <p className="font-semibold">{selectedOrder.branch_name || 'Unknown Branch'}</p>
                </div>
              </div>

              {/* Status and Payment Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600">Payment Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`badge ${getPaymentStatusColor(selectedOrder.payment_status)} text-lg`}>
                      {selectedOrder.payment_status}
                    </span>
                    <span className="text-sm text-gray-600 capitalize">
                      ({selectedOrder.payment_method || 'cash'})
                    </span>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600">Order Status</p>
                  <div className="mt-1">
                    <select
                      value={selectedOrder.status}
                      onChange={(e) => handleStatusUpdate(selectedOrder.id, e.target.value)}
                      className={`text-sm font-medium rounded-full px-4 py-2 border-0 w-full ${getStatusColor(selectedOrder.status)}`}
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="PREPARING">PREPARING</option>
                      <option value="READY">READY</option>
                      <option value="SERVED">SERVED</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600">Order Created</p>
                  <p className="font-semibold">{formatDate(selectedOrder.created_at)}</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="font-semibold">{formatDate(selectedOrder.updated_at)}</p>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
                <h3 className="font-bold text-gray-900 mb-4 text-lg">Financial Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Subtotal</p>
                    <p className="text-lg font-semibold">{selectedOrder.total - selectedOrder.tax - selectedOrder.service_charge || 0} MAD</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Tax</p>
                    <p className="text-lg font-semibold">{selectedOrder.tax?.toFixed(2) || '0.00'} MAD</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Service Charge</p>
                    <p className="text-lg font-semibold">{selectedOrder.service_charge?.toFixed(2) || '0.00'} MAD</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold text-blue-600">{selectedOrder.total?.toFixed(2) || '0.00'} MAD</p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-gray-900 mb-4 text-lg">Order Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-xl p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">
                              {item.menu_item_name || item.item_name || `Item ${index + 1}`}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              Quantity: {item.quantity} × {item.unit_price?.toFixed(2)} MAD
                            </p>
                            {item.note && (
                              <p className="text-sm text-gray-500 mt-1">
                                Note: {item.note}
                              </p>
                            )}
                            {item.modifiers && item.modifiers.length > 0 && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-600 font-medium">Modifiers:</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {item.modifiers.map((modifier, modIndex) => (
                                    <span key={modIndex} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                      {modifier.name} (+{modifier.extra_price} MAD)
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">
                              {((item.unit_price * item.quantity) + (item.modifiers?.reduce((sum, mod) => sum + mod.extra_price, 0) * item.quantity || 0)).toFixed(2)} MAD
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-6 border-t border-gray-200">
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
                  onClick={() => handlePrintInvoice(selectedOrder)}
                  className="flex items-center justify-center gap-2 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
                >
                  <PrinterIcon className="h-5 w-5" />
                  Print Invoice
                </button>
                
                <button
                  onClick={closeModal}
                  className="flex-1 py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && selectedOrder && businessInfo && (
        <InvoiceRenderer
          order={selectedOrder}
          template={selectedTemplate}
          businessInfo={businessInfo}
          onClose={closeInvoiceModal}
        />
      )}
    </div>
  )
}

export default OrdersPage