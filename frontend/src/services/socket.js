import { io } from 'socket.io-client'

class SocketService {
  constructor() {
    this.socket = null
    this.listeners = new Map()
  }

  connect() {
    if (this.socket?.connected) return

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 
                     (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin)

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    })

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id)
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
    })

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  joinBranch(branchId) {
    if (this.socket) {
      this.socket.emit('join-branch', branchId)
    }
  }

  joinRoom(room) {
    if (this.socket) {
      this.socket.emit('join-room', room)
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback)
      
      // Store listener for cleanup
      if (!this.listeners.has(event)) {
        this.listeners.set(event, [])
      }
      this.listeners.get(event).push(callback)
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback)
      
      // Remove from listeners
      if (this.listeners.has(event)) {
        const callbacks = this.listeners.get(event)
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data)
    }
  }

  // Kitchen specific events
  kitchenAck(data) {
    this.emit('kitchen-ack', data)
  }

  // Clean up all listeners
  removeAllListeners() {
    if (this.socket) {
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          this.socket.off(event, callback)
        })
      })
      this.listeners.clear()
    }
  }
}

// Create singleton instance
const socketService = new SocketService()

export default socketService