import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSocket } from './SocketContext';
import toast from 'react-hot-toast';

const NotificationContext = createContext(null);

const STORAGE_KEY = 'ac_manager_notifications';
const MAX_STORED = 50;

const TYPE_CONFIG = {
  payment_received: { icon: '💰', label: 'Payment',     color: '#10B981' },
  new_resident:     { icon: '👤', label: 'Resident',    color: '#6366F1' },
  visitor_checkin:  { icon: '🚪', label: 'Visitor In',  color: '#0EA5E9' },
  visitor_checkout: { icon: '🚪', label: 'Visitor Out', color: '#F59E0B' },
  new_alert:        { icon: '🚨', label: 'Alert',       color: '#EF4444' },
  new_announcement: { icon: '📢', label: 'Announcement',color: '#8B5CF6' },
};

function loadStored() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

export function NotificationProvider({ children }) {
  const { subscribe } = useSocket();
  const [notifications, setNotifications] = useState(loadStored);
  const [unreadCount, setUnreadCount] = useState(() => loadStored().filter(n => !n.readAt).length);

  const addNotification = useCallback((notif) => {
    const entry = { ...notif, createdAt: notif.createdAt || new Date().toISOString() };

    setNotifications(prev => {
      const updated = [entry, ...prev].slice(0, MAX_STORED);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setUnreadCount(n => n + 1);

    const cfg = TYPE_CONFIG[notif.type] || { icon: '🔔' };
    toast(
      (t) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{cfg.icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>{notif.title}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{notif.body}</div>
          </div>
        </div>
      ),
      { duration: 5000 }
    );
  }, []);

  useEffect(() => {
    const unsubs = [
      subscribe('notification', (notif) => addNotification(notif)),

      subscribe('visitor_update', (visitor) => {
        const checkedOut = !!(visitor.checkOutTime);
        addNotification({
          id: visitor._id || String(Date.now()),
          type: checkedOut ? 'visitor_checkout' : 'visitor_checkin',
          title: checkedOut ? 'Visitor Checked Out' : 'Visitor Checked In',
          body: `${visitor.name || 'A visitor'} — ${visitor.hostName || ''}`.trim().replace(/—\s*$/, ''),
          meta: { visitorId: visitor._id },
        });
      }),

      subscribe('new_alert', (alert) => {
        addNotification({
          id: alert._id || String(Date.now()),
          type: 'new_alert',
          title: 'Security Alert',
          body: alert.message || alert.title || 'New alert raised',
          meta: { alertId: alert._id },
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
      const updated = prev.map(n => (n.readAt ? n : { ...n, readAt: ts }));
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

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, clearAll, TYPE_CONFIG }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
