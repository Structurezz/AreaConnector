// Non-estate sites: who an alert was routed to (care team, ward nurses,
// on-call staff…), who is responding ("Dr Ade (Doctor) · On my way · 1 min
// ago"), an Escalated badge, and manager respond buttons
// (POST /api/alerts/:id/respond). Live updates arrive through the page's
// `new_alert` socket handler; the response here is shown straight away too.
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { formatDistanceToNowStrict } from 'date-fns';
import { Navigation, MapPin, Radio, TrendingUp } from 'lucide-react';
import { alertAPI } from '../../api';
import { useSite } from '../../context/SiteContext';

const STATUS = {
  on_my_way: { label: 'On my way', color: '#0EA5E9' },
  arrived:   { label: 'Arrived',   color: '#10B981' },
  cannot:    { label: "Can't come", color: '#94A3B8' },
};

export function EscalatedBadge({ a }) {
  const site = useSite();
  if (site.isEstate || !a?.escalatedAt) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200" title={`Escalated ${formatDistanceToNowStrict(new Date(a.escalatedAt))} ago — nobody answered in time`}>
      <TrendingUp size={10} /> Escalated
    </span>
  );
}

export default function AlertRouting({ a, compact = false }) {
  const site = useSite();
  const [responders, setResponders] = useState(a.responders || []);
  const [busy, setBusy] = useState(null);
  useEffect(() => { setResponders(a.responders || []); }, [a._id, a.responders]);
  if (site.isEstate) return null;
  const routed = (a.routedTo || []).length;
  const live = a.status !== 'resolved';

  const respond = async (status) => {
    setBusy(status);
    try {
      const { data } = await alertAPI.respond(a._id, status);
      setResponders(data.data?.responders || []);
      toast.success(data.message || 'Sent');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not respond');
    } finally { setBusy(null); }
  };

  return (
    <div className={`rounded-2xl border border-sky-100 ${compact ? 'p-3' : 'p-4'}`} style={{ background: 'linear-gradient(135deg, #F0F9FF, #FFFFFF 70%)' }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #38BDF8, #0284C7)' }}><Radio size={12} className="text-white" /></span>
        <span className="text-[12.5px] font-semibold text-slate-900 flex-1">
          {routed ? `Sent to ${routed} staff member${routed === 1 ? '' : 's'}` : 'Sent to all responders'}
        </span>
        <EscalatedBadge a={a} />
      </div>
      {responders.length ? (
        <ul className="mt-2.5 space-y-1.5">
          {responders.map((r, i) => {
            const st = STATUS[r.status] || STATUS.on_my_way;
            return (
              <li key={`${r.userId}-${i}`} className="flex items-center gap-2 text-[12.5px] text-slate-700 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: st.color }} />
                <span className="truncate">
                  <b className="font-semibold text-slate-900">{r.name}</b>{r.role ? ` (${r.role})` : ''} · <span style={{ color: st.color }} className="font-semibold">{st.label}</span>
                  {r.at && <span className="text-slate-400"> · {formatDistanceToNowStrict(new Date(r.at))} ago</span>}
                </span>
              </li>
            );
          })}
        </ul>
      ) : <p className="mt-2 text-[12px] text-slate-500">{live ? 'Nobody has responded yet.' : 'No responders recorded.'}</p>}
      {live && (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => respond('on_my_way')} disabled={!!busy}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-semibold text-sky-700 bg-white border border-sky-200 hover:bg-sky-50 disabled:opacity-50">
            <Navigation size={13} /> {busy === 'on_my_way' ? 'Sending…' : "I'm on my way"}
          </button>
          <button type="button" onClick={() => respond('arrived')} disabled={!!busy}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-semibold text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-50 disabled:opacity-50">
            <MapPin size={13} /> {busy === 'arrived' ? 'Sending…' : 'Arrived'}
          </button>
        </div>
      )}
    </div>
  );
}
