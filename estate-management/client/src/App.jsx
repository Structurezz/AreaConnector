import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AppLayout from './components/layout/AppLayout';
import { LoadingScreen } from './components/ui/Spinner';

// Auth
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Admin
import AdminDashboard from './pages/admin/Dashboard';
import AdminEstates from './pages/admin/Estates';
import NewEstate from './pages/admin/NewEstate';

// Estate Manager
import ManagerDashboard from './pages/estatemanager/Dashboard';
import ManagerVisitors from './pages/estatemanager/Visitors';
import ManagerVisitorDetail from './pages/estatemanager/VisitorDetail';
import ManagerResidents from './pages/estatemanager/Residents';
import Units from './pages/estatemanager/Units';
import ManagerAnnouncements from './pages/estatemanager/Announcements';
import ManagerAlerts from './pages/estatemanager/Alerts';
import ManagerSettings from './pages/estatemanager/Settings';

// Residents
import ResidentDashboard from './pages/residents/Dashboard';
import ResidentVisitors from './pages/residents/Visitors';
import ResidentVisitorDetail from './pages/residents/VisitorDetail';
import Marketplace from './pages/residents/Marketplace';
import Chat from './pages/residents/Chat';
import AlertPage from './pages/residents/AlertPage';

// Security
import SecurityDashboard from './pages/security/Dashboard';
import SecurityLog from './pages/security/Log';
import SecurityAlerts from './pages/security/Alerts';

const ROLE_HOME = {
  super_admin: '/admin/dashboard',
  estate_manager: '/manager/dashboard',
  resident: '/resident/dashboard',
  security: '/security/dashboard',
};

function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />;
  }
  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={user ? <Navigate to={ROLE_HOME[user.role]} replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={ROLE_HOME[user.role]} replace /> : <Register />} />
      <Route path="/invite/:estateCode" element={<Register />} />

      {/* ── ADMIN ── */}
      <Route path="/admin/dashboard" element={<RequireAuth roles={['super_admin']}><AdminDashboard /></RequireAuth>} />
      <Route path="/admin/estates" element={<RequireAuth roles={['super_admin']}><AdminEstates /></RequireAuth>} />
      <Route path="/admin/estates/new" element={<RequireAuth roles={['super_admin']}><NewEstate /></RequireAuth>} />

      {/* ── ESTATE MANAGER ── */}
      <Route path="/manager/dashboard" element={<RequireAuth roles={['estate_manager']}><ManagerDashboard /></RequireAuth>} />
      <Route path="/manager/visitors" element={<RequireAuth roles={['estate_manager']}><ManagerVisitors /></RequireAuth>} />
      <Route path="/manager/visitors/:id" element={<RequireAuth roles={['estate_manager']}><ManagerVisitorDetail /></RequireAuth>} />
      <Route path="/manager/residents" element={<RequireAuth roles={['estate_manager']}><ManagerResidents /></RequireAuth>} />
      <Route path="/manager/units" element={<RequireAuth roles={['estate_manager']}><Units /></RequireAuth>} />
      <Route path="/manager/announcements" element={<RequireAuth roles={['estate_manager']}><ManagerAnnouncements /></RequireAuth>} />
      <Route path="/manager/alerts" element={<RequireAuth roles={['estate_manager']}><ManagerAlerts /></RequireAuth>} />
      <Route path="/manager/settings" element={<RequireAuth roles={['estate_manager']}><ManagerSettings /></RequireAuth>} />

      {/* ── RESIDENTS ── */}
      <Route path="/resident/dashboard" element={<RequireAuth roles={['resident']}><ResidentDashboard /></RequireAuth>} />
      <Route path="/resident/visitors" element={<RequireAuth roles={['resident']}><ResidentVisitors /></RequireAuth>} />
      <Route path="/resident/visitors/new" element={<RequireAuth roles={['resident']}><ResidentVisitors /></RequireAuth>} />
      <Route path="/resident/visitors/:id" element={<RequireAuth roles={['resident']}><ResidentVisitorDetail /></RequireAuth>} />
      <Route path="/resident/marketplace" element={<RequireAuth roles={['resident']}><Marketplace /></RequireAuth>} />
      <Route path="/resident/chat" element={<RequireAuth roles={['resident']}><Chat /></RequireAuth>} />
      <Route path="/resident/alerts" element={<RequireAuth roles={['resident']}><AlertPage /></RequireAuth>} />

      {/* ── SECURITY ── */}
      <Route path="/security/dashboard" element={<RequireAuth roles={['security']}><SecurityDashboard /></RequireAuth>} />
      <Route path="/security/log" element={<RequireAuth roles={['security']}><SecurityLog /></RequireAuth>} />
      <Route path="/security/alerts" element={<RequireAuth roles={['security']}><SecurityAlerts /></RequireAuth>} />

      {/* Root redirect */}
      <Route path="/" element={user ? <Navigate to={ROLE_HOME[user.role] || '/login'} replace /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
