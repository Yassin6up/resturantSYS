import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

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

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/admin/login'
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
  updateOrderStatus: (id, status) => api.patch(`/api/orders/${id}/status`, { status }),
  confirmOrder: (id) => api.post(`/api/orders/${id}/confirm`),
  cancelOrder: (id, reason) => api.post(`/api/orders/${id}/cancel`, { reason }),
}

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
  getLowStockAlerts: (params) => api.get('/api/inventory/stock/alerts/low', { params }),
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
  updateOperatingMode: (mode) => api.put('/api/settings/mode/operating', { mode }),
  getDatabaseConfig: () => api.get('/api/settings/database/config'),
  testDatabaseConnection: (config) => api.post('/api/settings/database/test', config),
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

export default api