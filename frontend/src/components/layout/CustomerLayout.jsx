import { Outlet, useLocation } from 'react-router-dom'
import { useCart } from '../../contexts/CartContext'
import { ShoppingCartIcon } from '@heroicons/react/24/outline'

function CustomerLayout() {
  const location = useLocation()
  const { itemCount, total } = useCart()

  const isCartPage = location.pathname === '/cart'
  const isCheckoutPage = location.pathname === '/checkout'
  const isOrderPage = location.pathname.startsWith('/order/')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">POSQ Restaurant</h1>
            </div>
            
            {/* Cart Button */}
            {!isCartPage && !isCheckoutPage && !isOrderPage && (
              <div className="flex items-center">
                <button
                  onClick={() => window.location.href = '/cart'}
                  className="relative inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <ShoppingCartIcon className="h-5 w-5 mr-2" />
                  Cart
                  {itemCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-gray-500 text-sm">
            <p>&copy; 2024 POSQ Restaurant. All rights reserved.</p>
            <p className="mt-2">Scan QR code to order • Pay at cashier</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default CustomerLayout