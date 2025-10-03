import { useState, useEffect } from 'react'
import { settingsAPI, appSettingsAPI } from '../../services/api'
import { useTheme } from '../../contexts/ThemeContext'
import { 
  CogIcon, 
  PaintBrushIcon, 
  DatabaseIcon, 
  CloudIcon, 
  ComputerDesktopIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  BuildingOfficeIcon,
  PhotoIcon,
  PaletteIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

function SettingsPage() {
  const { settings, updateSettings, getSetting, loading } = useTheme()
  const [activeTab, setActiveTab] = useState('general')
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [localSettings, setLocalSettings] = useState({})

  useEffect(() => {
    // Initialize local settings with current theme settings
    if (settings && Object.keys(settings).length > 0) {
      const initialSettings = {}
      Object.keys(settings).forEach(key => {
        initialSettings[key] = settings[key].value
      })
      setLocalSettings(initialSettings)
    }
  }, [settings])

  const handleSettingChange = (key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSaveSettings = async () => {
    try {
      setSaving(true)
      
      const success = await updateSettings(localSettings)
      
      if (success) {
        toast.success('Settings saved successfully!')
      } else {
        toast.error('Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const testDatabaseConnection = async () => {
    try {
      setSaving(true)
      const response = await settingsAPI.testDatabaseConnection({
        type: localSettings.dbType || 'sqlite3',
        host: localSettings.dbHost || 'localhost',
        port: localSettings.dbPort || 3306,
        database: localSettings.dbName || 'posq',
        username: localSettings.dbUser || 'posq',
        password: localSettings.dbPassword || 'posqpassword',
        filename: localSettings.dbPath || './data/posq.db'
      })
      
      if (response.data.success) {
        toast.success('Database connection successful!')
      } else {
        toast.error('Database connection failed')
      }
    } catch (error) {
      console.error('Database connection test failed:', error)
      toast.error('Database connection test failed')
    } finally {
      setSaving(false)
    }
  }

  const switchOperatingMode = async (mode) => {
    try {
      setSaving(true)
      const response = await settingsAPI.changeOperatingMode(mode)
      
      if (response.data.success) {
        handleSettingChange('operatingMode', mode)
        toast.success(`Operating mode changed to ${mode}`)
      } else {
        toast.error('Failed to change operating mode')
      }
    } catch (error) {
      console.error('Operating mode change failed:', error)
      toast.error('Failed to change operating mode')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'general', name: 'General', icon: CogIcon },
    { id: 'branding', name: 'Branding', icon: BuildingOfficeIcon },
    { id: 'theme', name: 'Theme', icon: PaletteIcon },
    { id: 'layout', name: 'Layout', icon: AdjustmentsHorizontalIcon },
    { id: 'database', name: 'Database', icon: DatabaseIcon },
    { id: 'payment', name: 'Payment', icon: CloudIcon },
    { id: 'printer', name: 'Printer', icon: ComputerDesktopIcon }
  ]

  if (loading && Object.keys(settings).length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Configure your restaurant system</p>
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? (
            <>
              <div className="loading-spinner mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <CheckIcon className="h-5 w-5 mr-2" />
              Save Settings
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5 inline mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">General Settings</h2>
              <p className="text-gray-600">Basic application configuration</p>
            </div>
            <div className="card-body space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Application Name</label>
                  <input
                    type="text"
                    value={localSettings.app_name || ''}
                    onChange={(e) => handleSettingChange('app_name', e.target.value)}
                    className="form-input"
                    placeholder="Enter application name"
                  />
                </div>
                <div>
                  <label className="form-label">Currency</label>
                  <select
                    value={localSettings.currency || 'MAD'}
                    onChange={(e) => handleSettingChange('currency', e.target.value)}
                    className="form-input"
                  >
                    <option value="MAD">MAD (Moroccan Dirham)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="GBP">GBP (British Pound)</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={localSettings.tax_rate || 10}
                    onChange={(e) => handleSettingChange('tax_rate', parseFloat(e.target.value))}
                    className="form-input"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="form-label">Service Charge (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={localSettings.service_charge || 5}
                    onChange={(e) => handleSettingChange('service_charge', parseFloat(e.target.value))}
                    className="form-input"
                    placeholder="5"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Welcome Message</label>
                <textarea
                  value={localSettings.welcome_message || ''}
                  onChange={(e) => handleSettingChange('welcome_message', e.target.value)}
                  className="form-input"
                  rows={3}
                  placeholder="Welcome to our restaurant!"
                />
              </div>
            </div>
          </div>
        )}

        {/* Branding Settings */}
        {activeTab === 'branding' && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">Branding</h2>
              <p className="text-gray-600">Customize your restaurant's appearance</p>
            </div>
            <div className="card-body space-y-6">
              <div>
                <label className="form-label">Logo URL</label>
                <input
                  type="url"
                  value={localSettings.logo_url || ''}
                  onChange={(e) => handleSettingChange('logo_url', e.target.value)}
                  className="form-input"
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-sm text-gray-500 mt-1">Enter the URL of your restaurant logo</p>
              </div>
              
              <div>
                <label className="form-label">Favicon URL</label>
                <input
                  type="url"
                  value={localSettings.favicon_url || ''}
                  onChange={(e) => handleSettingChange('favicon_url', e.target.value)}
                  className="form-input"
                  placeholder="https://example.com/favicon.ico"
                />
                <p className="text-sm text-gray-500 mt-1">Enter the URL of your favicon</p>
              </div>

              {localSettings.logo_url && (
                <div className="mt-4">
                  <label className="form-label">Logo Preview</label>
                  <div className="mt-2 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <img
                      src={localSettings.logo_url}
                      alt="Logo Preview"
                      className="h-16 w-auto object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Theme Settings */}
        {activeTab === 'theme' && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">Theme Colors</h2>
              <p className="text-gray-600">Customize your application's color scheme</p>
            </div>
            <div className="card-body space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="form-label">Primary Color</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={localSettings.primary_color || '#3B82F6'}
                      onChange={(e) => handleSettingChange('primary_color', e.target.value)}
                      className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localSettings.primary_color || '#3B82F6'}
                      onChange={(e) => handleSettingChange('primary_color', e.target.value)}
                      className="form-input flex-1"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Secondary Color</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={localSettings.secondary_color || '#1E40AF'}
                      onChange={(e) => handleSettingChange('secondary_color', e.target.value)}
                      className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localSettings.secondary_color || '#1E40AF'}
                      onChange={(e) => handleSettingChange('secondary_color', e.target.value)}
                      className="form-input flex-1"
                      placeholder="#1E40AF"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Accent Color</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={localSettings.accent_color || '#60A5FA'}
                      onChange={(e) => handleSettingChange('accent_color', e.target.value)}
                      className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localSettings.accent_color || '#60A5FA'}
                      onChange={(e) => handleSettingChange('accent_color', e.target.value)}
                      className="form-input flex-1"
                      placeholder="#60A5FA"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Success Color</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={localSettings.success_color || '#10B981'}
                      onChange={(e) => handleSettingChange('success_color', e.target.value)}
                      className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localSettings.success_color || '#10B981'}
                      onChange={(e) => handleSettingChange('success_color', e.target.value)}
                      className="form-input flex-1"
                      placeholder="#10B981"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Warning Color</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={localSettings.warning_color || '#F59E0B'}
                      onChange={(e) => handleSettingChange('warning_color', e.target.value)}
                      className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localSettings.warning_color || '#F59E0B'}
                      onChange={(e) => handleSettingChange('warning_color', e.target.value)}
                      className="form-input flex-1"
                      placeholder="#F59E0B"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Error Color</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={localSettings.error_color || '#EF4444'}
                      onChange={(e) => handleSettingChange('error_color', e.target.value)}
                      className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localSettings.error_color || '#EF4444'}
                      onChange={(e) => handleSettingChange('error_color', e.target.value)}
                      className="form-input flex-1"
                      placeholder="#EF4444"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Background Color</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={localSettings.background_color || '#F8FAFC'}
                      onChange={(e) => handleSettingChange('background_color', e.target.value)}
                      className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localSettings.background_color || '#F8FAFC'}
                      onChange={(e) => handleSettingChange('background_color', e.target.value)}
                      className="form-input flex-1"
                      placeholder="#F8FAFC"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Surface Color</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={localSettings.surface_color || '#FFFFFF'}
                      onChange={(e) => handleSettingChange('surface_color', e.target.value)}
                      className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localSettings.surface_color || '#FFFFFF'}
                      onChange={(e) => handleSettingChange('surface_color', e.target.value)}
                      className="form-input flex-1"
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Layout Settings */}
        {activeTab === 'layout' && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">Layout Settings</h2>
              <p className="text-gray-600">Customize the application layout</p>
            </div>
            <div className="card-body space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Border Radius (px)</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={localSettings.border_radius || 12}
                    onChange={(e) => handleSettingChange('border_radius', parseInt(e.target.value))}
                    className="form-input"
                    placeholder="12"
                  />
                </div>
                <div>
                  <label className="form-label">Sidebar Width (px)</label>
                  <input
                    type="number"
                    min="200"
                    max="400"
                    value={localSettings.sidebar_width || 256}
                    onChange={(e) => handleSettingChange('sidebar_width', parseInt(e.target.value))}
                    className="form-input"
                    placeholder="256"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Shadow Intensity</label>
                <select
                  value={localSettings.shadow_intensity || 'medium'}
                  onChange={(e) => handleSettingChange('shadow_intensity', e.target.value)}
                  className="form-input"
                >
                  <option value="light">Light</option>
                  <option value="medium">Medium</option>
                  <option value="heavy">Heavy</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Database Settings */}
        {activeTab === 'database' && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">Database Settings</h2>
              <p className="text-gray-600">Configure your database connection</p>
            </div>
            <div className="card-body space-y-6">
              {/* Operating Mode Toggle */}
              <div>
                <label className="form-label">Operating Mode</label>
                <div className="flex space-x-4 mt-2">
                  <button
                    onClick={() => switchOperatingMode('LOCAL')}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200 ${
                      localSettings.operatingMode === 'LOCAL'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <ComputerDesktopIcon className="h-8 w-8 mx-auto mb-2" />
                    <h3 className="font-semibold">Local Mode</h3>
                    <p className="text-sm text-gray-600">SQLite Database</p>
                  </button>
                  <button
                    onClick={() => switchOperatingMode('CLOUD')}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200 ${
                      localSettings.operatingMode === 'CLOUD'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <CloudIcon className="h-8 w-8 mx-auto mb-2" />
                    <h3 className="font-semibold">Cloud Mode</h3>
                    <p className="text-sm text-gray-600">MySQL Database</p>
                  </button>
                </div>
              </div>

              {/* Database Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Database Type</label>
                  <select
                    value={localSettings.dbType || 'sqlite3'}
                    onChange={(e) => handleSettingChange('dbType', e.target.value)}
                    className="form-input"
                  >
                    <option value="sqlite3">SQLite</option>
                    <option value="mysql2">MySQL</option>
                    <option value="pg">PostgreSQL</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Database Host</label>
                  <input
                    type="text"
                    value={localSettings.dbHost || 'localhost'}
                    onChange={(e) => handleSettingChange('dbHost', e.target.value)}
                    className="form-input"
                    placeholder="localhost"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Database Port</label>
                  <input
                    type="number"
                    value={localSettings.dbPort || 3306}
                    onChange={(e) => handleSettingChange('dbPort', parseInt(e.target.value))}
                    className="form-input"
                    placeholder="3306"
                  />
                </div>
                <div>
                  <label className="form-label">Database Name</label>
                  <input
                    type="text"
                    value={localSettings.dbName || 'posq'}
                    onChange={(e) => handleSettingChange('dbName', e.target.value)}
                    className="form-input"
                    placeholder="posq"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Database User</label>
                  <input
                    type="text"
                    value={localSettings.dbUser || 'posq'}
                    onChange={(e) => handleSettingChange('dbUser', e.target.value)}
                    className="form-input"
                    placeholder="posq"
                  />
                </div>
                <div>
                  <label className="form-label">Database Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={localSettings.dbPassword || 'posqpassword'}
                      onChange={(e) => handleSettingChange('dbPassword', e.target.value)}
                      className="form-input pr-10"
                      placeholder="posqpassword"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label">Database Path (SQLite only)</label>
                <input
                  type="text"
                  value={localSettings.dbPath || './data/posq.db'}
                  onChange={(e) => handleSettingChange('dbPath', e.target.value)}
                  className="form-input"
                  placeholder="./data/posq.db"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={testDatabaseConnection}
                  disabled={saving}
                  className="btn-outline"
                >
                  {saving ? (
                    <>
                      <div className="loading-spinner mr-2"></div>
                      Testing...
                    </>
                  ) : (
                    <>
                      <DatabaseIcon className="h-5 w-5 mr-2" />
                      Test Connection
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Settings */}
        {activeTab === 'payment' && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">Payment Settings</h2>
              <p className="text-gray-600">Configure payment gateways and methods</p>
            </div>
            <div className="card-body space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Stripe Public Key</label>
                  <input
                    type="text"
                    value={localSettings.stripePublicKey || ''}
                    onChange={(e) => handleSettingChange('stripePublicKey', e.target.value)}
                    className="form-input"
                    placeholder="pk_test_..."
                  />
                </div>
                <div>
                  <label className="form-label">Stripe Secret Key</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={localSettings.stripeSecretKey || ''}
                      onChange={(e) => handleSettingChange('stripeSecretKey', e.target.value)}
                      className="form-input pr-10"
                      placeholder="sk_test_..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Printer Settings */}
        {activeTab === 'printer' && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">Printer Settings</h2>
              <p className="text-gray-600">Configure thermal printer settings</p>
            </div>
            <div className="card-body space-y-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={localSettings.printerEnabled || false}
                  onChange={(e) => handleSettingChange('printerEnabled', e.target.checked)}
                  className="form-checkbox"
                />
                <label className="ml-2 text-sm text-gray-700">Enable Printer</label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Printer IP Address</label>
                  <input
                    type="text"
                    value={localSettings.printerIp || '192.168.1.100'}
                    onChange={(e) => handleSettingChange('printerIp', e.target.value)}
                    className="form-input"
                    placeholder="192.168.1.100"
                  />
                </div>
                <div>
                  <label className="form-label">Printer Port</label>
                  <input
                    type="number"
                    value={localSettings.printerPort || 9100}
                    onChange={(e) => handleSettingChange('printerPort', parseInt(e.target.value))}
                    className="form-input"
                    placeholder="9100"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsPage