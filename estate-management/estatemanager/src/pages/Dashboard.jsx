import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, UserCheck, Bell, Home, Megaphone,
  ArrowRight, Activity, Shield, Plus, Zap,
} from 'lucide-react';
import { estateAPI, visitorAPI, alertAPI, announcementAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/ui/StatCard';
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
    <div className="space-y-7 animate-fade-in">

      {/* ── Hero banner ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 40%, rgba(99,102,241,0.06) 100%)',
          border: '1px solid rgba(16,185,129,0.18)',
        }}>
        {/* Background glow */}
        <div className="absolute -top-8 -left-8 w-48 h-48 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #10B981, transparent)' }} />
        <div className="absolute -bottom-12 -right-8 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #6366F1, transparent)' }} />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(16,185,129,0.15)', color: '#34D399', border: '1px solid rgba(16,185,129,0.25)' }}>
                {format(new Date(), 'EEEE, MMMM d')}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-2" style={{ letterSpacing: '-0.03em' }}>
              {greeting()}, {firstName} 👋
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {estateName} — here's what's happening today
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <Link to="/visitors" className="btn-outline text-sm px-4 py-2">
              <UserCheck size={14} /> Visitors
            </Link>
            <Link to="/alerts" className="btn-primary text-sm px-4 py-2 relative">
              <Bell size={14} />
              Alerts
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

      {/* ── Stats ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Residents" value={stats?.totalResidents  || 0} icon={Users}     color="blue"  />
        <StatCard label="Visitors Today"   value={stats?.todaysVisitors  || 0} icon={UserCheck} color="green" />
        <StatCard label="Inside Now"       value={stats?.activeVisitors  || 0} icon={Activity}  color="gold"  />
        <StatCard label="Open Alerts"      value={stats?.openAlerts      || 0} icon={Bell}      color="red"   />
      </div>

      {/* ── Main grid ───────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Recent Visitors — 2 cols */}
        <div className="lg:col-span-2 glass-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="font-semibold text-white flex items-center gap-2 text-sm"
              style={{ letterSpacing: '-0.02em' }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(16,185,129,0.15)' }}>
                <UserCheck size={13} style={{ color: '#34D399' }} />
              </div>
              Recent Visitors
            </h2>
            <Link to="/visitors"
              className="flex items-center gap-1 text-xs font-medium transition-colors"
              style={{ color: '#34D399' }}
              onMouseEnter={e => e.currentTarget.style.color = '#6EE7B7'}
              onMouseLeave={e => e.currentTarget.style.color = '#34D399'}>
              View all <ArrowRight size={11} />
            </Link>
          </div>

          {recentVisitors.length === 0 ? (
            <div className="p-10 text-center text-sm" style={{ color: 'var(--text-dim)' }}>
              No visitors registered yet
            </div>
          ) : (
            <div>
              {recentVisitors.map((v, i) => (
                <div key={v._id}
                  className="flex items-center gap-3 px-5 py-3 transition-colors"
                  style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: 'rgba(16,185,129,0.12)', color: '#34D399', border: '1px solid rgba(16,185,129,0.2)' }}>
                    {v.visitorName[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm truncate">{v.visitorName}</div>
                    <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-dim)' }}>
                      {v.purpose} · Host: {v.hostResidentId?.name || '—'}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1">
                    <Badge variant={visitorStatusBadge(v.status)}>{v.status}</Badge>
                    <div className="text-xs" style={{ color: 'var(--text-hint)' }}>
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
              <h2 className="font-semibold text-white text-sm flex items-center gap-2"
                style={{ letterSpacing: '-0.02em' }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,0.12)' }}>
                  <Shield size={13} style={{ color: '#F87171' }} />
                </div>
                Open Alerts
              </h2>
              <Link to="/alerts"
                className="text-xs font-medium transition-colors"
                style={{ color: '#34D399' }}
                onMouseEnter={e => e.currentTarget.style.color = '#6EE7B7'}
                onMouseLeave={e => e.currentTarget.style.color = '#34D399'}>
                Manage
              </Link>
            </div>

            {openAlerts.length === 0 ? (
              <div className="text-center py-3">
                <div className="w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center"
                  style={{ background: 'rgba(16,185,129,0.1)' }}>
                  <span className="text-base">✓</span>
                </div>
                <div className="text-sm font-medium" style={{ color: '#34D399' }}>All clear</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>No open alerts</div>
              </div>
            ) : (
              <div className="space-y-2">
                {openAlerts.map((a) => (
                  <div key={a._id}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl"
                    style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.14)' }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-semibold capitalize truncate">{a.type} alert</div>
                      <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-dim)' }}>
                        {a.residentId?.name}
                      </div>
                    </div>
                    <div className="text-xs flex-shrink-0" style={{ color: 'var(--text-hint)' }}>
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
              <h2 className="font-semibold text-white text-sm flex items-center gap-2"
                style={{ letterSpacing: '-0.02em' }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(251,191,36,0.12)' }}>
                  <Megaphone size={13} style={{ color: '#FBBF24' }} />
                </div>
                Notices
              </h2>
              <Link to="/announcements"
                className="text-xs font-medium transition-colors"
                style={{ color: '#34D399' }}
                onMouseEnter={e => e.currentTarget.style.color = '#6EE7B7'}
                onMouseLeave={e => e.currentTarget.style.color = '#34D399'}>
                Post
              </Link>
            </div>

            {announcements.length === 0 ? (
              <Link to="/announcements"
                className="flex items-center gap-2 text-xs font-medium transition-colors"
                style={{ color: 'rgba(16,185,129,0.6)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#34D399'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(16,185,129,0.6)'}>
                <Plus size={12} /> Post first announcement
              </Link>
            ) : (
              <div className="space-y-3">
                {announcements.map((a) => (
                  <div key={a._id} className="flex items-start gap-2.5">
                    <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#34D399' }} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white truncate">{a.title}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-hint)' }}>
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

      {/* ── Quick Actions ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap size={15} style={{ color: '#34D399' }} />
          <h2 className="text-base font-semibold text-white" style={{ letterSpacing: '-0.02em' }}>
            Quick Actions
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/residents',     icon: Users,    label: 'Manage Residents', iconBg: 'rgba(99,102,241,0.12)',  iconColor: '#818CF8'  },
            { to: '/units',         icon: Home,     label: 'Estate Units',     iconBg: 'rgba(167,139,250,0.12)', iconColor: '#C4B5FD'  },
            { to: '/announcements', icon: Megaphone,label: 'Post Notice',      iconBg: 'rgba(251,191,36,0.12)',  iconColor: '#FBBF24'  },
            { to: '/alerts',        icon: Bell,     label: 'View Alerts',      iconBg: 'rgba(239,68,68,0.12)',   iconColor: '#F87171'  },
          ].map(({ to, icon: Icon, label, iconBg, iconColor }) => (
            <Link key={to} to={to}
              className="glass-card p-4 flex flex-col items-center text-center gap-3 group transition-all"
              style={{ textDecoration: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ background: iconBg }}>
                <Icon size={19} style={{ color: iconColor }} />
              </div>
              <span className="text-xs font-medium transition-colors" style={{ color: 'var(--text-sub)' }}>
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
