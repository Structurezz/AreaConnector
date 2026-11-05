// Hotel room board (site module 'stays'): every room with its state
// (occupied / reserved / vacant), who is in it and when they leave. Click a
// room for its guests — extend or check out — or check a new guest in.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { blockName } from '../utils/siteTypes';
import { useNavigate } from 'react-router-dom';
import {
  BedDouble, DoorOpen, CalendarClock, LogIn, LogOut, Search, X, RefreshCw, MailPlus, ChevronRight, Users, Hourglass,
} from 'lucide-react';
import { formatDistanceToNowStrict, format } from 'date-fns';
import toast from 'react-hot-toast';
import { siteAPI, unitAPI } from '../api';
import { useSite } from '../context/SiteContext';
import { useSocket } from '../context/SocketContext';
import StatTile from '../components/site/StatTile';
import SitePanel from '../components/site/SitePanel';
import { StayCard, StayChip, defaultStay } from '../components/site/MemberFields';
import InviteResidentModal from '../components/residents/InviteResidentModal';
import { HEADER_BTN_PRIMARY, HEADER_BTN_GHOST } from '../components/dashboard/PageHeader';

const STATE = {
  occupied: { label: 'Occupied', color: '#10B981', from: '#D1FAE5', to: '#ECFDF5', ring: '#6EE7B7', Icon: BedDouble },
  reserved: { label: 'Reserved', color: '#0EA5E9', from: '#E0F2FE', to: '#F0F9FF', ring: '#7DD3FC', Icon: CalendarClock },
  vacant:   { label: 'Vacant',   color: '#94A3B8', from: '#F8FAFC', to: '#FFFFFF', ring: '#E2E8F0', Icon: DoorOpen },
};

const SOON = 24 * 3600 * 1000;
const within24 = (d) => d && new Date(d) - Date.now() <= SOON && new Date(d) - Date.now() > -60000;
const leaving = (room) => room.guests.filter(g => (g.state === 'in_house' || g.state === 'none') && within24(g.stay?.checkOut));
const arriving = (room) => room.guests.filter(g => g.state === 'upcoming' && within24(g.stay?.checkIn));
const roomName = (r, T) => `${T.unit} ${r.unitNumber}`;

function Countdown({ room }) {
  const inHouse = room.guests.find(g => g.state === 'in_house' && g.stay?.checkOut);
  const upcoming = room.guests.find(g => g.state === 'upcoming' && g.stay?.checkIn);
  if (inHouse) {
    const soon = within24(inHouse.stay.checkOut);
    return (
      <span className={`inline-flex items-center gap-1 text-[10.5px] font-semibold ${soon ? 'text-rose-600' : 'text-emerald-700'}`}>
        <Hourglass size={10} /> out in {formatDistanceToNowStrict(new Date(inHouse.stay.checkOut))}
      </span>
    );
  }
  if (upcoming) {
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-sky-700">
        <LogIn size={10} /> in {formatDistanceToNowStrict(new Date(upcoming.stay.checkIn))}
      </span>
    );
  }
  return null;
}

function RoomTile({ room, i, T, onOpen }) {
  const st = STATE[room.state] || STATE.vacant;
  const dep = leaving(room).length > 0;
  const arr = arriving(room).length > 0;
  const names = room.guests.filter(g => g.state !== 'checked_out').map(g => g.name);
  return (
    <button type="button" onClick={() => onOpen(room)}
      className="dash-rise dash-tile group text-left rounded-2xl border p-3 min-w-0 flex flex-col"
      style={{ animationDelay: `${Math.min(i, 30) * 25}ms`, background: `linear-gradient(145deg, ${st.from}, ${st.to} 70%)`, borderColor: dep ? '#FDA4AF' : st.ring, minHeight: 112 }}>
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[18px] font-semibold text-slate-900 leading-none tabular-nums" style={{ letterSpacing: '-0.03em' }}>{room.unitNumber}</div>
          <div className="text-[10.5px] text-slate-500 mt-1 truncate capitalize">{(room.type === 'apartment' && T.unit !== 'Unit' ? T.unit : room.type) || T.unit}</div>
        </div>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
          style={room.state === 'vacant' ? { background: '#F1F5F9', color: '#94A3B8' } : { background: `linear-gradient(135deg, ${st.color}, ${st.color}CC)`, color: '#fff', boxShadow: `0 6px 12px -6px ${st.color}` }}>
          <st.Icon size={13} />
        </span>
      </div>
      <div className="relative mt-auto pt-2 space-y-1 min-w-0">
        {names.length ? (
          <div className="text-[12px] font-semibold text-slate-800 truncate">{names[0]}{names.length > 1 && <span className="text-slate-400 font-medium"> +{names.length - 1}</span>}</div>
        ) : (
          <div className="text-[11.5px] font-medium text-slate-400">{st.label}</div>
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Countdown room={room} />
          {dep && <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">Departing</span>}
          {arr && <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">Arriving</span>}
        </div>
      </div>
    </button>
  );
}

export default function RoomBoard() {
  const site = useSite();
  const T = site.terms;
  const navigate = useNavigate();
  const socketCtx = useSocket();
  const [rooms, setRooms] = useState([]);
  const [summary, setSummary] = useState({ total: 0, occupied: 0, vacant: 0, reserved: 0, arriving: 0, departing: 0 });
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(null);
  const [invite, setInvite] = useState(null); // { unitId, stay } | {}

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    try {
      const [r, u] = await Promise.all([siteAPI.rooms(), unitAPI.getAll()]);
      setRooms(r.data.data || []);
      setSummary(r.data.summary || {});
      setUnits(u.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || `Could not load the ${T.unit.toLowerCase()} board`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [T.unit]);

  useEffect(() => { load(); }, [load]);
  // Keep countdowns honest and pick up the auto check-out sweeper
  useEffect(() => { const t = setInterval(() => load(true), 60000); return () => clearInterval(t); }, [load]);
  useEffect(() => {
    if (!socketCtx?.subscribe) return;
    return socketCtx.subscribe('notification', (n) => { if (n?.type === 'stay_checkout') load(true); });
  }, [socketCtx, load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rooms.filter(r => {
      if (filter === 'arriving' && !arriving(r).length) return false;
      if (filter === 'departing' && !leaving(r).length) return false;
      if (['occupied', 'vacant', 'reserved'].includes(filter) && r.state !== filter) return false;
      if (!s) return true;
      return String(r.unitNumber).toLowerCase().includes(s) || (r.block || '').toLowerCase().includes(s)
        || r.guests.some(g => (g.name || '').toLowerCase().includes(s) || (g.phone || '').includes(s));
    });
  }, [rooms, filter, q]);

  const blocks = useMemo(() => {
    const m = new Map();
    for (const r of filtered) {
      const k = r.block || '';
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(r);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
      .map(([name, list]) => [name, list.sort((a, b) => String(a.unitNumber).localeCompare(String(b.unitNumber), undefined, { numeric: true }))]);
  }, [filtered]);

  const open = rooms.find(r => r._id === openId) || null;
  const pct = summary.total ? Math.round((summary.occupied / summary.total) * 100) : 0;
  const toggle = (k) => setFilter(f => (f === k ? '' : k));

  const stats = [
    { key: 'occupied',  label: 'Occupied',          value: summary.occupied,  Icon: BedDouble,     color: '#10B981', hint: `${pct}% of ${summary.total || 0} ${T.units.toLowerCase()}` },
    { key: 'vacant',    label: 'Vacant',            value: summary.vacant,    Icon: DoorOpen,      color: '#64748B', hint: 'Ready for check-in' },
    { key: 'reserved',  label: 'Reserved',          value: summary.reserved,  Icon: CalendarClock, color: '#0EA5E9', hint: 'Guest arriving later' },
    { key: 'arriving',  label: 'Arriving · 24h',    value: summary.arriving,  Icon: LogIn,         color: '#6366F1', hint: 'Check-ins due', pulse: summary.arriving > 0 },
    { key: 'departing', label: 'Departing · 24h',   value: summary.departing, Icon: LogOut,        color: '#F43F5E', hint: 'Check-outs due', pulse: summary.departing > 0 },
  ];

  const checkIn = (room) => {
    setOpenId(null);
    setInvite({ unitId: room?._id || '', stay: defaultStay() });
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="dash-rise flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900" style={{ letterSpacing: '-0.025em' }}>{T.unit} board</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Who's in every {T.unit.toLowerCase()} right now, and who's arriving or leaving.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(true)} className={HEADER_BTN_GHOST} aria-label="Refresh">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => checkIn(null)} className={HEADER_BTN_PRIMARY}><MailPlus size={15} /> Check in {T.member.toLowerCase()}</button>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s, i) => (
          <StatTile key={s.key} i={i} {...s} active={filter === s.key} onClick={() => toggle(s.key)} />
        ))}
      </div>

      {/* Toolbar */}
      <div className="dash-rise flex items-center gap-2.5 flex-wrap" style={{ animationDelay: '320ms' }}>
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="w-full rounded-xl bg-white border border-slate-200 pl-10 pr-9 py-2.5 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            placeholder={`Search ${T.unit.toLowerCase()} or ${T.member.toLowerCase()}…`} value={q} onChange={e => setQ(e.target.value)} />
          {q && <button onClick={() => setQ('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={15} /></button>}
        </div>
        <div className="flex items-center gap-3 text-[11.5px] text-slate-500">
          {Object.entries(STATE).map(([k, s]) => (
            <span key={k} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />{s.label}</span>
          ))}
        </div>
      </div>

      {/* Board */}
      {loading ? (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {Array.from({ length: 16 }).map((_, i) => <div key={i} className="skeleton h-[112px] rounded-2xl" />)}
        </div>
      ) : !rooms.length ? (
        <div className="rounded-2xl bg-white border border-slate-200/70 flex flex-col items-center py-16 gap-3 text-center px-6">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <span className="dash-ripple absolute inset-0 rounded-full border-2 border-emerald-200" />
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #34D399, #059669)' }}>
              <BedDouble size={28} className="text-white" />
            </div>
          </div>
          <p className="font-semibold text-slate-800 mt-2">No {T.units.toLowerCase()} yet</p>
          <p className="text-sm text-slate-400">Add your {T.units.toLowerCase()} first, then check {T.members.toLowerCase()} in from here.</p>
          <button onClick={() => navigate('/units')} className="btn-primary gap-2 mt-2"><DoorOpen size={14} /> Add {T.units.toLowerCase()}</button>
        </div>
      ) : !filtered.length ? (
        <div className="rounded-2xl bg-white border border-slate-200/70 py-14 text-center">
          <p className="font-semibold text-slate-800">Nothing matches</p>
          <p className="text-sm text-slate-400 mt-1">Try a different search or clear the filter.</p>
          <button onClick={() => { setQ(''); setFilter(''); }} className="btn-outline mt-3 !text-[13px] !px-3 !py-2">Clear</button>
        </div>
      ) : (
        <div className="space-y-5">
          {blocks.map(([block, list], bi) => {
            const occ = list.filter(r => r.state === 'occupied').length;
            return (
              <section key={block || '—'} className="dash-rise" style={{ animationDelay: `${360 + bi * 60}ms` }}>
                {(blocks.length > 1 || block) && (
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <span className="text-[13px] font-semibold text-slate-900">{block ? blockName(block, T) : `Other ${T.units.toLowerCase()}`}</span>
                    <span className="text-[11px] text-slate-400 tabular-nums">{occ}/{list.length} occupied</span>
                    <span className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden max-w-[160px]">
                      <span className="block h-full rounded-full" style={{ width: `${list.length ? (occ / list.length) * 100 : 0}%`, background: 'linear-gradient(90deg, #34D399, #10B981)', transformOrigin: 'left', animation: 'dashGrowX 0.9s cubic-bezier(0.16,1,0.3,1) both' }} />
                    </span>
                  </div>
                )}
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                  {list.map((r, i) => <RoomTile key={r._id} room={r} i={i} T={T} onOpen={(x) => setOpenId(x._id)} />)}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {open && (
        <SitePanel
          eyebrow={`${STATE[open.state]?.label || ''}${open.block ? ` · ${blockName(open.block, T)}` : ''}`}
          title={roomName(open, T)}
          subtitle={open.type ? <span className="capitalize">{open.type}</span> : null}
          accent={open.state === 'occupied' ? ['#10B981', '#047857'] : open.state === 'reserved' ? ['#0EA5E9', '#0369A1'] : ['#64748B', '#334155']}
          onClose={() => setOpenId(null)}
          footer={
            <button onClick={() => checkIn(open)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-[9px] px-3 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 8px 18px -10px #059669' }}>
              <LogIn size={15} /> {open.state === 'vacant' ? `Check in ${T.member.toLowerCase()}` : `Add another ${T.member.toLowerCase()} / booking`}
            </button>
          }>
          <div className="p-5 space-y-4">
            {!open.guests.length ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                <DoorOpen size={26} className="mx-auto text-slate-300" />
                <p className="text-[13px] font-semibold text-slate-700 mt-2">This {T.unit.toLowerCase()} is free</p>
                <p className="text-[12px] text-slate-400 mt-0.5">Check a {T.member.toLowerCase()} in with their stay dates. Access ends automatically at check-out.</p>
              </div>
            ) : open.guests.map((g, i) => (
              <div key={g._id} className="space-y-2.5" style={{ animation: `dashRise 0.45s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms both` }}>
                <button onClick={() => navigate(`/residents/${g._id}`)}
                  className="w-full flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50 transition-colors">
                  {g.profilePhoto
                    ? <img src={g.profilePhoto} alt="" className="w-10 h-10 rounded-full object-cover" />
                    : <span className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-[14px]" style={{ background: 'linear-gradient(135deg, #34D399, #0EA5E9)' }}>{g.name?.[0]?.toUpperCase()}</span>}
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13.5px] font-semibold text-slate-900 truncate">{g.name}</span>
                    <span className="block text-[11.5px] text-slate-400 truncate">{g.phone || g.email}</span>
                  </span>
                  <StayChip stay={g.stay} />
                  <ChevronRight size={14} className="text-slate-300" />
                </button>
                {g.state !== 'none' && <StayCard member={{ ...g, householdRole: 'head' }} onChanged={() => load(true)} />}
                {g.state === 'none' && <p className="text-[11.5px] text-slate-400 px-1">No stay dates — open their profile to add them.</p>}
              </div>
            ))}
            {open.guests.length > 0 && (
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5"><Users size={11} /> {T.familyPlural} share the main {T.member.toLowerCase()}'s stay dates.</p>
            )}
            {open.guests.some(g => g.stay?.checkOut) && (
              <p className="text-[11px] text-slate-400">Updated {format(new Date(), 'HH:mm')}</p>
            )}
          </div>
        </SitePanel>
      )}

      <InviteResidentModal open={!!invite} onClose={() => setInvite(null)} units={units} initial={invite} onSaved={() => load(true)} />
    </div>
  );
}
