import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../../contexts/CartContext'
import { useTheme } from '../../contexts/ThemeContext'
import { ShoppingCartIcon } from '@heroicons/react/24/outline'
import CartBottomBar from '../CartBottomBar'

function CustomerLayout() {
  const location = useLocation()
  const { itemCount, total } = useCart()
  const navigate = useNavigate()
  const { getAppName, getSetting, getWelcomeMessage } = useTheme()

  const isCartPage = location.pathname === '/cart'
  const isCheckoutPage = location.pathname === '/checkout'
  const isOrderPage = location.pathname.startsWith('/order/')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              {getSetting('logo_url') ? (
                <img
                  src={getSetting('logo_url')}
                  alt="Logo"
                  className="w-12 h-12 rounded-xl object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
              ) : null}
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md"
                style={{ 
                  background: `linear-gradient(135deg, ${getSetting('primary_color') || '#3B82F6'} 0%, ${getSetting('secondary_color') || '#1E40AF'} 100%)`,
                  display: getSetting('logo_url') ? 'none' : 'flex'
                }}
              >
                <span className="text-white font-bold text-xl">
                  {getAppName().charAt(0)}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{getAppName()}</h1>
            </div>
            
            {/* Cart Button */}
            {!isCartPage && !isCheckoutPage && !isOrderPage && (
              <div className="flex items-center">
                <button
                  onClick={() => navigate('/cart')}
                  className="relative btn-primary group flex items-center"
                  aria-label="Open cart"
                >
                  <ShoppingCartIcon className="h-5 w-5 mr-2 group-hover:animate-bounce" aria-hidden />
                  <span>Cart</span>
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

      {/* Welcome Section */}
      {location.pathname === '/' || location.pathname === '/menu' ? (
        <div className="bg-white border-b border-gray-200 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {getSetting('header_text') || getWelcomeMessage()}
            </h2>
            <p className="text-gray-600">
              {getSetting('order_instructions') || 'Scan QR code to order • Pay at cashier'}
            </p>
          </div>
        </div>
      ) : null}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-fadeInUp">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex justify-center items-center space-x-3 mb-6">
              {getSetting('logo_url') ? (
                <img
                  src={getSetting('logo_url')}
                  alt="Logo"
                  className="w-10 h-10 rounded-lg object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
              ) : null}
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md"
                style={{ 
                  background: `linear-gradient(135deg, ${getSetting('primary_color') || '#3B82F6'} 0%, ${getSetting('secondary_color') || '#1E40AF'} 100%)`,
                  display: getSetting('logo_url') ? 'none' : 'flex'
                }}
              >
                <span className="text-white font-bold text-lg">
                  {getAppName().charAt(0)}
                </span>
              </div>
              <span className="text-xl font-bold text-gray-900">{getAppName()}</span>
            </div>
            <p className="text-gray-600 mb-2">&copy; 2024 {getAppName()}. All rights reserved.</p>
            <p className="text-sm text-gray-500">{getSetting('order_instructions') || 'Scan QR code to order • Pay at cashier'}</p>
            <p className="text-xs text-gray-400 mt-2">{getSetting('footer_text') || 'Powered by modern technology'}</p>
          </div>
        </div>
      </footer>

      {/* Mobile Cart Bottom Bar */}
      <CartBottomBar />
    </div>
  )
}

export default CustomerLayout