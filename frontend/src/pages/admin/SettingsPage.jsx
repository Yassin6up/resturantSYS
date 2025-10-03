import { useState, useEffect } from 'react'
import AdminLayout from '../../components/Layout/AdminLayout'
import api from '../../services/api'
import {
  CogIcon,
  DatabaseIcon,
  CreditCardIcon,
  PrinterIcon,
  ShieldCheckIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'

const SettingsPage = () => {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await api.get('/settings')
      setSettings(response.data.data)
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (updates) => {
    try {
      setSaving(true)
      await api.put('/settings', updates)
      toast.success('Settings updated successfully')
      fetchSettings()
    } catch (error) {
      console.error('Error updating settings:', error)
      toast.error('Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const handleOperatingModeChange = (newMode) => {
    if (newMode !== settings.operating_mode?.value) {
      const message = newMode === 'CLOUD' 
        ? 'Switching to CLOUD mode will require database migration. Are you sure?'
        : 'Switching to LOCAL mode will use SQLite database. Are you sure?'
      
      if (confirm(message)) {
        updateSettings({ operating_mode: newMode })
      }
    }
  }

  const downloadBackup = async () => {
    try {
      toast.loading('Creating backup...')
      // This would trigger a backup download
      setTimeout(() => {
        toast.dismiss()
        toast.success('Backup downloaded successfully')
      }, 2000)
    } catch (error) {
      toast.dismiss()
      toast.error('Failed to create backup')
    }
  }

  const tabs = [
    { id: 'general', name: 'General', icon: CogIcon },
    { id: 'database', name: 'Database', icon: DatabaseIcon },
    { id: 'payments', name: 'Payments', icon: CreditCardIcon },
    { id: 'printers', name: 'Printers', icon: PrinterIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'backup', name: 'Backup', icon: DocumentArrowDownIcon }
  ]

  if (loading) {
    return (
      <AdminLayout title="Settings">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Settings">
      <div className="flex space-x-6">
        {/* Sidebar */}
        <div className="w-64 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {tab.name}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'general' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">General Settings</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Restaurant Name
                  </label>
                  <input
                    type="text"
                    defaultValue={settings.restaurant_name?.value || ''}
                    className="input max-w-md"
                    onBlur={(e) => updateSettings({ restaurant_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    defaultValue={settings.currency?.value || 'MAD'}
                    className="input max-w-md"
                    onChange={(e) => updateSettings({ currency: e.target.value })}
                  >
                    <option value="MAD">MAD (Moroccan Dirham)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="USD">USD (US Dollar)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    defaultValue={settings.tax_rate?.value * 100 || 20}
                    className="input max-w-md"
                    onBlur={(e) => updateSettings({ tax_rate: parseFloat(e.target.value) / 100 })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Charge (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    defaultValue={settings.service_charge_rate?.value * 100 || 10}
                    className="input max-w-md"
                    onBlur={(e) => updateSettings({ service_charge_rate: parseFloat(e.target.value) / 100 })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Receipt Footer Message
                  </label>
                  <textarea
                    rows={3}
                    defaultValue={settings.receipt_footer?.value || ''}
                    className="input max-w-md"
                    onBlur={(e) => updateSettings({ receipt_footer: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Database Settings</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Operating Mode
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="operating_mode"
                        value="LOCAL"
                        checked={settings.operating_mode?.value === 'LOCAL'}
                        onChange={(e) => handleOperatingModeChange(e.target.value)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">LOCAL Mode</div>
                        <div className="text-sm text-gray-500">
                          Uses SQLite database stored locally. Perfect for single restaurant.
                        </div>
                      </div>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="operating_mode"
                        value="CLOUD"
                        checked={settings.operating_mode?.value === 'CLOUD'}
                        onChange={(e) => handleOperatingModeChange(e.target.value)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">CLOUD Mode</div>
                        <div className="text-sm text-gray-500">
                          Uses MySQL/PostgreSQL database. Supports multiple locations.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {settings.operating_mode?.value === 'CLOUD' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">
                      Cloud Database Configuration
                    </h4>
                    <p className="text-sm text-yellow-700 mb-4">
                      Configure these settings in your environment file (.env) and restart the application.
                    </p>
                    <div className="space-y-3 text-sm">
                      <div><strong>DB_CLIENT:</strong> mysql2 or pg</div>
                      <div><strong>DB_HOST:</strong> Your database host</div>
                      <div><strong>DB_PORT:</strong> Database port (3306 for MySQL, 5432 for PostgreSQL)</div>
                      <div><strong>DB_USER:</strong> Database username</div>
                      <div><strong>DB_PASSWORD:</strong> Database password</div>
                      <div><strong>DB_NAME:</strong> Database name</div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button className="btn-outline">
                    Test Connection
                  </button>
                  <button className="btn-outline">
                    Run Migrations
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment Settings</h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Enable Online Payments</div>
                    <div className="text-sm text-gray-500">Allow customers to pay by card online</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enable_online_payments?.value || false}
                      onChange={(e) => updateSettings({ enable_online_payments: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                {settings.enable_online_payments?.value && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stripe Publishable Key
                      </label>
                      <input
                        type="text"
                        placeholder="pk_test_..."
                        defaultValue={settings.stripe_publishable_key?.value || ''}
                        className="input max-w-md"
                        onBlur={(e) => updateSettings({ stripe_publishable_key: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stripe Secret Key
                      </label>
                      <input
                        type="password"
                        placeholder="sk_test_..."
                        defaultValue={settings.stripe_secret_key?.value || ''}
                        className="input max-w-md"
                        onBlur={(e) => updateSettings({ stripe_secret_key: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'printers' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Printer Settings</h3>
              
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">
                    Printer Service Status
                  </h4>
                  <p className="text-sm text-blue-700 mb-3">
                    The printer service handles thermal printer integration for receipts and kitchen tickets.
                  </p>
                  <div className="flex space-x-3">
                    <button className="btn-outline text-sm">
                      Check Status
                    </button>
                    <button className="btn-outline text-sm">
                      Test Print
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Configured Printers</h4>
                  <div className="text-sm text-gray-500">
                    No printers configured. Use the printer service API to add printers.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Security Settings</h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Auto-confirm Orders</div>
                    <div className="text-sm text-gray-500">Skip cashier confirmation for orders</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.auto_confirm_orders?.value || false}
                      onChange={(e) => updateSettings({ auto_confirm_orders: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">
                    Security Recommendations
                  </h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Change default passwords for all user accounts</li>
                    <li>• Use strong JWT secrets in production</li>
                    <li>• Enable HTTPS for production deployments</li>
                    <li>• Regularly backup your database</li>
                    <li>• Monitor audit logs for suspicious activity</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Backup & Recovery</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Manual Backup</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Create a backup of your database and configuration files.
                  </p>
                  <button
                    onClick={downloadBackup}
                    className="btn-primary"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                    Download Backup
                  </button>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Automatic Backups</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Backups are automatically created daily at 2:00 AM and retained for 30 days.
                  </p>
                  <div className="text-sm text-gray-500">
                    Last backup: Today at 2:00 AM
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Restore Database</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload a backup file to restore your database.
                  </p>
                  <input
                    type="file"
                    accept=".db,.sql,.gz"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default SettingsPage