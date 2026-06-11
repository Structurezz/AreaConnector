import { useEffect, useState } from 'react';
import { guardAPI } from '../api';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import {
  Shield, Search, UserX, UserCheck, MailPlus, Trash2,
  X, ChevronLeft, Phone, Mail, Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import Pagination from '../components/ui/Pagination';

const PAGE_SIZE = 15;

function GuardDrawer({ guard, onToggle, onRemove, onClose }) {
  const [confirmRemove, setConfirmRemove] = useState(false);

  if (!guard) return null;
  const g = guard;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto z-50 flex flex-col bg-white shadow-2xl overflow-hidden sm:w-96">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 sm:px-5"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors sm:hidden">
            <ChevronLeft size={20} />
          </button>
          <span className="font-semibold text-slate-900 text-sm flex-1">Guard Details</span>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors hidden sm:block">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
              style={{ background: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: '2px solid rgba(59,130,246,0.2)' }}>
              {g.name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 flex items-center gap-2 flex-wrap text-base">
                {g.name}
                {!g.isActive && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                    Suspended
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-500 mt-0.5 truncate">{g.email}</div>
              {g.phone && <div className="text-sm mt-0.5 text-slate-400">{g.phone}</div>}
            </div>
          </div>

          {/* Info rows */}
          <div style={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            {[
              { label: 'Role',         value: 'Security Guard',                    icon: Shield    },
              { label: 'Status',       value: g.isActive ? 'Active' : 'Suspended', icon: UserCheck, color: g.isActive ? '#10B981' : '#EF4444' },
              g.phone && { label: 'Phone', value: g.phone,                         icon: Phone     },
              g.email && { label: 'Email', value: g.email,                         icon: Mail      },
              g.createdAt && { label: 'Onboarded', value: format(new Date(g.createdAt), 'MMM d, yyyy'), icon: Calendar },
            ].filter(Boolean).map((row, i) => (
              <div key={row.label}
                className="flex items-center justify-between px-4 py-3"
                style={{ borderTop: i > 0 ? '1px solid rgba(0,0,0,0.05)' : 'none', background: '#FAFAFA' }}>
                <div className="flex items-center gap-2">
                  <row.icon size={13} style={{ color: '#94A3B8', flexShrink: 0 }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>{row.label}</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: row.color || '#0F172A' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Guard app info */}
          <div className="rounded-xl p-4"
            style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#60A5FA' }}>AreaConnect Guard App</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              This guard should download the <strong>AreaConnect Guard</strong> app and log in with the credentials sent to their email.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 space-y-2.5" style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}>
          <button onClick={() => { onToggle(g); onClose(); }}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
            style={{
              background: g.isActive ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
              color: g.isActive ? '#EF4444' : '#10B981',
              border: `1px solid ${g.isActive ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
            }}>
            {g.isActive ? 'Suspend Guard' : 'Activate Guard'}
          </button>

          {!confirmRemove ? (
            <button onClick={() => setConfirmRemove(true)}
              className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
              style={{ background: 'transparent', color: '#94A3B8', border: '1px solid rgba(0,0,0,0.08)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; }}>
              <Trash2 size={13} /> Remove Guard
            </button>
          ) : (
            <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-xs text-center font-medium" style={{ color: '#EF4444' }}>
                Remove {g.name}? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmRemove(false)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: 'rgba(0,0,0,0.06)', color: '#64748B' }}>
                  Cancel
                </button>
                <button onClick={() => { onRemove(g); onClose(); }}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: '#EF4444', color: 'white' }}>
                  Yes, Remove
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function Guards() {
  const [guards, setGuards]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm]           = useState({ name: '', email: '', phone: '' });
  const [saving, setSaving]       = useState(false);
  const [selected, setSelected]   = useState(null);

  const load = async (p = page, q = search) => {
    setLoading(true);
    try {
      const { data } = await guardAPI.getAll({ page: p, limit: PAGE_SIZE, search: q || undefined });
      setGuards(data.data);
      setPagination(data.pagination || { total: data.data.length, pages: 1 });
    } catch {
      toast.error('Failed to load guards');
    } finally {
      setLoading(false);
    }
  };

  const handlePage   = (p) => { setPage(p); load(p, search); };
  const handleSearch = (q) => { setSearch(q); setPage(1); load(1, q); };

  useEffect(() => { load(1, ''); }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await guardAPI.invite(form);
      toast.success(data.message || 'Guard account created and credentials sent!');
      setShowInvite(false);
      setForm({ name: '', email: '', phone: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create guard account');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (g) => {
    try {
      if (g.isActive) {
        await guardAPI.suspend(g._id);
        toast.success('Guard suspended');
      } else {
        await guardAPI.activate(g._id);
        toast.success('Guard activated');
      }
      load(page, search);
    } catch {
      toast.error('Action failed');
    }
  };

  const handleRemove = async (g) => {
    try {
      await guardAPI.remove(g._id);
      toast.success(`${g.name} removed`);
      load(page, search);
    } catch {
      toast.error('Failed to remove guard');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ letterSpacing: '-0.03em' }}>
            Security Guards
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-sub)' }}>
            {pagination.total} guard{pagination.total !== 1 ? 's' : ''} onboarded
          </p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary gap-2">
          <MailPlus size={14} /> Add Guard
        </button>
      </div>

      {/* How guards get access — info banner */}
      <div className="rounded-xl px-4 py-3 flex items-start gap-3"
        style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
        <Shield size={16} style={{ color: '#60A5FA', flexShrink: 0, marginTop: 1 }} />
        <div className="text-xs leading-relaxed" style={{ color: '#93C5FD' }}>
          <span className="font-semibold text-blue-300">How it works: </span>
          Add a guard's name and email. They'll receive login credentials by email and can immediately sign in to the{' '}
          <strong>AreaConnect Guard</strong> app to verify visitors and manage gate entry.
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
        <input className="input-field pl-9" placeholder="Search by name or email…"
          value={search} onChange={e => handleSearch(e.target.value)} />
      </div>

      {/* List */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12"><Spinner /></div>
        ) : guards.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="No guards onboarded yet"
            description="Add your gate security officers so they can verify visitors using the AreaConnect Guard app."
          />
        ) : (
          <div>
            {guards.map((g, i) => (
              <div key={g._id}
                className="flex items-center gap-4 px-5 py-4 transition-colors cursor-pointer"
                style={{ borderTop: i > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}
                onClick={() => setSelected(g)}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.2)' }}>
                  {g.name[0]?.toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                    {g.name}
                    {!g.isActive && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                        Suspended
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                    {g.email}{g.phone ? ` · ${g.phone}` : ''}
                  </div>
                </div>

                {/* Joined date */}
                <div className="text-xs hidden sm:block flex-shrink-0" style={{ color: 'var(--text-dim)' }}>
                  {g.createdAt ? format(new Date(g.createdAt), 'MMM d, yyyy') : '—'}
                </div>

                {/* Active dot */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="w-2 h-2 rounded-full"
                    style={{ background: g.isActive ? '#10B981' : '#94A3B8' }} />
                  <span className="text-xs font-medium hidden sm:block"
                    style={{ color: g.isActive ? '#10B981' : '#94A3B8' }}>
                    {g.isActive ? 'Active' : 'Suspended'}
                  </span>
                </div>

                {/* Quick toggle */}
                <button onClick={(e) => { e.stopPropagation(); handleToggle(g); }}
                  className="p-2 rounded-lg transition-all flex-shrink-0"
                  title={g.isActive ? 'Suspend' : 'Activate'}
                  style={{ color: '#94A3B8' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = g.isActive ? '#F87171' : '#34D399';
                    e.currentTarget.style.background = g.isActive ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)';
                  }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}>
                  {g.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={PAGE_SIZE} onPage={handlePage} />

      {/* ── Invite Modal ──────────────────────────────────────────── */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Add Security Guard">
        <div className="space-y-3 mb-4 p-3 rounded-xl text-sm"
          style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)', color: '#60A5FA' }}>
          <p className="font-medium">🛡️ What happens when you add a guard:</p>
          <ul className="space-y-1 text-xs" style={{ color: 'rgba(96,165,250,0.8)' }}>
            <li>• A security account is created for the guard</li>
            <li>• Their login credentials are emailed to them</li>
            <li>• They sign in to the <strong style={{ color: '#93C5FD' }}>AreaConnect Guard</strong> app</li>
            <li>• They can immediately start verifying visitors at the gate</li>
          </ul>
        </div>
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sub)' }}>Full Name *</label>
            <input className="input-field" placeholder="e.g. Musa Abdullahi"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sub)' }}>Email Address *</label>
            <input type="email" className="input-field" placeholder="guard@email.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sub)' }}>Phone (optional)</label>
            <input className="input-field" placeholder="+234 …"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowInvite(false)} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Creating…' : '🛡️ Add Guard'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Drawer ───────────────────────────────────────────────── */}
      <GuardDrawer
        guard={selected}
        onToggle={handleToggle}
        onRemove={handleRemove}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
