import { useEffect, useMemo, useState } from 'react';
import { unitAPI, residentAPI } from '../api';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import {
  Home, Plus, Trash2, Users, X, ChevronLeft, UserPlus, UserMinus,
  Search, CheckCircle2, AlertCircle, Wallet, Building2, Store, Briefcase,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_ICONS = { apartment: Building2, house: Home, shop: Store, office: Briefcase };
const NGN = (n) => `₦${(n || 0).toLocaleString()}`;

function Avatar({ resident, size = 28, ring = true }) {
  const cls = `rounded-full flex-shrink-0 object-cover ${ring ? 'ring-2 ring-white' : ''}`;
  const style = { width: size, height: size };
  return resident?.profilePhoto ? (
    <img src={resident.profilePhoto} alt="" className={cls} style={style} title={resident.name} />
  ) : (
    <div className={`rounded-full flex items-center justify-center font-bold flex-shrink-0 ${ring ? 'ring-2 ring-white' : ''}`}
      style={{
        ...style,
        background: 'linear-gradient(135deg, rgba(16,185,129,0.16), rgba(4,120,87,0.10))',
        color: '#047857',
        fontSize: Math.round(size * 0.4),
      }}
      title={resident?.name}>
      {(resident?.name || '?')[0]?.toUpperCase()}
    </div>
  );
}

// Small dot-row occupancy indicator (nicer than a plain bar for capacity ≤ 12)
function OccupancyDots({ count, max }) {
  const capped = Math.min(max, 12);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: capped }).map((_, i) => (
        <span key={i}
          className="rounded-full flex-shrink-0"
          style={{
            width: 6, height: 6,
            background: i < count
              ? (count >= max ? '#EF4444' : '#10B981')
              : '#E2E8F0',
          }} />
      ))}
    </div>
  );
}

function StatChip({ label, value, tone = 'default' }) {
  const tones = {
    default: { bg: 'rgba(15,23,42,0.05)',   color: '#0F172A', border: 'rgba(15,23,42,0.06)' },
    green:   { bg: 'rgba(16,185,129,0.08)', color: '#047857', border: 'rgba(16,185,129,0.20)' },
    amber:   { bg: 'rgba(217,119,6,0.08)',  color: '#B45309', border: 'rgba(217,119,6,0.20)' },
    red:     { bg: 'rgba(239,68,68,0.08)',  color: '#DC2626', border: 'rgba(239,68,68,0.20)' },
  }[tone];
  return (
    <div className="rounded-xl px-3 py-2 flex flex-col"
      style={{ background: tones.bg, border: `1px solid ${tones.border}` }}>
      <span className="text-lg font-black leading-none" style={{ color: tones.color }}>{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider mt-1" style={{ color: tones.color, opacity: 0.8 }}>{label}</span>
    </div>
  );
}

function UnitCard({ u, onOpen }) {
  const occupants = (u.residentIds || []).filter(r => r?._id);
  const count = occupants.length;
  const max = u.maxOccupants || 7;
  const isFull = count >= max;
  const paid = u.duesStatus === 'paid';
  const TypeIcon = TYPE_ICONS[u.type] || Building2;

  return (
    <button
      onClick={onOpen}
      className="glass-card p-4 relative overflow-hidden text-left transition-all group hover:-translate-y-0.5"
      style={{
        border: '1px solid rgba(15,23,42,0.06)',
        boxShadow: '0 1px 2px rgba(15,23,42,0.03)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 28px rgba(15,23,42,0.10)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 2px rgba(15,23,42,0.03)'; }}
    >
      {/* Corner tint reflects occupancy state */}
      <span className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none opacity-70"
        style={{
          background: isFull
            ? 'radial-gradient(circle at top right, rgba(239,68,68,0.16), transparent 65%)'
            : count > 0
              ? 'radial-gradient(circle at top right, rgba(16,185,129,0.16), transparent 65%)'
              : 'radial-gradient(circle at top right, rgba(148,163,184,0.14), transparent 65%)',
        }} />

      {/* Header */}
      <div className="relative flex items-start justify-between mb-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            {u.block && (
              <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                style={{ background: 'rgba(16,185,129,0.10)', color: '#047857' }}>
                {u.block}
              </span>
            )}
            <span className="text-lg sm:text-xl font-black text-slate-900" style={{ letterSpacing: '-0.02em' }}>
              {u.unitNumber}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium capitalize" style={{ color: '#94A3B8' }}>
            <TypeIcon size={11} /> {u.type}
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full flex items-center gap-1 flex-shrink-0"
          style={{
            background: count > 0 ? (isFull ? 'rgba(239,68,68,0.10)' : 'rgba(16,185,129,0.10)') : 'rgba(148,163,184,0.14)',
            color: count > 0 ? (isFull ? '#DC2626' : '#047857') : '#64748B',
          }}>
          <span className="w-1.5 h-1.5 rounded-full"
            style={{ background: count > 0 ? (isFull ? '#EF4444' : '#10B981') : '#94A3B8' }} />
          {count > 0 ? (isFull ? 'Full' : 'Occupied') : 'Vacant'}
        </span>
      </div>

      {/* Occupancy */}
      <div className="relative flex items-center justify-between mb-3">
        <OccupancyDots count={count} max={max} />
        <span className="text-xs font-bold" style={{ color: '#334155' }}>
          {count}<span className="opacity-40 font-medium">/{max}</span>
        </span>
      </div>

      {/* Avatar stack */}
      {count > 0 ? (
        <div className="relative flex items-center mb-3 min-h-[28px]">
          <div className="flex -space-x-2">
            {occupants.slice(0, 4).map((r) => (
              <Avatar key={r._id} resident={r} size={26} />
            ))}
          </div>
          {count > 4 && (
            <span className="ml-2 text-[11px] font-semibold" style={{ color: '#64748B' }}>
              +{count - 4} more
            </span>
          )}
        </div>
      ) : (
        <div className="relative mb-3 min-h-[28px] flex items-center text-[11px]" style={{ color: '#CBD5E1' }}>
          <UserPlus size={12} className="mr-1.5" /> Assign residents
        </div>
      )}

      {/* Dues footer */}
      <div className="relative flex items-center gap-1.5 pt-3 text-xs font-semibold"
        style={{ borderTop: '1px solid rgba(15,23,42,0.05)' }}>
        {paid ? (
          <>
            <CheckCircle2 size={12} style={{ color: '#10B981' }} />
            <span style={{ color: '#059669' }}>Dues paid</span>
          </>
        ) : (
          <>
            <AlertCircle size={12} style={{ color: '#EF4444' }} />
            <span style={{ color: '#DC2626' }}>
              {u.amountOwed > 0 ? `${NGN(u.amountOwed)} owed` : 'Dues unpaid'}
            </span>
          </>
        )}
      </div>
    </button>
  );
}

function UnitDrawer({ unit, allResidents, onAddResident, onRemoveResident, onDelete, onClose }) {
  const [addResidentId, setAddResidentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => { setAddResidentId(''); setConfirmDelete(false); }, [unit?._id]);

  if (!unit) return null;
  const u = unit;
  const occupants = (u.residentIds || []).filter(r => r?._id);
  const count = occupants.length;
  const max = u.maxOccupants || 7;
  const pct = Math.round((count / max) * 100);
  const occupantIds = new Set(occupants.map(r => r._id));
  const available = (allResidents || []).filter(r => !occupantIds.has(r._id));
  const TypeIcon = TYPE_ICONS[u.type] || Building2;
  const paid = u.duesStatus === 'paid';

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
      <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto z-50 flex flex-col bg-white shadow-2xl overflow-hidden sm:w-[400px] animate-slide-in">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5"
          style={{ borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors sm:hidden">
            <ChevronLeft size={20} />
          </button>
          <span className="text-[10px] font-black uppercase tracking-widest flex-1" style={{ color: '#94A3B8' }}>
            Unit Details
          </span>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors hidden sm:block">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Hero */}
          <div className="relative px-5 pt-5 pb-6 overflow-hidden"
            style={{
              background: count > 0
                ? 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(255,255,255,0) 60%)'
                : 'linear-gradient(135deg, rgba(148,163,184,0.10) 0%, rgba(255,255,255,0) 60%)',
              borderBottom: '1px solid rgba(15,23,42,0.05)',
            }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #10B981, #047857)',
                  boxShadow: '0 6px 14px -6px rgba(4,120,87,0.55)',
                }}>
                <TypeIcon size={20} color="#fff" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full flex items-center gap-1"
                style={{
                  background: count > 0 ? 'rgba(16,185,129,0.12)' : 'rgba(148,163,184,0.15)',
                  color: count > 0 ? '#047857' : '#64748B',
                }}>
                <span className="w-1.5 h-1.5 rounded-full"
                  style={{ background: count > 0 ? '#10B981' : '#94A3B8' }} />
                {count >= max ? 'Full' : count > 0 ? 'Occupied' : 'Vacant'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              {u.block && (
                <span className="text-sm font-bold" style={{ color: '#059669' }}>Block {u.block}</span>
              )}
              <span className="text-3xl font-black text-slate-900" style={{ letterSpacing: '-0.02em' }}>
                {u.unitNumber}
              </span>
            </div>
            <div className="text-xs capitalize mt-1 font-medium" style={{ color: '#64748B' }}>
              {u.type}
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5">
            {/* Occupancy card */}
            <div className="rounded-2xl p-4"
              style={{ background: '#F8FAFC', border: '1px solid rgba(15,23,42,0.06)' }}>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
                  style={{ color: '#64748B' }}>
                  <Users size={11} /> Occupancy
                </span>
                <span className="text-sm font-black" style={{ color: '#0F172A' }}>
                  {count}<span className="opacity-40 font-medium">/{max}</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: '#E2E8F0' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: count >= max ? '#EF4444' : count > 0 ? '#10B981' : '#CBD5E1',
                  }} />
              </div>
              <div className="text-[11px]" style={{ color: '#94A3B8' }}>
                {count >= max ? 'Unit is at full capacity' : `${max - count} slot${max - count !== 1 ? 's' : ''} available`}
              </div>
            </div>

            {/* Dues card */}
            <div className="rounded-2xl p-4 flex items-center gap-3"
              style={{
                background: paid ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                border: paid ? '1px solid rgba(16,185,129,0.20)' : '1px solid rgba(239,68,68,0.20)',
              }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: paid ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.14)' }}>
                <Wallet size={16} style={{ color: paid ? '#059669' : '#DC2626' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: paid ? '#059669' : '#DC2626' }}>
                  Dues
                </div>
                <div className="text-sm font-bold capitalize" style={{ color: '#0F172A' }}>
                  {paid ? 'All paid' : (u.amountOwed > 0 ? NGN(u.amountOwed) + ' outstanding' : 'Unpaid')}
                </div>
              </div>
            </div>

            {/* Add resident */}
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest mb-2.5 flex items-center gap-1.5"
                style={{ color: '#64748B' }}>
                <UserPlus size={11} /> Assign a resident
              </div>
              {count >= max ? (
                <div className="text-xs px-3 py-2.5 rounded-xl text-center font-medium"
                  style={{ background: 'rgba(239,68,68,0.06)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.15)' }}>
                  Unit is at max capacity ({max}/{max})
                </div>
              ) : available.length === 0 ? (
                <div className="text-xs px-3 py-2.5 rounded-xl text-center"
                  style={{ background: '#F8FAFC', color: '#94A3B8', border: '1px solid rgba(15,23,42,0.05)' }}>
                  All residents already assigned to units
                </div>
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
                    className="px-4 rounded-xl transition-all flex-shrink-0 flex items-center gap-1.5 text-sm font-bold text-white"
                    style={{
                      background: !addResidentId ? '#CBD5E1' : 'linear-gradient(135deg, #10B981, #047857)',
                      opacity: !addResidentId ? 0.7 : 1,
                      boxShadow: !addResidentId ? 'none' : '0 4px 12px rgba(16,185,129,0.35)',
                    }}>
                    <UserPlus size={14} /> Add
                  </button>
                </div>
              )}
            </div>

            {/* Occupants */}
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest mb-2.5 flex items-center gap-1.5"
                style={{ color: '#64748B' }}>
                <Users size={11} /> Occupants · {count}
              </div>
              {count === 0 ? (
                <div className="text-xs text-center py-8 px-4 rounded-2xl"
                  style={{ background: '#F8FAFC', color: '#94A3B8', border: '1px dashed rgba(15,23,42,0.08)' }}>
                  No residents assigned yet
                </div>
              ) : (
                <div className="space-y-2">
                  {occupants.map((r) => (
                    <div key={r._id}
                      className="flex items-center gap-3 p-2.5 rounded-xl transition-all"
                      style={{ background: '#F8FAFC', border: '1px solid rgba(15,23,42,0.05)' }}>
                      <Avatar resident={r} size={36} ring={false} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>{r.name || '—'}</div>
                        {r.email && (
                          <div className="text-[11px] truncate" style={{ color: '#94A3B8' }}>{r.email}</div>
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
        </div>

        {/* Footer */}
        <div className="p-4" style={{ borderTop: '1px solid rgba(15,23,42,0.06)' }}>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: '#F1F5F9', color: '#64748B' }}>
                Cancel
              </button>
              <button
                onClick={() => { onDelete(u._id); onClose(); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: '#EF4444', boxShadow: '0 4px 12px rgba(239,68,68,0.35)' }}>
                Confirm delete
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={{ background: 'rgba(239,68,68,0.06)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.15)' }}>
              <Trash2 size={13} /> Delete unit
            </button>
          )}
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
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | occupied | vacant | dues

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

  // ── Derived views ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let occupied = 0, vacant = 0, owed = 0;
    for (const u of units) {
      const count = (u.residentIds || []).filter(r => r?._id).length;
      if (count > 0) occupied++; else vacant++;
      if (u.duesStatus !== 'paid' && u.amountOwed > 0) owed += u.amountOwed;
    }
    return { total: units.length, occupied, vacant, owed };
  }, [units]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return units.filter((u) => {
      const count = (u.residentIds || []).filter(r => r?._id).length;
      if (filter === 'occupied' && count === 0) return false;
      if (filter === 'vacant'   && count > 0)  return false;
      if (filter === 'dues'     && u.duesStatus === 'paid') return false;
      if (!q) return true;
      const hay = [
        u.unitNumber,
        u.block,
        u.type,
        ...(u.residentIds || []).map(r => r?.name).filter(Boolean),
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [units, search, filter]);

  const grouped = useMemo(() => {
    const map = {};
    for (const u of filtered) {
      const key = (u.block || '').trim() || '__none';
      (map[key] = map[key] || []).push(u);
    }
    // Sort blocks alphabetically, unblocked last
    return Object.entries(map).sort(([a], [b]) => {
      if (a === '__none') return 1;
      if (b === '__none') return -1;
      return a.localeCompare(b);
    });
  }, [filtered]);

  const FILTERS = [
    { key: 'all',      label: 'All',      count: stats.total },
    { key: 'occupied', label: 'Occupied', count: stats.occupied },
    { key: 'vacant',   label: 'Vacant',   count: stats.vacant },
    { key: 'dues',     label: 'Dues owed' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900" style={{ letterSpacing: '-0.02em' }}>
            Units
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Manage your estate's units, occupancy and dues
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary gap-2">
          <Plus size={16} /> Add Unit
        </button>
      </div>

      {/* Stat strip */}
      {!loading && units.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          <StatChip label="Total"    value={stats.total}    tone="default" />
          <StatChip label="Occupied" value={stats.occupied} tone="green"   />
          <StatChip label="Vacant"   value={stats.vacant}   tone="amber"   />
          <StatChip label="Owed"     value={stats.owed > 0 ? NGN(stats.owed).replace(/,\d{3}(?=,)/g, 'k') : NGN(0)} tone={stats.owed > 0 ? 'red' : 'default'} />
        </div>
      )}

      {/* Filter bar */}
      {!loading && units.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search unit, block, type or resident…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#0F172A' }}
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5" style={{ scrollbarWidth: 'thin' }}>
            {FILTERS.map(({ key, label, count }) => {
              const active = filter === key;
              return (
                <button key={key}
                  onClick={() => setFilter(key)}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all"
                  style={{
                    background: active ? 'linear-gradient(135deg, #10B981, #047857)' : '#FFFFFF',
                    color: active ? '#fff' : '#475569',
                    border: `1px solid ${active ? 'transparent' : '#E2E8F0'}`,
                    boxShadow: active ? '0 4px 12px rgba(16,185,129,0.30)' : 'none',
                  }}>
                  {label}
                  {typeof count === 'number' && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md"
                      style={{
                        background: active ? 'rgba(255,255,255,0.24)' : 'rgba(15,23,42,0.05)',
                        color: active ? '#fff' : '#64748B',
                      }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12"><Spinner /></div>
      ) : units.length === 0 ? (
        <EmptyState icon={Home} title="No units yet" message="Create units to assign to residents" />
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 px-4 glass-card">
          <Search size={26} className="mx-auto mb-3" style={{ color: '#CBD5E1' }} />
          <p className="text-sm font-semibold" style={{ color: '#334155' }}>No units match your filters</p>
          <button onClick={() => { setSearch(''); setFilter('all'); }}
            className="text-xs font-semibold mt-2" style={{ color: '#059669' }}>
            Clear search & filter
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([block, blockUnits]) => (
            <div key={block}>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#64748B' }}>
                  {block === '__none' ? 'Unblocked' : `Block ${block}`}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{ background: 'rgba(16,185,129,0.10)', color: '#047857' }}>
                  {blockUnits.length}
                </span>
                <div className="flex-1 h-px" style={{ background: 'rgba(15,23,42,0.06)' }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {blockUnits.map((u) => (
                  <UnitCard key={u._id} u={u} onOpen={() => setSelected(u)} />
                ))}
              </div>
            </div>
          ))}
        </div>
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
