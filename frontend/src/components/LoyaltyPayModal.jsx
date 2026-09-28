import { useState } from 'react'
import toast from 'react-hot-toast'
import { loyaltyAPI } from '../services/api'

// POS "who's paying?" step: cashier enters the customer's phone to look up
// or create a loyalty account and optionally apply a reward, or skips
// straight to payment. Resolves via onDone({ customer, reward } | null).
export default function LoyaltyPayModal({ onDone, onClose }) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [customer, setCustomer] = useState(null)
  const [rewards, setRewards] = useState([])
  const [notFound, setNotFound] = useState(false)
  const [name, setName] = useState('')

  const lookup = async () => {
    if (!phone.trim()) return
    setLoading(true)
    setNotFound(false)
    try {
      const { data } = await loyaltyAPI.lookup(phone.trim())
      if (data.found) {
        setCustomer(data.customer)
        setRewards(data.affordableRewards || [])
      } else {
        setNotFound(true)
        setCustomer(null)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Lookup failed')
    } finally {
      setLoading(false)
    }
  }

  const createMember = async () => {
    setLoading(true)
    try {
      const { data } = await loyaltyAPI.createCustomer({ phone: phone.trim(), name: name.trim() || undefined })
      toast.success('Loyalty member created')
      setCustomer(data.customer)
      setRewards([])
      setNotFound(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not create member')
    } finally {
      setLoading(false)
    }
  }

  const confirmWithReward = (reward) => {
    onDone({ customer, reward: reward || null })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <h3 className="text-lg font-semibold mb-1">Loyalty customer?</h3>
        <p className="text-sm text-gray-500 mb-4">Enter the customer's phone number to check points, or skip.</p>

        {!customer && (
          <>
            <input
              type="tel"
              autoFocus
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setNotFound(false) }}
              onKeyDown={(e) => e.key === 'Enter' && lookup()}
              placeholder="+212 6XX XXX XXX"
              className="w-full px-3 py-3 border rounded-lg text-lg text-center tracking-wide mb-3"
            />

            {notFound && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 space-y-2">
                <p className="text-sm text-amber-800">No account with this number yet.</p>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name (optional)"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <button
                  onClick={createMember}
                  disabled={loading}
                  className="w-full bg-emerald-600 text-white py-2 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  Create member
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={lookup}
                disabled={loading || !phone.trim()}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Checking...' : 'Look up'}
              </button>
              <button
                onClick={() => onDone(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200"
              >
                Skip
              </button>
            </div>
          </>
        )}

        {customer && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
              <p className="font-medium">{customer.name || customer.phone}</p>
              <p className="text-sm text-gray-600">{customer.points_balance} points available</p>
            </div>

            {rewards.length > 0 ? (
              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {rewards.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => confirmWithReward(r)}
                    className="w-full text-left px-3 py-2 border rounded-lg hover:bg-blue-50 flex justify-between items-center"
                  >
                    <span>{r.name}</span>
                    <span className="text-xs text-gray-500">{r.points_cost} pts</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-3">No rewards available yet for this balance.</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => confirmWithReward(null)}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700"
              >
                Continue without reward
              </button>
              <button
                onClick={() => { setCustomer(null); setPhone(''); }}
                className="px-3 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                title="Wrong number - re-enter"
              >
                Back
              </button>
            </div>
          </>
        )}

        <button onClick={onClose} className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600">
          Cancel
        </button>
      </div>
    </div>
  )
}
