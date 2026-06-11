import { useEffect, useState } from 'react';
import { unitAPI, residentAPI } from '../api';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { Home, Plus, Trash2, Users, X, ChevronLeft, UserPlus, UserMinus } from 'lucide-react';
import toast from 'react-hot-toast';

function UnitDrawer({ unit, allResidents, onAddResident, onRemoveResident, onDelete, onClose }) {
  const [addResidentId, setAddResidentId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setAddResidentId(''); }, [unit]);

  if (!unit) return null;
  const u = unit;
  const occupants = (u.residentIds || []).filter(r => r._id);
  const count = occupants.length;
  const max = u.maxOccupants || 7;
  const pct = Math.round((count / max) * 100);
  const occupantIds = new Set(occupants.map(r => r._id));
  const available = (allResidents || []).filter(r => !occupantIds.has(r._id));

  const handleAdd = async () => {
    if (!addResidentId) return;
    setSaving(true);
    try {
      await onAddResident(addResidentId, u._id);
      setAddResidentId('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      {/* Mobile: full page · Desktop (sm+): right panel */}
      <div className="fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto z-50 flex flex-col bg-white shadow-2xl overflow-hidden sm:w-96">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 sm:px-5"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors sm:hidden">
            <ChevronLeft size={20} />
          </button>
          <span className="font-semibold text-slate-900 text-sm flex-1">Unit Details</span>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors hidden sm:block">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Title */}
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {u.block ? `Block ${u.block} · ` : ''}Unit {u.unitNumber}
              </div>
              <div className="text-sm capitalize mt-0.5" style={{ color: 'var(--text-dim)' }}>{u.type}</div>
            </div>
            <span className={`badge ${u.status === 'occupied' ? 'badge-green' : 'badge-gray'}`}>
              {u.status}
            </span>
          </div>

          {/* Occupancy bar */}
          <div className="rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1"
                style={{ color: 'var(--text-dim)' }}>
                <Users size={10} /> Occupancy
              </span>
              <span className="text-sm font-bold text-slate-900">{count} / {max}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: '#E2E8F0' }}>
              <div className={`h-full rounded-full transition-all ${
                count >= max ? 'bg-red-400' : count > 0 ? 'bg-emerald-400' : 'bg-slate-300'
              }`} style={{ width: `${pct}%` }} />
            </div>
            <div className="text-xs mt-1.5 text-right" style={{ color: 'var(--text-dim)' }}>
              {count >= max ? 'Full' : `${max - count} slot${max - count !== 1 ? 's' : ''} available`}
            </div>
          </div>

          {/* Dues */}
          <div className="flex items-center justify-between p-4 rounded-xl"
            style={{
              background: u.duesStatus === 'paid' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
              border: `1px solid ${u.duesStatus === 'paid' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
            }}>
            <span className="text-sm font-semibold"
              style={{ color: u.duesStatus === 'paid' ? '#10B981' : '#EF4444' }}>
              Dues: {u.duesStatus}
            </span>
            {u.amountOwed > 0 && (
              <span className="text-sm font-bold" style={{ color: '#EF4444' }}>
                ₦{u.amountOwed.toLocaleString()}
              </span>
            )}
          </div>

          {/* Add resident */}
          <div className="rounded-xl p-4 space-y-3"
            style={{ background: '#F8FAFC', border: '1px solid rgba(0,0,0,0.07)' }}>
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
              Add Resident
            </div>
            {count >= max ? (
              <p className="text-xs text-center py-1" style={{ color: '#EF4444' }}>Unit is full ({max}/{max})</p>
            ) : available.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>All residents are already assigned to units</p>
            ) : (
              <div className="flex gap-2">
                <select className="input-field text-sm flex-1" value={addResidentId}
                  onChange={e => setAddResidentId(e.target.value)}>
                  <option value="">Select resident…</option>
                  {available.map(r => (
                    <option key={r._id} value={r._id}>{r.name}</option>
                  ))}
                </select>
                <button onClick={handleAdd} disabled={!addResidentId || saving}
                  className="p-2.5 rounded-xl transition-all flex-shrink-0"
                  style={{
                    background: 'rgba(16,185,129,0.1)',
                    color: '#10B981',
                    border: '1px solid rgba(16,185,129,0.2)',
                    opacity: !addResidentId ? 0.5 : 1,
                  }}>
                  <UserPlus size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Occupants list */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide mb-3"
              style={{ color: 'var(--text-dim)' }}>
              Occupants ({count})
            </div>
            {count === 0 ? (
              <div className="text-sm italic text-center py-6" style={{ color: 'var(--text-dim)' }}>
                No residents assigned yet
              </div>
            ) : (
              <div className="space-y-2">
                {occupants.map((r) => (
                  <div key={r._id}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: 'rgba(16,185,129,0.12)', color: '#34D399' }}>
                      {(r.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{r.name || '—'}</div>
                      {r.email && (
                        <div className="text-xs truncate" style={{ color: 'var(--text-dim)' }}>{r.email}</div>
                      )}
                    </div>
                    <button
                      onClick={() => onRemoveResident(r._id)}
                      className="p-1.5 rounded-lg transition-all flex-shrink-0"
                      title="Remove from unit"
                      style={{ color: '#CBD5E1' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#CBD5E1'; e.currentTarget.style.background = 'transparent'; }}>
                      <UserMinus size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5" style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}>
          <button
            onClick={() => {
              if (!confirm('Delete this unit? This cannot be undone.')) return;
              onDelete(u._id);
              onClose();
            }}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            Delete Unit
          </button>
        </div>
      </div>
    </>
  );
}

export default function Units() {
  const [units, setUnits] = useState([]);
  const [allResidents, setAllResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ unitNumber: '', block: '', type: 'apartment' });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([
        unitAPI.getAll(),
        residentAPI.getAll({ limit: 500 }),
      ]);
      setUnits(u.data.data);
      setAllResidents(r.data.data);
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

  const handleAddResident = async (residentId, unitId) => {
    try {
      await residentAPI.assignUnit(residentId, unitId);
      toast.success('Resident added to unit');
      const { data } = await unitAPI.getAll();
      setUnits(data.data);
      setSelected(data.data.find(u => u._id === unitId) || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add resident');
    }
  };

  const handleRemoveResident = async (residentId) => {
    try {
      await residentAPI.assignUnit(residentId, null);
      toast.success('Resident removed from unit');
      const [u, r] = await Promise.all([unitAPI.getAll(), residentAPI.getAll({ limit: 500 })]);
      setUnits(u.data.data);
      setAllResidents(r.data.data);
      setSelected(prev => prev ? u.data.data.find(x => x._id === prev._id) || null : null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove resident');
    }
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
          <h1 className="text-3xl font-display font-bold text-slate-900 mb-1">Estate Units</h1>
          <p className="text-slate-500 text-sm">{units.length} units · {units.filter((u) => u.status === 'occupied').length} occupied</p>
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
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">Block {block}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {blockUnits.map((u) => (
                <div key={u._id}
                  className={`glass-card p-4 hover:border-gold/20 transition-all ${u.status === 'occupied' ? 'border-emerald-500/20' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelected(u)}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-bold text-slate-900 text-lg">Unit {u.unitNumber}</div>
                      <div className="text-slate-400 text-xs capitalize">{u.type}</div>
                    </div>
                    <div className={`badge ${u.status === 'occupied' ? 'badge-green' : 'badge-gray'}`}>
                      {u.status}
                    </div>
                  </div>

                  {/* Occupancy bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-400 text-xs flex items-center gap-1"><Users size={10} /> Occupants</span>
                      <span className="text-slate-500 text-xs font-medium">
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
                        <span className="text-slate-400 text-xs">+{u.residentIds.length - 5} more</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${u.duesStatus === 'paid' ? 'text-emerald-400' : 'text-red-400'}`}>
                      Dues: {u.duesStatus}
                      {u.amountOwed > 0 && ` · ₦${u.amountOwed.toLocaleString()}`}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(u._id); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-400/10 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <UnitDrawer
        unit={selected}
        allResidents={allResidents}
        onAddResident={handleAddResident}
        onRemoveResident={handleRemoveResident}
        onDelete={handleDelete}
        onClose={() => setSelected(null)}
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Unit">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-500 mb-1.5 block">Unit Number *</label>
              <input className="input-field" value={form.unitNumber} placeholder="e.g. A101"
                onChange={(e) => setForm({ ...form, unitNumber: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm text-slate-500 mb-1.5 block">Block</label>
              <input className="input-field" value={form.block} placeholder="e.g. A"
                onChange={(e) => setForm({ ...form, block: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-500 mb-1.5 block">Type</label>
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
