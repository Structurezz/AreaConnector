import { useState } from 'react';
import { formatDistanceToNowStrict, format } from 'date-fns';
import {
  ShieldAlert, ShieldCheck, Megaphone, MapPin, Phone, AlertTriangle, Flame, HeartPulse, Shield, Volume2,
  Check, CheckCheck, ChevronDown, Radio, Bell,
} from 'lucide-react';
import useCountUp from '../../hooks/useCountUp';
import Pagination from '../ui/Pagination';
import Spinner from '../ui/Spinner';

const TYPE = {
  security: { Icon: Shield,        color: '#6366F1', label: 'Security' },
  fire:     { Icon: Flame,         color: '#F97316', label: 'Fire' },
  medical:  { Icon: HeartPulse,    color: '#EC4899', label: 'Medical' },
  noise:    { Icon: Volume2,       color: '#0EA5E9', label: 'Noise' },
  other:    { Icon: AlertTriangle, color: '#F59E0B', label: 'Other' },
};
const SEVERITY = {
  critical: { color: '#DC2626', label: 'Critical' },
  high:     { color: '#F97316', label: 'High' },
  medium:   { color: '#EAB308', label: 'Medium' },
  low:      { color: '#22C55E', label: 'Low' },
};
const STEPS = ['open', 'acknowledged', 'resolved'];

const ago = (d) => {
  try { return formatDistanceToNowStrict(new Date(d), { addSuffix: true }); } catch { return ''; }
};

function Count({ value, label, color, delay }) {
  const n = useCountUp(value ?? 0);
  return (
    <div className="dash-rise rounded-2xl bg-white/[0.07] border border-white/10 px-3 py-2.5" style={{ animationDelay: `${delay}ms` }}>
      <div className="text-[20px] font-semibold tabular-nums leading-none" style={{ color }}>{value == null ? '–' : n}</div>
      <div className="text-[11px] text-white/55 mt-1">{label}</div>
    </div>
  );
}

function StatusCard({ counts, onBroadcast }) {
  const open = counts?.open ?? 0;
  const alarm = open > 0;
  return (
    <section className="dash-rise relative overflow-hidden rounded-[26px] p-5 text-white"
      style={{
        background: alarm
          ? 'linear-gradient(150deg, #2A0606 0%, #7F1D1D 50%, #DC2626 120%)'
          : 'linear-gradient(150deg, #022C22 0%, #064E3B 50%, #047857 115%)',
        boxShadow: alarm ? '0 24px 44px -24px rgba(127,29,29,0.95)' : '0 24px 44px -24px rgba(2,44,34,0.95)',
      }}>
      <div className="dash-blob absolute -top-20 -right-16 w-56 h-56 rounded-full blur-3xl pointer-events-none"
        style={{ background: alarm ? 'rgba(248,113,113,0.4)' : 'rgba(52,211,153,0.35)' }} />

      {/* Radar */}
      <div className="absolute -right-10 -top-10 w-48 h-48 pointer-events-none opacity-60">
        {[1, 0.7, 0.4].map((s) => (
          <span key={s} className="absolute rounded-full border border-white/15" style={{ inset: `${(1 - s) * 50}%` }} />
        ))}
        <span className="dash-radar absolute inset-0 rounded-full"
          style={{ background: `conic-gradient(from 0deg, ${alarm ? 'rgba(254,202,202,0.45)' : 'rgba(167,243,208,0.4)'}, transparent 28%)` }} />
        {alarm && <span className="absolute left-[34%] top-[58%] w-2.5 h-2.5 rounded-full bg-red-200"><span className="dash-ripple absolute inset-0 rounded-full bg-red-200" /></span>}
      </div>

      <div className="relative">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/10 border border-white/15">
          <span className="relative flex w-1.5 h-1.5">
            <span className={`absolute inset-0 rounded-full animate-ping ${alarm ? 'bg-red-300' : 'bg-emerald-300'}`} />
            <span className={`relative w-1.5 h-1.5 rounded-full ${alarm ? 'bg-red-300' : 'bg-emerald-300'}`} />
          </span>
          {alarm ? 'Needs attention' : 'Monitoring'}
        </span>
        <div className="mt-3 flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl flex items-center justify-center bg-white/12 border border-white/15 flex-shrink-0">
            {alarm ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
          </span>
          <div className="min-w-0">
            <div className="text-[18px] font-semibold leading-tight" style={{ letterSpacing: '-0.02em' }}>
              {alarm ? `${open} open alert${open !== 1 ? 's' : ''}` : 'All secure'}
            </div>
            <div className="text-[12px] text-white/65">{alarm ? 'Acknowledge so residents know help is coming' : 'No one needs help right now'}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Count value={counts?.open} label="Open" color={alarm ? '#FECACA' : '#fff'} delay={120} />
          <Count value={counts?.acknowledged} label="Acknowledged" color="#FDE68A" delay={170} />
          <Count value={counts?.resolved} label="Resolved" color="#A7F3D0" delay={220} />
        </div>

        <button onClick={onBroadcast}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-white font-semibold text-[14px] active:scale-[0.99] transition-transform"
          style={{ color: alarm ? '#B91C1C' : '#047857', boxShadow: '0 10px 22px -12px rgba(0,0,0,0.5)' }}>
          <Megaphone size={16} /> Send emergency broadcast
        </button>
      </div>
    </section>
  );
}

function Progress({ status, color }) {
  const at = Math.max(0, STEPS.indexOf(status));
  return (
    <div>
    <div className="flex items-center gap-1.5">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-1.5 flex-1 last:flex-none">
          <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ background: i <= at ? (i === 2 ? '#10B981' : color) : '#E2E8F0' }}>
            {i < at || at === 2 ? <Check size={10} className="text-white" strokeWidth={3} /> : i === at ? <span className="w-1.5 h-1.5 rounded-full bg-white" /> : null}
          </span>
          {i < 2 && <span className="h-0.5 flex-1 rounded-full" style={{ background: i < at ? color : '#E2E8F0' }} />}
        </div>
      ))}
    </div>
    <div className="mt-1 flex justify-between text-[10px] font-medium">
      {['Raised', 'Acknowledged', 'Resolved'].map((l, i) => (
        <span key={l} style={{ color: i <= at ? '#475569' : '#CBD5E1' }}>{l}</span>
      ))}
    </div>
    </div>
  );
}

function AlertCard({ a, i, onAck, onResolve }) {
  const [open, setOpen] = useState(a.status === 'open');
  const [busy, setBusy] = useState(null);
  const t = TYPE[a.type] || TYPE.other;
  const sev = SEVERITY[a.severity] || (a.status === 'open' ? SEVERITY.high : null);
  const live = a.status === 'open';
  const accent = live ? '#EF4444' : a.status === 'acknowledged' ? '#F59E0B' : '#10B981';
  const phone = a.contactNumber || a.residentId?.phone;
  const who = a.residentId?.name || (a.isEmergencyBroadcast ? 'Estate management' : 'Resident');
  const act = async (kind, fn) => { setBusy(kind); try { await fn(a._id); } finally { setBusy(null); } };

  return (
    <article className="dash-rise relative overflow-hidden rounded-[22px] bg-white border"
      style={{ animationDelay: `${140 + i * 60}ms`, borderColor: live ? '#FECACA' : '#E2E8F0', boxShadow: live ? '0 14px 30px -20px rgba(239,68,68,0.6)' : '0 1px 2px rgba(15,23,42,0.04)' }}>
      <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: sev?.color || accent }} />
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full text-left p-4 pl-5">
        <div className="flex items-start gap-3">
          <span className="relative w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${t.color}16` }}>
            {live && <span className="dash-ripple absolute inset-0 rounded-2xl" style={{ background: `${t.color}35` }} />}
            <t.Icon size={19} className="relative" style={{ color: t.color }} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.color }}>{t.label}</span>
              {sev && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: `${sev.color}18`, color: sev.color }}>{sev.label}</span>}
              {a.isEmergencyBroadcast && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-900 text-white inline-flex items-center gap-1"><Radio size={9} /> Broadcast</span>}
              <span className="ml-auto text-[11px] text-slate-400 flex-shrink-0">{ago(a.createdAt)}</span>
            </div>
            <div className="mt-1 text-[15px] font-semibold text-slate-900 leading-snug" style={{ letterSpacing: '-0.01em' }}>
              {a.title || `${t.label} alert from ${who}`}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-500 min-w-0">
              {a.residentId?.profilePhoto
                ? <img src={a.residentId.profilePhoto} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                : <span className="w-4 h-4 rounded-full bg-slate-100 text-[8px] font-bold text-slate-500 flex items-center justify-center flex-shrink-0">{who[0]?.toUpperCase()}</span>}
              <span className="truncate">{who}{a.unitId?.unitNumber ? ` · Unit ${a.unitId.unitNumber}` : ''}</span>
              {a.location && <span className="truncate flex items-center gap-0.5"><MapPin size={11} className="flex-shrink-0" />{a.location}</span>}
            </div>
          </div>
          <ChevronDown size={16} className={`text-slate-300 flex-shrink-0 mt-1 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>

        <div className="mt-3.5 pl-14"><Progress status={a.status} color={accent} /></div>
      </button>

      {open && (
        <div className="px-4 pl-5 pb-4 -mt-1 animate-fade-in">
          {a.note && <p className="text-[13px] text-slate-600 leading-relaxed">{a.note}</p>}
          {a.actionRequired && (
            <div className="mt-2.5 flex items-start gap-2 rounded-xl px-3 py-2 bg-amber-50 border border-amber-100 text-[12px] text-amber-800">
              <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" /> <span><span className="font-semibold">Action:</span> {a.actionRequired}</span>
            </div>
          )}
          <div className="mt-2.5 text-[11px] text-slate-400">
            {format(new Date(a.createdAt), "EEE d MMM · HH:mm")}{a.resolvedBy ? ` · Resolved by ${a.resolvedBy.name}` : ''}
          </div>

          {(a.status !== 'resolved' || phone) && (
            <div className="mt-3 flex gap-2">
              {phone && (
                <a href={`tel:${phone}`} className="w-11 h-11 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0 active:scale-95 transition-transform" aria-label="Call">
                  <Phone size={16} />
                </a>
              )}
              {a.status === 'open' && (
                <button onClick={() => act('ack', onAck)} disabled={!!busy}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-11 rounded-xl font-semibold text-[13px] border active:scale-[0.98] transition-transform disabled:opacity-60"
                  style={{ borderColor: '#FCD34D', background: '#FFFBEB', color: '#B45309' }}>
                  {busy === 'ack' ? <Spinner size={14} /> : <Check size={15} />} Acknowledge
                </button>
              )}
              {a.status !== 'resolved' && (
                <button onClick={() => act('res', onResolve)} disabled={!!busy}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-11 rounded-xl font-semibold text-[13px] text-white active:scale-[0.98] transition-transform disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 10px 20px -12px rgba(5,150,105,0.9)' }}>
                  {busy === 'res' ? <Spinner size={14} /> : <CheckCheck size={15} />} Resolve
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function AlertsMobile({
  alerts, loading, counts, statusFilter, setStatusFilter, page, pagination, pageSize, onPage, onAck, onResolve, onBroadcast,
}) {
  const total = counts ? counts.open + counts.acknowledged + counts.resolved : null;
  const FILTERS = [
    ['', 'All', total],
    ['open', 'Open', counts?.open],
    ['acknowledged', 'Acknowledged', counts?.acknowledged],
    ['resolved', 'Resolved', counts?.resolved],
  ];

  return (
    <div className="space-y-5 pb-2">
      <header className="dash-rise">
        <div className="text-[12px] font-medium text-slate-400">Security</div>
        <h1 className="text-[22px] font-semibold text-slate-900 leading-tight" style={{ letterSpacing: '-0.03em' }}>Alerts</h1>
      </header>

      <StatusCard counts={counts} onBroadcast={onBroadcast} />

      <div className="sticky -top-4 z-10 -mx-4 px-4 py-2 bg-[#F8FAFC]/90 backdrop-blur">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {FILTERS.map(([key, label, n]) => {
            const on = statusFilter === key;
            return (
              <button key={key || 'all'} onClick={() => setStatusFilter(key)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all flex-shrink-0"
                style={on ? { background: '#0F172A', color: '#fff' } : { background: '#fff', color: '#475569', border: '1px solid #E2E8F0' }}>
                {label}
                {n != null && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] leading-[18px] text-center tabular-nums"
                    style={on ? { background: 'rgba(255,255,255,0.18)' } : { background: key === 'open' && n ? '#FEE2E2' : '#F1F5F9', color: key === 'open' && n ? '#DC2626' : '#64748B' }}>
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(k => <div key={k} className="skeleton h-[120px] rounded-[22px]" />)}
        </div>
      ) : alerts.length === 0 ? (
        <div className="dash-rise rounded-[22px] bg-white border border-slate-200/70 px-6 py-10 text-center">
          <span className="relative mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-emerald-50">
            <span className="dash-ripple absolute inset-0 rounded-full bg-emerald-100" />
            <Bell size={24} className="relative text-emerald-600" />
          </span>
          <div className="mt-4 text-[15px] font-semibold text-slate-900">Nothing here</div>
          <div className="text-[13px] text-slate-500 mt-1">{statusFilter ? `No ${statusFilter} alerts.` : 'The estate is calm.'}</div>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a, i) => <AlertCard key={a._id} a={a} i={i} onAck={onAck} onResolve={onResolve} />)}
        </div>
      )}

      <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={pageSize} onPage={onPage} />
    </div>
  );
}
