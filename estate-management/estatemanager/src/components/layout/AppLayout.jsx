import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} />
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
        <header className="lg:hidden flex items-center gap-3 px-4 py-3"
          style={{
            background: 'linear-gradient(90deg, #0C1018 0%, #080B12 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
              <span className="text-white font-bold" style={{ fontSize: '0.6rem' }}>AC</span>
            </div>
            <span className="font-semibold text-white text-sm" style={{ letterSpacing: '-0.02em' }}>
              Area<span style={{ color: '#10B981' }}>Connect</span>
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.04) 0%, transparent 60%), var(--bg)' }}>
          {children}
        </main>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#141820',
            color: '#F1F5F9',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '0.875rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            padding: '0.75rem 1rem',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#141820' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#141820' } },
        }}
      />
    </div>
  );
}
