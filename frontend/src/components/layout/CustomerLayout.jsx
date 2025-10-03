import { Outlet, useLocation } from 'react-router-dom'
import { useCart } from '../../contexts/CartContext'
import { ShoppingCartIcon } from '@heroicons/react/24/outline'
import CartBottomBar from '../CartBottomBar'

function CustomerLayout() {
  const location = useLocation()
  const { itemCount, total } = useCart()

  const isCartPage = location.pathname === '/cart'
  const isCheckoutPage = location.pathname === '/checkout'
  const isOrderPage = location.pathname.startsWith('/order/')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-xl border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">P</span>
              </div>
              <h1 className="text-2xl font-bold gradient-text">POSQ Restaurant</h1>
            </div>
            
            {/* Cart Button */}
            {!isCartPage && !isCheckoutPage && !isOrderPage && (
              <div className="flex items-center">
                <button
                  onClick={() => window.location.href = '/cart'}
                  className="relative btn-primary group"
                >
                  <ShoppingCartIcon className="h-5 w-5 mr-2 group-hover:animate-bounce" />
                  Cart
                  {itemCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-semibold shadow-lg animate-bounce">
                      {itemCount}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-fadeInUp">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-md border-t border-gray-100 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex justify-center items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold gradient-text">POSQ Restaurant</span>
            </div>
            <p className="text-gray-600 mb-2">&copy; 2024 POSQ Restaurant. All rights reserved.</p>
            <p className="text-sm text-gray-500">Scan QR code to order • Pay at cashier</p>
            <p className="text-xs text-gray-400 mt-2">Powered by modern technology</p>
          </div>
        </div>
      </footer>

      {/* Mobile Cart Bottom Bar */}
      <CartBottomBar />
    </div>
  )
}

export default CustomerLayout