import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { loyaltyAPI } from '../../services/api'

function CustomerDetail({ customerId, onClose, onChanged }) {
  const [detail, setDetail] = useState(null)
  const [adjustPoints, setAdjustPoints] = useState('')
  const [adjustNote, setAdjustNote] = useState('')

  const load = () => loyaltyAPI.getCustomer(customerId).then(r => setDetail(r.data))
  useEffect(() => { load() }, [customerId])

  const submitAdjust = async () => {
    const points = parseInt(adjustPoints, 10)
    if (!points) return toast.error('Enter a non-zero number of points')
    try {
      await loyaltyAPI.adjustPoints(customerId, { points, note: adjustNote || undefined })
      toast.success('Balance updated')
      setAdjustPoints(''); setAdjustNote('')
      load(); onChanged?.()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Adjustment failed')
    }
  }

  if (!detail) return null
  const { customer, ledger, orders } = detail

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-semibold">{customer.name || 'Unnamed'}</h2>
            <p className="text-sm text-gray-500">{customer.phone}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div className="bg-blue-50 rounded-lg p-2"><p className="text-xl font-bold">{customer.points_balance}</p><p className="text-xs text-gray-500">points</p></div>
          <div className="bg-gray-50 rounded-lg p-2"><p className="text-xl font-bold">{customer.visits}</p><p className="text-xs text-gray-500">visits</p></div>
          <div className="bg-gray-50 rounded-lg p-2"><p className="text-xl font-bold">${Number(customer.total_spent).toFixed(0)}</p><p className="text-xs text-gray-500">spent</p></div>
        </div>

        <div className="flex gap-2 mb-4">
          <input type="number" value={adjustPoints} onChange={e => setAdjustPoints(e.target.value)} placeholder="+/- points" className="flex-1 px-2 py-1.5 border rounded text-sm" />
          <input type="text" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} placeholder="Note" className="flex-1 px-2 py-1.5 border rounded text-sm" />
          <button onClick={submitAdjust} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm">Apply</button>
        </div>

        <h3 className="text-sm font-semibold text-gray-500 mb-2">Recent orders</h3>
        <div className="space-y-1 mb-4">
          {orders.length === 0 && <p className="text-sm text-gray-400">No orders yet</p>}
          {orders.map(o => (
            <div key={o.id} className="flex justify-between text-sm py-1 border-b">
              <span>{o.order_code} · {o.status}</span>
              <span>${Number(o.total).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <h3 className="text-sm font-semibold text-gray-500 mb-2">Points history</h3>
        <div className="space-y-1">
          {ledger.map(l => (
            <div key={l.id} className="flex justify-between text-sm py-1 border-b">
              <span>{l.note}</span>
              <span className={l.points > 0 ? 'text-emerald-600' : 'text-red-500'}>{l.points > 0 ? '+' : ''}{l.points}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CustomersTab() {
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  const load = () => loyaltyAPI.getCustomers({ search: search || undefined }).then(r => setCustomers(r.data.customers))
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [search])

  return (
    <div>
      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or phone..."
        className="w-full px-3 py-2 border rounded-lg mb-4"
      />
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr><th className="p-3">Name</th><th className="p-3">Phone</th><th className="p-3">Points</th><th className="p-3">Visits</th><th className="p-3">Spent</th></tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id} onClick={() => setSelected(c.id)} className="border-t hover:bg-blue-50 cursor-pointer">
                <td className="p-3">{c.name || '—'}</td>
                <td className="p-3">{c.phone}</td>
                <td className="p-3 font-medium">{c.points_balance}</td>
                <td className="p-3">{c.visits}</td>
                <td className="p-3">${Number(c.total_spent).toFixed(2)}</td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-gray-400">No customers yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {selected && <CustomerDetail customerId={selected} onClose={() => setSelected(null)} onChanged={load} />}
    </div>
  )
}

function RewardsTab() {
  const [rewards, setRewards] = useState([])
  const [settings, setSettings] = useState(null)
  const [form, setForm] = useState({ name: '', type: 'amount_off', value: '', pointsCost: '' })

  const load = () => {
    loyaltyAPI.getRewards().then(r => setRewards(r.data.rewards))
    loyaltyAPI.getSettings().then(r => setSettings(r.data.settings))
  }
  useEffect(() => { load() }, [])

  const createReward = async (e) => {
    e.preventDefault()
    try {
      await loyaltyAPI.createReward({
        name: form.name, type: form.type,
        value: form.type === 'free_item' ? 0 : parseFloat(form.value || 0),
        pointsCost: parseInt(form.pointsCost, 10)
      })
      toast.success('Reward created')
      setForm({ name: '', type: 'amount_off', value: '', pointsCost: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not create reward')
    }
  }

  const toggleActive = async (r) => {
    await loyaltyAPI.updateReward(r.id, { active: !r.active })
    load()
  }

  const saveSettings = async () => {
    try {
      await loyaltyAPI.updateSettings({
        enabled: settings.enabled,
        amountPerPoint: parseFloat(settings.amount_per_point),
        welcomeBonus: parseInt(settings.welcome_bonus || 0, 10)
      })
      toast.success('Loyalty settings saved')
    } catch {
      toast.error('Could not save settings')
    }
  }

  if (!settings) return null

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold mb-3">Program settings</h3>
        <div className="flex items-center gap-3 mb-3">
          <input type="checkbox" checked={settings.enabled} onChange={e => setSettings({ ...settings, enabled: e.target.checked })} />
          <span className="text-sm">Loyalty program enabled</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="text-sm">
            Currency units per point
            <input type="number" value={settings.amount_per_point} onChange={e => setSettings({ ...settings, amount_per_point: e.target.value })} className="w-full mt-1 px-2 py-1.5 border rounded" />
          </label>
          <label className="text-sm">
            Welcome bonus (points)
            <input type="number" value={settings.welcome_bonus || 0} onChange={e => setSettings({ ...settings, welcome_bonus: e.target.value })} className="w-full mt-1 px-2 py-1.5 border rounded" />
          </label>
        </div>
        <button onClick={saveSettings} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Save settings</button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold mb-3">Rewards catalog</h3>
        <form onSubmit={createReward} className="grid grid-cols-4 gap-2 mb-4">
          <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" className="px-2 py-1.5 border rounded text-sm col-span-2" />
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="px-2 py-1.5 border rounded text-sm">
            <option value="amount_off">Amount off</option>
            <option value="percent_off">Percent off</option>
            <option value="free_item">Free item</option>
          </select>
          <input required type="number" value={form.pointsCost} onChange={e => setForm({ ...form, pointsCost: e.target.value })} placeholder="Points cost" className="px-2 py-1.5 border rounded text-sm" />
          {form.type !== 'free_item' && (
            <input required type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder={form.type === 'percent_off' ? '% off' : 'Amount off'} className="px-2 py-1.5 border rounded text-sm col-span-2" />
          )}
          <button type="submit" className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm">Add reward</button>
        </form>

        <div className="space-y-2">
          {rewards.map(r => (
            <div key={r.id} className="flex justify-between items-center border rounded-lg p-3">
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-gray-500">{r.points_cost} pts · redeemed {r.redeemed_count}x</p>
              </div>
              <button onClick={() => toggleActive(r)} className={`text-xs px-2 py-1 rounded ${r.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {r.active ? 'Active' : 'Disabled'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CustomersPage() {
  const [tab, setTab] = useState('customers')
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Customers & Loyalty</h1>
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('customers')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'customers' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Customers</button>
        <button onClick={() => setTab('rewards')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'rewards' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Rewards & Settings</button>
      </div>
      {tab === 'customers' ? <CustomersTab /> : <RewardsTab />}
    </div>
  )
}
