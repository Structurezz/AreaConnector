// Gate log (site module 'gatelog'): deliveries and vehicles the guards log in
// and out at the gate. Managers can review the day, mark entries out and log
// one themselves.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Truck, Car, Package, Search, X, Plus, LogOut, Clock, CalendarDays, CircleDot, RefreshCw, MapPin, User, Building2, Send,
} from 'lucide-react';
import { format, formatDistanceStrict } from 'date-fns';
import toast from 'react-hot-toast';
import { gateLogAPI } from '../api';
import { useSite } from '../context/SiteContext';
import { useSocket } from '../context/SocketContext';
import StatTile from '../components/site/StatTile';
import SitePanel from '../components/site/SitePanel';
import { HEADER_BTN_PRIMARY, HEADER_BTN_GHOST } from '../components/dashboard/PageHeader';

const KIND = {
  delivery: { label: 'Delivery', Icon: Package, color: '#8B5CF6', bg: '#F5F3FF' },
  vehicle:  { label: 'Vehicle',  Icon: Car,     color: '#0EA5E9', bg: '#F0F9FF' },
};
const today = () => format(new Date(), 'yyyy-MM-dd');
const hhmm = (d) => (d ? format(new Date(d), 'HH:mm') : '');
const stayed = (e) => formatDistanceStrict(new Date(e.timeOut || Date.now()), new Date(e.timeIn));
const BLANK = { kind: 'delivery', vehiclePlate: '', driverName: '', driverPhone: '', company: '', goods: '', destination: '', notes: '' };

function KindBadge({ kind }) {
  const k = KIND[kind] || KIND.delivery;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: k.bg, color: k.color }}>
      <k.Icon size={11} /> {k.label}
    </span>
  );
}

function OpenBadge({ e }) {
  return e.timeOut ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 whitespace-nowrap">Out {hhmm(e.timeOut)}</span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 whitespace-nowrap">
      <span className="relative flex w-1.5 h-1.5"><span className="absolute inset-0 rounded-full bg-amber-500 animate-ping opacity-70" /><span className="relative w-1.5 h-1.5 rounded-full bg-amber-500" /></span>
      On site
    </span>
  );
}

function LogEntryPanel({ onClose, onSaved, T }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    if (!form.vehiclePlate.trim() && !form.driverName.trim() && !form.company.trim()) {
      toast.error('Add a plate number, driver or company');
      return;
    }
    setSaving(true);
    try {
      const { data } = await gateLogAPI.create(form);
      toast.success(data.message || 'Logged in');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not log the entry');
    } finally { setSaving(false); }
  };
  const field = (k, placeholder, Icon, extra = {}) => (
    <div className="relative">
      {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />}
      <input className={`input-field text-sm ${Icon ? '!pl-9' : ''}`} placeholder={placeholder} value={form[k]} onChange={e => set(k, e.target.value)} {...extra} />
    </div>
  );
  return (
    <SitePanel eyebrow="Gate log" title="Log an entry" subtitle="Record a delivery or vehicle coming in. Mark it out when it leaves."
      accent={['#F97316', '#EA580C']} onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-[9px] text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">Cancel</button>
          <button type="submit" form="gatelog-form" disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-[9px] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', boxShadow: '0 8px 18px -10px #EA580C' }}>
            <Send size={14} /> {saving ? 'Logging…' : 'Log in now'}
          </button>
        </div>
      }>
      <form id="gatelog-form" onSubmit={submit} className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(KIND).map(([k, { label, Icon, color, bg }]) => {
            const on = form.kind === k;
            return (
              <button type="button" key={k} onClick={() => set('kind', k)}
                className="flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all"
                style={on ? { borderColor: color, background: bg, boxShadow: `0 0 0 3px ${color}1A` } : { borderColor: '#E2E8F0' }}>
                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={on ? { background: `linear-gradient(135deg, ${color}, ${color}CC)`, color: '#fff' } : { background: '#F1F5F9', color: '#94A3B8' }}><Icon size={15} /></span>
                <span className="text-[13px] font-semibold" style={{ color: on ? color : '#475569' }}>{label}</span>
              </button>
            );
          })}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Vehicle & driver</p>
          <div className="space-y-2.5">
            {field('vehiclePlate', 'Plate number', Car, { style: { textTransform: 'uppercase' } })}
            <div className="grid grid-cols-2 gap-2.5">
              {field('driverName', 'Driver name', User)}
              {field('driverPhone', 'Driver phone', null, { type: 'tel' })}
            </div>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">What and where</p>
          <div className="space-y-2.5">
            {field('company', 'Company', Building2)}
            {form.kind === 'delivery' && field('goods', 'Goods (e.g. 20 cartons of water)', Package)}
            {field('destination', `Going to (${T.unit.toLowerCase()}, office or person)`, MapPin)}
            <textarea rows={2} className="input-field text-sm resize-none" placeholder="Notes (optional)" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <p className="text-[11.5px] text-slate-400">Add at least a plate number, driver or company. The time in is recorded now.</p>
      </form>
    </SitePanel>
  );
}

export default function GateLog() {
  const site = useSite();
  const T = site.terms;
  const socketCtx = useSocket();
  const [entries, setEntries] = useState([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [date, setDate] = useState(today);
  const [openOnly, setOpenOnly] = useState(false);
  const [kind, setKind] = useState('');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [logging, setLogging] = useState(false);
  const [closing, setClosing] = useState(null);

  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 300); return () => clearTimeout(t); }, [q]);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    try {
      const params = { q: debounced || undefined, limit: 200 };
      if (openOnly) params.open = '1';
      else if (date) params.date = date;
      const { data } = await gateLogAPI.list(params);
      setEntries(data.data || []);
      setOpenCount(data.openCount || 0);
    } catch (err) {
      if (err.response?.data?.code !== 'MODULE_OFF') toast.error(err.response?.data?.message || 'Could not load the gate log');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date, openOnly, debounced]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!socketCtx?.subscribe) return;
    return socketCtx.subscribe('gatelog_update', () => load(true));
  }, [socketCtx, load]);

  const markOut = async (e) => {
    setClosing(e._id);
    try {
      const { data } = await gateLogAPI.markOut(e._id);
      toast.success(data.message || 'Logged out');
      load(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not log out');
    } finally { setClosing(null); }
  };

  const shown = useMemo(() => entries.filter(e => !kind || e.kind === kind), [entries, kind]);
  const counts = useMemo(() => ({
    all: entries.length,
    deliveries: entries.filter(e => e.kind === 'delivery').length,
    vehicles: entries.filter(e => e.kind === 'vehicle').length,
  }), [entries]);
  const isToday = !openOnly && date === today();
  const dayLabel = openOnly ? 'On site now' : isToday ? 'Today' : date ? format(new Date(`${date}T12:00:00`), 'EEE d MMM') : 'All dates';

  const stats = [
    { key: 'open', label: 'On site now', value: openCount, Icon: CircleDot, color: '#F59E0B', hint: 'Not logged out yet', pulse: openCount > 0, active: openOnly, onClick: () => setOpenOnly(o => !o) },
    { key: 'all', label: `Entries · ${dayLabel}`, value: counts.all, Icon: CalendarDays, color: '#F97316', hint: 'In the list below' },
    { key: 'delivery', label: 'Deliveries', value: counts.deliveries, Icon: Package, color: '#8B5CF6', hint: dayLabel, active: kind === 'delivery', onClick: () => setKind(k => (k === 'delivery' ? '' : 'delivery')) },
    { key: 'vehicle', label: 'Vehicles', value: counts.vehicles, Icon: Car, color: '#0EA5E9', hint: dayLabel, active: kind === 'vehicle', onClick: () => setKind(k => (k === 'vehicle' ? '' : 'vehicle')) },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="dash-rise flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900" style={{ letterSpacing: '-0.025em' }}>Gate log</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Deliveries and vehicles in and out of your {T.site.toLowerCase()}.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(true)} className={HEADER_BTN_GHOST} aria-label="Refresh">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => setLogging(true)} className={HEADER_BTN_PRIMARY}><Plus size={15} /> Log entry</button>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => <StatTile key={s.key} i={i} {...s} />)}
      </div>

      {/* Toolbar */}
      <div className="dash-rise flex items-center gap-2.5 flex-wrap" style={{ animationDelay: '300ms' }}>
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="w-full rounded-xl bg-white border border-slate-200 pl-10 pr-9 py-2.5 text-sm outline-none transition-all focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            placeholder="Search plate, driver, company, goods…" value={q} onChange={e => setQ(e.target.value)} />
          {q && <button onClick={() => setQ('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={15} /></button>}
        </div>
        <div className="flex items-center gap-2">
          <div className={`relative ${openOnly ? 'opacity-50' : ''}`}>
            <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="date" value={date} max={today()} disabled={openOnly} onChange={e => setDate(e.target.value)}
              className="rounded-xl bg-white border border-slate-200 pl-9 pr-3 py-2 text-[13px] outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
          </div>
          {!isToday && !openOnly && (
            <button onClick={() => setDate(today())} className="text-[12px] font-semibold px-2.5 py-2 rounded-lg text-orange-700 bg-orange-50 hover:bg-orange-100">Today</button>
          )}
          <button onClick={() => setOpenOnly(o => !o)}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-2 rounded-xl border transition-all"
            style={openOnly ? { background: '#FFFBEB', borderColor: '#F59E0B', color: '#B45309' } : { background: '#fff', borderColor: '#E2E8F0', color: '#475569' }}>
            <CircleDot size={13} /> On site only
          </button>
        </div>
      </div>

      {/* List */}
      <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 overflow-hidden" style={{ animationDelay: '360ms' }}>
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="skeleton w-9 h-9 rounded-xl" />
                <div className="flex-1 space-y-2"><div className="skeleton h-3 w-44 rounded" /><div className="skeleton h-2.5 w-28 rounded" /></div>
                <div className="skeleton h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : !shown.length ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center px-6">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <span className="dash-ripple absolute inset-0 rounded-full border-2 border-orange-200" />
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FB923C, #EA580C)' }}>
                <Truck size={28} className="text-white" />
              </div>
            </div>
            <p className="font-semibold text-slate-800 mt-2">{q ? `Nothing matches “${q}”` : openOnly ? 'Nothing on site right now' : `No entries ${isToday ? 'today' : 'on this day'}`}</p>
            <p className="text-sm text-slate-400">Guards log deliveries and vehicles from the security app. You can log one here too.</p>
            <button onClick={() => setLogging(true)} className="btn-primary gap-2 mt-2"><Plus size={14} /> Log entry</button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block">
              <div className="grid grid-cols-[1.4fr_1.5fr_1.1fr_0.9fr_0.9fr_auto] gap-4 px-5 py-3 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>Vehicle / driver</span><span>Company / goods</span><span>Going to</span><span>In</span><span>Out</span><span className="w-[92px]" />
              </div>
              {shown.map((e, i) => {
                const k = KIND[e.kind] || KIND.delivery;
                return (
                  <div key={e._id} className="dash-rise grid grid-cols-[1.4fr_1.5fr_1.1fr_0.9fr_0.9fr_auto] gap-4 items-center px-5 py-3 border-t border-slate-100 first-of-type:border-0 hover:bg-slate-50/70 transition-colors"
                    style={{ animationDelay: `${400 + Math.min(i, 20) * 25}ms`, boxShadow: `inset 3px 0 0 ${e.timeOut ? 'transparent' : '#F59E0B'}` }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${k.color}, ${k.color}CC)`, boxShadow: `0 6px 12px -6px ${k.color}` }}>
                        <k.Icon size={15} className="text-white" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-slate-900 truncate font-mono tracking-wide">{e.vehiclePlate || <span className="font-sans tracking-normal text-slate-400 font-medium">No plate</span>}</div>
                        <div className="text-[11.5px] text-slate-500 truncate">{[e.driverName, e.driverPhone].filter(Boolean).join(' · ') || '—'}</div>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-medium text-slate-800 truncate">{e.company || '—'}</div>
                      <div className="text-[11.5px] text-slate-400 truncate">{e.goods || e.notes || <KindBadge kind={e.kind} />}</div>
                    </div>
                    <div className="text-[12.5px] text-slate-600 truncate">{e.destination || '—'}</div>
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold text-slate-900 tabular-nums">{hhmm(e.timeIn)}</div>
                      <div className="text-[11px] text-slate-400 truncate">{e.loggedBy?.name || ''}</div>
                    </div>
                    <div className="min-w-0">
                      <OpenBadge e={e} />
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate"><Clock size={10} className="inline -mt-0.5" /> {stayed(e)}</div>
                    </div>
                    <div className="w-[92px] flex justify-end">
                      {!e.timeOut && (
                        <button onClick={() => markOut(e)} disabled={closing === e._id}
                          className="inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg text-amber-700 bg-amber-50 border border-amber-100 hover:bg-amber-100 disabled:opacity-60">
                          <LogOut size={12} /> {closing === e._id ? '…' : 'Mark out'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Phone cards */}
            <div className="lg:hidden divide-y divide-slate-100">
              {shown.map((e, i) => {
                const k = KIND[e.kind] || KIND.delivery;
                return (
                  <div key={e._id} className="dash-rise px-4 py-3.5" style={{ animationDelay: `${300 + Math.min(i, 20) * 30}ms` }}>
                    <div className="flex items-start gap-3">
                      <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${k.color}, ${k.color}CC)` }}>
                        <k.Icon size={16} className="text-white" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold text-slate-900 truncate">{e.vehiclePlate || e.company || e.driverName}</span>
                          <OpenBadge e={e} />
                        </div>
                        <div className="text-[12px] text-slate-500 truncate">{[e.company, e.goods].filter(Boolean).join(' · ') || k.label}</div>
                        <div className="text-[11.5px] text-slate-400 mt-0.5 truncate">
                          In {hhmm(e.timeIn)}{e.destination ? ` · to ${e.destination}` : ''}{e.driverName ? ` · ${e.driverName}` : ''}
                        </div>
                      </div>
                      {!e.timeOut && (
                        <button onClick={() => markOut(e)} disabled={closing === e._id}
                          className="flex-shrink-0 inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg text-amber-700 bg-amber-50 border border-amber-100 disabled:opacity-60">
                          <LogOut size={12} /> Out
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {logging && <LogEntryPanel T={T} onClose={() => setLogging(false)} onSaved={() => load(true)} />}
    </div>
  );
}
