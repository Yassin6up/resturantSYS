import { useState, useEffect } from 'react'
import { reportsAPI } from '../../services/api'
import { 
  ChartBarIcon, 
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

function ReportsPage() {
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [reportData, setReportData] = useState({
    dailySales: null,
    salesRange: null,
    topItems: null,
    tableTurnover: null,
    inventoryUsage: null,
    paymentMethods: null,
    cashReconciliation: null
  })

  useEffect(() => {
    loadDailySales()
  }, [])

  const loadDailySales = async () => {
    try {
      setLoading(true)
      const response = await reportsAPI.getDailySales({ 
        date: dateRange.startDate 
      })
      if (response.data.success) {
        setReportData(prev => ({ ...prev, dailySales: response.data.data }))
      }
    } catch (error) {
      toast.error('Failed to load daily sales')
      console.error('Daily sales error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSalesRange = async () => {
    try {
      setLoading(true)
      const response = await reportsAPI.getSalesRange({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      })
      if (response.data.success) {
        setReportData(prev => ({ ...prev, salesRange: response.data.data }))
      }
    } catch (error) {
      toast.error('Failed to load sales range')
      console.error('Sales range error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTopItems = async () => {
    try {
      setLoading(true)
      const response = await reportsAPI.getTopItems({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        limit: 10
      })
      if (response.data.success) {
        setReportData(prev => ({ ...prev, topItems: response.data.data }))
      }
    } catch (error) {
      toast.error('Failed to load top items')
      console.error('Top items error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTableTurnover = async () => {
    try {
      setLoading(true)
      const response = await reportsAPI.getTableTurnover({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      })
      if (response.data.success) {
        setReportData(prev => ({ ...prev, tableTurnover: response.data.data }))
      }
    } catch (error) {
      toast.error('Failed to load table turnover')
      console.error('Table turnover error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadInventoryUsage = async () => {
    try {
      setLoading(true)
      const response = await reportsAPI.getInventoryUsage({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      })
      if (response.data.success) {
        setReportData(prev => ({ ...prev, inventoryUsage: response.data.data }))
      }
    } catch (error) {
      toast.error('Failed to load inventory usage')
      console.error('Inventory usage error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPaymentMethods = async () => {
    try {
      setLoading(true)
      const response = await reportsAPI.getPaymentMethods({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      })
      if (response.data.success) {
        setReportData(prev => ({ ...prev, paymentMethods: response.data.data }))
      }
    } catch (error) {
      toast.error('Failed to load payment methods')
      console.error('Payment methods error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCashReconciliation = async () => {
    try {
      setLoading(true)
      const response = await reportsAPI.getCashReconciliation({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      })
      if (response.data.success) {
        setReportData(prev => ({ ...prev, cashReconciliation: response.data.data }))
      }
    } catch (error) {
      toast.error('Failed to load cash reconciliation')
      console.error('Cash reconciliation error:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (reportType) => {
    try {
      setLoading(true)
      const response = await reportsAPI.exportReport(reportType, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      })
      
      // Create download link
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${reportType}_report_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('Report exported successfully')
    } catch (error) {
      toast.error('Failed to export report')
      console.error('Export error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateRangeChange = () => {
    // Reload all reports with new date range
    loadSalesRange()
    loadTopItems()
    loadTableTurnover()
    loadInventoryUsage()
    loadPaymentMethods()
    loadCashReconciliation()
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-MA', {
      style: 'currency',
      currency: 'MAD'
    }).format(amount || 0)
  }

  const formatNumber = (number) => {
    return new Intl.NumberFormat('en-MA').format(number || 0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Reports & Analytics</h1>
          <p className="text-gray-600 mt-2">View and export business reports</p>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Date Range</h2>
        </div>
        <div className="card-body">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5 text-gray-400" />
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="form-input"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="form-input"
              />
            </div>
            <button
              onClick={handleDateRangeChange}
              className="btn-primary"
            >
              Update Reports
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(reportData.dailySales?.totalRevenue)}
            </div>
            <div className="text-sm text-gray-600">Total Revenue</div>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShoppingBagIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatNumber(reportData.dailySales?.totalOrders)}
            </div>
            <div className="text-sm text-gray-600">Total Orders</div>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ChartBarIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(reportData.dailySales?.averageOrderValue)}
            </div>
            <div className="text-sm text-gray-600">Avg Order Value</div>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <DocumentArrowDownIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatNumber(reportData.dailySales?.totalItemsSold)}
            </div>
            <div className="text-sm text-gray-600">Items Sold</div>
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Report */}
        <div className="card">
          <div className="card-header">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Sales Report</h2>
              <button
                onClick={() => exportReport('sales')}
                disabled={loading}
                className="btn-outline btn-sm"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                Export
              </button>
            </div>
          </div>
          <div className="card-body">
            <button
              onClick={loadSalesRange}
              disabled={loading}
              className="w-full btn-primary mb-4"
            >
              {loading ? 'Loading...' : 'Load Sales Data'}
            </button>
            
            {reportData.salesRange && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Sales:</span>
                  <span className="font-semibold">{formatCurrency(reportData.salesRange.totalSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Orders:</span>
                  <span className="font-semibold">{formatNumber(reportData.salesRange.totalOrders)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Average Order:</span>
                  <span className="font-semibold">{formatCurrency(reportData.salesRange.averageOrder)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Items Report */}
        <div className="card">
          <div className="card-header">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Top Selling Items</h2>
              <button
                onClick={() => exportReport('items')}
                disabled={loading}
                className="btn-outline btn-sm"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                Export
              </button>
            </div>
          </div>
          <div className="card-body">
            <button
              onClick={loadTopItems}
              disabled={loading}
              className="w-full btn-primary mb-4"
            >
              {loading ? 'Loading...' : 'Load Top Items'}
            </button>
            
            {reportData.topItems && (
              <div className="space-y-2">
                {reportData.topItems.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <div>
                      <span className="text-sm font-medium text-gray-900">{item.name}</span>
                      <div className="text-xs text-gray-500">{formatNumber(item.quantitySold)} sold</div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(item.totalRevenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table Turnover Report */}
        <div className="card">
          <div className="card-header">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Table Turnover</h2>
              <button
                onClick={() => exportReport('tables')}
                disabled={loading}
                className="btn-outline btn-sm"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                Export
              </button>
            </div>
          </div>
          <div className="card-body">
            <button
              onClick={loadTableTurnover}
              disabled={loading}
              className="w-full btn-primary mb-4"
            >
              {loading ? 'Loading...' : 'Load Table Data'}
            </button>
            
            {reportData.tableTurnover && (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{reportData.tableTurnover.length}</div>
                    <div className="text-sm text-gray-600">Total Tables</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {reportData.tableTurnover.reduce((sum, table) => sum + table.total_orders, 0)}
                    </div>
                    <div className="text-sm text-gray-600">Total Orders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      ${reportData.tableTurnover.reduce((sum, table) => sum + (table.total_revenue || 0), 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Total Revenue</div>
                  </div>
                </div>

                {/* Detailed Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Table Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Orders
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Revenue
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Order Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Service Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.tableTurnover.map((table, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            Table {table.table_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {table.total_orders}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${(table.total_revenue || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${(table.average_order_value || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {table.average_service_time ? `${Math.round(table.average_service_time)} min` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods Report */}
        <div className="card">
          <div className="card-header">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>
              <button
                onClick={() => exportReport('payments')}
                disabled={loading}
                className="btn-outline btn-sm"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                Export
              </button>
            </div>
          </div>
          <div className="card-body">
            <button
              onClick={loadPaymentMethods}
              disabled={loading}
              className="w-full btn-primary mb-4"
            >
              {loading ? 'Loading...' : 'Load Payment Data'}
            </button>
            
            {reportData.paymentMethods && (
              <div className="space-y-2">
                {reportData.paymentMethods.map((method, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-sm font-medium text-gray-900 capitalize">{method.method}</span>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(method.total)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatNumber(method.count)} transactions
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Inventory Usage Report */}
        <div className="card">
          <div className="card-header">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Inventory Usage</h2>
              <button
                onClick={() => exportReport('inventory')}
                disabled={loading}
                className="btn-outline btn-sm"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                Export
              </button>
            </div>
          </div>
          <div className="card-body">
            <button
              onClick={loadInventoryUsage}
              disabled={loading}
              className="w-full btn-primary mb-4"
            >
              {loading ? 'Loading...' : 'Load Inventory Data'}
            </button>
            
            {reportData.inventoryUsage && (
              <div className="space-y-2">
                {reportData.inventoryUsage.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <div>
                      <span className="text-sm font-medium text-gray-900">{item.name}</span>
                      <div className="text-xs text-gray-500">{formatNumber(item.quantityUsed)} used</div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(item.totalCost)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cash Reconciliation Report */}
        <div className="card">
          <div className="card-header">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Cash Reconciliation</h2>
              <button
                onClick={() => exportReport('cash')}
                disabled={loading}
                className="btn-outline btn-sm"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                Export
              </button>
            </div>
          </div>
          <div className="card-body">
            <button
              onClick={loadCashReconciliation}
              disabled={loading}
              className="w-full btn-primary mb-4"
            >
              {loading ? 'Loading...' : 'Load Cash Data'}
            </button>
            
            {reportData.cashReconciliation && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Opening Cash:</span>
                  <span className="font-semibold">{formatCurrency(reportData.cashReconciliation.openingCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Cash Sales:</span>
                  <span className="font-semibold">{formatCurrency(reportData.cashReconciliation.cashSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Expected Cash:</span>
                  <span className="font-semibold">{formatCurrency(reportData.cashReconciliation.expectedCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Actual Cash:</span>
                  <span className="font-semibold">{formatCurrency(reportData.cashReconciliation.actualCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Difference:</span>
                  <span className={`font-semibold ${
                    reportData.cashReconciliation.difference >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(reportData.cashReconciliation.difference)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export All Reports */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Export All Reports</h2>
        </div>
        <div className="card-body">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => exportReport('sales')}
              disabled={loading}
              className="btn-outline"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Sales Report
            </button>
            <button
              onClick={() => exportReport('items')}
              disabled={loading}
              className="btn-outline"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Items Report
            </button>
            <button
              onClick={() => exportReport('tables')}
              disabled={loading}
              className="btn-outline"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Tables Report
            </button>
            <button
              onClick={() => exportReport('payments')}
              disabled={loading}
              className="btn-outline"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Payments Report
            </button>
            <button
              onClick={() => exportReport('inventory')}
              disabled={loading}
              className="btn-outline"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Inventory Report
            </button>
            <button
              onClick={() => exportReport('cash')}
              disabled={loading}
              className="btn-outline"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Cash Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportsPage