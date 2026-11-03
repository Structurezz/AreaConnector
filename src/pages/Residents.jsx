import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { residentAPI, unitAPI } from '../api';
import Modal from '../components/ui/Modal';
import {
  Users, Search, Plus, UserX, UserCheck,
  MailPlus, Upload, CheckCircle, AlertCircle, X, ChevronLeft,
  Home, Building2, DoorOpen, ChevronRight, Mail, Phone, Download, FileText, Trash2,
  Calendar, LayoutGrid, List,
} from 'lucide-react';
import Portal, { Z } from '../components/ui/Portal';
import PageHeader, { HEADER_BTN_PRIMARY, HEADER_BTN_GHOST } from '../components/dashboard/PageHeader';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import TablePager from '../components/dashboard/TablePager';
import ResidentsMobile from '../components/residents/ResidentsMobile';
import { parseBulkText, parseBulkFile, downloadTemplate, isValidEmail, emptyRow } from '../utils/bulkImport';

function unitLabel(u) {
  const base = u.block ? `Block ${u.block} · Apt ${u.unitNumber}` : `Apt ${u.unitNumber}`;
  const count = (u.residentIds || []).length;
  const max   = u.maxOccupants || 7;
  const full  = count >= max;
  return `${base} — ${count}/${max}${full ? ' (full)' : ''}`;
}

const hueOf = (name = '?') => (name.charCodeAt(0) * 37) % 360;
const initialsOf = (name = '?') => name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
const aptOf = (u) => (u ? `${u.block ? `${u.block} · ` : ''}Apt ${u.unitNumber}` : '');

function ResidentAvatar({ r, size = 44, ring = true }) {
  const h = hueOf(r.name);
  return (
    <span className="relative block flex-shrink-0" style={{ width: size, height: size }}>
      {r.profilePhoto ? (
        <img src={r.profilePhoto} alt="" className={`w-full h-full rounded-full object-cover ${ring ? 'ring-2 ring-white shadow' : ''}`} />
      ) : (
        <span className={`w-full h-full rounded-full flex items-center justify-center font-bold text-white ${ring ? 'ring-2 ring-white shadow' : ''}`}
          style={{ fontSize: Math.round(size * 0.34), background: `linear-gradient(135deg, hsl(${h} 70% 62%), hsl(${(h + 40) % 360} 70% 48%))` }}>
          {initialsOf(r.name)}
        </span>
      )}
      <span className={`absolute bottom-0 right-0 rounded-full border-2 border-white ${r.isActive ? 'bg-emerald-400' : 'bg-red-400'}`}
        style={{ width: Math.max(8, size * 0.28), height: Math.max(8, size * 0.28) }} />
    </span>
  );
}

function ResidentStatus({ r }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${r.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${r.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {r.isActive ? 'Active' : 'Suspended'}
    </span>
  );
}

function ResidentDrawer({ resident, units, onToggle, onAssignUnit, onClose, onOpenProfile }) {
  const [assignUnitId, setAssignUnitId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (resident) {
      const cur = resident.unitId?._id || (typeof resident.unitId === 'string' ? resident.unitId : '');
      setAssignUnitId(cur);
    }
  }, [resident]);

  useEffect(() => {
    if (!resident) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resident, onClose]);

  if (!resident) return null;
  const r = resident;
  const h = hueOf(r.name);
  const currentId = r.unitId?._id || (typeof r.unitId === 'string' ? r.unitId : '');
  const currentUnit = r.unitId?._id ? r.unitId : units.find(u => u._id === currentId);
  const picked = units.find(u => u._id === assignUnitId);
  const dirty = (assignUnitId || '') !== (currentId || '');

  const handleAssign = async () => {
    if (!assignUnitId && !window.confirm(`Remove ${resident.name} from their apartment? Residents need a unit to use AreaMates, so they'll be signed out until you assign one again.`)) return;
    setSaving(true);
    try {
      await onAssignUnit(r._id, assignUnitId || null);
    } finally {
      setSaving(false);
    }
  };

  const facts = [
    r.email && { icon: Mail, label: 'Email', value: r.email, href: `mailto:${r.email}`, color: '#8B5CF6' },
    r.phone && { icon: Phone, label: 'Phone', value: r.phone, href: `tel:${r.phone}`, color: '#0EA5E9' },
    r.createdAt && { icon: Calendar, label: 'Member since', value: format(new Date(r.createdAt), 'd MMM yyyy'), color: '#10B981' },
    { icon: Home, label: 'Apartment', value: currentUnit ? aptOf(currentUnit) : 'Not assigned', color: '#6366F1' },
  ].filter(Boolean);

  return (
    <Portal>
      <div className={`fixed inset-0 ${Z.drawer} flex justify-end`} onClick={onClose}>
        <div className="overlay-backdrop" aria-hidden="true" />
        <aside role="dialog" aria-modal="true" aria-label={`Resident ${r.name}`}
          className="animate-slide-in-right relative h-full w-full sm:w-[420px] bg-white flex flex-col"
          style={{ boxShadow: '-8px 0 40px rgba(15,23,42,0.18)' }}
          onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="relative overflow-hidden px-5 pt-4 pb-5 flex-shrink-0 border-b border-slate-100"
            style={{ background: r.isActive ? `linear-gradient(135deg, hsl(${h} 80% 96%) 0%, hsl(${(h + 40) % 360} 80% 97%) 55%, #FFFFFF 100%)` : 'linear-gradient(135deg, #FEF2F2 0%, #FFE4E6 55%, #FFFFFF 100%)' }}>
            <div className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full opacity-30"
              style={{ background: `radial-gradient(circle, ${r.isActive ? `hsl(${h} 70% 60%)` : '#F87171'}, transparent 70%)`, animation: 'dashFloat 14s ease-in-out infinite' }} />
            <div className="relative flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resident</span>
              <button onClick={onClose} aria-label="Close"
                className="w-8 h-8 -mr-1 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors">
                <X size={17} />
              </button>
            </div>
            <div className="relative flex items-center gap-4">
              <ResidentAvatar r={r} size={60} />
              <div className="min-w-0 flex-1">
                <h2 className="text-[17px] font-semibold text-slate-900 truncate">{r.name}</h2>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <ResidentStatus r={r} />
                  {currentUnit && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/80 text-indigo-700 border border-indigo-100">
                      <Home size={10} /> {aptOf(currentUnit)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            <div className="grid grid-cols-2 gap-2.5">
              {facts.map(({ icon: I, label, value, href, color }, i) => {
                const inner = (
                  <>
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: `${color}14`, color }}><I size={13} /></span>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
                    <div className="text-[13px] font-semibold text-slate-900 truncate mt-0.5">{value}</div>
                  </>
                );
                const cls = 'block rounded-xl border border-slate-200 p-3 min-w-0 transition-all hover:-translate-y-0.5 hover:shadow-card-md';
                const style = { animation: `dashRise 0.45s cubic-bezier(0.16,1,0.3,1) ${60 + i * 40}ms both` };
                return href
                  ? <a key={label} href={href} className={cls} style={style}>{inner}</a>
                  : <div key={label} className={cls} style={style}>{inner}</div>;
              })}
            </div>

            {/* Apartment assignment */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100" style={{ background: 'linear-gradient(135deg, #EEF2FF, transparent 70%)' }}>
                <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', boxShadow: '0 4px 10px -4px #6366F1' }}>
                  <Building2 size={13} className="text-white" />
                </span>
                <span className="text-[13px] font-semibold text-slate-900">Apartment</span>
              </div>
              <div className="p-4 space-y-3">
                <select className="input-field text-sm" value={assignUnitId} onChange={e => setAssignUnitId(e.target.value)}>
                  <option value="">— No apartment —</option>
                  {units.map(u => {
                    const cnt = (u.residentIds || []).length;
                    const mx = u.maxOccupants || 7;
                    const full = cnt >= mx && u._id !== currentId;
                    return (
                      <option key={u._id} value={u._id} disabled={full}>
                        {u.block ? `Block ${u.block} · Apt ${u.unitNumber}` : `Apt ${u.unitNumber}`} — {cnt}/{mx}{full ? ' (full)' : ''}
                      </option>
                    );
                  })}
                </select>
                {picked && (
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>Occupancy</span>
                      <span className="tabular-nums">{(picked.residentIds || []).length}/{picked.maxOccupants || 7}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, ((picked.residentIds || []).length / (picked.maxOccupants || 7)) * 100)}%`, background: 'linear-gradient(90deg, #818CF8, #6366F1)' }} />
                    </div>
                  </div>
                )}
                <button onClick={handleAssign} disabled={saving || !dirty}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 disabled:opacity-50 disabled:hover:bg-indigo-50">
                  {saving ? 'Saving…' : !dirty ? 'Current apartment' : assignUnitId ? 'Save assignment' : 'Remove from apartment'}
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 pt-3 pb-4 flex-shrink-0 border-t border-slate-100 bg-white flex gap-2">
            <button onClick={() => onOpenProfile(r)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-[9px] px-3 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', boxShadow: '0 8px 18px -10px #4F46E5' }}>
              Full profile <ChevronRight size={15} />
            </button>
            <button onClick={() => { onToggle(r); onClose(); }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-[9px] px-3 py-2.5 text-sm font-semibold border transition-colors ${r.isActive ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100' : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'}`}>
              {r.isActive ? <><UserX size={14} /> Suspend</> : <><UserCheck size={14} /> Activate</>}
            </button>
          </div>
        </aside>
      </div>
    </Portal>
  );
}

function OccupancyRail({ units, unitStats, totalAll, onInvite, onBulk }) {
  const blocks = useMemo(() => {
    const m = new Map();
    for (const u of units) {
      const k = u.block || '—';
      const b = m.get(k) || { name: k, total: 0, occupied: 0 };
      b.total++;
      if ((u.residentIds || []).length) b.occupied++;
      m.set(k, b);
    }
    return [...m.values()].sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { numeric: true }));
  }, [units]);
  const pct = unitStats.total ? Math.round((unitStats.occupied / unitStats.total) * 100) : 0;
  const R = 34, C = 2 * Math.PI * R;
  return (
    <aside className="hidden xl:block space-y-4 sticky top-0">
      <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 p-4" style={{ animationDelay: '380ms' }}>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Occupancy</div>
        <div className="mt-3 flex items-center gap-4">
          <span className="relative w-[84px] h-[84px] flex-shrink-0">
            <svg width="84" height="84" viewBox="0 0 84 84" className="-rotate-90">
              <defs><linearGradient id="resOcc" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#A78BFA" /><stop offset="100%" stopColor="#6366F1" /></linearGradient></defs>
              <circle cx="42" cy="42" r={R} fill="none" stroke="#EEF2FF" strokeWidth="7" />
              <circle cx="42" cy="42" r={R} fill="none" stroke="url(#resOcc)" strokeWidth="7" strokeLinecap="round" strokeDasharray={C}
                style={{ strokeDashoffset: C * (1 - pct / 100), '--len': C, '--to': C * (1 - pct / 100), animation: 'dashDraw 1.3s cubic-bezier(0.16,1,0.3,1) 0.3s both' }} />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[18px] font-semibold text-slate-900 tabular-nums leading-none">{pct}%</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">occupied</span>
            </span>
          </span>
          <div className="space-y-1.5 text-[12px] text-slate-600">
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500" /><b className="font-semibold text-slate-900 tabular-nums">{unitStats.occupied}</b> of {unitStats.total} units</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /><b className="font-semibold text-slate-900 tabular-nums">{totalAll}</b> residents</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" /><b className="font-semibold text-slate-900 tabular-nums">{unitStats.open}</b> open spaces</div>
          </div>
        </div>
        {blocks.length > 1 && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">By block</div>
            {blocks.slice(0, 8).map((b, i) => (
              <div key={b.name}>
                <div className="flex justify-between text-[11.5px] mb-1">
                  <span className="font-medium text-slate-700">{b.name === '—' ? 'No block' : `Block ${b.name}`}</span>
                  <span className="text-slate-400 tabular-nums">{b.occupied}/{b.total}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${b.total ? (b.occupied / b.total) * 100 : 0}%`, background: 'linear-gradient(90deg, #A78BFA, #6366F1)', transformOrigin: 'left', animation: `dashGrowX 0.9s cubic-bezier(0.16,1,0.3,1) ${400 + i * 60}ms both` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dash-rise rounded-2xl p-4 border border-indigo-100" style={{ background: 'linear-gradient(135deg, #EEF2FF, #F5F3FF 60%, #FFFFFF)', animationDelay: '440ms' }}>
        <div className="text-[13px] font-semibold text-slate-900">Grow your community</div>
        <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">Invite residents by email — they get login details instantly. Moving a whole estate? Upload a CSV.</p>
        <div className="mt-3 flex gap-2">
          <button onClick={onInvite} className="flex-1 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-lg text-white" style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
            <MailPlus size={13} /> Invite
          </button>
          <button onClick={onBulk} className="flex-1 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50">
            <Upload size={13} /> Bulk
          </button>
        </div>
      </div>
    </aside>
  );
}

function ResidentCard({ r, i, selected, onOpen, onToggle }) {
  const h = hueOf(r.name);
  return (
    <div onClick={() => onOpen(r)}
      className="dash-rise group cursor-pointer rounded-2xl bg-white border overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-card-md"
      style={{ animationDelay: `${480 + i * 30}ms`, borderColor: selected ? '#6366F1' : '#E2E8F0', boxShadow: selected ? '0 0 0 3px #6366F122' : undefined }}>
      <div className="h-10 relative" style={{ background: r.isActive ? `linear-gradient(120deg, hsl(${h} 80% 92%), hsl(${(h + 40) % 360} 80% 95%))` : 'linear-gradient(120deg, #FEE2E2, #FFF1F2)' }}>
        <span className="absolute top-2.5 right-2.5"><ResidentStatus r={r} /></span>
      </div>
      <div className="px-4 pb-4 -mt-4">
        <ResidentAvatar r={r} size={40} />
        <div className="mt-2 text-[14px] font-semibold text-slate-900 truncate">{r.name}</div>
        <div className="text-[11px] text-slate-400">{r.createdAt ? `Joined ${format(new Date(r.createdAt), 'MMM yyyy')}` : ' '}</div>
        <div className="mt-3 space-y-1.5">
          <div className="text-[12px] text-slate-600 truncate flex items-center gap-2"><Mail size={12} className="text-slate-300 flex-shrink-0" />{r.email}</div>
          <div className="text-[12px] text-slate-600 truncate flex items-center gap-2"><Phone size={12} className="text-slate-300 flex-shrink-0" />{r.phone || 'No phone'}</div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          {r.unitId ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700"><Home size={11} />{aptOf(r.unitId)}</span>
          ) : <span className="text-[11px] italic text-slate-400">No apartment</span>}
          <button onClick={e => { e.stopPropagation(); onToggle(r); }} title={r.isActive ? 'Suspend' : 'Activate'}
            className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${r.isActive ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}>
            {r.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

export default function ManagerResidents() {
  const [residents, setResidents]   = useState([]);
  const [units, setUnits]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  // Residents with no unit can't sign in; ?filter=no_unit comes from the "waiting for a unit" notification
  const [noUnitOnly, setNoUnitOnly] = useState(() => new URLSearchParams(window.location.search).get('filter') === 'no_unit');
  const [noUnitCount, setNoUnitCount] = useState(0);
  const [page, setPage]             = useState(1);
  const [limit, setLimit]           = useState(PAGE_SIZE);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [totalAll, setTotalAll]     = useState(0);

  // modals
  const [showAdd, setShowAdd]             = useState(false);
  const [showInvite, setShowInvite]       = useState(false);
  const [showBulk, setShowBulk]           = useState(false);

  // forms
  const [form, setForm]             = useState({ name: '', email: '', phone: '', unitId: '' });
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', phone: '', unitId: '' });
  const [bulkRows, setBulkRows]     = useState(() => [emptyRow(), emptyRow(), emptyRow()]);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkFile, setBulkFile]     = useState('');
  const [parsingFile, setParsingFile] = useState(false);

  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState(() => { try { return localStorage.getItem('residents:view') || 'list'; } catch { return 'list'; } });
  const changeView = (v) => { setView(v); try { localStorage.setItem('residents:view', v); } catch {} };
  const navigate = useNavigate();

  const load = async (p = page, q = search, lim = limit, nu = noUnitOnly) => {
    setLoading(true);
    try {
      const [r, u] = await Promise.all([
        residentAPI.getAll({ page: p, limit: lim, search: q || undefined, filter: nu ? 'no_unit' : undefined }),
        unitAPI.getAll(),
      ]);
      setResidents(r.data.data);
      const pg = r.data.pagination || { total: r.data.data.length, pages: 1 };
      setPagination(pg);
      if (!q && !nu) setTotalAll(pg.total);
      setNoUnitCount(r.data.noUnitCount || 0);
      setUnits(u.data.data);
    } catch {
      toast.error('Failed to load residents');
    } finally {
      setLoading(false);
    }
  };

  const handlePage   = (p) => { setPage(p); load(p, search); document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleLimit  = (l) => { setLimit(l); setPage(1); load(1, search, l); };
  const handleSearch = (q) => { setSearch(q); setPage(1); load(1, q); };

  useEffect(() => { load(1, ''); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const toggleNoUnit = (on) => { setNoUnitOnly(on); setPage(1); load(1, search, limit, on); };

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
    const list = validBulkRows;
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

  const closeBulk = () => { setShowBulk(false); resetBulkRows(); setBulkResult(null); setBulkFile(''); };

  const handleBulkFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setParsingFile(true);
    try {
      const rows = await parseBulkFile(file);
      if (!rows.length) {
        toast.error('No residents found — make sure the file has Name, Email, Phone and Unit columns');
        return;
      }
      setBulkRows(rows);
      setBulkFile(file.name);
      toast.success(`${rows.length} resident${rows.length !== 1 ? 's' : ''} loaded from ${file.name}`);
    } catch (err) {
      console.error('[bulkFile]', err);
      toast.error('Could not read that file. Use a CSV or a text-based PDF.');
    } finally {
      setParsingFile(false);
    }
  };

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
      load(page, search);
    } catch {
      toast.error('Action failed');
    }
  };

  const handleAssignUnit = async (residentId, unitId) => {
    try {
      await residentAPI.assignUnit(residentId, unitId);
      toast.success(unitId ? 'Apartment assigned' : 'Removed from apartment');
      setSelected(null);
      load(page, search);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign');
    }
  };

  const unitNumbers = useMemo(() => new Set(units.map(u => (u.unitNumber || '').toUpperCase())), [units]);
  const isBlankRow = (r) => !r.name.trim() && !r.email.trim() && !r.phone.trim() && !r.unitNumber.trim();
  const rowIssues = (r) => ({
    name:  !r.name.trim(),
    email: !isValidEmail(r.email.trim()),
    unit:  !r.unitNumber.trim() || !unitNumbers.has(r.unitNumber.trim().toUpperCase()),
  });
  const validBulkRows = bulkRows
    .filter(r => !isBlankRow(r) && r.name.trim() && isValidEmail(r.email.trim()) && !rowIssues(r).unit)
    .map(r => ({ name: r.name.trim(), email: r.email.trim(), phone: r.phone.trim(), unitNumber: r.unitNumber.trim() }));
  const invalidBulkCount = bulkRows.filter(r => !isBlankRow(r) && (rowIssues(r).name || rowIssues(r).email || rowIssues(r).unit)).length;

  const resetBulkRows = () => setBulkRows([emptyRow(), emptyRow(), emptyRow()]);
  const updateBulkRow = (i, field, value) =>
    setBulkRows(rows => rows.map((r, j) => (j === i ? { ...r, [field]: value } : r)));
  const removeBulkRow = (i) =>
    setBulkRows(rows => (rows.length > 1 ? rows.filter((_, j) => j !== i) : [emptyRow()]));
  // Pasting several lines (e.g. copied from a spreadsheet) into any cell fills multiple rows
  const handleBulkPaste = (i, e) => {
    const text = e.clipboardData.getData('text');
    if (!/\n/.test(text.trim())) return;
    const parsed = parseBulkText(text);
    if (!parsed.length) return;
    e.preventDefault();
    setBulkRows(rows => [...[...rows.slice(0, i), ...parsed, ...rows.slice(i + 1)].filter(r => !isBlankRow(r)), emptyRow()]);
  };

  const unitStats = useMemo(() => {
    let occupied = 0, capacity = 0, housed = 0;
    for (const u of units) {
      const n = (u.residentIds || []).length;
      if (n > 0) occupied++;
      housed += n;
      capacity += u.maxOccupants || 7;
    }
    return { total: units.length, occupied, open: Math.max(0, capacity - housed) };
  }, [units]);

  const openResident = (r) => {
    if (window.innerWidth < 640) navigate(`/residents/${r._id}`, { state: { resident: r, units } });
    else setSelected(r);
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Desktop ── */}
      <div className="hidden lg:block space-y-5 max-w-[1400px] mx-auto">
        <PageHeader
          title="Residents"
          subtitle="Everyone who calls the estate home"
          actions={<>
            <button onClick={() => setShowBulk(true)} className={HEADER_BTN_GHOST}><Upload size={14} /> Bulk invite</button>
            <button onClick={() => setShowInvite(true)} className={HEADER_BTN_GHOST}><MailPlus size={14} /> Invite</button>
            <button onClick={() => setShowAdd(true)} className={HEADER_BTN_PRIMARY}><Plus size={15} /> Add resident</button>
          </>}
          stats={[
            { label: 'Residents',   value: totalAll,           Icon: Users,     color: '#6366F1', hint: 'Registered members' },
            { label: 'Apartments',  value: unitStats.total,    Icon: Building2, color: '#8B5CF6', hint: 'Units in the estate' },
            { label: 'Occupied',    value: unitStats.occupied, Icon: Home,      color: '#10B981', hint: 'Units with residents' },
            { label: 'Open spaces', value: unitStats.open,     Icon: DoorOpen,  color: '#F59E0B', hint: 'Room left across units' },
          ]}
        />

        {noUnitCount > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white px-4 py-3 flex flex-wrap items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0"><AlertCircle size={17} /></span>
            <div className="flex-1 min-w-[200px]">
              <p className="text-[13.5px] font-semibold text-amber-900">{noUnitCount} resident{noUnitCount !== 1 ? 's' : ''} can't sign in — no unit assigned</p>
              <p className="text-[12px] text-amber-800/80">Residents must belong to a unit to use AreaMates. Open each one and assign their apartment.</p>
            </div>
            <button onClick={() => toggleNoUnit(!noUnitOnly)}
              className="h-9 px-3.5 rounded-xl text-[12.5px] font-semibold bg-amber-500 text-white hover:bg-amber-600">
              {noUnitOnly ? 'Show everyone' : 'Show them'}
            </button>
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px] items-start">
          <div className="space-y-4 min-w-0">
            {/* Toolbar */}
            <div className="dash-rise flex items-center gap-2.5" style={{ animationDelay: '360ms' }}>
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="w-full rounded-xl bg-white border border-slate-200 pl-10 pr-9 py-2.5 text-sm outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  placeholder="Search by name or email…"
                  value={search} onChange={e => handleSearch(e.target.value)} />
                {search && (
                  <button onClick={() => handleSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={15} />
                  </button>
                )}
              </div>
              <div className="flex items-center p-1 rounded-xl bg-white border border-slate-200">
                {[['list', List, 'List'], ['cards', LayoutGrid, 'Cards']].map(([key, I, label]) => (
                  <button key={key} onClick={() => changeView(key)} title={`${label} view`}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all ${view === key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                    <I size={13} /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`dash-rise ${view === 'list' || loading || residents.length === 0 ? 'rounded-2xl bg-white border border-slate-200/70 overflow-hidden' : ''}`} style={{ animationDelay: '420ms' }}>
              {loading ? (
                <div className="divide-y divide-slate-100">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4">
                      <div className="skeleton w-10 h-10 rounded-full" />
                      <div className="flex-1 space-y-2"><div className="skeleton h-3 w-44 rounded" /><div className="skeleton h-2.5 w-28 rounded" /></div>
                      <div className="skeleton h-6 w-24 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : residents.length === 0 ? (
                <div className="flex flex-col items-center py-20 gap-3 text-center">
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <span className="dash-ripple absolute inset-0 rounded-full border-2 border-indigo-200" />
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #818CF8, #4F46E5)' }}>
                      <Users size={28} className="text-white" />
                    </div>
                  </div>
                  <p className="font-semibold text-slate-800 mt-2">{search ? `No residents match “${search}”` : 'No residents yet'}</p>
                  <p className="text-sm text-slate-400">Invite residents and they'll appear here.</p>
                  {!search && (
                    <button onClick={() => setShowInvite(true)} className="btn-primary gap-2 mt-2"><MailPlus size={14} /> Send an invite</button>
                  )}
                </div>
              ) : view === 'cards' ? (
                <div className="grid gap-3.5 grid-cols-2 2xl:grid-cols-3">
                  {residents.map((r, i) => (
                    <ResidentCard key={r._id} r={r} i={i} selected={selected?._id === r._id} onOpen={openResident} onToggle={handleToggle} />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-[2fr_1.6fr_1.1fr_0.9fr_auto] gap-4 px-5 py-3 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Resident</span><span>Contact</span><span>Apartment</span><span>Status</span><span className="w-[72px]" />
                  </div>
                  {residents.map((r, i) => {
                    const sel = selected?._id === r._id;
                    return (
                      <div key={r._id} onClick={() => openResident(r)}
                        className="dash-rise group grid grid-cols-[2fr_1.6fr_1.1fr_0.9fr_auto] gap-4 items-center px-5 py-3 border-t border-slate-100 first-of-type:border-0 cursor-pointer transition-colors hover:bg-slate-50/80"
                        style={{ animationDelay: `${460 + i * 30}ms`, background: sel ? '#EEF2FF' : undefined, boxShadow: `inset 3px 0 0 ${sel ? '#6366F1' : 'transparent'}` }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="block flex-shrink-0 transition-transform duration-300 group-hover:scale-105"><ResidentAvatar r={r} size={36} /></span>
                          <div className="min-w-0">
                            <div className="font-semibold text-[13px] text-slate-900 truncate">{r.name}</div>
                            {r.createdAt && <div className="text-[11px] text-slate-400">Joined {format(new Date(r.createdAt), 'MMM yyyy')}</div>}
                          </div>
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-xs text-slate-600 truncate flex items-center gap-1.5"><Mail size={11} className="text-slate-300 flex-shrink-0" />{r.email}</div>
                          {r.phone && <div className="text-xs text-slate-400 truncate flex items-center gap-1.5"><Phone size={11} className="text-slate-300 flex-shrink-0" />{r.phone}</div>}
                        </div>
                        <div>
                          {r.unitId ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700">
                              <Home size={11} />{aptOf(r.unitId)}
                            </span>
                          ) : (
                            <span className="text-xs italic text-slate-400">No apartment</span>
                          )}
                        </div>
                        <div><ResidentStatus r={r} /></div>
                        <div className="w-[72px] flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleToggle(r)} title={r.isActive ? 'Suspend' : 'Activate'} aria-label={r.isActive ? 'Suspend' : 'Activate'}
                            className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${r.isActive ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}>
                            {r.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                          </button>
                          <ChevronRight size={16} className="text-slate-300 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              {!loading && residents.length > 0 && (
                <div className={view === 'cards' ? 'mt-4 rounded-2xl bg-white border border-slate-200/70 overflow-hidden' : ''}>
                  <TablePager page={page} pages={pagination.pages} total={pagination.total} limit={limit}
                    onPage={handlePage} onLimit={handleLimit} accent="#6366F1" />
                </div>
              )}
            </div>
          </div>

          <OccupancyRail units={units} unitStats={unitStats} totalAll={totalAll}
            onInvite={() => setShowInvite(true)} onBulk={() => setShowBulk(true)} />
        </div>
      </div>

      {/* ── Phone / tablet ── */}
      <div className="lg:hidden space-y-4">
        {noUnitCount > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white px-4 py-3 flex flex-wrap items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0"><AlertCircle size={17} /></span>
            <div className="flex-1 min-w-[200px]">
              <p className="text-[13.5px] font-semibold text-amber-900">{noUnitCount} resident{noUnitCount !== 1 ? 's' : ''} can't sign in — no unit assigned</p>
              <p className="text-[12px] text-amber-800/80">Residents must belong to a unit to use AreaMates. Open each one and assign their apartment.</p>
            </div>
            <button onClick={() => toggleNoUnit(!noUnitOnly)}
              className="h-9 px-3.5 rounded-xl text-[12.5px] font-semibold bg-amber-500 text-white hover:bg-amber-600">
              {noUnitOnly ? 'Show everyone' : 'Show them'}
            </button>
          </div>
        )}
        <ResidentsMobile
          residents={residents} loading={loading} search={search} onSearch={handleSearch}
          totalAll={totalAll} unitStats={unitStats}
          page={page} pagination={pagination} limit={limit} onPage={handlePage}
          onOpen={openResident} onToggle={handleToggle}
          onInvite={() => setShowInvite(true)} onBulk={() => setShowBulk(true)} onAdd={() => setShowAdd(true)}
        />
      </div>

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
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sub)' }}>Apartment *</label>
            <select className="input-field" value={inviteForm.unitId} required
              onChange={e => setInviteForm({ ...inviteForm, unitId: e.target.value })}>
              <option value="">— Choose their apartment —</option>
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
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold mb-1">Template — Name, Email, Phone, Unit</p>
                  <p className="text-xs" style={{ color: 'rgba(129,140,248,0.85)' }}>
                    Upload a CSV or PDF with these columns, or type residents into the table below.
                    Unit is required and must match an existing unit number (e.g. 1A, 2B) — residents can't sign in without one. Phone is optional.
                  </p>
                </div>
                <button type="button" onClick={downloadTemplate}
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex-shrink-0"
                  style={{ background: 'rgba(99,102,241,0.15)', color: '#6366F1' }}>
                  <Download size={13} /> Template
                </button>
              </div>
            </div>

            <label className="flex items-center gap-3 p-4 rounded-xl cursor-pointer"
              style={{ border: '1.5px dashed rgba(16,185,129,0.45)', background: 'rgba(16,185,129,0.05)' }}>
              <input type="file" accept=".csv,.pdf,text/csv,application/pdf" className="hidden"
                onChange={handleBulkFile} disabled={parsingFile} />
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
                {bulkFile ? <FileText size={18} /> : <Upload size={18} />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {parsingFile ? 'Reading file…' : bulkFile || 'Upload CSV or PDF'}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                  {bulkFile ? 'Loaded into the table below — review or edit before sending. Click to replace.' : 'Columns: Name, Email, Phone, Unit'}
                </p>
              </div>
            </label>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-sub)' }}>Resident list</label>
                <span className="text-xs font-semibold">
                  {validBulkRows.length > 0 && (
                    <span style={{ color: '#10B981' }}>
                      {validBulkRows.length} ready
                    </span>
                  )}
                  {invalidBulkCount > 0 && (
                    <span className="ml-2" style={{ color: '#EF4444' }}>{invalidBulkCount} incomplete</span>
                  )}
                </span>
              </div>

              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                <div className="hidden md:grid grid-cols-[1.2fr_1.5fr_1fr_0.7fr_32px] gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide"
                  style={{ background: '#F8FAFC', color: 'var(--text-dim)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <span>Name *</span><span>Email *</span><span>Phone</span><span>Unit *</span><span />
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {bulkRows.map((r, i) => {
                    const blank = isBlankRow(r);
                    const bad = rowIssues(r);
                    const cell = (flag) => `input-field !py-1.5 !px-2.5 text-sm${!blank && flag ? ' !border-red-400' : ''}`;
                    return (
                      <div key={i} className="grid grid-cols-2 md:grid-cols-[1.2fr_1.5fr_1fr_0.7fr_32px] gap-2 px-3 py-2 items-center"
                        style={{ borderTop: i > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                        <input className={cell(bad.name)} placeholder="Name" value={r.name}
                          onChange={e => updateBulkRow(i, 'name', e.target.value)} onPaste={e => handleBulkPaste(i, e)} />
                        <input className={cell(bad.email)} placeholder="Email" type="email" value={r.email}
                          onChange={e => updateBulkRow(i, 'email', e.target.value)} onPaste={e => handleBulkPaste(i, e)} />
                        <input className={cell(false)} placeholder="Phone" type="tel" value={r.phone}
                          onChange={e => updateBulkRow(i, 'phone', e.target.value)} onPaste={e => handleBulkPaste(i, e)} />
                        <div className="flex items-center gap-2 md:contents">
                          <input className={`${cell(bad.unit)} flex-1 min-w-0 uppercase`} placeholder="Unit" list="bulk-unit-options"
                            title={!blank && bad.unit ? (r.unitNumber.trim() ? 'No unit with this number' : 'Unit is required') : undefined}
                            value={r.unitNumber}
                            onChange={e => updateBulkRow(i, 'unitNumber', e.target.value)} onPaste={e => handleBulkPaste(i, e)} />
                          <button type="button" onClick={() => removeBulkRow(i)} aria-label="Remove row"
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-red-50"
                            style={{ color: '#EF4444' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <datalist id="bulk-unit-options">
                  {units.map(u => <option key={u._id} value={u.unitNumber}>{unitLabel(u)}</option>)}
                </datalist>
                <div className="flex items-center justify-between px-3 py-2"
                  style={{ background: '#F8FAFC', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <button type="button" onClick={() => setBulkRows(rows => [...rows, emptyRow()])}
                    className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#10B981' }}>
                    <Plus size={14} /> Add row
                  </button>
                  <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
                    Tip: paste rows copied from a spreadsheet into any box
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={closeBulk} className="btn-outline flex-1">Cancel</button>
              <button onClick={handleBulkInvite} disabled={saving || validBulkRows.length === 0} className="btn-primary flex-1">
                {saving ? 'Sending…' : `📨 Send ${validBulkRows.length || ''} Invitations`}
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
              <button onClick={() => { setBulkResult(null); resetBulkRows(); setBulkFile(''); }} className="btn-outline flex-1">
                Invite More
              </button>
              <button onClick={closeBulk} className="btn-primary flex-1">Done</button>
            </div>
          </div>
        )}
      </Modal>

      <ResidentDrawer
        resident={selected}
        units={units}
        onToggle={handleToggle}
        onAssignUnit={handleAssignUnit}
        onClose={() => setSelected(null)}
        onOpenProfile={(r) => { setSelected(null); navigate(`/residents/${r._id}`, { state: { resident: r, units } }); }}
      />

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
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sub)' }}>Unit *</label>
            <select className="input-field" value={form.unitId} required
              onChange={e => setForm({ ...form, unitId: e.target.value })}>
              <option value="">— Choose their unit —</option>
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
