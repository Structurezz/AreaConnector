import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, UserCheck, Bell, Home, Megaphone,
  ArrowRight, Activity, Shield, Plus, Zap,
  UsersRound, LogIn, Sparkles, ChevronRight,
} from 'lucide-react';
import { estateAPI, visitorAPI, alertAPI, announcementAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { visitorStatusBadge } from '../components/ui/Badge';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EstateMap from '../components/EstateMap';
import { format } from 'date-fns';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [stats, setStats]             = useState(null);
  const [recentVisitors, setRecentVisitors] = useState([]);
  const [openAlerts, setOpenAlerts]   = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [estate, setEstate]           = useState(null);
  const [loading, setLoading]         = useState(true);

  const estateId = user?.estateId?._id || user?.estateId;

  useEffect(() => {
    const calls = [
      estateAPI.getStats(),
      visitorAPI.getAll({ limit: 6 }),
      alertAPI.getAll({ status: 'open', limit: 4 }),
      announcementAPI.getAll({ limit: 3 }),
    ];
    if (estateId) calls.push(estateAPI.getOne(estateId));

    Promise.all(calls).then((results) => {
      const [s, v, a, n, e] = results;
      setStats(s.data.data);
      setRecentVisitors(v.data.data);
      setOpenAlerts(a.data.data);
      setAnnouncements(n.data.data);
      if (e) setEstate(e.data.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [estateId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>
  );

  const estateName = user?.estateId && typeof user.estateId === 'object'
    ? user.estateId.name
    : 'Your Estate';
  const firstName = user?.name?.split(' ')[0] || 'Manager';

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden rounded-3xl p-4 pt-5 sm:p-8"
        style={{
          background:
            'radial-gradient(120% 90% at 100% 0%, #34D399 0%, transparent 55%),' +
            'radial-gradient(90% 80% at 0% 100%, #047857 0%, transparent 60%),' +
            'linear-gradient(135deg, #059669 0%, #047857 100%)',
          boxShadow:
            '0 24px 48px -20px rgba(4,120,87,0.55), 0 12px 24px -12px rgba(16,185,129,0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
        }}
      >
        {/* Mesh dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.18] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
            maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, transparent 75%)',
            WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, transparent 75%)',
          }}
        />
        {/* Glow blobs */}
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full pointer-events-none blur-2xl"
          style={{ background: 'rgba(167,243,208,0.35)' }} />
        <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full pointer-events-none blur-2xl"
          style={{ background: 'rgba(4,120,87,0.55)' }} />

        <div className="relative">
          {/* Top row: greeting + avatar (mobile-first compact) */}
          <div className="flex items-start justify-between gap-3 mb-3 sm:mb-5">
            <div className="min-w-0 flex-1">
              {/* Pills — inline, wrap on desktop */}
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[9px] sm:text-xs font-bold uppercase tracking-wider px-2 py-0.5 sm:py-1 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(6px)' }}>
                  <span className="relative flex w-1.5 h-1.5">
                    <span className="absolute inset-0 rounded-full bg-emerald-200 animate-ping opacity-75" />
                    <span className="relative w-1.5 h-1.5 rounded-full bg-white" />
                  </span>
                  Live
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:py-1 rounded-full truncate"
                  style={{ background: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.92)', border: '1px solid rgba(255,255,255,0.20)' }}>
                  {format(new Date(), 'EEE, MMM d')}
                </span>
              </div>
              {/* Merged greeting + name — one line on mobile, layered on desktop */}
              <h1 className="text-white font-black" style={{ letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                <span className="hidden sm:block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.72)', letterSpacing: '0.12em' }}>
                  {greeting()}
                </span>
                <span className="block text-xl sm:text-5xl" style={{ letterSpacing: '-0.03em' }}>
                  <span className="sm:hidden">{greeting()}, </span>{firstName}{' '}
                  <span className="inline-block">👋</span>
                </span>
              </h1>
              <p className="text-[11px] sm:text-base mt-1 sm:mt-2 flex items-center gap-1.5 truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
                <Sparkles size={11} className="flex-shrink-0" style={{ color: '#A7F3D0' }} />
                <span className="truncate"><span className="font-semibold text-white">{estateName}</span></span>
              </p>
            </div>

            <Link to="/settings" className="flex-shrink-0 relative group">
              {user?.profilePhoto ? (
                <img
                  src={user.profilePhoto}
                  alt=""
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                  style={{
                    border: '1.5px solid rgba(255,255,255,0.55)',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
                  }}
                />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg text-white"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.10) 100%)',
                    border: '1.5px solid rgba(255,255,255,0.55)',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.35)',
                  }}>
                  {firstName[0]?.toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-emerald-300 border-2"
                style={{ borderColor: '#047857' }} />
            </Link>
          </div>

          {/* Stat tiles — compact on mobile (no icon, tighter padding) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-3 sm:mt-4">
            {[
              { label: 'Residents',      value: stats?.totalResidents || 0, Icon: UsersRound },
              { label: 'Visitors Today', value: stats?.todaysVisitors  || 0, Icon: UserCheck  },
              { label: 'Inside Now',     value: stats?.activeVisitors  || 0, Icon: LogIn, dot: (stats?.activeVisitors || 0) > 0 },
              { label: 'Open Alerts',    value: stats?.openAlerts      || 0, Icon: Bell,  alert: true },
            ].map(({ label, value, Icon, alert, dot }) => {
              const isDanger = alert && value > 0;
              return (
                <div key={label}
                  className="relative rounded-xl sm:rounded-2xl px-3 py-2.5 sm:p-4 overflow-hidden"
                  style={{
                    background: isDanger
                      ? 'linear-gradient(135deg, rgba(239,68,68,0.32) 0%, rgba(220,38,38,0.20) 100%)'
                      : 'rgba(255,255,255,0.14)',
                    border: `1px solid ${isDanger ? 'rgba(254,202,202,0.45)' : 'rgba(255,255,255,0.22)'}`,
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
                  }}>
                  {/* Icon row — desktop only */}
                  <div className="hidden sm:flex items-center justify-between mb-1.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.20)' }}>
                      <Icon size={14} style={{ color: '#fff' }} />
                    </div>
                    {dot && <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />}
                    {isDanger && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(255,255,255,0.22)', color: '#fff' }}>New</span>
                    )}
                  </div>

                  {/* Mobile: inline mini row — number + label side by side */}
                  <div className="sm:hidden flex items-center gap-2">
                    <Icon size={14} style={{ color: 'rgba(255,255,255,0.85)' }} className="flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-black text-white leading-none flex items-center gap-1.5">
                        {value}
                        {dot && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />}
                      </div>
                      <div className="text-[10px] font-medium truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.78)' }}>
                        {label}
                      </div>
                    </div>
                  </div>

                  {/* Desktop: stacked number + label (unchanged) */}
                  <div className="hidden sm:block">
                    <div className="text-3xl font-black text-white leading-none mb-1" style={{ letterSpacing: '-0.03em' }}>{value}</div>
                    <div className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.78)' }}>{label}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action row — single button on mobile (Visitors is already in bottom nav) */}
          <div className="flex items-stretch gap-2 mt-3 sm:mt-5">
            <Link to="/alerts"
              className="flex-1 inline-flex items-center justify-center gap-2 text-sm font-bold px-4 py-2.5 sm:py-3 rounded-xl transition-all relative group"
              style={{
                background: '#fff',
                color: '#047857',
                boxShadow: '0 8px 20px -8px rgba(0,0,0,0.35), inset 0 -2px 0 rgba(4,120,87,0.10)',
              }}>
              <Bell size={15} />
              <span>Alerts</span>
              {openAlerts.length > 0 && (
                <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-black flex items-center justify-center"
                  style={{ background: '#EF4444', boxShadow: '0 2px 6px rgba(239,68,68,0.5)' }}>
                  {openAlerts.length}
                </span>
              )}
              <ChevronRight size={14} className="ml-0.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link to="/visitors"
              className="hidden sm:inline-flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-3 rounded-xl transition-all"
              style={{
                background: 'rgba(255,255,255,0.16)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.28)',
                backdropFilter: 'blur(6px)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.24)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}>
              <UserCheck size={15} />
              <span>Visitors</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Row 1: Map (2fr) + Alerts/Notices stack (1fr) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Estate Map — hero of the body */}
        <div className="lg:col-span-2">
          <EstateMap
            name={estate?.name || estateName}
            address={estate?.address}
            location={estate?.location}
            height={320}
            variant="card"
          />
        </div>

        {/* Right rail: Alerts + Notices */}
        <div className="space-y-4">

          {/* Open Alerts — mood shifts based on state */}
          <div className="relative overflow-hidden rounded-2xl p-4"
            style={{
              background: openAlerts.length > 0
                ? 'linear-gradient(135deg, #FEE2E2 0%, #FEF2F2 100%)'
                : 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 100%)',
              border: openAlerts.length > 0 ? '1px solid #FECACA' : '1px solid rgba(16,185,129,0.18)',
            }}>
            {openAlerts.length > 0 && (
              <span className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
                style={{ background: 'rgba(239,68,68,0.12)' }} />
            )}
            <div className="relative flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm flex items-center gap-2" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: openAlerts.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.12)' }}>
                  <Shield size={12} style={{ color: openAlerts.length > 0 ? '#DC2626' : '#059669' }} />
                </div>
                Live Alerts
                {openAlerts.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-black text-white"
                    style={{ background: '#DC2626' }}>
                    {openAlerts.length}
                  </span>
                )}
              </h2>
              <Link to="/alerts" className="text-[11px] font-semibold transition-colors flex items-center gap-0.5"
                style={{ color: openAlerts.length > 0 ? '#DC2626' : '#059669' }}>
                Open <ArrowRight size={10} />
              </Link>
            </div>

            {openAlerts.length === 0 ? (
              <div className="relative text-xs" style={{ color: '#059669' }}>
                <span className="font-semibold">All quiet.</span> <span style={{ color: '#94A3B8' }}>No open alerts right now.</span>
              </div>
            ) : (
              <div className="relative space-y-1.5">
                {openAlerts.slice(0, 3).map((a) => (
                  <Link key={a._id} to="/alerts"
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl transition-all"
                    style={{ background: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold capitalize truncate" style={{ color: '#0F172A' }}>{a.type}</div>
                      <div className="text-[11px] truncate" style={{ color: '#94A3B8' }}>{a.residentId?.name || 'Unknown'}</div>
                    </div>
                    <div className="text-[10px] font-medium flex-shrink-0" style={{ color: '#94A3B8' }}>
                      {format(new Date(a.createdAt), 'HH:mm')}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Notices — clean list, sharp typography */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm flex items-center gap-2" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(217,119,6,0.12)' }}>
                  <Megaphone size={12} style={{ color: '#D97706' }} />
                </div>
                Notices
              </h2>
              <Link to="/announcements" className="text-[11px] font-semibold transition-colors flex items-center gap-0.5"
                style={{ color: '#D97706' }}>
                Post <Plus size={10} />
              </Link>
            </div>

            {announcements.length === 0 ? (
              <div className="text-xs" style={{ color: '#94A3B8' }}>Nothing posted yet.</div>
            ) : (
              <div className="space-y-2.5">
                {announcements.slice(0, 3).map((a) => (
                  <Link key={a._id} to="/announcements"
                    className="flex items-start gap-2 py-1 transition-all"
                    style={{ textDecoration: 'none' }}>
                    <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#D97706' }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate" style={{ color: '#0F172A' }}>{a.title}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: '#CBD5E1' }}>
                        {format(new Date(a.createdAt), 'MMM d')}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 2: Recent Visitors as a horizontal card stream ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(16,185,129,0.06))', border: '1px solid rgba(16,185,129,0.20)' }}>
              <UserCheck size={13} style={{ color: '#059669' }} />
            </span>
            Recent Visitors
            {recentVisitors.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                style={{ background: 'rgba(16,185,129,0.10)', color: '#059669' }}>
                {recentVisitors.length}
              </span>
            )}
          </h2>
          <Link to="/visitors" className="flex items-center gap-1 text-xs font-semibold transition-colors"
            style={{ color: '#059669' }}>
            View all <ArrowRight size={11} />
          </Link>
        </div>

        {recentVisitors.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <UserCheck size={28} className="mx-auto mb-2" style={{ color: '#CBD5E1' }} />
            <p className="text-sm" style={{ color: '#94A3B8' }}>No visitors registered yet</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory"
            style={{ scrollbarWidth: 'thin' }}>
            {recentVisitors.slice(0, 8).map((v) => (
              <Link key={v._id} to="/visitors"
                className="snap-start flex-shrink-0 w-[220px] rounded-2xl p-3.5 transition-all group"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(15,23,42,0.06)',
                  boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 24px rgba(15,23,42,0.10)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(15,23,42,0.04)'; }}>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(16,185,129,0.05))', color: '#059669', border: '1px solid rgba(16,185,129,0.20)' }}>
                    {v.visitorName[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate" style={{ color: '#0F172A', letterSpacing: '-0.01em' }}>
                      {v.visitorName}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: '#94A3B8' }}>
                      {format(new Date(v.expectedDate), 'MMM d · HH:mm')}
                    </div>
                  </div>
                </div>
                <div className="mb-2">
                  <Badge variant={visitorStatusBadge(v.status)}>{v.status}</Badge>
                </div>
                <div className="text-[11px] truncate leading-relaxed" style={{ color: '#64748B' }}>
                  <span style={{ color: '#94A3B8' }}>For</span>{' '}
                  <span className="font-medium" style={{ color: '#334155' }}>
                    {v.hostResidentId?.name || 'Unknown host'}
                  </span>
                </div>
                {v.purpose && (
                  <div className="text-[10px] mt-1 truncate uppercase tracking-wider font-semibold" style={{ color: '#CBD5E1' }}>
                    {v.purpose}
                  </div>
                )}
              </Link>
            ))}
            {/* Trailing "view all" tile */}
            <Link to="/visitors"
              className="snap-start flex-shrink-0 w-[140px] rounded-2xl flex flex-col items-center justify-center gap-2 transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))',
                border: '1px dashed rgba(16,185,129,0.30)',
                textDecoration: 'none',
                color: '#059669',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(16,185,129,0.04))'}
              onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))'}>
              <ArrowRight size={18} />
              <span className="text-xs font-bold">View all</span>
            </Link>
          </div>
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.14) 0%, rgba(16,185,129,0.06) 100%)', border: '1px solid rgba(16,185,129,0.20)' }}>
              <Zap size={14} style={{ color: '#059669' }} />
            </span>
            Quick Actions
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
          {[
            { to: '/residents',     icon: Users,    label: 'Residents',    sub: 'Manage members',iconGrad: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', tint: 'rgba(99,102,241,0.08)'  },
            { to: '/units',         icon: Home,     label: 'Units',        sub: 'View estate',   iconGrad: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)', tint: 'rgba(167,139,250,0.08)' },
            { to: '/announcements', icon: Megaphone,label: 'Post Notice',  sub: 'Broadcast',     iconGrad: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', tint: 'rgba(217,119,6,0.08)'   },
            { to: '/alerts',        icon: Bell,     label: 'Alerts',       sub: 'Security feed', iconGrad: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', tint: 'rgba(239,68,68,0.08)'   },
          ].map(({ to, icon: Icon, label, sub, iconGrad, tint }) => (
            <Link key={to} to={to}
              className="relative overflow-hidden rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 md:flex-col md:items-start md:gap-2.5 transition-all group"
              style={{
                textDecoration: 'none',
                background: '#FFFFFF',
                border: '1px solid rgba(15,23,42,0.06)',
                boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(15,23,42,0.10)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(15,23,42,0.04)'; }}>
              {/* Corner tint */}
              <span className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none opacity-70"
                style={{ background: tint }} />
              <div className="relative w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: iconGrad, boxShadow: '0 6px 14px -6px rgba(15,23,42,0.30), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
                <Icon size={19} style={{ color: '#fff' }} />
              </div>
              <div className="relative flex-1 min-w-0">
                <div className="text-sm font-bold truncate" style={{ color: '#0F172A', letterSpacing: '-0.01em' }}>
                  {label}
                </div>
                <div className="text-[11px] mt-0.5 truncate" style={{ color: '#94A3B8' }}>
                  {sub}
                </div>
              </div>
              <ChevronRight size={15} className="md:hidden flex-shrink-0 relative" style={{ color: '#CBD5E1' }} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
