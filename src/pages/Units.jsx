import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '../context/SiteContext';
import { blockWord, blockName, lower, withAn, unitTypeLabel } from '../utils/siteTypes';
import { unitAPI, residentAPI } from '../api';
import Spinner, { PageLoader } from '../components/ui/Spinner';
import SidePanel from '../components/payments/SidePanel';
import useCountUp from '../hooks/useCountUp';
import {
  Home, Plus, Trash2, Users, UserPlus, UserMinus, Search, CheckCircle2, AlertCircle, Wallet, Clock, Building2, Store,
  Briefcase, LayoutGrid, Rows3, Map as MapIcon, Pencil, Layers, ArrowRight, X, Check, Sparkles, DoorOpen, ListPlus,
  ChevronDown, Receipt, Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TYPES = [
  { v: 'apartment', label: 'Apartment', icon: Building2 },
  { v: 'house',     label: 'House',     icon: Home },
  { v: 'shop',      label: 'Shop',      icon: Store },
  { v: 'office',    label: 'Office',    icon: Briefcase },
];
const TYPE_ICON = Object.fromEntries(TYPES.map((t) => [t.v, t.icon]));
const NGN = (n) => `₦${Math.round(n || 0).toLocaleString()}`;
const NGN_SHORT = (n) => {
  const v = n || 0;
  if (v >= 1e6) return `₦${(v / 1e6).toFixed(v >= 1e7 ? 0 : 2).replace(/\.?0+$/, '')}m`;
  if (v >= 1e3) return `₦${(v / 1e3).toFixed(v >= 1e5 ? 0 : 1).replace(/\.0$/, '')}k`;
  return `₦${v}`;
};
const shortDate = (d) => new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
const occ = (u) => (u.residentIds || []).filter((r) => r?._id);

// Site words for this page (estate output stays exactly as before)
function useWords() {
  const site = useSite();
  const T = site.terms || {};
  const E = site.isEstate;
  const unit = lower(T.unit), units = lower(T.units), resident = lower(T.member), residents = lower(T.members);
  const Block = blockWord(T);
  return {
    site, E, T,
    Unit: T.unit, Units: T.units, unit, units,
    Resident: T.member, Residents: T.members, resident, residents,
    Block, block: lower(Block),
    Dues: E ? 'Dues' : T.dues, dues: E ? 'dues' : lower(T.dues),
    nUnits: (n) => `${n} ${n === 1 ? unit : units}`,
    nRes: (n) => `${n} ${n === 1 ? resident : residents}`,
    // Unit type shown to the manager: non-estates see their own word for 'apartment'
    type: (v) => (E ? v : unitTypeLabel(v, site.type, v === 'apartment' ? T.unit : v)),
    typeLabel: (t) => (E ? t.label : unitTypeLabel(t.v, site.type, t.v === 'apartment' ? T.unit : t.label)),
    typePlural: (t) => {
      if (E) return `${t.label}s`;
      if (t.v === 'apartment') return T.units;
      const l = unitTypeLabel(t.v, site.type, t.label);
      return /s$/.test(l) || / quarters$/i.test(l) ? l : /y$/.test(l) ? `${l.slice(0, -1)}ies` : `${l}s`;
    },
  };
}

// What a unit's dues look like, from its residents' real bills (server: utils/unitDues)
function duesView(u, W) {
  const d = u.dues || { status: 'no_bills' };
  const owedTotal = d.outstanding > d.overdueAmount ? ` · ${NGN(d.outstanding)} owed in total` : '';
  switch (d.status) {
    case 'overdue': return { key: 'overdue', tone: 'red', Icon: AlertCircle, label: `${NGN(d.overdueAmount)} overdue`, detail: `${d.overdueCount} bill${d.overdueCount > 1 ? 's' : ''} past due${owedTotal}` };
    case 'owing': return { key: 'owing', tone: 'amber', Icon: Clock, label: `${NGN(d.outstanding)} owing`, detail: d.nextDue ? `Next: ${d.nextDue.title}, due ${shortDate(d.nextDue.dueDate)}` : `${d.owingCount} unpaid bill${d.owingCount > 1 ? 's' : ''}` };
    case 'clear': return { key: 'clear', tone: 'green', Icon: CheckCircle2, label: 'All bills paid', detail: d.lastPaidAt ? `Last paid ${shortDate(d.lastPaidAt)} · ${NGN(d.paidThisYear)} this year` : `${d.paidCount} bill${d.paidCount === 1 ? '' : 's'} paid` };
    case 'exempt': return { key: 'exempt', tone: 'slate', Icon: Wallet, label: `Exempt from ${W.dues}`, detail: 'Marked exempt by management' };
    case 'no_residents': return { key: 'none', tone: 'slate', Icon: Wallet, label: `No ${W.residents} to bill`, detail: `Assign ${W.residents} to start billing` };
    default: return { key: 'none', tone: 'slate', Icon: Wallet, label: 'No bills yet', detail: 'Create a bill on the Payments page' };
  }
}
const TONE = {
  red:   { fg: '#DC2626', strong: '#B91C1C', bg: '#FEF2F2', bd: '#FECACA', tile: '#F87171' },
  amber: { fg: '#D97706', strong: '#B45309', bg: '#FFFBEB', bd: '#FDE68A', tile: '#FBBF24' },
  green: { fg: '#10B981', strong: '#047857', bg: '#ECFDF5', bd: '#A7F3D0', tile: '#34D399' },
  slate: { fg: '#94A3B8', strong: '#64748B', bg: '#F8FAFC', bd: '#E2E8F0', tile: '#CBD5E1' },
};

function Avatar({ r, size = 26, ring = true }) {
  const cls = `rounded-full flex-shrink-0 object-cover ${ring ? 'ring-2 ring-white' : ''}`;
  return r?.profilePhoto
    ? <img src={r.profilePhoto} alt="" className={cls} style={{ width: size, height: size }} title={r.name} />
    : <span className={`${cls} flex items-center justify-center font-bold text-emerald-700`} title={r?.name}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.4), background: 'linear-gradient(135deg, #D1FAE5, #ECFDF5)' }}>{(r?.name || '?')[0]?.toUpperCase()}</span>;
}

/* ── Stat card (dashboard style: tinted gradient + count-up) ─────────── */
function Stat({ i, label, value, display, Icon, color, sub, children }) {
  const n = useCountUp(typeof value === 'number' ? value : 0);
  return (
    <div className="dash-rise relative overflow-hidden rounded-2xl p-4 border min-w-0" style={{ animationDelay: `${i * 60}ms`, background: `linear-gradient(140deg, ${color}17 0%, #FFFFFF 55%)`, borderColor: `${color}2E` }}>
      <span className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full pointer-events-none" style={{ background: `${color}12` }} />
      <div className="relative flex items-center justify-between">
        <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 14px -6px ${color}` }}><Icon size={15} className="text-white" /></span>
        {children}
      </div>
      <div className="relative mt-3 text-[24px] font-semibold leading-none text-slate-900 tabular-nums" style={{ letterSpacing: '-0.03em' }}>{display ?? n}</div>
      <div className="relative mt-1 text-[12px] font-medium text-slate-500">{label}</div>
      {sub && <div className="relative mt-0.5 text-[11px] text-slate-400 truncate">{sub}</div>}
    </div>
  );
}

function MiniRing({ pct, color }) {
  const r = 13, c = 2 * Math.PI * r;
  return (
    <svg width="34" height="34" className="-rotate-90"><circle cx="17" cy="17" r={r} fill="none" stroke="#E2E8F0" strokeWidth="4" />
      <circle cx="17" cy="17" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} style={{ transition: 'stroke-dashoffset .8s ease' }} /></svg>
  );
}

/* ── Grid card ─────────────────────────────────────────────────────── */
// Hospitals: restricted wards (ICU…) — visitors need care-team approval
function RestrictedBadge({ u }) {
  if (!u?.restricted) return null;
  return <span title="Restricted — visitors need care-team approval" className="inline-flex items-center gap-0.5 ml-1.5 align-middle text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600"><Lock size={9} /> Restricted</span>;
}

function UnitCard({ u, onOpen, i }) {
  const W = useWords();
  const { site } = W;
  const people = occ(u);
  const count = people.length;
  const max = u.maxOccupants || 7;
  const full = count >= max;
  const dues = duesView(u, W);
  const tone = TONE[dues.tone];
  const TypeIcon = TYPE_ICON[u.type] || Building2;
  const state = count === 0 ? ['Vacant', '#94A3B8', '#F1F5F9'] : full ? ['Full', '#DC2626', '#FEF2F2'] : ['Occupied', '#047857', '#ECFDF5'];
  return (
    <button onClick={onOpen} className="dash-tile dash-rise group text-left rounded-2xl bg-white border border-slate-200/80 p-4 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all"
      style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
      <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: tone.tile }} />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:-rotate-6" style={{ background: 'linear-gradient(135deg, #10B981, #047857)', boxShadow: '0 6px 14px -8px #047857' }}>
            <TypeIcon size={16} className="text-white" />
          </span>
          <div className="min-w-0">
            <p className="text-[16px] font-semibold text-slate-900 leading-tight truncate" style={{ letterSpacing: '-0.02em' }}>{u.unitNumber}<RestrictedBadge u={u} /></p>
            <p className="text-[11px] text-slate-400 capitalize">{u.block ? `${blockName(u.block, site.terms)} · ` : ''}{W.type(u.type)}</p>
          </div>
        </div>
        <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: state[2], color: state[1] }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: state[1] }} />{state[0]}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${(count / max) * 100}%`, background: full ? '#F87171' : '#10B981' }} /></div>
        <span className="text-[11.5px] font-semibold text-slate-700 tabular-nums">{count}<span className="text-slate-400 font-normal">/{max}</span></span>
      </div>

      <div className="mt-3 min-h-[26px] flex items-center">
        {count > 0 ? (
          <>
            <div className="flex -space-x-2">{people.slice(0, 4).map((r) => <Avatar key={r._id} r={r} />)}</div>
            <span className="ml-2 text-[11.5px] text-slate-500 truncate">{count > 4 ? `+${count - 4} more` : people.map((r) => r.name?.split(' ')[0]).join(', ')}</span>
          </>
        ) : <span className="text-[11.5px] text-slate-300 flex items-center gap-1.5"><UserPlus size={12} /> Assign {W.residents}</span>}
      </div>

      <div className="mt-3 rounded-xl px-2.5 py-2 flex items-center gap-2" style={{ background: tone.bg }}>
        <dues.Icon size={13} style={{ color: tone.fg }} className="flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-[12px] font-semibold truncate" style={{ color: tone.strong }}>{dues.label}</p>
          <p className="text-[10.5px] text-slate-500 truncate">{dues.detail}</p>
        </div>
      </div>
    </button>
  );
}

/* ── A resident's payment record inside the unit panel ─────────────── */
const BILL_STATUS = {
  overdue: { label: 'Overdue', tone: 'red' },
  pending: { label: 'Unpaid',  tone: 'amber' },
  paid:    { label: 'Paid',    tone: 'green' },
  waived:  { label: 'Waived',  tone: 'slate' },
};
const METHOD_LABEL = { paystack: 'Paystack', cash: 'Cash', bank_transfer: 'Bank transfer', manual: 'Manual' };
const fullDate = (d) => new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

function residentDuesBadge(rec) {
  if (!rec) return null;
  if (rec.overdueAmount > 0) return { tone: 'red', text: `${NGN(rec.overdueAmount)} overdue` };
  if (rec.outstanding > 0) return { tone: 'amber', text: `${NGN(rec.outstanding)} owing` };
  if (rec.bills.length) return { tone: 'green', text: 'Paid up' };
  return { tone: 'slate', text: 'No bills' };
}

function ResidentRow({ r, rec, open, onToggle, onRemove }) {
  const W = useWords();
  const badge = residentDuesBadge(rec);
  const t = badge ? TONE[badge.tone] : null;
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 overflow-hidden">
      <div className="flex items-center gap-3 p-2.5">
        <Avatar r={r} size={34} ring={false} />
        <button type="button" onClick={onToggle} disabled={!rec} className="flex-1 min-w-0 text-left">
          <p className="text-[13px] font-semibold text-slate-900 truncate">{r.name}</p>
          <p className="text-[11px] text-slate-400 truncate">{r.email || r.phone || ''}</p>
        </button>
        {badge && (
          <button type="button" onClick={onToggle}
            className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full flex-shrink-0"
            style={{ background: t.bg, color: t.strong, border: `1px solid ${t.bd}` }}>
            {badge.text}
            {rec.bills.length > 0 && <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />}
          </button>
        )}
        <button onClick={onRemove} title={`Remove from ${W.unit}`} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50"><UserMinus size={15} /></button>
      </div>
      {open && rec?.bills.length > 0 && (
        <div className="bg-white border-t border-slate-100">
          <div className="grid grid-cols-3 gap-px bg-slate-100 text-[11.5px]">
            {[['Owing', NGN(rec.outstanding)], ['Overdue', NGN(rec.overdueAmount)], ['Paid', NGN(rec.paidTotal)]].map(([k, v]) => (
              <div key={k} className="bg-white px-3 py-2"><p className="text-slate-400">{k}</p><p className="font-semibold text-slate-900 tabular-nums">{v}</p></div>
            ))}
          </div>
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
            {rec.bills.map((b) => {
              const st = BILL_STATUS[b.status] || BILL_STATUS.pending;
              const bt = TONE[st.tone];
              return (
                <div key={b._id} className="flex items-center gap-2.5 px-3 py-2">
                  <Receipt size={13} className="text-slate-300 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-slate-800 truncate">{b.title}</p>
                    <p className="text-[10.5px] text-slate-400 truncate">
                      {b.status === 'paid' && b.paidAt
                        ? `Paid ${fullDate(b.paidAt)}${b.method ? ` · ${METHOD_LABEL[b.method] || b.method}` : ''}`
                        : b.dueDate ? `Due ${fullDate(b.dueDate)}` : 'No due date'}
                    </p>
                  </div>
                  <span className="text-[12px] font-semibold text-slate-900 tabular-nums">{NGN(b.amount)}</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full w-14 text-center" style={{ background: bt.bg, color: bt.strong }}>{st.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Unit detail side panel ────────────────────────────────────────── */
function UnitPanel({ unit, allResidents, onAddResident, onRemoveResident, onDelete, onSaved, onClose }) {
  const W = useWords();
  const { site } = W;
  const [addId, setAddId] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [records, setRecords] = useState(null); // { [residentId]: record } — null while loading / no finance access
  const [openId, setOpenId] = useState(null);
  const residentKey = (unit?.residentIds || []).map((r) => r?._id || r).join(',');
  useEffect(() => {
    setRecords(null); setOpenId(null);
    if (!unit?._id || !residentKey) return;
    let live = true;
    unitAPI.getPayments(unit._id)
      .then(({ data }) => { if (live) setRecords(Object.fromEntries(data.data.map((x) => [String(x.resident._id), x]))); })
      .catch(() => {}); // e.g. team member without Finance access — just hide the records
    return () => { live = false; };
  }, [unit?._id, residentKey, unit?.dues?.outstanding, unit?.dues?.paidCount]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setAddId(''); setQ(''); setConfirmDelete(false); setEditing(false); if (unit) setForm({ unitNumber: unit.unitNumber, block: unit.block || '', type: unit.type }); }, [unit?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const u = unit;
  const people = u ? occ(u) : [];
  const count = people.length;
  const max = u?.maxOccupants || 7;
  const ids = new Set(people.map((r) => r._id));
  const available = (allResidents || []).filter((r) => !ids.has(r._id) && (!q || `${r.name} ${r.email || ''}`.toLowerCase().includes(q.toLowerCase())));
  const dues = u ? duesView(u, W) : null;
  const tone = dues ? TONE[dues.tone] : TONE.slate;
  const d = u?.dues || {};
  const TypeIcon = TYPE_ICON[u?.type] || Building2;

  const add = async (id) => { setBusy(true); try { await onAddResident(id, u._id); setAddId(''); } finally { setBusy(false); } };
  const save = async () => {
    if (!form.unitNumber?.trim()) return toast.error(`${W.Unit} number is required`);
    setBusy(true);
    try { await unitAPI.update(u._id, { unitNumber: form.unitNumber.trim(), block: form.block.trim(), type: form.type }); toast.success(`${W.Unit} updated`); setEditing(false); onSaved(u._id); }
    catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
    finally { setBusy(false); }
  };

  return (
    <SidePanel open={!!u} onClose={onClose}
      title={u ? `${u.block ? `${blockName(u.block, site.terms)} · ` : ''}${site.terms.unit} ${u.unitNumber}` : ''}
      subtitle={u ? `${W.type(u.type)?.[0]?.toUpperCase()}${W.type(u.type)?.slice(1)} · ${count}/${max} occupants` : ''}
      footer={u && (confirmDelete ? (
        <div className="flex gap-2">
          <button onClick={() => setConfirmDelete(false)} className="flex-1 h-10 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600">Cancel</button>
          <button onClick={() => { onDelete(u._id); onClose(); }} className="flex-1 h-10 rounded-xl text-sm font-semibold text-white bg-red-500">Delete {W.unit}</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => setEditing((e) => !e)} className="flex-1 h-10 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 flex items-center justify-center gap-1.5 hover:bg-slate-50"><Pencil size={14} /> {editing ? 'Close edit' : `Edit ${W.unit}`}</button>
          <button onClick={() => setConfirmDelete(true)} className="h-10 px-4 rounded-xl text-sm font-semibold border border-red-200 text-red-600 bg-red-50 flex items-center gap-1.5"><Trash2 size={14} /> Delete</button>
        </div>
      ))}>
      {u && (
        <div className="space-y-5 -mt-1">
          {/* Identity */}
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10B981, #047857)', boxShadow: '0 8px 18px -10px #047857' }}><TypeIcon size={21} className="text-white" /></span>
            <div className="flex-1 min-w-0">
              <p className="text-[22px] font-semibold text-slate-900 leading-tight" style={{ letterSpacing: '-0.02em' }}>{u.unitNumber}<RestrictedBadge u={u} /></p>
              <p className="text-[12px] text-slate-500 capitalize">{u.block ? `${blockName(u.block, site.terms)} · ` : ''}{W.type(u.type)}</p>
            </div>
          </div>

          {site.type === 'hospital' && (
            <button type="button" role="switch" aria-checked={!!u.restricted} disabled={busy}
              onClick={async () => {
                setBusy(true);
                try { await unitAPI.update(u._id, { restricted: !u.restricted }); toast.success(u.restricted ? `${W.Unit} open to visitors` : `${W.Unit} restricted`); onSaved(u._id); }
                catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
                finally { setBusy(false); }
              }}
              className={`w-full flex items-center gap-3 text-left rounded-2xl border p-3 transition-colors disabled:opacity-60 ${u.restricted ? 'border-rose-200 bg-rose-50/60' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: u.restricted ? 'linear-gradient(135deg, #FB7185, #E11D48)' : '#F1F5F9' }}><Lock size={14} className={u.restricted ? 'text-white' : 'text-slate-400'} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-slate-900">Restricted (visitors need care-team approval)</span>
                <span className="block text-[11.5px] text-slate-500">For ICU and similar {W.units}: passes wait until the patient's care team approves.</span>
              </span>
              <span className={`relative w-9 h-5 rounded-full flex-shrink-0 transition-colors ${u.restricted ? 'bg-rose-500' : 'bg-slate-300'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${u.restricted ? 'left-[18px]' : 'left-0.5'}`} />
              </span>
            </button>
          )}

          {editing && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
              <p className="text-[12px] font-semibold text-emerald-800 flex items-center gap-1.5"><Pencil size={13} /> Edit {W.unit}</p>
              <div className="grid grid-cols-2 gap-2.5">
                <label><span className="text-[11.5px] text-slate-500">{W.Unit} number</span><input className="input-field mt-1" value={form.unitNumber} onChange={(e) => setForm({ ...form, unitNumber: e.target.value })} /></label>
                <label><span className="text-[11.5px] text-slate-500">{blockWord(site.terms)}</span><input className="input-field mt-1" value={form.block} onChange={(e) => setForm({ ...form, block: e.target.value })} placeholder="Optional" /></label>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {TYPES.map(({ v, label, icon: I }) => (
                  <button key={v} type="button" onClick={() => setForm({ ...form, type: v })}
                    className={`rounded-xl border py-2 flex flex-col items-center gap-1 text-[11px] font-medium ${form.type === v ? 'border-emerald-500 bg-white text-emerald-700 ring-2 ring-emerald-500/10' : 'border-slate-200 text-slate-500 bg-white'}`}><I size={15} />{W.typeLabel({ v, label })}</button>
                ))}
              </div>
              <button onClick={save} disabled={busy} className="btn-primary w-full justify-center gap-1.5"><Check size={14} /> Save changes</button>
            </div>
          )}

          {/* Occupancy */}
          <div className="rounded-2xl border border-slate-200/80 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-slate-600 flex items-center gap-1.5"><Users size={13} /> Occupancy</span>
              <span className="text-[13px] font-semibold text-slate-900 tabular-nums">{count}<span className="text-slate-400 font-normal">/{max}</span></span>
            </div>
            <div className="mt-2.5 flex gap-1">
              {Array.from({ length: max }).map((_, k) => <span key={k} className="flex-1 h-2 rounded-full" style={{ background: k < count ? (count >= max ? '#F87171' : '#10B981') : '#E2E8F0' }} />)}
            </div>
            <p className="mt-2 text-[11.5px] text-slate-400">{count >= max ? `${W.Unit} is at full capacity` : `${max - count} space${max - count === 1 ? '' : 's'} left`}</p>
          </div>

          {/* Dues */}
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: tone.bd }}>
            <div className="p-4 flex items-center gap-3" style={{ background: tone.bg }}>
              <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center"><dues.Icon size={17} style={{ color: tone.strong }} /></span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: tone.strong }}>{W.Dues}</p>
                <p className="text-[14px] font-semibold text-slate-900">{dues.label}</p>
                <p className="text-[11.5px] text-slate-500">{dues.detail}</p>
              </div>
            </div>
            {d.billsIssued > 0 && (
              <dl className="grid grid-cols-2 gap-px bg-slate-100 text-[12px]">
                {[
                  ['Outstanding', NGN(d.outstanding)],
                  ['Overdue', d.overdueCount ? `${NGN(d.overdueAmount)} · ${d.overdueCount}` : 'None'],
                  [`Paid in ${new Date().getFullYear()}`, NGN(d.paidThisYear)],
                  ['Last payment', d.lastPaidAt ? new Date(d.lastPaidAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-white px-3 py-2.5"><dt className="text-slate-400">{k}</dt><dd className="font-semibold text-slate-900 mt-0.5 tabular-nums">{v}</dd></div>
                ))}
              </dl>
            )}
            {d.nextDue && <p className="px-4 py-2.5 text-[11.5px] text-slate-600 bg-white border-t border-slate-100">Next bill: <b>{d.nextDue.title}</b> · {NGN(d.nextDue.amount)} due {shortDate(d.nextDue.dueDate)}</p>}
          </div>

          {/* Occupants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-semibold text-slate-600 flex items-center gap-1.5"><Users size={13} /> {W.Residents} · {count}</p>
              {records && (() => {
                const owing = people.filter((r) => records[String(r._id)]?.outstanding > 0).length;
                return <span className={`text-[11px] font-semibold ${owing ? 'text-red-600' : 'text-emerald-600'}`}>{owing ? `${owing} owing` : 'Nobody owing'}</span>;
              })()}
            </div>
            {!count ? (
              <div className="text-[12px] text-center py-6 rounded-2xl border border-dashed border-slate-200 text-slate-400">{W.E ? 'Nobody lives here yet' : `Nobody in this ${W.unit} yet`}</div>
            ) : (
              <div className="space-y-1.5">
                {[...people]
                  .sort((x, y) => (records?.[String(y._id)]?.outstanding || 0) - (records?.[String(x._id)]?.outstanding || 0))
                  .map((r) => (
                    <ResidentRow key={r._id} r={r} rec={records?.[String(r._id)]}
                      open={openId === r._id} onToggle={() => setOpenId((id) => (id === r._id ? null : r._id))}
                      onRemove={() => onRemoveResident(r._id)} />
                  ))}
              </div>
            )}
          </div>

          {/* Assign */}
          <div>
            <p className="text-[12px] font-semibold text-slate-600 mb-2 flex items-center gap-1.5"><UserPlus size={13} /> Add {withAn(W.resident)}</p>
            {count >= max ? (
              <p className="text-[12px] px-3 py-2.5 rounded-xl text-center bg-red-50 text-red-600 border border-red-100">This {W.unit} is full ({max}/{max})</p>
            ) : (
              <div className="rounded-2xl border border-slate-200/80 overflow-hidden">
                <div className="flex items-center gap-2 px-3 h-10 border-b border-slate-100 bg-slate-50">
                  <Search size={14} className="text-slate-400" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${W.residents}`} className="flex-1 bg-transparent outline-none text-[13px]" />
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {!available.length && <p className="px-3 py-4 text-[12px] text-slate-400 text-center">No {W.residents} to add</p>}
                  {available.slice(0, 60).map((r) => (
                    <div key={r._id} className="flex items-center gap-2.5 px-3 py-2">
                      <Avatar r={r} size={28} ring={false} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-medium text-slate-800 truncate">{r.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{r.unitId ? `Now in ${r.unitId.unitNumber || `another ${W.unit}`}` : `No ${W.unit} yet`}</p>
                      </div>
                      <button disabled={busy} onClick={() => add(r._id)} className="h-8 px-2.5 rounded-lg text-[12px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-1 disabled:opacity-50"><Plus size={13} /> Add</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </SidePanel>
  );
}

/* ── Add units panel: one, or a whole range at once ────────────────── */
function AddUnitsPanel({ open, onClose, onDone, existing }) {
  const W = useWords();
  const { site } = W;
  const [mode, setMode] = useState('single');
  const [f, setF] = useState({ unitNumber: '', block: '', type: 'apartment', prefix: '', from: 1, to: 10, pad: 0 });
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  useEffect(() => { if (open) { setProgress(null); } }, [open]);
  const taken = useMemo(() => new Set(existing.map((u) => `${(u.block || '').toLowerCase()}|${u.unitNumber.toLowerCase()}`)), [existing]);
  const range = useMemo(() => {
    const a = Number(f.from), b = Number(f.to);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b < a || b - a > 199) return [];
    return Array.from({ length: b - a + 1 }, (_, i) => `${f.prefix}${String(a + i).padStart(Number(f.pad) || 0, '0')}`);
  }, [f.from, f.to, f.prefix, f.pad]);
  const fresh = range.filter((n) => !taken.has(`${f.block.trim().toLowerCase()}|${n.toLowerCase()}`));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'single') {
        if (!f.unitNumber.trim()) { toast.error(`Enter ${withAn(W.unit)} number`); return; }
        await unitAPI.create({ unitNumber: f.unitNumber.trim(), block: f.block.trim(), type: f.type });
        toast.success(`${W.Unit} ${f.unitNumber} created`);
      } else {
        let ok = 0, fail = 0;
        for (let i = 0; i < fresh.length; i++) {
          setProgress({ done: i, total: fresh.length });
          try { await unitAPI.create({ unitNumber: fresh[i], block: f.block.trim(), type: f.type }); ok++; } catch { fail++; }
        }
        setProgress({ done: fresh.length, total: fresh.length });
        toast.success(`${W.nUnits(ok)} created${fail ? ` · ${fail} skipped` : ''}`);
      }
      onDone();
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || `Could not create ${W.unit}`); }
    finally { setBusy(false); }
  };

  return (
    <SidePanel open={open} onClose={onClose} title={`Add ${W.units}`} subtitle={`Add one ${W.unit}, or a whole ${W.block} in one go.`}
      footer={<div className="flex items-center gap-2">
        {progress && <span className="text-[12px] text-slate-500 mr-auto">Creating {progress.done}/{progress.total}…</span>}
        <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
        <button type="submit" form="add-units-form" disabled={busy || (mode === 'range' && !fresh.length)} className="btn-primary flex-1 justify-center gap-1.5">
          <Plus size={15} /> {mode === 'single' ? `Create ${W.unit}` : `Create ${W.nUnits(fresh.length)}`}
        </button>
      </div>}>
      <form id="add-units-form" onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-2 gap-2">
          {[['single', `One ${W.unit}`, W.E ? 'e.g. Flat 4B' : `e.g. ${W.Unit} 4B`, Home], ['range', `Many ${W.units}`, 'e.g. A101 – A120', ListPlus]].map(([v, l, h, I]) => (
            <button key={v} type="button" onClick={() => setMode(v)}
              className={`text-left rounded-2xl border p-3 transition-all ${mode === v ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/10' : 'border-slate-200 hover:border-slate-300'}`}>
              <I size={16} className={mode === v ? 'text-emerald-600' : 'text-slate-400'} />
              <p className="mt-1.5 text-[13px] font-semibold text-slate-900">{l}</p><p className="text-[11px] text-slate-400">{h}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {mode === 'single'
            ? <label><span className="text-[12px] font-medium text-slate-600">{W.Unit} number *</span><input className="input-field mt-1" value={f.unitNumber} onChange={(e) => setF({ ...f, unitNumber: e.target.value })} placeholder="e.g. 4B" autoFocus /></label>
            : <label><span className="text-[12px] font-medium text-slate-600">Prefix</span><input className="input-field mt-1" value={f.prefix} onChange={(e) => setF({ ...f, prefix: e.target.value })} placeholder={W.E ? 'e.g. A or Flat ' : `e.g. A or ${W.Unit} `} /></label>}
          <label><span className="text-[12px] font-medium text-slate-600">{blockWord(site.terms)}</span><input className="input-field mt-1" value={f.block} onChange={(e) => setF({ ...f, block: e.target.value })} placeholder="Optional" /></label>
        </div>

        {mode === 'range' && (
          <>
            <div className="grid grid-cols-3 gap-2.5">
              <label><span className="text-[12px] font-medium text-slate-600">From</span><input type="number" className="input-field mt-1" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></label>
              <label><span className="text-[12px] font-medium text-slate-600">To</span><input type="number" className="input-field mt-1" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></label>
              <label><span className="text-[12px] font-medium text-slate-600">Digits</span>
                <select className="input-field mt-1" value={f.pad} onChange={(e) => setF({ ...f, pad: e.target.value })}><option value={0}>1, 2, 3</option><option value={2}>01, 02</option><option value={3}>001, 002</option></select>
              </label>
            </div>
            <div className="rounded-2xl border border-slate-200/80 p-3">
              <p className="text-[12px] font-semibold text-slate-600 mb-2 flex items-center gap-1.5"><Sparkles size={13} className="text-emerald-500" /> Preview · {fresh.length} new{range.length - fresh.length ? ` · ${range.length - fresh.length} already exist` : ''}</p>
              <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto">
                {range.slice(0, 120).map((n) => {
                  const dup = !fresh.includes(n);
                  return <span key={n} className={`text-[11px] font-medium px-1.5 py-0.5 rounded-md ${dup ? 'bg-slate-100 text-slate-400 line-through' : 'bg-emerald-50 text-emerald-700'}`}>{f.block ? `${f.block}-` : ''}{n}</span>;
                })}
                {!range.length && <span className="text-[12px] text-slate-400">Set a valid range (up to 200 {W.units}).</span>}
              </div>
            </div>
          </>
        )}

        <div>
          <p className="text-[12px] font-medium text-slate-600 mb-1.5">Type</p>
          <div className="grid grid-cols-4 gap-1.5">
            {TYPES.map(({ v, label, icon: I }) => (
              <button key={v} type="button" onClick={() => setF({ ...f, type: v })}
                className={`rounded-xl border py-2.5 flex flex-col items-center gap-1 text-[11.5px] font-medium ${f.type === v ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 ring-2 ring-emerald-500/10' : 'border-slate-200 text-slate-500'}`}><I size={16} />{W.typeLabel({ v, label })}</button>
            ))}
          </div>
        </div>
      </form>
    </SidePanel>
  );
}

/* ── Page ───────────────────────────────────────────────────────────── */
export default function Units() {
  const W = useWords(); // words only — layout untouched
  const { site } = W;
  const [units, setUnits] = useState([]);
  const [allResidents, setAllResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [blockFilter, setBlockFilter] = useState('all');
  const [sort, setSort] = useState('number');
  const [view, setView] = useState(() => { try { return localStorage.getItem('em_units_view') || 'grid'; } catch { return 'grid'; } });
  useEffect(() => { try { localStorage.setItem('em_units_view', view); } catch { /* ignore */ } }, [view]);

  const load = async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([unitAPI.getAll(), residentAPI.getAll({ limit: 500 })]);
      setUnits(u.data.data); setAllResidents(r.data.data);
    } catch { toast.error('Failed to load'); } finally { setLoading(false); }
  };
  const reload = async () => {
    const [u, r] = await Promise.all([unitAPI.getAll(), residentAPI.getAll({ limit: 500 })]);
    setUnits(u.data.data); setAllResidents(r.data.data);
  };
  useEffect(() => { load(); }, []);
  const selected = units.find((u) => u._id === selectedId) || null;

  const handleDelete = async (id) => {
    try { await unitAPI.delete(id); toast.success(`${W.Unit} deleted`); load(); } catch { toast.error('Failed'); }
  };
  const handleAddResident = async (residentId, unitId) => {
    try { await residentAPI.assignUnit(residentId, unitId); toast.success(`${W.Resident} added to ${W.unit}`); await reload(); }
    catch (err) { toast.error(err.response?.data?.message || `Failed to add ${W.resident}`); }
  };
  const handleRemoveResident = async (residentId) => {
    if (!window.confirm(W.E ? "Remove this resident from the unit? Residents need a unit to use AreaMates, so they'll be signed out until they're assigned to one again." : `Remove this ${W.resident} from the ${W.unit}? ${W.Residents} need ${withAn(W.unit)} to use AreaMates, so they'll be signed out until they're assigned to one again.`)) return;
    try { await residentAPI.assignUnit(residentId, null); toast.success(`${W.Resident} removed from ${W.unit}`); await reload(); }
    catch (err) { toast.error(err.response?.data?.message || `Failed to remove ${W.resident}`); }
  };

  const stats = useMemo(() => {
    let occupied = 0, vacant = 0, full = 0, owed = 0, overdue = 0, overdueAmt = 0, clear = 0, billed = 0, people = 0, capacity = 0;
    for (const u of units) {
      const c = occ(u).length; const max = u.maxOccupants || 7;
      people += c; capacity += max;
      if (c > 0) occupied++; else vacant++;
      if (c >= max) full++;
      const s = u.dues?.status;
      if (s && s !== 'exempt') owed += u.dues.outstanding || 0;
      if (s === 'overdue') { overdue++; overdueAmt += u.dues.overdueAmount || 0; }
      if (s === 'clear') clear++;
      if (['clear', 'owing', 'overdue'].includes(s)) billed++;
    }
    const unassigned = allResidents.filter((r) => !r.unitId).length;
    return { total: units.length, occupied, vacant, full, owed, overdue, overdueAmt, clear, billed, people, capacity, unassigned };
  }, [units, allResidents]);

  const blocks = useMemo(() => {
    const m = {};
    units.forEach((u) => {
      const k = (u.block || '').trim() || '__none';
      const b = (m[k] ||= { key: k, units: 0, occupied: 0, owed: 0, overdue: 0 });
      b.units++; if (occ(u).length) b.occupied++;
      if (u.dues?.status !== 'exempt') b.owed += u.dues?.outstanding || 0;
      if (u.dues?.status === 'overdue') b.overdue++;
    });
    return Object.values(m).sort((a, b) => (a.key === '__none' ? 1 : b.key === '__none' ? -1 : a.key.localeCompare(b.key, undefined, { numeric: true })));
  }, [units]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = units.filter((u) => {
      const c = occ(u).length; const max = u.maxOccupants || 7; const s = u.dues?.status;
      if (filter === 'occupied' && !c) return false;
      if (filter === 'vacant' && c) return false;
      if (filter === 'full' && c < max) return false;
      if (filter === 'overdue' && s !== 'overdue') return false;
      if (filter === 'owing' && !['overdue', 'owing'].includes(s)) return false;
      if (filter === 'clear' && s !== 'clear') return false;
      if (typeFilter !== 'all' && u.type !== typeFilter) return false;
      if (blockFilter !== 'all' && ((u.block || '').trim() || '__none') !== blockFilter) return false;
      if (!q) return true;
      return [u.unitNumber, u.block, u.type, ...occ(u).map((r) => r.name)].join(' ').toLowerCase().includes(q);
    });
    const by = {
      number: (a, b) => `${a.block || ''}${a.unitNumber}`.localeCompare(`${b.block || ''}${b.unitNumber}`, undefined, { numeric: true }),
      owed: (a, b) => (b.dues?.outstanding || 0) - (a.dues?.outstanding || 0),
      occupancy: (a, b) => occ(b).length - occ(a).length,
      vacant: (a, b) => occ(a).length - occ(b).length,
    };
    return list.sort(by[sort]);
  }, [units, search, filter, typeFilter, blockFilter, sort]);

  const grouped = useMemo(() => {
    const m = {};
    filtered.forEach((u) => { const k = (u.block || '').trim() || '__none'; (m[k] ||= []).push(u); });
    return Object.entries(m).sort(([a], [b]) => (a === '__none' ? 1 : b === '__none' ? -1 : a.localeCompare(b, undefined, { numeric: true })));
  }, [filtered]);

  const FILTERS = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'occupied', label: 'Occupied', count: stats.occupied },
    { key: 'vacant', label: 'Vacant', count: stats.vacant },
    { key: 'full', label: 'Full', count: stats.full },
    { key: 'overdue', label: 'Overdue', count: stats.overdue, tone: 'red' },
    { key: 'owing', label: 'Owing' },
    { key: 'clear', label: 'Paid up', count: stats.clear },
  ];
  const occPct = stats.capacity ? Math.round((stats.people / stats.capacity) * 100) : 0;
  const occupiedPct = stats.total ? Math.round((stats.occupied / stats.total) * 100) : 0;
  const clearPct = stats.billed ? Math.round((stats.clear / stats.billed) * 100) : 0;
  const hasFilters = search || filter !== 'all' || typeFilter !== 'all' || blockFilter !== 'all';

  return (
    <div className="space-y-5 animate-fade-in max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900" style={{ letterSpacing: '-0.02em' }}>{site.terms.units}</h1>
          <p className="text-slate-500 text-[13px] mt-0.5">{site.isEstate ? 'Homes in your estate — who lives where, and whose dues are up to date.' : `${site.terms.units} in your ${site.terms.site.toLowerCase()} and who is in each one.`}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex p-0.5 rounded-xl bg-slate-100">
            {[['grid', LayoutGrid, 'Cards'], ['table', Rows3, 'Table'], ['map', MapIcon, W.E ? 'Estate map' : `${W.T.site} map`]].map(([v, I, l]) => (
              <button key={v} onClick={() => setView(v)} className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium ${view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><I size={14} />{l}</button>
            ))}
          </div>
          <Link to="/map" className="btn-outline !text-[13px] !px-3 !py-2">Map</Link>
          <button onClick={() => setShowAdd(true)} className="btn-primary gap-2"><Plus size={16} /> Add {site.terms.units.toLowerCase()}</button>
        </div>
      </div>

      {loading ? <PageLoader variant="section" /> : units.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <span className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10B981, #047857)' }}><Home size={24} className="text-white" /></span>
          <p className="mt-4 text-[16px] font-semibold text-slate-900">Add your first {site.terms.units.toLowerCase()}</p>
          <p className="mt-1 text-[13px] text-slate-500 max-w-sm mx-auto">{W.E ? 'Create each home once — or a whole block at a time — then assign residents and track their dues.' : `Create each ${W.unit} once — or a whole ${W.block} at a time — then assign ${W.residents}${site.on('payments') ? ` and track their ${W.dues}` : ''}.`}</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary mt-5 gap-2 inline-flex"><Plus size={15} /> Add {site.terms.units.toLowerCase()}</button>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Stat i={0} label={W.Units} value={stats.total} Icon={Home} color="#10B981" sub={`${blocks.filter((b) => b.key !== '__none').length || 'No'} ${W.block}${blocks.filter((b) => b.key !== '__none').length === 1 ? '' : 's'}`} />
            <Stat i={1} label="Occupied" value={stats.occupied} Icon={DoorOpen} color="#6366F1" sub={`${stats.vacant} vacant · ${stats.full} full`}>
              <span className="relative"><MiniRing pct={occupiedPct} color="#6366F1" /><span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-indigo-600">{occupiedPct}%</span></span>
            </Stat>
            <Stat i={2} label={W.E ? 'Residents housed' : `${W.Residents} in ${W.units}`} value={stats.people} Icon={Users} color="#0EA5E9" sub={`${occPct}% of ${stats.capacity} spaces · ${stats.unassigned} without ${withAn(W.unit)}`} />
            <Stat i={3} label={`${W.Dues} owed`} display={NGN_SHORT(stats.owed)} Icon={Wallet} color={stats.owed ? '#F97316' : '#14B8A6'} sub={stats.overdue ? `${W.nUnits(stats.overdue)} overdue · ${NGN_SHORT(stats.overdueAmt)}` : 'Nothing overdue'} />
            <Stat i={4} label="Paid up" display={`${clearPct}%`} Icon={CheckCircle2} color="#22C55E" sub={`${stats.clear} of ${stats.billed} billed ${W.units} clear`}>
              <span className="relative"><MiniRing pct={clearPct} color="#22C55E" /></span>
            </Stat>
          </div>

          {/* Blocks overview */}
          {blocks.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
              {blocks.map((b) => {
                const on = blockFilter === b.key;
                const pct = b.units ? Math.round((b.occupied / b.units) * 100) : 0;
                return (
                  <button key={b.key} onClick={() => setBlockFilter(on ? 'all' : b.key)}
                    className={`flex-shrink-0 w-[170px] text-left rounded-2xl border p-3 transition-all ${on ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/10' : 'border-slate-200/80 bg-white hover:border-slate-300'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-slate-900 flex items-center gap-1.5"><Layers size={13} className="text-emerald-600" />{b.key === '__none' ? `No ${blockWord(site.terms).toLowerCase()}` : blockName(b.key, site.terms)}</span>
                      <span className="text-[11px] text-slate-400 tabular-nums">{b.units}</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
                    <p className="mt-1.5 text-[11px] text-slate-500 tabular-nums">{pct}% occupied{b.owed ? <> · <span className={b.overdue ? 'text-red-600' : 'text-amber-600'}>{NGN_SHORT(b.owed)} owed</span></> : ''}</p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Toolbar */}
          <div className="rounded-2xl bg-white border border-slate-200/80 p-2.5 flex flex-col lg:flex-row gap-2 lg:items-center">
            <div className="flex items-center gap-2 h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 lg:w-72">
              <Search size={14} className="text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`${W.Unit}, ${W.block} or ${W.resident}`} className="flex-1 min-w-0 bg-transparent outline-none text-[13px]" />
              {search && <button onClick={() => setSearch('')}><X size={13} className="text-slate-400" /></button>}
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {FILTERS.map(({ key, label, count, tone }) => {
                const on = filter === key;
                return (
                  <button key={key} onClick={() => setFilter(key)}
                    className={`flex-shrink-0 inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12.5px] font-medium transition-colors ${on ? 'text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    style={on ? { background: tone === 'red' ? 'linear-gradient(135deg,#EF4444,#B91C1C)' : 'linear-gradient(135deg,#10B981,#047857)' } : undefined}>
                    {label}{typeof count === 'number' && <span className={`text-[10.5px] px-1.5 rounded-md ${on ? 'bg-white/25' : tone === 'red' && count ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{count}</span>}
                  </button>
                );
              })}
            </div>
            <div className="lg:ml-auto flex items-center gap-2">
              <select className="input-field !h-9 !py-0 !w-auto text-[12.5px]" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">All types</option>{TYPES.map((t) => <option key={t.v} value={t.v}>{W.typePlural(t)}</option>)}
              </select>
              <select className="input-field !h-9 !py-0 !w-auto text-[12.5px]" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="number">{W.Unit} number</option><option value="owed">Most owed</option><option value="occupancy">Most {W.residents}</option><option value="vacant">Vacant first</option>
              </select>
            </div>
          </div>

          {!filtered.length ? (
            <div className="text-center py-14 rounded-2xl bg-white border border-slate-200/80">
              <Search size={24} className="mx-auto text-slate-300" />
              <p className="mt-2 text-[13.5px] font-semibold text-slate-700">No {W.units} match</p>
              <button onClick={() => { setSearch(''); setFilter('all'); setTypeFilter('all'); setBlockFilter('all'); }} className="mt-1 text-[12.5px] font-semibold text-emerald-600">Clear filters</button>
            </div>
          ) : view === 'table' ? (
            <div className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] min-w-[860px]">
                  <thead>
                    <tr className="text-left text-[11.5px] text-slate-500 bg-slate-50 border-b border-slate-100">
                      <th className="font-medium px-4 py-2.5">{W.Unit}</th><th className="font-medium px-3 py-2.5">Type</th><th className="font-medium px-3 py-2.5">{W.Residents}</th>
                      <th className="font-medium px-3 py-2.5 w-[150px]">Occupancy</th><th className="font-medium px-3 py-2.5">{W.Dues}</th>
                      <th className="font-medium px-3 py-2.5 text-right">Outstanding</th><th className="font-medium px-3 py-2.5">Last paid</th><th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u) => {
                      const people = occ(u); const max = u.maxOccupants || 7; const dv = duesView(u, W); const t = TONE[dv.tone]; const TI = TYPE_ICON[u.type] || Building2;
                      return (
                        <tr key={u._id} onClick={() => setSelectedId(u._id)} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 cursor-pointer">
                          <td className="px-4 py-2.5"><span className="font-semibold text-slate-900">{u.unitNumber}</span><RestrictedBadge u={u} />{u.block && <span className="ml-1.5 text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">{blockName(u.block, site.terms)}</span>}</td>
                          <td className="px-3 py-2.5 text-slate-600 capitalize"><span className="inline-flex items-center gap-1.5"><TI size={13} className="text-slate-400" />{W.type(u.type)}</span></td>
                          <td className="px-3 py-2.5">{people.length ? <div className="flex items-center gap-2"><div className="flex -space-x-2">{people.slice(0, 3).map((r) => <Avatar key={r._id} r={r} size={24} />)}</div><span className="text-[12px] text-slate-500 truncate max-w-[140px]">{people.map((r) => r.name?.split(' ')[0]).join(', ')}</span></div> : <span className="text-slate-300 text-[12px]">Vacant</span>}</td>
                          <td className="px-3 py-2.5"><div className="flex items-center gap-2"><div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(people.length / max) * 100}%`, background: people.length >= max ? '#F87171' : '#10B981' }} /></div><span className="text-[11.5px] tabular-nums text-slate-600">{people.length}/{max}</span></div></td>
                          <td className="px-3 py-2.5"><span className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: t.bg, color: t.strong }}><dv.Icon size={11} />{dv.key === 'overdue' ? 'Overdue' : dv.key === 'owing' ? 'Owing' : dv.key === 'clear' ? 'Paid up' : dv.key === 'exempt' ? 'Exempt' : '—'}</span></td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums" style={{ color: u.dues?.outstanding ? t.strong : '#CBD5E1' }}>{u.dues?.outstanding ? NGN(u.dues.outstanding) : '—'}</td>
                          <td className="px-3 py-2.5 text-[12px] text-slate-500">{u.dues?.lastPaidAt ? shortDate(u.dues.lastPaidAt) : '—'}</td>
                          <td className="px-3 py-2.5 text-slate-300"><ArrowRight size={14} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : view === 'map' ? (
            <div className="rounded-2xl bg-white border border-slate-200/80 p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-4 text-[11.5px] text-slate-500">
                <span className="font-semibold text-slate-700">{W.E ? 'Estate map' : `${W.T.site} map`}</span>
                {[['#34D399', 'Paid up'], ['#FBBF24', 'Owing'], ['#F87171', 'Overdue'], ['#CBD5E1', 'No bills / exempt']].map(([c, l]) => <span key={l} className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: c }} />{l}</span>)}
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-dashed border-slate-300" />Vacant</span>
              </div>
              {grouped.map(([block, list]) => (
                <div key={block}>
                  <p className="text-[11.5px] font-semibold uppercase tracking-wider text-slate-500 mb-2">{block === '__none' ? `No ${blockWord(site.terms).toLowerCase()}` : blockName(block, site.terms)} <span className="text-slate-300 normal-case tracking-normal">· {list.length}</span></p>
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))' }}>
                    {list.map((u) => {
                      const c = occ(u).length; const dv = duesView(u, W); const t = TONE[dv.tone];
                      return (
                        <button key={u._id} onClick={() => setSelectedId(u._id)} title={`${u.unitNumber} · ${W.nRes(c)} · ${dv.label}`}
                          className="group relative aspect-square rounded-xl flex flex-col items-center justify-center transition-transform hover:scale-105 hover:z-10"
                          style={c ? { background: t.tile, color: dv.tone === 'slate' ? '#475569' : '#fff' } : { border: '2px dashed #CBD5E1', color: '#94A3B8', background: '#F8FAFC' }}>
                          <span className="text-[12px] font-bold leading-none truncate max-w-full px-1">{u.unitNumber}</span>
                          {c > 0 && <span className="mt-1 text-[10px] font-medium opacity-90 flex items-center gap-0.5"><Users size={9} />{c}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(([block, list]) => (
                <div key={block}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="text-[12px] font-semibold text-slate-700 flex items-center gap-1.5"><Layers size={13} className="text-emerald-600" />{block === '__none' ? `No ${blockWord(site.terms).toLowerCase()}` : blockName(block, site.terms)}</span>
                    <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700">{list.length}</span>
                    <div className="flex-1 h-px bg-slate-200/70" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {list.map((u, i) => <UnitCard key={u._id} u={u} i={i} onOpen={() => setSelectedId(u._id)} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
          {hasFilters && filtered.length > 0 && <p className="text-[12px] text-slate-400 text-center">Showing {filtered.length} of {units.length} {W.units}</p>}
        </>
      )}

      <UnitPanel unit={selected} allResidents={allResidents} onAddResident={handleAddResident} onRemoveResident={handleRemoveResident}
        onDelete={handleDelete} onSaved={() => reload()} onClose={() => setSelectedId(null)} />
      <AddUnitsPanel open={showAdd} onClose={() => setShowAdd(false)} onDone={load} existing={units} />
    </div>
  );
}
