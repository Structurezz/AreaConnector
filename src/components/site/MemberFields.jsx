// Sector fields on a member (resident) account, shown when the site's modules
// call for them: hotel stays (check-in / check-out), staff shifts, staff ID /
// job title and a student's class. Used by the invite / add forms, the
// resident drawer and the full profile.
import { useEffect, useState } from 'react';
import { BedDouble, Clock, LogOut, CalendarPlus, Contact, Save } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import toast from 'react-hot-toast';
import { siteAPI } from '../../api';
import { useSite } from '../../context/SiteContext';
import { DAY_LABELS, STAY_STATE, stayStateOf } from '../../utils/siteTypes';

// ISO ↔ <input type="datetime-local">
export const toLocalInput = (d) => (d ? format(new Date(d), "yyyy-MM-dd'T'HH:mm") : '');
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);

// Default stay for a new guest: today 14:00 → tomorrow 12:00 (or now if later)
export function defaultStay() {
  const now = new Date();
  const inAt = new Date(now); inAt.setHours(14, 0, 0, 0);
  if (inAt < now) inAt.setTime(now.getTime());
  const outAt = new Date(now); outAt.setDate(outAt.getDate() + 1); outAt.setHours(12, 0, 0, 0);
  return { checkIn: toLocalInput(inAt), checkOut: toLocalInput(outAt) };
}

export const emptySector = () => ({
  stay: { checkIn: '', checkOut: '' },
  shift: { start: '', end: '', days: [] },
  memberProfile: { idNumber: '', title: '', className: '' },
});

// Which sector fields this site uses
export function useSectorConfig() {
  const site = useSite();
  return {
    stays: site.on('stays') && site.modules?.stays === true,
    shifts: site.modules?.shifts === true,
    // Schools and universities record a class / department & level
    school: site.type === 'school' || site.type === 'university',
    terms: site.terms,
    idLabel: site.terms.idLabel || 'Staff ID',
    classLabel: site.terms.classLabel || 'Class',
  };
}

// Body fields for POST /residents(/invite) and PATCH /site/members/:id
export function sectorPayload(v, cfg) {
  const out = {};
  if (cfg.stays && (v.stay.checkIn || v.stay.checkOut)) {
    out.stay = { checkIn: fromLocalInput(v.stay.checkIn), checkOut: fromLocalInput(v.stay.checkOut) };
  }
  if (cfg.shifts) {
    if (v.shift.start || v.shift.end || v.shift.days.length) out.shift = { ...v.shift };
    const mp = Object.fromEntries(Object.entries(v.memberProfile).filter(([, x]) => x?.trim()));
    if (Object.keys(mp).length) out.memberProfile = mp;
  } else if (cfg.school && v.memberProfile.className?.trim()) {
    out.memberProfile = { className: v.memberProfile.className.trim() };
  }
  return out;
}

// Returns an error message or null
export function sectorError(v, cfg, { requireStay = false } = {}) {
  if (cfg.stays) {
    if (requireStay && (!v.stay.checkIn || !v.stay.checkOut)) return 'Add the check-in and check-out dates';
    if (v.stay.checkIn && v.stay.checkOut && new Date(v.stay.checkOut) <= new Date(v.stay.checkIn)) return 'Check-out must be after check-in';
  }
  if (cfg.shifts && (v.shift.start || v.shift.end) && !(v.shift.start && v.shift.end)) return 'Add both shift start and end times';
  return null;
}

const label = 'text-xs font-semibold mb-1.5 block';
const labelStyle = { color: 'var(--text-sub)' };

export function DayChips({ value = [], onChange }) {
  return (
    <div className="flex flex-wrap gap-1">
      {DAY_LABELS.map((d, i) => {
        const on = value.includes(i);
        return (
          <button type="button" key={d} onClick={() => onChange(on ? value.filter(x => x !== i) : [...value, i].sort())}
            className="w-10 py-1 rounded-lg text-[11.5px] font-semibold border transition-all"
            style={on ? { background: '#EEF2FF', borderColor: '#818CF8', color: '#4338CA' } : { borderColor: '#E2E8F0', color: '#64748B', background: '#FFFFFF' }}>
            {d}
          </button>
        );
      })}
    </div>
  );
}

// The block of fields inside the invite / add forms
export function MemberSectorFields({ value, onChange, requireStay = false }) {
  const cfg = useSectorConfig();
  if (!cfg.stays && !cfg.shifts && !cfg.school) return null;
  const set = (group, k, x) => onChange({ ...value, [group]: { ...value[group], [k]: x } });
  return (
    <div className="space-y-4">
      {cfg.stays && (
        <div className="rounded-xl p-3 border border-teal-100" style={{ background: 'linear-gradient(135deg, #F0FDFA, #FFFFFF 70%)' }}>
          <p className="text-[12px] font-semibold text-teal-800 flex items-center gap-1.5 mb-2"><BedDouble size={13} /> Stay{requireStay ? ' *' : ''}</p>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={label} style={labelStyle}>Check-in</label>
              <input type="datetime-local" className="input-field text-sm" value={value.stay.checkIn} required={requireStay}
                onChange={e => set('stay', 'checkIn', e.target.value)} />
            </div>
            <div>
              <label className={label} style={labelStyle}>Check-out</label>
              <input type="datetime-local" className="input-field text-sm" value={value.stay.checkOut} required={requireStay}
                min={value.stay.checkIn || undefined}
                onChange={e => set('stay', 'checkOut', e.target.value)} />
            </div>
          </div>
          <p className="text-[11px] text-teal-700/70 mt-1.5">They can sign in from check-in and are signed out automatically at check-out.</p>
        </div>
      )}
      {cfg.school && (
        <div>
          <label className={label} style={labelStyle}>{cfg.classLabel} (students)</label>
          <input className="input-field" placeholder={cfg.terms.block ? 'e.g. Computer Science, 300L' : 'e.g. JSS 2B'} value={value.memberProfile.className}
            onChange={e => set('memberProfile', 'className', e.target.value)} />
        </div>
      )}
      {cfg.shifts && (
        <div className="rounded-xl p-3 border border-indigo-100" style={{ background: 'linear-gradient(135deg, #EEF2FF, #FFFFFF 70%)' }}>
          <p className="text-[12px] font-semibold text-indigo-800 flex items-center gap-1.5 mb-2"><Clock size={13} /> Staff details <span className="font-normal text-indigo-700/60">(optional)</span></p>
          <div className="grid grid-cols-2 gap-2.5">
            <input className="input-field text-sm" placeholder={cfg.idLabel} value={value.memberProfile.idNumber}
              onChange={e => set('memberProfile', 'idNumber', e.target.value)} />
            <input className="input-field text-sm" placeholder="Job title" value={value.memberProfile.title}
              onChange={e => set('memberProfile', 'title', e.target.value)} />
            <div>
              <label className="text-[11px] font-semibold mb-1 block text-slate-500">Shift starts</label>
              <input type="time" className="input-field text-sm" value={value.shift.start} onChange={e => set('shift', 'start', e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-semibold mb-1 block text-slate-500">Shift ends</label>
              <input type="time" className="input-field text-sm" value={value.shift.end} onChange={e => set('shift', 'end', e.target.value)} />
            </div>
          </div>
          <div className="mt-2.5"><DayChips value={value.shift.days} onChange={(d) => set('shift', 'days', d)} /></div>
        </div>
      )}
    </div>
  );
}

export function StayChip({ stay, className = '' }) {
  const s = stayStateOf(stay);
  if (s === 'none') return null;
  const st = STAY_STATE[s];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${className}`}
      style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}26` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />{st.label}
    </span>
  );
}

const fmtStay = (d) => (d ? format(new Date(d), 'EEE d MMM, HH:mm') : '—');

// Stay card for the resident drawer / profile: dates, extend, check out
export function StayCard({ member, onChanged }) {
  const cfg = useSectorConfig();
  const [stay, setStay] = useState(member.stay || {});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ checkIn: '', checkOut: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { setStay(member.stay || {}); setEditing(false); }, [member._id, member.stay]);
  if (!cfg.stays || member.householdRole === 'member') return null;
  const state = stayStateOf(stay);
  const has = state !== 'none';

  const startEdit = () => {
    setDraft({ checkIn: toLocalInput(stay.checkIn) || defaultStay().checkIn, checkOut: toLocalInput(stay.checkOut) || defaultStay().checkOut });
    setEditing(true);
  };
  const saveStay = async () => {
    if (!draft.checkIn || !draft.checkOut) { toast.error('Add both dates'); return; }
    if (new Date(draft.checkOut) <= new Date(draft.checkIn)) { toast.error('Check-out must be after check-in'); return; }
    setBusy(true);
    try {
      const { data } = await siteAPI.updateMember(member._id, { stay: { checkIn: fromLocalInput(draft.checkIn), checkOut: fromLocalInput(draft.checkOut) } });
      setStay(data.data?.stay || {});
      setEditing(false);
      toast.success(has ? 'Stay updated' : 'Stay added');
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the stay');
    } finally { setBusy(false); }
  };
  const checkOut = async () => {
    if (!window.confirm(`Check ${member.name} out now? They and their party are signed out, the ${cfg.terms.unit.toLowerCase()} is freed and open visitor passes are cancelled.`)) return;
    setBusy(true);
    try {
      const { data } = await siteAPI.checkOut(member._id);
      toast.success(data.message || 'Checked out');
      setStay(s => ({ ...s, status: 'checked_out' }));
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not check out');
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden" style={{ animation: 'dashRise 0.45s cubic-bezier(0.16,1,0.3,1) 100ms both' }}>
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100" style={{ background: 'linear-gradient(135deg, #F0FDFA, transparent 70%)' }}>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #14B8A6, #0D9488)', boxShadow: '0 4px 10px -4px #0D9488' }}>
          <BedDouble size={13} className="text-white" />
        </span>
        <span className="text-[13px] font-semibold text-slate-900 flex-1">Stay</span>
        <StayChip stay={stay} />
      </div>
      {editing ? (
        <div className="p-4 space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold mb-1 block text-slate-500">Check-in</label>
              <input type="datetime-local" className="input-field text-sm" value={draft.checkIn} onChange={e => setDraft(d => ({ ...d, checkIn: e.target.value }))} />
            </div>
            <div>
              <label className="text-[11px] font-semibold mb-1 block text-slate-500">Check-out</label>
              <input type="datetime-local" className="input-field text-sm" value={draft.checkOut} min={draft.checkIn || undefined} onChange={e => setDraft(d => ({ ...d, checkOut: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(false)} className="px-3 py-2 rounded-[9px] text-[12.5px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">Cancel</button>
            <button type="button" onClick={saveStay} disabled={busy}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[9px] px-3 py-2 text-[12.5px] font-semibold text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #14B8A6, #0D9488)' }}>
              <Save size={13} /> {busy ? 'Saving…' : 'Save stay'}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4">
          {has ? (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Check-in</div>
                <div className="text-[12.5px] font-semibold text-slate-900 mt-0.5">{fmtStay(stay.checkIn)}</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Check-out</div>
                <div className="text-[12.5px] font-semibold text-slate-900 mt-0.5">{fmtStay(stay.checkOut)}</div>
                {state === 'in_house' && stay.checkOut && <div className="text-[11px] text-teal-700 mt-0.5">in {formatDistanceToNowStrict(new Date(stay.checkOut))}</div>}
              </div>
            </div>
          ) : <p className="text-[12px] text-slate-500">No stay dates. Add them so access ends automatically at check-out.</p>}
          {state !== 'checked_out' ? (
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={startEdit} disabled={busy}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[9px] px-3 py-2 text-[12.5px] font-semibold text-teal-700 bg-teal-50 border border-teal-100 hover:bg-teal-100">
                <CalendarPlus size={13} /> {has ? 'Extend stay' : 'Add stay dates'}
              </button>
              {has && (
                <button type="button" onClick={checkOut} disabled={busy}
                  className="inline-flex items-center justify-center gap-1.5 rounded-[9px] px-3 py-2 text-[12.5px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 disabled:opacity-60">
                  <LogOut size={13} /> Check out
                </button>
              )}
            </div>
          ) : <p className="text-[11.5px] text-slate-400 mt-3">Checked out. To host them again, check them in as a new stay.</p>}
        </div>
      )}
    </div>
  );
}

// Staff ID / job title / class / shift card with inline edit
export function StaffCard({ member, onChanged }) {
  const cfg = useSectorConfig();
  const init = () => ({
    shift: { start: member.shift?.start || '', end: member.shift?.end || '', days: member.shift?.days || [] },
    memberProfile: { idNumber: member.memberProfile?.idNumber || '', title: member.memberProfile?.title || '', className: member.memberProfile?.className || '' },
  });
  const [cur, setCur] = useState(init);
  const [draft, setDraft] = useState(init);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { const v = init(); setCur(v); setDraft(v); setEditing(false); }, [member._id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!cfg.shifts && !cfg.school) return null;

  const save = async () => {
    if (cfg.shifts && (draft.shift.start || draft.shift.end) && !(draft.shift.start && draft.shift.end)) { toast.error('Add both shift start and end times'); return; }
    setBusy(true);
    try {
      const body = { memberProfile: cfg.shifts ? draft.memberProfile : { className: draft.memberProfile.className } };
      if (cfg.shifts) body.shift = draft.shift;
      const { data } = await siteAPI.updateMember(member._id, body);
      const f = data.data || {};
      const v = {
        shift: { start: f.shift?.start || '', end: f.shift?.end || '', days: f.shift?.days || [] },
        memberProfile: { idNumber: f.memberProfile?.idNumber || '', title: f.memberProfile?.title || '', className: f.memberProfile?.className || '' },
      };
      setCur(v); setDraft(v); setEditing(false);
      toast.success('Saved');
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally { setBusy(false); }
  };

  const facts = [
    cfg.school && [cfg.classLabel, cur.memberProfile.className],
    cfg.shifts && [cfg.idLabel, cur.memberProfile.idNumber],
    cfg.shifts && ['Job title', cur.memberProfile.title],
    cfg.shifts && ['Shift', cur.shift.start && cur.shift.end ? `${cur.shift.start}–${cur.shift.end}` : ''],
  ].filter(Boolean);
  const days = cur.shift.days.length ? cur.shift.days.map(d => DAY_LABELS[d]).join(' · ') : '';

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden" style={{ animation: 'dashRise 0.45s cubic-bezier(0.16,1,0.3,1) 110ms both' }}>
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100" style={{ background: 'linear-gradient(135deg, #EEF2FF, transparent 70%)' }}>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #818CF8, #6366F1)', boxShadow: '0 4px 10px -4px #6366F1' }}>
          <Contact size={13} className="text-white" />
        </span>
        <span className="text-[13px] font-semibold text-slate-900 flex-1">{cfg.shifts ? 'Role & shift' : cfg.classLabel}</span>
        {!editing && (
          <button type="button" onClick={() => { setDraft(cur); setEditing(true); }}
            className="text-[11.5px] font-semibold px-2 py-1 rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100">Edit</button>
        )}
      </div>
      {editing ? (
        <div className="p-4 space-y-2.5">
          {cfg.school && <input className="input-field text-sm" placeholder={`${cfg.classLabel} (students)`} value={draft.memberProfile.className} onChange={e => setDraft(d => ({ ...d, memberProfile: { ...d.memberProfile, className: e.target.value } }))} />}
          {cfg.shifts && (<>
            <div className="grid grid-cols-2 gap-2.5">
              <input className="input-field text-sm" placeholder={cfg.idLabel} value={draft.memberProfile.idNumber} onChange={e => setDraft(d => ({ ...d, memberProfile: { ...d.memberProfile, idNumber: e.target.value } }))} />
              <input className="input-field text-sm" placeholder="Job title" value={draft.memberProfile.title} onChange={e => setDraft(d => ({ ...d, memberProfile: { ...d.memberProfile, title: e.target.value } }))} />
              <input type="time" className="input-field text-sm" value={draft.shift.start} onChange={e => setDraft(d => ({ ...d, shift: { ...d.shift, start: e.target.value } }))} />
              <input type="time" className="input-field text-sm" value={draft.shift.end} onChange={e => setDraft(d => ({ ...d, shift: { ...d.shift, end: e.target.value } }))} />
            </div>
            <DayChips value={draft.shift.days} onChange={(x) => setDraft(d => ({ ...d, shift: { ...d.shift, days: x } }))} />
          </>)}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setEditing(false)} className="px-3 py-2 rounded-[9px] text-[12.5px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">Cancel</button>
            <button type="button" onClick={save} disabled={busy}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[9px] px-3 py-2 text-[12.5px] font-semibold text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
              <Save size={13} /> {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2.5">
            {facts.map(([l, v]) => (
              <div key={l} className="rounded-xl bg-slate-50 px-3 py-2 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{l}</div>
                <div className={`text-[12.5px] font-semibold truncate mt-0.5 ${v ? 'text-slate-900' : 'text-slate-300'}`}>{v || 'Not set'}</div>
              </div>
            ))}
          </div>
          {cfg.shifts && days && <p className="text-[11.5px] text-slate-500 mt-2">{days}</p>}
        </div>
      )}
    </div>
  );
}
