import { useState, useEffect } from 'react'
import { inventoryAPI } from '../../services/api'
import { format } from 'date-fns'
import { 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

function InventoryHistoryTab() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    loadHistory()
  }, [filterType])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const params = filterType !== 'all' ? { type: filterType } : {}
      const response = await inventoryAPI.getInventoryHistory(params)
      
      if (response.data.success) {
        setHistory(response.data.history || [])
      }
    } catch (error) {
      toast.error('Failed to load inventory history')
      console.error('History load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy HH:mm')
    } catch {
      return dateString
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-gray-600">Loading history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-4">
        <FunnelIcon className="h-5 w-5 text-gray-500" />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="input"
        >
          <option value="all">All Transactions</option>
          <option value="manual">Manual Adjustments</option>
          <option value="order">Order Deductions</option>
        </select>
      </div>

      {/* History Table */}
      <div className="card">
        <div className="card-body">
          {history.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No history found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Change
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((record) => (
                    <tr key={record.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(record.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {record.stock_item_name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {record.sku || 'No SKU'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {parseFloat(record.change) > 0 ? (
                            <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                          ) : (
                            <ArrowTrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
                          )}
                          <span className={`text-sm font-semibold ${
                            parseFloat(record.change) > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {parseFloat(record.change) > 0 ? '+' : ''}
                            {record.change} {record.unit}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${
                          record.type === 'order' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {record.type === 'order' ? 'Order' : 'Manual'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {record.reason}
                        {record.order_code && (
                          <span className="ml-2 text-blue-600">
                            ({record.order_code})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.full_name || record.user_name || 'System'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default InventoryHistoryTab
