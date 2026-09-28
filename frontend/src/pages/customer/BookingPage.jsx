import { useState, useEffect } from 'react';
import { servicesAPI, bookingsAPI } from '../../services/api';
import { useTenant } from '../../contexts/TenantContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Calendar, Check } from 'lucide-react';
import toast from 'react-hot-toast';

import BookingDefaultTemplate from './templates/booking/BookingDefaultTemplate';
import BookingCalmTemplate from './templates/booking/BookingCalmTemplate';
import BookingProfessionalTemplate from './templates/booking/BookingProfessionalTemplate';

const BOOKING_TEMPLATES = {
  default: BookingDefaultTemplate,
  calm: BookingCalmTemplate,
  professional: BookingProfessionalTemplate,
};

export default function BookingPage({ storeName }) {
  const { getSetting } = useTheme();
  const tenant = useTenant();
  const bookingTemplate = (tenant.settings?.custom_theme?.active ? tenant.settings.custom_theme.template : null) || tenant.settings?.booking_template || getSetting('booking_template') || 'default';
  const [timeZone, setTimeZone] = useState('');
  const [slotError, setSlotError] = useState('');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState([]);
  const [closedReason, setClosedReason] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form, setForm] = useState({ customerName: '', customerPhone: '', customerEmail: '', notes: '' });
  const [confirmed, setConfirmed] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    servicesAPI.getPublic()
      .then(({ data }) => setServices(data.services || []))
      .catch(() => toast.error('Failed to load services'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedService || !date) return;
    let current = true;
    setSlots([]); setSlotError('');
    setSelectedSlot(null);
    setClosedReason(null);
    setLoadingSlots(true);
    bookingsAPI.getAvailability(selectedService.id, date)
      .then(({ data }) => {
        if (!current) return;
        setTimeZone(data.timeZone || '');
        setSlots(data.slots || []);
        if (data.closed) setClosedReason(data.reason || 'Closed');
      })
      .catch(() => { if (current) setSlotError('Could not load times. Please choose another date or try again.'); })
      .finally(() => { if (current) setLoadingSlots(false); });
    return () => { current = false; };
  }, [selectedService, date]);

  const submitBooking = async (e) => {
    e.preventDefault();
    if (submitting || !selectedSlot || loadingSlots) return;
    if (!form.customerName.trim() || !form.customerPhone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    try {
      setSubmitting(true);
      const { data } = await bookingsAPI.create({
        serviceId: selectedService.id,
        startTime: selectedSlot,
        ...form
      });
      setConfirmed(data.booking);
      toast.success('Booking requested!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create booking');
      if (error.response?.status === 409) {setSlots(previous => previous.filter(slot => slot !== selectedSlot));setSelectedSlot(null);}
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Booking Requested</h2>
          <p className="text-slate-600 mb-4">
            We've received your request for <strong>{selectedService.name}</strong> on{' '}
            {new Date(confirmed.start_time).toLocaleString()}. You'll be contacted at {form.customerPhone} to confirm.
          </p>
          <button onClick={() => window.location.reload()} className="text-blue-600 font-medium">Book another appointment</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <p className="text-center text-slate-500 py-12">Loading services...</p>;
  }

  if (services.length === 0) {
    return <p className="text-center text-slate-500 py-12">No services are available for booking right now.</p>;
  }

  if (!selectedService) {
    const SelectedTemplate = BOOKING_TEMPLATES[bookingTemplate] || BookingDefaultTemplate;
    return <SelectedTemplate services={services} storeName={storeName} onSelectService={setSelectedService} />;
  }

  return (
    <div className="commerce-flow">
      <div className="bg-white border-b border-slate-200 py-6 px-4 text-center">
        <h1 className="flow-title">{storeName || 'Book an Appointment'}</h1>
        <p className="text-slate-500 mt-1">Choose a service and pick a time that works for you</p>
      </div>

      <div className="max-w-2xl mx-auto p-4">
          <div className="flow-panel mt-6">
            <button onClick={() => setSelectedService(null)} className="text-sm text-blue-600 mb-4">&larr; Choose a different service</button>
            <h2 className="text-lg font-semibold text-slate-900">{selectedService.name}</h2>

            <label className="block text-sm font-medium text-slate-700 mt-4 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" /> Date
            </label>
            <input aria-label="Appointment date" type="date" value={date} min={new Date().toISOString().slice(0, 10)}
              onChange={e => setDate(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg" />

            <div className="mt-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Available times {timeZone && <span className="text-slate-500 font-normal">({timeZone})</span>}</p>{slotError && <p role="alert" className="text-red-700">{slotError}</p>}
              {loadingSlots ? (
                <p className="text-sm text-slate-500">Loading...</p>
              ) : closedReason ? (
                <p className="text-sm text-slate-500">Closed this day{closedReason !== 'Closed' ? ` - ${closedReason}` : ''}. Try another date.</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-slate-500">No open slots this day - try another date.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map(slot => (
                    <button key={slot} onClick={() => setSelectedSlot(slot)}
                      className={`px-3 py-2 rounded-lg text-sm border ${selectedSlot === slot ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 hover:border-blue-400'}`}>
                      {new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: timeZone || undefined })}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedSlot && (
              <form onSubmit={submitBooking} className="mt-6 space-y-3 border-t border-slate-100 pt-4">
                <input required aria-label="Your name" autoComplete="name" placeholder="Your name" value={form.customerName}
                  onChange={e => setForm({ ...form, customerName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                <input required type="tel" aria-label="Phone number" autoComplete="tel" placeholder="Phone number" value={form.customerPhone}
                  onChange={e => setForm({ ...form, customerPhone: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                <input type="email" aria-label="Email (optional)" autoComplete="email" placeholder="Email (optional)" value={form.customerEmail}
                  onChange={e => setForm({ ...form, customerEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                <textarea aria-label="Notes (optional)" placeholder="Notes (optional)" value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg" rows={2} />
                <button type="submit" disabled={submitting}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? 'Booking...' : 'Request appointment'}
                </button>
              </form>
            )}
          </div>
      </div>
    </div>
  );
}
