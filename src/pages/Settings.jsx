import AddressAutocomplete from '../components/ui/AddressAutocomplete';
import { useEffect, useRef, useState } from 'react';
import openConstitution from '../utils/openConstitution';
import { estateAPI, authAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import Spinner, { PageLoader } from '../components/ui/Spinner';
import ProfileCard from '../components/ProfileCard';
import {
  Settings2, Save, ScrollText, Upload, FileText, Trash2, Download, Sparkles, MapPin, Building2,
  CheckCircle2, KeyRound, Lock, ShieldCheck, ChevronRight, UsersRound, User as UserIcon, Copy,
  Eye, EyeOff, Store, MessagesSquare, UserCheck, AlertCircle, RotateCcw, Check, Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { hasArea } from '../utils/teamAccess';
import { useSite } from '../context/SiteContext';
import SiteFeaturesSection from '../components/site/SiteFeaturesSection';
import { Layers } from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const PREF_KEYS = ['requireVisitorApproval', 'marketplaceApproval', 'householdApproval', 'allowGuestChat'];

const inputCls = 'w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10';

function IconChip({ icon: Icon, color, size = 36 }) {
  return (
    <span className="rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 14px -6px ${color}` }}>
      <Icon size={Math.round(size * 0.45)} className="text-white" />
    </span>
  );
}

function Section({ id, icon, color, title, desc, badge, children, delay = 0 }) {
  return (
    <section id={id} className="glass-card p-5 scroll-mt-6"
             style={{ animation: `dashRise 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms both` }}>
      <div className="flex items-start gap-3 mb-4">
        <IconChip icon={icon} color={color} />
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
          {desc && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>}
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}

function Badge({ icon: Icon, color, children, title }) {
  return (
    <span title={title} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full flex-shrink-0"
          style={{ background: `${color}1A`, color }}>
      {Icon && <Icon size={10} />} {children}
    </span>
  );
}

function Toggle({ on, onClick, color = '#10B981' }) {
  return (
    <button type="button" role="switch" aria-checked={!!on} onClick={onClick}
            className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
            style={{ background: on ? color : '#E2E8F0' }}>
      <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
            style={{ transform: on ? 'translateX(1.25rem)' : 'translateX(0)' }} />
    </button>
  );
}

function pwStrength(p) {
  if (!p) return { score: 0, label: '', color: '#E2E8F0' };
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  if (p.length < 6) s = 0;
  return [
    { score: 1, label: 'Too weak', color: '#EF4444' },
    { score: 1, label: 'Weak', color: '#F97316' },
    { score: 2, label: 'Fair', color: '#F59E0B' },
    { score: 3, label: 'Good', color: '#10B981' },
    { score: 4, label: 'Strong', color: '#059669' },
  ][s];
}

// Name placeholder per site type (estates keep "e.g. Sunrise Estate")
const NAME_EXAMPLE = {
  estate: 'e.g. Sunrise Estate', school: 'e.g. Sunrise College', university: 'e.g. Sunrise University',
  hotel: 'e.g. Sunrise Hotel', industrial: 'e.g. Sunrise Industrial Park', hospital: 'e.g. Sunrise Hospital',
};

export default function ManagerSettings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [estate, setEstate] = useState(null);
  const [settings, setSettings] = useState({
    requireVisitorApproval: false,
    marketplaceApproval: false,
    householdApproval: false,
    allowGuestChat: true,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState('profile');

  // Change password
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const mustReset = user?.mustChangePassword;
  // Invited team members without Settings access only see their profile + password
  const canManage = hasArea(user, 'settings');
  const site = useSite();
  const T = site.terms;
  const siteWord = T.site.toLowerCase();

  const submitPw = async () => {
    if (!pw.next || pw.next.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (pw.next !== pw.confirm)         { toast.error('Passwords don\'t match'); return; }
    if (!mustReset && !pw.current)       { toast.error('Enter your current password'); return; }
    setPwSaving(true);
    try {
      await authAPI.changePassword({ currentPassword: pw.current, newPassword: pw.next });
      toast.success('Password changed — please sign in again');
      setPw({ current: '', next: '', confirm: '' });
      try { await logout?.(); } catch {}
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not change password');
    } finally { setPwSaving(false); }
  };

  // Editable estate info (name + address)
  const [infoDraft, setInfoDraft] = useState({ name: '', address: '' });
  // Google suggestion picked for the address (exact pin, no re-geocoding)
  const [pickedPlace, setPickedPlace] = useState(null);
  const [infoSaving, setInfoSaving] = useState(false);
  const [constitution, setConstitution] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const estateId = user?.estateId?._id || user?.estateId;

  const loadConstitution = () => {
    if (!estateId) return;
    estateAPI.getConstitutionMeta(estateId)
      .then(({ data }) => setConstitution(data.data))
      .catch(() => setConstitution({ hasConstitution: false }));
  };

  useEffect(() => {
    if (!estateId) return;
    estateAPI.getOne(estateId).then(({ data }) => {
      setEstate(data.data);
      setSettings(data.data.settings || {});
      setInfoDraft({ name: data.data.name || '', address: data.data.address || '' });
    }).catch(console.error).finally(() => setLoading(false));
    loadConstitution();
  }, [estateId]);

  // Highlight the section currently in view in the side nav
  useEffect(() => {
    if (loading) return;
    const els = document.querySelectorAll('[data-settings-root] section[id]');
    const io = new IntersectionObserver((entries) => {
      const hit = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (hit) setActive(hit.target.id);
    }, { rootMargin: '-15% 0px -65% 0px' });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [loading, canManage]);

  const handleUpload = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are allowed');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('File too large — max 15MB');
      return;
    }
    setUploading(true);
    try {
      await estateAPI.uploadConstitution(estateId, file);
      toast.success('Constitution uploaded — AI court now grounded on it');
      loadConstitution();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(site.isEstate ? 'Remove the estate constitution? The AI judge and lawyers will fall back to generic reasoning.' : `Remove the ${siteWord} constitution? The AI judge and lawyers will fall back to generic reasoning.`)) return;
    try {
      await estateAPI.deleteConstitution(estateId);
      toast.success('Constitution removed');
      loadConstitution();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove');
    }
  };

  const savedSettings = estate?.settings || {};
  const prefsDirty = PREF_KEYS.some(k => !!settings[k] !== !!savedSettings[k]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await estateAPI.update(estate._id, { settings });
      setEstate(e => ({ ...e, settings: { ...(e?.settings || {}), ...settings } }));
      toast.success('Settings saved');
    } catch { toast.error('Failed'); } finally { setSaving(false); }
  };

  // ── Save estate info (name + address). Backend geocodes on address change
  // whenever GOOGLE_MAPS_API_KEY is set, so the pin updates automatically.
  const infoDirty = (
    (infoDraft.name    || '').trim() !== (estate?.name    || '').trim() ||
    (infoDraft.address || '').trim() !== (estate?.address || '').trim()
  );

  const handleSaveInfo = async () => {
    const name = (infoDraft.name || '').trim();
    const address = (infoDraft.address || '').trim();
    if (!name)    { toast.error(site.isEstate ? 'Estate name is required' : `${T.site} name is required`); return; }
    if (!address) { toast.error('Address is required'); return; }
    setInfoSaving(true);
    try {
      const addressChanged = address !== (estate?.address || '').trim();
      const exact = pickedPlace && pickedPlace.lat != null && pickedPlace.address === address;
      const { data } = await estateAPI.update(estate._id, {
        name, address,
        ...(exact && addressChanged && { location: { lat: pickedPlace.lat, lng: pickedPlace.lng, formattedAddress: pickedPlace.address, placeId: pickedPlace.placeId } }),
      });
      setPickedPlace(null);
      setEstate(data.data);
      setInfoDraft({ name: data.data.name || '', address: data.data.address || '' });
      // Backend reports what happened with Google geocoding
      const outcome = data.geocode;
      if (addressChanged) {
        if (outcome === 'success' || outcome === 'manual') {
          toast.success('Address saved and pin updated on the map');
        } else if (outcome === 'failed') {
          toast('Address saved. We couldn\'t find a map pin — try adding more detail (street, city).', { icon: '⚠️' });
        } else if (outcome === 'not_configured') {
          toast('Address saved. Google Maps isn\'t configured on the server, so the pin didn\'t update.', { icon: '⚠️' });
        } else {
          toast.success('Address saved');
        }
      } else {
        toast.success(site.isEstate ? 'Estate info saved' : `${T.site} info saved`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || (site.isEstate ? 'Failed to save estate info' : `Failed to save ${siteWord} info`));
    } finally {
      setInfoSaving(false);
    }
  };

  const copyCode = () => {
    if (!estate?.estateCode) return;
    navigator.clipboard?.writeText(estate.estateCode)
      .then(() => toast.success('Invite code copied'))
      .catch(() => toast.error('Could not copy'));
  };

  const jumpTo = (id) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) return <PageLoader />;

  const toggles = [
    { key: 'requireVisitorApproval', icon: UserCheck,      color: '#0EA5E9', label: 'Require visitor approval', desc: 'All visitor pre-registrations require manager approval before the code is sent.' },
    site.on('marketplace') && { key: 'marketplaceApproval',    icon: Store,          color: '#F59E0B', label: 'Marketplace approval',     desc: 'All marketplace listings require manager approval before going live.' },
    site.on('household') && { key: 'householdApproval',      icon: Users,          color: '#A855F7', label: `Approve ${T.familyPlural.toLowerCase()}`,   desc: site.isEstate ? 'When residents add family to their home, you approve each person before their invite is sent. Off: invites go out automatically.' : `When ${T.members.toLowerCase()} add ${T.familyPlural.toLowerCase()}, you approve each person before their invite is sent. Off: invites go out automatically.` },
    { key: 'allowGuestChat',         icon: MessagesSquare, color: '#8B5CF6', label: 'Allow community chat',     desc: `${T.members} can message each other in the ${siteWord} group chat.` },
  ].filter(Boolean);

  const nav = [
    { id: 'profile',      label: 'My profile',     icon: UserIcon,   color: '#10B981' },
    canManage && { id: 'estate',       label: `${T.site} info`,    icon: Building2,  color: '#0D9488' },
    canManage && { id: 'site',         label: 'Site type & features', icon: Layers, color: '#14B8A6' },
    canManage && { id: 'preferences',  label: 'Preferences',    icon: Settings2,  color: '#0EA5E9' },
    canManage && site.on('community') && { id: 'constitution', label: 'Constitution',   icon: ScrollText, color: '#EC4899' },
    { id: 'security',     label: 'Password',       icon: KeyRound,   color: '#6366F1' },
    canManage && { id: 'access',       label: 'Team & access',  icon: UsersRound, color: '#F59E0B' },
  ].filter(Boolean);

  const geocoded = !!(estate?.location?.lat && estate?.location?.lng);
  const strength = pwStrength(pw.next);
  const pwMatch = pw.confirm && pw.next === pw.confirm;
  const enabledCount = PREF_KEYS.filter(k => savedSettings[k]).length;

  return (
    <div data-settings-root className="max-w-6xl animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900" style={{ letterSpacing: '-0.02em' }}>Settings</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Manage your profile, {siteWord} details and how AreaConnect behaves for your {T.members.toLowerCase()}.</p>
        </div>
      </div>

      {/* ── Estate identity strip ─────────────────────────────────── */}
      {estate && (
        <div className="relative overflow-hidden rounded-2xl p-5 mb-6 border border-emerald-100"
             style={{ background: 'linear-gradient(120deg, #ECFDF5 0%, #F0FDFA 45%, #EFF6FF 100%)', animation: 'dashRise 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>
          <div className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full opacity-40"
               style={{ background: 'radial-gradient(circle, #6EE7B7, transparent 70%)', animation: 'dashFloat 14s ease-in-out infinite' }} />
          <div className="relative flex flex-wrap items-center gap-4">
            <span className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #10B981, #047857)', boxShadow: '0 10px 22px -10px #047857' }}>
              {(estate.name || '?')[0]?.toUpperCase()}
            </span>
            <div className="flex-1 min-w-[200px]">
              <h2 className="text-[17px] font-semibold text-slate-900 truncate">{estate.name}</h2>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                <MapPin size={11} className="text-emerald-600 flex-shrink-0" /> {estate.address || 'No address yet'}
              </p>
            </div>
            <button type="button" onClick={copyCode}
                    className="group flex items-center gap-2 rounded-xl px-3 py-2 bg-white/80 border border-emerald-200 hover:border-emerald-400 hover:-translate-y-0.5 transition-all"
                    title="Copy invite code">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Invite code</span>
              <span className="font-mono font-semibold text-sm text-emerald-700">{estate.estateCode || '—'}</span>
              <Copy size={13} className="text-emerald-500 group-hover:text-emerald-700" />
            </button>
          </div>
          <div className="relative flex flex-wrap gap-2 mt-4">
            {[
              { ok: geocoded, on: 'Map pin set', off: 'No map pin', icon: MapPin },
              { ok: !!constitution?.hasConstitution, on: 'Constitution uploaded', off: 'No constitution', icon: ScrollText },
              { ok: enabledCount > 0, on: `${enabledCount} of ${PREF_KEYS.length} controls on`, off: 'All controls off', icon: Settings2 },
            ].map(({ ok, on, off, icon: I }) => (
              <span key={on} className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/80 border"
                    style={{ borderColor: ok ? '#A7F3D0' : '#FDE68A', color: ok ? '#047857' : '#B45309' }}>
                {ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                <I size={11} className="opacity-60" /> {ok ? on : off}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
        {/* ── Side nav ─────────────────────────────────────────────── */}
        <aside className="hidden lg:block">
          <nav className="sticky top-0 space-y-1">
            <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">On this page</p>
            {nav.map(({ id, label, icon: I, color }) => {
              const on = active === id;
              return (
                <button key={id} type="button" onClick={() => jumpTo(id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all text-left ${on ? 'bg-white shadow-card text-slate-900' : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'}`}>
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        style={on ? { background: `linear-gradient(135deg, ${color}, ${color}CC)`, color: '#fff', boxShadow: `0 4px 10px -4px ${color}` }
                                  : { background: `${color}14`, color }}>
                    <I size={14} />
                  </span>
                  {label}
                  {on && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Sections ─────────────────────────────────────────────── */}
        <div className="space-y-5 min-w-0">
          <section id="profile" className="scroll-mt-6" style={{ animation: 'dashRise 0.5s cubic-bezier(0.16,1,0.3,1) 40ms both' }}>
            <ProfileCard />
          </section>

          {canManage && (<>
          {/* Estate info — editable */}
          <Section id="estate" icon={Building2} color="#0D9488" delay={80}
            title={`${T.site} information`}
            desc={`Keep your ${siteWord} name and address up to date. The map pin is re-generated automatically from the address.`}
            badge={geocoded && <Badge icon={CheckCircle2} color="#059669" title="This address has a verified Google Maps pin.">Geocoded</Badge>}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold mb-1.5 block text-slate-600">{T.site} name</label>
                <input className={inputCls} value={infoDraft.name}
                       onChange={e => setInfoDraft({ ...infoDraft, name: e.target.value })}
                       placeholder={NAME_EXAMPLE[site.type] || 'e.g. Sunrise Estate'} />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block text-slate-600">{T.manager}</label>
                <div className={`${inputCls} flex items-center gap-2 cursor-default text-slate-500 focus:ring-0`}>
                  <UserIcon size={14} className="text-slate-400" /> {user?.name || '—'}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5 text-slate-600">
                  <MapPin size={12} className="text-emerald-600" /> Street address
                </label>
                <AddressAutocomplete as="textarea" rows={2} className={`${inputCls} resize-none`} style={{ fontFamily: 'inherit' }}
                          value={infoDraft.address}
                          onChange={(address) => setInfoDraft(d => ({ ...d, address }))}
                          onSelect={(p) => setPickedPlace(p)}
                          placeholder="Start typing — e.g. University of Lagos, Akoka" />
                <p className="text-[11px] mt-1.5 flex items-center gap-1 text-slate-400">
                  <MapPin size={10} /> Pick a Google suggestion for an exact map pin, or we geocode the address when you save.
                  {geocoded && <span className="ml-1 font-mono">({estate.location.lat.toFixed(4)}, {estate.location.lng.toFixed(4)})</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
              {infoDirty && (
                <button type="button"
                        onClick={() => setInfoDraft({ name: estate?.name || '', address: estate?.address || '' })}
                        className="text-xs font-semibold px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
              )}
              <button onClick={handleSaveInfo} disabled={!infoDirty || infoSaving}
                      className="btn-primary gap-2" style={{ opacity: (!infoDirty || infoSaving) ? 0.6 : 1 }}>
                <Save size={15} /> {infoSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </Section>

          <SiteFeaturesSection Section={Section} />

          {/* Preferences */}
          <Section id="preferences" icon={Settings2} color="#0EA5E9" delay={120}
            title={`${T.site} preferences`}
            desc={`Control what needs your approval and how ${T.members.toLowerCase()} interact.`}>
            <div className="grid gap-3 md:grid-cols-2">
              {toggles.map(({ key, icon: I, color, label, desc }) => {
                const on = !!settings[key];
                return (
                  <div key={key}
                       onClick={() => setSettings({ ...settings, [key]: !on })}
                       className="group cursor-pointer rounded-xl p-4 border transition-all hover:-translate-y-0.5"
                       style={{
                         borderColor: on ? `${color}55` : '#E2E8F0',
                         background: on ? `linear-gradient(135deg, ${color}12, ${color}04)` : '#FFFFFF',
                         boxShadow: on ? `0 8px 20px -14px ${color}` : 'none',
                       }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:-rotate-6"
                            style={on ? { background: `linear-gradient(135deg, ${color}, ${color}CC)`, color: '#fff' } : { background: '#F1F5F9', color: '#94A3B8' }}>
                        <I size={16} />
                      </span>
                      <Toggle on={on} color={color} onClick={(e) => { e.stopPropagation(); setSettings({ ...settings, [key]: !on }); }} />
                    </div>
                    <div className="text-[13px] font-semibold text-slate-900">{label}</div>
                    <div className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
              <span className={`text-xs flex items-center gap-1.5 ${prefsDirty ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                {prefsDirty ? <><AlertCircle size={13} /> Unsaved changes</> : <><Check size={13} /> All changes saved</>}
              </span>
              <div className="flex items-center gap-2">
                {prefsDirty && (
                  <button type="button" onClick={() => setSettings({ ...settings, ...Object.fromEntries(PREF_KEYS.map(k => [k, !!savedSettings[k]])) })}
                          className="text-xs font-semibold px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex items-center gap-1.5">
                    <RotateCcw size={12} /> Discard
                  </button>
                )}
                <button onClick={handleSave} disabled={saving || !prefsDirty}
                        className="btn-primary gap-2" style={{ opacity: (saving || !prefsDirty) ? 0.6 : 1 }}>
                  <Save size={15} /> {saving ? 'Saving…' : 'Save preferences'}
                </button>
              </div>
            </div>
          </Section>

          {/* ─── Estate Constitution ─── */}
          {site.on('community') && <Section id="constitution" icon={ScrollText} color="#EC4899" delay={160}
            title={site.isEstate ? 'Estate constitution' : `${T.site} constitution`}
            desc={site.isEstate ? "Upload your estate's constitution as a PDF. The AI Judge and AI lawyers in the Courtroom will be grounded on these rules for every case in this estate." : `Upload your ${siteWord}'s constitution as a PDF. The AI Judge and AI lawyers in the Courtroom will be grounded on these rules for every case in this ${siteWord}.`}
            badge={<Badge icon={Sparkles} color="#EC4899">AI-grounded</Badge>}>
            {constitution?.hasConstitution ? (
              <div className="rounded-xl p-4 flex items-center gap-3"
                   style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.07), rgba(236,72,153,0.02))', border: '1px solid rgba(236,72,153,0.18)' }}>
                <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-white" style={{ boxShadow: '0 4px 12px -6px #EC4899' }}>
                  <FileText size={20} style={{ color: '#EC4899' }} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate text-slate-900">{constitution.fileName || 'constitution.pdf'}</div>
                  <div className="text-xs mt-0.5 text-slate-500">
                    {formatBytes(constitution.sizeBytes)}
                    {constitution.pageCount ? ` · ${constitution.pageCount} page${constitution.pageCount === 1 ? '' : 's'}` : ''}
                    {constitution.uploadedAt ? ` · uploaded ${format(new Date(constitution.uploadedAt), 'MMM d, yyyy')}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button type="button" onClick={() => openConstitution(estateId, constitution?.fileName)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all hover:-translate-y-0.5"
                          style={{ background: 'rgba(236,72,153,0.10)', color: '#DB2777' }} title="View / download">
                    <Download size={14} /> View
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 bg-white text-slate-600 border border-slate-200"
                          title="Replace with new file">
                    <Upload size={14} /> {uploading ? 'Uploading…' : 'Replace'}
                  </button>
                  <button onClick={handleDelete}
                          className="p-2 rounded-lg transition-all hover:-translate-y-0.5"
                          style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }} title="Remove constitution">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleUpload(f);
                }}
                className="rounded-xl border-2 border-dashed p-7 text-center cursor-pointer transition-all hover:border-pink-300"
                style={{
                  borderColor: dragOver ? '#EC4899' : undefined,
                  background: dragOver ? 'rgba(236,72,153,0.05)' : 'linear-gradient(180deg, #FFFFFF, #FDF2F8)',
                }}
              >
                <span className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center transition-transform"
                      style={{ background: 'linear-gradient(135deg, #EC4899, #DB2777)', boxShadow: '0 8px 18px -10px #DB2777', transform: dragOver ? 'scale(1.1)' : 'none' }}>
                  <Upload size={20} className="text-white" />
                </span>
                <div className="text-sm font-semibold mb-1 text-slate-900">
                  {uploading ? 'Uploading and indexing…' : (site.isEstate ? 'Upload your estate constitution' : `Upload your ${siteWord} constitution`)}
                </div>
                <div className="text-xs text-slate-500">Drag & drop a PDF here, or click to browse · Max 15MB</div>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="hidden"
                   onChange={(e) => {
                     const f = e.target.files?.[0];
                     if (f) handleUpload(f);
                     e.target.value = '';
                   }} />
          </Section>}
          </>)}

          {/* ── Change Password ─────────────────────────────────────── */}
          <Section id="security" icon={KeyRound} color="#6366F1" delay={200}
            title="Password"
            desc="Changing your password signs you out so you can log back in with the new one.">
            {mustReset && (
              <div className="rounded-xl p-3 mb-4 flex items-start gap-2 bg-amber-50 border border-amber-200">
                <ShieldCheck size={16} className="text-amber-600 flex-shrink-0 mt-px" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <strong>Temporary password detected.</strong> Set a new password to continue.
                </div>
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-3">
              {!mustReset && (
                <div>
                  <label className="text-xs font-semibold mb-1.5 block text-slate-600">Current password</label>
                  <input type={showPw ? 'text' : 'password'} className={inputCls} placeholder="••••••••"
                         value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold mb-1.5 block text-slate-600">New password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} className={`${inputCls} pr-10`} placeholder="Min. 6 characters"
                         value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} />
                  <button type="button" onClick={() => setShowPw(s => !s)} title={showPw ? 'Hide passwords' : 'Show passwords'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 grid grid-cols-4 gap-1">
                    {[0, 1, 2, 3].map(i => (
                      <span key={i} className="h-1 rounded-full transition-colors duration-300"
                            style={{ background: pw.next && i < strength.score ? strength.color : '#E2E8F0' }} />
                    ))}
                  </div>
                  <span className="text-[10px] font-semibold w-14 text-right" style={{ color: strength.color }}>{strength.label}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block text-slate-600">Confirm new password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} className={`${inputCls} pr-9`} placeholder="Repeat new password"
                         value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} />
                  {pw.confirm && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {pwMatch ? <CheckCircle2 size={15} className="text-emerald-500" /> : <AlertCircle size={15} className="text-red-400" />}
                    </span>
                  )}
                </div>
                {pw.confirm && !pwMatch && <p className="text-[11px] text-red-500 mt-1.5">Passwords don't match</p>}
              </div>
            </div>
            <div className="flex justify-end mt-4 pt-4 border-t border-slate-100">
              <button onClick={submitPw} disabled={pwSaving}
                      className="btn-primary gap-2"
                      style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
                <Lock size={15} /> {pwSaving ? 'Changing…' : 'Change password'}
              </button>
            </div>
          </Section>

          {canManage && (
            <Section id="access" icon={UsersRound} color="#F59E0B" delay={240}
              title="Team & access"
              desc="Share the workload and keep accounts secure.">
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { to: '/team', icon: UsersRound, color: '#10B981', title: 'Team', desc: 'Invite co-managers and choose what each one can access.' },
                  { to: '/settings/password-requests', icon: KeyRound, color: '#6366F1', title: 'Password reset requests', desc: site.isEstate ? 'Approve or deny password resets from your residents and security staff.' : `Approve or deny password resets from your ${T.members.toLowerCase()} and security staff.` },
                ].map(({ to, icon, color, title, desc }) => (
                  <Link key={to} to={to}
                        className="group rounded-xl p-4 flex items-center gap-3 border border-slate-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-card-md"
                        style={{ textDecoration: 'none' }}>
                    <IconChip icon={icon} color={color} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[13px] text-slate-900">{title}</div>
                      <div className="text-xs mt-0.5 text-slate-500 leading-relaxed">{desc}</div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-slate-500" />
                  </Link>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
