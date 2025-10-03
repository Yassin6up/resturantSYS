import { useState, useEffect } from 'react'
import AdminLayout from '../../components/Layout/AdminLayout'
import api from '../../services/api'
import {
  PlusIcon,
  QrCodeIcon,
  PrinterIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'

const TablesPage = () => {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTable, setEditingTable] = useState(null)
  const [qrCodes, setQrCodes] = useState({})

  useEffect(() => {
    fetchTables()
  }, [])

  const fetchTables = async () => {
    try {
      setLoading(true)
      const response = await api.get('/tables', { params: { branchId: 1 } })
      setTables(response.data.data)
    } catch (error) {
      console.error('Error fetching tables:', error)
      toast.error('Failed to load tables')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTable = () => {
    setEditingTable(null)
    setShowModal(true)
  }

  const handleEditTable = (table) => {
    setEditingTable(table)
    setShowModal(true)
  }

  const handleDeleteTable = async (tableId) => {
    if (!confirm('Are you sure you want to delete this table?')) return

    try {
      await api.delete(`/tables/${tableId}`)
      toast.success('Table deleted successfully')
      fetchTables()
    } catch (error) {
      console.error('Error deleting table:', error)
      toast.error(error.response?.data?.error || 'Failed to delete table')
    }
  }

  const generateQRCode = async (tableId) => {
    try {
      const response = await api.get(`/tables/${tableId}/qr`)
      setQrCodes(prev => ({
        ...prev,
        [tableId]: response.data.data.qrCode
      }))
      toast.success('QR code generated successfully')
    } catch (error) {
      console.error('Error generating QR code:', error)
      toast.error('Failed to generate QR code')
    }
  }

  const printQRCode = (table) => {
    const qrCode = qrCodes[table.id]
    if (!qrCode) {
      toast.error('Please generate QR code first')
      return
    }

    // Create a new window for printing
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${table.table_number}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 20px;
            }
            .qr-container {
              border: 2px solid #333;
              border-radius: 10px;
              padding: 20px;
              display: inline-block;
              margin: 20px;
            }
            .table-info {
              margin-bottom: 15px;
            }
            .table-number {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .table-desc {
              font-size: 14px;
              color: #666;
            }
            .qr-code {
              margin: 15px 0;
            }
            .instructions {
              font-size: 12px;
              color: #888;
              margin-top: 15px;
              line-height: 1.4;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="table-info">
              <div class="table-number">${table.table_number}</div>
              <div class="table-desc">${table.description || ''}</div>
            </div>
            <div class="qr-code">
              <img src="${qrCode}" alt="QR Code" style="width: 200px; height: 200px;" />
            </div>
            <div class="instructions">
              <strong>Scan to Order</strong><br>
              1. Scan with your phone<br>
              2. Browse menu & order<br>
              3. Pay at cashier
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const generateAllQRCodes = async () => {
    toast.loading('Generating QR codes for all tables...')
    
    try {
      for (const table of tables) {
        await generateQRCode(table.id)
      }
      toast.dismiss()
      toast.success('All QR codes generated successfully')
    } catch (error) {
      toast.dismiss()
      toast.error('Failed to generate some QR codes')
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Tables">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Tables">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Table Management</h2>
            <p className="text-gray-600">Manage tables and generate QR codes for ordering</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={generateAllQRCodes}
              className="btn-outline"
            >
              <QrCodeIcon className="h-4 w-4 mr-2" />
              Generate All QR Codes
            </button>
            <button
              onClick={handleCreateTable}
              className="btn-primary"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Table
            </button>
          </div>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tables.map((table) => (
            <div key={table.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {table.table_number}
                  </h3>
                  <p className="text-sm text-gray-600">{table.description}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditTable(table)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTable(table.id)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Capacity:</span> {table.capacity} people
                </div>

                {qrCodes[table.id] && (
                  <div className="text-center">
                    <img
                      src={qrCodes[table.id]}
                      alt={`QR Code for ${table.table_number}`}
                      className="w-24 h-24 mx-auto border border-gray-200 rounded"
                    />
                  </div>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={() => generateQRCode(table.id)}
                    className="flex-1 btn-outline text-xs py-2"
                  >
                    <QrCodeIcon className="h-3 w-3 mr-1" />
                    Generate QR
                  </button>
                  {qrCodes[table.id] && (
                    <button
                      onClick={() => printQRCode(table)}
                      className="flex-1 btn-primary text-xs py-2"
                    >
                      <PrinterIcon className="h-3 w-3 mr-1" />
                      Print
                    </button>
                  )}
                </div>

                <div className="text-xs text-gray-500 break-all">
                  {table.qr_code}
                </div>
              </div>
            </div>
          ))}
        </div>

        {tables.length === 0 && (
          <div className="text-center py-12">
            <QrCodeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No tables found</p>
            <button
              onClick={handleCreateTable}
              className="btn-primary"
            >
              Add Your First Table
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Table Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingTable ? 'Edit Table' : 'Add Table'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Table Number
                </label>
                <input
                  type="text"
                  placeholder="e.g., T01, Table 1"
                  className="input"
                  defaultValue={editingTable?.table_number || ''}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g., Window table, VIP section"
                  className="input"
                  defaultValue={editingTable?.description || ''}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  placeholder="4"
                  className="input"
                  defaultValue={editingTable?.capacity || 4}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowModal(false)
                  toast.success(`Table ${editingTable ? 'updated' : 'created'} successfully`)
                  fetchTables()
                }}
                className="btn-primary"
              >
                {editingTable ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default TablesPage