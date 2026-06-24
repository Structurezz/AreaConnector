import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  Siren, UserCheck, UserMinus, Megaphone, Banknote, Clock,
  AlertCircle, UserPlus, Bell, BellRing, Scale, Users, ShoppingBag,
} from 'lucide-react';
import { useSocket } from './SocketContext';
import toast from 'react-hot-toast';

const NotificationContext = createContext(null);

const STORAGE_KEY = 'ac_manager_notifications';
const MAX_STORED = 50;

export const TYPE_CONFIG = {
  // ── Security Alerts ──────────────────────────────────────
  new_alert:           { Icon: Siren,       label: 'Alert',         color: '#EF4444', isAlert: true  },
  alert_broadcast:     { Icon: Siren,       label: 'Broadcast',     color: '#EF4444', isAlert: true  },

  // ── Normal Notifications ─────────────────────────────────
  payment_received:    { Icon: Banknote,    label: 'Payment',       color: '#10B981', isAlert: false },
  payment_due:         { Icon: Clock,       label: 'Payment Due',   color: '#F59E0B', isAlert: false },
  payment_overdue:     { Icon: AlertCircle, label: 'Overdue',       color: '#EF4444', isAlert: false },
  new_resident:        { Icon: UserPlus,    label: 'Resident',      color: '#6366F1', isAlert: false },
  visitor_checkin:     { Icon: UserCheck,   label: 'Visitor In',    color: '#0EA5E9', isAlert: false },
  visitor_checkout:    { Icon: UserMinus,   label: 'Visitor Out',   color: '#F59E0B', isAlert: false },
  new_announcement:    { Icon: Megaphone,   label: 'Announcement',  color: '#8B5CF6', isAlert: false },
  plan_expiry_warning: { Icon: Bell,        label: 'Subscription',  color: '#D97706', isAlert: false },
  plan_expiry_urgent:  { Icon: BellRing,    label: 'Plan Expiring', color: '#EF4444', isAlert: false },
  court_update:        { Icon: Scale,       label: 'Courtroom',     color: '#D97706', isAlert: false },
  jury_summoned:       { Icon: Users,       label: 'Jury Duty',     color: '#7C3AED', isAlert: false },
  marketplace_item:    { Icon: ShoppingBag, label: 'Marketplace',   color: '#10B981', isAlert: false },
};

const DEFAULT_CFG = { Icon: Bell, label: 'Notification', color: '#10B981', isAlert: false };

const SIREN_URL = 'https://areaconnectapi-production.up.railway.app/public/engyclick-police-siren-sound-effect-317645.mp3';

let _sirenAudio = null;
let _sirenTimer = null;

function playSiren(durationMs = 60000) {
  try {
    if (_sirenAudio) { _sirenAudio.pause(); _sirenAudio.currentTime = 0; }
    clearTimeout(_sirenTimer);
    _sirenAudio = new Audio(SIREN_URL);
    _sirenAudio.play().catch(() => {});
    _sirenTimer = setTimeout(() => stopSiren(), durationMs);
  } catch (_) {}
}

function stopSiren() {
  try {
    clearTimeout(_sirenTimer);
    if (_sirenAudio) { _sirenAudio.pause(); _sirenAudio.currentTime = 0; _sirenAudio = null; }
  } catch (_) {}
}

function loadStored() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

export function NotificationProvider({ children }) {
  const { subscribe } = useSocket();
  const [notifications, setNotifications] = useState(loadStored);
  const [unreadCount, setUnreadCount] = useState(() => loadStored().filter(n => !n.readAt).length);
  const [activeAlert, setActiveAlert] = useState(null);

  const dismissAlert = useCallback(() => {
    stopSiren();
    setActiveAlert(null);
  }, []);

  const addNotification = useCallback((notif) => {
    const entry = { ...notif, id: notif.id || String(Date.now()), createdAt: notif.createdAt || new Date().toISOString() };
    const cfg = TYPE_CONFIG[entry.type] || DEFAULT_CFG;
    const Icon = cfg.Icon;

    setNotifications(prev => {
      const updated = [entry, ...prev].slice(0, MAX_STORED);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setUnreadCount(n => n + 1);

    if (cfg.isAlert) {
      playSiren(60000);
      setActiveAlert(entry);
      return;
    }

    toast(
      () => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: cfg.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={15} color={cfg.color} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>{entry.title}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{entry.body}</div>
          </div>
        </div>
      ),
      { duration: 5000 }
    );
  }, []);

  useEffect(() => {
    const handlePlanExpiry = (e) => {
      addNotification({ id: `plan-expiry-${Date.now()}`, ...e.detail });
    };
    window.addEventListener('plan:expiry', handlePlanExpiry);
    return () => window.removeEventListener('plan:expiry', handlePlanExpiry);
  }, [addNotification]);

  useEffect(() => {
    const unsubs = [
      subscribe('notification', (n) => addNotification(n)),

      subscribe('visitor_update', (visitor) => {
        const out = !!visitor.checkOutTime;
        addNotification({
          id: visitor._id || String(Date.now()),
          type: out ? 'visitor_checkout' : 'visitor_checkin',
          title: out ? 'Visitor Checked Out' : 'Visitor Checked In',
          body: `${visitor.name || 'A visitor'} — ${visitor.hostName || ''}`.trim().replace(/—\s*$/, ''),
          meta: { visitorId: visitor._id },
        });
      }),

      subscribe('new_alert', (alert) => {
        const isBroadcast = !!alert.isEmergencyBroadcast;
        const role = alert.raisedByRole || alert.residentId?.role || 'resident';
        const name = alert.residentId?.name;
        const phone = alert.residentId?.phone;
        const unit = alert.unitId
          ? `${alert.unitId.block ? `Block ${alert.unitId.block} · ` : ''}Unit ${alert.unitId.unitNumber}`
          : null;
        addNotification({
          id: alert._id || String(Date.now()),
          type: isBroadcast ? 'alert_broadcast' : 'new_alert',
          title: alert.title || (isBroadcast ? 'Estate Broadcast' : 'Security Alert'),
          body: alert.note || alert.message || 'New alert raised in your estate',
          meta: { alertId: alert._id, raisedByRole: role, raisedByName: name, raisedByPhone: phone, raisedByUnit: unit },
        });
      }),

      subscribe('new_announcement', (ann) => {
        addNotification({
          id: ann._id || String(Date.now()),
          type: 'new_announcement',
          title: 'New Announcement',
          body: ann.title || ann.message || 'A new announcement was posted',
          meta: { announcementId: ann._id },
        });
      }),
    ];
    return () => unsubs.forEach(fn => fn?.());
  }, [subscribe, addNotification]);

  const markAllRead = useCallback(() => {
    const ts = new Date().toISOString();
    setNotifications(prev => {
      const updated = prev.map(n => n.readAt ? n : { ...n, readAt: ts });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setUnreadCount(0);
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const alertCount = notifications.filter(n => !n.readAt && TYPE_CONFIG[n.type]?.isAlert).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, alertCount, activeAlert, dismissAlert, markAllRead, clearAll, stopSiren, TYPE_CONFIG }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
