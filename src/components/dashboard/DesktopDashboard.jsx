import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UserCheck, Bell, Home, Megaphone, ArrowRight, ArrowUpRight, ShieldCheck, ShieldAlert,
  Plus, UsersRound, LogIn, UserPlus, Users, MapPin, Activity, Zap,
} from 'lucide-react';
import { format, subDays, formatDistanceToNow } from 'date-fns';
import { visitorAPI } from '../../api';
import { VISITOR_STATUS } from '../visitors/MobileVisitors';
import EstateMap from '../EstateMap';
import useCountUp from '../../hooks/useCountUp';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// Visitor totals per day for the past 7 days (uses the list endpoint's pagination total)
function useWeeklyTraffic() {
  const [days, setDays] = useState(null);
  useEffect(() => {
    const dates = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
    Promise.all(dates.map((d) =>
      visitorAPI.getAll({ date: format(d, 'yyyy-MM-dd'), limit: 1 })
        .then((r) => r.data.pagination?.total ?? 0)
        .catch(() => 0),
    )).then((totals) => setDays(dates.map((d, i) => ({ date: d, count: totals[i] }))));
  }, []);
  return days;
}

const delay = (i) => ({ animationDelay: `${i * 50}ms` });
const CARD = 'dash-rise rounded-2xl bg-white border border-slate-200/70';

/* ── Pieces ─────────────────────────────────────────────────────────── */

function CardHead({ title, Icon, color = '#10B981', right }) {
  return (
    <div className="flex items-center justify-between px-5 h-12 border-b border-slate-100">
      <h2 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2" style={{ letterSpacing: '-0.01em' }}>
        {Icon && (
          <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 4px 10px -4px ${color}` }}>
            <Icon size={13} className="text-white" />
          </span>
        )}
        {title}
      </h2>
      {right}
    </div>
  );
}

function HeadLink({ to, children }) {
  return (
    <Link to={to} className="group text-[12px] font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors">
      {children} <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function Sparkline({ data, color }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 64, h = 22;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 2 - (v / max) * (h - 4)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        className="dash-ring" style={{ strokeDasharray: 200, '--len': 200 }} />
      <circle cx={pts.at(-1)[0]} cy={pts.at(-1)[1]} r="2.5" fill={color} />
    </svg>
  );
}

function Stat({ i, label, value, Icon, color, to, sub, spark, live }) {
  const n = useCountUp(value);
  return (
    <Link to={to} className="dash-tile dash-rise group rounded-2xl p-4 border min-w-0"
      style={{ animationDelay: `${60 + i * 60}ms`, textDecoration: 'none', background: `linear-gradient(140deg, ${color}17 0%, #FFFFFF 55%)`, borderColor: `${color}2E` }}>
      <span className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full pointer-events-none transition-transform duration-500 group-hover:scale-125" style={{ background: `${color}12` }} />
      <div className="relative flex items-center justify-between">
        <span className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 14px -6px ${color}` }}>
          <Icon size={15} className="text-white" />
        </span>
        {live ? (
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full animate-ping opacity-70" style={{ background: color }} />
            <span className="relative w-2 h-2 rounded-full" style={{ background: color }} />
          </span>
        ) : (
          <ArrowUpRight size={14} className="text-slate-300 transition-all group-hover:text-slate-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        )}
      </div>
      <div className="relative mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[24px] font-semibold leading-none text-slate-900 tabular-nums" style={{ letterSpacing: '-0.03em' }}>{n}</div>
          <div className="mt-1 text-[12px] font-medium text-slate-500 truncate">{label}</div>
        </div>
        {spark && <Sparkline data={spark} color={color} />}
      </div>
      {sub && <div className="relative mt-1 text-[11px] text-slate-400 truncate">{sub}</div>}
    </Link>
  );
}

function TrafficChart({ days }) {
  const [hover, setHover] = useState(null);
  const list = days || Array.from({ length: 7 }, (_, i) => ({ date: subDays(new Date(), 6 - i), count: 0, loading: true }));
  const max = Math.max(1, ...list.map((d) => d.count));
  const total = days ? days.reduce((t, d) => t + d.count, 0) : null;
  const avg = days ? (total / 7).toFixed(1) : null;

  return (
    <div className={`${CARD} h-full flex flex-col`} style={delay(6)}>
      <CardHead title="Visitor traffic" Icon={Activity} color="#10B981" right={<span className="text-[12px] text-slate-400">Last 7 days</span>} />
      <div className="px-5 pt-4 flex items-baseline gap-3">
        <div>
          <span className="text-[22px] font-semibold text-slate-900 tabular-nums" style={{ letterSpacing: '-0.03em' }}>{total ?? '—'}</span>
          <span className="ml-1.5 text-[12px] text-slate-400">visitors</span>
        </div>
        {avg && <span className="text-[12px] text-slate-400">· {avg} a day on average</span>}
      </div>
      <div className="flex-1 min-h-[150px] flex items-end gap-2.5 px-5 pb-4 pt-5">
        {list.map((d, i) => {
          const h = d.loading ? 10 : Math.max(3, (d.count / max) * 100);
          const isToday = i === 6;
          const on = hover === i;
          return (
            <div key={i} className="relative flex-1 h-full flex flex-col items-center justify-end gap-2"
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {on && !d.loading && (
                <div className="absolute z-10 px-2 py-1 rounded-md bg-slate-900 text-white text-[11px] font-medium whitespace-nowrap animate-scale-in"
                  style={{ bottom: `calc(${h}% + 26px)` }}>
                  {d.count} · {format(d.date, 'EEE d MMM')}
                </div>
              )}
              <div className="w-full flex-1 flex items-end">
                <div className={`dash-bar w-full rounded-lg transition-colors duration-200 ${d.loading ? 'skeleton' : ''}`}
                  style={{
                    height: `${h}%`,
                    animationDelay: `${200 + i * 50}ms`,
                    background: d.loading ? undefined : isToday ? 'linear-gradient(180deg, #34D399, #059669)' : on ? 'linear-gradient(180deg, #6EE7B7, #34D399)' : 'linear-gradient(180deg, #A7F3D0, #ECFDF5)',
                    boxShadow: isToday && !d.loading ? '0 8px 18px -8px rgba(5,150,105,0.7)' : 'none',
                  }} />
              </div>
              <span className={`text-[11px] ${isToday ? 'font-semibold text-emerald-600' : 'text-slate-400'}`}>
                {isToday ? 'Today' : format(d.date, 'EEE')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SecurityCard({ alerts }) {
  const hot = alerts.length > 0;
  return (
    <div className={`${CARD} h-full flex flex-col overflow-hidden ${hot ? '!border-red-200' : '!border-emerald-200/70'}`}
      style={{ ...delay(7), background: hot ? 'linear-gradient(160deg, #FEF2F2 0%, #FFFFFF 60%)' : 'linear-gradient(160deg, #ECFDF5 0%, #FFFFFF 60%)' }}>
      <CardHead title="Security" Icon={hot ? ShieldAlert : ShieldCheck} color={hot ? '#EF4444' : '#10B981'} right={<HeadLink to="/alerts">Alerts</HeadLink>} />
      {!hot ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-5 py-6">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <span className="dash-ripple absolute inset-0 rounded-full border border-emerald-300" />
            <span className="dash-ripple absolute inset-0 rounded-full border border-emerald-300" style={{ animationDelay: '1s' }} />
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #34D399, #059669)', boxShadow: '0 8px 18px -8px rgba(5,150,105,0.8)' }}>
              <ShieldCheck size={18} className="text-white" />
            </div>
          </div>
          <div className="text-[14px] font-semibold text-slate-900 mt-3">All quiet</div>
          <div className="text-[12px] text-slate-400 mt-0.5">No open alerts right now</div>
        </div>
      ) : (
        <div className="flex-1 p-3 space-y-1">
          <div className="flex items-center gap-2 px-2 pb-2">
            <ShieldAlert size={15} className="text-red-500" />
            <span className="text-[13px] font-semibold text-red-600">{alerts.length} open alert{alerts.length === 1 ? '' : 's'}</span>
          </div>
          {alerts.slice(0, 4).map((a) => (
            <Link key={a._id} to="/alerts" className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-red-50/60 transition-colors" style={{ textDecoration: 'none' }}>
              <span className="relative flex w-1.5 h-1.5 flex-shrink-0">
                <span className="absolute inset-0 rounded-full bg-red-400 animate-ping" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-red-500" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium capitalize text-slate-900 truncate">{a.type}</div>
                <div className="text-[11px] text-slate-400 truncate">{a.residentId?.name || 'Unknown'}</div>
              </div>
              <span className="text-[11px] text-slate-400 flex-shrink-0">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentVisitors({ visitors }) {
  return (
    <div className={`${CARD} overflow-hidden`} style={delay(8)}>
      <CardHead title="Recent visitors" Icon={UserCheck} color="#0EA5E9" right={<HeadLink to="/visitors">View all</HeadLink>} />
      {visitors.length === 0 ? (
        <div className="py-10 text-center">
          <UserCheck size={20} className="mx-auto text-slate-300" />
          <p className="text-[13px] text-slate-500 mt-2">No visitors yet</p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="text-[11px] text-slate-400 text-left">
              <th className="px-5 py-2 font-medium">Visitor</th>
              <th className="px-3 py-2 font-medium">Host</th>
              <th className="px-3 py-2 font-medium">Expected</th>
              <th className="px-5 py-2 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {visitors.slice(0, 6).map((v, i) => {
              const st = VISITOR_STATUS[v.status] || VISITOR_STATUS['checked-out'];
              const initials = (v.visitorName || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
              return (
                <tr key={v._id} className="dash-rise border-t border-slate-100 hover:bg-slate-50/80 transition-colors" style={{ animationDelay: `${450 + i * 40}ms` }}>
                  <td className="px-5 py-2.5">
                    <Link to={`/visitors/${v._id}`} className="flex items-center gap-2.5 min-w-0" style={{ textDecoration: 'none' }}>
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0" style={{ background: st.bg, color: st.text }}>{initials}</span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-slate-900 truncate">{v.visitorName}</span>
                        <span className="block text-[11px] text-slate-400 capitalize truncate">{v.purpose}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-600 truncate max-w-[140px]">{v.hostResidentId?.name || 'Estate manager'}</td>
                  <td className="px-3 py-2.5 text-[12px] text-slate-500 whitespace-nowrap">{v.expectedDate ? format(new Date(v.expectedDate), 'MMM d, h:mm a') : '—'}</td>
                  <td className="px-5 py-2.5 text-right">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.text }}>
                      <span className={`w-1.5 h-1.5 rounded-full ${v.status === 'checked-in' ? 'animate-pulse' : ''}`} style={{ background: st.dot }} />
                      {st.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Notices({ items }) {
  return (
    <div className={CARD} style={delay(9)}>
      <CardHead title="Notices" Icon={Megaphone} color="#F59E0B" right={
        <Link to="/announcements" aria-label="Post notice"
          className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all hover:rotate-90">
          <Plus size={14} />
        </Link>
      } />
      {items.length === 0 ? (
        <p className="px-5 py-4 text-[12px] text-slate-400">Nothing posted yet.</p>
      ) : (
        <div className="py-1.5">
          {items.slice(0, 3).map((a) => (
            <Link key={a._id} to="/announcements" className="flex items-start gap-2.5 px-5 py-2 hover:bg-slate-50/80 transition-colors" style={{ textDecoration: 'none' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-[7px] flex-shrink-0 ring-4 ring-amber-100" />
              <span className="min-w-0">
                <span className="block text-[13px] text-slate-800 truncate">{a.title}</span>
                <span className="block text-[11px] text-slate-400">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const ACTIONS = [
  { to: '/visitors/new',  icon: UserPlus,  label: 'New visitor', color: '#10B981' },
  { to: '/residents',     icon: Users,     label: 'Residents',   color: '#6366F1' },
  { to: '/units',         icon: Home,      label: 'Units',       color: '#8B5CF6' },
  { to: '/announcements', icon: Megaphone, label: 'Post notice', color: '#F59E0B' },
];

function QuickActions() {
  return (
    <div className={CARD} style={delay(10)}>
      <CardHead title="Shortcuts" Icon={Zap} color="#8B5CF6" />
      <div className="grid grid-cols-2 gap-2 p-3">
        {ACTIONS.map(({ to, icon: Icon, label, color }) => (
          <Link key={to} to={to}
            className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{ textDecoration: 'none', background: `linear-gradient(135deg, ${color}12, #fff 70%)`, borderColor: `${color}26` }}>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 group-hover:-rotate-6"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 12px -6px ${color}` }}>
              <Icon size={14} className="text-white" />
            </span>
            <span className="text-[12px] font-medium text-slate-700">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────── */

export default function DesktopDashboard({ stats, recentVisitors, openAlerts, announcements, estate, estateName, firstName }) {
  const now = useClock();
  const week = useWeeklyTraffic();
  const spark = useMemo(() => week?.map((d) => d.count), [week]);
  const s = stats || {};
  const alertsOpen = s.openAlerts || 0;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">

      {/* ── Welcome banner ── */}
      <div className="dash-rise relative overflow-hidden rounded-2xl px-6 py-5"
        style={{
          background: 'linear-gradient(120deg, #022C22 0%, #064E3B 50%, #047857 100%)',
          boxShadow: '0 16px 32px -18px rgba(4,120,87,0.7)',
        }}>
        <div className="dash-blob absolute -top-20 right-40 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(52,211,153,0.22)' }} />
        <div className="dash-blob absolute -bottom-24 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(6,78,59,0.5)', animationDelay: '-6s' }} />
        <div className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '16px 16px',
            maskImage: 'linear-gradient(90deg, transparent 30%, black 100%)', WebkitMaskImage: 'linear-gradient(90deg, transparent 30%, black 100%)',
          }} />
        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[12px] text-white/75">
              <span className="inline-flex items-center gap-1.5 font-semibold text-white px-2 py-0.5 rounded-full bg-white/15 border border-white/20">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inset-0 rounded-full bg-white animate-ping" />
                  <span className="relative w-1.5 h-1.5 rounded-full bg-white" />
                </span>
                Live
              </span>
              {format(now, 'EEEE, d MMMM · HH:mm')}
            </div>
            <h1 className="mt-2 text-[22px] font-semibold text-white" style={{ letterSpacing: '-0.025em' }}>
              {greeting()}, {firstName} 👋
            </h1>
            <p className="mt-0.5 text-[13px] text-white/75 flex items-center gap-1.5 truncate">
              <MapPin size={13} className="flex-shrink-0" />
              <span className="font-medium text-white">{estate?.name || estateName}</span>
              {estate?.address && <span className="truncate">· {estate.address}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link to="/alerts" className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 rounded-xl text-white bg-white/10 border border-white/25 hover:bg-white/20 transition-all hover:-translate-y-0.5 backdrop-blur">
              <Bell size={14} /> Alerts
              {alertsOpen > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center animate-pulse">{alertsOpen}</span>
              )}
            </Link>
            <Link to="/announcements" className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 rounded-xl text-white bg-white/10 border border-white/25 hover:bg-white/20 transition-all hover:-translate-y-0.5 backdrop-blur">
              <Megaphone size={14} /> Post notice
            </Link>
            <Link to="/visitors/new" className="group inline-flex items-center gap-1.5 text-[13px] font-semibold px-3.5 py-2 rounded-xl bg-white text-emerald-700 hover:-translate-y-0.5 transition-all"
              style={{ boxShadow: '0 8px 18px -8px rgba(0,0,0,0.35)' }}>
              <UserPlus size={14} /> Register visitor
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-5 gap-4">
        <Stat i={0} label="Residents"      value={s.totalResidents || 0} Icon={UsersRound} color="#6366F1" to="/residents" sub="Active members" />
        <Stat i={1} label="Units"          value={s.totalUnits || 0}     Icon={Home}       color="#8B5CF6" to="/units"     sub="Homes in the estate" />
        <Stat i={2} label="Visitors today" value={s.todaysVisitors || 0} Icon={UserCheck}  color="#10B981" to="/visitors"  spark={spark} />
        <Stat i={3} label="Inside now"     value={s.activeVisitors || 0} Icon={LogIn}      color="#0EA5E9" to="/visitors"  sub="Checked in at the gate" live={(s.activeVisitors || 0) > 0} />
        <Stat i={4} label="Open alerts"    value={alertsOpen}            Icon={Bell}       color={alertsOpen > 0 ? '#EF4444' : '#F59E0B'} to="/alerts"
          sub={alertsOpen > 0 ? 'Needs attention' : 'Nothing pending'} live={alertsOpen > 0} />
      </div>

      {/* ── Traffic + Security ── */}
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-8"><TrafficChart days={week} /></div>
        <div className="col-span-4"><SecurityCard alerts={openAlerts} /></div>
      </div>

      {/* ── Visitors + side rail ── */}
      <div className="grid grid-cols-12 gap-5 items-start">
        <div className="col-span-8"><RecentVisitors visitors={recentVisitors} /></div>
        <div className="col-span-4 space-y-5">
          <Notices items={announcements} />
          <QuickActions />
        </div>
      </div>

      {/* ── Map ── */}
      <div className="dash-rise" style={delay(11)}>
        <EstateMap name={estate?.name || estateName} address={estate?.address} location={estate?.location} height={260} variant="card" />
      </div>
    </div>
  );
}
