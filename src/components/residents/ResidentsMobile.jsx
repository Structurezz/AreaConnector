import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  Users, Search, X, Building2, Home, DoorOpen, MailPlus, Upload, Plus, MoreVertical,
  UserX, UserCheck, Phone, Mail, ChevronRight,
} from 'lucide-react';
import useCountUp from '../../hooks/useCountUp';
import Pagination from '../ui/Pagination';

const initials = (n = '') => n.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
const hue = (n = '?') => (n.charCodeAt(0) * 37) % 360;

function Tile({ i, label, value, Icon, color }) {
  const n = useCountUp(value || 0);
  return (
    <div className="dash-rise relative overflow-hidden rounded-2xl p-3.5 border"
      style={{ animationDelay: `${60 + i * 50}ms`, background: `linear-gradient(140deg, ${color}1F 0%, #FFFFFF 62%)`, borderColor: `${color}33` }}>
      <span className="absolute -bottom-7 -right-7 w-20 h-20 rounded-full pointer-events-none" style={{ background: `${color}14` }} />
      <span className="relative w-8 h-8 rounded-xl flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 14px -6px ${color}` }}>
        <Icon size={15} className="text-white" />
      </span>
      <div className="relative mt-2.5 text-[22px] font-semibold leading-none text-slate-900 tabular-nums" style={{ letterSpacing: '-0.03em' }}>{n}</div>
      <div className="relative mt-1 text-[12px] font-medium text-slate-500 truncate">{label}</div>
    </div>
  );
}

// Small anchored menu used for header extras and per-resident actions
function Menu({ open, onClose, children, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('pointerdown', h);
    return () => document.removeEventListener('pointerdown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div ref={ref} onClick={e => e.stopPropagation()}
      className={`absolute z-30 min-w-[190px] rounded-2xl bg-white border border-slate-200 shadow-xl py-1.5 animate-fade-in ${className}`}>
      {children}
    </div>
  );
}
const MenuItem = ({ Icon, label, onClick, tone = 'text-slate-700', href }) => {
  const cls = `w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium ${tone} active:bg-slate-50`;
  return href
    ? <a href={href} className={cls} onClick={onClick}><Icon size={15} /> {label}</a>
    : <button type="button" onClick={onClick} className={cls}><Icon size={15} /> {label}</button>;
};

function ResidentCard({ r, i, onOpen, onToggle }) {
  const [menu, setMenu] = useState(false);
  const unit = r.unitId ? `${r.unitId.block ? `${r.unitId.block} · ` : ''}Apt ${r.unitId.unitNumber}` : null;
  const h = hue(r.name);
  return (
    <div onClick={() => onOpen(r)} role="button" tabIndex={0}
      className="dash-rise relative rounded-[22px] bg-white border border-slate-200/70 p-3.5 active:scale-[0.99] transition-transform cursor-pointer"
      style={{ animationDelay: `${260 + i * 40}ms`, boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <span className="absolute -inset-[2.5px] rounded-full" style={{ background: r.isActive ? 'conic-gradient(from 200deg, #34D399, #10B981, #0EA5E9, #34D399)' : '#FCA5A5' }} />
          {r.profilePhoto
            ? <img src={r.profilePhoto} alt="" className="relative w-12 h-12 rounded-full object-cover border-2 border-white" />
            : <span className="relative w-12 h-12 rounded-full flex items-center justify-center font-semibold text-[14px] text-white border-2 border-white"
                style={{ background: `linear-gradient(135deg, hsl(${h} 70% 62%), hsl(${(h + 40) % 360} 70% 46%))` }}>{initials(r.name)}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-semibold text-slate-900 truncate" style={{ letterSpacing: '-0.01em' }}>{r.name}</span>
            {!r.isActive && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 flex-shrink-0">Suspended</span>}
          </div>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            {unit
              ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700"><Home size={11} /> {unit}</span>
              : <span className="text-[11px] italic text-slate-400">No apartment</span>}
            {r.createdAt && <span className="text-[11px] text-slate-400">· Joined {format(new Date(r.createdAt), 'MMM yyyy')}</span>}
          </div>
        </div>
        <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button type="button" onClick={() => setMenu(m => !m)} aria-label="Resident actions"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 active:bg-slate-100">
            <MoreVertical size={17} />
          </button>
          <Menu open={menu} onClose={() => setMenu(false)} className="right-0 top-10">
            {r.phone && <MenuItem Icon={Phone} label={`Call ${r.phone}`} href={`tel:${r.phone}`} onClick={() => setMenu(false)} />}
            <MenuItem Icon={Mail} label="Send email" href={`mailto:${r.email}`} onClick={() => setMenu(false)} />
            <MenuItem Icon={ChevronRight} label="View details" onClick={() => { setMenu(false); onOpen(r); }} />
            <div className="my-1 border-t border-slate-100" />
            <MenuItem Icon={r.isActive ? UserX : UserCheck} label={r.isActive ? 'Suspend resident' : 'Activate resident'}
              tone={r.isActive ? 'text-red-600' : 'text-emerald-600'} onClick={() => { setMenu(false); onToggle(r); }} />
          </Menu>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3 text-[12px] text-slate-500 min-w-0">
        <span className="flex items-center gap-1.5 min-w-0 truncate"><Mail size={12} className="text-slate-300 flex-shrink-0" /><span className="truncate">{r.email}</span></span>
        {r.phone && <span className="flex items-center gap-1.5 flex-shrink-0"><Phone size={12} className="text-slate-300" />{r.phone}</span>}
      </div>
    </div>
  );
}

export default function ResidentsMobile({
  residents, loading, search, onSearch, totalAll, unitStats,
  page, pagination, limit, onPage, onOpen, onToggle, onInvite, onBulk, onAdd,
}) {
  const [filter, setFilter] = useState('');
  const [more, setMore] = useState(false);

  const FILTERS = [
    ['', 'All', residents.length],
    ['active', 'Active', residents.filter(r => r.isActive).length],
    ['suspended', 'Suspended', residents.filter(r => !r.isActive).length],
    ['unassigned', 'No apartment', residents.filter(r => !r.unitId).length],
  ];
  const shown = residents.filter(r =>
    !filter ? true : filter === 'active' ? r.isActive : filter === 'suspended' ? !r.isActive : !r.unitId);

  return (
    <div className="space-y-5 pb-2">
      {/* Header */}
      <header className="dash-rise flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-slate-400">Community</div>
          <h1 className="text-[22px] font-semibold text-slate-900 leading-tight" style={{ letterSpacing: '-0.03em' }}>Residents</h1>
        </div>
        <div className="relative flex items-center gap-1.5 flex-shrink-0">
          <button onClick={onInvite}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold text-white active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 10px 20px -12px rgba(5,150,105,0.9)' }}>
            <MailPlus size={15} /> Invite resident
          </button>
          <button onClick={() => setMore(m => !m)} aria-label="More ways to add"
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 active:bg-slate-50">
            <MoreVertical size={16} />
          </button>
          <Menu open={more} onClose={() => setMore(false)} className="right-0 top-11">
            <MenuItem Icon={Upload} label="Bulk invite (paste a list)" onClick={() => { setMore(false); onBulk(); }} />
            <MenuItem Icon={Plus} label="Add without email" onClick={() => { setMore(false); onAdd(); }} />
          </Menu>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2.5">
        <Tile i={0} label="Residents"   value={totalAll}           Icon={Users}     color="#10B981" />
        <Tile i={1} label="Apartments"  value={unitStats.total}    Icon={Building2} color="#6366F1" />
        <Tile i={2} label="Occupied"    value={unitStats.occupied} Icon={Home}      color="#0EA5E9" />
        <Tile i={3} label="Open spaces" value={unitStats.open}     Icon={DoorOpen}  color="#F59E0B" />
      </div>

      {/* Search */}
      <div className="dash-rise relative" style={{ animationDelay: '240ms' }}>
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="w-full rounded-2xl bg-white border border-slate-200 pl-10 pr-10 py-3 text-[14px] outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
          placeholder="Search by name or email…" value={search} onChange={e => onSearch(e.target.value)} />
        {search && (
          <button onClick={() => onSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={16} /></button>
        )}
      </div>

      {/* Filters */}
      <div className="sticky -top-4 z-10 -mx-4 px-4 py-2 bg-[#F8FAFC]/90 backdrop-blur">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {FILTERS.map(([key, label, n]) => {
            const on = filter === key;
            return (
              <button key={key || 'all'} onClick={() => setFilter(key)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap flex-shrink-0 transition-all"
                style={on ? { background: '#064E3B', color: '#fff' } : { background: '#fff', color: '#475569', border: '1px solid #E2E8F0' }}>
                {label}
                <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] leading-[18px] text-center tabular-nums"
                  style={on ? { background: 'rgba(255,255,255,0.18)' } : { background: key === 'suspended' && n ? '#FEE2E2' : '#F1F5F9', color: key === 'suspended' && n ? '#DC2626' : '#64748B' }}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map(k => (
            <div key={k} className="rounded-[22px] bg-white border border-slate-200/70 p-3.5 flex items-center gap-3">
              <div className="skeleton w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2"><div className="skeleton h-3 w-40 rounded" /><div className="skeleton h-2.5 w-24 rounded" /></div>
            </div>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="dash-rise rounded-[22px] bg-white border border-slate-200/70 px-6 py-10 text-center">
          <span className="relative mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-emerald-50">
            <span className="dash-ripple absolute inset-0 rounded-full bg-emerald-100" />
            <Users size={24} className="relative text-emerald-600" />
          </span>
          <div className="mt-4 text-[15px] font-semibold text-slate-900">
            {search ? `No residents match “${search}”` : filter ? 'Nobody in this group' : 'No residents yet'}
          </div>
          <div className="text-[13px] text-slate-500 mt-1">
            {search || filter ? 'Try a different search or filter.' : 'Invite residents and they will appear here.'}
          </div>
          {!search && !filter && (
            <button onClick={onInvite} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}><MailPlus size={14} /> Send an invite</button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((r, i) => <ResidentCard key={r._id} r={r} i={i} onOpen={onOpen} onToggle={onToggle} />)}
        </div>
      )}

      {!loading && <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={limit} onPage={onPage} />}
    </div>
  );
}
