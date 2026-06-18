import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CreditCard, RefreshCw } from 'lucide-react';

const MESSAGES = {
  suspended: {
    title: 'Account Suspended',
    body: 'Your subscription has been suspended. This is usually due to a missed payment. Renew your plan to restore full access to your estate.',
    color: '#EF4444',
    bg: '#FEF2F2',
    border: '#FECACA',
  },
  expired: {
    title: 'Subscription Expired',
    body: 'Your subscription plan has expired. Upgrade or renew to continue managing your estate and serving your residents.',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
  cancelled: {
    title: 'Subscription Cancelled',
    body: 'Your subscription has been cancelled. Choose a plan to reactivate your estate.',
    color: '#6B7280',
    bg: '#F9FAFB',
    border: '#E5E7EB',
  },
};

export default function SubscriptionWall({ status }) {
  const navigate = useNavigate();
  const meta = MESSAGES[status] || MESSAGES.suspended;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F8FAFC', padding: 24,
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: 20, padding: '40px 36px',
        maxWidth: 440, width: '100%', textAlign: 'center',
        boxShadow: '0 8px 32px rgba(15,23,42,0.1)',
        border: `1px solid ${meta.border}`,
      }}>
        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 20, margin: '0 auto 20px',
          background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertTriangle size={28} style={{ color: meta.color }} />
        </div>

        {/* Status badge */}
        <span style={{
          display: 'inline-block', fontSize: 11, fontWeight: 700,
          color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`,
          padding: '3px 10px', borderRadius: 20, letterSpacing: '0.06em',
          textTransform: 'uppercase', marginBottom: 12,
        }}>
          {status}
        </span>

        <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
          {meta.title}
        </h2>
        <p style={{ margin: '0 0 28px', fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
          {meta.body}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => navigate('/upgrade')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            <CreditCard size={16} /> View Plans &amp; Renew
          </button>

          <button
            onClick={() => window.location.reload()}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '12px 0', borderRadius: 12,
              border: '1.5px solid #E2E8F0', background: 'transparent',
              color: '#64748B', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <p style={{ marginTop: 20, fontSize: 12, color: '#94A3B8' }}>
          Need help? Contact support.
        </p>
      </div>
    </div>
  );
}
