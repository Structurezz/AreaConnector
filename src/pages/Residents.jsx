import { useEffect, useMemo, useState } from 'react';
import { blockWord, blockName, lower } from '../utils/siteTypes';
import { useNavigate, useLocation } from 'react-router-dom';
import { FamilyRequestsBanner, FamilyRequestsPanel, AddFamilyPanel, MyHouseholdCard } from '../components/residents/FamilyPanels';
import { residentAPI, unitAPI } from '../api';
import Modal from '../components/ui/Modal';
import {
  Users, Search, Plus, UserX, UserCheck,
  MailPlus, Upload, CheckCircle, AlertCircle, X, ChevronLeft,
  Home, Building2, DoorOpen, ChevronRight, Mail, Phone, Download, FileText, Trash2,
  Calendar, LayoutGrid, List, Crown, UserPlus, Clock,
} from 'lucide-react';
import Portal, { Z } from '../components/ui/Portal';
import PageHeader, { HEADER_BTN_PRIMARY, HEADER_BTN_GHOST } from '../components/dashboard/PageHeader';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import TablePager from '../components/dashboard/TablePager';
import ResidentsMobile from '../components/residents/ResidentsMobile';
import { parseBulkText, parseBulkFile, downloadTemplate, isValidEmail, emptyRow } from '../utils/bulkImport';
import { useSite } from '../context/SiteContext';
import InviteResidentModal, { unitOptionLabel } from '../components/residents/InviteResidentModal';
import UnitPicker from '../components/residents/UnitPicker';
import { MemberSectorFields, emptySector, sectorPayload, sectorError, useSectorConfig, StayChip, StayCard, StaffCard } from '../components/site/MemberFields';
import { RoleCard, RoleChip } from '../components/site/RoleFields';
import { MemberWizard } from '../components/residents/OnboardWizard';

// "Dr Ade, Nurse Bisi" — a member's assigned staff (care team, adviser…)
const assignedNames = (r) => (r.assignedTo || []).filter(a => a && typeof a === 'object').map(a => a.name).join(', ');
const shortDate = (d) => (d ? format(new Date(d), 'd MMM') : '');

function unitLabel(u, site) {
  if (site && !site.isEstate) return unitOptionLabel(u, site);
  const base = u.block ? `Block ${u.block} · Apt ${u.unitNumber}` : `Apt ${u.unitNumber}`;
  const count = (u.residentIds || []).length;
  const max   = u.maxOccupants || 7;
  const full  = count >= max;
  return `${base} — ${count}/${max}${full ? ' (full)' : ''}`;
}

const hueOf = (name = '?') => (name.charCodeAt(0) * 37) % 360;
const initialsOf = (name = '?') => name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
// Estates say "Apt 4"; other site types use their own word ("Room 101", "Ward A")
const aptOf = (u, site) => (u ? `${u.block ? `${site && !site.isEstate ? blockName(u.block, site.terms) : u.block} · ` : ''}${site && !site.isEstate ? site.terms.unit : 'Apt'} ${u.unitNumber}` : '');

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

// Family members are added by their household head from AreaMates
export function FamilyTag({ r, className = '' }) {
  const site = useSite();
  if (r?.householdRole !== 'member') return null;
  const head = r.householdHead?.name?.split(' ')[0];
  return (
    <span className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100 whitespace-nowrap ${className}`}>
      <Users size={10} /> {r.relationship || (site.isEstate ? 'Family' : site.terms.family)}{head ? ` of ${head}` : ''}
    </span>
  );
}

const HOUSEHOLD_PERMS = { visitors: 'Visitors', payments: 'Bills', chat: 'Chat', community: 'Lounge', marketplace: 'Market', neighbours: 'Calls' };

// The household this resident heads or belongs to (loaded on open)
function HouseholdSection({ r }) {
  const navigate = useNavigate();
  const site = useSite();
  const T = site.terms;
  const [data, setData] = useState(null);
  const [adding, setAdding] = useState(false);
  const reload = () => residentAPI.getOne(r._id).then(({ data }) => setData(data.data)).catch(() => setData({ household: [] }));
  useEffect(() => { setData(null); reload(); }, [r._id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!data) return null;
  const isMember = data.householdRole === 'member';
  const head = isMember ? data.householdHead : null;
  const family = (data.household || []).filter(m => m._id !== r._id);
  const headForAdd = isMember ? head : { _id: r._id, name: r.name };

  const Row = ({ p, crown }) => (
    <button onClick={() => navigate(`/residents/${p._id}`)}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors">
      <ResidentAvatar r={p} size={32} ring={false} />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-slate-900 truncate flex items-center gap-1.5">
          {p.name}{crown && <Crown size={11} className="text-amber-500" />}{p.isActive === false && <span className="text-[10px] font-semibold text-slate-400">· paused</span>}
        </div>
        <div className="text-[11px] text-slate-400 truncate">
          {crown ? (site.isEstate ? 'Head of household' : `Head of ${T.household.toLowerCase()}`) : `${p.relationship || T.family} · ${(p.householdPermissions || []).map(k => HOUSEHOLD_PERMS[k]).filter(Boolean).join(', ') || 'Basics only'}`}
        </div>
      </div>
      <ChevronRight size={14} className="text-slate-300" />
    </button>
  );

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden" style={{ animation: 'dashRise 0.45s cubic-bezier(0.16,1,0.3,1) 120ms both' }}>
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100" style={{ background: 'linear-gradient(135deg, #FDF4FF, transparent 70%)' }}>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #D946EF, #A855F7)', boxShadow: '0 4px 10px -4px #A855F7' }}>
          <Users size={13} className="text-white" />
        </span>
        <span className="text-[13px] font-semibold text-slate-900 flex-1">{T.household}</span>
        {headForAdd?._id && r.isActive !== false && (
          <button onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-1 rounded-lg text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100">
            <UserPlus size={12} /> Add
          </button>
        )}
      </div>
      {!isMember && !family.length && (
        <p className="px-4 py-3 text-[12px] text-slate-500">No {T.familyPlural.toLowerCase()} yet. {r.name.split(' ')[0]} can add them from AreaMates, or you can add them here.</p>
      )}
      <div className="divide-y divide-slate-100">
        {head && <Row p={head} crown />}
        {family.map(m => <Row key={m._id} p={m} />)}
      </div>
      <p className="px-4 py-2.5 text-[11px] text-slate-400 bg-slate-50/60">
        {!site.isEstate
          ? (isMember
            ? `${T.familyPlural} aren't billed and follow the head's ${T.unit.toLowerCase()} and suspension.`
            : `Suspending or moving this ${T.member.toLowerCase()} also applies to their ${T.household.toLowerCase()}. ${T.familyPlural} are never billed.`)
          : isMember
          ? 'Family members aren\'t billed and follow the head\'s unit, dues status and suspension.'
          : 'Suspending or moving this resident also applies to their family. Family members are never billed.'}
      </p>
      {adding && <AddFamilyPanel head={headForAdd} onClose={() => setAdding(false)} onSaved={reload} />}
    </div>
  );
}

function ResidentDrawer({ resident, units, onToggle, onAssignUnit, onClose, onOpenProfile, onChanged }) {
  const site = useSite();
  const T = site.terms;
  const unitWord = site.isEstate ? 'apartment' : T.unit.toLowerCase();
  const UnitWord = site.isEstate ? 'Apartment' : T.unit;
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
    if (!assignUnitId && !window.confirm(site.isEstate
      ? `Remove ${resident.name} from their apartment? Residents need a unit to use AreaMates, so they'll be signed out until you assign one again.`
      : `Remove ${resident.name} from their ${unitWord}? ${T.members} need a ${unitWord} to use AreaMates, so they'll be signed out until you assign one again.`)) return;
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
    { icon: Home, label: UnitWord, value: currentUnit ? aptOf(currentUnit, site) : 'Not assigned', color: '#6366F1' },
  ].filter(Boolean);

  return (
    <Portal>
      <div className={`fixed inset-0 ${Z.drawer} flex justify-end`} onClick={onClose}>
        <div className="overlay-backdrop" aria-hidden="true" />
        <aside role="dialog" aria-modal="true" aria-label={`${T.member} ${r.name}`}
          className="animate-slide-in-right relative h-full w-full sm:w-[420px] bg-white flex flex-col"
          style={{ boxShadow: '-8px 0 40px rgba(15,23,42,0.18)' }}
          onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="relative overflow-hidden px-5 pt-4 pb-5 flex-shrink-0 border-b border-slate-100"
            style={{ background: r.isActive ? `linear-gradient(135deg, hsl(${h} 80% 96%) 0%, hsl(${(h + 40) % 360} 80% 97%) 55%, #FFFFFF 100%)` : 'linear-gradient(135deg, #FEF2F2 0%, #FFE4E6 55%, #FFFFFF 100%)' }}>
            <div className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full opacity-30"
              style={{ background: `radial-gradient(circle, ${r.isActive ? `hsl(${h} 70% 60%)` : '#F87171'}, transparent 70%)`, animation: 'dashFloat 14s ease-in-out infinite' }} />
            <div className="relative flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{T.member}</span>
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
                  <RoleChip siteRole={r.siteRole} />
                  <FamilyTag r={r} />
                  {site.modules?.stays && <StayChip stay={r.stay} />}
                  {currentUnit && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/80 text-indigo-700 border border-indigo-100">
                      <Home size={10} /> {aptOf(currentUnit, site)}
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

            <RoleCard member={r} onChanged={onChanged} />
            <StayCard member={r} onChanged={onChanged} />
            <StaffCard member={r} onChanged={onChanged} />

            {site.on('household') && <HouseholdSection r={r} />}

            {/* Apartment assignment */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100" style={{ background: 'linear-gradient(135deg, #EEF2FF, transparent 70%)' }}>
                <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', boxShadow: '0 4px 10px -4px #6366F1' }}>
                  <Building2 size={13} className="text-white" />
                </span>
                <span className="text-[13px] font-semibold text-slate-900">{UnitWord}</span>
              </div>
              <div className="p-4 space-y-3">
                <select className="input-field text-sm" value={assignUnitId} onChange={e => setAssignUnitId(e.target.value)}>
                  <option value="">— No {unitWord} —</option>
                  {units.map(u => {
                    const cnt = (u.residentIds || []).length;
                    const mx = u.maxOccupants || 7;
                    const full = cnt >= mx && u._id !== currentId;
                    return (
                      <option key={u._id} value={u._id} disabled={full}>
                        {unitOptionLabel(u, site).replace(/ — .*$/, '')} — {cnt}/{mx}{full ? ' (full)' : ''}
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
                  {saving ? 'Saving…' : !dirty ? `Current ${unitWord}` : assignUnitId ? 'Save assignment' : `Remove from ${unitWord}`}
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
  const site = useSite();
  const T = site.terms;
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
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500" /><b className="font-semibold text-slate-900 tabular-nums">{unitStats.occupied}</b> of {unitStats.total} {T.units.toLowerCase()}</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /><b className="font-semibold text-slate-900 tabular-nums">{totalAll}</b> {T.members.toLowerCase()}</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" /><b className="font-semibold text-slate-900 tabular-nums">{unitStats.open}</b> open spaces</div>
          </div>
        </div>
        {blocks.length > 1 && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">By {blockWord(T).toLowerCase()}</div>
            {blocks.slice(0, 8).map((b, i) => (
              <div key={b.name}>
                <div className="flex justify-between text-[11.5px] mb-1">
                  <span className="font-medium text-slate-700">{b.name === '—' ? `No ${blockWord(T).toLowerCase()}` : blockName(b.name, T)}</span>
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
        <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">{site.isEstate
          ? 'Invite residents by email — they get login details instantly. Moving a whole estate? Upload a CSV.'
          : `Invite ${T.members.toLowerCase()} by email — they get login details instantly. Moving a whole ${T.site.toLowerCase()}? Upload a CSV.`}</p>
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
  const site = useSite();
  const h = hueOf(r.name);
  return (
    <div onClick={() => onOpen(r)}
      className="dash-rise group cursor-pointer rounded-2xl bg-white border overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-card-md"
      style={{ animationDelay: `${480 + i * 30}ms`, borderColor: selected ? '#6366F1' : '#E2E8F0', boxShadow: selected ? '0 0 0 3px #6366F122' : undefined }}>
      <div className="h-10 relative" style={{ background: r.isActive ? `linear-gradient(120deg, hsl(${h} 80% 92%), hsl(${(h + 40) % 360} 80% 95%))` : 'linear-gradient(120deg, #FEE2E2, #FFF1F2)' }}>
        <span className="absolute top-2.5 right-2.5 flex gap-1">{site.modules?.stays && <StayChip stay={r.stay} />}<ResidentStatus r={r} /></span>
      </div>
      <div className="px-4 pb-4 -mt-4">
        <ResidentAvatar r={r} size={40} />
        <div className="mt-2 text-[14px] font-semibold text-slate-900 truncate">{r.name}</div>
        {r.householdRole === 'member' && <FamilyTag r={r} className="mt-1" />}
        {site.hasRoles && r.householdRole !== 'member' && <RoleChip siteRole={r.siteRole} size="xs" className="mt-1" />}
        <div className="text-[11px] text-slate-400">{site.hasRoles && r.memberProfile?.idNumber ? r.memberProfile.idNumber : r.createdAt ? `Joined ${format(new Date(r.createdAt), 'MMM yyyy')}` : ' '}</div>
        {site.hasRoles && assignedNames(r) && <div className="mt-1 text-[11px] text-pink-700 truncate">{site.assignLabel}: {assignedNames(r)}</div>}
        <div className="mt-3 space-y-1.5">
          <div className="text-[12px] text-slate-600 truncate flex items-center gap-2"><Mail size={12} className="text-slate-300 flex-shrink-0" />{r.email}</div>
          <div className="text-[12px] text-slate-600 truncate flex items-center gap-2"><Phone size={12} className="text-slate-300 flex-shrink-0" />{r.phone || 'No phone'}</div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          {r.unitId ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700"><Home size={11} />{aptOf(r.unitId, site)}</span>
          ) : <span className="text-[11px] italic text-slate-400">No {site.isEstate ? 'apartment' : site.terms.unit.toLowerCase()}</span>}
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

export default function ManagerResidents({ mode = 'residents' }) {
  const tab = mode; // 'family' = the Family members page (own nav item)
  const site = useSite();
  const T = site.terms;
  const E = site.isEstate;
  const unitWordL = E ? 'apartment' : T.unit.toLowerCase();
  const sectorCfg = useSectorConfig();
  // Non-estate sites: this page lists the default role (patients, students,
  // guests, employees); staff have their own page (/staff)
  const R = site.hasRoles && mode !== 'family';
  const memberDef = site.roleOf(site.defaultRole);
  const listTitle = R ? memberDef.plural : T.members;
  // Bulk import: Role + ID columns on non-estate sites
  const bulkOpts = R ? { roles: site.roles, idLabel: memberDef.form?.id || T.idLabel } : undefined;
  const bulkGrid = R ? 'md:grid-cols-[1.1fr_1.4fr_0.9fr_0.7fr_0.9fr_0.8fr_32px]' : 'md:grid-cols-[1.2fr_1.5fr_1fr_0.7fr_32px]';
  const [addSector, setAddSector] = useState(emptySector);
  const [residents, setResidents]   = useState([]);
  const [units, setUnits]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  // Residents with no unit can't sign in; ?filter=no_unit comes from the "waiting for a unit" notification
  const [noUnitOnly, setNoUnitOnly] = useState(() => new URLSearchParams(window.location.search).get('filter') === 'no_unit');
  const [noUnitCount, setNoUnitCount] = useState(0);
  // Family members residents asked to add (estate setting "Approve family members")
  const location = useLocation();
  const [familyCount, setFamilyCount] = useState(0);
  const [familyTotal, setFamilyTotal] = useState(0);
  const [addingFamily, setAddingFamily] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const loadFamilyCount = () => residentAPI.familyRequests().then(({ data }) => setFamilyCount(data.data.length)).catch(() => {});
  useEffect(() => {
    loadFamilyCount();
    if (new URLSearchParams(location.search).get('requests') === '1') {
      setShowRequests(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location.search]); // eslint-disable-line react-hooks/exhaustive-deps
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
  const [bulkRows, setBulkRows]     = useState(() => [emptyRow(), emptyRow(), emptyRow()]);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkFile, setBulkFile]     = useState('');
  const [parsingFile, setParsingFile] = useState(false);

  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState(() => { try { return localStorage.getItem('residents:view') || 'list'; } catch { return 'list'; } });
  const changeView = (v) => { setView(v); try { localStorage.setItem('residents:view', v); } catch {} };
  const navigate = useNavigate();

  const load = async (p = page, q = search, lim = limit, nu = noUnitOnly, t = tab) => {
    setLoading(true);
    try {
      const [r, u] = await Promise.all([
        residentAPI.getAll({ page: p, limit: lim, search: q || undefined, filter: nu && t !== 'family' ? 'no_unit' : undefined, type: t === 'family' ? 'family' : undefined, group: site.hasRoles && t !== 'family' ? 'members' : undefined }),
        unitAPI.getAll(),
      ]);
      setResidents(r.data.data);
      const pg = r.data.pagination || { total: r.data.data.length, pages: 1 };
      setPagination(pg);
      setTotalAll((site.hasRoles ? r.data.memberCount : undefined) ?? r.data.residentCount ?? (t !== 'family' && !q && !nu ? pg.total : totalAll));
      setFamilyTotal(r.data.familyCount || 0);
      setNoUnitCount(r.data.noUnitCount || 0);
      setUnits(u.data.data);
    } catch {
      toast.error(`Failed to load ${T.members.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePage   = (p) => { setPage(p); load(p, search); document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleLimit  = (l) => { setLimit(l); setPage(1); load(1, search, l); };
  const handleSearch = (q) => { setSearch(q); setPage(1); load(1, q); };

  // Residents and Family members share this page component: reload when switching between them
  useEffect(() => { setPage(1); setSearch(''); setSelected(null); load(1, '', limit, noUnitOnly, mode); }, [mode, site.hasRoles]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggleNoUnit = (on) => { setNoUnitOnly(on); setPage(1); load(1, search, limit, on); };

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
      const rows = await parseBulkFile(file, T.unit, bulkOpts);
      if (!rows.length) {
        toast.error(E ? 'No residents found — make sure the file has Name, Email, Phone and Unit columns' : `No ${lower(T.members)} found — make sure the file has Name, Email, Phone and ${T.unit} columns`);
        return;
      }
      setBulkRows(rows);
      setBulkFile(file.name);
      toast.success(E ? `${rows.length} resident${rows.length !== 1 ? 's' : ''} loaded from ${file.name}` : `${rows.length} ${lower(rows.length !== 1 ? T.members : T.member)} loaded from ${file.name}`);
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
    const sErr = sectorError(addSector, sectorCfg);
    if (sErr) { toast.error(sErr); return; }
    setSaving(true);
    try {
      await residentAPI.add({ ...form, ...sectorPayload(addSector, sectorCfg) });
      toast.success(`${T.member} added!`);
      setShowAdd(false);
      setForm({ name: '', email: '', phone: '', unitId: '' });
      setAddSector(emptySector());
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
        toast.success(`${T.member} suspended`);
      } else {
        await residentAPI.activate(r._id);
        toast.success(`${T.member} activated`);
      }
      load(page, search);
    } catch {
      toast.error('Action failed');
    }
  };

  const handleAssignUnit = async (residentId, unitId) => {
    try {
      await residentAPI.assignUnit(residentId, unitId);
      toast.success(unitId ? (E ? 'Apartment assigned' : `${T.unit} assigned`) : `Removed from ${unitWordL}`);
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
    .map(r => ({
      name: r.name.trim(), email: r.email.trim(), phone: r.phone.trim(), unitNumber: r.unitNumber.trim(),
      ...(R && { siteRole: r.role || '', ...(r.idNumber?.trim() && { memberProfile: { idNumber: r.idNumber.trim() } }) }),
    }));
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
    const parsed = parseBulkText(text, T.unit, bulkOpts);
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
        {tab === 'family' ? (
        <PageHeader
          title={T.familyPlural}
          subtitle={E ? 'People residents have added to their homes' : `People ${T.members.toLowerCase()} have added to their ${T.household.toLowerCase()}`}
          actions={<>
            <button onClick={() => setShowRequests(true)} className={HEADER_BTN_GHOST}>
              <Clock size={14} /> Requests{familyCount ? ` (${familyCount})` : ''}
            </button>
            <button onClick={() => setAddingFamily(true)} className={HEADER_BTN_PRIMARY}>
              <UserPlus size={15} /> Add {T.family.toLowerCase()}
            </button>
          </>}
          stats={[
            { label: T.familyPlural,      value: familyTotal, Icon: Users,     color: '#A855F7', hint: E ? 'Added by households' : `Added by ${T.members.toLowerCase()}` },
            { label: 'Awaiting approval', value: familyCount, Icon: Clock,     color: '#F59E0B', hint: 'Requests to review' },
            { label: T.members,           value: totalAll,    Icon: Home,      color: '#6366F1', hint: E ? 'Household heads' : `${T.household} heads` },
            { label: E ? 'Apartments' : T.units, value: unitStats.total, Icon: Building2, color: '#10B981', hint: `${T.units} in the ${T.site.toLowerCase()}` },
          ]}
        />
        ) : (
        <PageHeader
          title={listTitle}
          subtitle={E ? 'Everyone who calls the estate home' : R ? `${memberDef.plural} at your ${T.site.toLowerCase()} — staff are on the Staff page` : `Everyone registered at your ${T.site.toLowerCase()}`}
          actions={R ? <>
            <button onClick={() => setShowBulk(true)} className={HEADER_BTN_GHOST}><Upload size={14} /> Bulk import</button>
            <button onClick={() => setShowInvite(true)} className={HEADER_BTN_PRIMARY}><UserPlus size={15} /> Add {memberDef.label.toLowerCase()}</button>
          </> : <>
            <button onClick={() => setShowBulk(true)} className={HEADER_BTN_GHOST}><Upload size={14} /> Bulk invite</button>
            <button onClick={() => setShowInvite(true)} className={sectorCfg.stays ? HEADER_BTN_PRIMARY : HEADER_BTN_GHOST}><MailPlus size={14} /> {sectorCfg.stays ? `Check in ${T.member.toLowerCase()}` : 'Invite'}</button>
            {!sectorCfg.stays && <button onClick={() => setShowAdd(true)} className={HEADER_BTN_PRIMARY}><Plus size={15} /> Add {T.member.toLowerCase()}</button>}
            {sectorCfg.stays && <button onClick={() => setShowAdd(true)} className={HEADER_BTN_GHOST}><Plus size={14} /> Add without email</button>}
          </>}
          stats={[
            { label: listTitle,     value: totalAll,           Icon: Users,     color: '#6366F1', hint: R ? `Registered ${memberDef.plural.toLowerCase()}` : 'Registered members' },
            { label: E ? 'Apartments' : T.units, value: unitStats.total, Icon: Building2, color: '#8B5CF6', hint: `${T.units} in the ${T.site.toLowerCase()}` },
            { label: 'Occupied',    value: unitStats.occupied, Icon: Home,      color: '#10B981', hint: `${T.units} with ${T.members.toLowerCase()}` },
            { label: 'Open spaces', value: unitStats.open,     Icon: DoorOpen,  color: '#F59E0B', hint: E ? 'Room left across units' : `Space left across ${T.units.toLowerCase()}` },
          ]}
        />
        )}

        {tab === 'family' && <FamilyRequestsBanner count={familyCount} onOpen={() => setShowRequests(true)} />}
        {tab === 'residents' && noUnitCount > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white px-4 py-3 flex flex-wrap items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0"><AlertCircle size={17} /></span>
            <div className="flex-1 min-w-[200px]">
              <p className="text-[13.5px] font-semibold text-amber-900">{E ? `${noUnitCount} resident${noUnitCount !== 1 ? 's' : ''} can't sign in — no unit assigned` : `${noUnitCount} ${noUnitCount !== 1 ? T.members.toLowerCase() : T.member.toLowerCase()} can't sign in — no ${unitWordL} assigned`}</p>
              <p className="text-[12px] text-amber-800/80">{E ? 'Residents must belong to a unit to use AreaMates. Open each one and assign their apartment.' : `${T.members} must belong to a ${unitWordL} to use AreaMates. Open each one and assign their ${unitWordL}.`}</p>
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
                  placeholder={sectorCfg.shifts ? `Search by name, email or ${(T.idLabel || 'staff ID').toLowerCase()}…` : 'Search by name or email…'}
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
                  <p className="font-semibold text-slate-800 mt-2">{search ? `No ${tab === 'family' ? T.familyPlural.toLowerCase() : listTitle.toLowerCase()} match “${search}”` : tab === 'family' ? `No ${T.familyPlural.toLowerCase()} yet` : `No ${listTitle.toLowerCase()} yet`}</p>
                  <p className="text-sm text-slate-400">{tab === 'family'
                    ? (E ? 'Residents add their family from AreaMates, or you can add them here.' : `${T.members} add ${T.familyPlural.toLowerCase()} from AreaMates, or you can add them here.`)
                    : `Invite ${T.members.toLowerCase()} and they'll appear here.`}</p>
                  {!search && tab === 'family' && (
                    <button onClick={() => setAddingFamily(true)} className="btn-primary gap-2 mt-2"><UserPlus size={14} /> Add {T.family.toLowerCase()}</button>
                  )}
                  {!search && tab === 'residents' && (
                    <button onClick={() => setShowInvite(true)} className="btn-primary gap-2 mt-2"><MailPlus size={14} /> {R ? `Add ${memberDef.label.toLowerCase()}` : sectorCfg.stays ? `Check in ${T.member.toLowerCase()}` : 'Send an invite'}</button>
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
                  <div className={`grid ${R ? 'grid-cols-[2fr_1.4fr_1.1fr_1.3fr_1fr_auto]' : 'grid-cols-[2fr_1.6fr_1.1fr_0.9fr_auto]'} gap-4 px-5 py-3 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400`}>
                    <span>{R ? memberDef.label : T.member}</span><span>Contact</span><span>{E ? 'Apartment' : T.unit}</span>{R && <span>{site.assignLabel || 'Assigned'}</span>}<span>Status</span><span className="w-[72px]" />
                  </div>
                  {residents.map((r, i) => {
                    const sel = selected?._id === r._id;
                    return (
                      <div key={r._id} onClick={() => openResident(r)}
                        className={`dash-rise group grid ${R ? 'grid-cols-[2fr_1.4fr_1.1fr_1.3fr_1fr_auto]' : 'grid-cols-[2fr_1.6fr_1.1fr_0.9fr_auto]'} gap-4 items-center px-5 py-3 border-t border-slate-100 first-of-type:border-0 cursor-pointer transition-colors hover:bg-slate-50/80`}
                        style={{ animationDelay: `${460 + i * 30}ms`, background: sel ? '#EEF2FF' : undefined, boxShadow: `inset 3px 0 0 ${sel ? '#6366F1' : 'transparent'}` }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="block flex-shrink-0 transition-transform duration-300 group-hover:scale-105"><ResidentAvatar r={r} size={36} /></span>
                          <div className="min-w-0">
                            <div className="font-semibold text-[13px] text-slate-900 truncate">{r.name}</div>
                            {r.householdRole === 'member'
                              ? <FamilyTag r={r} />
                              : r.memberProfile?.title || r.memberProfile?.className
                              ? <div className="text-[11px] text-slate-400 truncate">{[r.memberProfile.title, r.memberProfile.className, r.memberProfile.idNumber].filter(Boolean).join(' · ')}</div>
                              : r.createdAt && <div className="text-[11px] text-slate-400">Joined {format(new Date(r.createdAt), 'MMM yyyy')}</div>}
                          </div>
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-xs text-slate-600 truncate flex items-center gap-1.5"><Mail size={11} className="text-slate-300 flex-shrink-0" />{r.email}</div>
                          {r.phone && <div className="text-xs text-slate-400 truncate flex items-center gap-1.5"><Phone size={11} className="text-slate-300 flex-shrink-0" />{r.phone}</div>}
                        </div>
                        <div>
                          {r.unitId ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700">
                              <Home size={11} />{aptOf(r.unitId, site)}
                            </span>
                          ) : (
                            <span className="text-xs italic text-slate-400">No {unitWordL}</span>
                          )}
                        </div>
                        {R && (
                          <div className="min-w-0 text-[12px] truncate">
                            {assignedNames(r) ? <span className="text-pink-700 font-medium">{assignedNames(r)}</span> : <span className="italic text-slate-400">Not assigned</span>}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-1">{sectorCfg.stays && r.householdRole !== 'member' && <StayChip stay={r.stay} />}<ResidentStatus r={r} /></div>
                          {R && sectorCfg.stays && (r.stay?.checkIn || r.stay?.checkOut) && (
                            <div className="text-[10.5px] text-slate-400 mt-0.5 truncate">{shortDate(r.stay.checkIn)} → {shortDate(r.stay.checkOut)}</div>
                          )}
                        </div>
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

          {tab === 'family' ? (
            <aside className="dash-rise space-y-4 xl:sticky xl:top-4" style={{ animationDelay: '440ms' }}>
              <MyHouseholdCard onChanged={() => load()} />
              <div className="rounded-2xl bg-white border border-slate-200/70 p-5">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #D946EF, #A855F7)' }}><Users size={14} className="text-white" /></span>
                  <span className="text-[13.5px] font-semibold text-slate-900">{E ? 'How families work' : `How ${T.familyPlural.toLowerCase()} work`}</span>
                </div>
                <ul className="mt-3.5 space-y-2.5 text-[12.5px] text-slate-600 leading-relaxed">
                  <li className="flex gap-2"><Crown size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />{E ? 'Each family belongs to a resident you onboarded, who decides what they can use.' : `Each ${T.household.toLowerCase()} belongs to a ${T.member.toLowerCase()} you onboarded, who decides what they can use.`}</li>
                  <li className="flex gap-2"><CheckCircle size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />{E ? "Family members are never billed and follow their head's unit, dues and suspension." : `${T.familyPlural} are never billed and follow their head's ${T.unit.toLowerCase()} and suspension.`}</li>
                  <li className="flex gap-2"><UserPlus size={13} className="text-fuchsia-500 mt-0.5 flex-shrink-0" />{E ? 'Add family to any resident, or to your own household if you live here.' : `Add ${T.familyPlural.toLowerCase()} to any ${T.member.toLowerCase()}.`}</li>
                </ul>
                <button onClick={() => navigate('/settings#preferences')}
                  className="mt-4 w-full py-2 rounded-xl text-[12.5px] font-semibold text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100">
                  Approval settings
                </button>
              </div>
            </aside>
          ) : (
            <OccupancyRail units={units} unitStats={unitStats} totalAll={totalAll}
              onInvite={() => setShowInvite(true)} onBulk={() => setShowBulk(true)} />
          )}
        </div>
      </div>

      {/* ── Phone / tablet ── */}
      <div className="lg:hidden space-y-4">
        {tab === 'family' && <FamilyRequestsBanner count={familyCount} onOpen={() => setShowRequests(true)} />}
        {tab === 'residents' && noUnitCount > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white px-4 py-3 flex flex-wrap items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0"><AlertCircle size={17} /></span>
            <div className="flex-1 min-w-[200px]">
              <p className="text-[13.5px] font-semibold text-amber-900">{E ? `${noUnitCount} resident${noUnitCount !== 1 ? 's' : ''} can't sign in — no unit assigned` : `${noUnitCount} ${noUnitCount !== 1 ? T.members.toLowerCase() : T.member.toLowerCase()} can't sign in — no ${unitWordL} assigned`}</p>
              <p className="text-[12px] text-amber-800/80">{E ? 'Residents must belong to a unit to use AreaMates. Open each one and assign their apartment.' : `${T.members} must belong to a ${unitWordL} to use AreaMates. Open each one and assign their ${unitWordL}.`}</p>
            </div>
            <button onClick={() => toggleNoUnit(!noUnitOnly)}
              className="h-9 px-3.5 rounded-xl text-[12.5px] font-semibold bg-amber-500 text-white hover:bg-amber-600">
              {noUnitOnly ? 'Show everyone' : 'Show them'}
            </button>
          </div>
        )}
        {tab === 'family' && <MyHouseholdCard onChanged={() => load()} />}
        <ResidentsMobile
          residents={residents} loading={loading} search={search} onSearch={handleSearch}
          totalAll={totalAll} unitStats={unitStats}
          page={page} pagination={pagination} limit={limit} onPage={handlePage}
          onOpen={openResident} onToggle={handleToggle}
          onInvite={() => setShowInvite(true)} onBulk={() => setShowBulk(true)} onAdd={() => setShowAdd(true)}
          family={tab === 'family'} familyTotal={familyTotal} requestCount={familyCount} onRequests={() => setShowRequests(true)} onAddFamily={() => setAddingFamily(true)}
          title={listTitle} addLabel={R ? `Add ${memberDef.label.toLowerCase()}` : null}
        />
      </div>

      {/* ── Single Invite Modal ─────────────────────────────────── */}
      {R
        ? <MemberWizard open={showInvite} onClose={() => setShowInvite(false)} units={units} onSaved={() => load()} onUnitCreated={(u) => setUnits(list => [...list, u])} />
        : <InviteResidentModal open={showInvite} onClose={() => setShowInvite(false)} units={units} onSaved={() => load()} onUnitCreated={(u) => setUnits(list => [...list, u])} />}

      {/* ── Bulk Invite Modal ───────────────────────────────────── */}
      <Modal open={showBulk} onClose={closeBulk} title={`Bulk Invite ${T.members}`} size="lg">
        {!bulkResult ? (
          <div className="space-y-4">
            <div className="p-3 rounded-xl text-sm"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#818CF8' }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold mb-1">Template — Name, Email, Phone, {E ? 'Unit' : T.unit}{R ? `, Role, ${bulkOpts.idLabel}` : ''}</p>
                  <p className="text-xs" style={{ color: 'rgba(129,140,248,0.85)' }}>
                    {E ? <>Upload a CSV or PDF with these columns, or type residents into the table below.
                    Unit is required and must match an existing unit number (e.g. 1A, 2B) — residents can't sign in without one. Phone is optional.</>
                    : `Upload a CSV or PDF with these columns, or type ${lower(T.members)} into the table below. ${T.unit} is required and must match an existing ${lower(T.unit)} number (e.g. 1A, 2B) — ${lower(T.members)} can't sign in without one. Phone is optional.${R ? ` Role is ${site.roles.map(r => r.label).join(', ')} — leave it blank for ${memberDef.plural.toLowerCase()}.` : ''}`}
                  </p>
                </div>
                <button type="button" onClick={() => downloadTemplate(E ? undefined : T, bulkOpts)}
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
                  {bulkFile ? 'Loaded into the table below — review or edit before sending. Click to replace.' : (E ? 'Columns: Name, Email, Phone, Unit' : `Columns: Name, Email, Phone, ${T.unit}`)}
                </p>
              </div>
            </label>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-sub)' }}>{E ? 'Resident list' : `${T.member} list`}</label>
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
                <div className={`hidden md:grid ${bulkGrid} gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide`}
                  style={{ background: '#F8FAFC', color: 'var(--text-dim)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <span>Name *</span><span>Email *</span><span>Phone</span><span>{E ? 'Unit' : T.unit} *</span>{R && <><span>Role</span><span className="truncate">{bulkOpts.idLabel}</span></>}<span />
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {bulkRows.map((r, i) => {
                    const blank = isBlankRow(r);
                    const bad = rowIssues(r);
                    const cell = (flag) => `input-field !py-1.5 !px-2.5 text-sm${!blank && flag ? ' !border-red-400' : ''}`;
                    return (
                      <div key={i} className={`grid grid-cols-2 ${bulkGrid} gap-2 px-3 py-2 items-center`}
                        style={{ borderTop: i > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                        <input className={cell(bad.name)} placeholder="Name" value={r.name}
                          onChange={e => updateBulkRow(i, 'name', e.target.value)} onPaste={e => handleBulkPaste(i, e)} />
                        <input className={cell(bad.email)} placeholder="Email" type="email" value={r.email}
                          onChange={e => updateBulkRow(i, 'email', e.target.value)} onPaste={e => handleBulkPaste(i, e)} />
                        <input className={cell(false)} placeholder="Phone" type="tel" value={r.phone}
                          onChange={e => updateBulkRow(i, 'phone', e.target.value)} onPaste={e => handleBulkPaste(i, e)} />
                        <div className="flex items-center gap-2 md:contents">
                          <input className={`${cell(bad.unit)} flex-1 min-w-0 uppercase`} placeholder={E ? 'Unit' : T.unit} list="bulk-unit-options"
                            title={!blank && bad.unit ? (r.unitNumber.trim() ? (E ? 'No unit with this number' : `No ${lower(T.unit)} with this number`) : (E ? 'Unit is required' : `${T.unit} is required`)) : undefined}
                            value={r.unitNumber}
                            onChange={e => updateBulkRow(i, 'unitNumber', e.target.value)} onPaste={e => handleBulkPaste(i, e)} />
                          {R && (
                            <>
                              <select className={`${cell(false)} flex-1 min-w-0`} value={r.role || ''} onChange={e => updateBulkRow(i, 'role', e.target.value)} aria-label="Role">
                                {site.roles.map((x, k) => <option key={x.key} value={k === 0 ? '' : x.key}>{x.label}</option>)}
                              </select>
                              <input className={`${cell(false)} flex-1 min-w-0`} placeholder={bulkOpts.idLabel} value={r.idNumber || ''}
                                onChange={e => updateBulkRow(i, 'idNumber', e.target.value)} onPaste={e => handleBulkPaste(i, e)} />
                            </>
                          )}
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
                  {units.map(u => <option key={u._id} value={u.unitNumber}>{unitLabel(u, site)}</option>)}
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

      {addingFamily && <AddFamilyPanel onClose={() => setAddingFamily(false)} onSaved={() => load()} />}
      {showRequests && <FamilyRequestsPanel onClose={() => setShowRequests(false)} onChanged={() => { loadFamilyCount(); load(); }} />}

      <ResidentDrawer
        resident={selected}
        units={units}
        onToggle={handleToggle}
        onAssignUnit={handleAssignUnit}
        onClose={() => setSelected(null)}
        onOpenProfile={(r) => { setSelected(null); navigate(`/residents/${r._id}`, { state: { resident: r, units } }); }}
        onChanged={() => load(page, search)}
      />

      {/* ── Direct Add Modal ────────────────────────────────────── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={`Add ${T.member} Directly`}>
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
          <UnitPicker label={E ? 'Apartment' : T.unit} value={form.unitId} units={units}
            onChange={(unitId) => setForm(f => ({ ...f, unitId }))} onCreated={(u) => setUnits(list => [...list, u])} />
          <MemberSectorFields value={addSector} onChange={setAddSector} />
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Adding…' : `Add ${T.member}`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
