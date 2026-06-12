import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, X, CheckCheck, Trash2 } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead, clearAll, TYPE_CONFIG } = useNotifications();
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 58, right: 12 });
  const buttonRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = useCallback(() => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const panelWidth = Math.min(340, window.innerWidth - 24);
      let left = rect.left;
      if (left + panelWidth > window.innerWidth - 12) {
        left = window.innerWidth - panelWidth - 12;
      }
      setPanelPos({ top: rect.bottom + 8, left });
    }
    setOpen(o => !o);
  }, [open]);

  const handleMarkRead = (e) => {
    e.stopPropagation();
    markAllRead();
  };

  return (
    <div ref={wrapperRef}>
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={handleOpen}
        style={{
          position: 'relative',
          width: 36,
          height: 36,
          borderRadius: 10,
          border: 'none',
          background: open ? '#F1F5F9' : 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748B',
          transition: 'background 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = '#F1F5F9'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: 4,
            right: 4,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            background: '#EF4444',
            color: '#fff',
            fontSize: 9,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            border: '1.5px solid #fff',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel — rendered via portal-like fixed positioning anchored to button */}
      {open && (
        <div style={{
          position: 'fixed',
          top: panelPos.top,
          left: panelPos.left,
          width: Math.min(340, window.innerWidth - 24),
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 16px 48px rgba(15,23,42,0.18)',
          border: '1px solid #E2E8F0',
          zIndex: 1000,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid #F1F5F9',
          }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>
              Notifications {unreadCount > 0 && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#EF4444',
                  color: '#fff',
                  borderRadius: 99,
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '1px 6px',
                  marginLeft: 6,
                }}>
                  {unreadCount}
                </span>
              )}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkRead}
                  title="Mark all read"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 8, color: '#10B981', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}
                >
                  <CheckCheck size={14} /> Mark read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); clearAll(); }}
                  title="Clear all"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 8, color: '#94A3B8', display: 'flex', alignItems: 'center' }}
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 8, color: '#94A3B8', display: 'flex', alignItems: 'center' }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <Bell size={28} style={{ color: '#CBD5E1', margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500 }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const cfg = TYPE_CONFIG?.[n.type] || { icon: '🔔', color: '#94A3B8' };
                return (
                  <div key={n.id + n.createdAt} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '12px 16px',
                    borderBottom: '1px solid #F8FAFC',
                    background: n.readAt ? 'transparent' : '#F0FDF9',
                    transition: 'background 0.2s',
                  }}>
                    <div style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: cfg.color + '18',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      flexShrink: 0,
                    }}>
                      {cfg.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>{n.title}</span>
                        {!n.readAt && (
                          <span style={{ width: 7, height: 7, borderRadius: 99, background: '#10B981', flexShrink: 0 }} />
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 4px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.body}
                      </p>
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>{timeAgo(n.createdAt)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
