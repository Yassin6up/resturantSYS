import { useState, useEffect } from 'react';
import { bookingsAPI } from '../../services/api';
import { Phone, Mail, Clock, Check, X as XIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await bookingsAPI.getAll();
      setBookings(data.bookings || []);
    } catch (error) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const setStatus = async (id, status) => {
    try {
      await bookingsAPI.updateStatus(id, status);
      toast.success(`Booking ${status}`);
      load();
    } catch (error) {
      toast.error('Failed to update booking');
    }
  };

  const visible = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
        <p className="text-slate-500 text-sm">Appointments customers have requested</p>
      </div>

      <div className="flex gap-2 mb-4">
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${filter === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">No bookings here yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(b => (
            <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-4 flex justify-between items-center flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{b.customer_name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[b.status] || ''}`}>{b.status}</span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{b.service_name}</p>
                <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {new Date(b.start_time).toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {b.customer_phone}</span>
                  {b.customer_email && <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {b.customer_email}</span>}
                </div>
                {b.notes && <p className="text-sm text-slate-500 mt-1 italic">"{b.notes}"</p>}
              </div>
              <div className="flex gap-2">
                {b.status === 'pending' && (
                  <button onClick={() => setStatus(b.id, 'confirmed')} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                    <Check className="w-4 h-4" /> Confirm
                  </button>
                )}
                {(b.status === 'pending' || b.status === 'confirmed') && (
                  <button onClick={() => setStatus(b.id, 'completed')} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                    <Check className="w-4 h-4" /> Complete
                  </button>
                )}
                {b.status !== 'cancelled' && b.status !== 'completed' && (
                  <button onClick={() => setStatus(b.id, 'cancelled')} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-red-100 hover:text-red-600">
                    <XIcon className="w-4 h-4" /> Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
