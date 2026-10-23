import { useMemo, useRef, useState } from 'react';
import { format, formatDistanceToNow, isThisMonth } from 'date-fns';
import {
  Megaphone, Plus, Pin, PinOff, Trash2, Radio, Mic, Search, AlertTriangle, CalendarDays, Wrench, Info,
  Eye, Loader2, Send, X, ChevronLeft, ChevronRight, Sparkles, TrendingUp,
} from 'lucide-react';
import DJLive from '../DJLive';

const CATS = {
  general:     { label: 'General',     Icon: Info,          color: '#3B82F6' },
  urgent:      { label: 'Urgent',      Icon: AlertTriangle, color: '#EF4444' },
  event:       { label: 'Event',       Icon: CalendarDays,  color: '#10B981' },
  maintenance: { label: 'Maintenance', Icon: Wrench,        color: '#F59E0B' },
};
const cat = (k) => CATS[k] || CATS.general;

const TEMPLATES = [
  { label: 'Water outage',     category: 'maintenance', title: 'Scheduled water outage', body: 'Water supply will be interrupted on [day] from [time] to [time] for maintenance work. Please store enough water ahead of time. We apologise for the inconvenience.' },
  { label: 'Power update',     category: 'maintenance', title: 'Power supply update', body: 'Please note: [describe the power situation / generator schedule]. We will keep you updated.' },
  { label: 'Dues reminder',    category: 'general',     title: 'Service charge reminder', body: 'This is a friendly reminder that service charges for [month] are due by [date]. You can pay from the Payments page in the app. Thank you!' },
  { label: 'Community meeting', category: 'event',      title: 'Residents meeting', body: 'All residents are invited to a meeting on [day] at [time] at [venue]. Agenda: [topics]. Your input matters, please attend.' },
  { label: 'Security notice',  category: 'urgent',      title: 'Security notice', body: 'Please be vigilant: [describe the issue]. Report anything suspicious to the security desk immediately.' },
];

const BLANK = { title: '', body: '', category: 'general', isPinned: false };

function Composer({ onPost, onClose }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const c = cat(form.category);
  const ready = form.title.trim() && form.body.trim();

  const submit = async (e) => {
    e.preventDefault();
    if (!ready) return;
    setSaving(true);
    const ok = await onPost(form);
    setSaving(false);
    if (ok) { setForm(BLANK); onClose(); }
  };

  return (
    <form onSubmit={submit} className="dash-rise rounded-2xl bg-white border border-slate-200/70 overflow-hidden">
      <div className="flex items-center justify-between px-5 h-12 border-b border-slate-100">
        <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg flex items-center justify-center bg-amber-500"><Megaphone size={12} className="text-white" /></span>
          New announcement
        </h3>
        <button type="button" onClick={onClose} aria-label="Close composer" className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X size={15} /></button>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_300px]">
        <div className="p-5 space-y-3 border-r border-slate-100">
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[11px] text-slate-400 mr-1 self-center flex items-center gap-1"><Sparkles size={11} /> Templates</span>
            {TEMPLATES.map((t) => (
              <button key={t.label} type="button" onClick={() => setForm((f) => ({ ...f, title: t.title, body: t.body, category: t.category }))}
                className="text-[11px] font-medium px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50 transition-colors">
                {t.label}
              </button>
            ))}
          </div>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" maxLength={120}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[15px] font-semibold outline-none focus:bg-white focus:border-amber-300 focus:ring-4 focus:ring-amber-100 transition-all" />
          <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={5} placeholder="Write your message to residents…"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[14px] leading-relaxed outline-none resize-none focus:bg-white focus:border-amber-300 focus:ring-4 focus:ring-amber-100 transition-all" />
          <div className="flex items-center gap-1.5 flex-wrap">
            {Object.entries(CATS).map(([k, v]) => {
              const on = form.category === k;
              return (
                <button key={k} type="button" onClick={() => setForm({ ...form, category: k })}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg border transition-all"
                  style={on ? { background: v.color, borderColor: v.color, color: '#fff' } : { borderColor: '#E2E8F0', color: '#475569' }}>
                  <v.Icon size={13} /> {v.label}
                </button>
              );
            })}
            <label className="ml-auto flex items-center gap-2 text-[12px] text-slate-600 cursor-pointer select-none">
              <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} className="accent-amber-500" />
              <Pin size={12} /> Pin to top
            </label>
          </div>
        </div>

        {/* Live preview */}
        <div className="p-5 bg-slate-50/60">
          <div className="text-[11px] font-medium text-slate-400 mb-2">Preview: how residents see it</div>
          <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
            <div className="h-1" style={{ background: c.color }} />
            <div className="p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: c.color }}>
                <c.Icon size={12} /> {c.label}{form.isPinned && <span className="ml-1 inline-flex items-center gap-0.5 text-amber-600"><Pin size={10} /> Pinned</span>}
              </div>
              <div className="mt-1 text-[14px] font-semibold text-slate-900 break-words">{form.title || 'Your title'}</div>
              <p className="mt-1 text-[12px] text-slate-500 leading-relaxed line-clamp-6 whitespace-pre-line break-words">{form.body || 'Your message will appear here.'}</p>
            </div>
          </div>
          <button type="submit" disabled={!ready || saving}
            className="mt-4 w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors disabled:opacity-40">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Post to residents
          </button>
          <p className="mt-2 text-[11px] text-slate-400 text-center">Residents get a notification straight away.</p>
        </div>
      </div>
    </form>
  );
}

function NoticeCard({ a, i, onTogglePin, onDelete }) {
  const c = cat(a.category);
  const [open, setOpen] = useState(false);
  const long = (a.body || '').length > 280;
  return (
    <article className="dash-rise group relative rounded-2xl bg-white border overflow-hidden transition-all hover:shadow-md"
      style={{ animationDelay: `${80 + i * 40}ms`, borderColor: a.isPinned ? '#FCD34D' : 'rgba(226,232,240,0.7)' }}>
      <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: c.color }} />
      <div className="pl-6 pr-5 py-4">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${c.color}14` }}>
            <c.Icon size={16} style={{ color: c.color }} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              <span className="font-semibold" style={{ color: c.color }}>{c.label}</span>
              {a.isPinned && <span className="inline-flex items-center gap-1 font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded"><Pin size={10} /> Pinned</span>}
              <span className="text-slate-400">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
            </div>
            <h3 className="mt-0.5 text-[15px] font-semibold text-slate-900">{a.title}</h3>
            <p className={`mt-1.5 text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap break-words ${open ? '' : 'line-clamp-4'}`}>{a.body}</p>
            {long && (
              <button onClick={() => setOpen((o) => !o)} className="mt-1 text-[12px] font-medium text-amber-600 hover:text-amber-700">
                {open ? 'Show less' : 'Read more'}
              </button>
            )}
            <div className="mt-3 flex items-center gap-3 text-[12px] text-slate-400">
              <span className="flex items-center gap-1.5">
                {a.authorId?.profilePhoto
                  ? <img src={a.authorId.profilePhoto} alt="" className="w-6 h-6 rounded-full object-cover ring-2 ring-white shadow-sm" />
                  : <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold flex items-center justify-center">{(a.authorId?.name || '?')[0]}</span>}
                {a.authorId?.name || 'Management'}
              </span>
              <span>{format(new Date(a.createdAt), 'MMM d, yyyy · HH:mm')}</span>
              <span className="flex items-center gap-1"><Eye size={12} /> {a.readBy?.length || 0} read{(a.readBy?.length || 0) === 1 ? '' : 's'}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onTogglePin(a)} title={a.isPinned ? 'Unpin' : 'Pin to top'} aria-label={a.isPinned ? 'Unpin' : 'Pin'}
              className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
              {a.isPinned ? <PinOff size={15} /> : <Pin size={15} />}
            </button>
            <button onClick={() => onDelete(a._id)} title="Delete" aria-label="Delete"
              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function AnnouncementsDesktop({ announcements, loading, page, pagination, onPage, onPost, onDelete, onTogglePin, onGoLive }) {
  const [composing, setComposing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const topRef = useRef(null);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return announcements.filter((a) =>
      (filter === 'all' || a.category === filter) &&
      (!term || `${a.title} ${a.body}`.toLowerCase().includes(term)));
  }, [announcements, filter, q]);
  const pinned = shown.filter((a) => a.isPinned);
  const rest = shown.filter((a) => !a.isPinned);

  const pinnedCount = announcements.filter((a) => a.isPinned).length;
  const thisMonth = announcements.filter((a) => isThisMonth(new Date(a.createdAt))).length;
  const mostRead = [...announcements].sort((a, b) => (b.readBy?.length || 0) - (a.readBy?.length || 0))[0];

  const openComposer = () => { setComposing(true); topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  return (
    <div ref={topRef} className="max-w-[1400px] mx-auto space-y-5 pb-10">
      {/* ── Banner ── */}
      <div className="dash-rise relative overflow-hidden rounded-2xl px-6 py-5"
        style={{ background: 'linear-gradient(120deg, #451A03 0%, #78350F 55%, #B45309 100%)', boxShadow: '0 16px 32px -18px rgba(120,53,15,0.8)' }}>
        <div className="dash-blob absolute -top-20 right-64 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(251,191,36,0.25)' }} />
        <div className="relative flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/10 border border-white/15 flex-shrink-0">
              <Megaphone size={22} className="text-amber-300" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[22px] font-semibold text-white" style={{ letterSpacing: '-0.025em' }}>Announcements</h1>
              <p className="text-[13px] text-amber-100/75">Post notices to every resident, or go live over the air for urgent updates.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {[['Total', pagination.total], ['Pinned', pinnedCount], ['This month', thisMonth]].map(([label, n]) => (
              <div key={label} className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 min-w-[76px]">
                <div className="text-[16px] font-semibold text-white tabular-nums leading-none">{n}</div>
                <div className="text-[10px] text-amber-100/65 mt-1">{label}</div>
              </div>
            ))}
            <button onClick={onGoLive}
              className="ml-1 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-red-500 hover:bg-red-600 transition-all hover:-translate-y-0.5"
              style={{ boxShadow: '0 10px 22px -10px rgba(239,68,68,0.9)' }}>
              <Radio size={14} /> Go live
            </button>
            <button onClick={openComposer}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold text-amber-800 bg-white hover:-translate-y-0.5 transition-all"
              style={{ boxShadow: '0 8px 18px -8px rgba(0,0,0,0.35)' }}>
              <Plus size={15} /> New announcement
            </button>
          </div>
        </div>
      </div>

      <DJLive only="announcement" />

      <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        {/* ── Feed ── */}
        <div className="space-y-4 min-w-0">
          {composing ? (
            <Composer onPost={onPost} onClose={() => setComposing(false)} />
          ) : (
            <button onClick={openComposer}
              className="dash-rise w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-slate-200/70 text-left hover:border-amber-300 hover:shadow-sm transition-all">
              <span className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center"><Plus size={16} className="text-white" /></span>
              <span className="flex-1 text-[14px] text-slate-400">Write an announcement for residents…</span>
              <span className="text-[12px] text-slate-400">Templates available</span>
            </button>
          )}

          <div className="dash-rise flex items-center gap-3" style={{ animationDelay: '60ms' }}>
            <div className="flex p-1 rounded-xl bg-white border border-slate-200">
              {[['all', 'All'], ...Object.entries(CATS).map(([k, v]) => [k, v.label])].map(([k, label]) => (
                <button key={k} onClick={() => setFilter(k)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${filter === k ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="relative flex-1 max-w-xs ml-auto">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search announcements"
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-[13px] outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100 transition-all" />
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">{[0, 1, 2].map((k) => <div key={k} className="skeleton h-32 rounded-2xl" />)}</div>
          ) : shown.length === 0 ? (
            <div className="rounded-2xl bg-white border border-dashed border-slate-300 py-14 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center"><Megaphone size={24} className="text-amber-500" /></div>
              <p className="mt-3 text-[14px] font-semibold text-slate-800">{announcements.length ? 'Nothing matches' : 'No announcements yet'}</p>
              <p className="mt-1 text-[13px] text-slate-400">{announcements.length ? 'Try another category or search.' : 'Post your first notice to residents.'}</p>
            </div>
          ) : (
            <>
              {pinned.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-[12px] font-semibold uppercase tracking-wider text-amber-600 flex items-center gap-1.5"><Pin size={12} /> Pinned</h2>
                  {pinned.map((a, i) => <NoticeCard key={a._id} a={a} i={i} onTogglePin={onTogglePin} onDelete={onDelete} />)}
                </section>
              )}
              {rest.length > 0 && (
                <section className="space-y-3">
                  {pinned.length > 0 && <h2 className="text-[12px] font-semibold uppercase tracking-wider text-slate-400 pt-1">Latest</h2>}
                  {rest.map((a, i) => <NoticeCard key={a._id} a={a} i={i + pinned.length} onTogglePin={onTogglePin} onDelete={onDelete} />)}
                </section>
              )}
            </>
          )}

          {pagination.pages > 1 && (
            <div className="flex items-center justify-between text-[13px] text-slate-500">
              <span>Page {page} of {pagination.pages}</span>
              <span className="flex gap-1.5">
                <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={14} /> Newer</button>
                <button onClick={() => onPage(page + 1)} disabled={page >= pagination.pages} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40">Older <ChevronRight size={14} /></button>
              </span>
            </div>
          )}
        </div>

        {/* ── Rail ── */}
        <aside className="sticky top-0 space-y-4">
          <div className="dash-rise relative overflow-hidden rounded-2xl p-5 text-white" style={{ animationDelay: '80ms', background: 'linear-gradient(140deg, #7F1D1D, #DC2626)' }}>
            <div className="dash-blob absolute -top-12 -right-10 w-40 h-40 rounded-full blur-2xl" style={{ background: 'rgba(254,202,202,0.35)' }} />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><Mic size={18} /></div>
              <h3 className="mt-3 text-[15px] font-semibold text-white">Live broadcast</h3>
              <p className="mt-1 text-[12px] text-white/80 leading-relaxed">For urgent updates. Residents get an instant push notification and can tap in to hear you speak. It takes over any DJ set that's playing.</p>
              <button onClick={onGoLive} className="mt-4 w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white text-red-600 text-[13px] font-semibold hover:-translate-y-0.5 transition-transform">
                <Radio size={14} /> Go live now
              </button>
            </div>
          </div>

          {mostRead && (mostRead.readBy?.length || 0) > 0 && (
            <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 p-4" style={{ animationDelay: '140ms' }}>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><TrendingUp size={12} /> Most read recently</div>
              <div className="mt-2 text-[14px] font-semibold text-slate-900 line-clamp-2">{mostRead.title}</div>
              <div className="mt-1 text-[12px] text-slate-500 flex items-center gap-1"><Eye size={12} /> {mostRead.readBy.length} reads</div>
            </div>
          )}

          <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 p-4" style={{ animationDelay: '200ms' }}>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">Categories</div>
            <div className="space-y-2">
              {Object.entries(CATS).map(([k, v]) => {
                const n = announcements.filter((a) => a.category === k).length;
                const pct = announcements.length ? (n / announcements.length) * 100 : 0;
                return (
                  <button key={k} onClick={() => setFilter(filter === k ? 'all' : k)} className="w-full text-left group">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700 group-hover:text-slate-900"><v.Icon size={12} style={{ color: v.color }} /> {v.label}</span>
                      <span className="text-slate-400 tabular-nums">{n}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="dash-bar-x h-full rounded-full" style={{ width: `${pct}%`, background: v.color }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
