import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Menu, X, PhoneCall,
  LayoutDashboard, UserCheck, Users, Home, Megaphone, Bell, Settings,
} from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { canOpen } from '../../utils/teamAccess';
import NotificationBell from '../ui/NotificationBell';
import AlertModal from '../ui/AlertModal';
import EstateSwitcher from '../ui/EstateSwitcher';
import { NotificationProvider } from '../../context/NotificationContext';
import PodcastLivePill from '../PodcastLivePill';
import LiveNotificationModal from '../LiveNotificationModal';
import LiveLocations from '../safety/LiveLocations';
import CallAlertsPrompt from '../calls/CallAlertsPrompt';

const BOTTOM_NAV = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Home' },
  { to: '/visitors',    icon: UserCheck,        label: 'Visitors' },
  { to: '/residents',   icon: Users,            label: 'Residents' },
  { to: '/alerts',      icon: Bell,             label: 'Alerts' },
  { to: '/settings',    icon: Settings,         label: 'Settings' },
];

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const bottomNav = BOTTOM_NAV.filter(l => canOpen(user, l.to));

  return (
    <NotificationProvider>
    <AlertModal />
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="overlay-backdrop" aria-hidden="true" />
          <div className="absolute left-0 top-0 bottom-0 z-50 animate-slide-in">
            <Sidebar mobile onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 flex-shrink-0"
          style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                <span className="text-white font-black text-[10px]">AC</span>
              </div>
              <span className="font-bold text-base" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
                Area<span style={{ color: '#10B981' }}>Connect</span>
              </span>
            </Link>
            <EstateSwitcher compact />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <NavLink to="/calls" aria-label="Calls" className="p-2 rounded-xl transition-all"
              style={({ isActive }) => ({ color: isActive ? '#059669' : '#64748B', background: isActive ? '#ECFDF5' : 'transparent' })}>
              <PhoneCall size={20} />
            </NavLink>
            <NotificationBell />
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl transition-all"
              style={{ color: '#64748B' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Menu size={20} />
            </button>
          </div>
        </header>

        {/* Page content — pb-24 on mobile to clear bottom nav */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 lg:p-8 lg:pb-8"
          style={{ background: 'var(--bg)' }}>
          <CallAlertsPrompt appName="AreaConnector" />
          {children}
        </main>
        {/* Residents sharing live location for their safety */}
        <LiveLocations />
      </div>

      {/* Floating "AreaConnect FM is LIVE" pill */}
      <PodcastLivePill />

      {/* Live notification modal (DJ / Announcement / Podcast) */}
      <LiveNotificationModal />

      {/* ── Mobile bottom navigation ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t"
        style={{ borderTopColor: '#E2E8F0', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex">
          {bottomNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all"
              style={({ isActive }) => ({ color: isActive ? '#10B981' : '#94A3B8' })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={21} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span className="text-[10px] font-semibold">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
    </NotificationProvider>
  );
}
