import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { residentAPI, unitAPI } from '../api';
import Spinner from '../components/ui/Spinner';
import {
  Users, ChevronLeft, ChevronRight, UserX, UserCheck,
  Phone, Mail, Calendar, Home, DoorOpen, MessageSquare,
} from 'lucide-react';
import useCountUp from '../hooks/useCountUp';
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
    <div className="max-w-lg mx-auto space-y-4">
      <div className="skeleton h-4 w-24 rounded" />
      <div className="flex flex-col items-center gap-3 pt-2">
        <div className="skeleton w-24 h-24 rounded-full" />
        <div className="skeleton h-4 w-40 rounded" /><div className="skeleton h-3 w-28 rounded" />
      </div>
      <div className="grid grid-cols-3 gap-2.5">{[0, 1, 2].map(k => <div key={k} className="skeleton h-20 rounded-2xl" />)}</div>
      <div className="skeleton h-40 rounded-[22px]" />
    </div>
  );

  if (!resident) return null;

  const r = resident;
  const unitDisplay = r.unitId
    ? (r.unitId.block ? `Block ${r.unitId.block} · Apt ${r.unitId.unitNumber}` : `Apt ${r.unitId.unitNumber}`)
    : null;
  const curUnit = units.find(u => u._id === (r.unitId?._id || r.unitId));
  const housemates = curUnit ? Math.max(0, (curUnit.residentIds || []).length - 1) : 0;
  const spaceLeft = curUnit ? Math.max(0, (curUnit.maxOccupants || 7) - (curUnit.residentIds || []).length) : 0;
  const daysIn = r.createdAt ? Math.max(0, Math.floor((Date.now() - new Date(r.createdAt)) / 86_400_000)) : 0;
  const hue = (r.name.charCodeAt(0) * 37) % 360;
  const initials = r.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const changed = (r.unitId?._id || r.unitId || '') !== assignUnitId;

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-4">
      <button onClick={() => navigate('/residents')}
        className="dash-rise inline-flex items-center gap-1 text-[13px] font-medium text-slate-500">
        <ChevronLeft size={16} /> Residents
      </button>

      {/* Profile */}
      <section className="dash-rise flex flex-col items-center text-center" style={{ animationDelay: '40ms' }}>
        <div className="relative">
          <span className="absolute -inset-[4px] rounded-full"
            style={{ background: r.isActive ? 'conic-gradient(from 200deg, #34D399, #10B981, #0EA5E9, #34D399)' : 'linear-gradient(135deg, #FCA5A5, #EF4444)' }} />
          {r.profilePhoto
            ? <img src={r.profilePhoto} alt="" className="relative w-24 h-24 rounded-full object-cover border-[3px] border-white" />
            : <span className="relative w-24 h-24 rounded-full flex items-center justify-center text-[28px] font-semibold text-white border-[3px] border-white"
                style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 62%), hsl(${(hue + 40) % 360} 70% 46%))` }}>{initials}</span>}
          <span className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-[3px] border-white ${r.isActive ? 'bg-emerald-400' : 'bg-red-500'}`} />
        </div>
        <h1 className="mt-3 text-[22px] font-semibold text-slate-900 leading-tight" style={{ letterSpacing: '-0.03em' }}>{r.name}</h1>
        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap justify-center">
          {unitDisplay
            ? <span className="inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700"><Home size={12} /> {unitDisplay}</span>
            : <span className="text-[12px] italic text-slate-400">No apartment</span>}
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${r.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${r.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />{r.isActive ? 'Active' : 'Suspended'}
          </span>
        </div>
        {r.createdAt && <div className="mt-1.5 text-[12px] text-slate-400">Joined {format(new Date(r.createdAt), 'd MMMM yyyy')}</div>}
      </section>

      {/* Quick actions */}
      <section className="dash-rise flex justify-center gap-5" style={{ animationDelay: '100ms' }}>
        {[
          r.phone && { label: 'Call', Icon: Phone, color: '#10B981', href: `tel:${r.phone}` },
          r.phone && { label: 'SMS', Icon: MessageSquare, color: '#0EA5E9', href: `sms:${r.phone}` },
          { label: 'Email', Icon: Mail, color: '#6366F1', href: `mailto:${r.email}` },
          { label: r.isActive ? 'Suspend' : 'Activate', Icon: r.isActive ? UserX : UserCheck, color: r.isActive ? '#EF4444' : '#10B981', onClick: handleToggle },
        ].filter(Boolean).map(({ label, Icon, color, href, onClick }) => {
          const inner = (
            <>
              <span className="w-14 h-14 rounded-full flex items-center justify-center border transition-transform active:scale-90"
                style={{ background: `linear-gradient(145deg, ${color}1F, ${color}0A)`, borderColor: `${color}33` }}>
                {label === 'Suspend' || label === 'Activate'
                  ? (acting ? <Spinner size={16} /> : <Icon size={19} style={{ color }} />)
                  : <Icon size={19} style={{ color }} />}
              </span>
              <span className="text-[11px] font-medium text-slate-600">{label}</span>
            </>
          );
          return href
            ? <a key={label} href={href} className="flex flex-col items-center gap-1.5" style={{ textDecoration: 'none' }}>{inner}</a>
            : <button key={label} onClick={onClick} disabled={acting} className="flex flex-col items-center gap-1.5">{inner}</button>;
        })}
      </section>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-2.5">
        <StatTile i={0} label="Days here" value={daysIn} Icon={Calendar} color="#10B981" />
        <StatTile i={1} label="Housemates" value={housemates} Icon={Users} color="#6366F1" />
        <StatTile i={2} label="Space left" value={spaceLeft} Icon={DoorOpen} color="#F59E0B" />
      </section>

      {/* Contact */}
      <section className="dash-rise rounded-[22px] bg-white border border-slate-200/70 overflow-hidden" style={{ animationDelay: '260ms' }}>
        <div className="px-4 pt-3.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Contact</div>
        {[
          { label: 'Email', value: r.email, Icon: Mail, href: `mailto:${r.email}` },
          r.phone && { label: 'Phone', value: r.phone, Icon: Phone, href: `tel:${r.phone}` },
          { label: 'Role', value: 'Resident', Icon: Users },
          r.createdAt && { label: 'Member since', value: format(new Date(r.createdAt), 'MMMM d, yyyy'), Icon: Calendar },
        ].filter(Boolean).map((row) => {
          const body = (
            <>
              <span className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0"><row.Icon size={15} className="text-slate-500" /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-[11px] text-slate-400">{row.label}</span>
                <span className="block text-[14px] font-medium text-slate-800 truncate">{row.value}</span>
              </span>
              {row.href && <ChevronRight size={15} className="text-slate-300 flex-shrink-0" />}
            </>
          );
          return row.href
            ? <a key={row.label} href={row.href} className="flex items-center gap-3 px-4 py-2.5 active:bg-slate-50" style={{ textDecoration: 'none' }}>{body}</a>
            : <div key={row.label} className="flex items-center gap-3 px-4 py-2.5">{body}</div>;
        })}
        <div className="h-1.5" />
      </section>

      {/* Apartment */}
      {units.length > 0 && (
        <section className="dash-rise rounded-[22px] bg-white border border-slate-200/70 p-4" style={{ animationDelay: '320ms' }}>
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Apartment</div>
            {curUnit && <span className="text-[11px] text-slate-400">{(curUnit.residentIds || []).length}/{curUnit.maxOccupants || 7} living here</span>}
          </div>
          <div className="mt-2 text-[15px] font-semibold text-slate-900">{unitDisplay || 'Not assigned yet'}</div>
          <select className="input-field text-sm mt-3" value={assignUnitId} onChange={e => setAssignUnitId(e.target.value)}>
            <option value="">— No apartment —</option>
            {units.map(u => {
              const cnt = (u.residentIds || []).length;
              const mx = u.maxOccupants || 7;
              const isCurrent = (r.unitId?._id || r.unitId) === u._id;
              const full = cnt >= mx && !isCurrent;
              const label = u.block ? `Block ${u.block} · Apt ${u.unitNumber}` : `Apt ${u.unitNumber}`;
              return <option key={u._id} value={u._id} disabled={full}>{label} — {cnt}/{mx}{full ? ' (full)' : ''}</option>;
            })}
          </select>
          <button onClick={handleAssign} disabled={savingUnit || !changed}
            className="mt-3 w-full py-3 rounded-xl text-[14px] font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: changed ? '0 10px 20px -12px rgba(5,150,105,0.9)' : 'none' }}>
            {savingUnit ? 'Saving…' : !changed ? 'No changes' : assignUnitId ? 'Save apartment' : 'Remove from apartment'}
          </button>
        </section>
      )}

      {/* Account */}
      <section className="dash-rise" style={{ animationDelay: '380ms' }}>
        <button onClick={handleToggle} disabled={acting}
          className="w-full py-3.5 rounded-2xl font-semibold text-[14px] flex items-center justify-center gap-2 border active:scale-[0.99] transition-transform"
          style={r.isActive
            ? { background: '#FEF2F2', color: '#DC2626', borderColor: '#FECACA' }
            : { background: '#ECFDF5', color: '#059669', borderColor: '#A7F3D0' }}>
          {r.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
          {acting ? 'Saving…' : r.isActive ? 'Suspend resident' : 'Activate resident'}
        </button>
        <p className="mt-2 text-center text-[11px] text-slate-400">
          {r.isActive ? 'Suspended residents can’t sign in until you activate them again.' : 'Activating lets them sign in to AreaMates again.'}
        </p>
      </section>
    </div>
  );
}

function StatTile({ i, label, value, Icon, color }) {
  const n = useCountUp(value || 0);
  return (
    <div className="dash-rise relative overflow-hidden rounded-2xl p-3 border"
      style={{ animationDelay: `${160 + i * 50}ms`, background: `linear-gradient(140deg, ${color}1F 0%, #FFFFFF 65%)`, borderColor: `${color}33` }}>
      <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)` }}>
        <Icon size={13} className="text-white" />
      </span>
      <div className="mt-2 text-[20px] font-semibold leading-none text-slate-900 tabular-nums" style={{ letterSpacing: '-0.03em' }}>{n}</div>
      <div className="mt-1 text-[11px] font-medium text-slate-500 truncate">{label}</div>
    </div>
  );
}
