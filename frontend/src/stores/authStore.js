import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      loading: false,
      error: null,

      login: async (credentials) => {
        set({ loading: true, error: null })
        try {
          const response = await api.post('/auth/login', credentials)
          const { accessToken, refreshToken, user } = response.data.data
          
          set({
            user,
            token: accessToken,
            refreshToken,
            loading: false,
            error: null
          })
          
          // Set token in API service
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
          
          return { success: true }
        } catch (error) {
          const errorMessage = error.response?.data?.error || 'Login failed'
          set({ loading: false, error: errorMessage })
          return { success: false, error: errorMessage }
        }
      },

      pinLogin: async (credentials) => {
        set({ loading: true, error: null })
        try {
          const response = await api.post('/auth/pin-login', credentials)
          const { accessToken, user } = response.data.data
          
          set({
            user,
            token: accessToken,
            refreshToken: null, // PIN login doesn't provide refresh token
            loading: false,
            error: null
          })
          
          // Set token in API service
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
          
          return { success: true }
        } catch (error) {
          const errorMessage = error.response?.data?.error || 'PIN login failed'
          set({ loading: false, error: errorMessage })
          return { success: false, error: errorMessage }
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          error: null
        })
        
        // Remove token from API service
        delete api.defaults.headers.common['Authorization']
        
        // Clear localStorage
        localStorage.removeItem('auth-storage')
      },

      checkAuth: async () => {
        const { token, refreshToken } = get()
        
        if (!token) {
          set({ loading: false })
          return
        }

        set({ loading: true })
        
        try {
          // Set token in API service
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          
          // Verify token by fetching user info
          const response = await api.get('/auth/me')
          const user = response.data.data.user
          
          set({ user, loading: false, error: null })
        } catch (error) {
          // Token is invalid, try to refresh if we have refresh token
          if (refreshToken) {
            try {
              const response = await api.post('/auth/refresh', { refreshToken })
              const { accessToken } = response.data.data
              
              set({ token: accessToken })
              api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
              
              // Try to get user info again
              const userResponse = await api.get('/auth/me')
              const user = userResponse.data.data.user
              
              set({ user, loading: false, error: null })
            } catch (refreshError) {
              // Refresh failed, logout
              get().logout()
              set({ loading: false })
            }
          } else {
            // No refresh token, logout
            get().logout()
            set({ loading: false })
          }
        }
      },

      hasRole: (roles) => {
        const { user } = get()
        if (!user) return false
        return roles.includes(user.role)
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken
      })
    }
  )
)