import { useState, useEffect } from 'react'
import { settingsAPI, appSettingsAPI, backupAPI } from '../../services/api'
import { useTheme } from '../../contexts/ThemeContext'
import { 
  CogIcon, 
  PaintBrushIcon, 
  CloudIcon, 
  ComputerDesktopIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  BuildingOfficeIcon,
  PhotoIcon,
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

function SettingsPage() {
  const { settings, updateSettings, getSetting, loading } = useTheme()
  const [activeTab, setActiveTab] = useState('general')
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [localSettings, setLocalSettings] = useState({})
  const [backups, setBackups] = useState([])
  const [loadingBackups, setLoadingBackups] = useState(false)
  const [creatingBackup, setCreatingBackup] = useState(false)

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
        name: localSettings.dbName || 'posq',
        user: localSettings.dbUser || 'posq',
        password: localSettings.dbPassword || 'posqpassword',
        filename: localSettings.dbPath || './data/posq.db'
      })
      
      if (response.data.success) {
        toast.success(response.data.message || 'Database connection successful!')
      } else {
        toast.error(response.data.error || 'Database connection failed')
      }
    } catch (error) {
      console.error('Database connection test failed:', error)
      toast.error(error.response?.data?.error || 'Database connection test failed')
    } finally {
      setSaving(false)
    }
  }

  const initializeDatabase = async () => {
    try {
      setSaving(true)
      const response = await settingsAPI.initializeDatabase({
        type: localSettings.dbType || 'sqlite3',
        host: localSettings.dbHost || 'localhost',
        port: localSettings.dbPort || 3306,
        name: localSettings.dbName || 'posq',
        user: localSettings.dbUser || 'posq',
        password: localSettings.dbPassword || 'posqpassword',
        filename: localSettings.dbPath || './data/posq.db'
      })
      
      if (response.data.success) {
        toast.success(response.data.message || 'Database initialized successfully!')
      } else {
        toast.error(response.data.error || 'Database initialization failed')
      }
    } catch (error) {
      console.error('Database initialization failed:', error)
      toast.error(error.response?.data?.error || 'Database initialization failed')
    } finally {
      setSaving(false)
    }
  }

  const exportDatabase = async () => {
    try {
      setSaving(true)
      const response = await settingsAPI.exportDatabase()
      
      // Create blob and download
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition']
      let filename = `posq-backup-${Date.now()}.db`
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success('Database exported successfully!')
    } catch (error) {
      console.error('Database export failed:', error)
      toast.error('Database export failed')
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
        
        // Automatically set the correct database type based on mode
        if (mode === 'LOCAL') {
          handleSettingChange('dbType', 'sqlite3')
        } else if (mode === 'CLOUD') {
          handleSettingChange('dbType', 'mysql2')
        }
        
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

  const loadBackups = async () => {
    try {
      setLoadingBackups(true)
      const response = await backupAPI.listBackups()
      if (response.data.success) {
        setBackups(response.data.backups || [])
      }
    } catch (error) {
      console.error('Failed to load backups:', error)
      toast.error('Failed to load backups')
    } finally {
      setLoadingBackups(false)
    }
  }

  const createBackup = async () => {
    try {
      setCreatingBackup(true)
      const response = await backupAPI.createBackup()
      if (response.data.success) {
        toast.success('Backup created successfully!')
        await loadBackups()
      } else {
        toast.error('Failed to create backup')
      }
    } catch (error) {
      console.error('Failed to create backup:', error)
      toast.error('Failed to create backup')
    } finally {
      setCreatingBackup(false)
    }
  }

  const restoreBackup = async (filename) => {
    if (!confirm(`Are you sure you want to restore from ${filename}? This will replace all current data!`)) {
      return
    }

    try {
      setSaving(true)
      const response = await backupAPI.restoreBackup(filename)
      if (response.data.success) {
        toast.success('Backup restored successfully! Please refresh the page.')
      } else {
        toast.error('Failed to restore backup')
      }
    } catch (error) {
      console.error('Failed to restore backup:', error)
      toast.error('Failed to restore backup')
    } finally {
      setSaving(false)
    }
  }

  const deleteBackup = async (filename) => {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) {
      return
    }

    try {
      const response = await backupAPI.deleteBackup(filename)
      if (response.data.success) {
        toast.success('Backup deleted successfully!')
        await loadBackups()
      } else {
        toast.error('Failed to delete backup')
      }
    } catch (error) {
      console.error('Failed to delete backup:', error)
      toast.error('Failed to delete backup')
    }
  }

  useEffect(() => {
    if (activeTab === 'backup') {
      loadBackups()
    }
  }, [activeTab])

  const tabs = [
    { id: 'general', name: 'General', icon: CogIcon },
    { id: 'branding', name: 'Branding', icon: BuildingOfficeIcon },
    { id: 'theme', name: 'Theme', icon: BuildingOfficeIcon },
    { id: 'layout', name: 'Layout', icon: AdjustmentsHorizontalIcon },
    { id: 'ui_text', name: 'UI Text', icon: PhotoIcon },
    { id: 'menu_templates', name: 'Menu Templates', icon: PaintBrushIcon },
    { id: 'payment', name: 'Payment', icon: CloudIcon },
    { id: 'database', name: 'Database', icon: CloudIcon },
    { id: 'backup', name: 'Backup', icon: ArrowDownTrayIcon },
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
              <p className="text-gray-600">Configure and manage your database connection</p>
            </div>
            <div className="card-body space-y-6">
              {/* Information Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CircleStackIcon className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Database Management</h3>
                    <div className="mt-2 text-sm text-blue-700 space-y-1">
                      <p>• <strong>Local Mode:</strong> Uses SQLite - perfect for single-device setup</p>
                      <p>• <strong>Cloud Mode:</strong> Uses MySQL - for multi-device/production environments</p>
                      <p>• <strong>Initialize:</strong> Creates database, tables, and admin user automatically</p>
                      <p>• <strong>Export:</strong> Download a backup of your entire database</p>
                    </div>
                  </div>
                </div>
              </div>

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

              {/* Show Database Path only in LOCAL mode */}
              {localSettings.operatingMode === 'LOCAL' && (
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
              )}

              <div className="flex justify-end space-x-3">
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
                      <CircleStackIcon className="h-5 w-5 mr-2" />
                      Test Connection
                    </>
                  )}
                </button>
                
                <button
                  onClick={initializeDatabase}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? (
                    <>
                      <div className="loading-spinner mr-2"></div>
                      Initializing...
                    </>
                  ) : (
                    <>
                      <CircleStackIcon className="h-5 w-5 mr-2" />
                      Initialize Database
                    </>
                  )}
                </button>
                
                <button
                  onClick={exportDatabase}
                  disabled={saving}
                  className="btn-outline"
                >
                  {saving ? (
                    <>
                      <div className="loading-spinner mr-2"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                      Export Database
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* UI Text Settings */}
        {activeTab === 'ui_text' && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">UI Text Settings</h2>
              <p className="text-gray-600">Customize text displayed to customers</p>
            </div>
            <div className="card-body space-y-6">
              <div>
                <label className="form-label">Header Text</label>
                <input
                  type="text"
                  value={localSettings.header_text || ''}
                  onChange={(e) => handleSettingChange('header_text', e.target.value)}
                  className="form-input"
                  placeholder="Welcome to our restaurant!"
                />
                <p className="text-sm text-gray-500 mt-1">Text displayed at the top of the menu page</p>
              </div>
              
              <div>
                <label className="form-label">Footer Text</label>
                <input
                  type="text"
                  value={localSettings.footer_text || ''}
                  onChange={(e) => handleSettingChange('footer_text', e.target.value)}
                  className="form-input"
                  placeholder="Thank you for choosing us!"
                />
                <p className="text-sm text-gray-500 mt-1">Text displayed at the bottom of the menu page</p>
              </div>

              <div>
                <label className="form-label">Order Instructions</label>
                <input
                  type="text"
                  value={localSettings.order_instructions || ''}
                  onChange={(e) => handleSettingChange('order_instructions', e.target.value)}
                  className="form-input"
                  placeholder="Scan QR code to order • Pay at cashier"
                />
                <p className="text-sm text-gray-500 mt-1">Instructions shown to customers</p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Settings */}
        {activeTab === 'payment' && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">Payment Settings</h2>
              <p className="text-gray-600">Configure payment methods and gateways</p>
            </div>
            <div className="card-body space-y-6">
              {/* Payment Methods */}
              <div>
                <label className="form-label">Payment Methods</label>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={localSettings.payment_methods?.includes('cash') || false}
                      onChange={(e) => {
                        const methods = localSettings.payment_methods || []
                        if (e.target.checked) {
                          handleSettingChange('payment_methods', [...methods, 'cash'])
                        } else {
                          handleSettingChange('payment_methods', methods.filter(m => m !== 'cash'))
                        }
                      }}
                      className="form-checkbox"
                    />
                    <label className="ml-2 text-sm text-gray-700">Cash Payment</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={localSettings.payment_methods?.includes('card') || false}
                      onChange={(e) => {
                        const methods = localSettings.payment_methods || []
                        if (e.target.checked) {
                          handleSettingChange('payment_methods', [...methods, 'card'])
                        } else {
                          handleSettingChange('payment_methods', methods.filter(m => m !== 'card'))
                        }
                      }}
                      className="form-checkbox"
                    />
                    <label className="ml-2 text-sm text-gray-700">Card Payment</label>
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={localSettings.cash_only_mode || false}
                  onChange={(e) => handleSettingChange('cash_only_mode', e.target.checked)}
                  className="form-checkbox"
                />
                <label className="ml-2 text-sm text-gray-700">Cash Only Mode</label>
                <p className="text-xs text-gray-500 ml-2">Hide card payment option from customers</p>
              </div>

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

        {/* Backup Settings */}
        {activeTab === 'backup' && (
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Backup & Restore</h2>
                  <p className="text-gray-600">Create and manage database backups</p>
                </div>
                <button
                  onClick={createBackup}
                  disabled={creatingBackup}
                  className="btn-primary flex items-center space-x-2"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  <span>{creatingBackup ? 'Creating...' : 'Create Backup'}</span>
                </button>
              </div>
            </div>
            <div className="card-body">
              {loadingBackups ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="loading-spinner mb-4"></div>
                    <p className="text-gray-600">Loading backups...</p>
                  </div>
                </div>
              ) : backups.length === 0 ? (
                <div className="text-center py-12">
                  <ArrowDownTrayIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No backups available</h3>
                  <p className="text-gray-600 mb-4">Create your first backup to get started</p>
                  <button
                    onClick={createBackup}
                    disabled={creatingBackup}
                    className="btn-primary"
                  >
                    {creatingBackup ? 'Creating...' : 'Create Backup'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Available Backups ({backups.length})
                    </h3>
                    <p className="text-sm text-gray-500">
                      Click restore to revert your database to a previous state. 
                      <span className="text-red-600 font-medium"> Warning: This will replace all current data!</span>
                    </p>
                  </div>
                  
                  {backups.map((backup) => (
                    <div
                      key={backup.filename}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{backup.filename}</h4>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center">
                            <span className="font-medium mr-1">Type:</span>
                            <span className="capitalize">{backup.type}</span>
                          </span>
                          <span className="flex items-center">
                            <span className="font-medium mr-1">Size:</span>
                            {(backup.size / 1024).toFixed(2)} KB
                          </span>
                          <span className="flex items-center">
                            <span className="font-medium mr-1">Created:</span>
                            {new Date(backup.created).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => restoreBackup(backup.filename)}
                          disabled={saving}
                          className="btn-secondary flex items-center space-x-1 text-sm"
                          title="Restore this backup"
                        >
                          <ArrowUpTrayIcon className="h-4 w-4" />
                          <span>Restore</span>
                        </button>
                        <button
                          onClick={() => deleteBackup(backup.filename)}
                          className="btn-danger flex items-center space-x-1 text-sm"
                          title="Delete this backup"
                        >
                          <TrashIcon className="h-4 w-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Backup Information
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Backups include all database tables, settings, and configurations</li>
                  <li>• Regular backups help protect against data loss</li>
                  <li>• Restore operations will replace ALL current data</li>
                  <li>• Keep multiple backups for different restore points</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Menu Templates */}
        {activeTab === 'menu_templates' && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900">Menu Templates</h2>
              <p className="text-gray-600">Choose the perfect layout for your restaurant menu</p>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Default Template */}
                <div 
                  onClick={() => handleSettingChange('menu_template', 'default')}
                  className={`cursor-pointer border-2 rounded-xl p-6 transition-all duration-200 ${
                    localSettings.menu_template === 'default' 
                      ? 'border-blue-600 bg-blue-50 shadow-lg' 
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Default - Luxury Gradient</h3>
                      <p className="text-sm text-gray-600 mt-1">Modern cards with gradient accents</p>
                    </div>
                    {localSettings.menu_template === 'default' && (
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <CheckIcon className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="space-y-2">
                      <div className="h-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full w-1/2"></div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="aspect-square bg-gray-100 rounded"></div>
                        <div className="aspect-square bg-gray-100 rounded"></div>
                        <div className="aspect-square bg-gray-100 rounded"></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center text-xs text-gray-500">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    3-column grid • Gradient hero • Card layout
                  </div>
                </div>

                {/* Modern Template */}
                <div 
                  onClick={() => handleSettingChange('menu_template', 'modern')}
                  className={`cursor-pointer border-2 rounded-xl p-6 transition-all duration-200 ${
                    localSettings.menu_template === 'modern' 
                      ? 'border-blue-600 bg-blue-50 shadow-lg' 
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Modern - Minimalist</h3>
                      <p className="text-sm text-gray-600 mt-1">Clean layout with bold typography</p>
                    </div>
                    {localSettings.menu_template === 'modern' && (
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <CheckIcon className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-8 bg-blue-600"></div>
                        <div className="h-3 bg-gray-900 rounded w-1/3"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg"></div>
                          <div className="flex-1 space-y-1">
                            <div className="h-2 bg-gray-200 rounded w-2/3"></div>
                            <div className="h-2 bg-gray-100 rounded w-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center text-xs text-gray-500">
                    <span className="inline-block w-2 h-2 bg-gray-900 rounded-full mr-2"></span>
                    2-column list • Large images • Bold headers
                  </div>
                </div>

                {/* Elegant Template */}
                <div 
                  onClick={() => handleSettingChange('menu_template', 'elegant')}
                  className={`cursor-pointer border-2 rounded-xl p-6 transition-all duration-200 ${
                    localSettings.menu_template === 'elegant' 
                      ? 'border-blue-600 bg-blue-50 shadow-lg' 
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Elegant - Sophisticated</h3>
                      <p className="text-sm text-gray-600 mt-1">Premium list with large imagery</p>
                    </div>
                    {localSettings.menu_template === 'elegant' && (
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <CheckIcon className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="space-y-2">
                      <div className="h-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded w-1/3 mx-auto"></div>
                      <div className="flex gap-2">
                        <div className="w-24 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded"></div>
                        <div className="flex-1 space-y-1">
                          <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-2 bg-gray-100 rounded w-full"></div>
                          <div className="h-2 bg-gray-100 rounded w-5/6"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center text-xs text-gray-500">
                    <span className="inline-block w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
                    Full-width list • Serif fonts • Luxury feel
                  </div>
                </div>

                {/* Minimal Template */}
                <div 
                  onClick={() => handleSettingChange('menu_template', 'minimal')}
                  className={`cursor-pointer border-2 rounded-xl p-6 transition-all duration-200 ${
                    localSettings.menu_template === 'minimal' 
                      ? 'border-blue-600 bg-blue-50 shadow-lg' 
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Minimal - Grid</h3>
                      <p className="text-sm text-gray-600 mt-1">Simple grid with clean aesthetic</p>
                    </div>
                    {localSettings.menu_template === 'minimal' && (
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <CheckIcon className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="space-y-2">
                      <div className="h-2 bg-gray-900 rounded w-1/4"></div>
                      <div className="grid grid-cols-4 gap-1">
                        <div className="aspect-square bg-gray-50 border border-gray-200 rounded"></div>
                        <div className="aspect-square bg-gray-50 border border-gray-200 rounded"></div>
                        <div className="aspect-square bg-gray-50 border border-gray-200 rounded"></div>
                        <div className="aspect-square bg-gray-50 border border-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center text-xs text-gray-500">
                    <span className="inline-block w-2 h-2 bg-gray-900 rounded-full mr-2"></span>
                    4-column grid • Minimal borders • Light typography
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                  <PaintBrushIcon className="w-5 h-5 mr-2" />
                  Template Preview
                </h4>
                <p className="text-sm text-blue-800">
                  Choose the template that best matches your restaurant's style. The selected template will be used for all customer-facing menu pages accessed via QR codes.
                </p>
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