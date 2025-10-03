import { useState, useEffect } from 'react'
import { settingsAPI } from '../../services/api'
import { 
  CogIcon, 
  PaintBrushIcon, 
  DatabaseIcon, 
  CloudIcon, 
  ComputerDesktopIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [settings, setSettings] = useState({
    // General Settings
    restaurantName: 'POSQ Restaurant',
    currency: 'MAD',
    taxRate: 10,
    serviceCharge: 5,
    language: 'en',
    
    // Theme Settings
    primaryColor: '#667eea',
    secondaryColor: '#764ba2',
    accentColor: '#f093fb',
    backgroundColor: '#f5f7fa',
    
    // Database Settings
    operatingMode: 'LOCAL',
    dbType: 'sqlite3',
    dbHost: 'localhost',
    dbPort: 3306,
    dbName: 'posq',
    dbUser: 'posq',
    dbPassword: 'posqpassword',
    dbPath: './data/posq.db',
    
    // Payment Settings
    stripePublicKey: '',
    stripeSecretKey: '',
    paymentMethods: ['cash', 'card'],
    
    // Printer Settings
    printerEnabled: true,
    printerIp: '192.168.1.100',
    printerPort: 9100,
    
    // Sync Settings
    syncEnabled: false,
    syncUrl: '',
    syncApiKey: ''
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await settingsAPI.getSettings()
      if (response.data.success) {
        setSettings(prev => ({ ...prev, ...response.data.settings }))
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setLoading(true)
      const response = await settingsAPI.updateSettings(settings)
      if (response.data.success) {
        toast.success('Settings saved successfully!')
        // Apply theme changes immediately
        applyThemeChanges()
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  const applyThemeChanges = () => {
    // Apply CSS custom properties for theme
    const root = document.documentElement
    root.style.setProperty('--primary-color', settings.primaryColor)
    root.style.setProperty('--secondary-color', settings.secondaryColor)
    root.style.setProperty('--accent-color', settings.accentColor)
    root.style.setProperty('--background-color', settings.backgroundColor)
  }

  const testDatabaseConnection = async () => {
    try {
      setLoading(true)
      const response = await settingsAPI.testDatabaseConnection({
        dbType: settings.dbType,
        dbHost: settings.dbHost,
        dbPort: settings.dbPort,
        dbName: settings.dbName,
        dbUser: settings.dbUser,
        dbPassword: settings.dbPassword,
        dbPath: settings.dbPath
      })
      
      if (response.data.success) {
        toast.success('Database connection successful!')
      } else {
        toast.error('Database connection failed')
      }
    } catch (error) {
      console.error('Database test error:', error)
      toast.error('Database connection failed')
    } finally {
      setLoading(false)
    }
  }

  const switchOperatingMode = async (mode) => {
    try {
      setLoading(true)
      const response = await settingsAPI.changeOperatingMode(mode)
      if (response.data.success) {
        setSettings(prev => ({ ...prev, operatingMode: mode }))
        toast.success(`Switched to ${mode} mode successfully!`)
      }
    } catch (error) {
      console.error('Mode switch error:', error)
      toast.error('Failed to switch operating mode')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'general', name: 'General', icon: CogIcon },
    { id: 'theme', name: 'Theme', icon: PaintBrushIcon },
    { id: 'database', name: 'Database', icon: DatabaseIcon },
    { id: 'payment', name: 'Payment', icon: CloudIcon },
    { id: 'printer', name: 'Printer', icon: ComputerDesktopIcon },
    { id: 'sync', name: 'Sync', icon: CloudIcon }
  ]

  if (loading && !settings.restaurantName) {
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
          <h1 className="text-3xl font-bold gradient-text">Settings</h1>
          <p className="text-gray-600 mt-2">Configure your restaurant system</p>
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? (
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

      {/* Operating Mode Toggle */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">Operating Mode</h2>
          <p className="text-gray-600">Choose between local SQLite or cloud MySQL</p>
        </div>
        <div className="card-body">
          <div className="flex space-x-4">
            <button
              onClick={() => switchOperatingMode('LOCAL')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200 ${
                settings.operatingMode === 'LOCAL'
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
                settings.operatingMode === 'CLOUD'
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
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">General Settings</h2>
            </div>
            <div className="card-body space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Restaurant Name</label>
                  <input
                    type="text"
                    value={settings.restaurantName}
                    onChange={(e) => setSettings(prev => ({ ...prev, restaurantName: e.target.value }))}
                    className="form-input"
                    placeholder="Enter restaurant name"
                  />
                </div>
                <div>
                  <label className="form-label">Currency</label>
                  <select
                    value={settings.currency}
                    onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
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
                    value={settings.taxRate}
                    onChange={(e) => setSettings(prev => ({ ...prev, taxRate: parseFloat(e.target.value) }))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Service Charge (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.serviceCharge}
                    onChange={(e) => setSettings(prev => ({ ...prev, serviceCharge: parseFloat(e.target.value) }))}
                    className="form-input"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Theme Settings */}
        {activeTab === 'theme' && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">Theme Customization</h2>
              <p className="text-gray-600">Customize the appearance of your application</p>
            </div>
            <div className="card-body space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Primary Color</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="form-input flex-1"
                      placeholder="#667eea"
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Secondary Color</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      className="form-input flex-1"
                      placeholder="#764ba2"
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Accent Color</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={settings.accentColor}
                      onChange={(e) => setSettings(prev => ({ ...prev, accentColor: e.target.value }))}
                      className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.accentColor}
                      onChange={(e) => setSettings(prev => ({ ...prev, accentColor: e.target.value }))}
                      className="form-input flex-1"
                      placeholder="#f093fb"
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Background Color</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={settings.backgroundColor}
                      onChange={(e) => setSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
                      className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.backgroundColor}
                      onChange={(e) => setSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
                      className="form-input flex-1"
                      placeholder="#f5f7fa"
                    />
                  </div>
                </div>
              </div>

              {/* Theme Preview */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Theme Preview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border-2 border-gray-200">
                    <div 
                      className="w-full h-8 rounded-lg mb-2"
                      style={{ backgroundColor: settings.primaryColor }}
                    ></div>
                    <p className="text-sm text-gray-600">Primary</p>
                  </div>
                  <div className="p-4 rounded-xl border-2 border-gray-200">
                    <div 
                      className="w-full h-8 rounded-lg mb-2"
                      style={{ backgroundColor: settings.secondaryColor }}
                    ></div>
                    <p className="text-sm text-gray-600">Secondary</p>
                  </div>
                  <div className="p-4 rounded-xl border-2 border-gray-200">
                    <div 
                      className="w-full h-8 rounded-lg mb-2"
                      style={{ backgroundColor: settings.accentColor }}
                    ></div>
                    <p className="text-sm text-gray-600">Accent</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Database Settings */}
        {activeTab === 'database' && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">Database Configuration</h2>
              <p className="text-gray-600">Configure your database connection</p>
            </div>
            <div className="card-body space-y-6">
              <div>
                <label className="form-label">Database Type</label>
                <select
                  value={settings.dbType}
                  onChange={(e) => setSettings(prev => ({ ...prev, dbType: e.target.value }))}
                  className="form-input"
                >
                  <option value="sqlite3">SQLite (Local)</option>
                  <option value="mysql2">MySQL (Cloud)</option>
                  <option value="pg">PostgreSQL (Cloud)</option>
                </select>
              </div>

              {settings.dbType === 'sqlite3' ? (
                <div>
                  <label className="form-label">Database Path</label>
                  <input
                    type="text"
                    value={settings.dbPath}
                    onChange={(e) => setSettings(prev => ({ ...prev, dbPath: e.target.value }))}
                    className="form-input"
                    placeholder="./data/posq.db"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">Host</label>
                    <input
                      type="text"
                      value={settings.dbHost}
                      onChange={(e) => setSettings(prev => ({ ...prev, dbHost: e.target.value }))}
                      className="form-input"
                      placeholder="localhost"
                    />
                  </div>
                  <div>
                    <label className="form-label">Port</label>
                    <input
                      type="number"
                      value={settings.dbPort}
                      onChange={(e) => setSettings(prev => ({ ...prev, dbPort: parseInt(e.target.value) }))}
                      className="form-input"
                      placeholder="3306"
                    />
                  </div>
                  <div>
                    <label className="form-label">Database Name</label>
                    <input
                      type="text"
                      value={settings.dbName}
                      onChange={(e) => setSettings(prev => ({ ...prev, dbName: e.target.value }))}
                      className="form-input"
                      placeholder="posq"
                    />
                  </div>
                  <div>
                    <label className="form-label">Username</label>
                    <input
                      type="text"
                      value={settings.dbUser}
                      onChange={(e) => setSettings(prev => ({ ...prev, dbUser: e.target.value }))}
                      className="form-input"
                      placeholder="posq"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="form-label">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={settings.dbPassword}
                        onChange={(e) => setSettings(prev => ({ ...prev, dbPassword: e.target.value }))}
                        className="form-input pr-10"
                        placeholder="Enter password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={testDatabaseConnection}
                  disabled={loading}
                  className="btn-outline"
                >
                  {loading ? (
                    <>
                      <div className="loading-spinner mr-2"></div>
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
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
              <h2 className="text-xl font-semibold text-gray-900">Payment Configuration</h2>
            </div>
            <div className="card-body space-y-6">
              <div>
                <label className="form-label">Stripe Public Key</label>
                <input
                  type="text"
                  value={settings.stripePublicKey}
                  onChange={(e) => setSettings(prev => ({ ...prev, stripePublicKey: e.target.value }))}
                  className="form-input"
                  placeholder="pk_test_..."
                />
              </div>
              <div>
                <label className="form-label">Stripe Secret Key</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={settings.stripeSecretKey}
                    onChange={(e) => setSettings(prev => ({ ...prev, stripeSecretKey: e.target.value }))}
                    className="form-input pr-10"
                    placeholder="sk_test_..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Printer Settings */}
        {activeTab === 'printer' && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">Printer Configuration</h2>
            </div>
            <div className="card-body space-y-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.printerEnabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, printerEnabled: e.target.checked }))}
                  className="form-checkbox"
                />
                <label className="ml-2 text-sm text-gray-700">Enable Printer</label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Printer IP</label>
                  <input
                    type="text"
                    value={settings.printerIp}
                    onChange={(e) => setSettings(prev => ({ ...prev, printerIp: e.target.value }))}
                    className="form-input"
                    placeholder="192.168.1.100"
                  />
                </div>
                <div>
                  <label className="form-label">Printer Port</label>
                  <input
                    type="number"
                    value={settings.printerPort}
                    onChange={(e) => setSettings(prev => ({ ...prev, printerPort: parseInt(e.target.value) }))}
                    className="form-input"
                    placeholder="9100"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sync Settings */}
        {activeTab === 'sync' && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">Sync Configuration</h2>
            </div>
            <div className="card-body space-y-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.syncEnabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, syncEnabled: e.target.checked }))}
                  className="form-checkbox"
                />
                <label className="ml-2 text-sm text-gray-700">Enable Sync</label>
              </div>
              <div>
                <label className="form-label">Sync URL</label>
                <input
                  type="url"
                  value={settings.syncUrl}
                  onChange={(e) => setSettings(prev => ({ ...prev, syncUrl: e.target.value }))}
                  className="form-input"
                  placeholder="https://api.example.com/sync"
                />
              </div>
              <div>
                <label className="form-label">API Key</label>
                <input
                  type="password"
                  value={settings.syncApiKey}
                  onChange={(e) => setSettings(prev => ({ ...prev, syncApiKey: e.target.value }))}
                  className="form-input"
                  placeholder="Enter API key"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsPage