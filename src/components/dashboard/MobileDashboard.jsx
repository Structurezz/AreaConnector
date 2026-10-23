import { Link } from 'react-router-dom';
import { format, formatDistanceToNowStrict } from 'date-fns';
import {
  UsersRound, UserCheck, Bell, ShieldCheck, ShieldAlert, ChevronRight, ArrowUpRight,
  UserPlus, Megaphone, Radio, CreditCard, Shield, Music, Users, LogIn, LogOut, CalendarClock, MapPin,
} from 'lucide-react';
import EstateMap from '../EstateMap';
import useCountUp from '../../hooks/useCountUp';
import { canOpen, hasArea } from '../../utils/teamAccess';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
const ago = (d) => {
  try { return formatDistanceToNowStrict(new Date(d), { addSuffix: true }).replace(' minutes', 'm').replace(' minute', 'm').replace(' hours', 'h').replace(' hour', 'h').replace(' seconds', 's'); }
  catch { return ''; }
};

/* Animated ring: share of today's visitors who are on site right now */
function OnSiteRing({ inside, today }) {
  const n = useCountUp(inside);
  const R = 34, C = 2 * Math.PI * R;
  const pct = today ? Math.min(1, inside / today) : 0;
  return (
    <div className="relative w-[92px] h-[92px] flex-shrink-0">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="7" />
        <circle cx="40" cy="40" r={R} fill="none" stroke="url(#onsite)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={C} className="dash-ring" style={{ '--len': C, '--to': C * (1 - Math.max(pct, 0.02)), strokeDashoffset: C * (1 - Math.max(pct, 0.02)) }} />
        <defs>
          <linearGradient id="onsite" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#A7F3D0" /><stop offset="100%" stopColor="#34D399" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[22px] font-semibold leading-none tabular-nums text-white">{n}</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-200/80 mt-1">on site</span>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = 'text-white', delay }) {
  const n = useCountUp(value || 0);
  return (
    <div className="dash-rise" style={{ animationDelay: `${delay}ms` }}>
      <div className={`text-[19px] font-semibold leading-none tabular-nums ${tone}`} style={{ letterSpacing: '-0.02em' }}>{n}</div>
      <div className="text-[11px] text-white/55 mt-1">{label}</div>
    </div>
  );
}

const ACTIONS = [
  { to: '/visitors/new',       label: 'Invite',    Icon: UserPlus,   color: '#10B981' },
  { to: '/residents',          label: 'Residents', Icon: Users,      color: '#6366F1' },
  { to: '/announcements',      label: 'Notice',    Icon: Megaphone,  color: '#F59E0B' },
  { to: '/announcements/live', label: 'Go live',   Icon: Radio,      color: '#EF4444' },
  { to: '/payments',           label: 'Payments',  Icon: CreditCard, color: '#0EA5E9' },
  { to: '/guards',             label: 'Guards',    Icon: Shield,     color: '#64748B' },
  { to: '/lounge',             label: 'Lounge',    Icon: Music,      color: '#EC4899' },
  { to: '/alerts',             label: 'Alerts',    Icon: Bell,       color: '#DC2626' },
];

const VISIT = {
  'checked-in':  { Icon: LogIn,         color: '#10B981', verb: 'arrived' },
  'checked-out': { Icon: LogOut,        color: '#94A3B8', verb: 'left' },
  active:        { Icon: CalendarClock, color: '#6366F1', verb: 'is expected' },
};

export default function MobileDashboard({ user, stats, recentVisitors, openAlerts, announcements, estate, estateName, firstName }) {
  const alertCount = stats?.openAlerts ?? openAlerts.length;
  const inside = stats?.activeVisitors || 0;
  const today = stats?.todaysVisitors || 0;
  const seeSecurity = hasArea(user, 'security');
  const seeNotices = hasArea(user, 'communications');
  const actions = ACTIONS.filter(a => canOpen(user, a.to)).slice(0, 8);

  // One stream of what's happening: alerts, visitors, notices — newest first
  const feed = [
    ...(seeSecurity ? openAlerts.map(a => ({
      id: `a${a._id}`, at: a.createdAt, to: '/alerts', Icon: ShieldAlert, color: '#EF4444', urgent: true,
      title: `${a.type ? a.type[0].toUpperCase() + a.type.slice(1) : 'Alert'} alert`, sub: a.residentId?.name || 'Resident',
    })) : []),
    ...(seeSecurity ? recentVisitors.map(v => {
      const m = VISIT[v.status] || VISIT.active;
      return {
        id: `v${v._id}`, at: v.checkedInAt || v.updatedAt || v.expectedDate, to: `/visitors/${v._id}`, Icon: m.Icon, color: m.color,
        title: `${v.visitorName || 'A visitor'} ${m.verb}`, sub: `${v.purpose || 'Visit'} · for ${v.hostResidentId?.name || 'Estate manager'}`,
      };
    }) : []),
    ...(seeNotices ? announcements.map(a => ({
      id: `n${a._id}`, at: a.createdAt, to: '/announcements', Icon: Megaphone, color: '#F59E0B',
      title: a.title, sub: a.isPinned ? 'Pinned notice' : 'Notice posted',
    })) : []),
  ].sort((a, b) => (!!b.urgent - !!a.urgent) || (new Date(b.at) - new Date(a.at))).slice(0, 7);

  return (
    <div className="space-y-6 pb-2">
      {/* Greeting */}
      <header className="dash-rise flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-medium text-slate-400">{format(new Date(), 'EEEE, d MMMM')}</div>
          <h1 className="text-[22px] font-semibold text-slate-900 leading-tight truncate" style={{ letterSpacing: '-0.03em' }}>
            {greeting()}, {firstName}
          </h1>
        </div>
        <Link to="/settings" className="relative flex-shrink-0">
          <span className="absolute -inset-[3px] rounded-full" style={{ background: 'conic-gradient(from 180deg, #34D399, #10B981, #0EA5E9, #34D399)' }} />
          {user?.profilePhoto
            ? <img src={user.profilePhoto} alt="" className="relative w-11 h-11 rounded-full object-cover border-2 border-white" />
            : <span className="relative w-11 h-11 rounded-full flex items-center justify-center font-semibold text-[15px] text-emerald-700 bg-emerald-50 border-2 border-white">{firstName[0]?.toUpperCase()}</span>}
        </Link>
      </header>

      {/* Estate status */}
      <section className="dash-rise relative overflow-hidden rounded-[26px] p-5 text-white"
        style={{ animationDelay: '60ms', background: 'linear-gradient(150deg, #022C22 0%, #064E3B 45%, #047857 100%)', boxShadow: '0 24px 44px -24px rgba(2,44,34,0.95)' }}>
        <div className="dash-blob absolute -top-20 -right-16 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(52,211,153,0.38)' }} />
        <div className="dash-blob absolute -bottom-24 -left-12 w-52 h-52 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(14,165,233,0.28)', animationDelay: '-7s' }} />
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '22px 22px', maskImage: 'radial-gradient(circle at 80% 20%, #000, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle at 80% 20%, #000, transparent 70%)' }} />

        <div className="relative flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur">
            <span className="relative flex w-1.5 h-1.5"><span className="absolute inset-0 rounded-full bg-emerald-300 animate-ping" /><span className="relative w-1.5 h-1.5 rounded-full bg-emerald-300" /></span>
            Live · {estateName}
          </span>
          <MapPin size={14} className="text-white/40" />
        </div>

        <div className="relative mt-4 flex items-center gap-4">
          <OnSiteRing inside={inside} today={today} />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold leading-snug dash-grad-text">
              {inside ? `${inside} visitor${inside !== 1 ? 's' : ''} inside the estate` : 'No visitors inside right now'}
            </div>
            <div className="text-[12px] text-white/60 mt-1">{today} expected or arrived today</div>
          </div>
        </div>

        <div className="relative mt-5 pt-4 border-t border-white/10 grid grid-cols-3 gap-3">
          <Metric label="Residents" value={stats?.totalResidents} delay={160} />
          <Metric label="Visitors today" value={today} delay={210} />
          <Metric label="Open alerts" value={alertCount} tone={alertCount ? 'text-red-300' : 'text-white'} delay={260} />
        </div>

        {seeSecurity && (
          alertCount > 0 ? (
            <Link to="/alerts" className="relative mt-4 flex items-center gap-3 rounded-2xl px-3.5 py-3 bg-red-500/15 border border-red-400/30 active:scale-[0.99] transition-transform" style={{ textDecoration: 'none' }}>
              <span className="relative w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0">
                <span className="dash-ripple absolute inset-0 rounded-xl bg-red-500" />
                <ShieldAlert size={15} className="relative text-white" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-semibold text-white">{alertCount} alert{alertCount !== 1 ? 's' : ''} need{alertCount === 1 ? 's' : ''} attention</span>
                <span className="block text-[11px] text-red-100/70 truncate">{openAlerts[0] ? `${openAlerts[0].residentId?.name || 'Resident'} · ${ago(openAlerts[0].createdAt)}` : 'Tap to respond'}</span>
              </span>
              <ChevronRight size={16} className="text-red-200/70" />
            </Link>
          ) : (
            <div className="relative mt-4 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 bg-white/[0.06] border border-white/10">
              <ShieldCheck size={16} className="text-emerald-300 flex-shrink-0" />
              <span className="text-[12px] text-white/75"><span className="font-semibold text-white">All secure.</span> No open alerts.</span>
            </div>
          )
        )}
      </section>

      {/* Quick actions */}
      {actions.length > 0 && (
        <section>
          <div className="grid grid-cols-4 gap-x-2 gap-y-4">
            {actions.map(({ to, label, Icon, color }, i) => (
              <Link key={to} to={to} className="dash-rise group flex flex-col items-center gap-1.5" style={{ animationDelay: `${300 + i * 45}ms`, textDecoration: 'none' }}>
                <span className="dash-tile w-[58px] h-[58px] rounded-[20px] flex items-center justify-center border transition-transform active:scale-90"
                  style={{ background: `linear-gradient(145deg, ${color}1A, ${color}08)`, borderColor: `${color}2E` }}>
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}D9)`, boxShadow: `0 8px 16px -8px ${color}` }}>
                    <Icon size={17} className="text-white" />
                  </span>
                </span>
                <span className="text-[11px] font-medium text-slate-600">{label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Live activity */}
      {(seeSecurity || seeNotices) && (
        <section className="dash-rise" style={{ animationDelay: '420ms' }}>
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="text-[16px] font-semibold text-slate-900" style={{ letterSpacing: '-0.02em' }}>Live activity</h2>
              <p className="text-[12px] text-slate-400">Gate, alerts and notices as they happen</p>
            </div>
            {seeSecurity && <Link to="/visitors" className="text-[12px] font-semibold text-emerald-600 flex items-center gap-0.5">Visitors <ArrowUpRight size={13} /></Link>}
          </div>

          {feed.length === 0 ? (
            <Link to="/visitors/new" className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white p-4" style={{ textDecoration: 'none' }}>
              <span className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center"><UserCheck size={16} className="text-emerald-600" /></span>
              <span className="text-[13px] text-slate-500">Quiet so far. <span className="font-semibold text-emerald-600">Invite a visitor</span></span>
            </Link>
          ) : (
            <div className="relative rounded-[22px] bg-white border border-slate-200/70 p-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <span className="absolute left-[29px] top-6 bottom-6 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />
              {feed.map((f, i) => (
                <Link key={f.id} to={f.to} className="dash-rise dash-row relative flex items-center gap-3 px-2.5 py-2.5 rounded-2xl"
                  style={{ animationDelay: `${460 + i * 55}ms`, textDecoration: 'none', background: f.urgent ? 'rgba(239,68,68,0.06)' : undefined }}>
                  <span className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ring-4 ring-white"
                    style={{ background: `${f.color}18` }}>
                    {f.urgent && <span className="dash-ripple absolute inset-0 rounded-full" style={{ background: `${f.color}40` }} />}
                    <f.Icon size={15} style={{ color: f.color }} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-[13px] font-semibold truncate ${f.urgent ? 'text-red-700' : 'text-slate-900'}`}>{f.title}</span>
                    <span className="block text-[12px] text-slate-500 truncate">{f.sub}</span>
                  </span>
                  <span className="text-[11px] text-slate-400 flex-shrink-0 tabular-nums">{ago(f.at)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Map */}
      <section className="dash-rise" style={{ animationDelay: '520ms' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-semibold text-slate-900" style={{ letterSpacing: '-0.02em' }}>Your estate</h2>
          {estate?.address && <span className="text-[12px] text-slate-400 truncate max-w-[60%]">{estate.address}</span>}
        </div>
        <div className="rounded-[22px] overflow-hidden">
          <EstateMap name={estate?.name || estateName} address={estate?.address} location={estate?.location} height={200} variant="card" />
        </div>
      </section>
    </div>
  );
}
