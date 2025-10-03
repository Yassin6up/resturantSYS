import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      tableInfo: null,
      customerInfo: {
        name: '',
        phone: ''
      },

      addItem: (menuItem, quantity = 1, modifiers = [], notes = '') => {
        const { items } = get()
        
        // Create unique key for item with modifiers
        const modifierIds = modifiers.map(m => m.id).sort().join(',')
        const itemKey = `${menuItem.id}-${modifierIds}-${notes}`
        
        const existingItemIndex = items.findIndex(item => 
          item.menuItem.id === menuItem.id && 
          item.modifierIds === modifierIds &&
          item.notes === notes
        )

        if (existingItemIndex >= 0) {
          // Update quantity of existing item
          const updatedItems = [...items]
          updatedItems[existingItemIndex].quantity += quantity
          set({ items: updatedItems })
        } else {
          // Add new item
          const modifierPrice = modifiers.reduce((sum, modifier) => sum + modifier.extra_price, 0)
          const itemTotal = (menuItem.price + modifierPrice) * quantity
          
          const newItem = {
            id: itemKey,
            menuItem,
            quantity,
            modifiers,
            modifierIds,
            notes,
            unitPrice: menuItem.price,
            modifierPrice,
            totalPrice: itemTotal
          }
          
          set({ items: [...items, newItem] })
        }
      },

      removeItem: (itemId) => {
        const { items } = get()
        set({ items: items.filter(item => item.id !== itemId) })
      },

      updateItemQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId)
          return
        }

        const { items } = get()
        const updatedItems = items.map(item => {
          if (item.id === itemId) {
            const totalPrice = (item.unitPrice + item.modifierPrice) * quantity
            return { ...item, quantity, totalPrice }
          }
          return item
        })
        set({ items: updatedItems })
      },

      clearCart: () => {
        set({ 
          items: [],
          customerInfo: { name: '', phone: '' }
        })
      },

      setTableInfo: (tableInfo) => {
        set({ tableInfo })
      },

      setCustomerInfo: (customerInfo) => {
        set({ customerInfo })
      },

      getCartTotal: () => {
        const { items } = get()
        return items.reduce((total, item) => total + item.totalPrice, 0)
      },

      getCartCount: () => {
        const { items } = get()
        return items.reduce((count, item) => count + item.quantity, 0)
      },

      getOrderData: () => {
        const { items, tableInfo, customerInfo } = get()
        
        if (!tableInfo) {
          throw new Error('Table information is required')
        }

        return {
          branchId: 1, // Default branch
          tableId: tableInfo.id,
          customerName: customerInfo.name,
          customerPhone: customerInfo.phone,
          items: items.map(item => ({
            menuItemId: item.menuItem.id,
            quantity: item.quantity,
            notes: item.notes,
            modifiers: item.modifiers.map(modifier => ({
              modifierId: modifier.id
            }))
          })),
          paymentMethod: 'CASH' // Default to cash
        }
      }
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({
        items: state.items,
        tableInfo: state.tableInfo,
        customerInfo: state.customerInfo
      })
    }
  )
)