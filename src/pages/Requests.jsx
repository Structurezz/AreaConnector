// Requests (module requests): what members asked site staff for — housekeeping,
// call a nurse, hostel repairs, sick bay, injury reports… Open / Accepted /
// Done, urgent first. Each request is a conversation between the requester,
// the staff it went to and the managers (POST /api/requests/:id/messages).
// Managers can also send staff a task ("New task"), optionally about a
// patient / student. Requests for management float to the top. Live via the
// socket `request_update` event.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { formatDistanceToNowStrict, format } from 'date-fns';
import {
  Inbox, Clock, CheckCircle2, AlertTriangle, Home, Phone, Check, Play, ClipboardList, Plus, Send, X,
  MessageCircle, Building2, User as UserIcon, Search, Users, ListChecks, Ban,
} from 'lucide-react';
import { requestAPI, residentAPI } from '../api';
import { useSite } from '../context/SiteContext';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import StatTile from '../components/site/StatTile';
import SitePanel from '../components/site/SitePanel';
import { useStaff, roleColor } from '../components/site/RoleFields';
import { PageLoader } from '../components/ui/Spinner';

const COLS = [
  { key: 'open',     label: 'Open',     Icon: Inbox,        color: '#F59E0B' },
  { key: 'accepted', label: 'Accepted', Icon: Clock,        color: '#0EA5E9' },
  { key: 'done',     label: 'Done',     Icon: CheckCircle2, color: '#10B981' },
];
const STATUS = {
  open:      { label: 'Open',      color: '#F59E0B', accent: ['#F59E0B', '#EA580C'] },
  accepted:  { label: 'Accepted',  color: '#0EA5E9', accent: ['#0EA5E9', '#2563EB'] },
  done:      { label: 'Done',      color: '#10B981', accent: ['#10B981', '#059669'] },
  cancelled: { label: 'Cancelled', color: '#64748B', accent: ['#64748B', '#475569'] },
};
const MGMT = '#DB2777'; // "For management" highlight
const unitText = (u) => (u && typeof u === 'object' ? [u.block, u.unitNumber].filter(Boolean).join(' · ') : '');
const ago = (d) => (d ? `${formatDistanceToNowStrict(new Date(d))} ago` : '');
const idOf = (v) => (v && typeof v === 'object' ? String(v._id || '') : String(v || ''));
const active = (r) => r.status === 'open' || r.status === 'accepted';

// Tell the sidebar badge to refresh
export const announceRequests = () => window.dispatchEvent(new Event('requests:changed'));

// How many messages of each request this manager has seen (unread dots)
const SEEN_KEY = 'requests:seen';
const readSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY)); } catch { return null; } };
const writeSeen = (m) => { try { localStorage.setItem(SEEN_KEY, JSON.stringify(m)); } catch { /* private mode */ } };

// Colour for a message's role label (Patient, Doctor, Management…)
function useLabelColor() {
  const site = useSite();
  return useCallback((label) => {
    if (!label) return '#64748B';
    if (label === 'Management') return MGMT;
    const def = (site.roles || []).find(r => r.label === label);
    return def ? roleColor(site, def.key) : '#64748B';
  }, [site]);
}

function Badge({ color, bg, Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md whitespace-nowrap" style={{ color, background: bg || `${color}14` }}>
      {Icon && <Icon size={10} />}{children}
    </span>
  );
}

function ActionButtons({ r, busy, onAct, size = 'sm' }) {
  const pad = size === 'lg' ? 'px-3.5 py-2 text-[12.5px]' : 'px-2.5 py-1.5 text-[12px]';
  return (
    <>
      {r.status === 'open' && (
        <button disabled={busy} onClick={(e) => { e.stopPropagation(); onAct(r, 'accepted'); }} className={`inline-flex items-center gap-1 font-semibold rounded-lg text-sky-700 bg-sky-50 hover:bg-sky-100 disabled:opacity-50 ${pad}`}><Play size={11} /> Accept</button>
      )}
      {active(r) && (
        <button disabled={busy} onClick={(e) => { e.stopPropagation(); onAct(r, 'done'); }} className={`inline-flex items-center gap-1 font-semibold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 ${pad}`}><Check size={12} /> Done</button>
      )}
    </>
  );
}

function RequestCard({ r, kinds, onAct, onOpen, busy, unread, me }) {
  const kind = kinds.find(k => k.key === r.kind);
  const urgent = r.urgent && active(r);
  const mgmt = !!kind?.managers && active(r);
  const last = (r.messages || []).at(-1);
  const edge = urgent ? '#EF4444' : mgmt ? MGMT : null;
  return (
    <div role="button" tabIndex={0} onClick={() => onOpen(r)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(r); }}
      className={`rounded-xl border p-3.5 cursor-pointer transition-shadow hover:shadow-card-md ${urgent ? 'border-red-200 bg-white' : mgmt ? 'border-pink-200 bg-pink-50/40' : 'border-slate-200 bg-white'}`}
      style={edge ? { boxShadow: `inset 3px 0 0 ${edge}` } : undefined}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {urgent && <Badge color="#DC2626" bg="#FEF2F2" Icon={AlertTriangle}>Urgent</Badge>}
            {kind?.managers && <Badge color={MGMT} Icon={Building2}>For management</Badge>}
            {r.fromManager && <Badge color="#7C3AED" Icon={ListChecks}>Task</Badge>}
            <span className="text-[13px] font-semibold text-slate-900">{kind?.label || r.kind}</span>
          </div>
          <div className="text-[12px] text-slate-600 mt-0.5 truncate">
            {r.fromManager ? <>From <b className="font-semibold">{r.requesterId?.name || 'Management'}</b></> : (r.requesterId?.name || 'Someone')}
            {r.subjectId?.name && <span className="text-slate-500"> · about {r.subjectId.name}</span>}
            {unitText(r.unitId) && <span className="text-slate-400"> · <Home size={10} className="inline -mt-0.5" /> {unitText(r.unitId)}</span>}
          </div>
        </div>
        <span className="text-[11px] text-slate-400 whitespace-nowrap">{ago(last?.at || r.createdAt)}</span>
      </div>
      {last ? (
        <div className={`mt-2 flex items-start gap-2 rounded-lg px-2.5 py-1.5 ${unread ? 'bg-indigo-50' : 'bg-slate-50'}`}>
          {unread ? <span className="mt-1.5 w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" aria-label="Unread" /> : <MessageCircle size={12} className="mt-0.5 text-slate-400 flex-shrink-0" />}
          <p className={`text-[12.5px] min-w-0 flex-1 line-clamp-2 break-words ${unread ? 'text-slate-900' : 'text-slate-700'}`}>
            <b className="font-semibold">{idOf(last.userId) === me ? 'You' : last.name}</b>{last.role && <span className="text-slate-400 font-medium"> ({last.role})</span>}: {last.text}
          </p>
          {(r.messages || []).length > 1 && <span className="text-[10.5px] font-semibold text-slate-400 tabular-nums flex-shrink-0">{r.messages.length}</span>}
        </div>
      ) : r.note ? (
        <p className="text-[12.5px] text-slate-700 mt-2 bg-slate-50 rounded-lg px-2.5 py-1.5 whitespace-pre-wrap break-words line-clamp-2">{r.note}</p>
      ) : null}
      {r.reply && <p className="text-[12px] text-sky-800 mt-1.5 bg-sky-50 rounded-lg px-2.5 py-1.5">Reply: {r.reply}</p>}
      <div className="flex items-center gap-2 mt-2.5">
        <span className="text-[11.5px] text-slate-500 flex-1 truncate">
          {r.assigneeId?.name ? <>Taken by <b className="text-slate-700 font-semibold">{r.assigneeId.name}</b>{r.status === 'done' && r.doneAt ? ` · done ${ago(r.doneAt)}` : ''}</> : 'Not taken yet'}
        </span>
        {r.requesterId?.phone && <a href={`tel:${r.requesterId.phone}`} onClick={e => e.stopPropagation()} aria-label="Call" className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"><Phone size={13} /></a>}
        <ActionButtons r={r} busy={busy} onAct={onAct} />
      </div>
    </div>
  );
}

// ── Conversation ─────────────────────────────────────────────────────────────
function ConversationPanel({ r, kinds, me, busy, onAct, onClose, onReplied }) {
  const kind = kinds.find(k => k.key === r.kind);
  const st = STATUS[r.status] || STATUS.open;
  const colorOf = useLabelColor();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const msgs = r.messages || [];

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      const { data } = await requestAPI.reply(r._id, t);
      setText('');
      onReplied(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send');
    } finally { setSending(false); }
  };

  const meta = [
    [r.fromManager ? 'From' : 'Requested by', r.requesterId?.name || '—', UserIcon],
    r.subjectId?.name && ['About', r.subjectId.name, UserIcon],
    unitText(r.unitId) && ['Where', unitText(r.unitId), Home],
    ['Taken by', r.assigneeId?.name || 'Not taken yet', Clock],
  ].filter(Boolean);

  const footer = (
    <div className="space-y-2.5">
      {active(r) ? (
        <div className="flex items-end gap-2">
          <textarea rows={1} value={text} onChange={e => setText(e.target.value)} maxLength={1000}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Write a reply…  (Enter to send)"
            className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 max-h-32" />
          <button onClick={send} disabled={!text.trim() || sending} aria-label="Send"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-40 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}><Send size={15} /></button>
        </div>
      ) : (
        <p className="text-[12px] text-slate-500 text-center">This request is {st.label.toLowerCase()} — the conversation is closed.</p>
      )}
      {active(r) && (
        <div className="flex items-center gap-2 pb-1">
          <ActionButtons r={r} busy={busy} onAct={onAct} size="lg" />
          <span className="flex-1" />
          <button disabled={busy} onClick={() => onAct(r, 'cancelled')} className="inline-flex items-center gap-1 px-3 py-2 text-[12.5px] font-semibold rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"><Ban size={12} /> Cancel</button>
        </div>
      )}
    </div>
  );

  return (
    <SitePanel title={kind?.label || r.kind} eyebrow={kind?.managers ? 'For management' : r.fromManager ? 'Task' : 'Request'}
      subtitle={`${st.label} · ${ago(r.createdAt)}`} accent={kind?.managers && active(r) ? [MGMT, '#BE185D'] : st.accent} onClose={onClose} footer={footer} width={460}>
      <div className="px-5 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
          <Badge color={st.color} Icon={(COLS.find(c => c.key === r.status) || { Icon: Ban }).Icon}>{st.label}</Badge>
          {r.urgent && active(r) && <Badge color="#DC2626" bg="#FEF2F2" Icon={AlertTriangle}>Urgent</Badge>}
          {r.fromManager && <Badge color="#7C3AED" Icon={ListChecks}>Task</Badge>}
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {meta.map(([label, value, Icon]) => (
            <div key={label} className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
              <p className="text-[12.5px] font-medium text-slate-800 truncate flex items-center gap-1"><Icon size={11} className="text-slate-400 flex-shrink-0" />{value}</p>
            </div>
          ))}
        </div>
        {r.requesterId?.phone && <a href={`tel:${r.requesterId.phone}`} className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700"><Phone size={12} /> Call {r.requesterId.name?.split(' ')[0]}</a>}
      </div>

      <div className="px-4 py-4 space-y-3 bg-slate-50/60 min-h-[200px]">
        {msgs.length ? msgs.map((m, i) => {
          const mine = idOf(m.userId) === me;
          const c = colorOf(m.role);
          const prev = msgs[i - 1];
          const grouped = prev && idOf(prev.userId) === idOf(m.userId);
          return (
            <div key={m._id || i} className={`flex flex-col ${mine ? 'items-end' : 'items-start'} ${grouped ? '-mt-1.5' : ''}`}>
              {!grouped && (
                <div className={`flex items-center gap-1.5 mb-1 px-1 ${mine ? 'flex-row-reverse' : ''}`}>
                  <span className="text-[11.5px] font-semibold text-slate-700">{mine ? 'You' : m.name}</span>
                  {m.role && <span className="text-[10px] font-bold px-1.5 py-[1px] rounded-full" style={{ color: c, background: `${c}14`, border: `1px solid ${c}2E` }}>{m.role}</span>}
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] whitespace-pre-wrap break-words ${mine ? 'text-white rounded-br-md' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'}`}
                style={mine ? { background: 'linear-gradient(135deg, #6366F1, #4F46E5)' } : undefined}>
                {m.text}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 px-1">{m.at ? format(new Date(m.at), 'd MMM, HH:mm') : ''}</span>
            </div>
          );
        }) : (
          <div className="py-10 text-center text-[12.5px] text-slate-400">
            <MessageCircle size={20} className="mx-auto mb-1.5 text-slate-300" />
            No messages yet{active(r) ? ' — send the first one below' : ''}
          </div>
        )}
        {r.reply && <p className="text-[12px] text-sky-800 bg-sky-50 rounded-lg px-2.5 py-1.5">Reply: {r.reply}</p>}
        <div ref={endRef} />
      </div>
    </SitePanel>
  );
}

// ── New task ─────────────────────────────────────────────────────────────────
function NewTaskPanel({ kinds, onClose, onCreated }) {
  const site = useSite();
  const taskKinds = kinds.filter(k => !k.managers);
  const [kind, setKind] = useState(taskKinds[0]?.key || '');
  const [mode, setMode] = useState('role'); // 'role' | 'person'
  const [to, setTo] = useState(null);
  const [staffQ, setStaffQ] = useState('');
  const [subject, setSubject] = useState(null);
  const [subjQ, setSubjQ] = useState('');
  const [subjResults, setSubjResults] = useState([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const { staff, loading: staffLoading } = useStaff(true);
  const kindDef = taskKinds.find(k => k.key === kind);
  const member = site.roleOf(site.defaultRole)?.label || site.terms?.member || 'Member';

  // Staff grouped by role, filtered by the search
  const groups = useMemo(() => {
    const q = staffQ.trim().toLowerCase();
    const list = staff.filter(s => !q || s.name?.toLowerCase().includes(q) || s.roleLabel?.toLowerCase().includes(q) || s.specialty?.toLowerCase().includes(q));
    const m = new Map();
    list.forEach(s => { const k = s.role; if (!m.has(k)) m.set(k, { key: k, label: s.roleLabel, people: [] }); m.get(k).people.push(s); });
    // The kind's roles first
    const roles = kindDef?.roles || [];
    return [...m.values()].sort((a, b) => (roles.includes(b.key) - roles.includes(a.key)) || a.label.localeCompare(b.label));
  }, [staff, staffQ, kindDef]);

  // Patient search (debounced)
  useEffect(() => {
    const q = subjQ.trim();
    if (!q || subject) { setSubjResults([]); return; }
    let off = false;
    const t = setTimeout(async () => {
      try {
        const { data } = await residentAPI.getAll({ group: 'members', search: q, limit: 8 });
        if (!off) setSubjResults(data.data || []);
      } catch { if (!off) setSubjResults([]); }
    }, 250);
    return () => { off = true; clearTimeout(t); };
  }, [subjQ, subject]);

  const roleNames = (kindDef?.roles || []).map(k => site.roles?.find(r => r.key === k)?.plural || site.roleOf(k)?.label || k).join(' / ');
  const canSend = kind && (mode === 'role' || to) && !saving;

  const submit = async () => {
    if (!canSend) return;
    setSaving(true);
    try {
      const body = { kind, note: note.trim() };
      if (mode === 'person' && to) body.toUserId = to._id;
      if (subject) body.subjectId = subject._id;
      const { data } = await requestAPI.create(body);
      toast.success(data.message || 'Task sent');
      onCreated(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send the task');
    } finally { setSaving(false); }
  };

  const label = 'text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block';
  const input = 'w-full rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300';

  return (
    <SitePanel title="New task" eyebrow="Send to staff" subtitle="Staff are notified straight away and can reply here" accent={['#8B5CF6', '#6D28D9']} onClose={onClose} width={460}
      footer={
        <div className="flex items-center gap-2 pb-1">
          <button onClick={onClose} className="px-3.5 py-2 text-[13px] font-semibold rounded-xl text-slate-600 hover:bg-slate-100">Cancel</button>
          <span className="flex-1" />
          <button onClick={submit} disabled={!canSend} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold rounded-xl text-white disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>
            <Send size={13} /> {saving ? 'Sending…' : 'Send task'}
          </button>
        </div>
      }>
      <div className="px-5 py-4 space-y-5">
        <div>
          <span className={label}>What</span>
          <div className="flex flex-wrap gap-1.5">
            {taskKinds.map(k => (
              <button key={k.key} type="button" onClick={() => setKind(k.key)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12.5px] font-semibold border transition-all"
                style={kind === k.key ? { background: k.urgent ? '#EF4444' : '#7C3AED', color: '#fff', borderColor: k.urgent ? '#EF4444' : '#7C3AED' } : { background: '#fff', color: '#475569', borderColor: '#E2E8F0' }}>
                {k.urgent && <AlertTriangle size={11} />}{k.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className={label}>Send to</span>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100">
            {[['role', 'Anyone with the role', Users], ['person', 'A staff member', UserIcon]].map(([k, l, Icon]) => (
              <button key={k} type="button" onClick={() => setMode(k)}
                className={`inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all ${mode === k ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500'}`}>
                <Icon size={12} />{l}
              </button>
            ))}
          </div>
          {mode === 'role' ? (
            <p className="text-[12px] text-slate-500 mt-2">
              Goes to {roleNames || 'the right staff'}{subject ? ` — ${subject.name}'s own team and ward staff first` : ' — on-call staff first'}.
            </p>
          ) : to ? (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-slate-900 truncate">{to.name}</p>
                <p className="text-[11.5px] text-slate-500 truncate">{[to.roleLabel, to.specialty, to.unit].filter(Boolean).join(' · ')}</p>
              </div>
              <button onClick={() => setTo(null)} aria-label="Change" className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white"><X size={14} /></button>
            </div>
          ) : (
            <div className="mt-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={staffQ} onChange={e => setStaffQ(e.target.value)} placeholder="Search staff by name or role" className={input} />
              </div>
              <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                {staffLoading && !staff.length ? <p className="px-3 py-4 text-[12px] text-slate-400 text-center">Loading staff…</p>
                  : !groups.length ? <p className="px-3 py-4 text-[12px] text-slate-400 text-center">No staff found</p>
                  : groups.map(g => {
                    const c = roleColor(site, g.key);
                    return (
                      <div key={g.key}>
                        <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider sticky top-0 bg-white" style={{ color: c }}>{g.label} · {g.people.length}</p>
                        {g.people.map(s => (
                          <button key={s._id} type="button" onClick={() => setTo(s)} className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50">
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10.5px] font-bold text-white flex-shrink-0" style={{ background: c }}>{s.name?.[0]?.toUpperCase()}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[12.5px] font-medium text-slate-800 truncate">{s.name}</span>
                              {(s.specialty || s.unit) && <span className="block text-[11px] text-slate-400 truncate">{[s.specialty, s.unit].filter(Boolean).join(' · ')}</span>}
                            </span>
                            {s.onCall && <span className="text-[10px] font-bold text-emerald-600">On call</span>}
                          </button>
                        ))}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        <div>
          <span className={label}>About <span className="normal-case font-medium text-slate-400 tracking-normal">— optional</span></span>
          {subject ? (
            <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-slate-900 truncate">{subject.name}</p>
                {unitText(subject.unitId) && <p className="text-[11.5px] text-slate-500 truncate">{unitText(subject.unitId)}</p>}
              </div>
              <button onClick={() => { setSubject(null); setSubjQ(''); }} aria-label="Remove" className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white"><X size={14} /></button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={subjQ} onChange={e => setSubjQ(e.target.value)} placeholder={`Search ${member.toLowerCase()}s by name`} className={input} />
              </div>
              {subjResults.length > 0 && (
                <div className="mt-1.5 max-h-52 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {subjResults.map(p => (
                    <button key={p._id} type="button" onClick={() => { setSubject(p); setSubjQ(''); }} className="w-full text-left px-3 py-2 hover:bg-slate-50">
                      <span className="block text-[12.5px] font-medium text-slate-800 truncate">{p.name}</span>
                      {unitText(p.unitId) && <span className="block text-[11px] text-slate-400 truncate">{unitText(p.unitId)}</span>}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div>
          <span className={label}>Note</span>
          <textarea rows={4} value={note} onChange={e => setNote(e.target.value)} maxLength={1000} placeholder="What needs doing?"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 resize-none" />
        </div>
      </div>
    </SitePanel>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Requests() {
  const site = useSite();
  const socketCtx = useSocket();
  const { user } = useAuth();
  const me = String(user?._id || user?.id || '');
  const kinds = site.requestKinds || [];
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('open'); // phones: one column at a time
  const [busy, setBusy] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [seen, setSeen] = useState(() => readSeen() || {});

  const load = useCallback(async () => {
    try {
      const { data } = await requestAPI.list({ scope: 'all' });
      const rows = data.data || [];
      setList(rows);
      // First visit: nothing counts as unread yet
      if (!readSeen()) {
        const init = Object.fromEntries(rows.map(r => [r._id, (r.messages || []).length]));
        writeSeen(init); setSeen(init);
      }
    } catch (err) {
      if (err.response?.status !== 403) toast.error('Could not load requests');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const merge = useCallback((req) => {
    if (!req?._id) return;
    setList(l => {
      const i = l.findIndex(x => x._id === req._id);
      if (i < 0) return [req, ...l];
      const next = [...l]; next[i] = req; return next;
    });
  }, []);

  // Live: merge the updated / new request
  useEffect(() => {
    if (!socketCtx?.subscribe) return;
    return socketCtx.subscribe('request_update', merge);
  }, [socketCtx, merge]);

  const opened = openId ? list.find(r => r._id === openId) : null;

  // The open conversation is read
  const openCount = (opened?.messages || []).length;
  useEffect(() => {
    if (!openId) return;
    setSeen(s => {
      if (s[openId] === openCount) return s;
      const next = { ...s, [openId]: openCount };
      writeSeen(next); return next;
    });
  }, [openId, openCount]);

  const isUnread = (r) => {
    const msgs = r.messages || [];
    if (!msgs.length || r._id === openId) return false;
    return msgs.length > (seen[r._id] || 0) && idOf(msgs.at(-1).userId) !== me;
  };

  const act = async (r, status) => {
    setBusy(r._id);
    try {
      const { data } = await requestAPI.update(r._id, { status });
      merge(data.data);
      toast.success(data.message || 'Updated');
      announceRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update');
    } finally { setBusy(null); }
  };

  const by = useMemo(() => {
    const mgmt = (r) => (kinds.find(k => k.key === r.kind)?.managers && active(r) ? 1 : 0);
    const urgent = (r) => (r.urgent && active(r) ? 1 : 0);
    const latest = (r) => new Date((r.messages || []).at(-1)?.at || r.createdAt);
    const sort = (a, b) => mgmt(b) - mgmt(a) || urgent(b) - urgent(a) || latest(b) - latest(a);
    return Object.fromEntries(COLS.map(c => [c.key, list.filter(r => r.status === c.key).sort(sort)]));
  }, [list, kinds]);
  const urgentOpen = list.filter(r => r.urgent && active(r)).length;
  const mgmtOpen = list.filter(r => active(r) && kinds.find(k => k.key === r.kind)?.managers).length;

  if (site.isEstate || !site.on('requests')) return <div className="max-w-md mx-auto py-20 text-center text-[13px] text-slate-500">Requests are switched off for this {site.terms.site.toLowerCase()}. Turn them on in Settings → Site type & features.</div>;
  if (loading) return <PageLoader />;

  const column = (c) => (
    <div key={c.key} className="min-w-0">
      <div className="hidden lg:flex items-center gap-2 mb-2.5">
        <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}CC)` }}><c.Icon size={12} className="text-white" /></span>
        <span className="text-[13px] font-semibold text-slate-900">{c.label}</span>
        <span className="text-[11.5px] font-semibold text-slate-400 tabular-nums">{by[c.key].length}</span>
      </div>
      <div className="space-y-2.5">
        {by[c.key].length
          ? by[c.key].map(r => <RequestCard key={r._id} r={r} kinds={kinds} me={me} unread={isUnread(r)} onOpen={(x) => setOpenId(x._id)} onAct={act} busy={busy === r._id} />)
          : <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-[12.5px] text-slate-400">Nothing {c.label.toLowerCase()}</div>}
      </div>
    </div>
  );

  const taskKinds = kinds.filter(k => !k.managers);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="dash-rise flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-semibold text-slate-900" style={{ letterSpacing: '-0.025em' }}>Requests</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">What {site.terms.members.toLowerCase()} asked staff for — {taskKinds.slice(0, 3).map(k => k.label.toLowerCase()).join(', ')}{taskKinds.length > 3 ? '…' : ''}</p>
        </div>
        {taskKinds.length > 0 && (
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold text-white flex-shrink-0 shadow-sm hover:shadow-md transition-shadow"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>
            <Plus size={14} /> New task
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile i={0} label="Open" value={by.open.length} Icon={Inbox} color="#F59E0B" pulse={by.open.length > 0} active={tab === 'open'} onClick={() => setTab('open')} />
        <StatTile i={1} label={mgmtOpen ? 'For management' : 'Urgent'} value={mgmtOpen || urgentOpen} Icon={mgmtOpen ? Building2 : AlertTriangle} color={mgmtOpen ? MGMT : '#EF4444'} hint={mgmtOpen ? `${urgentOpen} urgent` : 'Not done yet'} pulse={mgmtOpen > 0} />
        <StatTile i={2} label="Accepted" value={by.accepted.length} Icon={Clock} color="#0EA5E9" active={tab === 'accepted'} onClick={() => setTab('accepted')} />
        <StatTile i={3} label="Done" value={by.done.length} Icon={ClipboardList} color="#10B981" hint="Last 100 requests" active={tab === 'done'} onClick={() => setTab('done')} />
      </div>

      {/* Phones: tabs */}
      <div className="lg:hidden flex gap-1.5">
        {COLS.map(c => (
          <button key={c.key} onClick={() => setTab(c.key)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[12.5px] font-semibold border"
            style={tab === c.key ? { background: c.color, color: '#fff', borderColor: c.color } : { background: '#fff', color: '#475569', borderColor: '#E2E8F0' }}>
            {c.label}<span className="text-[10.5px] opacity-75 tabular-nums">{by[c.key].length}</span>
          </button>
        ))}
      </div>
      <div className="lg:hidden">{column(COLS.find(c => c.key === tab))}</div>

      {/* Desktop: board */}
      <div className="hidden lg:grid grid-cols-3 gap-4 items-start">{COLS.map(column)}</div>

      {opened && (
        <ConversationPanel r={opened} kinds={kinds} me={me} busy={busy === opened._id} onAct={act}
          onClose={() => setOpenId(null)} onReplied={merge} />
      )}
      {creating && (
        <NewTaskPanel kinds={kinds} onClose={() => setCreating(false)}
          onCreated={(r) => { merge(r); setCreating(false); setOpenId(r._id); announceRequests(); }} />
      )}
    </div>
  );
}
