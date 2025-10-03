import { useState, useEffect } from 'react'
import AdminLayout from '../../components/Layout/AdminLayout'
import api from '../../services/api'
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'

const ReportsPage = () => {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  })
  const [reportData, setReportData] = useState({
    summary: {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      topSellingItem: null
    },
    dailySales: [],
    topItems: [],
    hourlyDistribution: []
  })

  useEffect(() => {
    fetchReportData()
  }, [dateRange])

  const fetchReportData = async () => {
    try {
      setLoading(true)
      
      // Fetch orders for the date range
      const ordersResponse = await api.get('/orders', {
        params: {
          branchId: 1,
          // In a real implementation, you'd have date range parameters
        }
      })
      
      const orders = ordersResponse.data.data.filter(order => {
        const orderDate = new Date(order.created_at).toISOString().split('T')[0]
        return orderDate >= dateRange.startDate && orderDate <= dateRange.endDate
      })

      // Calculate summary statistics
      const totalRevenue = orders
        .filter(order => order.payment_status === 'PAID')
        .reduce((sum, order) => sum + order.total, 0)
      
      const totalOrders = orders.length
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

      // Group orders by date for daily sales
      const dailySalesMap = {}
      orders.forEach(order => {
        const date = new Date(order.created_at).toISOString().split('T')[0]
        if (!dailySalesMap[date]) {
          dailySalesMap[date] = { date, revenue: 0, orders: 0 }
        }
        if (order.payment_status === 'PAID') {
          dailySalesMap[date].revenue += order.total
        }
        dailySalesMap[date].orders += 1
      })
      
      const dailySales = Object.values(dailySalesMap).sort((a, b) => a.date.localeCompare(b.date))

      // Calculate hourly distribution
      const hourlyMap = {}
      for (let i = 0; i < 24; i++) {
        hourlyMap[i] = { hour: i, orders: 0 }
      }
      
      orders.forEach(order => {
        const hour = new Date(order.created_at).getHours()
        hourlyMap[hour].orders += 1
      })
      
      const hourlyDistribution = Object.values(hourlyMap)

      // Mock top items data (in real implementation, you'd calculate from order items)
      const topItems = [
        { name: 'Tajine Poulet aux Olives', quantity: 45, revenue: 3825 },
        { name: 'Couscous Royal', quantity: 32, revenue: 3520 },
        { name: 'Jus d\'Orange Frais', quantity: 78, revenue: 1404 },
        { name: 'Thé à la Menthe', quantity: 95, revenue: 1425 },
        { name: 'Pastilla au Poulet', quantity: 28, revenue: 2100 }
      ]

      setReportData({
        summary: {
          totalRevenue,
          totalOrders,
          averageOrderValue,
          topSellingItem: topItems[0]
        },
        dailySales,
        topItems,
        hourlyDistribution
      })
      
    } catch (error) {
      console.error('Error fetching report data:', error)
      toast.error('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (format) => {
    try {
      toast.loading(`Exporting report as ${format.toUpperCase()}...`)
      
      // Simulate export delay
      setTimeout(() => {
        toast.dismiss()
        toast.success(`Report exported as ${format.toUpperCase()}`)
        
        // In a real implementation, you'd generate and download the file
        const filename = `posq_report_${dateRange.startDate}_to_${dateRange.endDate}.${format}`
        console.log(`Would download: ${filename}`)
      }, 2000)
      
    } catch (error) {
      toast.dismiss()
      toast.error('Failed to export report')
    }
  }

  const formatPrice = (price) => {
    return `${price.toFixed(2)} MAD`
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const formatHour = (hour) => {
    return `${hour.toString().padStart(2, '0')}:00`
  }

  if (loading) {
    return (
      <AdminLayout title="Reports & Analytics">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Reports & Analytics">
      <div className="space-y-6">
        {/* Date Range and Export Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="input"
              />
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => exportReport('csv')}
              className="btn-outline"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={() => exportReport('pdf')}
              className="btn-primary"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatPrice(reportData.summary.totalRevenue)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingBagIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Orders</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {reportData.summary.totalOrders}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Order Value</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatPrice(reportData.summary.averageOrderValue)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Top Item</p>
                <p className="text-lg font-semibold text-gray-900">
                  {reportData.summary.topSellingItem?.name || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Sales Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Sales</h3>
            <div className="space-y-3">
              {reportData.dailySales.map((day, index) => (
                <div key={day.date} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-primary-600 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(day.date)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatPrice(day.revenue)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {day.orders} orders
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hourly Distribution */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders by Hour</h3>
            <div className="space-y-2">
              {reportData.hourlyDistribution
                .filter(hour => hour.orders > 0)
                .sort((a, b) => b.orders - a.orders)
                .slice(0, 8)
                .map((hour) => (
                  <div key={hour.hour} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-900">
                        {formatHour(hour.hour)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full"
                          style={{
                            width: `${Math.max(10, (hour.orders / Math.max(...reportData.hourlyDistribution.map(h => h.orders))) * 100)}%`
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                        {hour.orders}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Top Selling Items */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity Sold
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Price
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.topItems.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-600">
                            {index + 1}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {item.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatPrice(item.revenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPrice(item.revenue / item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default ReportsPage