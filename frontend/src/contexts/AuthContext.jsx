import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      // Verify token and get user info
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      // In a real app, you'd verify the token with the server
      setUser({ id: 1, username: 'admin@posq.com', role: 'admin' })
    }
    setLoading(false)
  }, [])

  const login = async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials)
      const { accessToken, user: userData } = response.data
      
      localStorage.setItem('accessToken', accessToken)
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      setUser(userData)
      
      toast.success('Login successful')
      navigate('/admin/dashboard')
      
      return userData
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed')
      throw error
    }
  }

  const pinLogin = async (credentials) => {
    try {
      const response = await api.post('/auth/pin-login', credentials)
      const { accessToken, user: userData } = response.data
      
      localStorage.setItem('accessToken', accessToken)
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      setUser(userData)
      
      toast.success('Quick login successful')
      navigate('/admin/dashboard')
      
      return userData
    } catch (error) {
      toast.error(error.response?.data?.error || 'PIN login failed')
      throw error
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('accessToken')
      delete api.defaults.headers.common['Authorization']
      setUser(null)
      navigate('/admin/login')
      toast.success('Logged out successfully')
    }
  }

  const value = {
    user,
    login,
    pinLogin,
    logout,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}