import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AppLayout from './components/layout/AppLayout';
import PlanGate from './components/ui/PlanGate';
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
import Guards from './pages/Guards';
import GuardDetail from './pages/GuardDetail';
import ResidentDetail from './pages/ResidentDetail';

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
      <Route path="/visitors" element={<RequireManager><PlanGate feature="visitorManagement" featureName="Visitor Management"><Visitors /></PlanGate></RequireManager>} />
      <Route path="/visitors/:id" element={<RequireManager><PlanGate feature="visitorManagement" featureName="Visitor Management"><VisitorDetail /></PlanGate></RequireManager>} />
      <Route path="/residents" element={<RequireManager><PlanGate feature="residentManagement" featureName="Resident Management"><Residents /></PlanGate></RequireManager>} />
      <Route path="/residents/:id" element={<RequireManager><PlanGate feature="residentManagement" featureName="Resident Management"><ResidentDetail /></PlanGate></RequireManager>} />
      <Route path="/units" element={<RequireManager><PlanGate feature="unitManagement" featureName="Unit Management"><Units /></PlanGate></RequireManager>} />
      <Route path="/announcements" element={<RequireManager><PlanGate feature="announcements" featureName="Announcements"><Announcements /></PlanGate></RequireManager>} />
      <Route path="/chat" element={<RequireManager><PlanGate feature="communityChat" featureName="Community Chat"><Chat /></PlanGate></RequireManager>} />
      <Route path="/payments" element={<RequireManager><PlanGate feature="paymentSystem" featureName="Payments"><Payments /></PlanGate></RequireManager>} />
      <Route path="/alerts" element={<RequireManager><PlanGate feature="securityPortal" featureName="Security & Alerts"><Alerts /></PlanGate></RequireManager>} />
      <Route path="/settings" element={<RequireManager><Settings /></RequireManager>} />
      <Route path="/upgrade" element={<RequireManager><Upgrade /></RequireManager>} />
      <Route path="/lounge" element={<RequireManager><PlanGate feature="residentLounge" featureName="Lounge & Events"><LoungeManager /></PlanGate></RequireManager>} />
      <Route path="/guards" element={<RequireManager><Guards /></RequireManager>} />
      <Route path="/guards/:id" element={<RequireManager><GuardDetail /></RequireManager>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
