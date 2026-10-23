import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { estateAPI, visitorAPI, alertAPI, announcementAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import DesktopDashboard from '../components/dashboard/DesktopDashboard';
import MobileDashboard from '../components/dashboard/MobileDashboard';
import useIsDesktop from '../hooks/useIsDesktop';

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [stats, setStats]             = useState(null);
  const [recentVisitors, setRecentVisitors] = useState([]);
  const [openAlerts, setOpenAlerts]   = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [estate, setEstate]           = useState(null);
  const [loading, setLoading]         = useState(true);
  const isDesktop = useIsDesktop();

  const estateId = user?.estateId?._id || user?.estateId;

  useEffect(() => {
    const calls = [
      estateAPI.getStats(),
      visitorAPI.getAll({ limit: 6 }),
      alertAPI.getAll({ status: 'open', limit: 4 }),
      announcementAPI.getAll({ limit: 3 }),
    ];
    if (estateId) calls.push(estateAPI.getOne(estateId));

    // allSettled: team members without e.g. Security access get a 403 for that
    // section only — the rest of the dashboard still loads.
    Promise.allSettled(calls).then((results) => {
      const [s, v, a, n, e] = results.map(r => (r.status === 'fulfilled' ? r.value.data.data : undefined));
      if (s) setStats(s);
      setRecentVisitors(v || []);
      setOpenAlerts(a || []);
      setAnnouncements(n || []);
      if (e) setEstate(e);
    }).finally(() => setLoading(false));
  }, [estateId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>
  );

  const estateName = user?.estateId && typeof user.estateId === 'object'
    ? user.estateId.name
    : 'Your Estate';
  const firstName = user?.name?.split(' ')[0] || 'Manager';

  if (isDesktop) return (
    <DesktopDashboard
      user={user}
      stats={stats}
      recentVisitors={recentVisitors}
      openAlerts={openAlerts}
      announcements={announcements}
      estate={estate}
      estateName={estateName}
      firstName={firstName}
    />
  );

  return (
    <MobileDashboard
      user={user}
      stats={stats}
      recentVisitors={recentVisitors}
      openAlerts={openAlerts}
      announcements={announcements}
      estate={estate}
      estateName={estateName}
      firstName={firstName}
    />
  );
}
