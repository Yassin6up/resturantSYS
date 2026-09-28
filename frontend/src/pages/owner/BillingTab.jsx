import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { billingAPI } from '../../services/api';

const STATUS_COLOR = {
  trialing: 'bg-blue-100 text-blue-700',
  active: 'bg-emerald-100 text-emerald-700',
  past_due: 'bg-amber-100 text-amber-700',
  canceled: 'bg-gray-100 text-gray-600',
  incomplete: 'bg-red-100 text-red-700'
};

export default function BillingTab({ restaurantId }) {
  const [billing, setBilling] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customAmount, setCustomAmount] = useState('');
  const [applyNow, setApplyNow] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');

  const load = async () => {
    try {
      const [billingRes, plansRes] = await Promise.all([
        billingAPI.getRestaurantBilling(restaurantId),
        billingAPI.getPlans()
      ]);
      setBilling(billingRes.data);
      setPlans(plansRes.data.plans);
    } catch (err) {
      toast.error('Failed to load billing info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [restaurantId]);

  const handleAssignPlan = async (planId) => {
    try {
      await billingAPI.assignPlan(restaurantId, planId);
      toast.success('Plan assigned');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign plan');
    }
  };

  const handleSetPrice = async () => {
    const cents = Math.round(parseFloat(customAmount) * 100);
    if (!cents || cents < 0) return toast.error('Enter a valid amount');
    try {
      await billingAPI.setPrice(restaurantId, cents, applyNow);
      toast.success('Price updated');
      setCustomAmount('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update price');
    }
  };

  const handleGenerateCheckout = async () => {
    try {
      const { data } = await billingAPI.getCheckoutLink(restaurantId, {});
      setCheckoutUrl(data.url);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate checkout link');
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this subscription at the end of the current billing period?')) return;
    try {
      await billingAPI.cancelSubscription(restaurantId, true);
      toast.success('Subscription will cancel at period end');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel subscription');
    }
  };

  if (loading) return <p className="text-slate-500 text-center py-8">Loading billing info...</p>;
  if (!billing) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">Subscription status</p>
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${STATUS_COLOR[billing.subscriptionStatus] || 'bg-slate-100 text-slate-600'}`}>
            {billing.subscriptionStatus || 'No subscription'}
          </span>
        </div>
        {billing.price && (
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">
              {billing.price.amount} {billing.price.currency}
              <span className="text-sm font-normal text-slate-500">/mo</span>
            </p>
            {billing.isCustomPrice && <p className="text-xs text-amber-600">Custom price</p>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-slate-500">Plan</p>
          <p className="font-medium text-slate-900">{billing.plan?.name || 'None assigned'}</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-slate-500">Current period ends</p>
          <p className="font-medium text-slate-900">
            {billing.currentPeriodEnd ? new Date(billing.currentPeriodEnd).toLocaleDateString() : '—'}
          </p>
        </div>
      </div>

      <div className="border rounded-xl p-4">
        <h4 className="font-semibold text-slate-900 mb-3">Plan & pricing</h4>
        <div className="flex gap-2 mb-3">
          <select
            className="flex-1 px-3 py-2 border rounded-lg text-sm"
            value={billing.plan?.id || ''}
            onChange={e => handleAssignPlan(Number(e.target.value))}
          >
            <option value="" disabled>Select a plan...</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.name} — {(p.base_price_cents / 100).toFixed(2)} {p.currency.toUpperCase()}/{p.interval}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 items-center mb-2">
          <input
            type="number"
            step="0.01"
            placeholder="Override price (e.g. 25.00)"
            value={customAmount}
            onChange={e => setCustomAmount(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg text-sm"
          />
          <label className="flex items-center gap-1.5 text-sm text-slate-600 whitespace-nowrap">
            <input type="checkbox" checked={applyNow} onChange={e => setApplyNow(e.target.checked)} />
            Apply now (prorated)
          </label>
          <button onClick={handleSetPrice} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Set price
          </button>
        </div>
        <p className="text-xs text-slate-400">Unchecked applies from the next billing cycle instead.</p>
      </div>

      <div className="border rounded-xl p-4">
        <h4 className="font-semibold text-slate-900 mb-3">Subscription actions</h4>
        {!billing.hasActiveSubscription ? (
          <div>
            <button onClick={handleGenerateCheckout} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
              Generate checkout link
            </button>
            {checkoutUrl && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg flex items-center gap-2">
                <input readOnly value={checkoutUrl} className="flex-1 bg-transparent text-xs text-slate-600 outline-none" />
                <button
                  onClick={() => { navigator.clipboard.writeText(checkoutUrl); toast.success('Copied'); }}
                  className="text-xs text-blue-600 font-medium"
                >
                  Copy
                </button>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-2">Send this link to the restaurant to start their subscription (14-day trial included).</p>
          </div>
        ) : (
          <button onClick={handleCancel} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100">
            Cancel subscription
          </button>
        )}
      </div>

      <div className="border rounded-xl p-4">
        <h4 className="font-semibold text-slate-900 mb-3">Invoice history</h4>
        {billing.invoices.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No invoices yet</p>
        ) : (
          <div className="space-y-2">
            {billing.invoices.map(inv => (
              <div key={inv.id} className="flex justify-between items-center text-sm py-1.5 border-b last:border-0">
                <span className="text-slate-600">{new Date(inv.created_at).toLocaleDateString()}</span>
                <span className="font-medium">{inv.display.amount} {inv.display.currency}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {inv.status}
                </span>
                {inv.hosted_invoice_url && (
                  <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer" className="text-blue-600 text-xs">View</a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
