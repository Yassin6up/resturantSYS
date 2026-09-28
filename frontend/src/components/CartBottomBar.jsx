import { Link, useLocation } from 'react-router-dom'
import { ShoppingBag, ArrowRight } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useTenant } from '../contexts/TenantContext'
import { useTheme } from '../contexts/ThemeContext'
export default function CartBottomBar() {
 const { items, total, itemCount } = useCart()
 const location = useLocation()
 const tenant = useTenant()
 const { getCurrency } = useTheme()
 if (!items.length || ['appointments','hotel','office'].includes(tenant.businessType) || /cart|checkout|order|reservations/.test(location.pathname)) return null
 return <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden"><Link to={`/cart${location.search}`} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-900 px-5 py-4 text-white shadow-xl"><span className="flex items-center gap-3"><ShoppingBag size={21}/><span>{itemCount} items · {Number(total).toFixed(2)} {getCurrency()}</span></span><ArrowRight size={20}/></Link></div>
}
