import { useState, useEffect } from 'react';
import { servicesAPI } from '../../services/api';
import { Plus, Edit2, Trash2, X, Clock, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ServicesManagementPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // service object or 'new'
  const [form, setForm] = useState({ name: '', description: '', duration_minutes: '', price: '', category: '', is_active: true });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await servicesAPI.getAll();
      setServices(data.services || []);
    } catch (error) {
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setForm({ name: '', description: '', duration_minutes: '', price: '', category: '', is_active: true });
    setEditing('new');
  };

  const openEdit = (service) => {
    setForm({ ...service });
    setEditing(service.id);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing === 'new') {
        await servicesAPI.create(form);
        toast.success('Service created');
      } else {
        await servicesAPI.update(editing, form);
        toast.success('Service updated');
      }
      setEditing(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save service');
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this service?')) return;
    try {
      await servicesAPI.delete(id);
      toast.success('Service deleted');
      load();
    } catch (error) {
      toast.error('Failed to delete service');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Services</h1>
          <p className="text-slate-500 text-sm">What customers can book an appointment for</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Add Service
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : services.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">No services yet. Add your first bookable service.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-4 flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-slate-900">{s.name}</h3>
                {s.description && <p className="text-sm text-slate-500 mt-1">{s.description}</p>}
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {s.duration_minutes} min</span>
                  <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" /> {s.price}</span>
                  {!s.is_active && <span className="text-red-500">Inactive</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(s)} className="p-2 text-slate-500 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => remove(s.id)} className="p-2 text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={save} className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">{editing === 'new' ? 'Add Service' : 'Edit Service'}</h2>
              <button type="button" onClick={() => setEditing(null)}><X className="w-5 h-5" /></button>
            </div>
            <input required placeholder="Service name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
            <textarea placeholder="Description (optional)" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg" rows={2} />
            <div className="grid grid-cols-2 gap-3">
              <input required type="number" min="5" step="5" placeholder="Duration (min)" value={form.duration_minutes}
                onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              <input required type="number" min="0" step="0.01" placeholder="Price" value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
            </div>
            <input placeholder="Category (optional)" value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
              Active (visible to customers)
            </label>
            <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
          </form>
        </div>
      )}
    </div>
  );
}
