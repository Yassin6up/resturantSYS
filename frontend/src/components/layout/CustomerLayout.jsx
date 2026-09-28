import { Link, Outlet, useLocation } from 'react-router-dom'
import { ShoppingBag, CalendarDays, UserRound } from 'lucide-react'
import { useTenant } from '../../contexts/TenantContext'
import { useCart } from '../../contexts/CartContext'
import { useTheme } from '../../contexts/ThemeContext'
import CartBottomBar from '../CartBottomBar'
export default function CustomerLayout() {
 const tenant = useTenant()
 const { itemCount } = useCart()
 const { getAppName } = useTheme()
 const location = useLocation()
 const booking = ['appointments','hotel','office'].includes(tenant.businessType)
 const name = tenant.name || getAppName()
 const customTheme = tenant.settings?.custom_theme?.active ? tenant.settings.custom_theme : null
 const themeStyle = customTheme?.active === false ? {} : {
  '--theme-primary': customTheme?.colors?.primary || '#263f32',
  '--theme-secondary': customTheme?.colors?.secondary || '#eaece4',
  '--theme-accent': customTheme?.colors?.accent || '#9b6b32',
  '--theme-background': customTheme?.colors?.background || '#faf9f6',
  '--theme-text': customTheme?.colors?.text || '#202925'
 }
 const query = location.search
 if (location.pathname === '/' && !tenant.loading && !tenant.found) return <Outlet />
 return <div className="customer-site" style={themeStyle} data-uploaded-theme={customTheme?.active !== false ? customTheme?.id : undefined}>
  <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-white p-3">Skip to content</a>
  <header className="store-header"><div className="store-header-inner"><Link to={`/${query}`} className="store-brand">{(customTheme?.logoUrl || tenant.logoUrl) ? <img src={customTheme?.logoUrl || tenant.logoUrl} alt=""/> : <span className="store-monogram">{name.charAt(0)}</span>}<span>{name}</span></Link>
    <nav aria-label="Main navigation" className="flex items-center gap-2 sm:gap-5">
     {!booking && <Link to={`/${query}`} className="hidden sm:block text-sm">{tenant.businessType === 'ecommerce' ? 'Collection' : 'Menu'}</Link>}
     {tenant.businessType === 'restaurant' && <Link to={`/reservations${query}`} className="store-nav-action"><CalendarDays size={18}/><span className="hidden sm:inline">Reserve a table</span></Link>}
     <Link aria-label="Your account" to={`/account${query}`} className="store-nav-action"><UserRound size={19}/></Link>
     {!booking && <Link to={`/cart${query}`} className="store-nav-action"><ShoppingBag size={19}/><span>({itemCount})</span></Link>}
    </nav></div></header>
  <main id="main-content" className="store-main"><Outlet /></main>
  <footer className="store-footer"><Link to={`/${query}`} className="font-semibold">{name}</Link><p>© {new Date().getFullYear()} {name}</p><Link to={`/order-status${query}`}>{booking ? '' : 'Track an order'}</Link></footer>
  <CartBottomBar />
 </div>
}
