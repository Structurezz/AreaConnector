import { useEffect, useState } from 'react';
import { unitAPI } from '../api';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { Home, Plus, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Units() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ unitNumber: '', block: '', type: 'apartment' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await unitAPI.getAll();
      setUnits(data.data);
    } catch { toast.error('Failed to load'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await unitAPI.create(form);
      toast.success('Unit created');
      setShowCreate(false);
      setForm({ unitNumber: '', block: '', type: 'apartment' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this unit?')) return;
    try {
      await unitAPI.delete(id);
      toast.success('Unit deleted');
      load();
    } catch { toast.error('Failed'); }
  };

  const grouped = units.reduce((acc, u) => {
    const key = u.block || 'No Block';
    (acc[key] = acc[key] || []).push(u);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-1">Estate Units</h1>
          <p className="text-white/50 text-sm">{units.length} units · {units.filter((u) => u.status === 'occupied').length} occupied</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary gap-2">
          <Plus size={16} /> Add Unit
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Spinner /></div>
      ) : units.length === 0 ? (
        <EmptyState icon={Home} title="No units yet" message="Create units to assign to residents" />
      ) : (
        Object.entries(grouped).map(([block, blockUnits]) => (
          <div key={block}>
            <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">Block {block}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {blockUnits.map((u) => (
                <div key={u._id} className={`glass-card p-4 hover:border-gold/20 transition-all ${u.status === 'occupied' ? 'border-emerald-500/20' : ''}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-bold text-white text-lg">Unit {u.unitNumber}</div>
                      <div className="text-white/40 text-xs capitalize">{u.type}</div>
                    </div>
                    <div className={`badge ${u.status === 'occupied' ? 'badge-green' : 'badge-gray'}`}>
                      {u.status}
                    </div>
                  </div>

                  {/* Occupancy bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white/40 text-xs flex items-center gap-1"><Users size={10} /> Occupants</span>
                      <span className="text-white/60 text-xs font-medium">
                        {(u.residentIds || []).length} / {u.maxOccupants || 7}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (u.residentIds || []).length >= (u.maxOccupants || 7)
                            ? 'bg-red-400'
                            : (u.residentIds || []).length > 0
                            ? 'bg-emerald-400'
                            : 'bg-white/20'
                        }`}
                        style={{ width: `${((u.residentIds || []).length / (u.maxOccupants || 7)) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Resident avatars */}
                  {(u.residentIds || []).length > 0 && (
                    <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                      {u.residentIds.slice(0, 5).map((r) => (
                        <div key={r._id || r}
                          className="w-6 h-6 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-gold text-xs font-semibold"
                          title={r.name}>
                          {r.name?.[0] || '?'}
                        </div>
                      ))}
                      {u.residentIds.length > 5 && (
                        <span className="text-white/30 text-xs">+{u.residentIds.length - 5} more</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${u.duesStatus === 'paid' ? 'text-emerald-400' : 'text-red-400'}`}>
                      Dues: {u.duesStatus}
                      {u.amountOwed > 0 && ` · ₦${u.amountOwed.toLocaleString()}`}
                    </span>
                    <button onClick={() => handleDelete(u._id)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Unit">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Unit Number *</label>
              <input className="input-field" value={form.unitNumber} placeholder="e.g. A101"
                onChange={(e) => setForm({ ...form, unitNumber: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Block</label>
              <input className="input-field" value={form.block} placeholder="e.g. A"
                onChange={(e) => setForm({ ...form, block: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Type</label>
            <select className="input-field" value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="shop">Shop</option>
              <option value="office">Office</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Creating...' : 'Create Unit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
