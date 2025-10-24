import { createContext, useContext, useReducer, useEffect } from 'react'

const CartContext = createContext()

const initialState = {
  items: [],
  total: 0,
  itemCount: 0,
  branchId: null,
  tableNumber: null
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM':
      const existingItem = state.items.find(
        item => item.menuItemId === action.payload.menuItemId && 
        JSON.stringify(item.modifiers) === JSON.stringify(action.payload.modifiers)
      )

      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.id === existingItem.id
              ? { ...item, quantity: item.quantity + action.payload.quantity }
              : item
          ),
          total: state.total + action.payload.total,
          itemCount: state.itemCount + action.payload.quantity
        }
      } else {
        return {
          ...state,
          items: [...state.items, { ...action.payload, id: Date.now() }],
          total: state.total + action.payload.total,
          itemCount: state.itemCount + action.payload.quantity
        }
      }

    case 'REMOVE_ITEM':
      const itemToRemove = state.items.find(item => item.id === action.payload)
      if (!itemToRemove) return state

      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload),
        total: state.total - itemToRemove.total,
        itemCount: state.itemCount - itemToRemove.quantity
      }

    case 'UPDATE_QUANTITY':
      const itemToUpdate = state.items.find(item => item.id === action.payload.id)
      if (!itemToUpdate) return state

      const quantityDiff = action.payload.quantity - itemToUpdate.quantity
      const newTotal = state.total + (quantityDiff * itemToUpdate.unitPrice)

      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
        total: newTotal,
        itemCount: state.itemCount + quantityDiff
      }

    case 'CLEAR_CART':
      return initialState

    case 'SET_CART':
      return action.payload
    
    case 'SET_BRANCH_INFO':
      return {
        ...state,
        branchId: action.payload.branchId,
        tableNumber: action.payload.tableNumber
      }

    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('posq_cart')
    if (savedCart) {
      try {
        const cartData = JSON.parse(savedCart)
        dispatch({ type: 'SET_CART', payload: cartData })
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error)
        localStorage.removeItem('posq_cart')
      }
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('posq_cart', JSON.stringify(state))
  }, [state])

  const addItem = (menuItem, quantity = 1, modifiers = [], note = '', branchId = null, tableNumber = null) => {
    const modifierTotal = modifiers.reduce((sum, modifier) => sum + modifier.extra_price, 0)
    const unitPrice = menuItem.price + modifierTotal
    const total = unitPrice * quantity
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        menuItemId: menuItem.id,
        menuItem: menuItem,
        quantity,
        unitPrice,
        total,
        modifiers,
        note,
        branchId,
        tableNumber
      }
    })
  }
  
  const setBranchInfo = (branchId, tableNumber) => {
    dispatch({ 
      type: 'SET_BRANCH_INFO', 
      payload: { branchId, tableNumber } 
    })
  }

  const removeItem = (itemId) => {
    dispatch({ type: 'REMOVE_ITEM', payload: itemId })
  }

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeItem(itemId)
    } else {
      dispatch({ type: 'UPDATE_QUANTITY', payload: { id: itemId, quantity } })
    }
  }

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' })
  }

  const setCart = (cartData) => {
    dispatch({ type: 'SET_CART', payload: cartData })
  }

  const getCartTotal = () => {
    return state.items.reduce((total, item) => total + item.total, 0)
  }

  const getItemCount = () => {
    return state.items.reduce((count, item) => count + item.quantity, 0)
  }

  const value = {
    ...state,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    setCart,
    setBranchInfo,
    getCartTotal,
    getItemCount
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}