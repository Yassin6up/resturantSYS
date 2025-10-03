import { createContext, useContext, useEffect, useState } from 'react'
import { appSettingsAPI } from '../services/api'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await appSettingsAPI.getSettings()
      if (response.data.success) {
        setSettings(response.data.settings)
        applyTheme(response.data.settings)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyTheme = (themeSettings) => {
    const root = document.documentElement
    
    // Apply color variables
    if (themeSettings.primary_color) {
      root.style.setProperty('--primary-color', themeSettings.primary_color.value)
    }
    if (themeSettings.secondary_color) {
      root.style.setProperty('--secondary-color', themeSettings.secondary_color.value)
    }
    if (themeSettings.accent_color) {
      root.style.setProperty('--accent-color', themeSettings.accent_color.value)
    }
    if (themeSettings.success_color) {
      root.style.setProperty('--success-color', themeSettings.success_color.value)
    }
    if (themeSettings.warning_color) {
      root.style.setProperty('--warning-color', themeSettings.warning_color.value)
    }
    if (themeSettings.error_color) {
      root.style.setProperty('--error-color', themeSettings.error_color.value)
    }
    if (themeSettings.background_color) {
      root.style.setProperty('--background-color', themeSettings.background_color.value)
    }
    if (themeSettings.surface_color) {
      root.style.setProperty('--surface-color', themeSettings.surface_color.value)
    }
    if (themeSettings.text_primary) {
      root.style.setProperty('--text-primary', themeSettings.text_primary.value)
    }
    if (themeSettings.text_secondary) {
      root.style.setProperty('--text-secondary', themeSettings.text_secondary.value)
    }

    // Apply layout variables
    if (themeSettings.border_radius) {
      root.style.setProperty('--border-radius', `${themeSettings.border_radius.value}px`)
    }
    if (themeSettings.sidebar_width) {
      root.style.setProperty('--sidebar-width', `${themeSettings.sidebar_width.value}px`)
    }
    if (themeSettings.header_height) {
      root.style.setProperty('--header-height', `${themeSettings.header_height.value}px`)
    }

    // Apply shadow intensity
    if (themeSettings.shadow_intensity) {
      const intensity = themeSettings.shadow_intensity.value
      switch (intensity) {
        case 'light':
          root.style.setProperty('--shadow-sm', '0 1px 2px 0 rgba(0, 0, 0, 0.05)')
          root.style.setProperty('--shadow-md', '0 4px 6px -1px rgba(0, 0, 0, 0.1)')
          root.style.setProperty('--shadow-lg', '0 10px 15px -3px rgba(0, 0, 0, 0.1)')
          root.style.setProperty('--shadow-xl', '0 20px 25px -5px rgba(0, 0, 0, 0.1)')
          break
        case 'heavy':
          root.style.setProperty('--shadow-sm', '0 2px 4px 0 rgba(0, 0, 0, 0.1)')
          root.style.setProperty('--shadow-md', '0 8px 12px -2px rgba(0, 0, 0, 0.15)')
          root.style.setProperty('--shadow-lg', '0 20px 30px -5px rgba(0, 0, 0, 0.15)')
          root.style.setProperty('--shadow-xl', '0 40px 50px -10px rgba(0, 0, 0, 0.2)')
          break
        default: // medium
          root.style.setProperty('--shadow-sm', '0 1px 3px 0 rgba(0, 0, 0, 0.1)')
          root.style.setProperty('--shadow-md', '0 4px 6px -1px rgba(0, 0, 0, 0.1)')
          root.style.setProperty('--shadow-lg', '0 10px 15px -3px rgba(0, 0, 0, 0.1)')
          root.style.setProperty('--shadow-xl', '0 20px 25px -5px rgba(0, 0, 0, 0.1)')
      }
    }
  }

  const updateSettings = async (newSettings) => {
    try {
      const response = await appSettingsAPI.updateSettings(newSettings)
      if (response.data.success) {
        // Reload settings to get updated values
        await loadSettings()
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to update settings:', error)
      return false
    }
  }

  const getSetting = (key) => {
    return settings[key]?.value || null
  }

  const getAppName = () => {
    return getSetting('app_name') || 'POSQ Restaurant'
  }

  const getWelcomeMessage = () => {
    return getSetting('welcome_message') || 'Welcome to our restaurant!'
  }

  const getCurrency = () => {
    return getSetting('currency') || 'MAD'
  }

  const value = {
    settings,
    loading,
    loadSettings,
    updateSettings,
    getSetting,
    getAppName,
    getWelcomeMessage,
    getCurrency,
    applyTheme
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}