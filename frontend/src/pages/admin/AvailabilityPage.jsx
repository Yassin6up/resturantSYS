import { useState, useEffect } from 'react';
import { availabilityAPI } from '../../services/api';
import { Calendar, Plus, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AvailabilityPage() {
  const [hours, setHours] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newReason, setNewReason] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await availabilityAPI.get();
      setHours(data.hours || []);
      setExceptions(data.exceptions || []);
    } catch (error) {
      toast.error('Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const updateDay = (dayOfWeek, field, value) => {
    setHours(hs => hs.map(h => h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h));
  };

  const save = async () => {
    try {
      setSaving(true);
      const { data } = await availabilityAPI.updateHours(hours);
      setHours(data.hours);
      toast.success('Weekly hours saved');
    } catch (error) {
      toast.error('Failed to save hours');
    } finally {
      setSaving(false);
    }
  };

  const addException = async (e) => {
    e.preventDefault();
    if (!newDate) return;
    try {
      await availabilityAPI.addException({ date: newDate, reason: newReason });
      setNewDate('');
      setNewReason('');
      toast.success('Date blocked');
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to block date');
    }
  };

  const removeException = async (id) => {
    try {
      await availabilityAPI.removeException(id);
      toast.success('Date unblocked');
      load();
    } catch (error) {
      toast.error('Failed to unblock date');
    }
  };

  if (loading) return <p className="p-6 text-slate-500">Loading...</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Availability</h1>
        <p className="text-slate-500 text-sm">When customers can book an appointment with you</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Weekly hours</h2>
        <div className="space-y-2">
          {hours.map(h => (
            <div key={h.day_of_week} className="flex items-center gap-3 py-1.5">
              <label className="flex items-center gap-2 w-32 flex-shrink-0">
                <input type="checkbox" checked={h.is_open} onChange={e => updateDay(h.day_of_week, 'is_open', e.target.checked)} />
                <span className="text-sm font-medium text-slate-700">{h.day_name}</span>
              </label>
              {h.is_open ? (
                <div className="flex items-center gap-2">
                  <input type="time" value={h.open_time} onChange={e => updateDay(h.day_of_week, 'open_time', e.target.value)}
                    className="px-2 py-1 border border-slate-200 rounded-lg text-sm" />
                  <span className="text-slate-400 text-sm">to</span>
                  <input type="time" value={h.close_time} onChange={e => updateDay(h.day_of_week, 'close_time', e.target.value)}
                    className="px-2 py-1 border border-slate-200 rounded-lg text-sm" />
                </div>
              ) : (
                <span className="text-sm text-slate-400">Closed</span>
              )}
            </div>
          ))}
        </div>
        <button onClick={save} disabled={saving}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save hours'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-1">Blocked dates</h2>
        <p className="text-slate-500 text-sm mb-4">Holidays or days off - no bookings will be available on these dates</p>

        <form onSubmit={addException} className="flex flex-wrap gap-2 mb-4">
          <input type="date" required value={newDate} onChange={e => setNewDate(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          <input placeholder="Reason (optional)" value={newReason} onChange={e => setNewReason(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm flex-1 min-w-[150px]" />
          <button type="submit" className="flex items-center gap-1 px-3 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800">
            <Plus className="w-4 h-4" /> Block
          </button>
        </form>

        {exceptions.length === 0 ? (
          <p className="text-sm text-slate-400">No upcoming blocked dates.</p>
        ) : (
          <div className="space-y-2">
            {exceptions.map(ex => (
              <div key={ex.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" /> {ex.date} {ex.reason && <span className="text-slate-400">- {ex.reason}</span>}
                </span>
                <button onClick={() => removeException(ex.id)} className="text-slate-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
