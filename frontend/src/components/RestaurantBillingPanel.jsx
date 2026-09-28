import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { billingAPI } from '../services/api'

const STATUS_LABEL = {
  trialing: { text: 'Trial active', color: 'bg-blue-100 text-blue-700' },
  active: { text: 'Active', color: 'bg-emerald-100 text-emerald-700' },
  past_due: { text: 'Payment overdue', color: 'bg-amber-100 text-amber-700' },
  canceled: { text: 'Cancelled', color: 'bg-gray-100 text-gray-600' }
}

export default function RestaurantBillingPanel() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [openingPortal, setOpeningPortal] = useState(false)

  useEffect(() => {
    billingAPI.getMyStatus()
      .then(r => setStatus(r.data))
      .catch(() => toast.error('Could not load billing status'))
      .finally(() => setLoading(false))
  }, [])

  const openPortal = async () => {
    setOpeningPortal(true)
    try {
      const { data } = await billingAPI.getMyPortal()
      window.open(data.url, '_blank')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Billing portal is not available yet')
    } finally {
      setOpeningPortal(false)
    }
  }

  if (loading) return <p className="text-gray-500 text-center py-8">Loading billing info...</p>

  const label = STATUS_LABEL[status?.subscriptionStatus] || { text: 'No subscription', color: 'bg-gray-100 text-gray-600' }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-xl font-semibold text-gray-900">Billing</h2>
        <p className="text-gray-600">Your subscription to this platform</p>
      </div>
      <div className="card-body space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-2 ${label.color}`}>
              {label.text}
            </span>
            <p className="text-sm text-gray-600">{status?.planName || 'No plan assigned yet'}</p>
          </div>
          {status?.price && (
            <p className="text-2xl font-bold text-gray-900">
              {status.price.amount} {status.price.currency}
              <span className="text-sm font-normal text-gray-500">/mo</span>
            </p>
          )}
        </div>

        {status?.subscriptionStatus === 'past_due' && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
            Your last payment didn't go through. Please update your payment method to avoid your restaurant
            being suspended.
          </div>
        )}

        {status?.trialEndsAt && (
          <p className="text-sm text-gray-500">Trial ends {new Date(status.trialEndsAt).toLocaleDateString()}</p>
        )}
        {status?.currentPeriodEnd && (
          <p className="text-sm text-gray-500">Current period ends {new Date(status.currentPeriodEnd).toLocaleDateString()}</p>
        )}

        <button
          onClick={openPortal}
          disabled={openingPortal}
          className="btn-primary rounded-lg px-4 py-2 disabled:opacity-50"
        >
          {openingPortal ? 'Opening...' : 'Manage billing & payment method'}
        </button>
        <p className="text-xs text-gray-400">Opens Stripe's secure billing portal to update your card, view invoices, or cancel.</p>
      </div>
    </div>
  )
}
