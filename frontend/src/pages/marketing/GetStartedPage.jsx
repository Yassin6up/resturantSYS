import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { UtensilsCrossed, ShoppingBag, CalendarCheck, Building2, Briefcase, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant / Cafe', desc: 'QR menu, table ordering, kitchen display', icon: UtensilsCrossed },
  { value: 'ecommerce', label: 'Online Store', desc: 'Sell products with a cart and checkout', icon: ShoppingBag },
  { value: 'appointments', label: 'Appointments', desc: 'Clinics, salons, or any service you book by the slot', icon: CalendarCheck },
  { value: 'hotel', label: 'Hotel', desc: 'Room bookings by date and time slot', icon: Building2 },
  { value: 'office', label: 'Office / Coworking', desc: 'Desk or meeting-room bookings', icon: Briefcase },
];

export default function GetStartedPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    businessType: '',
    storeName: '',
    fullName: '',
    email: '',
    username: '',
    password: '',
  });

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const next = () => {
    if (step === 1 && !form.businessType) { toast.error('Pick what kind of business you run'); return; }
    if (step === 2 && !form.storeName) { toast.error('Give your store a name'); return; }
    setStep(s => s + 1);
  };
  const back = () => setStep(s => Math.max(1, s - 1));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.username || !form.password) {
      toast.error('Fill in your name, username, and password');
      return;
    }
    try {
      setSubmitting(true);
      const { data } = await authAPI.register(form);
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      toast.success(`${data.store.name} is ready!`);
      window.location.href = '/admin';
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not create your account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Link to="/" className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map(n => (
              <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? 'bg-blue-600' : 'bg-slate-200'}`} />
            ))}
          </div>

          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">What are you setting up?</h1>
              <p className="text-slate-500 mb-6">Pick the kind of business you're building — you'll get the right tools for it.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {BUSINESS_TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => update('businessType', t.value)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${form.businessType === t.value ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <t.icon className={`w-6 h-6 mb-2 ${form.businessType === t.value ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div className="font-semibold text-slate-900">{t.label}</div>
                    <div className="text-sm text-slate-500">{t.desc}</div>
                  </button>
                ))}
              </div>
              <button onClick={next} className="mt-8 w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-medium py-3 rounded-xl hover:bg-blue-700">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Name your store</h1>
              <p className="text-slate-500 mb-6">This becomes your subdomain and shows to customers.</p>
              <input autoFocus required placeholder="e.g., Bella Vista Cafe" value={form.storeName}
                onChange={e => update('storeName', e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              <input placeholder="Contact email (optional)" type="email" value={form.email}
                onChange={e => update('email', e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl mt-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              <div className="flex gap-3 mt-8">
                <button onClick={back} className="flex-1 flex items-center justify-center gap-2 border border-slate-200 text-slate-700 font-medium py-3 rounded-xl hover:bg-slate-50">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={next} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-medium py-3 rounded-xl hover:bg-blue-700">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={submit}>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Create your account</h1>
              <p className="text-slate-500 mb-6">This is how you'll log in and manage {form.storeName || 'your store'}.</p>
              <div className="space-y-3">
                <input required placeholder="Full name" value={form.fullName}
                  onChange={e => update('fullName', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl" />
                <input required placeholder="Username" value={form.username}
                  onChange={e => update('username', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl" />
                <input required type="password" placeholder="Password (min. 6 characters)" value={form.password}
                  onChange={e => update('password', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl" />
              </div>
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={back} className="flex-1 flex items-center justify-center gap-2 border border-slate-200 text-slate-700 font-medium py-3 rounded-xl hover:bg-slate-50">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-medium py-3 rounded-xl hover:bg-green-700 disabled:opacity-50">
                  <Check className="w-4 h-4" /> {submitting ? 'Creating...' : 'Create my store'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
