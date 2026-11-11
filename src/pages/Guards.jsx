import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { guardAPI, placeAPI, unitAPI } from '../api';
import { useSite } from '../context/SiteContext';
import Modal from '../components/ui/Modal';
import {
  Shield, Search, UserX, UserCheck, MailPlus, Trash2, X, Phone, Mail, Calendar,
  Radio, Users, ShieldOff, Smartphone, KeyRound, ChevronRight, Clock, ShieldCheck, Building2, Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import Portal, { Z } from '../components/ui/Portal';
import useCountUp from '../hooks/useCountUp';

const ONLINE_MS = 15 * 60000;

// Security posts come from the site (GET /api/site → guardPosts): every site
// has gate security; universities also have hall porters tied to a hall.
const DEFAULT_POSTS = [{ key: 'gate', label: 'Security guard', plural: 'Security guards', place: '' }];
export const usePosts = () => {
  const site = useSite();
  const posts = site.guardPosts?.length ? site.guardPosts : DEFAULT_POSTS;
  const postOf = (g) => posts.find((p) => p.key === (g?.guardPost || 'gate')) || posts[0];
  return { posts, postOf, multi: posts.length > 1 };
};

// Halls / buildings a porter can be assigned to: mapped halls + unit blocks.
function usePlaceOptions(enabled) {
  const [opts, setOpts] = useState([]);
  useEffect(() => {
    if (!enabled) return;
    Promise.allSettled([placeAPI.list(), unitAPI.getAll({ limit: 1000 })]).then(([pl, un]) => {
      const names = new Set();
      (pl.value?.data?.data || []).filter((x) => ['hall', 'building'].includes(x.kind)).forEach((x) => x.name && names.add(x.name));
      (un.value?.data?.data || []).forEach((u) => u.block && names.add(u.block));
      setOpts([...names].sort());
    });
  }, [enabled]);
  return opts;
}

function PostBadge({ g, postOf, multi }) {
  const p = postOf(g);
  if (!multi && !g.guardPlace) return null;
  const porter = !!p.place;
  return (
    <span className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full border ${porter ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-teal-50 text-teal-700 border-teal-100'}`}>
      {porter ? <Building2 size={10} /> : <Shield size={10} />}{p.label}{g.guardPlace ? ` · ${g.guardPlace}` : ''}
    </span>
  );
}

function PostPicker({ posts, value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {posts.map((p) => {
        const on = value === p.key;
        return (
          <button key={p.key} type="button" onClick={() => onChange(p.key)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${on ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-100' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${p.place ? 'bg-indigo-100 text-indigo-600' : 'bg-teal-100 text-teal-700'}`}>
              {p.place ? <Building2 size={14} /> : <Shield size={14} />}
            </span>
            <span className="min-w-0">
              <span className="block text-[12.5px] font-semibold text-slate-900">{p.label}</span>
              <span className="block text-[11px] text-slate-500 truncate">{p.place ? `Looks after one ${p.place.toLowerCase()}` : 'Gates & entrances'}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
const isOnline = (g) => g.isActive && g.lastSeen && Date.now() - new Date(g.lastSeen).getTime() < ONLINE_MS;

// On duty (teal) · offline (slate) · suspended (red)
const stateOf = (g) => (!g.isActive
  ? { key: 'suspended', label: 'Suspended', color: '#DC2626', bg: '#FEF2F2', text: '#B91C1C', tint: 'linear-gradient(135deg, #FEF2F2 0%, #FFE4E6 55%, #FFFFFF 100%)' }
  : isOnline(g)
    ? { key: 'online', label: 'On duty', color: '#0D9488', bg: '#F0FDFA', text: '#0F766E', tint: 'linear-gradient(135deg, #F0FDFA 0%, #ECFDF5 55%, #FFFFFF 100%)' }
    : { key: 'offline', label: 'Offline', color: '#64748B', bg: '#F1F5F9', text: '#475569', tint: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 55%, #FFFFFF 100%)' });

const seenText = (g) => {
  if (!g.lastSeen) return 'Never signed in';
  if (isOnline(g)) return 'Active now';
  return `Seen ${formatDistanceToNow(new Date(g.lastSeen), { addSuffix: true })}`;
};

function GuardAvatar({ g, size = 44, rounded = 'rounded-2xl' }) {
  const st = stateOf(g);
  const online = st.key === 'online';
  return (
    <span className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {online && <span className={`absolute -inset-1 ${rounded} animate-pulse`} style={{ boxShadow: `0 0 0 2px ${st.color}55` }} />}
      {g.profilePhoto ? (
        <img src={g.profilePhoto} alt="" className={`w-full h-full ${rounded} object-cover`} style={{ filter: g.isActive ? 'none' : 'grayscale(0.8)' }} />
      ) : (
        <span className={`w-full h-full ${rounded} flex items-center justify-center font-bold text-white`}
          style={{ fontSize: Math.round(size * 0.36), background: `linear-gradient(135deg, ${st.key === 'offline' ? '#14B8A6' : st.color}, ${st.key === 'offline' ? '#0F766E' : `${st.color}BB`})`, opacity: g.isActive ? 1 : 0.75 }}>
          {(g.name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
        </span>
      )}
      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white" style={{ background: st.key === 'offline' ? '#CBD5E1' : st.color }} />
    </span>
  );
}

function StatePill({ g }) {
  const st = stateOf(g);
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: st.bg, color: st.text }}>
      <span className={`w-1.5 h-1.5 rounded-full ${st.key === 'online' ? 'animate-pulse' : ''}`} style={{ background: st.color }} />
      {st.label}
    </span>
  );
}

function StatTile({ i, label, hint, value, Icon, color, active, live, onClick }) {
  const n = useCountUp(value || 0);
  return (
    <button type="button" onClick={onClick}
      className="dash-tile dash-rise group text-left rounded-2xl p-4 border min-w-0"
      style={{
        animationDelay: `${60 + i * 60}ms`,
        background: `linear-gradient(140deg, ${color}${active ? '26' : '17'} 0%, #FFFFFF 55%)`,
        borderColor: active ? color : `${color}2E`,
        boxShadow: active ? `0 0 0 3px ${color}1F` : undefined,
      }}>
      <span className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full pointer-events-none transition-transform duration-500 group-hover:scale-125" style={{ background: `${color}12` }} />
      <div className="relative flex items-center justify-between">
        <span className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:-rotate-6"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 14px -6px ${color}` }}>
          <Icon size={15} className="text-white" />
        </span>
        {live ? (
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full animate-ping opacity-70" style={{ background: color }} />
            <span className="relative w-2 h-2 rounded-full" style={{ background: color }} />
          </span>
        ) : active ? (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: `${color}1F`, color }}>Filtered</span>
        ) : null}
      </div>
      <div className="relative mt-3 text-[24px] font-semibold leading-none text-slate-900 tabular-nums" style={{ letterSpacing: '-0.03em' }}>{n}</div>
      <div className="relative mt-1 text-[12px] font-medium text-slate-500 truncate">{label}</div>
      <div className="relative mt-0.5 text-[11px] text-slate-400 truncate">{hint}</div>
    </button>
  );
}

/* ── Detail drawer ──────────────────────────────────────────────────── */

function GuardDrawer({ guard, onToggle, onRemove, onClose, onUpdated }) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const { posts, postOf, multi } = usePosts();
  const [post, setPost] = useState('gate');
  const [place, setPlace] = useState('');
  const [savingPost, setSavingPost] = useState(false);
  const placeOpts = usePlaceOptions(!!guard && posts.some((p) => p.place));
  useEffect(() => { setPost(postOf(guard).key); setPlace(guard?.guardPlace || ''); }, [guard?._id]); // eslint-disable-line react-hooks/exhaustive-deps
  const postDef = posts.find((p) => p.key === post) || posts[0];
  const postDirty = guard && (post !== postOf(guard).key || place !== (guard.guardPlace || ''));
  const savePost = async () => {
    setSavingPost(true);
    try {
      const { data } = await guardAPI.update(guard._id, { post, place: postDef.place ? place : '' });
      toast.success('Post updated');
      onUpdated?.(data.data);
    } catch (err) { toast.error(err.response?.data?.message || 'Could not update the post'); }
    finally { setSavingPost(false); }
  };

  useEffect(() => { setConfirmRemove(false); }, [guard?._id]);

  useEffect(() => {
    if (!guard) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [guard, onClose]);

  if (!guard) return null;
  const g = guard;
  const st = stateOf(g);

  const facts = [
    g.phone && { icon: Phone, label: 'Phone', value: g.phone, href: `tel:${g.phone}`, color: '#0EA5E9' },
    g.email && { icon: Mail, label: 'Email', value: g.email, href: `mailto:${g.email}`, color: '#8B5CF6' },
    g.createdAt && { icon: Calendar, label: 'Onboarded', value: format(new Date(g.createdAt), 'd MMM yyyy'), color: '#10B981' },
    { icon: postOf(g).place ? Building2 : Shield, label: 'Post', value: `${postOf(g).label}${g.guardPlace ? ` · ${g.guardPlace}` : ''}`, color: '#0D9488' },
  ].filter(Boolean);

  return (
    <Portal>
      <div className={`fixed inset-0 ${Z.drawer} flex justify-end`} onClick={onClose}>
        <div className="overlay-backdrop" aria-hidden="true" />
        <aside role="dialog" aria-modal="true" aria-label={`Guard ${g.name}`}
          className="animate-slide-in-right relative h-full w-full sm:w-[420px] bg-white flex flex-col"
          style={{ boxShadow: '-8px 0 40px rgba(15,23,42,0.18)' }}
          onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="relative overflow-hidden px-5 pt-4 pb-5 flex-shrink-0 border-b border-slate-100" style={{ background: st.tint }}>
            <div className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full opacity-30"
              style={{ background: `radial-gradient(circle, ${st.color}, transparent 70%)`, animation: 'dashFloat 14s ease-in-out infinite' }} />
            <div className="relative flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Security team</span>
              <button onClick={onClose} aria-label="Close"
                className="w-8 h-8 -mr-1 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors">
                <X size={17} />
              </button>
            </div>
            <div className="relative flex items-center gap-4">
              <GuardAvatar g={g} size={56} />
              <div className="min-w-0 flex-1">
                <h2 className="text-[17px] font-semibold text-slate-900 truncate">{g.name}</h2>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <StatePill g={g} />
                  <span className="text-[11px] text-slate-500 flex items-center gap-1"><Clock size={11} /> {seenText(g)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            {/* Presence */}
            <div className="rounded-2xl p-4 flex items-center gap-4 border"
              style={{ background: `linear-gradient(135deg, ${st.color}10, ${st.color}03)`, borderColor: `${st.color}33` }}>
              <span className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center">
                {st.key === 'online' && <>
                  <span className="dash-ripple absolute inset-0 rounded-full border" style={{ borderColor: `${st.color}66` }} />
                  <span className="dash-ripple absolute inset-0 rounded-full border" style={{ borderColor: `${st.color}66`, animationDelay: '1s' }} />
                </>}
                <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${st.color}, ${st.color}CC)` }}>
                  {st.key === 'suspended' ? <ShieldOff size={17} className="text-white" /> : st.key === 'online' ? <Radio size={17} className="text-white" /> : <ShieldCheck size={17} className="text-white" />}
                </span>
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: st.color }}>
                  {st.key === 'online' ? 'On duty' : st.key === 'suspended' ? 'Access paused' : 'Off duty'}
                </div>
                <div className="text-[15px] font-semibold text-slate-900 mt-0.5">
                  {st.key === 'suspended' ? 'Can’t sign in to the Guard app' : seenText(g)}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {st.key === 'suspended' ? 'Activate to restore gate access.' : g.lastSeen ? `Last activity ${format(new Date(g.lastSeen), 'EEE d MMM · h:mm a')}` : 'Waiting for their first sign-in'}
                </div>
              </div>
            </div>

            {/* Facts */}
            <div className="grid grid-cols-2 gap-2.5">
              {facts.map(({ icon: I, label, value, href, color }, i) => {
                const inner = (
                  <>
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: `${color}14`, color }}><I size={13} /></span>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
                    <div className="text-[13px] font-semibold text-slate-900 truncate mt-0.5">{value}</div>
                  </>
                );
                const cls = 'block rounded-xl border border-slate-200 p-3 min-w-0 transition-all hover:-translate-y-0.5 hover:shadow-card-md';
                const style = { animation: `dashRise 0.45s cubic-bezier(0.16,1,0.3,1) ${80 + i * 40}ms both` };
                return href
                  ? <a key={label} href={href} className={cls} style={style}>{inner}</a>
                  : <div key={label} className={cls} style={style}>{inner}</div>;
              })}
            </div>

            {/* Post */}
            {(multi || postDef.place) && (
              <div className="rounded-2xl border border-slate-200 p-3.5 space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Post</div>
                {multi && <PostPicker posts={posts} value={post} onChange={setPost} />}
                {postDef.place && (
                  <div>
                    <label className="text-xs font-semibold mb-1.5 block text-slate-600">{postDef.place} *</label>
                    <input className="input-field" list="guard-place-opts" placeholder={`Which ${postDef.place.toLowerCase()}?`} value={place} onChange={(e) => setPlace(e.target.value)} />
                    <datalist id="guard-place-opts">{placeOpts.map((o) => <option key={o} value={o} />)}</datalist>
                  </div>
                )}
                {postDirty && (
                  <button onClick={savePost} disabled={savingPost || (postDef.place && !place.trim())} className="btn-primary w-full gap-2 !text-[13px]">
                    <Save size={14} /> {savingPost ? 'Saving…' : 'Save post'}
                  </button>
                )}
              </div>
            )}

            {/* App */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 flex">
              <div className="w-20 flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(160deg, #14B8A6, #0F766E)' }}>
                <Smartphone size={26} className="text-white" />
              </div>
              <div className="p-3.5">
                <div className="text-[13px] font-semibold text-slate-900">AreaConnector Guard app</div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {g.name.split(' ')[0]} signs in with the credentials emailed to {g.email ? <span className="font-medium text-slate-700">{g.email}</span> : 'them'} to verify visitor codes {postOf(g).place && g.guardPlace ? `at ${g.guardPlace}` : 'at the gate'}.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 pt-3 pb-4 flex-shrink-0 border-t border-slate-100 space-y-2 bg-white">
            {!confirmRemove ? (
              <div className="flex gap-2">
                <button onClick={() => { onToggle(g); onClose(); }}
                  className={`flex-1 inline-flex items-center justify-center gap-2 rounded-[9px] px-3 py-2.5 text-sm font-semibold transition-all hover:-translate-y-0.5 ${g.isActive ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' : 'btn-primary'}`}>
                  {g.isActive ? <><UserX size={15} /> Suspend guard</> : <><UserCheck size={15} /> Activate guard</>}
                </button>
                <button onClick={() => setConfirmRemove(true)} title="Remove guard"
                  className="inline-flex items-center justify-center gap-1.5 rounded-[9px] px-3 py-2.5 text-sm font-semibold border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            ) : (
              <div className="rounded-xl p-3 bg-red-50 border border-red-200 animate-scale-in">
                <p className="text-xs font-medium text-red-700 text-center">Remove {g.name}? Their account is deleted and this can’t be undone.</p>
                <div className="flex gap-2 mt-2.5">
                  <button onClick={() => setConfirmRemove(false)} className="flex-1 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600">Cancel</button>
                  <button onClick={() => { onRemove(g); onClose(); }} className="flex-1 py-2 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700">Yes, remove</button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </Portal>
  );
}

/* ── Roster card ────────────────────────────────────────────────────── */

function GuardCard({ g, i, selected, onOpen, onToggle }) {
  const st = stateOf(g);
  const { postOf, multi } = usePosts();
  return (
    <div onClick={() => onOpen(g)}
      className="dash-rise group cursor-pointer rounded-2xl bg-white border overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-card-md"
      style={{ animationDelay: `${420 + i * 35}ms`, borderColor: selected ? st.color : '#E2E8F0', boxShadow: selected ? `0 0 0 3px ${st.color}22` : undefined }}>
      <div className="p-4" style={{ background: st.tint }}>
        <div className="flex items-start gap-3">
          <GuardAvatar g={g} size={46} />
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-slate-900 truncate">{g.name}</div>
            <div className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5"><Clock size={10} className="flex-shrink-0" /> {seenText(g)}</div>
          </div>
          <StatePill g={g} />
        </div>
      </div>
      <div className="px-4 py-3 space-y-1.5 border-t border-slate-100">
        <PostBadge g={g} postOf={postOf} multi={multi} />
        <div className="text-[12px] text-slate-600 truncate flex items-center gap-2"><Mail size={12} className="text-slate-300 flex-shrink-0" />{g.email || '—'}</div>
        <div className="text-[12px] text-slate-600 truncate flex items-center gap-2"><Phone size={12} className="text-slate-300 flex-shrink-0" />{g.phone || 'No phone'}</div>
      </div>
      <div className="px-4 py-2.5 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
        <span className="text-[11px] text-slate-400">{g.createdAt ? `Joined ${format(new Date(g.createdAt), 'MMM yyyy')}` : ''}</span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onToggle(g)} title={g.isActive ? 'Suspend' : 'Activate'}
            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${g.isActive ? 'text-slate-500 hover:text-amber-700 hover:bg-amber-50' : 'text-emerald-700 bg-emerald-50 opacity-100'}`}>
            {g.isActive ? <><UserX size={12} /> Suspend</> : <><UserCheck size={12} /> Activate</>}
          </button>
          <ChevronRight size={15} className="text-slate-300 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────── */

const FILTERS = [
  ['all', 'All', '#0F172A'],
  ['online', 'On duty', '#0D9488'],
  ['offline', 'Offline', '#64748B'],
  ['suspended', 'Suspended', '#DC2626'],
];

const STEPS = [
  { Icon: MailPlus, color: '#10B981', title: 'Add a guard', text: 'Name and email is all you need.' },
  { Icon: KeyRound, color: '#6366F1', title: 'Credentials emailed', text: 'We send their login straight away.' },
  { Icon: Smartphone, color: '#0D9488', title: 'Guard app sign-in', text: 'They verify visitor codes at the gate.' },
];

export default function Guards() {
  const [guards, setGuards]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState('all');
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm]           = useState({ name: '', email: '', phone: '', post: 'gate', place: '' });
  const { posts, postOf, multi } = usePosts();
  const [postFilter, setPostFilter] = useState('all');
  const placeOpts = usePlaceOptions(showInvite && posts.some((p) => p.place));
  const formPost = posts.find((p) => p.key === form.post) || posts[0];
  const team = multi ? `Security & ${posts.filter((p) => p.place).map((p) => p.plural.toLowerCase()).join(' & ')}` : 'Security team';
  const noun = multi ? 'guard or porter' : 'guard';
  const [saving, setSaving]       = useState(false);
  const [selected, setSelected]   = useState(null);
  const [, setTick]               = useState(0);
  const navigate = useNavigate();

  // Guard teams are small — load the whole roster and filter locally
  const load = async () => {
    try {
      const { data } = await guardAPI.getAll({ page: 1, limit: 200 });
      setGuards(data.data || []);
    } catch {
      toast.error('Failed to load guards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(() => setTick((t) => t + 1), 60000); // refresh "seen x ago"
    return () => clearInterval(id);
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await guardAPI.invite({ ...form, post: formPost.key, place: formPost.place ? form.place : '' });
      toast.success(data.message || 'Guard account created and credentials sent!');
      setShowInvite(false);
      setForm({ name: '', email: '', phone: '', post: posts[0].key, place: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create guard account');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (g) => {
    try {
      if (g.isActive) {
        await guardAPI.suspend(g._id);
        toast.success('Guard suspended');
      } else {
        await guardAPI.activate(g._id);
        toast.success('Guard activated');
      }
      load();
    } catch {
      toast.error('Action failed');
    }
  };

  const handleRemove = async (g) => {
    try {
      await guardAPI.remove(g._id);
      toast.success(`${g.name} removed`);
      load();
    } catch {
      toast.error('Failed to remove guard');
    }
  };

  const openGuard = (g) => {
    if (window.innerWidth < 640) navigate(`/guards/${g._id}`, { state: { guard: g } });
    else setSelected(g);
  };

  const counts = useMemo(() => {
    const c = { all: guards.length, online: 0, offline: 0, suspended: 0 };
    guards.forEach((g) => { c[stateOf(g).key]++; });
    return c;
  }, [guards]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return guards
      .filter((g) => filter === 'all' || stateOf(g).key === filter)
      .filter((g) => postFilter === 'all' || postOf(g).key === postFilter)
      .filter((g) => !q || [g.name, g.email, g.phone, g.guardPlace].some((v) => (v || '').toLowerCase().includes(q)))
      .sort((a, b) => {
        const rank = { online: 0, offline: 1, suspended: 2 };
        return rank[stateOf(a).key] - rank[stateOf(b).key] || new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0);
      });
  }, [guards, filter, search, postFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (k) => setFilter((f) => (f === k ? 'all' : k));

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 animate-fade-in">

      {/* Header */}
      <div className="dash-rise flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900" style={{ letterSpacing: '-0.025em' }}>{team}</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">{multi ? 'Gate security and the porters who look after each hall — all on the Guard app.' : 'The guards who verify visitors and keep the gate secure.'}</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary gap-2 !text-[13px] !px-3.5 !py-2">
          <MailPlus size={14} /> Add {noun}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile i={0} label="Team size"  hint="Guards onboarded"        value={counts.all}       Icon={Users}     color="#6366F1" active={false} onClick={() => setFilter('all')} />
        <StatTile i={1} label="On duty"    hint="Active in the last 15 min" value={counts.online}  Icon={Radio}     color="#0D9488" active={filter === 'online'} live={counts.online > 0} onClick={() => pick('online')} />
        <StatTile i={2} label="Offline"    hint="Not signed in recently"  value={counts.offline}   Icon={Clock}     color="#64748B" active={filter === 'offline'} onClick={() => pick('offline')} />
        <StatTile i={3} label="Suspended"  hint="Gate access paused"      value={counts.suspended} Icon={ShieldOff} color="#DC2626" active={filter === 'suspended'} onClick={() => pick('suspended')} />
      </div>

      {/* How it works */}
      <div className="dash-rise rounded-2xl border border-slate-200/70 bg-white p-4 grid gap-3 md:grid-cols-3" style={{ animationDelay: '300ms' }}>
        {STEPS.map(({ Icon, color, title, text }, i) => (
          <div key={title} className="relative flex items-center gap-3 min-w-0">
            <span className="relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 14px -6px ${color}` }}>
              <Icon size={16} className="text-white" />
              <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-white border border-slate-200 text-[9px] font-bold text-slate-600 flex items-center justify-center">{i + 1}</span>
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-slate-900">{title}</div>
              <div className="text-[11.5px] text-slate-500 truncate">{text}</div>
            </div>
            {i < STEPS.length - 1 && <ChevronRight size={16} className="hidden md:block ml-auto text-slate-300 flex-shrink-0" />}
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="dash-rise flex items-center gap-2.5 flex-wrap" style={{ animationDelay: '360ms' }}>
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="w-full rounded-xl bg-white border border-slate-200 pl-10 pr-9 py-2.5 text-sm outline-none transition-all focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
            placeholder="Search by name, email or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={15} /></button>
          )}
        </div>
        {multi && (
          <select className="rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-sm outline-none" value={postFilter} onChange={(e) => setPostFilter(e.target.value)} aria-label="Filter by post">
            <option value="all">All posts</option>
            {posts.map((p) => <option key={p.key} value={p.key}>{p.plural} ({guards.filter((g) => postOf(g).key === p.key).length})</option>)}
          </select>
        )}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {FILTERS.map(([key, label, color]) => {
            const on = filter === key;
            return (
              <button key={key} onClick={() => setFilter(key)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold pl-2.5 pr-2 py-1.5 rounded-full border transition-all ${on ? 'text-white' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                style={on ? { background: color, borderColor: color, boxShadow: `0 6px 14px -8px ${color}` } : undefined}>
                {key !== 'all' && <span className="w-1.5 h-1.5 rounded-full" style={{ background: on ? '#fff' : color }} />}
                {label}
                <span className={`text-[10px] font-bold px-1.5 rounded-md tabular-nums ${on ? 'bg-white/25' : 'bg-slate-100 text-slate-500'}`}>{counts[key]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Roster */}
      {loading ? (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
              <div className="flex items-center gap-3"><div className="skeleton w-11 h-11 rounded-2xl" /><div className="flex-1 space-y-2"><div className="skeleton h-3 w-32 rounded" /><div className="skeleton h-2.5 w-20 rounded" /></div></div>
              <div className="skeleton h-2.5 w-44 rounded" /><div className="skeleton h-2.5 w-28 rounded" />
            </div>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200/70 flex flex-col items-center py-16 gap-3 text-center">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <span className="dash-ripple absolute inset-0 rounded-full border-2 border-teal-200" />
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #14B8A6, #0F766E)' }}>
              <Shield size={28} className="text-white" />
            </div>
          </div>
          <p className="font-semibold text-slate-800 mt-2">
            {guards.length === 0 ? 'No guards onboarded yet' : search ? `No guards match “${search}”` : 'No guards in this view'}
          </p>
          <p className="text-sm text-slate-400 max-w-sm">
            {guards.length === 0 ? 'Add your gate security officers so they can verify visitors with the AreaConnector Guard app.' : 'Try another filter or search.'}
          </p>
          {guards.length === 0 && (
            <button onClick={() => setShowInvite(true)} className="btn-primary gap-2 mt-2"><MailPlus size={14} /> Add your first guard</button>
          )}
        </div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((g, i) => (
            <GuardCard key={g._id} g={g} i={i} selected={selected?._id === g._id} onOpen={openGuard} onToggle={handleToggle} />
          ))}
        </div>
      )}

      {/* ── Invite Modal ──────────────────────────────────────────── */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title={multi ? `Add ${formPost.label.toLowerCase()}` : 'Add security guard'}>
        <div className="mb-4 rounded-xl p-3 border border-teal-100 flex gap-3" style={{ background: 'linear-gradient(135deg, #F0FDFA, #FFFFFF)' }}>
          <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #14B8A6, #0F766E)' }}>
            <Shield size={15} className="text-white" />
          </span>
          <p className="text-xs text-slate-600 leading-relaxed">
            We’ll create a security account and email the login details. They can sign in to the <strong className="text-slate-900">AreaConnector Guard</strong> app and start verifying visitors right away.
          </p>
        </div>
        <form onSubmit={handleInvite} className="space-y-4">
          {multi && (
            <div>
              <label className="text-xs font-semibold mb-1.5 block text-slate-600">Post *</label>
              <PostPicker posts={posts} value={formPost.key} onChange={(v) => setForm({ ...form, post: v })} />
            </div>
          )}
          {formPost.place && (
            <div>
              <label className="text-xs font-semibold mb-1.5 block text-slate-600">{formPost.place} they look after *</label>
              <input className="input-field" list="invite-place-opts" placeholder={`e.g. ${placeOpts[0] || 'Moremi Hall'}`} value={form.place}
                onChange={(e) => setForm({ ...form, place: e.target.value })} required />
              <datalist id="invite-place-opts">{placeOpts.map((o) => <option key={o} value={o} />)}</datalist>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold mb-1.5 block text-slate-600">Full name *</label>
            <input className="input-field" placeholder="e.g. Musa Abdullahi" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block text-slate-600">Email address *</label>
            <input type="email" className="input-field" placeholder="guard@email.com" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block text-slate-600">Phone (optional)</label>
            <input className="input-field" placeholder="+234 …" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowInvite(false)} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 gap-2">
              <MailPlus size={14} /> {saving ? 'Creating…' : `Add ${multi ? formPost.label.toLowerCase() : 'guard'}`}
            </button>
          </div>
        </form>
      </Modal>

      <GuardDrawer guard={selected} onToggle={handleToggle} onRemove={handleRemove} onClose={() => setSelected(null)}
        onUpdated={(u) => { setSelected((s) => ({ ...s, ...u })); setGuards((gs) => gs.map((x) => (x._id === u._id ? { ...x, ...u } : x))); }} />
    </div>
  );
}
