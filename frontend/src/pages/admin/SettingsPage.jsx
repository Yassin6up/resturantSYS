import { useState, useEffect } from 'react'
import { Save, RefreshCw, Database, Cloud, Wifi, WifiOff } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const SettingsPage = () => {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)

  useEffect(() => {
    fetchSettings()
    fetchSyncStatus()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await api.get('/admin/settings')
      setSettings(response.data)
    } catch (error) {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const fetchSyncStatus = async () => {
    try {
      const response = await api.get('/sync/status')
      setSyncStatus(response.data)
    } catch (error) {
      console.error('Failed to load sync status')
    }
  }

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      await api.put('/admin/settings', { settings })
      toast.success('Settings saved successfully')
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const toggleOperatingMode = async (newMode) => {
    if (newMode === settings.operating_mode) return

    const confirmed = window.confirm(
      `Are you sure you want to switch to ${newMode} mode? This will change how the system operates.`
    )

    if (confirmed) {
      handleSettingChange('operating_mode', newMode)
      await saveSettings()
      toast.success(`Switched to ${newMode} mode`)
    }
  }

  const triggerManualSync = async () => {
    try {
      await api.post('/sync/manual')
      toast.success('Manual sync completed')
      fetchSyncStatus()
    } catch (error) {
      toast.error('Failed to perform manual sync')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600">Configure system settings and preferences</p>
            </div>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="btn-primary disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Operating Mode */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Operating Mode</h2>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <Database className="w-5 h-5 text-blue-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-900">Local Mode</h3>
                      <p className="text-sm text-gray-600">SQLite database, offline operation</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleOperatingMode('LOCAL')}
                    className={`px-4 py-2 rounded-md font-medium ${
                      settings.operating_mode === 'LOCAL'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {settings.operating_mode === 'LOCAL' ? 'Active' : 'Switch to Local'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <Cloud className="w-5 h-5 text-green-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-900">Cloud Mode</h3>
                      <p className="text-sm text-gray-600">MySQL/PostgreSQL database, online sync</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleOperatingMode('CLOUD')}
                    className={`px-4 py-2 rounded-md font-medium ${
                      settings.operating_mode === 'CLOUD'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {settings.operating_mode === 'CLOUD' ? 'Active' : 'Switch to Cloud'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sync Status */}
          {settings.operating_mode === 'CLOUD' && syncStatus && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold">Sync Status</h2>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {syncStatus.syncEnabled ? (
                        <Wifi className="w-5 h-5 text-green-600 mr-3" />
                      ) : (
                        <WifiOff className="w-5 h-5 text-red-600 mr-3" />
                      )}
                      <div>
                        <h3 className="font-medium text-gray-900">Sync Status</h3>
                        <p className="text-sm text-gray-600">
                          {syncStatus.syncEnabled ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      syncStatus.syncEnabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {syncStatus.syncEnabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Last Sync</label>
                      <p className="text-sm text-gray-600">
                        {syncStatus.lastSync 
                          ? new Date(syncStatus.lastSync).toLocaleString()
                          : 'Never'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="label">Pending Sync</label>
                      <p className="text-sm text-gray-600">
                        {syncStatus.pendingSyncCount} operations
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={triggerManualSync}
                    className="btn-outline"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Manual Sync
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Business Settings */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">Business Settings</h2>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="label">Restaurant Name</label>
                  <input
                    type="text"
                    value={settings.restaurant_name || ''}
                    onChange={(e) => handleSettingChange('restaurant_name', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input
                    type="text"
                    value={settings.restaurant_phone || ''}
                    onChange={(e) => handleSettingChange('restaurant_phone', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.tax_rate || ''}
                    onChange={(e) => handleSettingChange('tax_rate', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Service Charge (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.service_charge_rate || ''}
                    onChange={(e) => handleSettingChange('service_charge_rate', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Currency</label>
                  <select
                    value={settings.currency || 'MAD'}
                    onChange={(e) => handleSettingChange('currency', e.target.value)}
                    className="input"
                  >
                    <option value="MAD">MAD (Moroccan Dirham)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* System Settings */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold">System Settings</h2>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Printer Integration</h3>
                    <p className="text-sm text-gray-600">Enable automatic order printing</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.printer_enabled === 'true'}
                      onChange={(e) => handleSettingChange('printer_enabled', e.target.checked.toString())}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Backup System</h3>
                    <p className="text-sm text-gray-600">Enable automatic database backups</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.backup_enabled === 'true'}
                      onChange={(e) => handleSettingChange('backup_enabled', e.target.checked.toString())}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage