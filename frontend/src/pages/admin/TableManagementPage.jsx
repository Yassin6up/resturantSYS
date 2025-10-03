import { useState, useEffect } from 'react'
import { tablesAPI } from '../../services/api'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  QrCodeIcon,
  PrinterIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import TableForm from '../../components/TableForm'
import toast from 'react-hot-toast'

function TableManagementPage() {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTableForm, setShowTableForm] = useState(false)
  const [editingTable, setEditingTable] = useState(null)
  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedTable, setSelectedTable] = useState(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  useEffect(() => {
    loadTables()
  }, [])

  const loadTables = async () => {
    try {
      setLoading(true)
      const response = await tablesAPI.getTables({ branchId: 1 })
      if (response.data.success) {
        setTables(response.data.tables)
      }
    } catch (error) {
      toast.error('Failed to load tables')
      console.error('Tables load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTable = () => {
    setEditingTable(null)
    setShowTableForm(true)
  }

  const handleEditTable = (table) => {
    setEditingTable(table)
    setShowTableForm(true)
  }

  const handleSaveTable = (savedTable) => {
    if (editingTable) {
      // Update existing table
      setTables(prev => prev.map(table => 
        table.id === savedTable.id ? savedTable : table
      ))
    } else {
      // Add new table
      setTables(prev => [savedTable, ...prev])
    }
    setShowTableForm(false)
    setEditingTable(null)
  }

  const handleCancelForm = () => {
    setShowTableForm(false)
    setEditingTable(null)
  }

  const handleDeleteTable = async (tableId) => {
    if (!window.confirm('Are you sure you want to delete this table? This action cannot be undone.')) {
      return
    }

    try {
      await tablesAPI.deleteTable(tableId)
      setTables(prev => prev.filter(table => table.id !== tableId))
      toast.success('Table deleted successfully')
    } catch (error) {
      console.error('Table deletion error:', error)
      toast.error(error.response?.data?.error || 'Failed to delete table')
    }
  }

  const handleShowQR = async (table) => {
    try {
      const response = await tablesAPI.getTableQR(table.id)
      if (response.data.success) {
        setQrCodeUrl(response.data.qrCodeUrl)
        setSelectedTable(table)
        setShowQRModal(true)
      }
    } catch (error) {
      console.error('QR generation error:', error)
      toast.error('Failed to generate QR code')
    }
  }

  const handlePrintQR = async (table) => {
    try {
      const response = await tablesAPI.getTableQR(table.id)
      if (response.data.success) {
        // Open QR code in new window for printing
        const printWindow = window.open('', '_blank')
        printWindow.document.write(`
          <html>
            <head>
              <title>Table ${table.number} QR Code</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  text-align: center; 
                  padding: 20px; 
                }
                .qr-container { 
                  margin: 20px auto; 
                  max-width: 300px; 
                }
                .table-info { 
                  margin: 20px 0; 
                  font-size: 18px; 
                }
                img { 
                  max-width: 100%; 
                  height: auto; 
                }
                @media print {
                  body { margin: 0; }
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              <div class="table-info">
                <h1>Table ${table.number}</h1>
                <p>Capacity: ${table.capacity} people</p>
                <p>Location: ${table.location || 'Main Hall'}</p>
              </div>
              <div class="qr-container">
                <img src="${response.data.qrCodeUrl}" alt="Table ${table.number} QR Code" />
              </div>
              <div class="no-print">
                <button onclick="window.print()">Print QR Code</button>
                <button onclick="window.close()">Close</button>
              </div>
            </body>
          </html>
        `)
        printWindow.document.close()
      }
    } catch (error) {
      console.error('Print QR error:', error)
      toast.error('Failed to print QR code')
    }
  }

  const getTableStatus = (table) => {
    // Check if table has active orders
    const hasActiveOrder = table.active_order_id !== null
    return hasActiveOrder ? 'busy' : 'free'
  }

  const getTableStatusColor = (status) => {
    switch (status) {
      case 'busy':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'free':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
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
          <h1 className="text-3xl font-bold gradient-text">Table Management</h1>
          <p className="text-gray-600 mt-2">Manage restaurant tables and QR codes</p>
        </div>
        <button
          onClick={handleAddTable}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Table
        </button>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tables.map((table) => {
          const status = getTableStatus(table)
          return (
            <div key={table.id} className="card hover:shadow-lg transition-shadow duration-200">
              <div className="card-body">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Table {table.number}</h3>
                    <p className="text-sm text-gray-600">Capacity: {table.capacity} people</p>
                    {table.location && (
                      <p className="text-sm text-gray-500">{table.location}</p>
                    )}
                  </div>
                  <span className={`badge ${getTableStatusColor(status)}`}>
                    {status === 'busy' ? 'Busy' : 'Free'}
                  </span>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handleShowQR(table)}
                    className="w-full btn-outline btn-sm"
                  >
                    <EyeIcon className="h-4 w-4 mr-2" />
                    View QR Code
                  </button>
                  
                  <button
                    onClick={() => handlePrintQR(table)}
                    className="w-full btn-secondary btn-sm"
                  >
                    <PrinterIcon className="h-4 w-4 mr-2" />
                    Print QR
                  </button>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditTable(table)}
                      className="flex-1 btn-outline btn-sm"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTable(table.id)}
                      className="flex-1 btn-danger btn-sm"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {tables.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCodeIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tables found</h3>
          <p className="text-gray-600 mb-6">Get started by adding your first table</p>
          <button
            onClick={handleAddTable}
            className="btn-primary"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add First Table
          </button>
        </div>
      )}

      {/* Table Form Modal */}
      {showTableForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingTable ? 'Edit Table' : 'Add New Table'}
                </h2>
                <button
                  onClick={handleCancelForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <TableForm
                table={editingTable}
                onSave={handleSaveTable}
                onCancel={handleCancelForm}
                branchId={1}
              />
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedTable && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Table {selectedTable.number} QR Code
                </h2>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="text-center space-y-4">
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                  <img
                    src={qrCodeUrl}
                    alt={`Table ${selectedTable.number} QR Code`}
                    className="mx-auto"
                  />
                </div>
                
                <div className="text-sm text-gray-600">
                  <p>Customers can scan this QR code to view the menu</p>
                  <p>and place orders for Table {selectedTable.number}</p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => handlePrintQR(selectedTable)}
                    className="flex-1 btn-primary"
                  >
                    <PrinterIcon className="h-5 w-5 mr-2" />
                    Print QR Code
                  </button>
                  <button
                    onClick={() => setShowQRModal(false)}
                    className="flex-1 btn-outline"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TableManagementPage