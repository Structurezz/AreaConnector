import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { guardAPI } from '../api';
import Spinner from '../components/ui/Spinner';
import {
  Shield, ChevronLeft, UserX, UserCheck, Trash2,
  Phone, Mail, Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function GuardDetail() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [guard, setGuard] = useState(state?.guard || null);
  const [loading, setLoading] = useState(!state?.guard);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!guard) {
      guardAPI.getOne(id)
        .then(({ data }) => setGuard(data.data))
        .catch(() => { toast.error('Guard not found'); navigate('/guards'); })
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleToggle = async () => {
    setActing(true);
    try {
      if (guard.isActive) {
        await guardAPI.suspend(guard._id);
        toast.success('Guard suspended');
        setGuard(g => ({ ...g, isActive: false }));
      } else {
        await guardAPI.activate(guard._id);
        toast.success('Guard activated');
        setGuard(g => ({ ...g, isActive: true }));
      }
    } catch {
      toast.error('Action failed');
    } finally {
      setActing(false);
    }
  };

  const handleRemove = async () => {
    setActing(true);
    try {
      await guardAPI.remove(guard._id);
      toast.success(`${guard.name} removed`);
      navigate('/guards');
    } catch {
      toast.error('Failed to remove guard');
      setActing(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner />
    </div>
  );

  if (!guard) return null;

  return (
    <div className="animate-fade-in max-w-lg mx-auto">

      {/* Back header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/guards')}
          className="p-2 rounded-xl transition-colors"
          style={{ color: '#64748B' }}
          onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-slate-900" style={{ letterSpacing: '-0.03em' }}>
          Guard Details
        </h1>
      </div>

      {/* Avatar card */}
      <div className="glass-card p-6 mb-4">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black flex-shrink-0"
            style={{ background: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: '2px solid rgba(59,130,246,0.2)' }}>
            {guard.name[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold text-slate-900 leading-tight">{guard.name}</div>
            <div className="text-sm text-slate-500 mt-1">{guard.email}</div>
            {guard.phone && <div className="text-sm text-slate-400 mt-0.5">{guard.phone}</div>}
            <div className="mt-2 inline-flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full"
                style={{ background: guard.isActive ? '#10B981' : '#94A3B8' }} />
              <span className="text-xs font-semibold"
                style={{ color: guard.isActive ? '#10B981' : '#94A3B8' }}>
                {guard.isActive ? 'Active' : 'Suspended'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info rows */}
      <div className="glass-card overflow-hidden mb-4">
        {[
          { label: 'Role',      value: 'Security Guard',                              icon: Shield   },
          { label: 'Email',     value: guard.email,                                   icon: Mail     },
          guard.phone && { label: 'Phone', value: guard.phone,                        icon: Phone    },
          guard.createdAt && { label: 'Onboarded', value: format(new Date(guard.createdAt), 'MMMM d, yyyy'), icon: Calendar },
        ].filter(Boolean).map((row, i) => (
          <div key={row.label}
            className="flex items-center justify-between px-5 py-3.5"
            style={{ borderTop: i > 0 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
            <div className="flex items-center gap-2.5">
              <row.icon size={14} style={{ color: '#94A3B8', flexShrink: 0 }} />
              <span className="text-sm font-medium text-slate-500">{row.label}</span>
            </div>
            <span className="text-sm font-semibold text-slate-800 text-right truncate max-w-[55%]">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Guard app info */}
      <div className="rounded-xl px-4 py-3 mb-6 flex items-start gap-3"
        style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
        <Shield size={15} style={{ color: '#60A5FA', flexShrink: 0, marginTop: 1 }} />
        <p className="text-xs leading-relaxed" style={{ color: '#93C5FD' }}>
          This guard should log in to the <strong>AreaConnect Guard</strong> app using the credentials sent to their email address.
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button onClick={handleToggle} disabled={acting}
          className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
          style={{
            background: guard.isActive ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
            color: guard.isActive ? '#EF4444' : '#10B981',
            border: `1px solid ${guard.isActive ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
          }}>
          {guard.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
          {acting ? 'Saving…' : guard.isActive ? 'Suspend Guard' : 'Activate Guard'}
        </button>

        {!confirmRemove ? (
          <button onClick={() => setConfirmRemove(true)}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
            style={{ background: 'transparent', color: '#94A3B8', border: '1px solid rgba(0,0,0,0.08)' }}>
            <Trash2 size={14} /> Remove Guard
          </button>
        ) : (
          <div className="rounded-xl p-4 space-y-3"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-sm text-center font-medium" style={{ color: '#EF4444' }}>
              Remove {guard.name}? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRemove(false)} disabled={acting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(0,0,0,0.06)', color: '#64748B' }}>
                Cancel
              </button>
              <button onClick={handleRemove} disabled={acting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: '#EF4444', color: 'white' }}>
                {acting ? 'Removing…' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
