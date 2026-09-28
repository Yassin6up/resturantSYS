import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, ArrowLeft, ShoppingBag, MapPin, CreditCard } from 'lucide-react'
import { useCart } from '../../contexts/CartContext'
import { useTenant } from '../../contexts/TenantContext'
import { useTheme } from '../../contexts/ThemeContext'
import { ordersAPI } from '../../services/api'

export default function CheckoutPage() {
  const { items, total, branchId, tableNumber, clearCart } = useCart()
  const tenant = useTenant()
  const { getCurrency } = useTheme()
  const [params] = useSearchParams()
  const table = params.get('table') && params.get('table') !== 'null' ? params.get('table') : tableNumber
  const [fulfillment, setFulfillment] = useState(table && tenant.businessType !== 'ecommerce' ? 'DINE_IN' : 'TAKEAWAY')
  const [form, setForm] = useState({ name: '', phone: '', address: '' })
  const [order, setOrder] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const query = params.toString() ? `?${params}` : ''
  const currency = getCurrency()
  const money = n => `${Number(n).toFixed(2)} ${currency}`
  const submit = async e => {
    e.preventDefault()
    if (busy || order) return
    setError(''); setBusy(true)
    try {
      const { data } = await ordersAPI.createOrder({
        branchId: tenant.id || branchId || Number(params.get('branch')),
        tableNumber: fulfillment === 'DINE_IN' ? table : null,
        orderType: fulfillment, customerName: form.name.trim(), customerPhone: form.phone.trim(),
        deliveryAddress: fulfillment === 'DELIVERY' ? form.address.trim() : null,
        paymentMethod: 'cash',
        items: items.map(item => ({ menuItemId: item.menuItemId, quantity: item.quantity,
          variantId: item.variantId, modifiers: item.modifiers?.map(m => m.id) || [], note: item.note || '' }))
      })
      setOrder(data)
      clearCart()
    } catch (err) {
      setError(err.response?.data?.error || 'We could not place your order. Please try again.')
    } finally { setBusy(false) }
  }
  if (order) return <section className="flow-panel mx-auto max-w-xl text-center" aria-live="polite">
    <CheckCircle className="mx-auto mb-5 h-14 w-14 text-emerald-700" />
    <p className="eyebrow">ORDER RECEIVED</p><h1 className="flow-title">Thank you, {form.name}.</h1>
    <p className="mt-4 text-slate-600">Your order is awaiting confirmation. Payment is due {fulfillment === 'DELIVERY' ? 'on delivery' : 'at collection or the counter'}.</p>
    <div className="my-6 rounded-2xl bg-stone-50 p-5 text-left space-y-3">
      <p>Order <strong className="float-right">{order.orderCode}</strong></p>
      <p>Total <strong className="float-right">{money(order.total)}</strong></p>
      <p>Tracking PIN <strong className="float-right">{order.pin}</strong></p>
    </div>
    <Link className="flow-primary w-full" to={`/order-status?pin=${order.pin}${tenant.id ? `&branch=${tenant.id}` : ''}`}>Track your order</Link>
    <Link className="mt-4 block text-sm underline" to={`/${query}`}>Continue browsing</Link>
  </section>
  if (!items.length) return <section className="flow-panel text-center max-w-xl mx-auto"><ShoppingBag className="mx-auto h-12 w-12 mb-4" /><h1 className="flow-title">Your basket is empty</h1><Link className="flow-primary mt-6" to={`/${query}`}>Explore the collection</Link></section>
  return <div className="commerce-flow">
    <Link className="inline-flex items-center gap-2 text-sm text-slate-600 mb-8" to={`/cart${query}`}><ArrowLeft size={16} /> Back to basket</Link>
    <p className="eyebrow">THE LAST LITTLE STEP</p><h1 className="flow-title mb-8">Make it yours.</h1>
    <form onSubmit={submit} className="grid lg:grid-cols-[1.3fr_1fr] gap-8 items-start">
      <div className="space-y-6">
        <section className="flow-panel"><h2 className="text-xl font-semibold mb-5">01 / Your details</h2>
          <label className="flow-label" htmlFor="checkout-name">Full name</label><input id="checkout-name" className="flow-input" autoComplete="name" required maxLength={100} value={form.name} onChange={e => setForm({...form, name:e.target.value})} />
          <label className="flow-label mt-4" htmlFor="checkout-phone">Phone number</label><input id="checkout-phone" className="flow-input" type="tel" autoComplete="tel" required maxLength={30} value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} />
        </section>
        <section className="flow-panel"><h2 className="text-xl font-semibold mb-5">02 / How would you like it?</h2>
          <div className="flex flex-wrap gap-3">{[['TAKEAWAY','Collect in person'],['DELIVERY','Delivery'],...(table && tenant.businessType !== 'ecommerce' ? [['DINE_IN',`Table ${table}`]] : [])].map(([value,label]) => <button type="button" key={value} aria-pressed={fulfillment === value} onClick={() => setFulfillment(value)} className={`flow-choice ${fulfillment === value ? 'is-selected' : ''}`}>{label}</button>)}</div>
          {fulfillment === 'DELIVERY' && <div className="mt-5"><label className="flow-label" htmlFor="checkout-address"><MapPin size={16} className="inline mr-1" /> Full delivery address</label><textarea id="checkout-address" className="flow-input" autoComplete="street-address" required rows={3} maxLength={1000} value={form.address} onChange={e => setForm({...form,address:e.target.value})} /><p className="text-sm text-slate-500 mt-2">The store will confirm delivery availability and timing with you.</p></div>}
        </section>
        <section className="flow-panel"><h2 className="text-xl font-semibold mb-4">03 / Payment</h2><p className="flex gap-3 items-center"><CreditCard size={20} /> Pay {fulfillment === 'DELIVERY' ? 'on delivery' : 'in person'}</p><p className="text-sm text-slate-500 mt-2">No online charge is made when you place this order.</p></section>
      </div>
      <aside className="flow-panel lg:sticky lg:top-28"><h2 className="text-xl font-semibold mb-6">Your order</h2>
        <ul className="divide-y divide-stone-100">{items.map(item => <li key={item.id} className="py-4 flex justify-between gap-4"><div><p className="font-medium">{item.quantity} × {item.name}</p>{item.variantName && <p className="text-sm text-slate-500">{item.variantName}</p>}{item.note && <p className="text-sm text-slate-500">{item.note}</p>}</div><span className="whitespace-nowrap">{money(item.total)}</span></li>)}</ul>
        <div className="border-t pt-5 mt-4 flex justify-between font-semibold text-lg"><span>Items subtotal</span><span>{money(total)}</span></div>
        <p className="text-sm text-slate-500 mt-3">Applicable tax{fulfillment === 'DINE_IN' ? ' and table service' : ''} is calculated by the store. The final total appears in your confirmation.</p>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
        <button className="flow-primary w-full mt-6" disabled={busy}>{busy ? 'Placing your order…' : 'Place order'}</button>
      </aside>
    </form>
  </div>
}
