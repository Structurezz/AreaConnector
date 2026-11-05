// Settings → "Site type & features": the site type (estate / school / hotel /
// industrial / hospital), which modules are on, the contractor induction text
// and hospital visiting hours. Saves with PATCH /api/site.
import { useEffect, useState } from 'react';
import {
  Layers, CreditCard, ShoppingBag, Music, CalendarDays, PhoneCall, Users, Truck, Clock, BedDouble,
  HeartPulse, RotateCcw, AlertTriangle, HardHat, Save, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { siteAPI } from '../../api';
import { useSite } from '../../context/SiteContext';
import SiteTypePicker from './SiteTypePicker';
import { MODULES, DEFAULT_MODULES, TERMS, TYPE_INFO, CATEGORY_INFO, PASS_CATEGORIES } from '../../utils/siteTypes';

const MODULE_LOOK = {
  payments:    { Icon: CreditCard,   color: '#10B981' },
  marketplace: { Icon: ShoppingBag,  color: '#F59E0B' },
  community:   { Icon: Music,        color: '#8B5CF6' },
  events:      { Icon: CalendarDays, color: '#EC4899' },
  neighbours:  { Icon: PhoneCall,    color: '#0EA5E9' },
  household:   { Icon: Users,        color: '#A855F7' },
  gatelog:     { Icon: Truck,        color: '#F97316' },
  shifts:      { Icon: Clock,        color: '#6366F1' },
  stays:       { Icon: BedDouble,    color: '#14B8A6' },
  visiting:    { Icon: HeartPulse,   color: '#EF4444' },
};

function Switch({ on, onClick, color, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={!!on} onClick={onClick} disabled={disabled}
      className="relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0 disabled:opacity-50"
      style={{ background: on ? color : '#E2E8F0' }}>
      <span className="absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform"
        style={{ transform: on ? 'translateX(18px)' : 'translateX(0)' }} />
    </button>
  );
}

export default function SiteFeaturesSection({ Section }) {
  const site = useSite();
  const [pendingType, setPendingType] = useState(null);
  const [busy, setBusy] = useState(null); // 'type' | module key | 'induction' | 'visiting'
  const [induction, setInduction] = useState(site.inductionText || '');
  const [hours, setHours] = useState(site.visitingHours || { start: '10:00', end: '20:00', maxPerPatient: 0 });

  useEffect(() => { setInduction(site.inductionText || ''); }, [site.inductionText]);
  useEffect(() => { setHours(site.visitingHours || { start: '10:00', end: '20:00', maxPerPatient: 0 }); }, [site.visitingHours]);

  const catalogModules = site.catalog?.modules || MODULES;
  const defaults = site.catalog?.types?.find(t => t.key === site.type)?.modules || DEFAULT_MODULES[site.type] || {};
  const overrides = site.overrides || {};

  const save = async (body, key, okMsg) => {
    setBusy(key);
    try {
      const { data } = await siteAPI.update(body);
      site.setSite(prev => ({ ...prev, ...data.data }));
      if (okMsg) toast.success(okMsg);
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const confirmType = async () => {
    const t = pendingType;
    const ok = await save({ type: t }, 'type', `Switched to ${(TYPE_INFO[t].short || TYPE_INFO[t].label).toLowerCase()}`);
    if (ok) setPendingType(null);
  };

  const hasInductionCats = (site.passCategories || []).some(c => c.induction || CATEGORY_INFO[c.key]?.induction);
  const showInduction = hasInductionCats || ['industrial', 'school', 'hospital'].includes(site.type) || site.on('gatelog');
  const showVisiting = site.on('visiting');
  const isHospital = site.type === 'hospital';
  const hoursTitle = site.type === 'university' ? 'Hostel visiting hours' : 'Visiting hours';
  const inductionDirty = (induction || '') !== (site.inductionText || '');
  const v0 = site.visitingHours || {};
  const hoursDirty = hours.start !== v0.start || hours.end !== v0.end || Number(hours.maxPerPatient || 0) !== Number(v0.maxPerPatient || 0);

  // What changes if the manager picks pendingType
  const preview = pendingType && (() => {
    const next = site.catalog?.types?.find(x => x.key === pendingType)?.modules || DEFAULT_MODULES[pendingType];
    const on = Object.keys(MODULES).filter(k => next[k]).map(k => MODULES[k].label);
    const off = Object.keys(MODULES).filter(k => !next[k]).map(k => MODULES[k].label);
    return { on, off, terms: TERMS[pendingType] };
  })();

  return (
    <Section id="site" icon={Layers} color="#14B8A6" delay={100}
      title="Site type & features"
      desc={`AreaConnect runs estates, schools, universities, hotels, industrial sites and hospitals. The type sets the words your team and ${site.terms.members.toLowerCase()} see and which features start switched on.`}>
      <div className="space-y-5">
        <SiteTypePicker value={pendingType || site.type} disabled={busy === 'type'}
          onChange={(k) => setPendingType(k === site.type ? null : k)} />

        {preview && (
          <div className="rounded-2xl border border-amber-200 p-4" style={{ background: 'linear-gradient(135deg, #FFFBEB, #FFFFFF 70%)', animation: 'dashRise 0.35s cubic-bezier(0.16,1,0.3,1) both' }}>
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0"><AlertTriangle size={15} /></span>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-semibold text-amber-900">Switch to {(TYPE_INFO[pendingType].short || TYPE_INFO[pendingType].label).toLowerCase()}?</p>
                <p className="text-[12.5px] text-amber-800/90 mt-0.5 leading-relaxed">
                  Everyone will see <b>{preview.terms.members}</b>, <b>{preview.terms.units}</b> and <b>{preview.terms.familyPlural}</b>.
                  Features reset to the {(TYPE_INFO[pendingType].short || TYPE_INFO[pendingType].label).toLowerCase()} defaults and any features you switched on or off by hand are cleared.
                  Your people, {site.terms.units.toLowerCase()} and history stay as they are.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {preview.on.map(l => <span key={l} className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">{l}</span>)}
                  {preview.off.map(l => <span key={l} className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-400 line-through">{l}</span>)}
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={confirmType} disabled={busy === 'type'}
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-2 rounded-lg text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60">
                    <Check size={13} /> {busy === 'type' ? 'Switching…' : 'Switch type'}
                  </button>
                  <button type="button" onClick={() => setPendingType(null)}
                    className="text-[12.5px] font-semibold px-3 py-2 rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modules */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Features</p>
            <p className="text-[11px] text-slate-400">Visitor passes, announcements, alerts and chat are always on</p>
          </div>
          <div className="grid gap-2.5 md:grid-cols-2">
            {Object.keys(catalogModules).map((k, i) => {
              const { label, description } = catalogModules[k];
              const { Icon, color } = MODULE_LOOK[k] || { Icon: Layers, color: '#64748B' };
              const on = site.modules?.[k] !== false;
              const overridden = typeof overrides[k] === 'boolean';
              return (
                <div key={k} className="dash-rise flex items-start gap-3 rounded-xl border p-3 transition-colors"
                  style={{ animationDelay: `${i * 30}ms`, borderColor: on ? `${color}40` : '#E2E8F0', background: on ? `linear-gradient(135deg, ${color}0F, #FFFFFF 70%)` : '#FFFFFF' }}>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                    style={on ? { background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 14px -6px ${color}` } : { background: '#F1F5F9' }}>
                    <Icon size={14} className={on ? 'text-white' : 'text-slate-400'} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[13px] font-semibold" style={{ color: on ? '#0F172A' : '#64748B' }}>{label}</span>
                      {overridden ? (
                        <button type="button" onClick={() => save({ modules: { [k]: null } }, k, `${label} reset to the default`)} disabled={busy === k}
                          title={`Default for this type: ${defaults[k] ? 'on' : 'off'}`}
                          className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100">
                          <RotateCcw size={9} /> Reset
                        </button>
                      ) : (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-400">Default</span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-slate-500 leading-snug mt-0.5">{description}</p>
                    {overridden && <p className="text-[10.5px] text-slate-400 mt-0.5">Default for {(TYPE_INFO[site.type]?.short || TYPE_INFO[site.type]?.label || '').toLowerCase()}: {defaults[k] ? 'on' : 'off'}</p>}
                  </div>
                  <Switch on={on} color={color} disabled={busy === k || busy === 'type'}
                    onClick={() => save({ modules: { [k]: !on } }, k, `${label} ${on ? 'switched off' : 'switched on'}`)} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Induction */}
        {showInduction && (
          <div className="rounded-2xl border border-orange-100 p-4" style={{ background: 'linear-gradient(135deg, #FFF7ED, #FFFFFF 65%)' }}>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}><HardHat size={13} className="text-white" /></span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-900">Safety induction</p>
                <p className="text-[11.5px] text-slate-500">Guards show this to {(PASS_CATEGORIES[site.type] || []).filter(c => CATEGORY_INFO[c]?.induction).map(c => CATEGORY_INFO[c].label.toLowerCase() + 's').join(' and ') || 'contractors and suppliers'} at check-in; the visitor must accept it before entry. Leave empty to skip.</p>
              </div>
            </div>
            <textarea rows={4} value={induction} onChange={e => setInduction(e.target.value)} maxLength={4000}
              placeholder="e.g. Wear a hard hat and hi-vis vest at all times. Report to the site office before starting work. No smoking on site."
              className="w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 resize-y" />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-slate-400 tabular-nums">{induction.length}/4000</span>
              <button type="button" disabled={!inductionDirty || busy === 'induction'}
                onClick={() => save({ inductionText: induction }, 'induction', 'Induction saved')}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-2 rounded-lg text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
                <Save size={13} /> {busy === 'induction' ? 'Saving…' : 'Save induction'}
              </button>
            </div>
          </div>
        )}

        {/* Visiting hours */}
        {showVisiting && (
          <div className="rounded-2xl border border-rose-100 p-4" style={{ background: 'linear-gradient(135deg, #FFF1F2, #FFFFFF 65%)' }}>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F43F5E, #E11D48)' }}><HeartPulse size={13} className="text-white" /></span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-900">{hoursTitle}</p>
                <p className="text-[11.5px] text-slate-500">{isHospital
                  ? 'Guards are warned when a visitor arrives outside these hours or a patient already has the maximum visitors; they can let them in with a reason.'
                  : 'Guards are warned when a visitor arrives outside these hours; they can let them in with a reason.'}</p>
              </div>
            </div>
            <div className={`grid gap-2.5 ${isHospital ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {[['start', 'Opens'], ['end', 'Closes']].map(([k, l]) => (
                <label key={k} className="block">
                  <span className="text-[11px] font-semibold text-slate-500 mb-1 block">{l}</span>
                  <input type="time" value={hours[k] || ''} onChange={e => setHours(h => ({ ...h, [k]: e.target.value }))}
                    className="w-full rounded-xl px-3 py-2 text-[13px] outline-none bg-white border border-slate-200 focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10" />
                </label>
              ))}
              {isHospital && <label className="block">
                <span className="text-[11px] font-semibold text-slate-500 mb-1 block">Max per patient</span>
                <input type="number" min={0} max={50} value={hours.maxPerPatient ?? 0} onChange={e => setHours(h => ({ ...h, maxPerPatient: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 text-[13px] outline-none bg-white border border-slate-200 focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10" />
              </label>}
            </div>
            <div className="flex items-center justify-between mt-2.5">
              <span className="text-[11px] text-slate-400">{isHospital ? '0 = no limit on visitors per patient' : ''}</span>
              <button type="button" disabled={!hoursDirty || busy === 'visiting'}
                onClick={() => save({ visitingHours: { start: hours.start, end: hours.end, maxPerPatient: Number(hours.maxPerPatient) || 0 } }, 'visiting', `${hoursTitle} saved`)}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-2 rounded-lg text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #F43F5E, #E11D48)' }}>
                <Save size={13} /> {busy === 'visiting' ? 'Saving…' : 'Save hours'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}
