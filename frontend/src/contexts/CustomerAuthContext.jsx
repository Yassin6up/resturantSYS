import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const CustomerAuthContext = createContext(null)
const API_BASE_URL = import.meta.env.VITE_API_URL || ''
const TOKEN_KEY = 'customerToken'

// Until real per-restaurant subdomains exist, the restaurant is identified
// by a `branchId` query param (falls back to the numeric id 1 for the
// current single-tenant deployment) sent as X-Branch-Id. Once subdomains are
// live, the Host header resolves this instead and none of this is needed.
function currentBranchId() {
  const params = new URLSearchParams(window.location.search)
  return params.get('branchId') || localStorage.getItem('currentBranchId') || '1'
}

const client = axios.create({ baseURL: API_BASE_URL })
client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers['X-Branch-Id'] = currentBranchId()
  return config
})

export function CustomerAuthProvider({ children }) {
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) { setLoading(false); return }
    try {
      const { data } = await client.get('/api/customer/me')
      setCustomer(data.customer)
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      setCustomer(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProfile() }, [])

  const register = async (phone, name, password) => {
    const { data } = await client.post('/api/customer-auth/register', { phone, name, password })
    localStorage.setItem(TOKEN_KEY, data.token)
    setCustomer(data.customer)
    return data.customer
  }

  const login = async (phone, password) => {
    const { data } = await client.post('/api/customer-auth/login', { phone, password })
    localStorage.setItem(TOKEN_KEY, data.token)
    setCustomer(data.customer)
    return data.customer
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setCustomer(null)
  }

  const refresh = loadProfile

  return (
    <CustomerAuthContext.Provider value={{ customer, loading, register, login, logout, refresh, client }}>
      {children}
    </CustomerAuthContext.Provider>
  )
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext)
  if (!ctx) throw new Error('useCustomerAuth must be used within a CustomerAuthProvider')
  return ctx
}
