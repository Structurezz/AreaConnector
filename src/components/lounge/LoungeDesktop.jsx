import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, BarChart2, Plus, ArrowRight, Users, Headphones, Radio, MapPin, Sparkles, Clock,
  ChevronLeft, ChevronRight, LayoutGrid, CalendarDays, PartyPopper, Trash2, User, X,
} from 'lucide-react';
import { eventAPI, pollAPI } from '../../api';
import useCountUp from '../../hooks/useCountUp';
import SidePanel from '../payments/SidePanel';

const pad = (n) => String(n).padStart(2, '0');
const FUN = '#F59E0B';
const tintOf = (ev, catMap) => (ev.isFridayFunTimes ? FUN : (catMap[ev.category] || catMap.general).color);

/* ── Header with the Friday countdown ───────────────────────────────── */
export function LoungeBanner({ isFridayNight, countdown, onCreate }) {
  return (
    <div className="dash-rise flex items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[12px] text-slate-500"><Sparkles size={12} className="text-emerald-600" /> Community</div>
        <h1 className="mt-1 text-[22px] font-semibold text-slate-900" style={{ letterSpacing: '-0.025em' }}>Lounge</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Where your estate hangs out: posts, events, polls and music.</p>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {isFridayNight ? (
          <div className="flex items-center gap-2 h-11 px-4 rounded-xl border border-amber-200" style={{ background: 'linear-gradient(120deg, #FFFBEB, #FDF2F8)' }}>
            <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-amber-400 animate-ping" /><span className="relative w-2 h-2 rounded-full bg-amber-500" /></span>
            <span className="text-[13px] font-semibold text-amber-800">🎉 Friday Night FunTimes is live</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 h-11 pl-3.5 pr-1.5 rounded-xl border border-amber-200/80" style={{ background: 'linear-gradient(120deg, #FFFBEB, #FFF7ED 50%, #FDF2F8)' }}>
            <div className="leading-tight">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Friday FunTimes</div>
              <div className="text-[11px] text-slate-500">starts in</div>
            </div>
            <div className="flex items-center gap-1">
              {[['d', countdown.d], ['h', countdown.h], ['m', countdown.m], ['s', countdown.s]].map(([u, v]) => (
                <div key={u} className="w-9 py-1 rounded-lg bg-white border border-amber-100 text-center shadow-sm">
                  <div className="text-[14px] font-semibold text-slate-900 tabular-nums leading-none">{pad(v)}</div>
                  <div className="text-[8px] font-semibold uppercase text-slate-400 mt-0.5">{u}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {onCreate && (<>
          <button onClick={() => onCreate('polls')} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[13px] font-medium bg-white border border-slate-200 text-slate-700 hover:border-slate-300 transition-all">
            <BarChart2 size={14} className="text-emerald-600" /> New poll
          </button>
          <button onClick={() => onCreate('events')} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[13px] font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-all">
            <Plus size={14} /> New event
          </button>
        </>)}
      </div>
    </div>
  );
}

/* ── Left rail: section nav ─────────────────────────────────────────── */
export function LoungeNav({ tabs, tab, onTab }) {
  return (
    <aside className="space-y-4">
      <nav className="dash-rise rounded-2xl bg-white border border-slate-200/70 p-2" style={{ animationDelay: '60ms' }}>
        {tabs.map(({ key, Icon, label, color }) => {
          const on = tab === key;
          return (
            <button key={key} onClick={() => onTab(key)}
              className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${on ? 'text-slate-900 bg-slate-50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
              {on && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ background: color }} />}
              <span className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                style={on ? { background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 12px -6px ${color}` } : { background: `${color}14` }}>
                <Icon size={14} style={{ color: on ? '#fff' : color }} />
              </span>
              {label}
              {on && <ChevronRight size={14} className="ml-auto text-slate-300" />}
            </button>
          );
        })}
      </nav>

      <Link to="/lounge/dj"
        className="dash-rise group block rounded-2xl p-4 border border-violet-100 transition-all hover:-translate-y-0.5"
        style={{ animationDelay: '120ms', background: 'linear-gradient(135deg, #F5F3FF, #EEF2FF 60%, #FFFFFF)', textDecoration: 'none' }}>
        <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)', boxShadow: '0 8px 18px -8px #6366F1' }}>
          <Headphones size={16} />
        </span>
        <div className="mt-3 text-[13px] font-semibold text-slate-900">DJ Console</div>
        <div className="text-[11.5px] text-slate-500 mt-0.5">Play music live to the whole estate.</div>
        <div className="mt-2 text-[12px] font-semibold text-violet-700 flex items-center gap-1">Go live <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" /></div>
      </Link>
    </aside>
  );
}

/* ── Right rail (feed only): what's coming up ───────────────────────── */
function RailCard({ title, Icon, color, action, children, i }) {
  return (
    <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 overflow-hidden" style={{ animationDelay: `${100 + i * 60}ms` }}>
      <div className="flex items-center justify-between px-4 h-11 border-b border-slate-100">
        <h3 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)` }}>
            <Icon size={12} className="text-white" />
          </span>
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export function LoungeRightRail({ onTab, catMap }) {
  const [events, setEvents] = useState(null);
  const [polls, setPolls] = useState(null);
  useEffect(() => {
    eventAPI.getAll().then(({ data }) => setEvents(data.data || [])).catch(() => setEvents([]));
    pollAPI.getAll().then(({ data }) => setPolls(data.data || [])).catch(() => setPolls([]));
  }, []);

  const upcoming = (events || []).filter((e) => new Date(e.date) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 4);
  const live = (polls || []).filter((p) => p.isActive && !(p.endsAt && new Date() > new Date(p.endsAt))).slice(0, 2);
  const seeAll = (key) => (
    <button onClick={() => onTab(key)} className="group text-[12px] font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1">
      See all <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
    </button>
  );

  return (
    <aside className="space-y-4">
      <RailCard i={0} title="Upcoming events" Icon={Calendar} color="#0EA5E9" action={seeAll('events')}>
        {events === null ? (
          <div className="p-4 space-y-3">{[0, 1].map((k) => <div key={k} className="skeleton h-10 rounded-lg" />)}</div>
        ) : upcoming.length === 0 ? (
          <div className="px-4 py-5 text-center">
            <p className="text-[12px] text-slate-400">Nothing scheduled yet.</p>
            <button onClick={() => onTab('events')} className="mt-2 text-[12px] font-semibold text-sky-600 hover:text-sky-700">Plan an event</button>
          </div>
        ) : (
          <div className="p-2">
            {upcoming.map((ev) => {
              const color = tintOf(ev, catMap);
              const d = new Date(ev.date);
              return (
                <button key={ev._id} onClick={() => onTab('events')} className="w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left hover:bg-slate-50 transition-colors">
                  <div className="w-10 rounded-xl py-1 flex flex-col items-center justify-center flex-shrink-0 border" style={{ background: `${color}10`, borderColor: `${color}30` }}>
                    <span className="text-[8.5px] font-bold uppercase leading-none" style={{ color }}>{d.toLocaleDateString('en', { month: 'short' })}</span>
                    <span className="text-[15px] font-semibold leading-none mt-0.5 text-slate-900">{d.getDate()}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-slate-900 truncate">{ev.isFridayFunTimes ? '🎉 ' : ''}{ev.title}</div>
                    <div className="text-[11px] text-slate-400 truncate">{daysAway(ev.date)}{ev.time ? ` · ${ev.time}` : ''} · {ev.rsvps?.length || 0} going</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </RailCard>

      <RailCard i={1} title="Live polls" Icon={BarChart2} color="#10B981" action={seeAll('polls')}>
        {polls === null ? (
          <div className="p-4"><div className="skeleton h-16 rounded-lg" /></div>
        ) : live.length === 0 ? (
          <p className="px-4 py-4 text-[12px] text-slate-400">No open polls.</p>
        ) : (
          <div className="p-4 space-y-4">
            {live.map((poll) => {
              const total = poll.options.reduce((s, o) => s + o.votes.length, 0);
              return (
                <div key={poll._id}>
                  <div className="text-[13px] font-medium text-slate-900 leading-snug">{poll.question}</div>
                  <div className="mt-2 space-y-1.5">
                    {poll.options.slice(0, 3).map((o, k) => {
                      const pct = total ? Math.round((o.votes.length / total) * 100) : 0;
                      return (
                        <div key={k} className="relative h-6 rounded-md bg-slate-100 overflow-hidden">
                          <div className="dash-bar-x absolute inset-y-0 left-0 rounded-md" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #A7F3D0, #6EE7B7)' }} />
                          <div className="relative flex items-center justify-between h-full px-2 text-[11px]">
                            <span className="text-slate-700 truncate">{o.text}</span>
                            <span className="font-semibold text-slate-600 tabular-nums">{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-1.5 text-[11px] text-slate-400">{total} vote{total === 1 ? '' : 's'}</div>
                </div>
              );
            })}
          </div>
        )}
      </RailCard>

      <Link to="/podcasts" className="dash-rise group block rounded-2xl p-4 border border-emerald-100 transition-all hover:-translate-y-0.5"
        style={{ animationDelay: '220ms', background: 'linear-gradient(135deg, #ECFDF5, #F0FDFA 60%, #FFFFFF)', textDecoration: 'none' }}>
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #10B981, #047857)', boxShadow: '0 8px 18px -8px #047857' }}>
            <Radio size={17} />
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-slate-900">Podcast & FM</div>
            <div className="text-[11.5px] text-slate-500">Mixtapes, shows and live rooms</div>
          </div>
          <ArrowRight size={15} className="ml-auto text-slate-400 transition-transform group-hover:translate-x-1" />
        </div>
      </Link>
    </aside>
  );
}

/* ── Events ─────────────────────────────────────────────────────────── */
function daysAway(date) {
  const d = Math.round((new Date(new Date(date).toDateString()) - new Date(new Date().toDateString())) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d < 0) return `${-d} day${d === -1 ? '' : 's'} ago`;
  return `In ${d} days`;
}

function useTicker(target) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const ms = Math.max(0, target - now);
  return { d: Math.floor(ms / 86400000), h: Math.floor((ms % 86400000) / 3600000), m: Math.floor((ms % 3600000) / 60000), s: Math.floor((ms % 60000) / 1000), done: ms === 0 };
}

// Event start as a timestamp (date + optional HH:MM time)
const startOf = (ev) => {
  const d = new Date(ev.date);
  if (ev.time && /^\d{1,2}:\d{2}/.test(ev.time)) { const [h, m] = ev.time.split(':').map(Number); d.setHours(h, m, 0, 0); }
  return d.getTime();
};

function EStat({ i, label, hint, value, Icon, color }) {
  const n = useCountUp(value || 0);
  return (
    <div className="dash-tile dash-rise group rounded-2xl p-4 border min-w-0"
      style={{ animationDelay: `${40 + i * 60}ms`, background: `linear-gradient(140deg, ${color}17 0%, #FFFFFF 55%)`, borderColor: `${color}2E` }}>
      <span className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full pointer-events-none transition-transform duration-500 group-hover:scale-125" style={{ background: `${color}12` }} />
      <span className="relative w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 14px -6px ${color}` }}>
        <Icon size={15} className="text-white" />
      </span>
      <div className="relative mt-3 text-[24px] font-semibold leading-none text-slate-900 tabular-nums" style={{ letterSpacing: '-0.03em' }}>{n}</div>
      <div className="relative mt-1 text-[12px] font-medium text-slate-500 truncate">{label}</div>
      <div className="relative mt-0.5 text-[11px] text-slate-400 truncate">{hint}</div>
    </div>
  );
}

function FeaturedEvent({ ev, catMap, onDelete }) {
  const cat = catMap[ev.category] || catMap.general;
  const color = tintOf(ev, catMap);
  const t = useTicker(startOf(ev));
  const d = new Date(ev.date);
  const going = ev.rsvps?.length || 0;
  return (
    <div className="dash-rise group relative overflow-hidden rounded-2xl border p-5"
      style={{ animationDelay: '260ms', borderColor: `${color}40`, background: `linear-gradient(120deg, ${color}14 0%, #FFFFFF 55%, ${color}0A 100%)` }}>
      <div className="pointer-events-none absolute -top-24 -right-10 w-72 h-72 rounded-full opacity-50" style={{ background: `radial-gradient(circle, ${color}33, transparent 70%)`, animation: 'dashFloat 16s ease-in-out infinite' }} />
      <span className="pointer-events-none absolute right-6 -bottom-8 text-[110px] opacity-[0.12] select-none transition-transform duration-700 group-hover:-rotate-12">{ev.isFridayFunTimes ? '🎉' : cat.emoji}</span>
      <div className="relative flex items-center gap-6">
        <div className="w-[88px] flex-shrink-0 rounded-2xl overflow-hidden text-center bg-white border shadow-sm" style={{ borderColor: `${color}40` }}>
          <div className="py-1 text-[11px] font-bold uppercase text-white" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)` }}>{d.toLocaleDateString('en', { month: 'short' })}</div>
          <div className="py-1.5">
            <div className="text-[30px] font-semibold text-slate-900 leading-none">{d.getDate()}</div>
            <div className="text-[11px] text-slate-400 mt-1">{d.toLocaleDateString('en', { weekday: 'long' })}</div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold">
            <span className="px-2 py-0.5 rounded-full text-white" style={{ background: color }}>Next up · {daysAway(ev.date)}</span>
            <span className="px-2 py-0.5 rounded-full bg-white border" style={{ color, borderColor: `${color}40` }}>{cat.emoji} {cat.label}</span>
            {ev.isFridayFunTimes && <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">🎉 FunTimes</span>}
          </div>
          <h2 className="mt-2 text-[20px] font-semibold text-slate-900 truncate" style={{ letterSpacing: '-0.02em' }}>{ev.title}</h2>
          {ev.description && <p className="mt-1 text-[13px] text-slate-500 line-clamp-2 max-w-2xl">{ev.description}</p>}
          <div className="mt-3 flex items-center gap-x-4 gap-y-1 flex-wrap text-[12px] text-slate-600">
            {ev.time && <span className="flex items-center gap-1.5"><Clock size={13} className="text-slate-400" /> {ev.time}</span>}
            <span className="flex items-center gap-1.5"><MapPin size={13} className="text-slate-400" /> {ev.location || 'Estate Grounds'}</span>
            {ev.organizer && <span className="flex items-center gap-1.5"><User size={13} className="text-slate-400" /> {ev.organizer}</span>}
          </div>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-3">
          {!t.done && (
            <div className="flex items-center gap-1">
              {(t.d ? [['d', t.d], ['h', t.h], ['m', t.m]] : [['h', t.h], ['m', t.m], ['s', t.s]]).map(([u, v]) => (
                <div key={u} className="w-11 py-1.5 rounded-lg bg-white border border-slate-200 text-center shadow-sm">
                  <div className="text-[16px] font-semibold text-slate-900 tabular-nums leading-none">{pad(v)}</div>
                  <div className="text-[9px] font-semibold uppercase text-slate-400 mt-0.5">{u}</div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700"><Users size={12} /> {going} going</span>
            <button onClick={() => onDelete(ev._id)} title="Remove event"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventCard({ ev, i, catMap, onDelete }) {
  const cat = catMap[ev.category] || catMap.general;
  const color = tintOf(ev, catMap);
  const d = new Date(ev.date);
  return (
    <div className="dash-rise group rounded-2xl border bg-white overflow-hidden transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.4)]"
      style={{ animationDelay: `${320 + i * 40}ms`, borderColor: `${color}30` }}>
      <div className="relative px-4 pt-4 pb-3" style={{ background: `linear-gradient(135deg, ${color}14, transparent 75%)` }}>
        <span className="absolute -right-3 -top-3 text-[56px] opacity-20 select-none transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">{ev.isFridayFunTimes ? '🎉' : cat.emoji}</span>
        <div className="relative flex items-center gap-3">
          <div className="w-12 rounded-xl overflow-hidden text-center bg-white border flex-shrink-0" style={{ borderColor: `${color}40` }}>
            <div className="text-[9px] font-bold uppercase text-white py-0.5" style={{ background: color }}>{d.toLocaleDateString('en', { month: 'short' })}</div>
            <div className="text-[18px] font-semibold text-slate-900 leading-none py-1">{d.getDate()}</div>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold" style={{ color }}>{cat.emoji} {cat.label}{ev.isFridayFunTimes && ' · FunTimes'}</div>
            <div className="text-[11px] text-slate-400">{d.toLocaleDateString('en', { weekday: 'long' })} · {daysAway(ev.date)}</div>
          </div>
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="text-[14px] font-semibold text-slate-900 truncate">{ev.title}</div>
        {ev.description && <div className="mt-0.5 text-[12px] text-slate-500 line-clamp-2">{ev.description}</div>}
        <div className="mt-2 space-y-1 text-[12px] text-slate-500">
          {ev.time && <div className="flex items-center gap-1.5"><Clock size={12} className="text-slate-300" />{ev.time}</div>}
          <div className="flex items-center gap-1.5 truncate"><MapPin size={12} className="text-slate-300 flex-shrink-0" />{ev.location || 'Estate Grounds'}</div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[12px] font-semibold text-emerald-600 flex items-center gap-1"><Users size={12} /> {ev.rsvps?.length || 0} going</span>
          <button onClick={() => onDelete(ev._id)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all" title="Remove event"><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  );
}

function MonthCalendar({ events, catMap, onNew }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [picked, setPicked] = useState(null);
  const days = useMemo(() => {
    const start = new Date(cursor); start.setDate(1 - ((cursor.getDay() + 6) % 7)); // Monday-first grid
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [cursor]);
  const byDay = useMemo(() => {
    const m = new Map();
    events.forEach((ev) => { const k = new Date(ev.date).toDateString(); m.set(k, [...(m.get(k) || []), ev]); });
    return m;
  }, [events]);
  const today = new Date().toDateString();
  const pickedEvents = picked ? byDay.get(picked) || [] : [];

  return (
    <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 overflow-hidden" style={{ animationDelay: '300ms' }}>
      <div className="flex items-center justify-between px-5 h-14 border-b border-slate-100">
        <div className="text-[15px] font-semibold text-slate-900">{cursor.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100" aria-label="Previous month"><ChevronLeft size={16} /></button>
          <button onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }} className="h-8 px-3 rounded-lg text-[12px] font-semibold text-slate-600 hover:bg-slate-100">Today</button>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100" aria-label="Next month"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-slate-100">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => (
          <div key={w} className={`py-2 text-center text-[10.5px] font-bold uppercase tracking-wider ${w === 'Fri' ? 'text-amber-500' : 'text-slate-400'}`}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const key = d.toDateString();
          const evs = byDay.get(key) || [];
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = key === today;
          const past = d < new Date(today);
          return (
            <button key={i} onClick={() => setPicked(evs.length ? key : null)} onDoubleClick={() => !past && onNew()}
              className={`relative min-h-[92px] p-1.5 text-left border-b border-r border-slate-100 transition-colors ${(i + 1) % 7 === 0 ? 'border-r-0' : ''} ${inMonth ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/60'} ${picked === key ? '!bg-sky-50' : ''}`}>
              <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-[12px] font-semibold ${isToday ? 'bg-slate-900 text-white' : inMonth ? 'text-slate-700' : 'text-slate-300'}`}>{d.getDate()}</span>
              <div className="mt-1 space-y-1">
                {evs.slice(0, 2).map((ev) => {
                  const c = tintOf(ev, catMap);
                  return (
                    <div key={ev._id} title={ev.title} className="truncate text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md"
                      style={{ background: `${c}18`, color: c, opacity: past ? 0.6 : 1 }}>
                      {ev.time ? `${ev.time} ` : ''}{ev.title}
                    </div>
                  );
                })}
                {evs.length > 2 && <div className="text-[10px] font-semibold text-slate-400 px-1.5">+{evs.length - 2} more</div>}
              </div>
            </button>
          );
        })}
      </div>
      {picked && pickedEvents.length > 0 && (
        <div className="border-t border-slate-100 p-4 bg-slate-50/50 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[12px] font-bold uppercase tracking-wider text-slate-400">{new Date(picked).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <button onClick={() => setPicked(null)} className="text-slate-400 hover:text-slate-700"><X size={14} /></button>
          </div>
          <div className="space-y-2">
            {pickedEvents.map((ev) => {
              const cat = catMap[ev.category] || catMap.general;
              const c = tintOf(ev, catMap);
              return (
                <div key={ev._id} className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 px-3 py-2">
                  <span className="w-1 self-stretch rounded-full" style={{ background: c }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-slate-900 truncate">{ev.title}</div>
                    <div className="text-[11.5px] text-slate-500 truncate">{cat.emoji} {cat.label}{ev.time ? ` · ${ev.time}` : ''} · {ev.location || 'Estate Grounds'}</div>
                  </div>
                  <span className="text-[11.5px] font-semibold text-emerald-600 flex items-center gap-1"><Users size={11} /> {ev.rsvps?.length || 0}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="px-5 py-2.5 text-[11px] text-slate-400 border-t border-slate-100">Click a day to see its events · double-click a future day to plan one.</div>
    </div>
  );
}

const VIEW_KEY = 'lounge:events:view';

export function EventsDesktop({ upcoming, past, catMap, onDelete, onNew }) {
  const [view, setView] = useState(() => { try { return localStorage.getItem(VIEW_KEY) || 'cards'; } catch { return 'cards'; } });
  const [cat, setCat] = useState('all');
  const changeView = (v) => { setView(v); try { localStorage.setItem(VIEW_KEY, v); } catch {} };

  const filt = (list) => list.filter((e) => cat === 'all' || (cat === 'fun' ? e.isFridayFunTimes : e.category === cat));
  const up = filt(upcoming);
  const [next, ...rest] = up;
  const now = new Date();
  const thisMonth = upcoming.filter((e) => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;
  const rsvps = upcoming.reduce((t, e) => t + (e.rsvps?.length || 0), 0);
  const fun = upcoming.filter((e) => e.isFridayFunTimes).length;
  const cats = [['all', 'All', '#0F172A'], ...Object.values(catMap).map((c) => [c.id, `${c.emoji} ${c.label}`, c.color]), ['fun', '🎉 FunTimes', FUN]];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <EStat i={0} label="Upcoming" hint="Events on the calendar" value={upcoming.length} Icon={CalendarDays} color="#0EA5E9" />
        <EStat i={1} label="This month" hint={now.toLocaleDateString('en', { month: 'long' })} value={thisMonth} Icon={Calendar} color="#8B5CF6" />
        <EStat i={2} label="RSVPs" hint="Residents going" value={rsvps} Icon={Users} color="#10B981" />
        <EStat i={3} label="FunTimes nights" hint="Friday socials planned" value={fun} Icon={PartyPopper} color={FUN} />
      </div>

      <div className="dash-rise flex items-center gap-2.5 flex-wrap" style={{ animationDelay: '220ms' }}>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200">
          {[['cards', LayoutGrid, 'Cards'], ['calendar', CalendarDays, 'Calendar']].map(([k, I, l]) => (
            <button key={k} onClick={() => changeView(k)}
              className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-lg transition-all ${view === k ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'}`}>
              <I size={13} /> {l}
            </button>
          ))}
        </div>
        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {cats.map(([k, label, color]) => {
            const on = cat === k;
            return (
              <button key={k} onClick={() => setCat(k)}
                className={`flex-shrink-0 text-[12px] font-semibold px-2.5 py-1.5 rounded-full border transition-all ${on ? 'text-white' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                style={on ? { background: color, borderColor: color } : undefined}>
                {label}
              </button>
            );
          })}
        </div>
        <button onClick={onNew} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[13px] font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-all flex-shrink-0">
          <Plus size={14} /> New event
        </button>
      </div>

      {view === 'calendar' ? (
        <MonthCalendar events={filt([...upcoming, ...past])} catMap={catMap} onNew={onNew} />
      ) : (
        <>
          {next ? <FeaturedEvent ev={next} catMap={catMap} onDelete={onDelete} /> : (
            <div className="dash-rise rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
              <div className="text-[32px]">📅</div>
              <div className="mt-2 text-[14px] font-semibold text-slate-900">{cat === 'all' ? 'Nothing on the calendar' : 'No upcoming events in this category'}</div>
              <p className="text-[12.5px] text-slate-500 mt-1">Plan something your neighbours will love — a Friday hangout, a fitness morning, a kids' day.</p>
              <button onClick={onNew} className="mt-4 btn-primary gap-2 !text-[13px] !px-4 !py-2"><Plus size={14} /> Plan an event</button>
            </div>
          )}

          {next && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-semibold text-slate-900">Coming up after</h3>
                <span className="text-[12px] text-slate-400">{rest.length} more</span>
              </div>
              <div className="grid grid-cols-2 2xl:grid-cols-3 gap-4">
                {rest.map((ev, i) => <EventCard key={ev._id} ev={ev} i={i} catMap={catMap} onDelete={onDelete} />)}
                <button onClick={onNew}
                  className="dash-rise group rounded-2xl border-2 border-dashed border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 min-h-[200px] flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-sky-600 transition-all"
                  style={{ animationDelay: `${320 + rest.length * 40}ms` }}>
                  <span className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-sky-100 flex items-center justify-center transition-all group-hover:rotate-90"><Plus size={18} /></span>
                  <span className="text-[13px] font-medium">Plan another event</span>
                </button>
              </div>
            </div>
          )}

          {filt(past).length > 0 && (
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900 mb-3">Past events</h3>
              <div className="rounded-2xl bg-white border border-slate-200/70 divide-y divide-slate-100">
                {filt(past).slice(0, 8).map((ev) => {
                  const c = tintOf(ev, catMap);
                  return (
                    <div key={ev._id} className="group flex items-center gap-3 px-4 py-2.5">
                      <div className="w-10 rounded-lg bg-slate-50 border border-slate-100 py-1 flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-[8.5px] font-bold uppercase leading-none text-slate-400">{new Date(ev.date).toLocaleDateString('en', { month: 'short' })}</span>
                        <span className="text-[14px] font-semibold leading-none mt-0.5 text-slate-600">{new Date(ev.date).getDate()}</span>
                      </div>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c }} />
                      <div className="flex-1 min-w-0 text-[13px] font-medium text-slate-600 truncate">{ev.title}</div>
                      <span className="text-[11.5px] text-slate-400">{ev.rsvps?.length || 0} attended</span>
                      <button onClick={() => onDelete(ev._id)} className="p-1 rounded-md text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all" title="Remove"><Trash2 size={13} /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Create event: side panel with a live preview ───────────────────── */
export function EventFormPanel({ open, onClose, form, setForm, categories, catMap, onSubmit, saving }) {
  const field = 'w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100';
  const preview = { ...form, date: form.date || new Date().toISOString().slice(0, 10), title: form.title || 'Your event title', rsvps: [] };
  const color = tintOf(preview, catMap);
  const cat = catMap[form.category] || catMap.general;
  const d = new Date(preview.date);

  return (
    <SidePanel open={open} onClose={onClose} title="Plan an event" subtitle="Residents see it in their Lounge and can RSVP"
      footer={
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button type="submit" form="event-form" disabled={saving} className="btn-primary flex-1 gap-2"><Calendar size={14} /> {saving ? 'Creating…' : 'Create event'}</button>
        </div>
      }>
      {/* Preview */}
      <div className="rounded-2xl border overflow-hidden mb-5 transition-colors" style={{ borderColor: `${color}40` }}>
        <div className="relative px-4 py-3.5 flex items-center gap-3" style={{ background: `linear-gradient(135deg, ${color}18, transparent 80%)` }}>
          <span className="absolute right-2 -top-2 text-[48px] opacity-20 select-none">{form.isFridayFunTimes ? '🎉' : cat.emoji}</span>
          <div className="w-12 rounded-xl overflow-hidden text-center bg-white border flex-shrink-0" style={{ borderColor: `${color}40` }}>
            <div className="text-[9px] font-bold uppercase text-white py-0.5" style={{ background: color }}>{d.toLocaleDateString('en', { month: 'short' })}</div>
            <div className="text-[18px] font-semibold text-slate-900 leading-none py-1">{d.getDate()}</div>
          </div>
          <div className="relative min-w-0">
            <div className="text-[11px] font-semibold" style={{ color }}>{cat.emoji} {cat.label}{form.isFridayFunTimes && ' · FunTimes'}</div>
            <div className={`text-[14px] font-semibold truncate ${form.title ? 'text-slate-900' : 'text-slate-400'}`}>{preview.title}</div>
            <div className="text-[11.5px] text-slate-500 truncate">{form.time ? `${form.time} · ` : ''}{form.location || 'Estate Grounds'}</div>
          </div>
        </div>
        <div className="px-4 py-2 text-[11px] text-slate-400 border-t border-slate-100">Preview — how residents will see it</div>
      </div>

      <form id="event-form" onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold mb-1.5 block text-slate-600">Category</label>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button key={c.id} type="button" onClick={() => setForm((p) => ({ ...p, category: c.id }))}
                className="px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all"
                style={form.category === c.id ? { background: c.color, color: '#fff', borderColor: c.color } : { color: '#64748B', borderColor: '#E2E8F0', background: '#fff' }}>
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold mb-1.5 block text-slate-600">Title *</label>
          <input required value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className={field} placeholder="e.g. Saturday morning jog" />
        </div>
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <div>
            <label className="text-xs font-semibold mb-1.5 block text-slate-600">Date *</label>
            <input required type="date" min={new Date().toISOString().split('T')[0]} value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className={field} />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block text-slate-600">Time</label>
            <input type="time" value={form.time} onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))} className={field} />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold mb-1.5 block text-slate-600">Location</label>
          <input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} className={field} placeholder="Estate Grounds" />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1.5 block text-slate-600">Organizer</label>
          <input value={form.organizer} onChange={(e) => setForm((p) => ({ ...p, organizer: e.target.value }))} className={field} placeholder="e.g. Residents' committee" />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1.5 block text-slate-600">Description</label>
          <textarea rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className={`${field} resize-none`} style={{ fontFamily: 'inherit' }} placeholder="What should residents know?" />
        </div>
        <button type="button" onClick={() => setForm((p) => ({ ...p, isFridayFunTimes: !p.isFridayFunTimes }))}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all"
          style={form.isFridayFunTimes ? { borderColor: '#FCD34D', background: 'linear-gradient(120deg, #FFFBEB, #FDF2F8)' } : { borderColor: '#E2E8F0', background: '#fff' }}>
          <span className="text-[22px]">🎉</span>
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-slate-900">Friday Night FunTimes</div>
            <div className="text-[11.5px] text-slate-500">Feature it as this week's Friday social.</div>
          </div>
          <span className="relative w-10 h-6 rounded-full transition-colors" style={{ background: form.isFridayFunTimes ? FUN : '#E2E8F0' }}>
            <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ transform: form.isFridayFunTimes ? 'translateX(1rem)' : 'none' }} />
          </span>
        </button>
      </form>
    </SidePanel>
  );
}
