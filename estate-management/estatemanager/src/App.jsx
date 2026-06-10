import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AppLayout from './components/layout/AppLayout';
import { LoadingScreen } from './components/ui/Spinner';
import { Toaster } from 'react-hot-toast';

import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Visitors from './pages/Visitors';
import VisitorDetail from './pages/VisitorDetail';
import Residents from './pages/Residents';
import Units from './pages/Units';
import Announcements from './pages/Announcements';
import Chat from './pages/Chat';
import Alerts from './pages/Alerts';
import Payments from './pages/Payments';
import Settings from './pages/Settings';
import Upgrade from './pages/Upgrade';
import LoungeManager from './pages/LoungeManager';

function RequireManager({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'estate_manager') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="glass-card p-8 max-w-sm text-center">
          <p className="text-red-400 font-semibold mb-2">Access Denied</p>
          <p className="text-white/50 text-sm">This portal is for Estate Managers only.</p>
        </div>
      </div>
    );
  }
  if (user.estateId && !localStorage.getItem(`onboarding_done_${user._id}`)) {
    return <Navigate to="/onboarding" replace />;
  }
  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/login" element={user?.role === 'estate_manager' ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={user?.role === 'estate_manager' ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/onboarding" element={
        !user ? <Navigate to="/login" replace /> :
        user.role !== 'estate_manager' ? <Navigate to="/dashboard" replace /> :
        <Onboarding />
      } />
      <Route path="/dashboard" element={<RequireManager><Dashboard /></RequireManager>} />
      <Route path="/visitors" element={<RequireManager><Visitors /></RequireManager>} />
      <Route path="/visitors/:id" element={<RequireManager><VisitorDetail /></RequireManager>} />
      <Route path="/residents" element={<RequireManager><Residents /></RequireManager>} />
      <Route path="/units" element={<RequireManager><Units /></RequireManager>} />
      <Route path="/announcements" element={<RequireManager><Announcements /></RequireManager>} />
      <Route path="/chat" element={<RequireManager><Chat /></RequireManager>} />
      <Route path="/payments" element={<RequireManager><Payments /></RequireManager>} />
      <Route path="/alerts" element={<RequireManager><Alerts /></RequireManager>} />
      <Route path="/settings" element={<RequireManager><Settings /></RequireManager>} />
      <Route path="/upgrade" element={<RequireManager><Upgrade /></RequireManager>} />
      <Route path="/lounge" element={<RequireManager><LoungeManager /></RequireManager>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
          <Toaster position="top-right" toastOptions={{
            style: { background: '#1C1C20', color: '#E4E4E7', border: '1px solid #2E2E33', borderRadius: '8px', fontSize: '0.875rem' },
            success: { iconTheme: { primary: '#10B981', secondary: '#1C1C20' } },
          }} />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
