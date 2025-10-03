import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const SocketContext = createContext()

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [orders, setOrders] = useState([])
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    if (isAuthenticated && user) {
      const socketInstance = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
        transports: ['websocket'],
        auth: {
          userId: user.id,
          role: user.role
        }
      })

      socketInstance.on('connect', () => {
        console.log('Socket connected:', socketInstance.id)
        setIsConnected(true)
        
        // Join appropriate rooms based on user role
        if (user.role === 'kitchen') {
          socketInstance.emit('join-kitchen', 1) // Default branch ID
        } else if (['admin', 'manager', 'cashier'].includes(user.role)) {
          socketInstance.emit('join-cashier', 1) // Default branch ID
        }
      })

      socketInstance.on('disconnect', () => {
        console.log('Socket disconnected')
        setIsConnected(false)
      })

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error)
        setIsConnected(false)
      })

      // Order events
      socketInstance.on('order.created', (order) => {
        console.log('New order created:', order)
        setOrders(prev => [order, ...prev])
        
        if (user.role === 'kitchen') {
          toast.success(`New order: ${order.order_code}`)
        } else if (['admin', 'manager', 'cashier'].includes(user.role)) {
          toast.success(`New order: ${order.order_code} - Table ${order.table_number}`)
        }
      })

      socketInstance.on('order.updated', (order) => {
        console.log('Order updated:', order)
        setOrders(prev => 
          prev.map(o => o.id === order.id ? { ...o, ...order } : o)
        )
        
        if (user.role === 'kitchen') {
          toast.info(`Order ${order.order_code} status: ${order.status}`)
        }
      })

      socketInstance.on('order.confirmed', (order) => {
        console.log('Order confirmed:', order)
        setOrders(prev => 
          prev.map(o => o.id === order.id ? { ...o, ...order } : o)
        )
        
        if (user.role === 'kitchen') {
          toast.success(`Order ${order.order_code} confirmed - Start preparing!`)
        }
      })

      socketInstance.on('order.cancelled', (order) => {
        console.log('Order cancelled:', order)
        setOrders(prev => 
          prev.map(o => o.id === order.id ? { ...o, ...order } : o)
        )
        
        if (user.role === 'kitchen') {
          toast.error(`Order ${order.order_code} cancelled`)
        }
      })

      // Payment events
      socketInstance.on('payment.recorded', (data) => {
        console.log('Payment recorded:', data)
        setOrders(prev => 
          prev.map(o => o.id === data.orderId ? { ...o, payment_status: data.paymentStatus } : o)
        )
        
        if (['admin', 'manager', 'cashier'].includes(user.role)) {
          toast.success(`Payment recorded: ${data.totalPaid} MAD`)
        }
      })

      // Kitchen acknowledgment
      socketInstance.on('kitchen.ack', (data) => {
        console.log('Kitchen acknowledgment:', data)
        setOrders(prev => 
          prev.map(o => o.id === data.orderId ? { ...o, status: 'PREPARING' } : o)
        )
      })

      // Printer events
      socketInstance.on('printer.status', (data) => {
        console.log('Printer status:', data)
        if (data.status === 'error') {
          toast.error(`Printer ${data.printerId} error: ${data.error}`)
        }
      })

      setSocket(socketInstance)

      return () => {
        socketInstance.disconnect()
        setSocket(null)
        setIsConnected(false)
      }
    }
  }, [isAuthenticated, user])

  const updateOrderStatus = (orderId, status) => {
    if (socket) {
      socket.emit('order-status-update', {
        orderId,
        status,
        userId: user?.id
      })
    }
  }

  const acknowledgeOrder = (orderId) => {
    if (socket && user?.role === 'kitchen') {
      socket.emit('kitchen-ack', {
        orderId,
        userId: user.id
      })
    }
  }

  const updatePaymentStatus = (orderId, paymentStatus) => {
    if (socket) {
      socket.emit('payment-update', {
        orderId,
        paymentStatus,
        userId: user?.id
      })
    }
  }

  const joinBranch = (branchId) => {
    if (socket) {
      socket.emit('join-branch', branchId)
    }
  }

  const value = {
    socket,
    isConnected,
    orders,
    updateOrderStatus,
    acknowledgeOrder,
    updatePaymentStatus,
    joinBranch
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}