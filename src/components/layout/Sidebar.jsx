import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, UserCheck, Users, Home, Megaphone,
  MessageSquare, Bell, Settings, LogOut, CreditCard,
  Zap, Crown, Music, Lock, Shield,
} from 'lucide-react';
import { usePlan } from '../../hooks/usePlan';
import NotificationBell from '../ui/NotificationBell';

const NAV = [
  {
    section: 'Management',
    links: [
      { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/visitors',      icon: UserCheck,       label: 'Visitors',        feature: 'visitorManagement' },
      { to: '/residents',     icon: Users,           label: 'Residents',       feature: 'residentManagement' },
      { to: '/units',         icon: Home,            label: 'Units',           feature: 'unitManagement' },
      { to: '/announcements', icon: Megaphone,       label: 'Announcements',   feature: 'announcements' },
      { to: '/payments',      icon: CreditCard,      label: 'Payments',        feature: 'paymentSystem' },
      { to: '/guards',        icon: Shield,          label: 'Guards' },
    ],
  },
  {
    section: 'Community',
    links: [
      { to: '/lounge',  icon: Music,         label: 'Lounge & Events', feature: 'residentLounge' },
      { to: '/chat',    icon: MessageSquare, label: 'Community Chat',  feature: 'communityChat' },
      { to: '/alerts',  icon: Bell,          label: 'Alerts',          feature: 'securityPortal' },
    ],
  },
  {
    section: 'Account',
    links: [
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export default function Sidebar({ mobile = false, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { planName, planColor, status, can } = usePlan();
  const estateName =
    user?.estateId && typeof user.estateId === 'object'
      ? user.estateId.name
      : 'Estate Manager';

  const initials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  return (
    <aside
      className="flex flex-col h-full overflow-hidden"
      style={{
        width: mobile ? '17rem' : '15.5rem',
        background: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
      }}>

      {/* Logo / Estate header */}
      <div style={{ borderBottom: '1px solid #E2E8F0', padding: '20px 16px 16px' }}>
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="flex items-center gap-3 flex-1 min-w-0 transition-opacity hover:opacity-80" style={{ textDecoration: 'none' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', boxShadow: '0 4px 12px rgba(16,185,129,0.25)' }}>
              <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
                <path d="M20 4L6 12v16l14 8 14-8V12L20 4z" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="none"/>
                <path d="M20 9L9 15.5v13L20 35l11-6.5v-13L20 9z" fill="rgba(255,255,255,0.2)"/>
                <text x="20" y="25" textAnchor="middle" fill="white" fontSize="12" fontWeight="800" fontFamily="system-ui,sans-serif">AC</text>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate leading-tight" style={{ color: '#0F172A', letterSpacing: '-0.03em' }}>
                Area<span style={{ color: '#10B981' }}>Connect</span>
              </div>
              <div className="text-xs font-medium mt-0.5 truncate" style={{ color: '#94A3B8' }}>{estateName}</div>
            </div>
          </Link>
          <NotificationBell />
        </div>

        {/* Plan badge */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
            style={{ background: planColor + '18', color: planColor, border: `1px solid ${planColor}30` }}>
            {planName}
          </span>
          {status === 'trial' && (
            <span className="text-xs flex items-center gap-0.5 font-medium" style={{ color: '#D97706' }}>
              <Zap size={10} />Trial
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
        {NAV.map(({ section, links }) => (
          <div key={section}>
            <p className="text-xs font-semibold uppercase tracking-widest px-2 pb-2"
              style={{ color: '#94A3B8', letterSpacing: '0.08em' }}>
              {section}
            </p>
            <div className="space-y-0.5">
              {links.map(({ to, icon: Icon, label, feature }) => {
                const locked = feature ? !can(feature) : false;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/dashboard'}
                    onClick={onClose}
                    className={({ isActive }) =>
                      isActive ? 'sidebar-link active' : 'sidebar-link'
                    }
                    style={{ opacity: locked ? 0.5 : 1 }}>
                    <Icon size={15} className="flex-shrink-0" />
                    <span className="flex-1">{label}</span>
                    {locked && <Lock size={10} style={{ color: '#94A3B8', flexShrink: 0 }} />}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Upgrade */}
      <div className="px-3 pb-2">
        <NavLink to="/upgrade" onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              isActive
                ? 'text-amber-700 bg-amber-50 border border-amber-200'
                : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 border border-transparent'
            }`
          }>
          <Crown size={14} />
          <span>Upgrade Plan</span>
        </NavLink>
      </div>

      {/* User footer */}
      <div className="px-3 pb-4 pt-2" style={{ borderTop: '1px solid #E2E8F0' }}>
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl mb-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
            style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', fontSize: '0.75rem' }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate leading-tight" style={{ color: '#0F172A' }}>{user?.name}</div>
            <div className="text-xs truncate" style={{ color: '#94A3B8' }}>{user?.email}</div>
          </div>
        </div>
        <button
          onClick={async () => { await logout(); navigate('/login'); }}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ color: '#94A3B8' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = '#FEF2F2'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}>
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  );
}
