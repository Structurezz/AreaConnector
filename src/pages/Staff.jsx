// Staff & on-call (non-estate sites): doctors, nurses, teachers, wardens,
// housekeeping, supervisors… grouped by role, with who's on call now, their
// unit / ward, shift, specialty and how many people are assigned to them.
// Managers flip on-call here and add staff with the staff wizard.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, X, UserPlus, Users, Siren, Clock, Phone, ChevronRight, BadgeCheck, Home } from 'lucide-react';
import { residentAPI, siteAPI, unitAPI } from '../api';
import { useSite } from '../context/SiteContext';
import StatTile from '../components/site/StatTile';
import { OnCallPill, OnCallSwitch, RoleChip, roleColor, roleForm, roleIcon } from '../components/site/RoleFields';
import { StaffWizard } from '../components/residents/OnboardWizard';
import { DAY_LABELS } from '../utils/siteTypes';
import { PageLoader } from '../components/ui/Spinner';

const initials = (n = '?') => n.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
const unitText = (u) => (u && typeof u === 'object' ? [u.block, u.unitNumber].filter(Boolean).join(' · ') : '');
const shiftText = (sh) => (sh?.start && sh?.end ? `${sh.start}–${sh.end}${sh.days?.length ? ` · ${sh.days.map(d => DAY_LABELS[d]).join(' ')}` : ''}` : '');

function Avatar({ p, color, size = 38 }) {
  return p.profilePhoto
    ? <img src={p.profilePhoto} alt="" className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
    : <span className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ width: size, height: size, fontSize: size * 0.34, background: `linear-gradient(135deg, ${color}, ${color}AA)` }}>{initials(p.name)}</span>;
}

export default function Staff() {
  const site = useSite();
  const T = site.terms;
  const navigate = useNavigate();
  const staffRoles = useMemo(() => (site.roles || []).filter(r => r.staff), [site.roles]);
  const [people, setPeople] = useState([]);
  const [cards, setCards] = useState({}); // _id → /site/staff card (assignedCount, onShift)
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([
        residentAPI.getAll({ group: 'staff', limit: 500 }),
        siteAPI.staff().catch(() => ({ data: { data: [] } })),
      ]);
      setPeople(r.data.data || []);
      setCards(Object.fromEntries((s.data.data || []).map(c => [String(c._id), c])));
    } catch {
      toast.error('Could not load staff');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); unitAPI.getAll().then(({ data }) => setUnits(data.data || [])).catch(() => {}); }, [load]);

  const onCallOf = (p) => (cards[String(p._id)] ? cards[String(p._id)].onCall : !!p.roleInfo?.onCall);
  const roleKeyOf = (p) => site.roleOf(p.siteRole).key;

  const toggleOnCall = async (p) => {
    const next = !onCallOf(p);
    setBusy(p._id);
    try {
      await siteAPI.updateMember(p._id, { roleInfo: { onCall: next } });
      setCards(c => ({ ...c, [String(p._id)]: { ...(c[String(p._id)] || {}), onCall: next } }));
      setPeople(list => list.map(x => (x._id === p._id ? { ...x, roleInfo: { ...(x.roleInfo || {}), onCall: next } } : x)));
      toast.success(next ? `${p.name} is on call` : `${p.name} is off call`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not change on-call');
    } finally { setBusy(null); }
  };

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return people.filter(p => (!role || roleKeyOf(p) === role)
      && (!ql || `${p.name} ${p.email} ${p.roleInfo?.specialty || ''} ${unitText(p.unitId)} ${p.memberProfile?.idNumber || ''}`.toLowerCase().includes(ql)));
  }, [people, role, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const groups = staffRoles.map(r => ({ def: r, list: filtered.filter(p => roleKeyOf(p) === r.key) })).filter(g => g.list.length);
  const onCallNow = people.filter(p => p.isActive && onCallOf(p));
  const onShift = people.filter(p => cards[String(p._id)]?.shift?.onShift).length;
  const responders = people.filter(p => site.roleOf(p.siteRole).responds?.length).length;

  if (site.isEstate) return <div className="max-w-md mx-auto py-20 text-center text-[13px] text-slate-500">Staff roles are for schools, universities, hotels, hospitals and industrial sites. Change the site type in Settings → Site type & features.</div>;
  if (loading) return <PageLoader />;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="dash-rise flex items-end justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold text-slate-900" style={{ letterSpacing: '-0.025em' }}>Staff & on-call</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Who works at your {T.site.toLowerCase()}, who's on call, and who they look after</p>
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary !text-[13px] !px-3 !py-2 gap-1.5"><UserPlus size={15} /> Add staff</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile i={0} label="Staff" value={people.length} Icon={Users} color="#6366F1" hint={`${staffRoles.length} roles`} />
        <StatTile i={1} label="On call now" value={onCallNow.length} Icon={Siren} color="#10B981" pulse={onCallNow.length > 0} hint="Get emergencies site-wide" />
        <StatTile i={2} label="On shift now" value={onShift} Icon={Clock} color="#0EA5E9" hint="By their shift hours" />
        <StatTile i={3} label="Alert responders" value={responders} Icon={BadgeCheck} color="#EC4899" hint="Roles that answer alerts" />
      </div>

      {/* On call now */}
      <div className="dash-rise rounded-2xl border border-emerald-200 p-4" style={{ background: 'linear-gradient(135deg, #ECFDF5, #FFFFFF 65%)', animationDelay: '200ms' }}>
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 6px 14px -6px #059669' }}><Siren size={15} className="text-white" /></span>
          <span className="text-[14px] font-semibold text-slate-900 flex-1">On call now</span>
          <span className="text-[12px] text-emerald-700 font-semibold">{onCallNow.length}</span>
        </div>
        {onCallNow.length ? (
          <div className="flex flex-wrap gap-2">
            {onCallNow.map(p => {
              const c = roleColor(site, roleKeyOf(p));
              return (
                <div key={p._id} className="flex items-center gap-2 rounded-xl bg-white border border-emerald-100 pl-1.5 pr-2 py-1.5 min-w-0">
                  <Avatar p={p} color={c} size={28} />
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold text-slate-900 truncate max-w-[160px]">{p.name}</div>
                    <div className="text-[11px] text-slate-500 truncate max-w-[160px]">{[site.roleOf(p.siteRole).label, p.roleInfo?.specialty].filter(Boolean).join(' · ')}</div>
                  </div>
                  {p.phone && <a href={`tel:${p.phone}`} aria-label={`Call ${p.name}`} className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-700 bg-emerald-50 hover:bg-emerald-100"><Phone size={13} /></a>}
                </div>
              );
            })}
          </div>
        ) : <p className="text-[12.5px] text-slate-500">Nobody is on call. Alerts go to everyone whose role answers them until someone is.</p>}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1 min-w-0">
          {[['', 'All staff', people.length], ...staffRoles.map(r => [r.key, r.plural, people.filter(p => roleKeyOf(p) === r.key).length])].map(([key, label, n]) => {
            const on = role === key;
            const c = key ? roleColor(site, key) : '#0F172A';
            return (
              <button key={key || 'all'} onClick={() => setRole(key)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap flex-shrink-0 border transition-all"
                style={on ? { background: c, color: '#fff', borderColor: c } : { background: '#fff', color: '#475569', borderColor: '#E2E8F0' }}>
                {label}<span className="text-[10.5px] tabular-nums opacity-70">{n}</span>
              </button>
            );
          })}
        </div>
        <div className="relative sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="w-full rounded-xl bg-white border border-slate-200 pl-9 pr-8 py-2 text-[13px] outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            placeholder="Search staff…" value={q} onChange={e => setQ(e.target.value)} />
          {q && <button onClick={() => setQ('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"><X size={14} /></button>}
        </div>
      </div>

      {!groups.length ? (
        <div className="rounded-2xl bg-white border border-slate-200/70 px-6 py-14 text-center">
          <span className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #818CF8, #4F46E5)' }}><Users size={24} className="text-white" /></span>
          <p className="mt-3 text-[14px] font-semibold text-slate-900">{q || role ? 'No staff match' : 'No staff yet'}</p>
          <p className="text-[12.5px] text-slate-500 mt-1">{q || role ? 'Try a different search or role.' : `Add your ${staffRoles.map(r => r.plural.toLowerCase()).slice(0, 3).join(', ')} so alerts and requests reach the right people.`}</p>
          {!q && !role && <button onClick={() => setAdding(true)} className="btn-primary mt-4 gap-1.5"><UserPlus size={14} /> Add staff</button>}
        </div>
      ) : groups.map(({ def, list }, gi) => {
        const c = roleColor(site, def.key);
        const Icon = roleIcon(def.key);
        const rf = roleForm(site, def.key);
        return (
          <section key={def.key} className="dash-rise rounded-2xl bg-white border border-slate-200/70 overflow-hidden" style={{ animationDelay: `${260 + gi * 60}ms` }}>
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100" style={{ background: `linear-gradient(135deg, ${c}14, transparent 70%)` }}>
              <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${c}, ${c}CC)`, boxShadow: `0 6px 14px -6px ${c}` }}><Icon size={15} className="text-white" /></span>
              <span className="text-[14px] font-semibold text-slate-900 flex-1">{def.plural}</span>
              <span className="text-[12px] font-semibold" style={{ color: c }}>{list.length}</span>
              {def.onCall && <span className="text-[11.5px] text-emerald-700 font-semibold">{list.filter(onCallOf).length} on call</span>}
            </div>
            <div className="divide-y divide-slate-100">
              {list.map(p => {
                const card = cards[String(p._id)];
                const onShiftNow = card?.shift?.onShift;
                const assigned = card?.assignedCount;
                return (
                  <div key={p._id} onClick={() => navigate(`/residents/${p._id}`, { state: { resident: p, units } })}
                    className="group flex flex-wrap lg:flex-nowrap items-center gap-x-4 gap-y-2 px-4 py-3 cursor-pointer hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1 lg:flex-[2]">
                      <Avatar p={p} color={c} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[13px] font-semibold text-slate-900 truncate">{p.name}</span>
                          {!p.isActive && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-red-50 text-red-600">Suspended</span>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                          <RoleChip siteRole={p.siteRole} size="xs" />
                          {p.roleInfo?.specialty && <span className="text-[11px] text-slate-500 truncate">{p.roleInfo.specialty}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-[12px] text-slate-600 min-w-0 w-[45%] lg:w-auto lg:flex-[1.3] truncate">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{rf.unitLabel || T.unit}</span>
                      {unitText(p.unitId) ? <span className="inline-flex items-center gap-1"><Home size={11} className="text-slate-300" />{unitText(p.unitId)}</span> : <span className="italic text-slate-400">Not set</span>}
                    </div>
                    <div className="text-[12px] text-slate-600 min-w-0 w-[45%] lg:w-auto lg:flex-[1.3] truncate">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Shift</span>
                      {shiftText(p.shift) ? <span className="inline-flex items-center gap-1.5">{onShiftNow && <span className="w-1.5 h-1.5 rounded-full bg-sky-500" title="On shift now" />}{shiftText(p.shift)}</span> : <span className="italic text-slate-400">No shift</span>}
                    </div>
                    {def.assignable && (
                      <div className="text-[12px] min-w-0 lg:w-[90px]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Assigned</span>
                        <span className="font-semibold text-slate-800 tabular-nums">{assigned ?? 0}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 ml-auto" onClick={e => e.stopPropagation()}>
                      {def.onCall
                        ? <><OnCallPill on={onCallOf(p)} className="hidden sm:inline-flex" /><OnCallSwitch on={onCallOf(p)} disabled={busy === p._id} onChange={() => toggleOnCall(p)} /></>
                        : null}
                      {p.phone && <a href={`tel:${p.phone}`} aria-label={`Call ${p.name}`} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"><Phone size={14} /></a>}
                      <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <StaffWizard open={adding} onClose={() => setAdding(false)} units={units} initialRole={role || undefined}
        onUnitCreated={(u) => setUnits(l => [...l, u])} onSaved={load} />
    </div>
  );
}
