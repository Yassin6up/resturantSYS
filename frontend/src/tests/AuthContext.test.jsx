import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import api from '../services/api'

// Mock the API
jest.mock('../services/api')

// Mock react-router-dom
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}))

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}))

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

const wrapper = ({ children }) => {
  const queryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
  })

  it('should provide initial auth state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user).toBeNull()
    expect(result.current.loading).toBe(true)
  })

  it('should login successfully with valid credentials', async () => {
    const mockUser = {
      id: 1,
      username: 'admin@posq.com',
      full_name: 'Admin User',
      role: 'admin'
    }

    const mockResponse = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: mockUser
    }

    api.post.mockResolvedValue({ data: mockResponse })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.login({
        username: 'admin@posq.com',
        password: 'admin123'
      })
    })

    expect(result.current.user).toEqual(mockUser)
    expect(localStorage.getItem('accessToken')).toBe('mock-access-token')
    expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard')
  })

  it('should handle login errors', async () => {
    api.post.mockRejectedValue(new Error('Invalid credentials'))

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      try {
        await result.current.login({
          username: 'admin@posq.com',
          password: 'wrongpassword'
        })
      } catch (error) {
        // Expected to throw
      }
    })

    expect(result.current.user).toBeNull()
    expect(localStorage.getItem('accessToken')).toBeNull()
  })

  it('should perform PIN login', async () => {
    const mockUser = {
      id: 2,
      username: 'cashier1@posq.com',
      full_name: 'Cashier One',
      role: 'cashier'
    }

    const mockResponse = {
      accessToken: 'mock-access-token',
      user: mockUser
    }

    api.post.mockResolvedValue({ data: mockResponse })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.pinLogin({
        username: 'cashier1@posq.com',
        pin: '2222'
      })
    })

    expect(result.current.user).toEqual(mockUser)
    expect(localStorage.getItem('accessToken')).toBe('mock-access-token')
    expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard')
  })

  it('should logout successfully', async () => {
    // Set up logged in state
    localStorage.setItem('accessToken', 'mock-token')
    
    const { result } = renderHook(() => useAuth(), { wrapper })

    // Mock successful logout
    api.post.mockResolvedValue({ data: { message: 'Logged out successfully' } })

    await act(async () => {
      await result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(mockNavigate).toHaveBeenCalledWith('/admin/login')
  })

  it('should handle logout errors gracefully', async () => {
    localStorage.setItem('accessToken', 'mock-token')
    
    const { result } = renderHook(() => useAuth(), { wrapper })

    // Mock logout error
    api.post.mockRejectedValue(new Error('Logout failed'))

    await act(async () => {
      await result.current.logout()
    })

    // Should still logout locally even if API call fails
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(mockNavigate).toHaveBeenCalledWith('/admin/login')
  })
})