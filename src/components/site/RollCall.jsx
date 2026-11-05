// Emergency roll-call (module rollcall, non-estate sites): the shared hook,
// the "Start emergency roll-call" button (Alerts page, Dashboard) and the red
// banner shown app-wide while one is running.
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Siren, ChevronRight } from 'lucide-react';
import { rollcallAPI } from '../../api';
import { useSite } from '../../context/SiteContext';
import { useSocket } from '../../context/SocketContext';
import SitePanel from './SitePanel';

export const useRollCallEnabled = () => {
  const site = useSite();
  return !site.isEstate && site.on('rollcall');
};

// The running roll-call (or null). Refreshes on socket `rollcall_update` and
// every `every` ms while one is running.
export function useActiveRollCall({ every = 10000 } = {}) {
  const enabled = useRollCallEnabled();
  const socketCtx = useSocket();
  const [rc, setRc] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const { data } = await rollcallAPI.active();
      setRc(data.data || null);
    } catch { /* keep the last state */ } finally { setLoaded(true); }
  }, [enabled]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!enabled || !socketCtx?.subscribe) return;
    return socketCtx.subscribe('rollcall_update', () => load());
  }, [enabled, socketCtx, load]);
  useEffect(() => {
    if (!enabled || !rc) return;
    const t = setInterval(load, every);
    return () => clearInterval(t);
  }, [enabled, rc, every, load]);
  return { rc, setRc, loaded, reload: load, enabled };
}

export function StartRollCallButton({ className = '', compact = false }) {
  const enabled = useRollCallEnabled();
  const site = useSite();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  if (!enabled) return null;

  const start = async () => {
    setBusy(true);
    try {
      const { data } = await rollcallAPI.start({ reason: reason.trim() });
      toast.success(data.message || 'Roll-call started');
      setOpen(false);
      setReason('');
      navigate('/rollcall');
    } catch (err) {
      if (err.response?.status === 409) { toast('A roll-call is already running'); setOpen(false); navigate('/rollcall'); }
      else toast.error(err.response?.data?.message || 'Could not start the roll-call');
    } finally { setBusy(false); }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-white transition-all hover:-translate-y-0.5 ${compact ? 'px-3 py-2 text-[13px]' : 'px-4 py-2.5 text-[13.5px]'} ${className}`}
        style={{ background: 'linear-gradient(135deg, #EF4444, #B91C1C)', boxShadow: '0 10px 22px -12px #B91C1C' }}>
        <Siren size={compact ? 14 : 16} /> Start emergency roll-call
      </button>
      {open && (
        <SitePanel title="Start emergency roll-call" eyebrow="Evacuation" accent={['#EF4444', '#B91C1C']} onClose={() => setOpen(false)}
          subtitle={`Everyone expected at the ${site.terms.site.toLowerCase()} gets an urgent alert to say they're safe or need help.`}
          footer={(
            <div className="flex gap-2">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2.5 rounded-[9px] text-[13px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">Cancel</button>
              <button type="button" onClick={start} disabled={busy}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[9px] px-3 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #EF4444, #B91C1C)' }}>
                <Siren size={14} /> {busy ? 'Starting…' : 'Start roll-call now'}
              </button>
            </div>
          )}>
          <div className="p-5 space-y-3">
            <label className="text-xs font-semibold block" style={{ color: 'var(--text-sub)' }}>Reason</label>
            <input className="input-field" autoFocus value={reason} onChange={e => setReason(e.target.value)} maxLength={300}
              placeholder="e.g. Fire alarm in Block B — evacuate to the car park" />
            <p className="text-[12px] text-slate-500">Members on shift or in house, staff and guards are expected. You'll see who is safe, who needs help and who hasn't answered.</p>
          </div>
        </SitePanel>
      )}
    </>
  );
}

// Red banner while a roll-call is running (hidden on the roll-call page)
export function RollCallBanner() {
  const { rc, enabled } = useActiveRollCall({ every: 20000 });
  const { pathname } = useLocation();
  if (!enabled || !rc || rc.endedAt || pathname.startsWith('/rollcall')) return null;
  return (
    <Link to="/rollcall" className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-4 text-white" style={{ background: 'linear-gradient(135deg, #EF4444, #B91C1C)', boxShadow: '0 12px 26px -16px #B91C1C' }}>
      <span className="relative flex w-2.5 h-2.5 flex-shrink-0"><span className="absolute inset-0 rounded-full bg-white animate-ping opacity-75" /><span className="relative w-2.5 h-2.5 rounded-full bg-white" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold truncate">Emergency roll-call running{rc.reason ? ` — ${rc.reason}` : ''}</span>
        <span className="block text-[12px] text-white/85">{rc.safe} safe · {rc.help} need help · {rc.missing} not answered</span>
      </span>
      <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold bg-white/15 rounded-lg px-2.5 py-1.5 flex-shrink-0">Open <ChevronRight size={14} /></span>
    </Link>
  );
}

// Dashboard strip: start a roll-call (hidden while one runs — the banner shows then)
export function RollCallStrip({ className = '' }) {
  const { rc, enabled, loaded } = useActiveRollCall({ every: 30000 });
  const site = useSite();
  if (!enabled || !loaded || rc) return null;
  return (
    <div className={`dash-rise flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-red-100 px-4 py-3 ${className}`}
      style={{ background: 'linear-gradient(135deg, #FEF2F2, #FFFFFF 65%)' }}>
      <span className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F87171, #DC2626)', boxShadow: '0 6px 14px -6px #DC2626' }}><Siren size={16} className="text-white" /></span>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold text-slate-900">Emergency roll-call</div>
        <div className="text-[12px] text-slate-500">In an evacuation, alert everyone at the {site.terms.site.toLowerCase()} and see who is safe, who needs help and who's missing.</div>
      </div>
      <StartRollCallButton compact />
    </div>
  );
}
