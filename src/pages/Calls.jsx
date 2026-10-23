import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { format, isToday, isYesterday } from 'date-fns';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Search, RefreshCw, ShieldCheck, Hand } from 'lucide-react';
import BottomSheet from '../components/payments/BottomSheet';
import { callAPI } from '../api';
import { useCall } from '../context/CallContext';
import CallsDesktop from '../components/calls/CallsDesktop';
import useIsDesktop from '../hooks/useIsDesktop';

// Estate staff calling: managers can call any resident or guard in the
// estate for free, and see their recent calls (incl. emergency calls in).

const dayLabel = (d) => (isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEE, MMM d'));
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const BUZZES = [
  { kind: 'checkin',         emoji: '👋', label: 'Check in' },
  { kind: 'greeting',        emoji: '😊', label: 'Say hello' },
  { kind: 'thinking_of_you', emoji: '💛', label: 'Thinking of you' },
];

const ROLE_LABEL = { security: 'Security', estate_manager: 'Estate Manager', super_admin: 'Estate Manager', resident: 'Resident' };

function Avatar({ person, size = 44 }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {person.profilePhoto ? (
        <img src={person.profilePhoto} alt="" className="w-full h-full rounded-full object-cover" />
      ) : (
        <div className="w-full h-full rounded-full flex items-center justify-center font-bold text-emerald-700 bg-emerald-50" style={{ fontSize: size * 0.36 }}>
          {(person.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
        </div>
      )}
      {person.online && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" title="Online now" />}
    </div>
  );
}

export default function Calls() {
  const { call, startCall } = useCall() || {};
  const isDesktop = useIsDesktop();
  const [dir, setDir] = useState({ neighbours: [], staff: [] });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('residents');
  const [q, setQ] = useState('');
  // Check-in buzz
  const [buzzFor, setBuzzFor] = useState(null);
  const [buzzKind, setBuzzKind] = useState('checkin');
  const [buzzNote, setBuzzNote] = useState('');
  const [sending, setSending] = useState(false);

  const openBuzz = (p) => { setBuzzFor(p); setBuzzKind('checkin'); setBuzzNote(''); };
  const sendBuzz = async () => {
    setSending(true);
    try {
      const { data } = await callAPI.buzz(buzzFor._id, buzzKind, buzzNote);
      toast.success(data.message || 'Sent');
      setBuzzFor(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not send');
    } finally { setSending(false); }
  };

  const load = useCallback(async () => {
    try {
      const [d, h] = await Promise.all([callAPI.directory(), callAPI.history()]);
      setDir(d.data.data);
      setHistory(h.data.data);
    } catch {
      toast.error('Could not load contacts');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!call) load(); }, [call]); // refresh history after a call

  const people = tab === 'staff' ? dir.staff : dir.neighbours;
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = term ? people.filter((p) => `${p.name} ${p.unit || ''} ${ROLE_LABEL[p.role] || ''}`.toLowerCase().includes(term)) : people;
    return [...list].sort((a, b) => (b.online - a.online) || a.name.localeCompare(b.name));
  }, [people, q]);

  const findPerson = (id) => dir.neighbours.find((x) => String(x._id) === String(id)) || dir.staff.find((x) => String(x._id) === String(id));
  const missedIn = history.filter((c) => c.direction === 'incoming' && ['missed', 'declined'].includes(c.status) && Date.now() - new Date(c.createdAt) < 86400000).length;

  if (isDesktop) return (
    <CallsDesktop dir={dir} history={history} loading={loading} onRefresh={load} call={call} startCall={startCall} />
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="rounded-3xl p-5 sm:p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #064E3B 0%, #047857 55%, #10B981 100%)' }}>
        <div className="absolute -top-16 -right-10 w-52 h-52 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-emerald-100/90 text-sm"><Phone size={15} /> Calls</div>
            <p className="text-lg font-bold mt-1">Call any resident or guard in your estate</p>
            <p className="text-xs text-emerald-50/80 mt-1 flex items-center gap-1.5"><ShieldCheck size={12} /> Calls from estate staff are always free</p>
          </div>
          <button onClick={load} aria-label="Refresh" className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 shrink-0">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex p-1 rounded-2xl bg-slate-100">
        {[['residents', `Residents${dir.neighbours.length ? ` (${dir.neighbours.length})` : ''}`], ['staff', 'Security & staff'], ['recent', 'Recent']].map(([id, label]) => (
          <button key={id} onClick={() => { setTab(id); setQ(''); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
            {label}
            {id === 'recent' && missedIn > 0 && (
              <span className="ml-1.5 text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full align-middle">{missedIn}</span>
            )}
          </button>
        ))}
      </div>

      {tab !== 'recent' ? (
        <>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === 'staff' ? 'Search staff' : 'Search by name or unit'}
              className="input-field pl-10 py-3" />
          </div>
          {loading ? (
            <div className="py-16 flex justify-center"><RefreshCw size={22} className="animate-spin text-emerald-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="glass-card py-12 text-center text-sm text-slate-400">
              {q ? `No match for “${q}”` : tab === 'staff' ? 'No other staff in this estate yet' : 'No residents yet'}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-3">
              {filtered.map((p) => (
                <div key={p._id} className="glass-card p-4 flex items-center gap-3">
                  <Avatar person={p} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{p.name}</div>
                    <div className="text-xs text-slate-400 truncate">
                      {p.role === 'resident' ? (p.unit || 'Resident') : ROLE_LABEL[p.role]}{p.online ? ' · online' : ''}
                    </div>
                  </div>
                  {p.role === 'resident' && (
                    <button onClick={() => openBuzz(p)} aria-label={`Check up on ${p.name}`} title="Check up on them"
                      className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-50 text-amber-600 hover:bg-amber-100">
                      <Hand size={17} />
                    </button>
                  )}
                  <button onClick={() => startCall(p)} disabled={!!call} aria-label={`Call ${p.name}`}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40">
                    <Phone size={17} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : history.length === 0 ? (
        <div className="glass-card py-12 text-center text-sm text-slate-400">No calls yet</div>
      ) : (
        <div className="glass-card divide-y divide-slate-100 overflow-hidden">
          {history.map((c) => {
            const out = c.direction === 'outgoing';
            const other = (out ? c.calleeId : c.callerId) || {};
            const missed = ['missed', 'declined', 'cancelled', 'failed'].includes(c.status);
            const Icon = missed && !out ? PhoneMissed : out ? PhoneOutgoing : PhoneIncoming;
            const person = findPerson(other._id);
            return (
              <div key={c._id} className="flex items-center gap-3 p-4">
                <Icon size={17} className={missed ? 'text-red-500' : 'text-slate-400'} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold truncate ${missed && !out ? 'text-red-600' : 'text-slate-900'}`}>
                    {other.name || 'Unknown'}
                    {c.kind === 'emergency' && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600 align-middle">EMERGENCY</span>}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {dayLabel(new Date(c.createdAt))} {format(new Date(c.createdAt), 'h:mm a')}
                    {c.durationSec ? ` · ${mmss(c.durationSec)}` : ` · ${c.status}`}
                  </div>
                </div>
                {person && (
                  <button onClick={() => startCall(person)} disabled={!!call} aria-label={`Call ${person.name} back`}
                    className="w-9 h-9 rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-40">
                    <Phone size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* ── Check up on a resident ── */}
      <BottomSheet open={!!buzzFor} onClose={() => !sending && setBuzzFor(null)} title={buzzFor ? `Check up on ${buzzFor.name.split(' ')[0]}` : ''}
        subtitle="They'll get a notification and an email from you as Estate Manager"
        footer={<button onClick={sendBuzz} disabled={sending} className="btn-primary w-full py-3.5 text-base gap-2">
          {sending ? 'Sending…' : <><Hand size={17} /> Send</>}
        </button>}>
        {buzzFor && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
              <Avatar person={buzzFor} size={48} />
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 truncate">{buzzFor.name}</div>
                <div className="text-xs text-slate-400">{buzzFor.unit || 'Resident'}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {BUZZES.map((b) => (
                <button key={b.kind} type="button" onClick={() => setBuzzKind(b.kind)}
                  className={`p-3 rounded-2xl border text-center transition-all ${buzzKind === b.kind ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}>
                  <div className="text-2xl">{b.emoji}</div>
                  <div className="text-xs font-semibold text-slate-800 mt-1">{b.label}</div>
                </button>
              ))}
            </div>
            <textarea value={buzzNote} onChange={(e) => setBuzzNote(e.target.value.slice(0, 200))} rows={2}
              placeholder="Add a short note (optional) — e.g. Hope you're settling in well" className="input-field resize-none" />
            <p className="text-[11px] text-slate-400">One check-in per resident every 2 hours.</p>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
