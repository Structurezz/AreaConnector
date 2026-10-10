import { useEffect, useState } from 'react';
import { KeyRound, Check, X, RefreshCw, Users, Shield, Phone, Mail, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { authAPI } from '../api';
import { useSocket } from '../context/SocketContext';

const STATUS_STYLE = {
  pending:  { label: 'Pending',   bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  approved: { label: 'Approved',  bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' },
  denied:   { label: 'Denied',    bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
  expired:  { label: 'Expired',   bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

function RequestCard({ req, onApprove, onDeny, busyId }) {
  const Icon = req.requesterRole === 'security' ? Shield : Users;
  const roleLabel = req.requesterRole === 'security' ? 'Security officer' : 'Resident';
  const busy = busyId === req._id;
  return (
    <div className="glass-card p-4" style={{ border: '1px solid #E2E8F0' }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
             style={{ background: 'rgba(99,102,241,0.1)', color: '#4F46E5' }}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="font-bold text-sm truncate" style={{ color: '#0F172A' }}>
                {req.requesterName || req.userId?.name || 'Unknown user'}
              </div>
              <div className="text-[11px] flex items-center gap-1" style={{ color: '#64748B' }}>
                <Clock size={10} />
                {formatDistanceToNow(new Date(req.requestedAt), { addSuffix: true })}
                {' · '}
                {roleLabel}
                {req.requesterUnit && <> · {req.requesterUnit}</>}
              </div>
            </div>
            <StatusBadge status={req.status} />
          </div>

          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ color: '#475569' }}>
            {req.requesterEmail && (
              <div className="flex items-center gap-1.5 truncate">
                <Mail size={11} style={{ color: '#94A3B8' }}/> {req.requesterEmail}
              </div>
            )}
            {req.requesterPhone && (
              <div className="flex items-center gap-1.5">
                <Phone size={11} style={{ color: '#94A3B8' }}/> {req.requesterPhone}
              </div>
            )}
          </div>

          {req.status === 'pending' ? (
            <div className="flex gap-2 mt-3 flex-wrap">
              <button
                onClick={() => onApprove(req)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-lg text-white"
                style={{ background: 'linear-gradient(135deg,#10B981,#059669)', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' }}
              >
                {busy ? <RefreshCw size={13} className="animate-spin"/> : <Check size={13}/>}
                Approve & email temp password
              </button>
              <button
                onClick={() => onDeny(req)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-lg"
                style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}
              >
                <X size={13}/> Deny
              </button>
            </div>
          ) : (
            <div className="text-[11px] mt-2 flex items-center gap-1" style={{ color: '#94A3B8' }}>
              Reviewed {req.reviewedAt ? formatDistanceToNow(new Date(req.reviewedAt), { addSuffix: true }) : ''}
              {req.reviewedBy?.name ? ` by ${req.reviewedBy.name}` : ''}
              {req.denyReason ? ` · "${req.denyReason}"` : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PasswordRequests() {
  const { subscribe } = useSocket() || {};
  const [status, setStatus] = useState('pending');
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await authAPI.listPasswordResets({ status });
      setItems(data.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load reset requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [status]);

  // Live update when new requests come in
  useEffect(() => {
    if (!subscribe) return;
    const u = subscribe('notification', (n) => {
      if (n?.type === 'password_reset_request' && status === 'pending') load(true);
    });
    return () => { u && u(); };
  }, [subscribe, status]);

  const handleApprove = async (req) => {
    if (!window.confirm(`Approve password reset for ${req.requesterName}?\n\nA temporary password will be emailed to ${req.requesterEmail}. They will be forced to change it on first sign-in.`)) return;
    setBusyId(req._id);
    try {
      await authAPI.approvePasswordReset(req._id);
      toast.success('Approved — temporary password sent');
      load(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to approve');
    } finally { setBusyId(null); }
  };

  const handleDeny = async (req) => {
    const reason = window.prompt(`Deny the password reset for ${req.requesterName}?\n\nOptional reason (shown in logs):`, '');
    if (reason === null) return;
    setBusyId(req._id);
    try {
      await authAPI.denyPasswordReset(req._id, { reason });
      toast.success('Request denied');
      load(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to deny');
    } finally { setBusyId(null); }
  };

  const pendingCount = items.filter(r => r.status === 'pending').length;

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)', boxShadow: '0 6px 16px rgba(99,102,241,0.3)' }}>
            <KeyRound size={20} className="text-white"/>
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Password reset requests</h1>
            <p className="text-sm" style={{ color: '#64748B' }}>
              Approve to email the person a temporary password. Deny if the request looks suspicious.
            </p>
          </div>
        </div>
        <button onClick={() => load()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
          style={{ background: '#F1F5F9', color: '#0F172A' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/> Refresh
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {['pending', 'approved', 'denied', 'all'].map(k => {
          const isActive = status === k;
          const count = k === 'pending' && !isActive ? pendingCount : null;
          return (
            <button key={k} onClick={() => setStatus(k)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all"
              style={isActive
                ? { background: '#0F172A', color: '#fff', border: 'none' }
                : { background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>
              {k}{count ? <span className="ml-1" style={{ color: '#DC2626' }}>· {count}</span> : null}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={22} className="animate-spin" style={{ color: '#6366F1' }}/>
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card p-10 text-center" style={{ border: '1px dashed #CBD5E1' }}>
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
               style={{ background: 'rgba(99,102,241,0.1)', color: '#4F46E5' }}>
            <KeyRound size={22}/>
          </div>
          <div className="font-bold text-sm" style={{ color: '#0F172A' }}>
            No {status === 'all' ? '' : status} requests
          </div>
          <div className="text-xs mt-1" style={{ color: '#64748B' }}>
            When a resident or security officer asks to reset their password, you'll see it here.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(req => (
            <RequestCard key={req._id} req={req} busyId={busyId}
              onApprove={handleApprove} onDeny={handleDeny} />
          ))}
        </div>
      )}
    </div>
  );
}
