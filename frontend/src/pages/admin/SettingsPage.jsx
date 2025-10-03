import { useState, useEffect } from 'react'
import { settingsAPI } from '../../services/api'
import { 
  CogIcon, 
  DatabaseIcon, 
  CreditCardIcon,
  PrinterIcon,
  CloudIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState({})
  const [operatingMode, setOperatingMode] = useState('LOCAL')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const [settingsRes, modeRes] = await Promise.all([
        settingsAPI.getSettings(),
        settingsAPI.getOperatingMode()
      ])
      
      setSettings(settingsRes.data.settings)
      setOperatingMode(modeRes.data.mode)
    } catch (error) {
      toast.error('Failed to load settings')
      console.error('Settings load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      await settingsAPI.updateSettings(settings)
      toast.success('Settings saved successfully')
    } catch (error) {
      toast.error('Failed to save settings')
      console.error('Settings save error:', error)
    } finally {
      setSaving(false)
    }
  }

  const changeOperatingMode = async (newMode) => {
    if (newMode === operatingMode) return

    const confirmed = window.confirm(
      `Are you sure you want to change operating mode to ${newMode}? This may require database migration.`
    )

    if (!confirmed) return

    try {
      setSaving(true)
      await settingsAPI.updateOperatingMode(newMode)
      setOperatingMode(newMode)
      toast.success(`Operating mode changed to ${newMode}`)
    } catch (error) {
      toast.error('Failed to change operating mode')
      console.error('Mode change error:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Configure system settings and preferences</p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="btn-primary disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Operating Mode */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <CogIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Operating Mode</h2>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                operatingMode === 'LOCAL'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => changeOperatingMode('LOCAL')}
            >
              <div className="flex items-center">
                <ComputerDesktopIcon className="h-8 w-8 text-gray-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">Local Mode</h3>
                  <p className="text-sm text-gray-500">SQLite database, offline operation</p>
                </div>
              </div>
            </div>

            <div
              className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                operatingMode === 'CLOUD'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => changeOperatingMode('CLOUD')}
            >
              <div className="flex items-center">
                <CloudIcon className="h-8 w-8 text-gray-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">Cloud Mode</h3>
                  <p className="text-sm text-gray-500">MySQL/PostgreSQL, online operation</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'general'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'database'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Database
          </button>
          <button
            onClick={() => setActiveTab('payment')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'payment'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Payment
          </button>
          <button
            onClick={() => setActiveTab('printer')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'printer'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Printer
          </button>
        </nav>
      </div>

      {/* General Settings Tab */}
      {activeTab === 'general' && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
          </div>
          <div className="card-body space-y-6">
            <div>
              <label className="form-label">Restaurant Name</label>
              <input
                type="text"
                value={settings.restaurant_name || ''}
                onChange={(e) => handleSettingChange('restaurant_name', e.target.value)}
                className="form-input"
                placeholder="Enter restaurant name"
              />
            </div>

            <div>
              <label className="form-label">Currency</label>
              <select
                value={settings.currency || 'MAD'}
                onChange={(e) => handleSettingChange('currency', e.target.value)}
                className="form-input"
              >
                <option value="MAD">MAD (Moroccan Dirham)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="GBP">GBP (British Pound)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Tax Rate (%)</label>
                <input
                  type="number"
                  value={settings.tax_rate || ''}
                  onChange={(e) => handleSettingChange('tax_rate', e.target.value)}
                  className="form-input"
                  placeholder="10"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>

              <div>
                <label className="form-label">Service Charge Rate (%)</label>
                <input
                  type="number"
                  value={settings.service_charge_rate || ''}
                  onChange={(e) => handleSettingChange('service_charge_rate', e.target.value)}
                  className="form-input"
                  placeholder="5"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Database Settings Tab */}
      {activeTab === 'database' && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center">
              <DatabaseIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Database Settings</h2>
            </div>
          </div>
          <div className="card-body space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Current Mode: {operatingMode}</h3>
              <p className="text-sm text-blue-700">
                {operatingMode === 'LOCAL' 
                  ? 'Using SQLite database for local operation'
                  : 'Using cloud database for online operation'
                }
              </p>
            </div>

            {operatingMode === 'CLOUD' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Database Host</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="localhost"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="form-label">Database Port</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="3306"
                      disabled
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Database Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="posq"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="form-label">Database User</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="posq"
                      disabled
                    />
                  </div>
                </div>

                <div className="text-sm text-gray-500">
                  Database configuration is managed through environment variables.
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button className="btn-outline">
                Test Connection
              </button>
              <button className="btn-outline">
                Backup Database
              </button>
              <button className="btn-outline">
                Restore Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Settings Tab */}
      {activeTab === 'payment' && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center">
              <CreditCardIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Payment Settings</h2>
            </div>
          </div>
          <div className="card-body space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-900 mb-2">Payment Gateway Configuration</h3>
              <p className="text-sm text-yellow-700">
                Payment gateway settings are configured through environment variables for security.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    defaultChecked
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable Cash Payments</span>
                </label>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    defaultChecked
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable Card Payments</span>
                </label>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable Online Payments</span>
                </label>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              <p>Supported payment gateways:</p>
              <ul className="list-disc list-inside mt-1">
                <li>Stripe (Credit/Debit Cards)</li>
                <li>Local Moroccan Gateways (CMI)</li>
                <li>Cash Payments</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Printer Settings Tab */}
      {activeTab === 'printer' && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center">
              <PrinterIcon className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Printer Settings</h2>
            </div>
          </div>
          <div className="card-body space-y-6">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  defaultChecked
                />
                <span className="ml-2 text-sm text-gray-700">Enable Printer Service</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Default Printer IP</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="192.168.1.100"
                />
              </div>
              <div>
                <label className="form-label">Printer Port</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="9100"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Printer Mapping</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Kitchen Orders</span>
                  <select className="form-input w-48">
                    <option>Kitchen Printer (192.168.1.100)</option>
                    <option>Bar Printer (192.168.1.101)</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Bar Orders</span>
                  <select className="form-input w-48">
                    <option>Bar Printer (192.168.1.101)</option>
                    <option>Kitchen Printer (192.168.1.100)</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Receipts</span>
                  <select className="form-input w-48">
                    <option>Main Printer (192.168.1.100)</option>
                    <option>Bar Printer (192.168.1.101)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button className="btn-outline">
                Test Print
              </button>
              <button className="btn-outline">
                Refresh Printers
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="card border-red-200">
        <div className="card-header bg-red-50">
          <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-red-900 mb-2">Reset Settings</h3>
              <p className="text-sm text-red-700 mb-3">
                This will reset all settings to their default values. This action cannot be undone.
              </p>
              <button className="btn-danger">
                Reset to Defaults
              </button>
            </div>

            <div>
              <h3 className="font-medium text-red-900 mb-2">Clear All Data</h3>
              <p className="text-sm text-red-700 mb-3">
                This will delete all orders, customers, and other data. This action cannot be undone.
              </p>
              <button className="btn-danger">
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage