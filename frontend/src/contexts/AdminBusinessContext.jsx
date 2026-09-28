import { createContext, useContext } from 'react'

export const AdminBusinessContext = createContext(null)
export function useAdminBusiness() {
  const value = useContext(AdminBusinessContext)
  if (!value) throw new Error('Admin business has not loaded')
  return value
}
