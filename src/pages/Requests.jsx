// Requests (module requests): what members asked site staff for — housekeeping,
// call a nurse, hostel repairs, sick bay, injury reports… Open / Accepted /
// Done, urgent first. Managers can accept or mark done. Live via the socket
// `request_update` event.
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { formatDistanceToNowStrict } from 'date-fns';
import { Inbox, Clock, CheckCircle2, AlertTriangle, Home, Phone, Check, Play, ClipboardList } from 'lucide-react';
import { requestAPI } from '../api';
import { useSite } from '../context/SiteContext';
import { useSocket } from '../context/SocketContext';
import StatTile from '../components/site/StatTile';
import { PageLoader } from '../components/ui/Spinner';

const COLS = [
  { key: 'open',     label: 'Open',     Icon: Inbox,        color: '#F59E0B' },
  { key: 'accepted', label: 'Accepted', Icon: Clock,        color: '#0EA5E9' },
  { key: 'done',     label: 'Done',     Icon: CheckCircle2, color: '#10B981' },
];
const unitText = (u) => (u && typeof u === 'object' ? [u.block, u.unitNumber].filter(Boolean).join(' · ') : '');
const ago = (d) => (d ? `${formatDistanceToNowStrict(new Date(d))} ago` : '');

// Tell the sidebar badge to refresh
export const announceRequests = () => window.dispatchEvent(new Event('requests:changed'));

function RequestCard({ r, kinds, onAct, busy }) {
  const kind = kinds.find(k => k.key === r.kind);
  const urgent = r.urgent && r.status !== 'done';
  return (
    <div className={`rounded-xl border bg-white p-3.5 transition-shadow hover:shadow-card-md ${urgent ? 'border-red-200' : 'border-slate-200'}`}
      style={urgent ? { boxShadow: 'inset 3px 0 0 #EF4444' } : undefined}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {urgent && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-red-50 text-red-600"><AlertTriangle size={10} /> Urgent</span>}
            <span className="text-[13px] font-semibold text-slate-900">{kind?.label || r.kind}</span>
          </div>
          <div className="text-[12px] text-slate-600 mt-0.5 truncate">
            {r.requesterId?.name || 'Someone'}{unitText(r.unitId) && <span className="text-slate-400"> · <Home size={10} className="inline -mt-0.5" /> {unitText(r.unitId)}</span>}
          </div>
        </div>
        <span className="text-[11px] text-slate-400 whitespace-nowrap">{ago(r.createdAt)}</span>
      </div>
      {r.note && <p className="text-[12.5px] text-slate-700 mt-2 bg-slate-50 rounded-lg px-2.5 py-1.5 whitespace-pre-wrap break-words">{r.note}</p>}
      {r.reply && <p className="text-[12px] text-sky-800 mt-1.5 bg-sky-50 rounded-lg px-2.5 py-1.5">Reply: {r.reply}</p>}
      <div className="flex items-center gap-2 mt-2.5">
        <span className="text-[11.5px] text-slate-500 flex-1 truncate">
          {r.assigneeId?.name ? <>Taken by <b className="text-slate-700 font-semibold">{r.assigneeId.name}</b>{r.status === 'done' && r.doneAt ? ` · done ${ago(r.doneAt)}` : ''}</> : 'Not taken yet'}
        </span>
        {r.requesterId?.phone && <a href={`tel:${r.requesterId.phone}`} aria-label="Call" className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"><Phone size={13} /></a>}
        {r.status === 'open' && (
          <button disabled={busy} onClick={() => onAct(r, 'accepted')} className="inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg text-sky-700 bg-sky-50 hover:bg-sky-100 disabled:opacity-50"><Play size={11} /> Accept</button>
        )}
        {r.status !== 'done' && r.status !== 'cancelled' && (
          <button disabled={busy} onClick={() => onAct(r, 'done')} className="inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50"><Check size={12} /> Done</button>
        )}
      </div>
    </div>
  );
}

export default function Requests() {
  const site = useSite();
  const socketCtx = useSocket();
  const kinds = site.requestKinds || [];
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('open'); // phones: one column at a time
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await requestAPI.list({ scope: 'all' });
      setList(data.data || []);
    } catch (err) {
      if (err.response?.status !== 403) toast.error('Could not load requests');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Live: merge the updated / new request
  useEffect(() => {
    if (!socketCtx?.subscribe) return;
    return socketCtx.subscribe('request_update', (req) => {
      if (!req?._id) return;
      setList(l => {
        const i = l.findIndex(x => x._id === req._id);
        if (i < 0) return [req, ...l];
        const next = [...l]; next[i] = req; return next;
      });
    });
  }, [socketCtx]);

  const act = async (r, status) => {
    setBusy(r._id);
    try {
      const { data } = await requestAPI.update(r._id, { status });
      setList(l => l.map(x => (x._id === r._id ? data.data : x)));
      toast.success(data.message || 'Updated');
      announceRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update');
    } finally { setBusy(null); }
  };

  const by = useMemo(() => {
    const sort = (a, b) => (b.urgent && b.status !== 'done') - (a.urgent && a.status !== 'done') || new Date(b.createdAt) - new Date(a.createdAt);
    return Object.fromEntries(COLS.map(c => [c.key, list.filter(r => r.status === c.key).sort(sort)]));
  }, [list]);
  const urgentOpen = list.filter(r => r.urgent && r.status !== 'done' && r.status !== 'cancelled').length;

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
          ? by[c.key].map(r => <RequestCard key={r._id} r={r} kinds={kinds} onAct={act} busy={busy === r._id} />)
          : <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-[12.5px] text-slate-400">Nothing {c.label.toLowerCase()}</div>}
      </div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <div className="dash-rise">
        <h1 className="text-[22px] font-semibold text-slate-900" style={{ letterSpacing: '-0.025em' }}>Requests</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">What {site.terms.members.toLowerCase()} asked staff for — {kinds.slice(0, 3).map(k => k.label.toLowerCase()).join(', ')}{kinds.length > 3 ? '…' : ''}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile i={0} label="Open" value={by.open.length} Icon={Inbox} color="#F59E0B" pulse={by.open.length > 0} active={tab === 'open'} onClick={() => setTab('open')} />
        <StatTile i={1} label="Urgent" value={urgentOpen} Icon={AlertTriangle} color="#EF4444" hint="Not done yet" />
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
    </div>
  );
}
