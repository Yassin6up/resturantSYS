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
    const branch = new URLSearchParams(window.location.search).get('branch')
    if (branch && /^\d+$/.test(branch)) config.headers['X-Branch-Id'] = branch
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
    if (error.response?.status === 401 && localStorage.getItem('token') && !originalRequest._retry) {
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
  register: (data) => api.post('/api/auth/register', data),
  pinLogin: (credentials) => api.post('/api/auth/pin-login', credentials),
  logout: () => api.post('/api/auth/logout'),
  refreshToken: (refreshToken) => api.post('/api/auth/refresh', { refreshToken }),
  getProfile: () => api.get('/api/auth/profile'),
  changePassword: (passwords) => api.post('/api/auth/change-password', passwords),
}

// Menu API
export const menuAPI = {
  importItems: rows => api.post('/api/catalog-import', { rows }, { timeout: 60000 }),
  readGoogleSheet: url => api.post('/api/catalog-import/google-sheet', { url }, { timeout: 25000 }),
  getMenu: (params) => api.get('/api/menu', { params }),
  getCategories: (params) => api.get('/api/menu/categories', { params }),
  createCategory: (data) => api.post('/api/menu/categories', data),
  updateCategory: (id, data) => api.put(`/api/menu/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/api/menu/categories/${id}`),
  getMenuItems: (params) => api.get('/api/menu/items', { params }),
 // Correct API functions
  createMenuItem: (data) => api.post('/api/menu/items', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  updateMenuItem: (id, data) => api.put(`/api/menu/items/${id}`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  deleteMenuItem: (id) => api.delete(`/api/menu/items/${id}`),
  toggleAvailability: (id, isAvailable) => api.patch(`/api/menu/items/${id}/availability`, { isAvailable }),
 
getMenuItemVariants: (menuItemId) => {
    return api.get(`/api/variants/menu-item/${menuItemId}`);
  },
  
  getVariant: (variantId) => {
    return api.get(`/api/variants/${variantId}`);
  },
  
  createMenuItemVariant: (menuItemId, variantData) => {
    return api.post(`/api/variants/menu-item/${menuItemId}`, variantData);
  },
  
  createMenuItemVariantsBulk: (menuItemId, variants) => {
    return api.post(`/api/variants/menu-item/${menuItemId}/bulk`, { variants });
  },
  
  updateMenuItemVariant: (variantId, variantData) => {
    return api.put(`/api/variants/${variantId}`, variantData);
  },
  
  updateMenuItemVariantsBulk: (menuItemId, variants) => {
    return api.put(`/api/variants/menu-item/${menuItemId}/bulk`, { variants });
  },
  
  deleteMenuItemVariant: (variantId) => {
    return api.delete(`/api/variants/${variantId}`);
  },
  
  deleteMenuItemVariants: (menuItemId) => {
    return api.delete(`/api/variants/menu-item/${menuItemId}`);
  }
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

// Loyalty API (staff-side, POS pay modal + admin customers page)
export const loyaltyAPI = {
  lookup: (phone) => api.post('/api/loyalty/pos/lookup', { phone }),
  createCustomer: (data) => api.post('/api/loyalty/pos/create', data),
  getSettings: () => api.get('/api/loyalty/settings'),
  updateSettings: (data) => api.put('/api/loyalty/settings', data),
  getRewards: () => api.get('/api/loyalty/rewards'),
  createReward: (data) => api.post('/api/loyalty/rewards', data),
  updateReward: (id, data) => api.put(`/api/loyalty/rewards/${id}`, data),
  deleteReward: (id) => api.delete(`/api/loyalty/rewards/${id}`),
  getCustomers: (params) => api.get('/api/loyalty/customers', { params }),
  getCustomer: (id) => api.get(`/api/loyalty/customers/${id}`),
  adjustPoints: (id, data) => api.post(`/api/loyalty/customers/${id}/adjust`, data),
}

// Platform billing API (Stripe subscriptions - restaurants paying the platform)
export const billingAPI = {
  getPlans: () => api.get('/api/billing/plans'),
  createPlan: (data) => api.post('/api/billing/plans', data),
  updatePlan: (id, data) => api.put(`/api/billing/plans/${id}`, data),
  getRestaurantBilling: (id) => api.get(`/api/billing/restaurants/${id}`),
  assignPlan: (id, planId) => api.post(`/api/billing/restaurants/${id}/plan`, { planId }),
  setPrice: (id, amountCents, applyImmediately) => api.post(`/api/billing/restaurants/${id}/price`, { amountCents, applyImmediately }),
  getCheckoutLink: (id, opts) => api.post(`/api/billing/restaurants/${id}/checkout-link`, opts || {}),
  cancelSubscription: (id, atPeriodEnd) => api.post(`/api/billing/restaurants/${id}/cancel`, { atPeriodEnd }),
  getMyStatus: () => api.get('/api/billing/my/status'),
  getMyPortal: () => api.get('/api/billing/my/portal'),
}

// WhatsApp marketing API
export const whatsappAPI = {
  getStatus: () => api.get('/api/whatsapp/status'),
  connect: () => api.post('/api/whatsapp/connect'),
  disconnect: () => api.post('/api/whatsapp/disconnect'),
  createCampaign: (data) => api.post('/api/whatsapp/campaigns', data),
  getCampaigns: () => api.get('/api/whatsapp/campaigns'),
  getCampaign: (id) => api.get(`/api/whatsapp/campaigns/${id}`),
  cancelCampaign: (id) => api.post(`/api/whatsapp/campaigns/${id}/cancel`),
}

// Public tenant info - lets the frontend tell apart the marketing apex
// domain (no tenant) from a store's own subdomain, and which business_type
// storefront to render.
export const tenantAPI = {
  getCurrent: () => api.get('/api/restaurants/public/current'),
}

// Bookable services (appointments/hotel/office verticals)
export const servicesAPI = {
  getPublic: () => api.get('/api/services/public'),
  getAll: () => api.get('/api/services'),
  create: (data) => api.post('/api/services', data),
  update: (id, data) => api.put(`/api/services/${id}`, data),
  delete: (id) => api.delete(`/api/services/${id}`),
}

// Weekly availability schedule + blocked dates (appointments/hotel/office)
export const availabilityAPI = {
  get: () => api.get('/api/availability'),
  updateHours: (hours) => api.put('/api/availability/hours', { hours }),
  addException: (data) => api.post('/api/availability/exceptions', data),
  removeException: (id) => api.delete(`/api/availability/exceptions/${id}`),
}

// Bookings (appointments/hotel/office verticals)
export const bookingsAPI = {
  getAvailability: (serviceId, date) => api.get('/api/bookings/availability', { params: { serviceId, date } }),
  create: (data) => api.post('/api/bookings', data),
  getAll: () => api.get('/api/bookings'),
  updateStatus: (id, status) => api.patch(`/api/bookings/${id}/status`, { status }),
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
  exportReport: (reportType, params) => api.get(`/api/reports/export/${reportType}`, { params, responseType: 'blob' }),
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

export const reservationsAPI = {
  availability: (date, partySize) => api.get('/api/reservations/availability', { params: { date, partySize } }),
  create: data => api.post('/api/reservations', data),
  list: () => api.get('/api/reservations'),
  update: (id, status) => api.patch(`/api/reservations/${id}/status`, { status })
}

export const themesAPI = {
  current: () => api.get('/api/themes/current'),
  upload: formData => api.post('/api/themes/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  activate: active => api.post('/api/themes/activate', { active }),
  remove: () => api.delete('/api/themes/current')
}
