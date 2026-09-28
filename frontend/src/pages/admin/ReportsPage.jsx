import { useState, useEffect } from 'react'
import { useAdminBusiness } from '../../contexts/AdminBusinessContext'
import { reportsAPI } from '../../services/api'
import { 
  ChartBarIcon, 
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  TableCellsIcon,
  CreditCardIcon,
  CubeIcon,
  BanknotesIcon,
  ViewColumnsIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import InteractiveExcelSheet from '../../components/ExcelSheetRenderer'

function ReportsPage() {
  const { businessType } = useAdminBusiness()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('dailySales')
  const [viewMode, setViewMode] = useState('table') // 'table' or 'excel'
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
    loadCurrentTabData()
  }, [activeTab, dateRange]) // Auto-load when tab or date range changes

  const tabs = [
    { id: 'dailySales', name: 'Daily Sales', icon: CurrencyDollarIcon },
    { id: 'salesRange', name: 'Sales Range', icon: ChartBarIcon },
    { id: 'topItems', name: 'Top Items', icon: ShoppingBagIcon },
    { id: 'tableTurnover', name: 'Table Turnover', icon: TableCellsIcon },
    { id: 'paymentMethods', name: 'Payment Methods', icon: CreditCardIcon },
    { id: 'inventoryUsage', name: 'Inventory Usage', icon: CubeIcon },
    { id: 'cashReconciliation', name: 'Cash Reconciliation', icon: BanknotesIcon },
  ].filter(tab => businessType === 'restaurant' || !['tableTurnover', 'inventoryUsage'].includes(tab.id))

  // Helper function to get date ranges
  const getDateRanges = () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1)
    
    return {
      today: {
        startDate: today.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      },
      yesterday: {
        startDate: yesterday.toISOString().split('T')[0],
        endDate: yesterday.toISOString().split('T')[0]
      },
      thisMonth: {
        startDate: firstDayOfMonth.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      },
      thisYear: {
        startDate: firstDayOfYear.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      }
    }
  }

  // Quick filter handlers
  const handleQuickFilter = (filterType) => {
    const ranges = getDateRanges()
    setDateRange(ranges[filterType])
    // Data will auto-load due to useEffect dependency
  }

  // Auto-load data for current tab
  const loadCurrentTabData = () => {
    switch (activeTab) {
      case 'dailySales':
        loadDailySales()
        break
      case 'salesRange':
        loadSalesRange()
        break
      case 'topItems':
        loadTopItems()
        break
      case 'tableTurnover':
        loadTableTurnover()
        break
      case 'inventoryUsage':
        loadInventoryUsage()
        break
      case 'paymentMethods':
        loadPaymentMethods()
        break
      case 'cashReconciliation':
        loadCashReconciliation()
        break
      default:
        break
    }
  }

  const loadDailySales = async () => {
    try {
      setLoading(true)
      const response = await reportsAPI.getDailySales({ 
        date: dateRange.startDate 
      })
      setReportData(prev => ({ ...prev, dailySales: response.data }))
      toast.success('Daily sales loaded successfully')
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
      console.log('Sales range response:', response.data)
      setReportData(prev => ({ ...prev, salesRange: response.data }))
      toast.success('Sales range loaded successfully')
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
      console.log('list top items response:', response.data)
      setReportData(prev => ({ ...prev, topItems: response.data }))
      toast.success('Top items loaded successfully')
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
      setReportData(prev => ({ ...prev, tableTurnover: response.data }))
      toast.success('Table turnover loaded successfully')
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
      setReportData(prev => ({ ...prev, inventoryUsage: response.data }))
      toast.success('Inventory usage loaded successfully')
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
      setReportData(prev => ({ ...prev, paymentMethods: response.data }))
      toast.success('Payment methods loaded successfully')
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
      setReportData(prev => ({ ...prev, cashReconciliation: response.data }))
      toast.success('Cash reconciliation loaded successfully')
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

  const printReport = () => {
    const currentTab = tabs.find(tab => tab.id === activeTab);
    const currentData = getCurrentReportData();
    
    const printWindow = window.open('', '_blank');
    
    // Get current date and time
    const now = new Date();
    const printDateTime = now.toLocaleString('en-MA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Function to generate table data based on current view and data
    const generateTableData = () => {
      if (!currentData) return { headers: [], rows: [] };

      try {
        if (viewMode === 'excel') {
          // For Excel view, we need to handle the data structure
          switch (activeTab) {
            case 'tableTurnover':
              const tableData = currentData.tableTurnover || [];
              return {
                headers: ['Table Number', 'Total Orders', 'Total Revenue', 'Avg Order Value', 'Avg Service Time'],
                rows: tableData.map(table => [
                  `Table ${table.table_number}`,
                  table.total_orders,
                  formatCurrency(table.total_revenue),
                  formatCurrency(table.average_order_value),
                  table.average_service_time ? `${Math.round(table.average_service_time)} min` : 'N/A'
                ])
              };
            
            case 'topItems':
              const topItemsData = currentData.topItems || [];
              return {
                headers: ['Rank', 'Item Name', 'Category', 'Quantity Sold', 'Total Revenue', 'Avg Price'],
                rows: topItemsData.map((item, index) => [
                  index + 1,
                  item.item_name,
                  item.category_name || 'N/A',
                  formatNumber(item.total_quantity),
                  formatCurrency(item.total_revenue),
                  formatCurrency(item.total_revenue / item.total_quantity)
                ])
              };
            
            case 'paymentMethods':
              const paymentData = currentData.paymentMethods || [];
              return {
                headers: ['Payment Method', 'Transaction Count', 'Total Amount', 'Average Amount'],
                rows: paymentData.map(method => [
                  method.payment_type?.charAt(0).toUpperCase() + method.payment_type?.slice(1).toLowerCase() || 'N/A',
                  formatNumber(method.transaction_count),
                  formatCurrency(method.total_amount),
                  formatCurrency(method.average_amount)
                ])
              };
            
            case 'salesRange':
              const salesData = currentData.dailyData || [];
              return {
                headers: ['Date', 'Total Orders', 'Total Revenue', 'Total Tax', 'Service Charge', 'Avg Order Value'],
                rows: salesData.map(day => [
                  formatDate(day.date),
                  formatNumber(day.total_orders),
                  formatCurrency(day.total_revenue),
                  formatCurrency(day.total_tax),
                  formatCurrency(day.total_service_charge),
                  formatCurrency(day.average_order_value)
                ])
              };
            
            case 'inventoryUsage':
              const inventoryData = currentData.inventoryUsage || [];
              return {
                headers: ['Item Name', 'SKU', 'Unit', 'Total Consumed', 'Total Received', 'Consumption Count'],
                rows: inventoryData.map(item => [
                  item.item_name,
                  item.sku || 'N/A',
                  item.unit || 'N/A',
                  formatNumber(item.total_consumed),
                  formatNumber(item.total_received),
                  formatNumber(item.consumption_count)
                ])
              };
            
            case 'cashReconciliation':
              const cashData = currentData;
              return {
                headers: ['Metric', 'Amount'],
                rows: [
                  ['Total Cash Received', formatCurrency(cashData.cashSummary?.total_cash_received)],
                  ['Cash Transactions', formatNumber(cashData.cashSummary?.cash_transaction_count)],
                  ['Total Refunds', formatCurrency(cashData.refundSummary?.total_refunds)],
                  ['Refund Count', formatNumber(cashData.refundSummary?.refund_count)],
                  ['Net Cash', formatCurrency(cashData.netCash)]
                ]
              };
            
            case 'dailySales':
              const dailyData = currentData;
              return {
                headers: ['Metric', 'Value'],
                rows: [
                  ['Total Revenue', formatCurrency(dailyData.summary?.total_revenue)],
                  ['Total Orders', formatNumber(dailyData.summary?.total_orders)],
                  ['Average Order Value', formatCurrency(dailyData.summary?.average_order_value)],
                  ['Total Tax', formatCurrency(dailyData.summary?.total_tax)],
                  ['Service Charge', formatCurrency(dailyData.summary?.total_service_charge)]
                ]
              };
            
            default:
              return { headers: [], rows: [] };
          }
        } else {
          // For table view, use the same data structure
          return generateTableData(); // This will use the Excel view logic
        }
      } catch (error) {
        console.error('Error generating table data:', error);
        return { headers: [], rows: [] };
      }
    };

    // Function to generate summary cards data
    const generateSummaryData = () => {
      if (!currentData) return [];
      
      switch (activeTab) {
        case 'salesRange':
          const totals = currentData.totals || {};
          return [
            { value: formatCurrency(totals.totalRevenue), label: 'Total Revenue' },
            { value: formatNumber(totals.totalOrders), label: 'Total Orders' },
            { value: formatCurrency(totals.averageOrderValue), label: 'Avg Order Value' },
            { value: formatCurrency(totals.totalTax), label: 'Total Tax' }
          ];
        
        case 'dailySales':
          const summary = currentData.summary || {};
          return [
            { value: formatCurrency(summary.total_revenue), label: 'Total Revenue' },
            { value: formatNumber(summary.total_orders), label: 'Total Orders' },
            { value: formatCurrency(summary.average_order_value), label: 'Avg Order Value' },
            { value: formatCurrency(summary.total_tax), label: 'Total Tax' }
          ];
        
        case 'cashReconciliation':
          return [
            { value: formatCurrency(currentData.cashSummary?.total_cash_received), label: 'Cash Received' },
            { value: formatNumber(currentData.cashSummary?.cash_transaction_count), label: 'Cash Transactions' },
            { value: formatCurrency(currentData.netCash), label: 'Net Cash' }
          ];
        
        default:
          return [];
      }
    };

    // Generate table HTML
    const { headers, rows } = generateTableData();
    const summaryData = generateSummaryData();

    const tableHTML = `
      <table>
        <thead>
          <tr>
            ${headers.map(header => `<th>${header}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              ${row.map(cell => `
                <td class="${typeof cell === 'string' && cell.includes('MAD') ? 'currency' : 
                            typeof cell === 'number' ? 'number' : ''}">
                  ${cell}
                </td>
              `).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    // Generate summary cards HTML
    const summaryHTML = summaryData.length > 0 ? `
      <div class="summary-section">
        <h3 style="text-align: center; margin: 20px 0; color: #2c5aa0;">Summary</h3>
        <div class="summary-cards">
          ${summaryData.map(card => `
            <div class="summary-card">
              <div class="summary-value">${card.value}</div>
              <div class="summary-label">${card.label}</div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${currentTab?.name} Report</title>
          <meta charset="UTF-8">
          <style>
            @media print {
              @page {
                margin: 0.5in;
                size: letter;
              }
              
              body {
                margin: 0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 12px;
                line-height: 1.4;
                color: #333;
                background: white;
              }
              
              .print-container {
                max-width: 100%;
                margin: 0 auto;
              }
              
              .print-header {
                text-align: center;
                margin-bottom: 25px;
                padding-bottom: 15px;
                border-bottom: 2px solid #2c5aa0;
              }
              
              .print-header h1 {
                margin: 0 0 5px 0;
                color: #2c5aa0;
                font-size: 24px;
                font-weight: bold;
              }
              
              .print-header .subtitle {
                margin: 0;
                color: #666;
                font-size: 14px;
              }
              
              .print-meta {
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
                padding: 15px;
                background-color: #f8f9fa;
                border-radius: 5px;
                border-left: 4px solid #2c5aa0;
              }
              
              .print-meta div {
                flex: 1;
              }
              
              .meta-label {
                font-weight: bold;
                color: #555;
                margin-bottom: 2px;
                font-size: 11px;
              }
              
              .meta-value {
                color: #333;
                font-size: 12px;
              }
              
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
                font-size: 11px;
                page-break-inside: auto;
              }
              
              th {
                background-color: #2c5aa0;
                color: white;
                font-weight: bold;
                padding: 10px 8px;
                text-align: left;
                border: 1px solid #1e3d6d;
              }
              
              td {
                padding: 8px;
                border: 1px solid #ddd;
                text-align: left;
                vertical-align: top;
              }
              
              tr:nth-child(even) {
                background-color: #f9f9f9;
              }
              
              .currency {
                text-align: right;
                font-family: 'Courier New', monospace;
              }
              
              .number {
                text-align: right;
                font-family: 'Courier New', monospace;
              }
              
              .summary-section {
                margin: 20px 0;
                page-break-inside: avoid;
              }
              
              .summary-cards {
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
                justify-content: center;
                margin: 15px 0;
              }
              
              .summary-card {
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 15px;
                min-width: 150px;
                text-align: center;
                background: white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              
              .summary-value {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 5px;
                color: #2c5aa0;
              }
              
              .summary-label {
                font-size: 11px;
                color: #666;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              
              .print-footer {
                margin-top: 30px;
                padding-top: 15px;
                border-top: 1px solid #ddd;
                text-align: center;
                color: #666;
                font-size: 10px;
              }
              
              /* Ensure tables don't break across pages */
              table {
                page-break-inside: auto;
              }
              
              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
              
              thead {
                display: table-header-group;
              }
            }
            
            @media screen {
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 20px;
                background: white;
              }
              
              .print-container {
                max-width: 8.5in;
                margin: 0 auto;
                padding: 20px;
                border: 1px solid #ddd;
                background: white;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <!-- Header Section -->
            <div class="print-header">
              <h1>${currentTab?.name} REPORT</h1>
              <p class="subtitle">Business Management System</p>
            </div>
            
            <!-- Metadata Section -->
            <div class="print-meta">
              <div>
                <div class="meta-label">Report Period</div>
                <div class="meta-value">${dateRange.startDate} to ${dateRange.endDate}</div>
              </div>
              <div>
                <div class="meta-label">Report Type</div>
                <div class="meta-value">${currentTab?.name}</div>
              </div>
              <div>
                <div class="meta-label">Printed On</div>
                <div class="meta-value">${printDateTime}</div>
              </div>
            </div>
            
            <!-- Summary Cards -->
            ${summaryHTML}
            
            <!-- Main Content -->
            <div class="content-section">
              ${rows.length > 0 ? tableHTML : '<p style="text-align: center; color: #666; font-style: italic;">No data available for this report</p>'}
            </div>
            
            <!-- Footer -->
            <div class="print-footer">
              <p>Generated by Business Management System • Page 1 of 1</p>
              <p>Confidential Business Document</p>
            </div>
          </div>
          
          <script>
            // Auto-print when the window loads
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 1000);
              }, 500);
            };
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(printHTML);
    printWindow.document.close();
  };

  const handleDateRangeChange = () => {
    loadCurrentTabData()
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-MA')
  }

  const getCurrentReportData = () => {
    return reportData[activeTab]
  }

  // Handle data updates from the interactive sheet
  const handleDataUpdate = (updatedData) => {
    console.log('Updated data:', updatedData);
    toast.success('Data updated successfully');
    
    // You can implement API calls to save the updated data here
    // Example:
    // saveUpdatedData(activeTab, updatedData);
  };

  // ========== ORIGINAL TABLE VIEW FUNCTIONS ==========

  const renderTableTurnoverTable = () => {
    const data = getCurrentReportData()?.tableTurnover || []
    
    if (data.length === 0) {
      return <div className="text-center py-8 text-gray-500">No table turnover data available</div>
    }

    return (
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
            {data.map((table, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Table {table.table_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {table.total_orders}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(table.total_revenue)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(table.average_order_value)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {table.average_service_time ? `${Math.round(table.average_service_time)} min` : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderTopItemsTable = () => {
    const data = getCurrentReportData()?.topItems || []
    
    if (data.length === 0) {
      return <div className="text-center py-8 text-gray-500">No top items data available</div>
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity Sold
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Revenue
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Price
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-800' :
                    index === 1 ? 'bg-gray-100 text-gray-800' :
                    index === 2 ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-50 text-blue-700'
                  }`}>
                    {index + 1}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.item_name}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {item.category_name || 'N/A'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {formatNumber(item.total_quantity)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">
                  {formatCurrency(item.total_revenue)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {formatCurrency(item.total_revenue / item.total_quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderPaymentMethodsTable = () => {
    const data = getCurrentReportData()?.paymentMethods || []
    
    if (data.length === 0) {
      return <div className="text-center py-8 text-gray-500">No payment methods data available</div>
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment Method
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Transaction Count
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Average Amount
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((method, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                  {method.payment_type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatNumber(method.transaction_count)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                  {formatCurrency(method.total_amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {formatCurrency(method.average_amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderInventoryUsageTable = () => {
    const data = getCurrentReportData()?.inventoryUsage || []
    
    if (data.length === 0) {
      return <div className="text-center py-8 text-gray-500">No inventory usage data available</div>
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Consumed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Received
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Consumption Count
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.item_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {item.sku || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {item.unit || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatNumber(item.total_consumed)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatNumber(item.total_received)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatNumber(item.consumption_count)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderSalesRangeTable = () => {
    const data = getCurrentReportData()?.dailyData || []
    const totals = getCurrentReportData()?.totals || {}
    
    if (data.length === 0) {
      return <div className="text-center py-8 text-gray-500">No sales range data available</div>
    }

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        {totals && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(totals.totalRevenue)}
              </div>
              <div className="text-sm text-blue-600">Total Revenue</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatNumber(totals.totalOrders)}
              </div>
              <div className="text-sm text-green-600">Total Orders</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(totals.averageOrderValue)}
              </div>
              <div className="text-sm text-purple-600">Avg Order Value</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(totals.totalTax)}
              </div>
              <div className="text-sm text-orange-600">Total Tax</div>
            </div>
          </div>
        )}

        {/* Daily Data Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Tax
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service Charge
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Average Order Value
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((day, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatDate(day.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatNumber(day.total_orders)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    {formatCurrency(day.total_revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatCurrency(day.total_tax)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatCurrency(day.total_service_charge)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(day.average_order_value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderDailySalesTable = () => {
    const data = getCurrentReportData()
    if (!data) {
      return <div className="text-center py-8 text-gray-500">No daily sales data available</div>
    }

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(data.summary?.total_revenue)}
            </div>
            <div className="text-sm text-blue-600">Total Revenue</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {formatNumber(data.summary?.total_orders)}
            </div>
            <div className="text-sm text-green-600">Total Orders</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(data.summary?.average_order_value)}
            </div>
            <div className="text-sm text-purple-600">Avg Order Value</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(data.summary?.total_tax)}
            </div>
            <div className="text-sm text-orange-600">Total Tax</div>
          </div>
        </div>

        {/* Status Breakdown */}
        {data.statusBreakdown && data.statusBreakdown.length > 0 && (
          <div className="overflow-x-auto">
            <h3 className="text-lg font-semibold mb-4">Orders by Status</h3>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.statusBreakdown.map((status, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                      {status.status}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(status.count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Hourly Breakdown */}
        {data.hourlyBreakdown && data.hourlyBreakdown.length > 0 && (
          <div className="overflow-x-auto">
            <h3 className="text-lg font-semibold mb-4">Hourly Sales</h3>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hour
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.hourlyBreakdown.map((hour, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {hour.hour}:00
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(hour.count)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(hour.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  const renderCashReconciliationTable = () => {
    const data = getCurrentReportData()
    if (!data) {
      return <div className="text-center py-8 text-gray-500">No cash reconciliation data available</div>
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Metric
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                Total Cash Received
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(data.cashSummary?.total_cash_received)}
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                Cash Transactions
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatNumber(data.cashSummary?.cash_transaction_count)}
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                Total Refunds
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(data.refundSummary?.total_refunds)}
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                Refund Count
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatNumber(data.refundSummary?.refund_count)}
              </td>
            </tr>
            <tr className="bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                Net Cash
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                {formatCurrency(data.netCash)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  // ========== INTERACTIVE EXCEL VIEW FUNCTIONS ==========

  const renderInteractiveTableTurnover = () => {
    const data = getCurrentReportData()?.tableTurnover || []
    
    const columns = [
      { key: 'table_number', header: 'Table Number', render: (row) => `Table ${row.table_number}` },
      { key: 'total_orders', header: 'Total Orders', render: (row) => row.total_orders },
      { key: 'total_revenue', header: 'Total Revenue', render: (row) => formatCurrency(row.total_revenue) },
      { key: 'average_order_value', header: 'Avg Order Value', render: (row) => formatCurrency(row.average_order_value) },
      { key: 'average_service_time', header: 'Avg Service Time (min)', render: (row) => row.average_service_time ? Math.round(row.average_service_time) : 'N/A' }
    ]

    return (
      <InteractiveExcelSheet 
        data={data} 
        columns={columns}
        title="Table_Turnover"
        dateRange={dateRange}
        onDataUpdate={handleDataUpdate}
      />
    )
  }

  const renderInteractiveTopItems = () => {
    const data = getCurrentReportData()?.topItems || []
    
    const columns = [
      { 
        key: 'rank', 
        header: 'Rank', 
        render: (row, index) => index + 1
      },
      { key: 'item_name', header: 'Item Name' },
      { key: 'category_name', header: 'Category', render: (row) => row.category_name || 'N/A' },
      { key: 'total_quantity', header: 'Quantity Sold', render: (row) => row.total_quantity },
      { key: 'total_revenue', header: 'Total Revenue', render: (row) => formatCurrency(row.total_revenue) },
      { 
        key: 'avg_price', 
        header: 'Avg Price', 
        render: (row) => formatCurrency(row.total_revenue / row.total_quantity)
      }
    ]

    return (
      <InteractiveExcelSheet 
        data={data} 
        columns={columns}
        title="Top_Items"
        dateRange={dateRange}
        onDataUpdate={handleDataUpdate}
      />
    )
  }

  const renderInteractivePaymentMethods = () => {
    const data = getCurrentReportData()?.paymentMethods || []
    
    const columns = [
      { key: 'payment_type', header: 'Payment Method', render: (row) => row.payment_type?.charAt(0).toUpperCase() + row.payment_type?.slice(1).toLowerCase() || 'N/A' },
      { key: 'transaction_count', header: 'Transaction Count', render: (row) => row.transaction_count },
      { key: 'total_amount', header: 'Total Amount', render: (row) => formatCurrency(row.total_amount) },
      { key: 'average_amount', header: 'Average Amount', render: (row) => formatCurrency(row.average_amount) }
    ]

    return (
      <InteractiveExcelSheet 
        data={data} 
        columns={columns}
        title="Payment_Methods"
        dateRange={dateRange}
        onDataUpdate={handleDataUpdate}
      />
    )
  }

  const renderInteractiveInventoryUsage = () => {
    const data = getCurrentReportData()?.inventoryUsage || []
    
    const columns = [
      { key: 'item_name', header: 'Item Name' },
      { key: 'sku', header: 'SKU', render: (row) => row.sku || 'N/A' },
      { key: 'unit', header: 'Unit', render: (row) => row.unit || 'N/A' },
      { key: 'total_consumed', header: 'Total Consumed', render: (row) => row.total_consumed },
      { key: 'total_received', header: 'Total Received', render: (row) => row.total_received },
      { key: 'consumption_count', header: 'Consumption Count', render: (row) => row.consumption_count }
    ]

    return (
      <InteractiveExcelSheet 
        data={data} 
        columns={columns}
        title="Inventory_Usage"
        dateRange={dateRange}
        onDataUpdate={handleDataUpdate}
      />
    )
  }

  const renderInteractiveSalesRange = () => {
    const data = getCurrentReportData()?.dailyData || []
    
    const columns = [
      { key: 'date', header: 'Date', render: (row) => formatDate(row.date) },
      { key: 'total_orders', header: 'Total Orders', render: (row) => row.total_orders },
      { key: 'total_revenue', header: 'Total Revenue', render: (row) => formatCurrency(row.total_revenue) },
      { key: 'total_tax', header: 'Total Tax', render: (row) => formatCurrency(row.total_tax) },
      { key: 'total_service_charge', header: 'Service Charge', render: (row) => formatCurrency(row.total_service_charge) },
      { key: 'average_order_value', header: 'Avg Order Value', render: (row) => formatCurrency(row.average_order_value) }
    ]

    return (
      <InteractiveExcelSheet 
        data={data} 
        columns={columns}
        title="Sales_Range"
        dateRange={dateRange}
        onDataUpdate={handleDataUpdate}
      />
    )
  }

  const renderInteractiveDailySales = () => {
    const data = getCurrentReportData()
    if (!data) return null

    const tableData = [
      { metric: 'Total Revenue', value: formatCurrency(data.summary?.total_revenue) },
      { metric: 'Total Orders', value: data.summary?.total_orders },
      { metric: 'Average Order Value', value: formatCurrency(data.summary?.average_order_value) },
      { metric: 'Total Tax', value: formatCurrency(data.summary?.total_tax) },
      { metric: 'Service Charge', value: formatCurrency(data.summary?.total_service_charge) }
    ]

    const columns = [
      { key: 'metric', header: 'Metric' },
      { key: 'value', header: 'Value' }
    ]

    return (
      <InteractiveExcelSheet 
        data={tableData} 
        columns={columns}
        title="Daily_Sales_Summary"
        dateRange={dateRange}
        onDataUpdate={handleDataUpdate}
      />
    )
  }

  const renderInteractiveCashReconciliation = () => {
    const data = getCurrentReportData()
    if (!data) return null

    const tableData = [
      { metric: 'Total Cash Received', amount: formatCurrency(data.cashSummary?.total_cash_received) },
      { metric: 'Cash Transactions', amount: data.cashSummary?.cash_transaction_count },
      { metric: 'Total Refunds', amount: formatCurrency(data.refundSummary?.total_refunds) },
      { metric: 'Refund Count', amount: data.refundSummary?.refund_count },
      { metric: 'Net Cash', amount: formatCurrency(data.netCash) }
    ]

    const columns = [
      { key: 'metric', header: 'Metric' },
      { key: 'amount', header: 'Amount' }
    ]

    return (
      <InteractiveExcelSheet 
        data={tableData} 
        columns={columns}
        title="Cash_Reconciliation"
        dateRange={dateRange}
        onDataUpdate={handleDataUpdate}
      />
    )
  }

  // ========== MAIN RENDER FUNCTION ==========

  const renderCurrentTabContent = () => {
    const currentData = getCurrentReportData()
    
    if (loading) {
      return <div className="text-center py-8">Loading...</div>
    }

    if (!currentData) {
      return (
        <div className="text-center py-8 text-gray-500">
          No data available. Click "Refresh Data" to load the report.
        </div>
      )
    }

    if (viewMode === 'excel') {
      switch (activeTab) {
        case 'dailySales':
          return renderInteractiveDailySales()
        case 'salesRange':
          return renderInteractiveSalesRange()
        case 'topItems':
          return renderInteractiveTopItems()
        case 'tableTurnover':
          return renderInteractiveTableTurnover()
        case 'paymentMethods':
          return renderInteractivePaymentMethods()
        case 'inventoryUsage':
          return renderInteractiveInventoryUsage()
        case 'cashReconciliation':
          return renderInteractiveCashReconciliation()
        default:
          return <div>Select a report type</div>
      }
    } else {
      // Table view
      switch (activeTab) {
        case 'dailySales':
          return renderDailySalesTable()
        case 'salesRange':
          return renderSalesRangeTable()
        case 'topItems':
          return renderTopItemsTable()
        case 'tableTurnover':
          return renderTableTurnoverTable()
        case 'paymentMethods':
          return renderPaymentMethodsTable()
        case 'inventoryUsage':
          return renderInventoryUsageTable()
        case 'cashReconciliation':
          return renderCashReconciliationTable()
        default:
          return <div>Select a report type</div>
      }
    }
  }

  const getLoadFunction = () => {
    switch (activeTab) {
      case 'dailySales':
        return loadDailySales
      case 'salesRange':
        return loadSalesRange
      case 'topItems':
        return loadTopItems
      case 'tableTurnover':
        return loadTableTurnover
      case 'inventoryUsage':
        return loadInventoryUsage
      case 'paymentMethods':
        return loadPaymentMethods
      case 'cashReconciliation':
        return loadCashReconciliation
      default:
        return () => {}
    }
  }

  const getExportType = () => {
    switch (activeTab) {
      case 'dailySales':
        return 'sales'
      case 'salesRange':
        return 'sales'
      case 'topItems':
        return 'items'
      case 'tableTurnover':
        return 'tables'
      case 'paymentMethods':
        return 'payments'
      case 'inventoryUsage':
        return 'inventory'
      case 'cashReconciliation':
        return 'cash'
      default:
        return 'sales'
    }
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
          <div className="space-y-4">
            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleQuickFilter('today')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  dateRange.startDate === getDateRanges().today.startDate && dateRange.endDate === getDateRanges().today.endDate
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => handleQuickFilter('yesterday')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  dateRange.startDate === getDateRanges().yesterday.startDate && dateRange.endDate === getDateRanges().yesterday.endDate
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Yesterday
              </button>
              <button
                onClick={() => handleQuickFilter('thisMonth')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  dateRange.startDate === getDateRanges().thisMonth.startDate && dateRange.endDate === getDateRanges().thisMonth.endDate
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => handleQuickFilter('thisYear')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  dateRange.startDate === getDateRanges().thisYear.startDate && dateRange.endDate === getDateRanges().thisYear.endDate
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                This Year
              </button>
            </div>

            {/* Custom Date Range */}
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
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Report'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="card">
        <div className="card-header">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {tabs.find(tab => tab.id === activeTab)?.name} Report
            </h2>
            <div className="flex space-x-2">
              {/* View Mode Toggle */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-2 text-sm font-medium ${
                    viewMode === 'table' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Table View
                </button>
                <button
                  onClick={() => setViewMode('excel')}
                  className={`px-3 py-2 text-sm font-medium flex items-center space-x-1 ${
                    viewMode === 'excel' 
                      ? 'bg-green-500 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ViewColumnsIcon className="h-4 w-4" />
                  <span>Excel Editor</span>
                </button>
              </div>

              <button
                onClick={getLoadFunction()}
                disabled={loading}
                className="btn-primary btn-sm"
              >
                {loading ? 'Loading...' : 'Refresh Data'}
              </button>
              {/* <button
                onClick={() => exportReport(getExportType())}
                disabled={loading}
                className="btn-outline btn-sm"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                Export Excel
              </button> */}
              <button
                onClick={printReport}
                className="btn-outline btn-sm"
              >
                <DocumentArrowUpIcon className="h-4 w-4 mr-1" />
                Print
              </button>
            </div>
          </div>
        </div>
        <div className="card-body" id="report-content">
          {renderCurrentTabContent()}
        </div>
      </div>
    </div>
  )
}

export default ReportsPage
