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
        JSON.stringify(item.modifiers) === JSON.stringify(action.payload.modifiers) &&
        item.variantId === action.payload.variantId
      )

      if (existingItem) {
        const newQuantity = existingItem.quantity + action.payload.quantity;
        const newTotal = existingItem.unitPrice * newQuantity;
        const quantityDiff = action.payload.quantity;

        return {
          ...state,
          items: state.items.map(item =>
            item.id === existingItem.id
              ? { 
                  ...item, 
                  quantity: newQuantity,
                  total: newTotal
                }
              : item
          ),
          total: state.total + (action.payload.unitPrice * quantityDiff),
          itemCount: state.itemCount + quantityDiff
        }
      } else {
        return {
          ...state,
          items: [...state.items, { 
            ...action.payload, 
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9) 
          }],
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
      const priceDiff = quantityDiff * itemToUpdate.unitPrice
      const newTotal = itemToUpdate.unitPrice * action.payload.quantity

      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { 
                ...item, 
                quantity: action.payload.quantity, 
                total: newTotal 
              }
            : item
        ),
        total: state.total + priceDiff,
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

  // Load cart from localStorage
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

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('posq_cart', JSON.stringify(state))
  }, [state])

  const addItem = (menuItem, quantity = 1, modifiers = [], note = '', branchId = null, tableNumber = null, variant = null) => {
    const basePrice = parseFloat(menuItem.price || 0);
    const variantPrice = variant ? parseFloat(variant.price_adjustment || 0) : 0;
    const modifierTotal = modifiers.reduce((sum, modifier) => sum + parseFloat(modifier.extra_price || 0), 0);
    
    const unitPrice = basePrice + variantPrice + modifierTotal;
    const total = unitPrice * quantity;

    const cartItem = {
      menuItemId: menuItem.id,
      name: menuItem.name,
      image: menuItem.image,
      price: menuItem.price,
      quantity,
      unitPrice,
      total,
      modifiers,
      note,
      branchId: branchId || state.branchId,
      tableNumber: tableNumber || state.tableNumber,
      variantId: variant?.id || null,
      variantName: variant?.name || null,
      variantPriceAdjustment: variant?.price_adjustment || 0
    };

    dispatch({
      type: 'ADD_ITEM',
      payload: cartItem
    });
  };
  
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

  const value = {
    ...state,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    setBranchInfo
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