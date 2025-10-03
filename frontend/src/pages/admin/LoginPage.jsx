import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, pinLogin, user, loading, error, clearError } = useAuthStore()
  
  const [loginType, setLoginType] = useState('password') // 'password' or 'pin'
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    pin: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const from = location.state?.from?.pathname || '/admin/dashboard'

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true })
    }
  }, [user, navigate, from])

  useEffect(() => {
    if (error) {
      toast.error(error)
      clearError()
    }
  }, [error, clearError])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      let result
      if (loginType === 'pin') {
        result = await pinLogin({
          username: formData.username,
          pin: formData.pin
        })
      } else {
        result = await login({
          username: formData.username,
          password: formData.password
        })
      }

      if (result.success) {
        toast.success('Login successful!')
        navigate(from, { replace: true })
      }
    } catch (error) {
      // Error is handled by the store and displayed via toast
    } finally {
      setSubmitting(false)
    }
  }

  const quickLoginUsers = [
    { username: 'admin', role: 'Administrator' },
    { username: 'cashier', role: 'Cashier' },
    { username: 'kitchen', role: 'Kitchen Staff' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">POSQ</h1>
          <h2 className="text-2xl font-semibold text-gray-700">Admin Dashboard</h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to manage your restaurant
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Login Type Toggle */}
          <div className="mb-6">
            <div className="flex rounded-md shadow-sm">
              <button
                type="button"
                onClick={() => setLoginType('password')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-l-md border ${
                  loginType === 'password'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Password Login
              </button>
              <button
                type="button"
                onClick={() => setLoginType('pin')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-r-md border-t border-r border-b ${
                  loginType === 'pin'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                PIN Login
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleInputChange}
                  className="input"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            {/* Password or PIN */}
            {loginType === 'password' ? (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="input pr-10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="pin" className="block text-sm font-medium text-gray-700">
                  PIN
                </label>
                <div className="mt-1">
                  <input
                    id="pin"
                    name="pin"
                    type="password"
                    required
                    maxLength="4"
                    value={formData.pin}
                    onChange={handleInputChange}
                    className="input text-center text-2xl tracking-widest"
                    placeholder="••••"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-primary py-3"
              >
                {submitting ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size="small" className="mr-2" />
                    Signing in...
                  </div>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

          {/* Quick Login (Development) */}
          {import.meta.env.DEV && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-3 text-center">
                Quick login (Development only)
              </p>
              <div className="space-y-2">
                {quickLoginUsers.map((user) => (
                  <button
                    key={user.username}
                    type="button"
                    onClick={() => {
                      setFormData({
                        username: user.username,
                        password: `${user.username}123`,
                        pin: user.username === 'admin' ? '1234' : user.username === 'cashier' ? '5678' : '9999'
                      })
                    }}
                    className="w-full text-left px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    <div className="font-medium">{user.username}</div>
                    <div className="text-gray-600">{user.role}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Demo Credentials</h3>
            <div className="text-xs text-blue-700 space-y-1">
              <div><strong>Admin:</strong> admin / admin123 (PIN: 1234)</div>
              <div><strong>Cashier:</strong> cashier / cashier123 (PIN: 5678)</div>
              <div><strong>Kitchen:</strong> kitchen / kitchen123 (PIN: 9999)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage