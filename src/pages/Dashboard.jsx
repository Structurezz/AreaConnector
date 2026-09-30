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
        className="relative overflow-hidden rounded-3xl p-5 pt-6 sm:p-8"
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
          {/* Top row: pills + avatar */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(6px)' }}>
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-200 animate-ping opacity-75" />
                  <span className="relative w-1.5 h-1.5 rounded-full bg-white" />
                </span>
                Live
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-full truncate"
                style={{ background: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.92)', border: '1px solid rgba(255,255,255,0.20)' }}>
                {format(new Date(), 'EEE, MMM d')}
              </span>
            </div>
            <Link to="/settings" className="flex-shrink-0 relative group">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-base sm:text-lg text-white"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.10) 100%)',
                  border: '1.5px solid rgba(255,255,255,0.55)',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.35)',
                }}>
                {firstName[0]?.toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-300 border-2"
                style={{ borderColor: '#047857' }} />
            </Link>
          </div>

          {/* Greeting */}
          <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.72)' }}>
            {greeting()}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-2" style={{ letterSpacing: '-0.04em', lineHeight: 1.05 }}>
            {firstName} <span className="inline-block animate-slide-down">👋</span>
          </h1>
          <p className="text-sm sm:text-base mb-5 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.85)' }}>
            <Sparkles size={13} className="flex-shrink-0" style={{ color: '#A7F3D0' }} />
            <span className="truncate"><span className="font-semibold text-white">{estateName}</span> · Today's snapshot</span>
          </p>

          {/* Stat tiles — icons + numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {[
              { label: 'Residents',      value: stats?.totalResidents || 0, Icon: UsersRound },
              { label: 'Visitors Today', value: stats?.todaysVisitors  || 0, Icon: UserCheck  },
              { label: 'Inside Now',     value: stats?.activeVisitors  || 0, Icon: LogIn, dot: (stats?.activeVisitors || 0) > 0 },
              { label: 'Open Alerts',    value: stats?.openAlerts      || 0, Icon: Bell,  alert: true },
            ].map(({ label, value, Icon, alert, dot }) => {
              const isDanger = alert && value > 0;
              return (
                <div key={label}
                  className="relative rounded-2xl p-3 sm:p-4 overflow-hidden"
                  style={{
                    background: isDanger
                      ? 'linear-gradient(135deg, rgba(239,68,68,0.32) 0%, rgba(220,38,38,0.20) 100%)'
                      : 'rgba(255,255,255,0.14)',
                    border: `1px solid ${isDanger ? 'rgba(254,202,202,0.45)' : 'rgba(255,255,255,0.22)'}`,
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
                  }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.20)' }}>
                      <Icon size={14} style={{ color: '#fff' }} />
                    </div>
                    {dot && (
                      <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                    )}
                    {isDanger && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(255,255,255,0.22)', color: '#fff' }}>New</span>
                    )}
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white leading-none mb-1" style={{ letterSpacing: '-0.03em' }}>
                    {value}
                  </div>
                  <div className="text-[10px] sm:text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.78)' }}>
                    {label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action row */}
          <div className="flex items-stretch gap-2 mt-5">
            <Link to="/alerts"
              className="flex-1 inline-flex items-center justify-center gap-2 text-sm font-bold px-4 py-3 rounded-xl transition-all relative group"
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
              className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-3 rounded-xl transition-all"
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

      {/* ── Main grid ── */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* Recent Visitors — half width */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <h2 className="font-semibold flex items-center gap-2 text-sm"
              style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(16,185,129,0.10)' }}>
                <UserCheck size={13} style={{ color: '#059669' }} />
              </div>
              Recent Visitors
            </h2>
            <Link to="/visitors"
              className="flex items-center gap-1 text-xs font-medium transition-colors"
              style={{ color: '#059669' }}
              onMouseEnter={e => e.currentTarget.style.color = '#10B981'}
              onMouseLeave={e => e.currentTarget.style.color = '#059669'}>
              View all <ArrowRight size={11} />
            </Link>
          </div>

          {recentVisitors.length === 0 ? (
            <div className="p-10 text-center text-sm" style={{ color: '#94A3B8' }}>
              No visitors registered yet
            </div>
          ) : (
            <div>
              {recentVisitors.map((v, i) => (
                <div key={v._id}
                  className="flex items-center gap-3 px-5 py-3 transition-colors"
                  style={{ borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: 'rgba(16,185,129,0.10)', color: '#059669', border: '1px solid rgba(16,185,129,0.18)' }}>
                    {v.visitorName[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate" style={{ color: '#0F172A' }}>{v.visitorName}</div>
                    <div className="text-xs truncate mt-0.5" style={{ color: '#94A3B8' }}>
                      {v.purpose} · Host: {v.hostResidentId?.name || '—'}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1">
                    <Badge variant={visitorStatusBadge(v.status)}>{v.status}</Badge>
                    <div className="text-xs" style={{ color: '#CBD5E1' }}>
                      {format(new Date(v.expectedDate), 'MMM d')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Estate Location Map */}
          <EstateMap
            name={estate?.name || estateName}
            address={estate?.address}
            location={estate?.location}
            height={200}
            variant="card"
          />

          {/* Open Alerts */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm flex items-center gap-2"
                style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,0.08)' }}>
                  <Shield size={13} style={{ color: '#EF4444' }} />
                </div>
                Open Alerts
              </h2>
              <Link to="/alerts"
                className="text-xs font-medium transition-colors"
                style={{ color: '#059669' }}
                onMouseEnter={e => e.currentTarget.style.color = '#10B981'}
                onMouseLeave={e => e.currentTarget.style.color = '#059669'}>
                Manage
              </Link>
            </div>

            {openAlerts.length === 0 ? (
              <div className="text-center py-3">
                <div className="w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center"
                  style={{ background: 'rgba(16,185,129,0.08)' }}>
                  <span className="text-base">✓</span>
                </div>
                <div className="text-sm font-medium" style={{ color: '#059669' }}>All clear</div>
                <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>No open alerts</div>
              </div>
            ) : (
              <div className="space-y-2">
                {openAlerts.map((a) => (
                  <div key={a._id}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl"
                    style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold capitalize truncate" style={{ color: '#DC2626' }}>{a.type} alert</div>
                      <div className="text-xs truncate mt-0.5" style={{ color: '#94A3B8' }}>
                        {a.residentId?.name}
                      </div>
                    </div>
                    <div className="text-xs flex-shrink-0" style={{ color: '#CBD5E1' }}>
                      {format(new Date(a.createdAt), 'HH:mm')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Announcements */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm flex items-center gap-2"
                style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(217,119,6,0.10)' }}>
                  <Megaphone size={13} style={{ color: '#D97706' }} />
                </div>
                Notices
              </h2>
              <Link to="/announcements"
                className="text-xs font-medium transition-colors"
                style={{ color: '#059669' }}
                onMouseEnter={e => e.currentTarget.style.color = '#10B981'}
                onMouseLeave={e => e.currentTarget.style.color = '#059669'}>
                Post
              </Link>
            </div>

            {announcements.length === 0 ? (
              <Link to="/announcements"
                className="flex items-center gap-2 text-xs font-medium transition-colors"
                style={{ color: '#10B981' }}
                onMouseEnter={e => e.currentTarget.style.color = '#059669'}
                onMouseLeave={e => e.currentTarget.style.color = '#10B981'}>
                <Plus size={12} /> Post first announcement
              </Link>
            ) : (
              <div className="space-y-3">
                {announcements.map((a) => (
                  <div key={a._id} className="flex items-start gap-2.5">
                    <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#10B981' }} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate" style={{ color: '#0F172A' }}>{a.title}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#CBD5E1' }}>
                        {format(new Date(a.createdAt), 'MMM d')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
