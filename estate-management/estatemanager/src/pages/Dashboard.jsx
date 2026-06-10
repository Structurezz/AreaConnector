import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, UserCheck, Bell, Home, Megaphone,
  ArrowRight, Activity, Shield, Plus, Zap,
} from 'lucide-react';
import { estateAPI, visitorAPI, alertAPI, announcementAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { visitorStatusBadge } from '../components/ui/Badge';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
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
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([
      estateAPI.getStats(),
      visitorAPI.getAll({ limit: 6 }),
      alertAPI.getAll({ status: 'open', limit: 4 }),
      announcementAPI.getAll({ limit: 3 }),
    ]).then(([s, v, a, n]) => {
      setStats(s.data.data);
      setRecentVisitors(v.data.data);
      setOpenAlerts(a.data.data);
      setAnnouncements(n.data.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

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
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
        style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 60%, #047857 100%)' }}
      >
        {/* Decorative blobs */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="absolute -bottom-10 right-24 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="absolute top-0 left-1/2 w-px h-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.04)' }} />

        <div className="relative">
          {/* Top row */}
          <div className="flex items-center gap-2.5 mb-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.95)' }}>
              {format(new Date(), 'EEEE, MMMM d')}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.95)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
              Live
            </span>
          </div>

          {/* Greeting */}
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 text-white" style={{ letterSpacing: '-0.03em' }}>
            {greeting()}, {firstName}
          </h1>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {estateName} — here's today at a glance
          </p>

          {/* Stat tiles inside hero */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Residents',    value: stats?.totalResidents || 0 },
              { label: 'Visitors Today', value: stats?.todaysVisitors  || 0 },
              { label: 'Inside Now',   value: stats?.activeVisitors   || 0 },
              { label: 'Open Alerts',  value: stats?.openAlerts       || 0, alert: true },
            ].map(({ label, value, alert }) => (
              <div key={label}
                className="rounded-xl p-3.5 sm:p-4"
                style={{ background: alert && value > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                <div className="text-2xl font-bold text-white mb-0.5">{value}</div>
                <div className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.72)' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 mt-5 flex-wrap">
            <Link to="/visitors"
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.20)', color: 'white' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.28)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.20)'}>
              <UserCheck size={14} /> Visitors
            </Link>
            <Link to="/alerts"
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all relative"
              style={{ background: 'white', color: '#059669' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F0FDF4'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}>
              <Bell size={14} /> Alerts
              {openAlerts.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white flex items-center justify-center font-bold"
                  style={{ background: '#EF4444', fontSize: '0.6rem' }}>
                  {openAlerts.length}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Recent Visitors — 2 cols */}
        <div className="lg:col-span-2 glass-card overflow-hidden">
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
        <div className="flex items-center gap-2 mb-4">
          <Zap size={15} style={{ color: '#10B981' }} />
          <h2 className="text-base font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
            Quick Actions
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/residents',     icon: Users,    label: 'Manage Residents', iconBg: 'rgba(99,102,241,0.10)',  iconColor: '#6366F1'  },
            { to: '/units',         icon: Home,     label: 'Estate Units',     iconBg: 'rgba(167,139,250,0.10)', iconColor: '#8B5CF6'  },
            { to: '/announcements', icon: Megaphone,label: 'Post Notice',      iconBg: 'rgba(217,119,6,0.10)',   iconColor: '#D97706'  },
            { to: '/alerts',        icon: Bell,     label: 'View Alerts',      iconBg: 'rgba(239,68,68,0.10)',   iconColor: '#EF4444'  },
          ].map(({ to, icon: Icon, label, iconBg, iconColor }) => (
            <Link key={to} to={to}
              className="glass-card p-4 flex flex-col items-center text-center gap-3 transition-all"
              style={{ textDecoration: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: iconBg }}>
                <Icon size={19} style={{ color: iconColor }} />
              </div>
              <span className="text-xs font-medium" style={{ color: '#64748B' }}>
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
