import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors and refresh tokens
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If error is 401 or 403 and we haven't retried yet
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token
          return api(originalRequest)
        }).catch(err => {
          return Promise.reject(err)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refreshToken')
      
      if (!refreshToken) {
        // No refresh token, logout
        processQueue(error, null)
        isRefreshing = false
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        window.location.href = '/admin/login'
        return Promise.reject(error)
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, { refreshToken })
        const { accessToken } = response.data
        
        localStorage.setItem('token', accessToken)
        api.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken
        originalRequest.headers['Authorization'] = 'Bearer ' + accessToken
        
        processQueue(null, accessToken)
        isRefreshing = false
        
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        isRefreshing = false
        
        // Refresh failed, logout
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        window.location.href = '/admin/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  pinLogin: (credentials) => api.post('/api/auth/pin-login', credentials),
  logout: () => api.post('/api/auth/logout'),
  refreshToken: (refreshToken) => api.post('/api/auth/refresh', { refreshToken }),
  getProfile: () => api.get('/api/auth/profile'),
  changePassword: (passwords) => api.post('/api/auth/change-password', passwords),
}

// Menu API
export const menuAPI = {
  getMenu: (params) => api.get('/api/menu', { params }),
  getCategories: (params) => api.get('/api/menu/categories', { params }),
  createCategory: (data) => api.post('/api/menu/categories', data),
  updateCategory: (id, data) => api.put(`/api/menu/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/api/menu/categories/${id}`),
  getMenuItems: (params) => api.get('/api/menu/items', { params }),
  createMenuItem: (data) => api.post('/api/menu/items', data),
  updateMenuItem: (id, data) => api.put(`/api/menu/items/${id}`, data),
  deleteMenuItem: (id) => api.delete(`/api/menu/items/${id}`),
  toggleAvailability: (id, isAvailable) => api.patch(`/api/menu/items/${id}/availability`, { isAvailable }),
}

// Orders API
export const ordersAPI = {
  createOrder: (data) => api.post('/api/orders', data),
  getOrders: (params) => api.get('/api/orders', { params }),
  getOrder: (id) => api.get(`/api/orders/${id}`),
    searchOrderByPin: (pin) => {
    return api.get(`/api/orders/search/pin/${pin}`);
  },
  getOrderByPin: (pin) => api.get(`/api/orders/pin/${pin}`),
  getOrderByCode: (code) => api.get(`/api/orders/code/${code}`),
  updateOrderStatus: (id, status) => api.patch(`/api/orders/${id}/status`, { status }),
  updatePayment: (id, data) => api.patch(`/api/orders/${id}/payment`, data),
  confirmOrder: (id) => api.post(`/api/orders/${id}/confirm`),
  cancelOrder: (id, reason) => api.post(`/api/orders/${id}/cancel`, { reason }),
}

// Tables API
// export const tablesAPI = {
//   getTables: (params) => api.get('/api/tables', { params }),
//   getTable: (id) => api.get(`/api/tables/${id}`),
//   createTable: (data) => api.post('/api/tables', data),
//   updateTable: (id, data) => api.put(`/api/tables/${id}`, data),
//   deleteTable: (id) => api.delete(`/api/tables/${id}`),
//   getTableQR: (id) => api.get(`/api/tables/${id}/qr?format=dataurl`),
//   getTableQRSheet: (branchId) => api.get(`/api/tables/branch/${branchId}/qr-sheet`),
//   getTableOrders: (id) => api.get(`/api/tables/${id}/orders`),
// }

// Payments API
export const paymentsAPI = {
  recordPayment: (data) => api.post('/api/payments', data),
  processCardPayment: (data) => api.post('/api/payments/card', data),
  getOrderPayments: (orderId) => api.get(`/api/payments/order/${orderId}`),
  processRefund: (data) => api.post('/api/payments/refund', data),
}

// Tables API
export const tablesAPI = {
  getTables: (params) => api.get('/api/tables', { params }),
  getTable: (id) => api.get(`/api/tables/${id}`),
  createTable: (data) => api.post('/api/tables', data),
  updateTable: (id, data) => api.put(`/api/tables/${id}`, data),
  deleteTable: (id) => api.delete(`/api/tables/${id}`),
  getTableQR: (id, format) => api.get(`/api/tables/${id}/qr`, { params: { format } }),
  getQRSheet: (branchId) => api.get(`/api/tables/branch/${branchId}/qr-sheet`),
  getTableOrders: (id, params) => api.get(`/api/tables/${id}/orders`, { params }),
}

// Inventory API
export const inventoryAPI = {
  getStockItems: (params) => api.get('/api/inventory/stock', { params }),
  createStockItem: (data) => api.post('/api/inventory/stock', data),
  updateStockItem: (id, data) => api.put(`/api/inventory/stock/${id}`, data),
  deleteStockItem: (id) => api.delete(`/api/inventory/stock/${id}`),
  recordStockMovement: (id, data) => api.post(`/api/inventory/stock/${id}/move`, data),
  getStockMovements: (id, params) => api.get(`/api/inventory/stock/${id}/movements`, { params }),
  getInventoryHistory: (params) => api.get('/api/inventory/history', { params }),
  getLowStockAlerts: (params) => api.get('/api/inventory/stock/alerts/low', { params }),
  getLowStockItems: (params) => api.get('/api/inventory/stock/alerts/low', { params }),
  getAlerts: (params) => api.get('/api/inventory/alerts', { params }),
  resolveAlert: (id) => api.patch(`/api/inventory/alerts/${id}/resolve`),
  getRecipes: (params) => api.get('/api/inventory/recipes', { params }),
  createRecipe: (data) => api.post('/api/inventory/recipes', data),
  updateRecipe: (id, data) => api.put(`/api/inventory/recipes/${id}`, data),
  deleteRecipe: (id) => api.delete(`/api/inventory/recipes/${id}`),
}

// Settings API
export const settingsAPI = {
  getSettings: () => api.get('/api/settings'),
  updateSettings: (data) => api.put('/api/settings', { settings: data }),
  getSetting: (key) => api.get(`/api/settings/${key}`),
  updateSetting: (key, value) => api.put(`/api/settings/${key}`, { value }),
  getOperatingMode: () => api.get('/api/settings/mode/operating'),
  updateOperatingMode: (mode) => api.post('/api/settings/change-operating-mode', { mode }),
  changeOperatingMode: (mode) => api.post('/api/settings/change-operating-mode', { mode }),
  getDatabaseConfig: () => api.get('/api/settings/database/config'),
  testDatabaseConnection: (config) => api.post('/api/settings/database/test', config),
  initializeDatabase: (config) => api.post('/api/settings/database/initialize', config),
  exportDatabase: () => api.get('/api/settings/database/export', { responseType: 'blob' }),
  getPaymentGatewayConfig: () => api.get('/api/settings/payment/gateway'),
  getPrinterConfig: () => api.get('/api/settings/printer/config'),
  updatePrinterConfig: (config) => api.put('/api/settings/printer/config', config),
  resetSettings: () => api.post('/api/settings/reset'),
}

// Sync API
export const syncAPI = {
  getSyncStatus: () => api.get('/api/sync/status'),
  triggerManualSync: () => api.post('/api/sync/manual'),
  pushChanges: (operations) => api.post('/api/sync/push', { operations }),
  pullChanges: (params) => api.get('/api/sync/pull', { params }),
  getSyncLogs: (params) => api.get('/api/sync/logs', { params }),
  clearSyncLogs: (data) => api.delete('/api/sync/logs', { data }),
}

// Reports API
export const reportsAPI = {
  getDailySales: (params) => api.get('/api/reports/sales/daily', { params }),
  getSalesRange: (params) => api.get('/api/reports/sales/range', { params }),
  getTopItems: (params) => api.get('/api/reports/items/top', { params }),
  getTableTurnover: (params) => api.get('/api/reports/tables/turnover', { params }),
  getInventoryUsage: (params) => api.get('/api/reports/inventory/usage', { params }),
  getPaymentMethods: (params) => api.get('/api/reports/payments/methods', { params }),
  getCashReconciliation: (params) => api.get('/api/reports/cash/reconciliation', { params }),
  exportReport: (reportType, params) => api.get(`/api/reports/export/${reportType}`, { params }),
}

// Upload API
export const uploadAPI = {
  uploadImage: (formData) => api.post('/api/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  uploadImages: (formData) => api.post('/api/upload/images', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  deleteImage: (filename) => api.delete(`/api/upload/image/${filename}`),
  getImages: () => api.get('/api/upload/images'),
}

// App Settings API (Dynamic Settings)
export const appSettingsAPI = {
  getSettings: () => api.get('/api/app-settings'),
  getSettingsByCategory: (category) => api.get(`/api/app-settings/category/${category}`),
  updateSetting: (key, value) => api.put(`/api/app-settings/${key}`, { value }),
  updateSettings: (settings) => api.put('/api/app-settings', { settings }),
  resetSettings: (category) => api.post('/api/app-settings/reset', { category }),
}

// Backup API
export const backupAPI = {
  createBackup: () => api.post('/api/backup/create'),
  listBackups: () => api.get('/api/backup/list'),
  restoreBackup: (filename) => api.post('/api/backup/restore', { filename }),
  deleteBackup: (filename) => api.delete(`/api/backup/${filename}`),
}

// Employees API
export const employeesAPI = {
  getEmployees: () => api.get('/api/employees'),
  getEmployee: (id) => api.get(`/api/employees/${id}`),
  createEmployee: (data) => api.post('/api/employees', data),
  updateEmployee: (id, data) => api.put(`/api/employees/${id}`, data),
  deleteEmployee: (id) => api.delete(`/api/employees/${id}`),
  activateEmployee: (id) => api.post(`/api/employees/${id}/activate`),
}

// Restaurants API (Multi-tenant)
export const restaurantsAPI = {
  getRestaurants: () => api.get('/api/restaurants'),
  getRestaurant: (id) => api.get(`/api/restaurants/${id}`),
  createRestaurant: (data) => api.post('/api/restaurants', data),
  updateRestaurant: (id, data) => api.put(`/api/restaurants/${id}`, data),
  deleteRestaurant: (id) => api.delete(`/api/restaurants/${id}`),
  activateRestaurant: (id) => api.post(`/api/restaurants/${id}/activate`),
  getRestaurantDashboard: (id) => api.get(`/api/restaurants/${id}/dashboard`),
}

export default api