import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Menu, X,
  LayoutDashboard, UserCheck, Users, Home, Megaphone, Bell, Settings,
} from 'lucide-react';
import Sidebar from './Sidebar';
import { Toaster } from 'react-hot-toast';

const BOTTOM_NAV = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Home' },
  { to: '/visitors',    icon: UserCheck,        label: 'Visitors' },
  { to: '/residents',   icon: Users,            label: 'Residents' },
  { to: '/alerts',      icon: Bell,             label: 'Alerts' },
  { to: '/settings',    icon: Settings,         label: 'Settings' },
];

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' }} />
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
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
            <span className="text-white font-black text-[10px]">AC</span>
          </div>
          <span className="font-bold flex-1 text-base" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
            Area<span style={{ color: '#10B981' }}>Connect</span>
          </span>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl transition-all"
            style={{ color: '#64748B' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Menu size={20} />
          </button>
        </header>

        {/* Page content — pb-24 on mobile to clear bottom nav */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 lg:p-8 lg:pb-8"
          style={{ background: 'var(--bg)' }}>
          {children}
        </main>
      </div>

      {/* ── Mobile bottom navigation ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t"
        style={{ borderTopColor: '#E2E8F0', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex">
          {BOTTOM_NAV.map(({ to, icon: Icon, label }) => (
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

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#FFFFFF',
            color: '#0F172A',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            fontSize: '0.875rem',
            boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
            padding: '0.75rem 1rem',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#FFFFFF' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#FFFFFF' } },
        }}
      />
    </div>
  );
}
