import { useState, useEffect } from 'react';
import { bookingsAPI, servicesAPI } from '../../services/api';
import { CalendarDaysIcon, ClockIcon, CheckCircleIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AppointmentsDashboard() {
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const [bookingsRes, servicesRes] = await Promise.all([
        bookingsAPI.getAll(),
        servicesAPI.getAll(),
      ]);
      setBookings(bookingsRes.data.bookings || []);
      setServices(servicesRes.data.services || []);
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const confirm = async (id) => {
    try {
      await bookingsAPI.updateStatus(id, 'confirmed');
      toast.success('Confirmed');
      load();
    } catch (error) {
      toast.error('Failed to confirm');
    }
  };

  if (loading) return <div className="p-6 text-center text-slate-400">Loading...</div>;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysBookings = bookings.filter(b => b.start_time.slice(0, 10) === todayStr && b.status !== 'cancelled');
  const pending = bookings.filter(b => b.status === 'pending');
  const upcoming = bookings
    .filter(b => new Date(b.start_time) >= new Date() && b.status !== 'cancelled')
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .slice(0, 8);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm">Your bookings at a glance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
            <CalendarDaysIcon className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{todaysBookings.length}</p>
          <p className="text-sm text-slate-500">Appointments today</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
            <ClockIcon className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{pending.length}</p>
          <p className="text-sm text-slate-500">Awaiting confirmation</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
            <Squares2X2Icon className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{services.length}</p>
          <p className="text-sm text-slate-500">Active services</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Upcoming Appointments</h2>
          <Link to="/admin/bookings" className="text-sm text-blue-600 font-medium">View all</Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="p-8 text-center text-slate-400 text-sm">Nothing booked yet - share your store link so customers can book.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {upcoming.map(b => (
              <div key={b.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{b.customer_name} - {b.service_name}</p>
                  <p className="text-sm text-slate-500">{new Date(b.start_time).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${b.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{b.status}</span>
                  {b.status === 'pending' && (
                    <button onClick={() => confirm(b.id)} className="text-xs text-green-600 font-medium flex items-center gap-1 hover:underline">
                      <CheckCircleIcon className="w-4 h-4" /> Confirm
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/admin/services" className="bg-white rounded-2xl border border-slate-200 p-5 text-center hover:border-blue-300">
          <h3 className="font-medium text-slate-900 mb-1">Services</h3>
          <p className="text-sm text-slate-500">What customers can book</p>
        </Link>
        <Link to="/admin/availability" className="bg-white rounded-2xl border border-slate-200 p-5 text-center hover:border-blue-300">
          <h3 className="font-medium text-slate-900 mb-1">Availability</h3>
          <p className="text-sm text-slate-500">Your weekly hours</p>
        </Link>
        <Link to="/admin/whatsapp" className="bg-white rounded-2xl border border-slate-200 p-5 text-center hover:border-blue-300">
          <h3 className="font-medium text-slate-900 mb-1">WhatsApp</h3>
          <p className="text-sm text-slate-500">Message your customers</p>
        </Link>
      </div>
    </div>
  );
}
