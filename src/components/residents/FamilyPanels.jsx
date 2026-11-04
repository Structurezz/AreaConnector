// Households on the manager side: approve family members residents asked to
// add (estate setting "Approve family members"), and add family to a resident.
import { useEffect, useState } from 'react';
import {
  X, Users, Check, Send, Home, Clock, UserCheck, CreditCard, MessageSquare, Music, ShoppingBag, PhoneCall,
  ChevronRight, Settings2, Search, Crown, PauseCircle, PlayCircle, Trash2, Pencil, UserPlus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import Portal, { Z } from '../ui/Portal';
import { residentAPI, householdAPI, unitAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';

// Mirrors server utils/householdAccess
export const FAMILY_PERMS = {
  visitors:    { label: 'Invite visitors', desc: 'Gate passes for the home',              Icon: UserCheck,     color: '#6366F1' },
  payments:    { label: 'Estate bills',    desc: 'See and pay the household’s bills',     Icon: CreditCard,    color: '#10B981' },
  chat:        { label: 'Community chat',  desc: 'Estate group chat and DMs',             Icon: MessageSquare, color: '#3B82F6' },
  community:   { label: 'Lounge & events', desc: 'Lounge, podcasts, events, polls',       Icon: Music,         color: '#8B5CF6' },
  marketplace: { label: 'Marketplace',     desc: 'Buy and sell with neighbours',          Icon: ShoppingBag,   color: '#F59E0B' },
  neighbours:  { label: 'Call neighbours', desc: 'Call or buzz from the directory',       Icon: PhoneCall,     color: '#EC4899' },
};
const ALL = Object.keys(FAMILY_PERMS);
const PRESETS = {
  adult: { label: 'Adult', permissions: ALL },
  teen:  { label: 'Teen', permissions: ['chat', 'community', 'neighbours'] },
  child: { label: 'Child', permissions: ['community'] },
  staff: { label: 'Domestic staff', permissions: ['visitors'] },
  basic: { label: 'Basics only', permissions: [] },
};
const RELATIONSHIPS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Relative', 'Domestic staff', 'Other'];
const REL_PRESET = { Spouse: 'adult', Parent: 'adult', Sibling: 'adult', Child: 'child', 'Domestic staff': 'staff' };

function SideBar({ title, eyebrow, subtitle, onClose, children, footer, accent = ['#A855F7', '#7C3AED'] }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <Portal>
      <div className={`fixed inset-0 ${Z.drawer} flex justify-end`} onClick={onClose}>
        <div className="overlay-backdrop" aria-hidden="true" />
        <aside role="dialog" aria-modal="true" aria-label={title}
          className="animate-slide-in-right relative h-full w-full sm:w-[440px] bg-white flex flex-col"
          style={{ boxShadow: '-8px 0 40px rgba(15,23,42,0.18)' }}
          onClick={e => e.stopPropagation()}>
          <div className="relative overflow-hidden px-5 pt-4 pb-5 flex-shrink-0 text-white"
            style={{ background: `linear-gradient(135deg, ${accent[0]}, ${accent[1]})` }}>
            <div className="pointer-events-none absolute -top-16 -right-12 w-48 h-48 rounded-full bg-white/10" style={{ animation: 'dashFloat 14s ease-in-out infinite' }} />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">{eyebrow}</p>
                <h2 className="text-[17px] font-semibold !text-white truncate mt-0.5">{title}</h2>
                {subtitle && <p className="text-[12px] text-white/75 mt-1">{subtitle}</p>}
              </div>
              <button onClick={onClose} aria-label="Close" className="w-8 h-8 -mr-1 rounded-full flex items-center justify-center text-white/80 hover:bg-white/15"><X size={17} /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
          {footer && <div className="px-5 pt-3 pb-4 flex-shrink-0 border-t border-slate-100 bg-white">{footer}</div>}
        </aside>
      </div>
    </Portal>
  );
}

const Initial = ({ p, size = 36, from = '#C084FC', to = '#A855F7' }) => p?.profilePhoto
  ? <img src={p.profilePhoto} alt="" className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
  : <span className="rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, ${from}, ${to})` }}>{p?.name?.[0]?.toUpperCase() || '?'}</span>;

/* ── Banner on the Residents page ─────────────────────────────────── */

export function FamilyRequestsBanner({ count, onOpen }) {
  if (!count) return null;
  return (
    <div className="dash-rise rounded-2xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-white px-4 py-3 flex flex-wrap items-center gap-3">
      <span className="relative w-9 h-9 rounded-xl bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center flex-shrink-0">
        <Users size={17} />
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-fuchsia-600 text-white text-[10px] font-bold flex items-center justify-center">{count}</span>
      </span>
      <div className="flex-1 min-w-[200px]">
        <p className="text-[13.5px] font-semibold text-fuchsia-900">{count} family member{count !== 1 ? 's' : ''} waiting for your approval</p>
        <p className="text-[12px] text-fuchsia-800/80">Residents asked to add people to their home. Their invites go out when you approve.</p>
      </div>
      <button onClick={onOpen} className="h-9 px-3.5 rounded-xl text-[12.5px] font-semibold bg-fuchsia-600 text-white hover:bg-fuchsia-700">
        Review
      </button>
    </div>
  );
}

/* ── Approval queue ───────────────────────────────────────────────── */

function RequestCard({ r, i, onDone }) {
  const [busy, setBusy] = useState(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const unit = r.head?.unit;
  const full = unit && unit.occupants >= unit.maxOccupants;

  const act = async (kind) => {
    setBusy(kind);
    try {
      const { data } = kind === 'approve' ? await residentAPI.approveFamily(r._id) : await residentAPI.rejectFamily(r._id, reason);
      toast.success(data.message);
      onDone(r._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden" style={{ animation: `dashRise 0.45s cubic-bezier(0.16,1,0.3,1) ${60 + i * 50}ms both` }}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Initial p={r} size={42} />
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-slate-900 truncate">{r.name}</div>
            <div className="text-[12px] text-slate-500 truncate">{r.email}{r.phone ? ` · ${r.phone}` : ''}</div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100">{r.relationship || 'Family'}</span>
              <span className="text-[11px] text-slate-400 flex items-center gap-1"><Clock size={10} /> {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
        </div>

        {r.head && (
          <Link to={`/residents/${r.head._id}`} className="mt-3 flex items-center gap-2.5 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 hover:bg-slate-100 transition-colors" style={{ textDecoration: 'none' }}>
            <Initial p={r.head} size={26} from="#818CF8" to="#6366F1" />
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-slate-800 truncate">Requested by {r.head.name}</div>
              <div className={`text-[11px] truncate flex items-center gap-1 ${full ? 'text-red-600' : 'text-slate-400'}`}>
                <Home size={10} /> {unit ? `${unit.label} · ${unit.occupants}/${unit.maxOccupants} occupants${full ? ' (full)' : ''}` : 'No unit'}
              </div>
            </div>
            <ChevronRight size={13} className="text-slate-300" />
          </Link>
        )}

        <div className="flex flex-wrap gap-1 mt-3">
          {ALL.map(k => {
            const { label, Icon, color } = FAMILY_PERMS[k];
            const on = r.permissions.includes(k);
            return (
              <span key={k} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-semibold"
                style={on ? { background: `${color}14`, color } : { background: '#F8FAFC', color: '#CBD5E1', textDecoration: 'line-through' }}>
                <Icon size={10} /> {label}
              </span>
            );
          })}
        </div>

        {declining && (
          <textarea className="input-field text-sm mt-3" rows={2} maxLength={300} autoFocus
            placeholder="Reason for the resident (optional), e.g. please bring ID to the office"
            value={reason} onChange={e => setReason(e.target.value)} />
        )}
      </div>
      <div className="flex border-t border-slate-100">
        {declining ? (
          <>
            <button onClick={() => setDeclining(false)} className="flex-1 py-2.5 text-[12.5px] font-semibold text-slate-500 hover:bg-slate-50">Back</button>
            <button onClick={() => act('reject')} disabled={!!busy} className="flex-1 py-2.5 text-[12.5px] font-semibold text-red-600 hover:bg-red-50 border-l border-slate-100">
              {busy === 'reject' ? 'Declining…' : 'Decline request'}
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setDeclining(true)} disabled={!!busy} className="flex-1 py-2.5 text-[12.5px] font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600">Decline</button>
            <button onClick={() => act('approve')} disabled={!!busy}
              className="flex-[1.4] py-2.5 text-[12.5px] font-semibold text-white inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)' }}>
              <Check size={14} /> {busy === 'approve' ? 'Approving…' : 'Approve & send invite'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function FamilyRequestsPanel({ onClose, onChanged }) {
  const [requests, setRequests] = useState(null);
  useEffect(() => {
    residentAPI.familyRequests().then(({ data }) => setRequests(data.data)).catch(() => setRequests([]));
  }, []);
  const done = (id) => { setRequests(rs => rs.filter(r => r._id !== id)); onChanged?.(); };

  return (
    <SideBar eyebrow="Households" title="Family requests" onClose={onClose}
      subtitle={requests ? `${requests.length} waiting · invites are sent when you approve` : 'Loading…'}
      footer={
        <Link to="/settings#preferences" onClick={onClose} className="flex items-center justify-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-800">
          <Settings2 size={13} /> Approval is on in Settings → Estate preferences
        </Link>
      }>
      <div className="p-4 space-y-3">
        {!requests ? (
          [0, 1].map(i => <div key={i} className="skeleton h-44 rounded-2xl" />)
        ) : requests.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3"><Check size={24} /></div>
            <p className="text-[14px] font-semibold text-slate-800">All caught up</p>
            <p className="text-[12.5px] text-slate-500 mt-1">No family members are waiting for approval.</p>
          </div>
        ) : requests.map((r, i) => <RequestCard key={r._id} r={r} i={i} onDone={done} />)}
      </div>
    </SideBar>
  );
}

/* ── Manager adds a family member to a resident ───────────────────── */

// Pick which resident's household the family member joins (heads only)
function HouseholdPicker({ value, onChange }) {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  useEffect(() => {
    if (value) return;
    const t = setTimeout(() => {
      residentAPI.getAll({ search: q || undefined, limit: 8 })
        .then(({ data }) => setResults((data.data || []).filter(r => r.isActive && r.unitId)))
        .catch(() => setResults([]));
    }, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q, value]);

  const unitOf = (r) => r.unitId ? (r.unitId.block ? `Block ${r.unitId.block} · Apt ${r.unitId.unitNumber}` : `Apt ${r.unitId.unitNumber}`) : '';

  if (value) return (
    <div className="flex items-center gap-3 rounded-xl border border-fuchsia-200 bg-fuchsia-50/60 px-3 py-2.5">
      <Initial p={value} size={34} from="#818CF8" to="#6366F1" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-slate-900 truncate flex items-center gap-1.5">{value.self ? 'My household (you)' : value.name} <Crown size={11} className="text-amber-500" /></div>
        <div className="text-[11.5px] text-slate-500 truncate">{value.self ? 'You are the head of household' : unitOf(value) || 'Household head'}</div>
      </div>
      <button type="button" onClick={() => onChange(null)} className="text-[12px] font-semibold text-fuchsia-700 hover:underline">Change</button>
    </div>
  );

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="relative border-b border-slate-100">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="w-full pl-9 pr-3 py-2.5 text-sm outline-none" placeholder="Search residents by name or email…" autoFocus
          value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
        {!q && (
          <button type="button" onClick={() => onChange({ _id: 'me', self: true, name: user?.name || 'You', profilePhoto: user?.profilePhoto })}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left bg-fuchsia-50/40 hover:bg-fuchsia-50">
            <Initial p={{ name: user?.name, profilePhoto: user?.profilePhoto }} size={30} />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-slate-900 truncate">My household <span className="font-medium text-slate-400">(you)</span></div>
              <div className="text-[11px] text-slate-400 truncate">Add your own family — you're the head of household</div>
            </div>
            <ChevronRight size={13} className="text-slate-300" />
          </button>
        )}
        {results === null ? (
          <div className="p-3 space-y-2">{[0, 1, 2].map(i => <div key={i} className="skeleton h-9 rounded-lg" />)}</div>
        ) : results.length === 0 ? (
          <p className="px-3 py-4 text-[12.5px] text-slate-400 text-center">{q ? `No active residents with a unit match “${q}”` : 'No active residents with a unit yet'}</p>
        ) : results.map(r => (
          <button type="button" key={r._id} onClick={() => onChange(r)} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-fuchsia-50/50">
            <Initial p={r} size={30} from="#818CF8" to="#6366F1" />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-slate-900 truncate">{r.name}</div>
              <div className="text-[11px] text-slate-400 truncate">{unitOf(r)} · {r.email}</div>
            </div>
            <ChevronRight size={13} className="text-slate-300" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function AddFamilyPanel({ head: fixedHead, member, onClose, onSaved }) {
  const editing = !!member; // editing one of the manager's own family members
  const [head, setHead] = useState(fixedHead || null);
  const [form, setForm] = useState({
    name: member?.name || '', email: member?.email || '', phone: member?.phone || '',
    relationship: member?.relationship || '', permissions: member?.permissions || PRESETS.adult.permissions,
  });
  const [saving, setSaving] = useState(false);
  // Managers adding their own family need a home unit first
  const [myHome, setMyHome] = useState(undefined); // undefined = not loaded, null = none
  const [homeUnitId, setHomeUnitId] = useState('');
  const [units, setUnits] = useState([]);
  useEffect(() => {
    if (!head?.self || editing || myHome !== undefined) return;
    householdAPI.get().then(({ data }) => setMyHome(data.data.unit || null)).catch(() => setMyHome(null));
    unitAPI.getAll().then(({ data }) => setUnits(data.data || [])).catch(() => {});
  }, [head, editing, myHome]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggle = (k) => set('permissions', form.permissions.includes(k) ? form.permissions.filter(x => x !== k) : [...form.permissions, k]);
  const isPreset = (p) => p.permissions.length === form.permissions.length && p.permissions.every(k => form.permissions.includes(k));

  const save = async (e) => {
    e.preventDefault();
    if (!editing && !head) { toast.error('Choose the resident whose household they\'re joining'); return; }
    if (!editing && head.self && myHome === null && !homeUnitId) { toast.error('Choose the unit you live in'); return; }
    setSaving(true);
    try {
      let data;
      if (editing) {
        ({ data } = await householdAPI.update(member._id, { relationship: form.relationship, permissions: form.permissions }));
        data.message = `${member.name.split(' ')[0]}'s access updated`;
      } else if (head.self) {
        if (!myHome && homeUnitId) await householdAPI.setHome(homeUnitId);
        ({ data } = await householdAPI.invite(form));
      } else {
        ({ data } = await residentAPI.addFamily(head._id, form));
      }
      toast.success(data.message);
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add family member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SideBar eyebrow={editing || head?.self ? 'My household' : head ? `${head.name.split(' ')[0]}'s household` : 'Households'}
      title={editing ? member.name : 'Add family member'} onClose={onClose}
      subtitle={editing ? 'Choose what they can use in AreaMates.' : head?.self
        ? 'They get their own AreaMates login as part of your household. You decide what they can use.'
        : 'They get their own AreaMates login. Not billed. The resident can change their access later.'}
      footer={
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-[9px] text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">Cancel</button>
          <button type="submit" form="add-family-form" disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-[9px] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)', boxShadow: '0 8px 18px -10px #7C3AED' }}>
            {editing ? <><Check size={14} /> {saving ? 'Saving…' : 'Save access'}</> : <><Send size={14} /> {saving ? 'Sending invite…' : 'Add & send invite'}</>}
          </button>
        </div>
      }>
      <form id="add-family-form" onSubmit={save} className="p-5 space-y-5">
        {!fixedHead && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Household</p>
            <HouseholdPicker value={head} onChange={setHead} />
          </div>
        )}
        {!editing && head?.self && myHome === null && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
            <p className="text-[12.5px] font-semibold text-amber-900">Which unit do you live in?</p>
            <p className="text-[11.5px] text-amber-800/80 mb-2">Your family joins you there. You only set this once.</p>
            <select className="input-field text-sm" value={homeUnitId} onChange={e => setHomeUnitId(e.target.value)} required>
              <option value="">Choose your unit…</option>
              {units.map(u => {
                const cnt = (u.residentIds || []).length, mx = u.maxOccupants || 7;
                return <option key={u._id} value={u._id} disabled={cnt >= mx}>{u.block ? `Block ${u.block} · Apt ${u.unitNumber}` : `Apt ${u.unitNumber}`} — {cnt}/{mx}{cnt >= mx ? ' (full)' : ''}</option>;
              })}
            </select>
          </div>
        )}
        {!editing && head?.self && myHome && (
          <p className="text-[12px] text-slate-500 flex items-center gap-1.5"><Home size={12} className="text-fuchsia-500" /> Joining you at {myHome.label} · {myHome.occupants}/{myHome.maxOccupants} occupants</p>
        )}
        {!editing && <div className="space-y-2.5">
          <input className="input-field text-sm" placeholder="Full name" value={form.name} onChange={e => set('name', e.target.value)} required />
          <input className="input-field text-sm" type="email" placeholder="Email address (their login)" value={form.email} onChange={e => set('email', e.target.value)} required />
          <input className="input-field text-sm" type="tel" placeholder="Phone (optional)" value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>}

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Relationship{head && !head.self ? ` to ${head.name.split(' ')[0]}` : ''}</p>
          <div className="flex flex-wrap gap-1.5">
            {RELATIONSHIPS.map(r => {
              const on = form.relationship === r;
              return (
                <button type="button" key={r}
                  onClick={() => { set('relationship', r); if (!editing && REL_PRESET[r]) set('permissions', PRESETS[REL_PRESET[r]].permissions); }}
                  className="px-2.5 py-1 rounded-full text-[12px] font-semibold border transition-all"
                  style={on ? { background: '#FAF5FF', borderColor: '#C084FC', color: '#7E22CE' } : { borderColor: '#E2E8F0', color: '#475569' }}>
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">What they can use</p>
            <span className="text-[11px] text-slate-400">{form.permissions.length}/{ALL.length}</span>
          </div>
          <div className="flex flex-wrap gap-1 mb-2.5">
            {Object.entries(PRESETS).map(([k, p]) => (
              <button type="button" key={k} onClick={() => set('permissions', p.permissions)}
                className="px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all"
                style={isPreset(p) ? { background: '#7C3AED', color: '#fff' } : { background: '#F1F5F9', color: '#475569' }}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {ALL.map(k => {
              const { label, desc, Icon, color } = FAMILY_PERMS[k];
              const on = form.permissions.includes(k);
              return (
                <button type="button" key={k} onClick={() => toggle(k)} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: on ? `${color}14` : '#F8FAFC', color: on ? color : '#CBD5E1' }}><Icon size={14} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold" style={{ color: on ? '#0F172A' : '#64748B' }}>{label}</span>
                    <span className="block text-[11.5px] text-slate-400">{desc}</span>
                  </span>
                  <span className="relative inline-flex w-9 h-5 rounded-full flex-shrink-0 transition-colors" style={{ background: on ? '#7C3AED' : '#E2E8F0' }}>
                    <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" style={{ left: on ? 18 : 2 }} />
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[11.5px] text-slate-400 mt-2">Always included: announcements, security alerts, personal safety and their own profile.</p>
        </div>
      </form>
    </SideBar>
  );
}


/* ── The manager's own household (Family Members page rail) ───────── */

export function MyHouseholdCard({ onChanged }) {
  const [data, setData] = useState(null);
  const [panel, setPanel] = useState(null); // 'add' | member
  const load = () => householdAPI.get().then(({ data }) => setData(data.data)).catch(() => setData({ members: [] }));
  useEffect(() => { load(); }, []);
  const changed = () => { load(); onChanged?.(); };

  const act = async (fn, msg) => {
    try { const { data } = await fn(); toast.success(msg || data.message); changed(); }
    catch (err) { toast.error(err.response?.data?.message || 'Something went wrong'); }
  };

  const members = data?.members || [];
  return (
    <div className="rounded-2xl bg-white border border-slate-200/70 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 pt-4 pb-3">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F59E0B, #F97316)' }}><Crown size={14} className="text-white" /></span>
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-semibold text-slate-900">My household</div>
          <div className="text-[11.5px] text-slate-400 truncate">{data?.unit ? `${data.unit.label} · ${data.unit.occupants}/${data.unit.maxOccupants}` : 'Your own family on AreaMates'}</div>
        </div>
        <button onClick={() => setPanel('add')} className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-1 rounded-lg text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100">
          <UserPlus size={12} /> Add
        </button>
      </div>
      {!data ? (
        <div className="px-5 pb-4"><div className="skeleton h-10 rounded-xl" /></div>
      ) : members.length === 0 ? (
        <p className="px-5 pb-4 text-[12px] text-slate-500 leading-relaxed">Live in the estate? Add your spouse, kids or house help so they get AreaMates too. You choose what each can use.</p>
      ) : (
        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {members.map(m => (
            <div key={m._id} className="group flex items-center gap-2.5 px-5 py-2.5" style={{ opacity: m.isActive ? 1 : 0.6 }}>
              <Initial p={m} size={30} />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold text-slate-900 truncate">{m.name}</div>
                <div className="text-[11px] text-slate-400 truncate">{m.relationship || 'Family'} · {!m.isActive ? 'Paused' : m.pendingFirstLogin ? 'Invite sent' : `${m.permissions.length} features`}</div>
              </div>
              <div className="flex items-center lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button title="Edit access" onClick={() => setPanel(m)} className="p-1.5 rounded-lg text-slate-400 hover:text-fuchsia-700 hover:bg-fuchsia-50"><Pencil size={13} /></button>
                {m.pendingFirstLogin && m.isActive && <button title="Resend invite" onClick={() => act(() => householdAPI.resendInvite(m._id))} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"><Send size={13} /></button>}
                <button title={m.isActive ? 'Pause' : 'Resume'} onClick={() => act(() => householdAPI.update(m._id, { isActive: !m.isActive }), m.isActive ? `${m.name.split(' ')[0]} paused` : `${m.name.split(' ')[0]} can sign in again`)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50">{m.isActive ? <PauseCircle size={13} /> : <PlayCircle size={13} />}</button>
                <button title="Remove" onClick={() => { if (window.confirm(`Remove ${m.name} from your household?`)) act(() => householdAPI.remove(m._id)); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {panel && (
        <AddFamilyPanel
          head={{ _id: 'me', self: true, name: 'You' }}
          member={panel === 'add' ? null : panel}
          onClose={() => setPanel(null)} onSaved={changed} />
      )}
    </div>
  );
}
