import { useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  Megaphone, Pin, PinOff, Trash2, Radio, Plus, Eye, AlertTriangle, Zap, Hammer, ChevronDown, Send,
} from 'lucide-react';
import DJLive from '../DJLive';
import Modal from '../ui/Modal';
import Pagination from '../ui/Pagination';
import useCountUp from '../../hooks/useCountUp';

const CAT = {
  general:     { Icon: Megaphone,     color: '#10B981', label: 'General' },
  urgent:      { Icon: AlertTriangle, color: '#DC2626', label: 'Urgent' },
  event:       { Icon: Zap,           color: '#D97706', label: 'Event' },
  maintenance: { Icon: Hammer,        color: '#0EA5E9', label: 'Maintenance' },
};
const ago = (d) => { try { return formatDistanceToNowStrict(new Date(d), { addSuffix: true }); } catch { return ''; } };
const BLANK = { title: '', body: '', category: 'general', isPinned: false };

function Count({ label, value, delay }) {
  const n = useCountUp(value || 0);
  return (
    <div className="dash-rise" style={{ animationDelay: `${delay}ms` }}>
      <div className="text-[19px] font-semibold leading-none tabular-nums text-white" style={{ letterSpacing: '-0.02em' }}>{n}</div>
      <div className="text-[11px] text-white/55 mt-1">{label}</div>
    </div>
  );
}

function Composer({ open, onClose, onPost }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const m = CAT[form.category];
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (await onPost(form)) { setForm(BLANK); onClose(); }
    setSaving(false);
  };
  return (
    <Modal open={open} onClose={onClose} title="New announcement" size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <div className="text-[12px] font-semibold text-slate-500 mb-2">Type</div>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(CAT).map(([k, c]) => {
              const on = form.category === k;
              return (
                <button key={k} type="button" onClick={() => setForm({ ...form, category: k })}
                  className="flex flex-col items-center gap-1.5 py-2.5 rounded-2xl border transition-all active:scale-95"
                  style={on ? { borderColor: c.color, background: `${c.color}12`, boxShadow: `0 0 0 3px ${c.color}1A` } : { borderColor: '#E2E8F0' }}>
                  <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: on ? c.color : `${c.color}16` }}>
                    <c.Icon size={15} style={{ color: on ? '#fff' : c.color }} />
                  </span>
                  <span className="text-[11px] font-semibold" style={{ color: on ? c.color : '#475569' }}>{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="text-[12px] font-semibold text-slate-500">Headline</label>
          <input className="input-field mt-1.5" value={form.title} maxLength={120} required
            placeholder="e.g. Water will be off on Saturday" onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-semibold text-slate-500">Message</label>
            <span className="text-[11px] text-slate-400 tabular-nums">{form.body.length}</span>
          </div>
          <textarea className="input-field mt-1.5 resize-none" rows={5} value={form.body} required
            placeholder="What do residents need to know?" onChange={e => setForm({ ...form, body: e.target.value })} />
        </div>
        <button type="button" onClick={() => setForm({ ...form, isPinned: !form.isPinned })}
          className="w-full flex items-center gap-3 p-3 rounded-2xl border text-left"
          style={form.isPinned ? { borderColor: '#F59E0B', background: '#FFFBEB' } : { borderColor: '#E2E8F0' }}>
          <Pin size={16} style={{ color: form.isPinned ? '#D97706' : '#94A3B8' }} />
          <span className="flex-1">
            <span className="block text-[13px] font-semibold text-slate-900">Pin to the top</span>
            <span className="block text-[11px] text-slate-500">Stays first on every resident's notice board</span>
          </span>
          <span className="w-10 h-6 rounded-full relative transition-colors" style={{ background: form.isPinned ? '#F59E0B' : '#E2E8F0' }}>
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: form.isPinned ? 18 : 2 }} />
          </span>
        </button>

        {(form.title || form.body) && (
          <div className="rounded-2xl border border-dashed border-slate-200 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Preview</div>
            <div className="flex items-start gap-2.5">
              <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${m.color}16` }}><m.Icon size={14} style={{ color: m.color }} /></span>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-slate-900 break-words">{form.isPinned ? '📌 ' : ''}{form.title || 'Your headline'}</div>
                <div className="text-[12px] text-slate-500 line-clamp-2 break-words">{form.body}</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button type="submit" disabled={saving || !form.title.trim() || !form.body.trim()} className="btn-primary flex-1 gap-2">
            <Send size={14} /> {saving ? 'Posting…' : 'Post to estate'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function NoticeCard({ a, i, onDelete, onTogglePin }) {
  const m = CAT[a.category] || CAT.general;
  const [open, setOpen] = useState(false);
  const long = (a.body || '').length > 150;
  const reads = a.readBy?.length || 0;
  const urgent = a.category === 'urgent';
  return (
    <article className="dash-rise relative overflow-hidden rounded-[22px] bg-white border"
      style={{ animationDelay: `${180 + i * 50}ms`, borderColor: a.isPinned ? '#FDE68A' : urgent ? '#FECACA' : '#E2E8F0', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
      <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: m.color }} />
      <div className="p-4 pl-5">
        <div className="flex items-start gap-3">
          <span className="relative w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${m.color}14` }}>
            {urgent && <span className="dash-ripple absolute inset-0 rounded-2xl" style={{ background: `${m.color}30` }} />}
            <m.Icon size={17} className="relative" style={{ color: m.color }} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: m.color }}>{m.label}</span>
              {a.isPinned && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 inline-flex items-center gap-0.5"><Pin size={9} /> Pinned</span>}
              <span className="ml-auto text-[11px] text-slate-400 flex-shrink-0">{ago(a.createdAt)}</span>
            </div>
            <h3 className="mt-1 text-[15px] font-semibold text-slate-900 leading-snug" style={{ letterSpacing: '-0.01em' }}>{a.title}</h3>
          </div>
        </div>
        {a.body && <p className={`mt-2.5 text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap ${open || !long ? '' : 'line-clamp-3'}`}>{a.body}</p>}
        {long && (
          <button onClick={() => setOpen(o => !o)} className="mt-1 flex items-center gap-0.5 text-[12px] font-semibold text-emerald-600">
            {open ? 'Show less' : 'Read more'} <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
          <span className="flex items-center gap-1 text-[12px] text-slate-500"><Eye size={13} /> {reads} read{reads !== 1 ? 's' : ''}</span>
          {a.authorId?.name && <span className="text-[12px] text-slate-400 truncate">· {a.authorId.name}</span>}
          <span className="ml-auto flex items-center gap-1">
            <button onClick={() => onTogglePin(a)} aria-label={a.isPinned ? 'Unpin' : 'Pin'}
              className="w-9 h-9 rounded-xl flex items-center justify-center border transition-colors"
              style={a.isPinned ? { borderColor: '#FDE68A', background: '#FFFBEB', color: '#D97706' } : { borderColor: '#E2E8F0', color: '#64748B' }}>
              {a.isPinned ? <PinOff size={15} /> : <Pin size={15} />}
            </button>
            <button onClick={() => onDelete(a._id)} aria-label="Delete"
              className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors">
              <Trash2 size={15} />
            </button>
          </span>
        </div>
      </div>
    </article>
  );
}

export default function AnnouncementsMobile({ announcements, loading, page, pagination, pageSize, onPage, onPost, onDelete, onTogglePin, onGoLive }) {
  const [composing, setComposing] = useState(false);
  const pinned = announcements.filter(a => a.isPinned).length;
  const reads = announcements.reduce((n, a) => n + (a.readBy?.length || 0), 0);
  const latest = announcements[0];

  return (
    <div className="space-y-5 pb-2">
      <header className="dash-rise">
        <div className="text-[12px] font-medium text-slate-400">Communications</div>
        <h1 className="text-[22px] font-semibold text-slate-900 leading-tight" style={{ letterSpacing: '-0.03em' }}>Announcements</h1>
      </header>

      {/* Talk to your estate */}
      <section className="dash-rise relative overflow-hidden rounded-[26px] p-5 text-white"
        style={{ animationDelay: '60ms', background: 'linear-gradient(150deg, #022C22 0%, #064E3B 45%, #047857 105%)', boxShadow: '0 24px 44px -24px rgba(2,44,34,0.95)' }}>
        <div className="dash-blob absolute -top-20 -right-16 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(52,211,153,0.38)' }} />
        <Megaphone size={150} className="absolute -right-6 -bottom-8 text-white/[0.06] -rotate-12 pointer-events-none" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/10 border border-white/15">
            <span className="relative flex w-1.5 h-1.5"><span className="absolute inset-0 rounded-full bg-emerald-300 animate-ping" /><span className="relative w-1.5 h-1.5 rounded-full bg-emerald-300" /></span>
            Talk to your estate
          </span>
          <div className="mt-3 text-[16px] font-semibold leading-snug">{latest ? `Last notice ${ago(latest.createdAt)}` : 'You haven’t posted yet'}</div>
          {latest && <div className="text-[12px] text-white/60 truncate mt-0.5">“{latest.title}”</div>}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={() => setComposing(true)}
              className="flex items-center gap-2.5 p-3 rounded-2xl bg-white text-left active:scale-[0.98] transition-transform" style={{ boxShadow: '0 10px 22px -12px rgba(0,0,0,0.5)' }}>
              <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500 flex-shrink-0"><Plus size={17} className="text-white" /></span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-slate-900">Post a notice</span>
                <span className="block text-[11px] text-slate-500 truncate">Written update</span>
              </span>
            </button>
            <button onClick={onGoLive}
              className="relative overflow-hidden flex items-center gap-2.5 p-3 rounded-2xl text-left active:scale-[0.98] transition-transform"
              style={{ background: 'linear-gradient(135deg, #EF4444, #B91C1C)', boxShadow: '0 10px 22px -12px rgba(239,68,68,0.9)' }}>
              <span className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-white/20 flex-shrink-0">
                <span className="dash-ripple absolute inset-0 rounded-xl bg-white/25" />
                <Radio size={17} className="relative text-white" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-white">Go live</span>
                <span className="block text-[11px] text-red-100/80 truncate">Speak to everyone</span>
              </span>
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-3">
            <Count label="Posted" value={pagination.total} delay={160} />
            <Count label="Pinned" value={pinned} delay={210} />
            <Count label="Reads" value={reads} delay={260} />
          </div>
        </div>
      </section>

      {/* Live banner while someone is on air */}
      <DJLive only="announcement" />

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map(k => <div key={k} className="skeleton h-[140px] rounded-[22px]" />)}</div>
      ) : announcements.length === 0 ? (
        <div className="dash-rise rounded-[22px] bg-white border border-slate-200/70 px-6 py-10 text-center">
          <span className="relative mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-emerald-50">
            <span className="dash-ripple absolute inset-0 rounded-full bg-emerald-100" />
            <Megaphone size={24} className="relative text-emerald-600" />
          </span>
          <div className="mt-4 text-[15px] font-semibold text-slate-900">No announcements yet</div>
          <div className="text-[13px] text-slate-500 mt-1">Post your first notice — every resident gets it instantly.</div>
          <button onClick={() => setComposing(true)} className="btn-primary mt-4 gap-1.5 inline-flex"><Plus size={14} /> Post a notice</button>
        </div>
      ) : (
        <section>
          <h2 className="text-[16px] font-semibold text-slate-900 mb-3" style={{ letterSpacing: '-0.02em' }}>Your notices</h2>
          <div className="space-y-3">
            {announcements.map((a, i) => <NoticeCard key={a._id} a={a} i={i} onDelete={onDelete} onTogglePin={onTogglePin} />)}
          </div>
        </section>
      )}

      <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={pageSize} onPage={onPage} />

      <Composer open={composing} onClose={() => setComposing(false)} onPost={onPost} />
    </div>
  );
}
