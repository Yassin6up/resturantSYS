import { useState, useEffect } from 'react'
import { tablesAPI } from '../../services/api'
import { PlusIcon, QrCodeIcon, PrinterIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

function TableManagementPage() {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTables()
  }, [])

  const loadTables = async () => {
    try {
      setLoading(true)
      const response = await tablesAPI.getTables({ branchId: 1 })
      setTables(response.data.tables)
    } catch (error) {
      toast.error('Failed to load tables')
      console.error('Tables load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateQRSheet = async () => {
    try {
      const response = await tablesAPI.getQRSheet(1)
      // In a real implementation, you would download or display the QR codes
      toast.success('QR codes generated successfully')
    } catch (error) {
      toast.error('Failed to generate QR codes')
      console.error('QR generation error:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tables...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Table Management</h1>
          <p className="text-gray-600">Manage tables and generate QR codes</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={generateQRSheet}
            className="btn-secondary"
          >
            <PrinterIcon className="h-5 w-5 mr-2" />
            Print QR Sheet
          </button>
          <button className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Table
          </button>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tables.map((table) => (
          <div key={table.id} className="card">
            <div className="card-body">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{table.table_number}</h3>
                  {table.description && (
                    <p className="text-sm text-gray-500">{table.description}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button className="text-blue-600 hover:text-blue-900">
                    <QrCodeIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* QR Code Preview */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 text-center">
                <div className="w-24 h-24 mx-auto bg-white rounded border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <QrCodeIcon className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 mt-2">QR Code</p>
              </div>

              {/* Table Status */}
              <div className="mb-4">
                {table.activeOrder ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-yellow-800">Active Order</p>
                    <p className="text-xs text-yellow-600">
                      {table.activeOrder.order_code} - {table.activeOrder.status}
                    </p>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-green-800">Available</p>
                    <p className="text-xs text-green-600">Ready for new customers</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button className="btn-outline btn-sm flex-1">
                  Edit
                </button>
                <button className="btn-primary btn-sm flex-1">
                  View QR
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* QR Code Instructions */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">QR Code Instructions</h2>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900">How to use QR codes:</h3>
              <ol className="mt-2 list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Print QR codes and place them on tables</li>
                <li>Customers scan QR codes with their phone camera</li>
                <li>QR codes automatically open the menu for that table</li>
                <li>Orders are automatically associated with the table</li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">QR Code URL Format:</h3>
              <code className="block mt-1 p-2 bg-gray-100 rounded text-sm">
                {window.location.origin}/menu?table=T1&branch=CAS
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TableManagementPage