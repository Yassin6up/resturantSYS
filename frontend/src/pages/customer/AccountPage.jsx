import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useCustomerAuth } from '../../contexts/CustomerAuthContext'

function AuthForm() {
  const { login, register } = useCustomerAuth()
  const [mode, setMode] = useState('login')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(phone, password)
      } else {
        await register(phone, name, password)
        toast.success('Account created!')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-10 bg-white rounded-xl shadow p-6">
      <h1 className="text-xl font-bold mb-1">{mode === 'login' ? 'Sign in' : 'Create your account'}</h1>
      <p className="text-sm text-gray-500 mb-4">Track your orders and earn rewards every time you order.</p>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number" className="w-full px-3 py-2 border rounded-lg"
        />
        {mode === 'register' && (
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)" className="w-full px-3 py-2 border rounded-lg"
          />
        )}
        <input
          type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Password" className="w-full px-3 py-2 border rounded-lg"
        />
        <button
          type="submit" disabled={loading}
          className="w-full btn-primary py-2.5 rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <button
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        className="w-full text-sm text-gray-500 mt-3 hover:text-gray-700"
      >
        {mode === 'login' ? "New here? Create an account" : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}

function Profile() {
  const { customer, logout, client } = useCustomerAuth()
  const [tab, setTab] = useState('rewards')
  const [rewards, setRewards] = useState([])
  const [orders, setOrders] = useState([])
  const [ledger, setLedger] = useState([])

  useEffect(() => {
    client.get('/api/customer/rewards').then(r => setRewards(r.data.rewards)).catch(() => {})
    client.get('/api/customer/orders').then(r => setOrders(r.data.orders)).catch(() => {})
    client.get('/api/customer/ledger').then(r => setLedger(r.data.ledger)).catch(() => {})
  }, [])

  return (
    <div className="max-w-lg mx-auto mt-6 px-4 pb-10">
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-xl p-5 mb-4">
        <p className="text-sm opacity-80">{customer.name || customer.phone}</p>
        <p className="text-3xl font-bold mt-1">{customer.points_balance} pts</p>
        <p className="text-xs opacity-70 mt-1">{customer.lifetime_points} earned all-time · {customer.visits} visits</p>
      </div>

      <div className="flex gap-2 mb-4">
        {['rewards', 'orders', 'history'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize ${tab === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'rewards' && (
        <div className="space-y-2">
          {rewards.length === 0 && <p className="text-sm text-gray-500 text-center py-6">No rewards set up yet.</p>}
          {rewards.map(r => (
            <div key={r.id} className={`border rounded-lg p-3 flex justify-between items-center ${r.affordable ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200'}`}>
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-gray-500">{r.points_cost} pts</p>
              </div>
              {r.affordable ? (
                <span className="text-xs font-medium text-emerald-700">Ready to redeem in store</span>
              ) : (
                <span className="text-xs text-gray-400">{r.pointsShort} pts to go</span>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-2">
          {orders.length === 0 && <p className="text-sm text-gray-500 text-center py-6">No orders yet.</p>}
          {orders.map(o => (
            <div key={o.id} className="border rounded-lg p-3 flex justify-between items-center">
              <div>
                <p className="font-medium">{o.order_code}</p>
                <p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString()} · {o.status}</p>
              </div>
              <p className="font-semibold">${Number(o.total).toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-2">
          {ledger.length === 0 && <p className="text-sm text-gray-500 text-center py-6">No points activity yet.</p>}
          {ledger.map(l => (
            <div key={l.id} className="border rounded-lg p-3 flex justify-between items-center">
              <div>
                <p className="text-sm">{l.note}</p>
                <p className="text-xs text-gray-500">{new Date(l.created_at).toLocaleDateString()}</p>
              </div>
              <p className={`font-semibold ${l.points > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {l.points > 0 ? '+' : ''}{l.points}
              </p>
            </div>
          ))}
        </div>
      )}

      <button onClick={logout} className="w-full mt-6 text-sm text-gray-400 hover:text-gray-600">
        Sign out
      </button>
    </div>
  )
}

export default function AccountPage() {
  const { customer, loading } = useCustomerAuth()
  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>
  return customer ? <Profile /> : <AuthForm />
}
