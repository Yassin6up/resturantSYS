import { Outlet, useLocation } from 'react-router-dom'
import { useCart } from '../../contexts/CartContext'
import { ShoppingCartIcon } from '@heroicons/react/24/outline'
import CartBottomBar from '../CartBottomBar'
import { useNavigate } from 'react-router-dom'

function CustomerLayout() {
  const location = useLocation()
  const { itemCount, total } = useCart()
const navigate = useNavigate()
  const isCartPage = location.pathname === '/cart'
  const isCheckoutPage = location.pathname === '/checkout'
  const isOrderPage = location.pathname.startsWith('/order/')

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-md shadow-xl border-b border-yellow-400/30 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-orange-500 rounded-xl flex items-center justify-center shadow-lg border border-yellow-400">
                <span className="text-white font-bold text-xl">P</span>
              </div>
              <h1 className="text-2xl font-bold text-white">POSQ Restaurant</h1>
            </div>
            
            {/* Cart Button */}
            {!isCartPage && !isCheckoutPage && !isOrderPage && (
              <div className="flex items-center">
                <button
                  onClick={() => navigate("/cart")}
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
      <footer className="bg-black/80 backdrop-blur-md border-t border-yellow-400/30 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex justify-center items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-orange-500 rounded-xl flex items-center justify-center shadow-lg border border-yellow-400">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold text-white">POSQ Restaurant</span>
            </div>
            <p className="text-gray-300 mb-2">&copy; 2024 POSQ Restaurant. All rights reserved.</p>
            <p className="text-sm text-gray-400">Scan QR code to order • Pay at cashier</p>
            <p className="text-xs text-gray-500 mt-2">Powered by modern technology</p>
          </div>
        </div>
      </footer>

      {/* Mobile Cart Bottom Bar */}
      <CartBottomBar />
    </div>
  )
}

export default CustomerLayout