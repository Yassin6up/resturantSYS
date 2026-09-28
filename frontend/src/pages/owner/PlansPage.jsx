import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaPlus } from 'react-icons/fa';
import { billingAPI } from '../../services/api';

export default function PlansPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', basePrice: '', currency: 'usd', interval: 'month' });
  const [saving, setSaving] = useState(false);

  const load = () => billingAPI.getPlans().then(r => setPlans(r.data.plans)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const createPlan = async (e) => {
    e.preventDefault();
    if (!form.name || !form.basePrice) return toast.error('Name and price are required');
    setSaving(true);
    try {
      await billingAPI.createPlan({
        name: form.name,
        basePriceCents: Math.round(parseFloat(form.basePrice) * 100),
        currency: form.currency,
        interval: form.interval
      });
      toast.success('Plan created');
      setForm({ name: '', basePrice: '', currency: 'usd', interval: 'month' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create plan');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (plan) => {
    await billingAPI.updatePlan(plan.id, { active: !plan.active });
    load();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate('/owner')} className="flex items-center gap-2 text-gray-300 hover:text-white mb-6">
          <FaArrowLeft /> Back to dashboard
        </button>

        <h1 className="text-3xl font-bold text-white mb-2">Subscription Plans</h1>
        <p className="text-gray-400 mb-8">Base prices restaurants are offered - you can still override the price per restaurant individually.</p>

        <form onSubmit={createPlan} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-8">
          <h3 className="text-white font-semibold mb-4">New plan</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              placeholder="Plan name (e.g. Standard)"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
            />
            <input
              type="number" step="0.01"
              placeholder="Price (e.g. 49.00)"
              value={form.basePrice}
              onChange={e => setForm({ ...form, basePrice: e.target.value })}
              className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
            />
            <select
              value={form.currency}
              onChange={e => setForm({ ...form, currency: e.target.value })}
              className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
            >
              <option value="usd">USD</option>
              <option value="eur">EUR</option>
              <option value="gbp">GBP</option>
              <option value="mad">MAD (check Stripe support first)</option>
            </select>
            <select
              value={form.interval}
              onChange={e => setForm({ ...form, interval: e.target.value })}
              className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
            >
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50"
          >
            <FaPlus /> {saving ? 'Creating...' : 'Create plan'}
          </button>
        </form>

        <div className="space-y-3">
          {loading && <p className="text-gray-400 text-center">Loading...</p>}
          {!loading && plans.length === 0 && (
            <p className="text-gray-400 text-center py-8">No plans yet - create one above.</p>
          )}
          {plans.map(plan => (
            <div key={plan.id} className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">{plan.name}</p>
                <p className="text-gray-400 text-sm">
                  {(plan.base_price_cents / 100).toFixed(2)} {plan.currency.toUpperCase()} / {plan.interval}
                </p>
              </div>
              <button
                onClick={() => toggleActive(plan)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full ${plan.active ? 'bg-emerald-600/30 text-emerald-300' : 'bg-gray-600/30 text-gray-400'}`}
              >
                {plan.active ? 'Active' : 'Disabled'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
