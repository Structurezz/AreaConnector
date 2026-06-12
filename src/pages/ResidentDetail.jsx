import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { residentAPI, unitAPI } from '../api';
import Spinner from '../components/ui/Spinner';
import {
  Users, ChevronLeft, UserX, UserCheck,
  Phone, Mail, Calendar, Home,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function ResidentDetail() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [resident, setResident] = useState(state?.resident || null);
  const [units, setUnits] = useState(state?.units || []);
  const [loading, setLoading] = useState(!state?.resident);
  const [acting, setActing] = useState(false);
  const [assignUnitId, setAssignUnitId] = useState('');
  const [savingUnit, setSavingUnit] = useState(false);

  useEffect(() => {
    const fetches = [];
    if (!resident) {
      fetches.push(
        residentAPI.getOne(id)
          .then(({ data }) => setResident(data.data))
          .catch(() => { toast.error('Resident not found'); navigate('/residents'); })
      );
    }
    if (!units.length) {
      fetches.push(
        unitAPI.getAll()
          .then(({ data }) => setUnits(data.data))
          .catch(() => {})
      );
    }
    if (fetches.length) {
      Promise.all(fetches).finally(() => setLoading(false));
    }
  }, [id]);

  useEffect(() => {
    if (resident) {
      const cur = resident.unitId?._id || (typeof resident.unitId === 'string' ? resident.unitId : '');
      setAssignUnitId(cur);
    }
  }, [resident]);

  const handleToggle = async () => {
    setActing(true);
    try {
      if (resident.isActive) {
        await residentAPI.suspend(resident._id);
        toast.success('Resident suspended');
        setResident(r => ({ ...r, isActive: false }));
      } else {
        await residentAPI.activate(resident._id);
        toast.success('Resident activated');
        setResident(r => ({ ...r, isActive: true }));
      }
    } catch {
      toast.error('Action failed');
    } finally {
      setActing(false);
    }
  };

  const handleAssign = async () => {
    setSavingUnit(true);
    try {
      await residentAPI.assignUnit(resident._id, assignUnitId || null);
      toast.success(assignUnitId ? 'Apartment assigned' : 'Removed from apartment');
      // refresh unit display
      const newUnit = units.find(u => u._id === assignUnitId) || null;
      setResident(r => ({ ...r, unitId: newUnit }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign');
    } finally {
      setSavingUnit(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner />
    </div>
  );

  if (!resident) return null;

  const unitDisplay = resident.unitId
    ? (resident.unitId.block
        ? `Block ${resident.unitId.block} · Apt ${resident.unitId.unitNumber}`
        : `Apt ${resident.unitId.unitNumber}`)
    : null;

  return (
    <div className="animate-fade-in max-w-lg mx-auto">

      {/* Back header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/residents')}
          className="p-2 rounded-xl transition-colors"
          style={{ color: '#64748B' }}
          onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-slate-900" style={{ letterSpacing: '-0.03em' }}>
          Resident Details
        </h1>
      </div>

      {/* Avatar card */}
      <div className="glass-card p-6 mb-4">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#34D399', border: '2px solid rgba(16,185,129,0.2)' }}>
            {resident.name[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold text-slate-900 leading-tight">{resident.name}</div>
            <div className="text-sm text-slate-500 mt-1">{resident.email}</div>
            {resident.phone && <div className="text-sm text-slate-400 mt-0.5">{resident.phone}</div>}
            <div className="mt-2 inline-flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full"
                style={{ background: resident.isActive ? '#10B981' : '#94A3B8' }} />
              <span className="text-xs font-semibold"
                style={{ color: resident.isActive ? '#10B981' : '#94A3B8' }}>
                {resident.isActive ? 'Active' : 'Suspended'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info rows */}
      <div className="glass-card overflow-hidden mb-4">
        {[
          { label: 'Role',       value: 'Resident',                                                         icon: Users    },
          { label: 'Email',      value: resident.email,                                                     icon: Mail     },
          resident.phone && { label: 'Phone', value: resident.phone,                                        icon: Phone    },
          unitDisplay && { label: 'Apartment', value: unitDisplay,                                          icon: Home     },
          resident.createdAt && { label: 'Member since', value: format(new Date(resident.createdAt), 'MMMM d, yyyy'), icon: Calendar },
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

      {/* Assign apartment */}
      {units.length > 0 && (
        <div className="glass-card p-4 mb-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Assign Apartment</div>
          <select className="input-field text-sm" value={assignUnitId}
            onChange={e => setAssignUnitId(e.target.value)}>
            <option value="">— No apartment —</option>
            {units.map(u => {
              const cnt = (u.residentIds || []).length;
              const mx = u.maxOccupants || 7;
              const isCurrent = (resident.unitId?._id || resident.unitId) === u._id;
              const full = cnt >= mx && !isCurrent;
              const label = u.block ? `Block ${u.block} · Apt ${u.unitNumber}` : `Apt ${u.unitNumber}`;
              return (
                <option key={u._id} value={u._id} disabled={full}>
                  {label} — {cnt}/{mx}{full ? ' (full)' : ''}
                </option>
              );
            })}
          </select>
          <button onClick={handleAssign} disabled={savingUnit}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: 'rgba(16,185,129,0.1)',
              color: '#10B981',
              border: '1px solid rgba(16,185,129,0.2)',
            }}>
            {savingUnit ? 'Saving…' : assignUnitId ? 'Save Assignment' : 'Remove from Apartment'}
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <button onClick={handleToggle} disabled={acting}
          className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
          style={{
            background: resident.isActive ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
            color: resident.isActive ? '#EF4444' : '#10B981',
            border: `1px solid ${resident.isActive ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
          }}>
          {resident.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
          {acting ? 'Saving…' : resident.isActive ? 'Suspend Resident' : 'Activate Resident'}
        </button>
      </div>
    </div>
  );
}
