// Site roles on a member (utils/siteTypes ROLES, from GET /api/site): the role
// picker, specialty / subject, on-call switch and the "assigned to" picker
// (care team, adviser, class teacher, supervisor) used by the invite / add
// forms; the role chip and filter for the members list; and the role card on
// the drawer / profile. Everything here renders nothing for estates.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck, Search, Save, Siren, Stethoscope, UserCog, Users, X, Check,
  HeartPulse, Briefcase, BookOpen, GraduationCap, KeyRound, ConciergeBell, Sparkles, Wrench, ShieldCheck, ShieldAlert, HardHat, User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { siteAPI } from '../../api';
import { useSite } from '../../context/SiteContext';
import SitePanel from './SitePanel';

// Colour per role, by position in the site's role list (default role first)
const PALETTE = ['#6366F1', '#EC4899', '#0EA5E9', '#F59E0B', '#10B981', '#8B5CF6'];
export const roleColor = (site, key) => {
  const i = Math.max(0, (site.roles || []).findIndex(r => r.key === (key || site.defaultRole)));
  return PALETTE[i % PALETTE.length];
};

// Icon per role (staff wizard cards, staff page)
export const ROLE_ICONS = {
  doctor: Stethoscope, nurse: HeartPulse, staff: Briefcase, lecturer: BookOpen, warden: KeyRound, clinic: Stethoscope,
  teacher: GraduationCap, front_desk: ConciergeBell, housekeeping: Sparkles, maintenance: Wrench, duty_manager: ShieldCheck,
  supervisor: HardHat, safety_officer: ShieldAlert, first_aider: HeartPulse,
};
export const roleIcon = (key) => ROLE_ICONS[key] || User;

// Fallback unit-picker labels for staff roles (server role.form.unit wins)
const UNIT_FALLBACK = {
  nurse: 'Ward they work in', doctor: 'Ward or department they work in', teacher: 'Class they teach',
  warden: 'Hall they cover', supervisor: 'Department', lecturer: 'Department / office',
};

// Everything a form needs to know about one role
export function roleForm(site, key) {
  const def = site.roleOf(key);
  const form = def.form || {};
  const isDefault = def.key === site.defaultRole;
  const subject = ['teacher', 'lecturer'].includes(def.key);
  const assignable = (site.roles || []).some(r => r.assignable);
  return {
    def,
    isDefault,
    // Unit picker label: "Ward they work in", "Class they teach", "Hall they cover"…
    unitLabel: form.unit || UNIT_FALLBACK[def.key] || '',
    showSpecialty: !!(def.specialty || form.specialty),
    specialtyLabel: subject ? 'Subject' : (form.specialty || 'Specialty'),
    showOnCall: !!def.onCall,
    // Stay / admission dates are for the default role (guest, patient) only
    showStay: isDefault,
    requireStay: isDefault,
    showShift: form.shift !== undefined ? !!form.shift : def.staff,
    idLabel: form.id || '',
    showAssign: isDefault && (form.assign !== undefined ? !!form.assign : true) && !!site.assignLabel && assignable,
    form,
  };
}

export const emptyRole = () => ({ siteRole: '', specialty: '', onCall: false, assignedTo: [] });

export const roleFromMember = (m) => ({
  siteRole: m?.siteRole || '',
  specialty: m?.roleInfo?.specialty || '',
  onCall: !!m?.roleInfo?.onCall,
  assignedTo: (m?.assignedTo || []).map(a => (typeof a === 'object' ? a._id : a)).filter(Boolean),
});

// Body fields for POST /residents(/invite) and PATCH /site/members/:id
export function rolePayload(v, site) {
  if (!site.hasRoles) return {};
  const rf = roleForm(site, v.siteRole);
  const out = { siteRole: rf.def.key === site.defaultRole ? '' : rf.def.key };
  const roleInfo = {};
  if (rf.showSpecialty) roleInfo.specialty = v.specialty || '';
  if (rf.showOnCall) roleInfo.onCall = !!v.onCall;
  if (Object.keys(roleInfo).length) out.roleInfo = roleInfo;
  out.assignedTo = rf.showAssign ? v.assignedTo || [] : [];
  return out;
}

// Staff directory (GET /api/site/staff) — shared between forms on the page
let staffCache = null;
export function useStaff(enabled = true) {
  const [staff, setStaff] = useState(staffCache || []);
  const [loading, setLoading] = useState(!staffCache);
  const reload = useCallback(async () => {
    try {
      const { data } = await siteAPI.staff();
      staffCache = data.data || [];
      setStaff(staffCache);
    } catch { /* keep what we have */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { if (enabled) reload(); }, [enabled, reload]);
  return { staff, loading, reload };
}

// "Doctor" chip on list rows / cards
export function RoleChip({ siteRole, className = '', size = 'sm' }) {
  const site = useSite();
  if (!site.hasRoles) return null;
  const def = site.roleOf(siteRole);
  const c = roleColor(site, def.key);
  return (
    <span className={`inline-flex items-center gap-1 font-semibold rounded-full whitespace-nowrap ${size === 'xs' ? 'text-[10px] px-1.5 py-[1px]' : 'text-[11px] px-2 py-0.5'} ${className}`}
      style={{ background: `${c}14`, color: c, border: `1px solid ${c}2E` }}>
      {def.staff && <BadgeCheck size={size === 'xs' ? 9 : 10} />}{def.label}
    </span>
  );
}

export function OnCallPill({ on, className = '' }) {
  if (!on) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap ${className}`}>
      <span className="relative flex w-1.5 h-1.5"><span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-70" /><span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" /></span>
      On call
    </span>
  );
}

// Role filter tabs for the members list ('' = everyone)
export function RoleFilterTabs({ value, onChange, className = '' }) {
  const site = useSite();
  if (!site.hasRoles) return null;
  const tabs = [['', 'Everyone'], ...site.roles.map(r => [r.key, r.plural || r.label])];
  return (
    <div className={`flex gap-1.5 overflow-x-auto no-scrollbar ${className}`}>
      {tabs.map(([key, label]) => {
        const on = value === key;
        const c = key ? roleColor(site, key) : '#0F172A';
        return (
          <button key={key || 'all'} type="button" onClick={() => onChange(key)}
            className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap flex-shrink-0 transition-all border"
            style={on ? { background: c, color: '#fff', borderColor: c } : { background: '#fff', color: '#475569', borderColor: '#E2E8F0' }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

const label = 'text-xs font-semibold mb-1.5 block';
const labelStyle = { color: 'var(--text-sub)' };

// Multi-picker of assignable staff, grouped by role
export function AssignPicker({ value = [], onChange, title }) {
  const site = useSite();
  const { staff, loading } = useStaff(true);
  const [q, setQ] = useState('');
  const assignableKeys = useMemo(() => (site.roles || []).filter(r => r.assignable).map(r => r.key), [site.roles]);
  const groups = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const list = staff.filter(s => assignableKeys.includes(s.role) && (!ql || `${s.name} ${s.specialty} ${s.unit}`.toLowerCase().includes(ql)));
    return assignableKeys.map(k => ({ def: site.roleOf(k), people: list.filter(s => s.role === k) })).filter(g => g.people.length);
  }, [staff, q, assignableKeys, site]);
  const toggle = (id) => {
    if (value.includes(id)) onChange(value.filter(x => x !== id));
    else if (value.length >= 10) toast.error('Assign at most 10 people');
    else onChange([...value, id]);
  };
  const picked = staff.filter(s => value.includes(s._id));

  return (
    <div className="rounded-xl border border-pink-100 p-3" style={{ background: 'linear-gradient(135deg, #FDF2F8, #FFFFFF 70%)' }}>
      <p className="text-[12px] font-semibold text-pink-800 flex items-center gap-1.5 mb-2"><Users size={13} /> {title || site.assignLabel} <span className="font-normal text-pink-700/60">(optional)</span></p>
      {picked.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {picked.map(s => (
            <span key={s._id} className="inline-flex items-center gap-1 text-[11.5px] font-semibold pl-2 pr-1 py-0.5 rounded-full bg-white border border-pink-200 text-pink-800">
              {s.name}
              <button type="button" onClick={() => toggle(s._id)} aria-label={`Remove ${s.name}`} className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-pink-100"><X size={10} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="relative mb-2">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input-field text-sm !pl-8" placeholder="Search staff…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div className="max-h-52 overflow-y-auto rounded-lg bg-white border border-slate-200 divide-y divide-slate-100">
        {loading ? <p className="px-3 py-3 text-[12px] text-slate-400">Loading staff…</p>
          : !groups.length ? <p className="px-3 py-3 text-[12px] text-slate-500">{q ? 'No staff match.' : `No ${(site.roles || []).filter(r => r.assignable).map(r => r.plural.toLowerCase()).join(' or ')} yet. Add them as ${site.terms.members.toLowerCase()} with their role first.`}</p>
          : groups.map(g => (
            <div key={g.def.key}>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-slate-50" style={{ color: roleColor(site, g.def.key) }}>{g.def.plural}</div>
              {g.people.map(s => {
                const on = value.includes(s._id);
                return (
                  <button type="button" key={s._id} onClick={() => toggle(s._id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${on ? 'bg-pink-50' : 'hover:bg-slate-50'}`}>
                    <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${on ? 'bg-pink-600 border-pink-600 text-white' : 'border-slate-300 bg-white'}`}>{on && <Check size={11} />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-semibold text-slate-900 truncate">{[s.name, s.roleLabel, s.specialty].filter(Boolean).join(' · ')}</span>
                      {s.unit && <span className="block text-[11px] text-slate-400 truncate">{s.unit}</span>}
                    </span>
                    {s.onCall && <OnCallPill on />}
                    {typeof s.assignedCount === 'number' && <span className="text-[10.5px] font-semibold text-slate-500 bg-slate-100 rounded-full px-1.5 py-0.5 whitespace-nowrap">{s.assignedCount} assigned</span>}
                  </button>
                );
              })}
            </div>
          ))}
      </div>
    </div>
  );
}

// Role block in the invite / add forms. value = emptyRole() shape.
export function RoleSection({ value, onChange }) {
  const site = useSite();
  if (!site.hasRoles) return null;
  const rf = roleForm(site, value.siteRole);
  const set = (patch) => onChange({ ...value, ...patch });
  const current = rf.def.key;

  return (
    <div className="space-y-3">
      <div>
        <label className={label} style={labelStyle}>Role</label>
        <div className="flex flex-wrap gap-1.5">
          {site.roles.map(r => {
            const on = r.key === current;
            const c = roleColor(site, r.key);
            return (
              <button type="button" key={r.key} onClick={() => set({ siteRole: r.key === site.defaultRole ? '' : r.key })}
                className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold border transition-all"
                style={on ? { background: c, borderColor: c, color: '#fff', boxShadow: `0 6px 14px -8px ${c}` } : { background: '#fff', borderColor: '#E2E8F0', color: '#475569' }}>
                {r.label}
              </button>
            );
          })}
        </div>
      </div>
      {(rf.showSpecialty || rf.showOnCall) && (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2.5 items-end">
          {rf.showSpecialty ? (
            <div>
              <label className={label} style={labelStyle}>{rf.specialtyLabel}</label>
              <input className="input-field" value={value.specialty} onChange={e => set({ specialty: e.target.value })}
                placeholder={rf.specialtyLabel === 'Subject' ? 'e.g. Mathematics' : rf.def.key === 'doctor' ? 'e.g. Cardiology' : ''} />
            </div>
          ) : <span />}
          {rf.showOnCall && <OnCallSwitch on={value.onCall} onChange={(onCall) => set({ onCall })} />}
        </div>
      )}
      {rf.showAssign && <AssignPicker value={value.assignedTo} onChange={(assignedTo) => set({ assignedTo })} />}
    </div>
  );
}

export function OnCallSwitch({ on, onChange, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)}
      className={`inline-flex items-center gap-2 h-[42px] px-3 rounded-xl border text-[12.5px] font-semibold transition-all disabled:opacity-60 ${on ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500'}`}>
      <span className={`relative w-8 h-[18px] rounded-full transition-colors ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}>
        <span className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-all ${on ? 'left-[16px]' : 'left-[2px]'}`} />
      </span>
      On call
    </button>
  );
}

// Role + assigned staff card on the drawer / profile, with an edit panel
export function RoleCard({ member, onChanged }) {
  const site = useSite();
  const [cur, setCur] = useState(() => ({ ...roleFromMember(member), people: member.assignedTo || [] }));
  const [draft, setDraft] = useState(emptyRole);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const { staff, reload } = useStaff(site.hasRoles && editing);
  useEffect(() => { setCur({ ...roleFromMember(member), people: member.assignedTo || [] }); setEditing(false); }, [member._id, member.siteRole, member.assignedTo]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!site.hasRoles || member.householdRole === 'member') return null;

  const rf = roleForm(site, cur.siteRole);
  const c = roleColor(site, rf.def.key);
  const people = (cur.people || []).filter(p => typeof p === 'object');

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await siteAPI.updateMember(member._id, rolePayload(draft, site));
      const f = data.data || {};
      setCur({ ...roleFromMember(f), people: f.assignedTo || [] });
      setEditing(false);
      toast.success('Saved');
      reload();
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally { setBusy(false); }
  };
  const staffById = new Map(staff.map(s => [String(s._id), s]));

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden" style={{ animation: 'dashRise 0.45s cubic-bezier(0.16,1,0.3,1) 90ms both' }}>
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100" style={{ background: `linear-gradient(135deg, ${c}14, transparent 70%)` }}>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${c}, ${c}CC)`, boxShadow: `0 4px 10px -4px ${c}` }}>
          {rf.def.staff ? <Stethoscope size={13} className="text-white" /> : <UserCog size={13} className="text-white" />}
        </span>
        <span className="text-[13px] font-semibold text-slate-900 flex-1">{rf.showAssign ? `Role & ${site.assignLabel.toLowerCase()}` : 'Role'}</span>
        <button type="button" onClick={() => { setDraft(roleFromMember({ siteRole: cur.siteRole, roleInfo: { specialty: cur.specialty, onCall: cur.onCall }, assignedTo: cur.assignedTo })); setEditing(true); }}
          className="text-[11.5px] font-semibold px-2 py-1 rounded-lg hover:opacity-80" style={{ color: c, background: `${c}14` }}>Change</button>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <RoleChip siteRole={cur.siteRole} />
          {rf.showSpecialty && cur.specialty && <span className="text-[11.5px] font-semibold text-slate-600 bg-slate-100 rounded-full px-2 py-0.5">{cur.specialty}</span>}
          {rf.showOnCall && (cur.onCall ? <OnCallPill on /> : <span className="text-[11px] font-semibold text-slate-400">Off call</span>)}
        </div>
        {rf.showAssign && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{site.assignLabel}</div>
            {people.length ? (
              <div className="space-y-1.5">
                {people.map(p => {
                  const d = site.roleOf(p.siteRole);
                  const live = staffById.get(String(p._id));
                  return (
                    <div key={p._id} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: `linear-gradient(135deg, ${roleColor(site, d.key)}, ${roleColor(site, d.key)}BB)` }}>
                        {p.profilePhoto ? <img src={p.profilePhoto} alt="" className="w-full h-full rounded-full object-cover" /> : (p.name || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-semibold text-slate-900 truncate">{p.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">{[d.label, p.roleInfo?.specialty].filter(Boolean).join(' · ')}</div>
                      </div>
                      <OnCallPill on={live ? live.onCall : p.roleInfo?.onCall} />
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-[12px] text-slate-500">Nobody assigned yet. Alerts still reach the staff covering their {site.terms.unit.toLowerCase()} and whoever is on call.</p>}
          </div>
        )}
      </div>
      {editing && (
        <SitePanel title={member.name} eyebrow={rf.showAssign ? `Role & ${site.assignLabel.toLowerCase()}` : 'Role'} accent={[c, c]} onClose={() => setEditing(false)}
          footer={(
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-2.5 rounded-[9px] text-[13px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">Cancel</button>
              <button type="button" onClick={save} disabled={busy}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[9px] px-3 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #EC4899, #DB2777)' }}>
                <Save size={14} /> {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}>
          <div className="p-5 space-y-4">
            <RoleSection value={draft} onChange={setDraft} />
            {!roleForm(site, draft.siteRole).showAssign && cur.assignedTo.length > 0 && (
              <p className="text-[11.5px] text-slate-500 flex items-start gap-1.5"><Siren size={12} className="mt-0.5 flex-shrink-0" /> Staff roles have no {site.assignLabel.toLowerCase()}; saving clears it.</p>
            )}
          </div>
        </SitePanel>
      )}
    </div>
  );
}
