import { useEffect, useState } from 'react';
import { residentAPI, unitAPI } from '../api';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import {
  Users, Search, Plus, UserX, UserCheck,
  MailPlus, Upload, CheckCircle, AlertCircle, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '../components/ui/Pagination';

// ── Bulk CSV parser: "Name, email, phone?, unitNumber?" lines ─────────────────
function parseBulkText(raw) {
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split(',').map(s => s.trim());
      return {
        name:       parts[0] || '',
        email:      parts[1] || '',
        phone:      parts[2] || '',
        unitNumber: parts[3] || '',
      };
    })
    .filter(r => r.name && r.email);
}

function unitLabel(u) {
  const base = u.block ? `Block ${u.block} · Apt ${u.unitNumber}` : `Apt ${u.unitNumber}`;
  const count = (u.residentIds || []).length;
  const max   = u.maxOccupants || 7;
  const full  = count >= max;
  return `${base} — ${count}/${max}${full ? ' (full)' : ''}`;
}

const PAGE_SIZE = 15;

export default function ManagerResidents() {
  const [residents, setResidents]   = useState([]);
  const [units, setUnits]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  // modals
  const [showAdd, setShowAdd]             = useState(false);
  const [showInvite, setShowInvite]       = useState(false);
  const [showBulk, setShowBulk]           = useState(false);

  // forms
  const [form, setForm]             = useState({ name: '', email: '', phone: '', unitId: '' });
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', phone: '', unitId: '' });
  const [bulkText, setBulkText]     = useState('');
  const [bulkResult, setBulkResult] = useState(null);

  const [saving, setSaving] = useState(false);

  const load = async (p = page, q = search) => {
    setLoading(true);
    try {
      const [r, u] = await Promise.all([
        residentAPI.getAll({ page: p, limit: PAGE_SIZE, search: q || undefined }),
        unitAPI.getAll(),
      ]);
      setResidents(r.data.data);
      setPagination(r.data.pagination || { total: r.data.data.length, pages: 1 });
      setUnits(u.data.data);
    } catch {
      toast.error('Failed to load residents');
    } finally {
      setLoading(false);
    }
  };

  const handlePage   = (p) => { setPage(p); load(p, search); };
  const handleSearch = (q) => { setSearch(q); setPage(1); load(1, q); };

  useEffect(() => { load(1, ''); }, []);

  // ── Single invite ────────────────────────────────────────────────
  const handleInvite = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await residentAPI.invite(inviteForm);
      toast.success(data.message || 'Invitation sent!');
      setShowInvite(false);
      setInviteForm({ email: '', name: '', phone: '', unitId: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setSaving(false);
    }
  };

  // ── Bulk invite ──────────────────────────────────────────────────
  const handleBulkInvite = async () => {
    const list = parseBulkText(bulkText);
    if (!list.length) { toast.error('No valid rows found'); return; }
    setSaving(true);
    setBulkResult(null);
    try {
      const { data } = await residentAPI.bulkInvite(list);
      setBulkResult(data.data);
      toast.success(data.message);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk invite failed');
    } finally {
      setSaving(false);
    }
  };

  const closeBulk = () => { setShowBulk(false); setBulkText(''); setBulkResult(null); };

  // ── Direct add ───────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await residentAPI.add(form);
      toast.success('Resident added!');
      setShowAdd(false);
      setForm({ name: '', email: '', phone: '', unitId: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (r) => {
    try {
      if (r.isActive) {
        await residentAPI.suspend(r._id);
        toast.success('Resident suspended');
      } else {
        await residentAPI.activate(r._id);
        toast.success('Resident activated');
      }
      load();
    } catch {
      toast.error('Action failed');
    }
  };

  const parsedPreview = parseBulkText(bulkText);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ letterSpacing: '-0.03em' }}>Residents</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-sub)' }}>{pagination.total} registered residents</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBulk(true)} className="btn-outline gap-2">
            <Upload size={14} /> Bulk Invite
          </button>
          <button onClick={() => setShowInvite(true)} className="btn-outline gap-2">
            <MailPlus size={14} /> Invite
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary gap-2">
            <Plus size={14} /> Add Resident
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
        <input className="input-field pl-9" placeholder="Search by name or email…"
          value={search} onChange={e => handleSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12"><Spinner /></div>
        ) : residents.length === 0 ? (
          <EmptyState icon={Users} title="No residents found" />
        ) : (
          <div>
            {residents.map((r, i) => (
              <div key={r._id}
                className="flex items-center gap-4 px-5 py-4 transition-colors"
                style={{ borderTop: i > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: 'rgba(16,185,129,0.12)', color: '#34D399', border: '1px solid rgba(16,185,129,0.2)' }}>
                  {r.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 text-sm flex items-center gap-2">
                    {r.name}
                    {!r.isActive && <span className="badge badge-red">Suspended</span>}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                    {r.email}{r.phone ? ` · ${r.phone}` : ''}
                  </div>
                </div>
                <div className="text-sm hidden sm:block" style={{ color: 'var(--text-dim)' }}>
                  {r.unitId
                    ? (r.unitId.block ? `Block ${r.unitId.block} · Apt ${r.unitId.unitNumber}` : `Apt ${r.unitId.unitNumber}`)
                    : <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>No apartment</span>}
                </div>
                <button onClick={() => handleToggle(r)}
                  className="p-2 rounded-lg transition-all flex-shrink-0"
                  title={r.isActive ? 'Suspend' : 'Activate'}
                  style={{ color: '#94A3B8' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = r.isActive ? '#F87171' : '#34D399';
                    e.currentTarget.style.background = r.isActive ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)';
                  }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}>
                  {r.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={PAGE_SIZE} onPage={handlePage} />

      {/* ── Single Invite Modal ─────────────────────────────────── */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Send Invitation">
        <div className="space-y-3 mb-4 p-3 rounded-xl text-sm"
          style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', color: '#34D399' }}>
          <p className="font-medium">📧 What happens when you invite:</p>
          <ul className="space-y-1 text-xs" style={{ color: 'rgba(52,211,153,0.8)' }}>
            <li>• An account is created instantly for the resident</li>
            <li>• A login credentials email is sent via Resend</li>
            <li>• They can log in immediately with their temp password</li>
          </ul>
        </div>
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sub)' }}>Full Name *</label>
            <input className="input-field" placeholder="e.g. Amaka Johnson"
              value={inviteForm.name}
              onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sub)' }}>Email Address *</label>
            <input type="email" className="input-field" placeholder="resident@email.com"
              value={inviteForm.email}
              onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sub)' }}>Phone (optional)</label>
            <input className="input-field" placeholder="+234 …"
              value={inviteForm.phone}
              onChange={e => setInviteForm({ ...inviteForm, phone: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sub)' }}>Apartment (optional)</label>
            <select className="input-field" value={inviteForm.unitId}
              onChange={e => setInviteForm({ ...inviteForm, unitId: e.target.value })}>
              <option value="">— No apartment assigned —</option>
              {units.map(u => (
                <option key={u._id} value={u._id} disabled={(u.residentIds || []).length >= (u.maxOccupants || 7)}>
                  {unitLabel(u)}
                </option>
              ))}
            </select>
            {units.length === 0 && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>No apartments created yet — add them in the Units page first.</p>
            )}
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowInvite(false)} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Sending…' : '📨 Send Invitation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Bulk Invite Modal ───────────────────────────────────── */}
      <Modal open={showBulk} onClose={closeBulk} title="Bulk Invite Residents" size="lg">
        {!bulkResult ? (
          <div className="space-y-4">
            <div className="p-3 rounded-xl text-sm"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#818CF8' }}>
              <p className="font-semibold mb-1">Format — one resident per line:</p>
              <code className="text-xs" style={{ color: '#A5B4FC', fontFamily: 'monospace', whiteSpace: 'pre' }}>
                {'Name, email, phone, apartment\n'}
                {'Name, email, , 1A\n'}
                {'Name, email, +234..., 2B'}
              </code>
              <p className="text-xs mt-2" style={{ color: 'rgba(165,180,252,0.7)' }}>
                Phone and apartment are optional. Apartment must match an existing unit number (e.g. 1A, 2B, 3C).
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-sub)' }}>Resident list</label>
                {parsedPreview.length > 0 && (
                  <span className="text-xs font-semibold" style={{ color: '#34D399' }}>
                    {parsedPreview.length} resident{parsedPreview.length !== 1 ? 's' : ''} detected
                  </span>
                )}
              </div>
              <textarea
                className="input-field font-mono text-xs"
                rows={10}
                placeholder={'Chioma Obi, chioma@gmail.com, , 1A\nEmeka Nwosu, emeka@email.com, +2348012345678, 1B\nFatima Bello, fatima@yahoo.com, , 2A'}
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
              />
            </div>

            {/* Preview */}
            {parsedPreview.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
                <div className="px-4 py-2.5 text-xs font-semibold"
                  style={{ background: '#F8FAFC', color: 'var(--text-dim)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  Preview · first 5 rows
                </div>
                {parsedPreview.slice(0, 5).map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5"
                    style={{ borderTop: i > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: 'rgba(16,185,129,0.12)', color: '#34D399' }}>
                      {r.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-slate-900">{r.name}</span>
                      <span className="text-xs ml-2" style={{ color: 'var(--text-dim)' }}>{r.email}</span>
                    </div>
                    {r.phone && <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{r.phone}</span>}
                    {r.unitNumber && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(16,185,129,0.1)', color: '#34D399' }}>
                        Apt {r.unitNumber.toUpperCase()}
                      </span>
                    )}
                  </div>
                ))}
                {parsedPreview.length > 5 && (
                  <div className="px-4 py-2 text-xs text-center" style={{ color: 'var(--text-dim)', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    +{parsedPreview.length - 5} more
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={closeBulk} className="btn-outline flex-1">Cancel</button>
              <button onClick={handleBulkInvite} disabled={saving || parsedPreview.length === 0} className="btn-primary flex-1">
                {saving ? 'Sending…' : `📨 Send ${parsedPreview.length || ''} Invitations`}
              </button>
            </div>
          </div>
        ) : (
          /* Results screen */
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Sent',    count: bulkResult.sent?.length    || 0, color: '#34D399', bg: 'rgba(16,185,129,0.1)',  icon: CheckCircle },
                { label: 'Skipped', count: bulkResult.skipped?.length || 0, color: '#FBBF24', bg: 'rgba(251,191,36,0.1)', icon: AlertCircle },
                { label: 'Failed',  count: bulkResult.failed?.length  || 0, color: '#F87171', bg: 'rgba(239,68,68,0.1)',  icon: X },
              ].map(({ label, count, color, bg, icon: Icon }) => (
                <div key={label} className="rounded-xl p-4 text-center"
                  style={{ background: bg, border: `1px solid ${color}25` }}>
                  <Icon size={20} style={{ color, margin: '0 auto 8px' }} />
                  <div className="text-2xl font-bold text-slate-900">{count}</div>
                  <div className="text-xs font-medium mt-0.5" style={{ color }}>{label}</div>
                </div>
              ))}
            </div>

            {bulkResult.skipped?.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(251,191,36,0.15)' }}>
                <div className="px-4 py-2 text-xs font-semibold"
                  style={{ background: 'rgba(251,191,36,0.06)', color: '#FBBF24', borderBottom: '1px solid rgba(251,191,36,0.1)' }}>
                  Skipped — {bulkResult.skipped.length}
                </div>
                <div className="max-h-32 overflow-y-auto">
                  {bulkResult.skipped.map((r, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2 text-xs"
                      style={{ borderTop: i > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                      <span className="text-slate-600">{r.email}</span>
                      <span style={{ color: '#FBBF24' }}>{r.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={() => { setBulkResult(null); setBulkText(''); }} className="btn-outline flex-1">
                Invite More
              </button>
              <button onClick={closeBulk} className="btn-primary flex-1">Done</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Direct Add Modal ────────────────────────────────────── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Resident Directly">
        <p className="text-xs mb-4" style={{ color: 'var(--text-dim)' }}>
          Creates an account without sending an email. Default password: <code className="text-gold">Estate@123</code>
        </p>
        <form onSubmit={handleAdd} className="space-y-4">
          {[
            { key: 'name',  label: 'Full Name',     type: 'text',  req: true  },
            { key: 'email', label: 'Email Address', type: 'email', req: true  },
            { key: 'phone', label: 'Phone',         type: 'text',  req: false },
          ].map(({ key, label, type, req }) => (
            <div key={key}>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sub)' }}>
                {label}{req ? ' *' : ''}
              </label>
              <input className="input-field" type={type}
                value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                required={req} />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sub)' }}>Assign Unit (optional)</label>
            <select className="input-field" value={form.unitId}
              onChange={e => setForm({ ...form, unitId: e.target.value })}>
              <option value="">No unit</option>
              {units.map(u => (
                <option key={u._id} value={u._id} disabled={(u.residentIds || []).length >= (u.maxOccupants || 7)}>
                  {unitLabel(u)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Adding…' : 'Add Resident'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
