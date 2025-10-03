import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, pinLogin, isAuthenticated } = useAuth()
  
  const [loginMode, setLoginMode] = useState('password') // 'password' or 'pin'
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    pin: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const from = location.state?.from?.pathname || '/admin/dashboard'

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, from])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      let result
      if (loginMode === 'password') {
        result = await login({
          username: formData.username,
          password: formData.password
        })
      } else {
        result = await pinLogin({
          username: formData.username,
          pin: formData.pin
        })
      }

      if (result.success) {
        navigate(from, { replace: true })
      }
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const toggleLoginMode = () => {
    setLoginMode(prev => prev === 'password' ? 'pin' : 'password')
    setFormData({ username: '', password: '', pin: '' })
    setShowPassword(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">POSQ Admin</h1>
          <p className="text-gray-600">Restaurant POS Management</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Login Mode Toggle */}
          <div className="flex rounded-md shadow-sm mb-6">
            <button
              type="button"
              onClick={() => setLoginMode('password')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-l-md border ${
                loginMode === 'password'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Password Login
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('pin')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-r-md border ${
                loginMode === 'pin'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              PIN Login
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label htmlFor="username" className="form-label">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={formData.username}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter your username"
              />
            </div>

            {/* Password or PIN */}
            <div>
              <label htmlFor={loginMode === 'password' ? 'password' : 'pin'} className="form-label">
                {loginMode === 'password' ? 'Password' : 'PIN'}
              </label>
              <div className="relative">
                <input
                  id={loginMode === 'password' ? 'password' : 'pin'}
                  name={loginMode === 'password' ? 'password' : 'pin'}
                  type={loginMode === 'password' && !showPassword ? 'password' : 'text'}
                  autoComplete={loginMode === 'password' ? 'current-password' : 'off'}
                  required
                  value={loginMode === 'password' ? formData.password : formData.pin}
                  onChange={handleInputChange}
                  className="form-input pr-10"
                  placeholder={loginMode === 'password' ? 'Enter your password' : 'Enter your PIN'}
                />
                {loginMode === 'password' && (
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
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="loading-spinner mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  `Sign in with ${loginMode === 'password' ? 'Password' : 'PIN'}`
                )}
              </button>
            </div>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Demo Credentials:</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>Admin:</strong> admin / admin123</p>
              <p><strong>Cashier:</strong> cashier1 / cashier123 (PIN: 5678)</p>
              <p><strong>Kitchen:</strong> kitchen1 / kitchen123 (PIN: 9999)</p>
            </div>
          </div>

          {/* Customer Access */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Customer?{' '}
              <a
                href="/menu"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Browse Menu
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage