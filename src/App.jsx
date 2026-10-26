import SeoTracker from './components/SeoTracker';
import { CallProvider } from './context/CallContext';
import CallOverlay from './components/calls/CallOverlay';
import UpdateBanner from './components/ui/UpdateBanner';
import Calls from './pages/Calls';
import Marketplace from './pages/Marketplace';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AppLayout from './components/layout/AppLayout';
import PlanGate from './components/ui/PlanGate';
import SubscriptionWall from './components/ui/SubscriptionWall';
import { LoadingScreen } from './components/ui/Spinner';
import { usePlan } from './hooks/usePlan';
import { canOpen, isTeamMember } from './utils/teamAccess';
import Team from './pages/Team';
import { Toaster } from 'react-hot-toast';

import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Visitors from './pages/Visitors';
import VisitorDetail from './pages/VisitorDetail';
import NewVisitorPage from './pages/NewVisitorPage';
import Residents from './pages/Residents';
import Units from './pages/Units';
import Announcements from './pages/Announcements';
import Chat from './pages/Chat';
import Alerts from './pages/Alerts';
import Payments from './pages/Payments';
import Settings from './pages/Settings';
import PasswordRequests from './pages/PasswordRequests';
import Upgrade from './pages/Upgrade';
import LoungeManager from './pages/LoungeManager';
import DJConsole from './pages/DJConsole';
import Podcasts from './pages/Podcasts';
import PodcastStudio from './pages/PodcastStudio';
import AnnouncementBroadcast from './pages/AnnouncementBroadcast';
import Guards from './pages/Guards';
import GuardDetail from './pages/GuardDetail';
import ResidentDetail from './pages/ResidentDetail';
import Courtroom from './pages/Courtroom';

function RequireManager({ children, allowWhenBlocked = false }) {
  const { user, loading } = useAuth();
  const { isBlocked, status, loading: planLoading } = usePlan();
  const location = useLocation();

  if (loading || planLoading) return <LoadingScreen />;
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
  const member = isTeamMember(user);
  // Estate setup is the owner's job — invited team members skip onboarding
  if (!member && user.estateId && !localStorage.getItem(`onboarding_done_${user._id}`)) {
    return <Navigate to="/onboarding" replace />;
  }
  // Invited members sign in with a temporary password and must set their own first
  if (member && user.mustChangePassword && location.pathname !== '/settings') {
    return <Navigate to="/settings" replace />;
  }
  if (!canOpen(user, location.pathname)) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24 px-6">
          <div className="glass-card p-8 max-w-sm text-center">
            <p className="font-semibold mb-2" style={{ color: '#0F172A' }}>You don't have access to this page</p>
            <p className="text-sm" style={{ color: '#64748B' }}>Ask your estate manager to give you access from the Team page.</p>
          </div>
        </div>
      </AppLayout>
    );
  }
  // Show suspension wall but keep the sidebar (with estate switcher) accessible
  if (isBlocked && !allowWhenBlocked) {
    return <AppLayout><SubscriptionWall status={status} /></AppLayout>;
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
      <Route path="/visitors/new" element={<RequireManager><PlanGate feature="visitorManagement" featureName="Visitor Management"><NewVisitorPage /></PlanGate></RequireManager>} />
      <Route path="/visitors/:id" element={<RequireManager><PlanGate feature="visitorManagement" featureName="Visitor Management"><VisitorDetail /></PlanGate></RequireManager>} />
      <Route path="/residents" element={<RequireManager><PlanGate feature="residentManagement" featureName="Resident Management"><Residents /></PlanGate></RequireManager>} />
      <Route path="/residents/:id" element={<RequireManager><PlanGate feature="residentManagement" featureName="Resident Management"><ResidentDetail /></PlanGate></RequireManager>} />
      <Route path="/units" element={<RequireManager><PlanGate feature="unitManagement" featureName="Unit Management"><Units /></PlanGate></RequireManager>} />
      <Route path="/announcements" element={<RequireManager><PlanGate feature="announcements" featureName="Announcements"><Announcements /></PlanGate></RequireManager>} />
      <Route path="/announcements/live" element={<RequireManager><PlanGate feature="announcements" featureName="Announcements"><AnnouncementBroadcast /></PlanGate></RequireManager>} />
      <Route path="/chat" element={<RequireManager><PlanGate feature="communityChat" featureName="Community Chat"><Chat /></PlanGate></RequireManager>} />
      <Route path="/payments" element={<RequireManager><PlanGate feature="paymentSystem" featureName="Payments"><Payments /></PlanGate></RequireManager>} />
      <Route path="/alerts" element={<RequireManager><PlanGate feature="securityPortal" featureName="Security & Alerts"><Alerts /></PlanGate></RequireManager>} />
      <Route path="/team" element={<RequireManager><Team /></RequireManager>} />
      <Route path="/settings" element={<RequireManager allowWhenBlocked><Settings /></RequireManager>} />
      <Route path="/settings/password-requests" element={<RequireManager><PasswordRequests /></RequireManager>} />
      <Route path="/upgrade" element={<RequireManager allowWhenBlocked><Upgrade /></RequireManager>} />
      <Route path="/lounge" element={<RequireManager><PlanGate feature="residentLounge" featureName="Lounge & Events"><LoungeManager /></PlanGate></RequireManager>} />
      <Route path="/lounge/dj" element={<RequireManager><PlanGate feature="residentLounge" featureName="Lounge & Events"><DJConsole /></PlanGate></RequireManager>} />
      <Route path="/podcasts" element={<RequireManager><PlanGate feature="residentLounge" featureName="Podcast"><Podcasts /></PlanGate></RequireManager>} />
      <Route path="/podcasts/live" element={<RequireManager><PlanGate feature="residentLounge" featureName="Podcast"><PodcastStudio /></PlanGate></RequireManager>} />
      <Route path="/guards" element={<RequireManager><Guards /></RequireManager>} />
      <Route path="/calls" element={<RequireManager><Calls /></RequireManager>} />
      <Route path="/marketplace" element={<RequireManager><PlanGate feature="marketplace" featureName="Marketplace"><Marketplace /></PlanGate></RequireManager>} />
      <Route path="/guards/:id" element={<RequireManager><GuardDetail /></RequireManager>} />
      <Route path="/courtroom" element={<RequireManager><Courtroom /></RequireManager>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SeoTracker />
      <AuthProvider>
        <SocketProvider>
          <CallProvider>
          <CallOverlay />
          <UpdateBanner />
          <AppRoutes />
          <Toaster position="top-right" toastOptions={{
            style: { background: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0', borderRadius: '12px', fontSize: '0.875rem', boxShadow: '0 8px 24px rgba(15,23,42,0.12)', padding: '0.75rem 1rem' },
            success: { iconTheme: { primary: '#10B981', secondary: '#FFFFFF' } },
            error:   { iconTheme: { primary: '#EF4444', secondary: '#FFFFFF' } },
          }} />
          </CallProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
