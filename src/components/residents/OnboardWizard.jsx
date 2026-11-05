// Separate onboarding for non-estate sites (site roles, GET /api/site roles[].form):
//   MemberWizard — patients / students / guests / employees, built only from
//                  the default role's form (unit, stay, ID, group, assigned
//                  staff), then an optional next of kin / parent / companion.
//   StaffWizard  — pick a staff role (doctor, nurse, teacher…), then that
//                  role's fields (unit they work in, staff ID, specialty,
//                  shift, on-call). Staff always get an app login.
// Side panel on desktop, sheet on phones (SitePanel).
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, MailPlus, UserPlus, Check, Smartphone, HeartHandshake } from 'lucide-react';
import { residentAPI } from '../../api';
import { useSite } from '../../context/SiteContext';
import SitePanel from '../site/SitePanel';
import UnitPicker from './UnitPicker';
import { AssignPicker, OnCallSwitch, roleColor, roleForm, roleIcon } from '../site/RoleFields';
import { DayChips, defaultStay, fromLocalInput, useSectorConfig } from '../site/MemberFields';
import { isValidEmail } from '../../utils/bulkImport';

const L = ({ children, req }) => <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sub)' }}>{children}{req ? ' *' : ''}</label>;

function Steps({ steps, at, color }) {
  return (
    <div className="flex items-center gap-2 px-5 pt-4">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2 min-w-0">
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={i <= at ? { background: color, color: '#fff' } : { background: '#F1F5F9', color: '#94A3B8' }}>
            {i < at ? <Check size={11} /> : i + 1}
          </span>
          <span className={`text-[12px] font-semibold truncate ${i === at ? 'text-slate-900' : 'text-slate-400'}`}>{s}</span>
          {i < steps.length - 1 && <span className="w-5 h-px bg-slate-200 flex-shrink-0" />}
        </div>
      ))}
    </div>
  );
}

// Find a just-invited member by email (the invite endpoint doesn't return the id)
async function findIdByEmail(email) {
  const { data } = await residentAPI.getAll({ search: email, limit: 5 });
  return (data.data || []).find(r => (r.email || '').toLowerCase() === email.toLowerCase())?._id;
}

export function MemberWizard({ open, onClose, units = [], onUnitCreated, onSaved }) {
  const site = useSite();
  const T = site.terms;
  const sector = useSectorConfig();
  const rf = roleForm(site, site.defaultRole);
  const f = rf.form;
  const def = rf.def;
  const color = roleColor(site, def.key);
  const relationships = site.relationships?.length ? site.relationships : ['Spouse', 'Parent', 'Child', 'Sibling', 'Relative', 'Other'];
  const kinLabel = f.kinLabel || T.family;
  const showStay = sector.stays && f.stay !== false;
  const steps = f.kin ? ['Details', kinLabel] : ['Details'];

  const blank = () => ({
    name: '', email: '', phone: '', unitId: '', noLogin: false, idNumber: '', group: '', assignedTo: [],
    stay: showStay ? defaultStay() : { checkIn: '', checkOut: '' },
  });
  const [v, setV] = useState(blank);
  const [kin, setKin] = useState({ name: '', email: '', phone: '', relationship: '' });
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setV(blank()); setKin({ name: '', email: '', phone: '', relationship: '' }); setStep(0); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open) return null;
  const set = (k, x) => setV(s => ({ ...s, [k]: x }));

  const detailsError = () => {
    if (!v.name.trim()) return 'Add their name';
    if (!v.noLogin && !isValidEmail(v.email.trim())) return f.emailOptional ? `Add their email, or switch on "Add without app access"` : 'Add a valid email address';
    if (!v.unitId) return `Choose their ${(f.unit || T.unit).toLowerCase()}`;
    if (showStay) {
      if (!v.stay.checkIn || !v.stay.checkOut) return `Add the ${sector.stayIn.toLowerCase()} and ${sector.stayOut.toLowerCase()} dates`;
      if (new Date(v.stay.checkOut) <= new Date(v.stay.checkIn)) return `${sector.stayOut} must be after ${sector.stayIn.toLowerCase()}`;
    }
    return null;
  };
  const kinFilled = kin.name.trim() || kin.email.trim() || kin.phone.trim();
  const kinError = () => {
    if (!kinFilled) return null;
    if (!kin.name.trim() || !isValidEmail(kin.email.trim())) return `Add the ${kinLabel.toLowerCase()}'s name and email, or leave this step empty`;
    return null;
  };

  const next = () => {
    const e = detailsError();
    if (e) { toast.error(e); return; }
    setStep(1);
  };

  const submit = async () => {
    const e = detailsError() || kinError();
    if (e) { toast.error(e); return; }
    if (v.noLogin && !kinFilled && f.kin && !window.confirm(`${v.name} won't have app access and has no ${kinLabel.toLowerCase()} yet. Add them anyway?`)) return;
    setSaving(true);
    try {
      const body = {
        name: v.name.trim(), phone: v.phone.trim(), unitId: v.unitId, siteRole: '',
        ...(v.noLogin ? { noLogin: true } : { email: v.email.trim() }),
      };
      const mp = {};
      if (f.id && v.idNumber.trim()) mp.idNumber = v.idNumber.trim();
      if (f.group && v.group.trim()) mp.className = v.group.trim();
      if (Object.keys(mp).length) body.memberProfile = mp;
      if (showStay) body.stay = { checkIn: fromLocalInput(v.stay.checkIn), checkOut: fromLocalInput(v.stay.checkOut) };
      if (rf.showAssign) body.assignedTo = v.assignedTo;

      let id;
      if (v.noLogin) {
        const { data } = await residentAPI.add(body);
        id = data.data?._id;
      } else {
        const { data } = await residentAPI.invite(body);
        id = data.data?._id;
        if (!id && kinFilled) id = await findIdByEmail(body.email).catch(() => null);
      }
      let msg = `${def.label} added`;
      if (kinFilled) {
        if (!id) toast.error(`${def.label} added, but we couldn't add the ${kinLabel.toLowerCase()} — add them from the profile`);
        else {
          try {
            await residentAPI.addFamily(id, { name: kin.name.trim(), email: kin.email.trim(), phone: kin.phone.trim(), relationship: kin.relationship, permissions: ['visitors', 'chat'] });
            msg = `${def.label} added and ${kinLabel.toLowerCase()} invited`;
          } catch (err) {
            toast.error(`${def.label} added, but the ${kinLabel.toLowerCase()} wasn't: ${err.response?.data?.message || 'try again from the profile'}`);
          }
        }
      }
      toast.success(msg);
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || `Could not add the ${def.label.toLowerCase()}`);
    } finally { setSaving(false); }
  };

  const last = step === steps.length - 1;
  return (
    <SitePanel title={`Add ${def.label.toLowerCase()}`} eyebrow={def.plural}
      subtitle={v.noLogin ? `No app login — their ${kinLabel.toLowerCase()} uses AreaMates.` : 'They get an AreaMates login by email.'}
      accent={[color, color]} onClose={onClose}
      footer={(
        <div className="flex gap-2">
          {step > 0
            ? <button type="button" onClick={() => setStep(0)} className="inline-flex items-center gap-1 px-4 py-2.5 rounded-[9px] text-[13px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"><ChevronLeft size={14} /> Back</button>
            : <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-[9px] text-[13px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">Cancel</button>}
          <button type="button" onClick={last ? submit : next} disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[9px] px-3 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}D0)` }}>
            {saving ? 'Saving…' : last ? <><UserPlus size={14} /> Add {def.label.toLowerCase()}</> : <>Next: {steps[1]} <ChevronRight size={14} /></>}
          </button>
        </div>
      )}>
      <Steps steps={steps} at={step} color={color} />
      {step === 0 ? (
        <div className="p-5 space-y-4">
          <div><L req>Full name</L><input className="input-field" value={v.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Amaka Johnson" /></div>
          {f.emailOptional && (
            <button type="button" role="switch" aria-checked={v.noLogin} onClick={() => set('noLogin', !v.noLogin)}
              className={`w-full flex items-start gap-3 text-left rounded-xl border p-3 transition-colors ${v.noLogin ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <span className={`mt-0.5 relative w-8 h-[18px] rounded-full flex-shrink-0 transition-colors ${v.noLogin ? 'bg-amber-500' : 'bg-slate-300'}`}>
                <span className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-all ${v.noLogin ? 'left-[16px]' : 'left-[2px]'}`} />
              </span>
              <span className="min-w-0">
                <span className="block text-[12.5px] font-semibold text-slate-900">Add without app access</span>
                <span className="block text-[11.5px] text-slate-500">Their {kinLabel.toLowerCase()} will use the app instead.</span>
              </span>
            </button>
          )}
          {!v.noLogin && (
            <div><L req>Email</L><input type="email" className="input-field" value={v.email} onChange={e => set('email', e.target.value)} placeholder="name@email.com" /></div>
          )}
          <div><L>Phone</L><input className="input-field" value={v.phone} onChange={e => set('phone', e.target.value)} placeholder="+234 …" /></div>
          <UnitPicker label={f.unit || T.unit} value={v.unitId} units={units} onChange={(unitId) => set('unitId', unitId)} onCreated={onUnitCreated} />
          {showStay && (
            <div className="rounded-xl p-3 border border-teal-100" style={{ background: 'linear-gradient(135deg, #F0FDFA, #FFFFFF 70%)' }}>
              <div className="grid grid-cols-2 gap-2.5">
                <div><L req>{sector.stayIn}</L><input type="datetime-local" className="input-field text-sm" value={v.stay.checkIn} onChange={e => set('stay', { ...v.stay, checkIn: e.target.value })} /></div>
                <div><L req>{sector.stayOut}</L><input type="datetime-local" className="input-field text-sm" value={v.stay.checkOut} min={v.stay.checkIn || undefined} onChange={e => set('stay', { ...v.stay, checkOut: e.target.value })} /></div>
              </div>
              <p className="text-[11px] text-teal-700/70 mt-1.5">Access ends automatically at {sector.stayOut.toLowerCase()}.</p>
            </div>
          )}
          {(f.id || f.group) && (
            <div className="grid grid-cols-2 gap-2.5">
              {f.id && <div className={f.group ? '' : 'col-span-2'}><L>{f.id}</L><input className="input-field" value={v.idNumber} onChange={e => set('idNumber', e.target.value)} /></div>}
              {f.group && <div className={f.id ? '' : 'col-span-2'}><L>{f.group}</L><input className="input-field" value={v.group} onChange={e => set('group', e.target.value)} /></div>}
            </div>
          )}
          {rf.showAssign && <AssignPicker value={v.assignedTo} onChange={(x) => set('assignedTo', x)} />}
        </div>
      ) : (
        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-fuchsia-100 p-3 flex gap-2.5" style={{ background: 'linear-gradient(135deg, #FDF4FF, #FFFFFF 70%)' }}>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #D946EF, #A855F7)' }}><HeartHandshake size={14} className="text-white" /></span>
            <p className="text-[12px] text-fuchsia-900/80">Optional. Their {kinLabel.toLowerCase()} gets their own AreaMates login to follow {v.name.split(' ')[0] || 'them'}, book visits and chat with staff. Never billed.</p>
          </div>
          <div><L>Full name</L><input className="input-field" value={kin.name} onChange={e => setKin(k => ({ ...k, name: e.target.value }))} /></div>
          <div><L>Email</L><input type="email" className="input-field" value={kin.email} onChange={e => setKin(k => ({ ...k, email: e.target.value }))} placeholder="name@email.com" /></div>
          <div className="grid grid-cols-2 gap-2.5">
            <div><L>Phone</L><input className="input-field" value={kin.phone} onChange={e => setKin(k => ({ ...k, phone: e.target.value }))} /></div>
            <div><L>Relationship</L>
              <select className="input-field" value={kin.relationship} onChange={e => setKin(k => ({ ...k, relationship: e.target.value }))}>
                <option value="">Choose…</option>
                {relationships.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
    </SitePanel>
  );
}

export function StaffWizard({ open, onClose, units = [], onUnitCreated, onSaved, initialRole }) {
  const site = useSite();
  const T = site.terms;
  const staffRoles = useMemo(() => (site.roles || []).filter(r => r.staff), [site.roles]);
  const [role, setRole] = useState('');
  const [step, setStep] = useState(0);
  const blank = () => ({ name: '', email: '', phone: '', unitId: '', idNumber: '', specialty: '', onCall: false, shift: { start: '', end: '', days: [] } });
  const [v, setV] = useState(blank);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setV(blank());
    setRole(initialRole || '');
    setStep(initialRole ? 1 : 0);
  }, [open, initialRole]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open) return null;

  const rf = role ? roleForm(site, role) : null;
  const f = rf?.form || {};
  const color = role ? roleColor(site, role) : '#6366F1';
  const set = (k, x) => setV(s => ({ ...s, [k]: x }));
  const unitLabel = rf?.unitLabel || T.unit;

  const submit = async () => {
    if (!v.name.trim()) { toast.error('Add their name'); return; }
    if (!isValidEmail(v.email.trim())) { toast.error('Staff need an email address to sign in'); return; }
    if (!v.unitId) { toast.error(`Choose the ${unitLabel.toLowerCase()}`); return; }
    if ((v.shift.start || v.shift.end) && !(v.shift.start && v.shift.end)) { toast.error('Add both shift start and end times'); return; }
    setSaving(true);
    try {
      const body = { name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim(), unitId: v.unitId, siteRole: role };
      const roleInfo = {};
      if (rf.showSpecialty) roleInfo.specialty = v.specialty.trim();
      if (rf.showOnCall) roleInfo.onCall = v.onCall;
      if (Object.keys(roleInfo).length) body.roleInfo = roleInfo;
      if (v.idNumber.trim()) body.memberProfile = { idNumber: v.idNumber.trim() };
      if (rf.showShift && (v.shift.start || v.shift.days.length)) body.shift = v.shift;
      const { data } = await residentAPI.invite(body);
      toast.success(data.message || `${rf.def.label} invited`);
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add them');
    } finally { setSaving(false); }
  };

  return (
    <SitePanel title={role ? `Add ${rf.def.label.toLowerCase()}` : 'Add staff'} eyebrow="Staff"
      subtitle={role ? 'They get an AreaMates staff login by email.' : 'What do they do here?'}
      accent={[color, color]} onClose={onClose}
      footer={step === 1 ? (
        <div className="flex gap-2">
          <button type="button" onClick={() => setStep(0)} className="inline-flex items-center gap-1 px-4 py-2.5 rounded-[9px] text-[13px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"><ChevronLeft size={14} /> Role</button>
          <button type="button" onClick={submit} disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[9px] px-3 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}D0)` }}>
            <MailPlus size={14} /> {saving ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      ) : null}>
      <Steps steps={['Role', 'Details']} at={step} color={color} />
      {step === 0 ? (
        <div className="p-5 grid grid-cols-2 gap-2.5">
          {staffRoles.map((r, i) => {
            const Icon = roleIcon(r.key);
            const c = roleColor(site, r.key);
            const extras = [r.onCall && 'On call', r.responds?.length && 'Gets alerts', r.assignable && site.assignLabel && `${site.assignLabel}`].filter(Boolean);
            return (
              <button type="button" key={r.key} onClick={() => { setRole(r.key); setStep(1); }}
                className="dash-rise text-left rounded-2xl border p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-card-md"
                style={{ animationDelay: `${40 + i * 40}ms`, background: `linear-gradient(140deg, ${c}17 0%, #FFFFFF 60%)`, borderColor: role === r.key ? c : `${c}2E` }}>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${c}, ${c}CC)`, boxShadow: `0 6px 14px -6px ${c}` }}>
                  <Icon size={16} className="text-white" />
                </span>
                <div className="mt-2.5 text-[13.5px] font-semibold text-slate-900">{r.label}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{extras.join(' · ') || 'Staff login'}</div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="p-5 space-y-4">
          <div><L req>Full name</L><input className="input-field" value={v.name} onChange={e => set('name', e.target.value)} placeholder={role === 'doctor' ? 'e.g. Dr Ade Bello' : 'e.g. Amaka Johnson'} /></div>
          <div><L req>Email</L><input type="email" className="input-field" value={v.email} onChange={e => set('email', e.target.value)} placeholder="name@email.com" />
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1"><Smartphone size={11} /> They sign in to AreaMates with this email.</p></div>
          <div><L>Phone</L><input className="input-field" value={v.phone} onChange={e => set('phone', e.target.value)} placeholder="+234 …" /></div>
          <UnitPicker label={unitLabel} value={v.unitId} units={units} onChange={(unitId) => set('unitId', unitId)} onCreated={onUnitCreated} />
          <div className="grid grid-cols-2 gap-2.5">
            <div className={rf.showSpecialty ? '' : 'col-span-2'}><L>{f.id || 'Staff ID'}</L><input className="input-field" value={v.idNumber} onChange={e => set('idNumber', e.target.value)} /></div>
            {rf.showSpecialty && <div><L>{rf.specialtyLabel}</L><input className="input-field" value={v.specialty} onChange={e => set('specialty', e.target.value)} placeholder={rf.specialtyLabel === 'Subject' ? 'e.g. Mathematics' : role === 'doctor' ? 'e.g. Cardiology' : ''} /></div>}
          </div>
          {rf.showShift && (
            <div className="rounded-xl p-3 border border-indigo-100" style={{ background: 'linear-gradient(135deg, #EEF2FF, #FFFFFF 70%)' }}>
              <p className="text-[12px] font-semibold text-indigo-800 mb-2">Shift <span className="font-normal text-indigo-700/60">(optional — guards check it at the gate)</span></p>
              <div className="grid grid-cols-2 gap-2.5">
                <div><label className="text-[11px] font-semibold mb-1 block text-slate-500">Starts</label><input type="time" className="input-field text-sm" value={v.shift.start} onChange={e => set('shift', { ...v.shift, start: e.target.value })} /></div>
                <div><label className="text-[11px] font-semibold mb-1 block text-slate-500">Ends</label><input type="time" className="input-field text-sm" value={v.shift.end} onChange={e => set('shift', { ...v.shift, end: e.target.value })} /></div>
              </div>
              <div className="mt-2.5"><DayChips value={v.shift.days} onChange={(d) => set('shift', { ...v.shift, days: d })} /></div>
            </div>
          )}
          {rf.showOnCall && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold text-slate-900">On call now</div>
                <div className="text-[11.5px] text-slate-500">On-call staff get emergencies from the whole {T.site.toLowerCase()}.</div>
              </div>
              <OnCallSwitch on={v.onCall} onChange={(x) => set('onCall', x)} />
            </div>
          )}
        </div>
      )}
    </SitePanel>
  );
}
