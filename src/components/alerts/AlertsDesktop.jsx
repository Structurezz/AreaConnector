import { useEffect, useRef, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Bell, Megaphone, MapPin, Phone, AlertTriangle, ShieldAlert, ShieldCheck, Flame, HeartPulse, Volume2, CircleHelp,
  CheckCircle2, Eye, Clock, Shield, ChevronLeft, ChevronRight, Radio,
} from 'lucide-react';
import useFillHeight from '../../hooks/useFillHeight';
import { useCall } from '../../context/CallContext';
import { useAuth } from '../../context/AuthContext';
import { estateAPI } from '../../api';
import EstateMap from '../EstateMap';

// The estate (name + map pin), loaded once for the alert map
function useEstate() {
  const { user } = useAuth() || {};
  const estateId = user?.estateId?._id || user?.estateId;
  const [estate, setEstate] = useState(null);
  useEffect(() => {
    if (!estateId) return;
    estateAPI.getOne(estateId).then(({ data }) => setEstate(data.data)).catch(() => {});
  }, [estateId]);
  return estate;
}

const TYPE_META = {
  security: { label: 'Security', Icon: Shield,     color: '#EF4444' },
  fire:     { label: 'Fire',     Icon: Flame,      color: '#F97316' },
  medical:  { label: 'Medical',  Icon: HeartPulse, color: '#EC4899' },
  noise:    { label: 'Noise',    Icon: Volume2,    color: '#8B5CF6' },
  other:    { label: 'Other',    Icon: CircleHelp, color: '#64748B' },
};
const STATUS_META = {
  open:         { label: 'Open',         color: '#EF4444', bg: '#FEF2F2' },
  acknowledged: { label: 'Acknowledged', color: '#D97706', bg: '#FFFBEB' },
  resolved:     { label: 'Resolved',     color: '#059669', bg: '#ECFDF5' },
};
const SEVERITY = {
  critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700', low: 'bg-green-100 text-green-700',
};
const AUDIENCE = { all: 'Everyone', staff: 'Staff only', estate_manager: 'Managers', security: 'Security team' };

const typeOf = (a) => TYPE_META[a.type] || TYPE_META.other;
const ago = (d) => formatDistanceToNow(new Date(d), { addSuffix: true });

function Timeline({ a }) {
  const steps = [
    { key: 'raised', label: 'Raised', at: a.createdAt, done: true, color: '#EF4444', Icon: Bell },
    { key: 'ack', label: 'Acknowledged', at: a.acknowledgedAt, done: a.status !== 'open', color: '#D97706', Icon: Eye },
    { key: 'resolved', label: 'Resolved', at: a.resolvedAt, done: a.status === 'resolved', color: '#059669', Icon: CheckCircle2,
      by: a.resolvedBy?.name },
  ];
  return (
    <div className="flex items-start">
      {steps.map((s, i) => (
        <div key={s.key} className={`flex items-start ${i < steps.length - 1 ? 'flex-1' : ''}`}>
          <div className="flex flex-col items-center text-center w-24">
            <span className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
              style={s.done ? { background: s.color, color: '#fff' } : { background: '#F1F5F9', color: '#94A3B8' }}>
              <s.Icon size={15} />
            </span>
            <span className={`mt-1.5 text-[12px] font-semibold ${s.done ? 'text-slate-900' : 'text-slate-400'}`}>{s.label}</span>
            <span className="text-[11px] text-slate-400">{s.done && s.at ? format(new Date(s.at), 'MMM d, HH:mm') : s.done ? 'Done' : 'Waiting'}</span>
            {s.by && <span className="text-[11px] text-slate-400">by {s.by}</span>}
          </div>
          {i < steps.length - 1 && (
            <div className="flex-1 h-[3px] mt-4 rounded-full overflow-hidden bg-slate-100">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: steps[i + 1].done ? '100%' : '0%', background: steps[i + 1].color }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AlertDetail({ a, onAck, onResolve, busy, estate }) {
  const { call, startCall } = useCall() || {};
  const t = typeOf(a);
  const st = STATUS_META[a.status] || STATUS_META.open;
  const who = a.residentId;
  const live = a.status !== 'resolved';
  return (
    <div key={a._id} className="animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden px-7 py-6 text-white"
        style={{ background: live ? `linear-gradient(120deg, #1F0A0A 0%, #450A0A 45%, ${t.color} 160%)` : 'linear-gradient(120deg, #0F172A, #1E293B)' }}>
        {a.status === 'open' && <div className="dash-blob absolute -top-16 right-10 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: `${t.color}55` }} />}
        <div className="relative flex items-start gap-4">
          <div className="relative w-14 h-14 flex-shrink-0">
            {a.status === 'open' && <span className="dash-ripple absolute inset-0 rounded-2xl border-2" style={{ borderColor: t.color }} />}
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: t.color, boxShadow: `0 12px 24px -10px ${t.color}` }}>
              <t.Icon size={24} />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap text-[11px] font-semibold">
              <span className="px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
              <span className="px-2 py-0.5 rounded-full bg-white/10">{t.label}</span>
              {a.severity && <span className={`px-2 py-0.5 rounded-full ${SEVERITY[a.severity] || ''}`}>{a.severity.toUpperCase()}</span>}
              {a.isEmergencyBroadcast && <span className="px-2 py-0.5 rounded-full bg-white/10 inline-flex items-center gap-1"><Radio size={11} /> Broadcast · {AUDIENCE[a.audience] || 'Everyone'}</span>}
            </div>
            <h2 className="mt-2 text-[20px] font-semibold text-white" style={{ letterSpacing: '-0.02em' }}>{a.title || `${t.label} alert`}</h2>
            <p className="text-[13px] text-white/70 mt-0.5">{format(new Date(a.createdAt), 'EEEE d MMMM · HH:mm')} · {ago(a.createdAt)}</p>
          </div>
        </div>
      </div>

      <div className="p-7 space-y-6">
        <Timeline a={a} />

        {/* Raised by */}
        {who?.name && (
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200/70">
            {who.profilePhoto
              ? <img src={who.profilePhoto} alt="" className="w-11 h-11 rounded-full object-cover" />
              : <span className="w-11 h-11 rounded-full flex items-center justify-center bg-emerald-50 text-emerald-700 font-semibold">{who.name[0]?.toUpperCase()}</span>}
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-slate-400">Raised by</div>
              <div className="text-[14px] font-semibold text-slate-900 truncate">{who.name}</div>
              <div className="text-[12px] text-slate-500">
                {a.unitId?.unitNumber ? `${a.unitId.block ? `Block ${a.unitId.block} · ` : ''}Unit ${a.unitId.unitNumber}` : (a.raisedByRole === 'resident' ? 'Resident' : a.raisedByRole?.replace('_', ' '))}
              </div>
            </div>
            {startCall && who._id && (
              <button onClick={() => startCall({ _id: who._id, name: who.name, profilePhoto: who.profilePhoto, role: a.raisedByRole })} disabled={!!call}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-40">
                <Phone size={14} /> Call
              </button>
            )}
            {who.phone && (
              <a href={`tel:${who.phone}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">
                {who.phone}
              </a>
            )}
          </div>
        )}

        {/* Details beside a compact map */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-4 items-start">
          <div className="space-y-4 min-w-0">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5"><MapPin size={12} /> Reported location</div>
              <div className="mt-1 text-[14px] font-medium text-slate-900">
                {a.location || (a.unitId?.unitNumber ? `Unit ${a.unitId.unitNumber}` : 'Not specified')}
              </div>
            </div>
            {a.contactNumber && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5"><Phone size={12} /> Emergency contact</div>
                <a href={`tel:${a.contactNumber}`} className="mt-1 block text-[14px] font-medium text-slate-900 hover:text-emerald-600">{a.contactNumber}</a>
              </div>
            )}
            {a.note && (
              <div>
                <div className="text-[11px] font-medium text-slate-400 mb-1.5">Details</div>
                <p className="text-[14px] text-slate-700 leading-relaxed whitespace-pre-line">{a.note}</p>
              </div>
            )}
            {a.actionRequired && (
              <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[12px] font-semibold text-amber-800">Action required</div>
                  <div className="text-[14px] text-amber-900">{a.actionRequired}</div>
                </div>
              </div>
            )}
          </div>

          {/* Map */}
          <div className="rounded-2xl border border-slate-200/70 overflow-hidden">
            <div className="p-1.5">
              <EstateMap
                name={a.location || estate?.name || 'Estate'}
                address={estate?.address}
                location={estate?.location}
                height={200}
                variant="plain"
              />
            </div>
            <div className="px-3 py-2 border-t border-slate-100 text-[11px] text-slate-400 truncate">
              Pin marks {estate?.name || 'the estate'}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {live && (
        <div className="sticky bottom-0 px-7 py-4 bg-white/95 backdrop-blur border-t border-slate-100 flex items-center gap-3">
          <p className="flex-1 text-[12px] text-slate-500">
            {a.status === 'open' ? 'Acknowledge to let everyone know it is being handled.' : 'Mark it resolved once the situation is under control.'}
          </p>
          {a.status === 'open' && (
            <button onClick={() => onAck(a._id)} disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50">
              <Eye size={15} /> Acknowledge
            </button>
          )}
          <button onClick={() => onResolve(a._id)} disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50"
            style={{ boxShadow: '0 10px 20px -10px rgba(5,150,105,0.8)' }}>
            <CheckCircle2 size={15} /> Resolve
          </button>
        </div>
      )}
    </div>
  );
}

export default function AlertsDesktop({
  alerts, loading, statusFilter, setStatusFilter, page, pagination, onPage, onAck, onResolve, onBroadcast, counts,
}) {
  const shellRef = useRef(null);
  const height = useFillHeight(shellRef, true, { min: 560 });
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const estate = useEstate();

  // Keep a sensible selection: first open alert, else the first in the list
  useEffect(() => {
    if (alerts.some((a) => a._id === selectedId)) return;
    setSelectedId((alerts.find((a) => a.status === 'open') || alerts[0])?._id || null);
  }, [alerts, selectedId]);

  const selected = alerts.find((a) => a._id === selectedId);
  const openN = counts?.open ?? 0;
  const run = async (fn, id) => { setBusy(true); try { await fn(id); } finally { setBusy(false); } };

  const TABS = [
    ['', 'All', (counts?.open ?? 0) + (counts?.acknowledged ?? 0) + (counts?.resolved ?? 0)],
    ['open', 'Open', counts?.open],
    ['acknowledged', 'Acknowledged', counts?.acknowledged],
    ['resolved', 'Resolved', counts?.resolved],
  ];

  return (
    <div ref={shellRef} className="max-w-[1500px] mx-auto flex flex-col gap-4" style={{ height: height ?? 'calc(100vh - 4rem)' }}>
      {/* ── Banner ── */}
      <div className="dash-rise flex-none relative overflow-hidden rounded-2xl px-6 py-4"
        style={{ background: openN > 0 ? 'linear-gradient(120deg, #1F0A0A 0%, #450A0A 55%, #7F1D1D 100%)' : 'linear-gradient(120deg, #022C22 0%, #064E3B 55%, #065F46 100%)',
          boxShadow: openN > 0 ? '0 16px 32px -18px rgba(127,29,29,0.8)' : '0 16px 32px -18px rgba(6,78,59,0.8)' }}>
        <div className="dash-blob absolute -top-20 right-56 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: openN > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(52,211,153,0.22)' }} />
        <div className="relative flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative w-12 h-12 flex-shrink-0">
              <span className="dash-ripple absolute inset-0 rounded-xl border-2" style={{ borderColor: openN > 0 ? '#F87171' : '#6EE7B7' }} />
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/10 border border-white/15">
                {openN > 0 ? <ShieldAlert size={22} className="text-red-300" /> : <ShieldCheck size={22} className="text-emerald-300" />}
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-[22px] font-semibold text-white" style={{ letterSpacing: '-0.025em' }}>Security alerts</h1>
              <p className="text-[13px] text-white/70">
                {openN > 0 ? <><span className="font-semibold text-red-200">{openN} open alert{openN === 1 ? '' : 's'}</span> need{openN === 1 ? 's' : ''} attention</> : 'All quiet. No open alerts right now.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {[
              ['Open', counts?.open, '#FCA5A5'],
              ['Acknowledged', counts?.acknowledged, '#FCD34D'],
              ['Resolved', counts?.resolved, '#6EE7B7'],
            ].map(([label, n, color]) => (
              <div key={label} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 min-w-[84px]">
                <div className="text-[16px] font-semibold tabular-nums leading-none" style={{ color }}>{n ?? '—'}</div>
                <div className="text-[10px] text-white/55 mt-1">{label}</div>
              </div>
            ))}
            <button onClick={onBroadcast}
              className="ml-1 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-red-500 hover:bg-red-600 transition-all hover:-translate-y-0.5"
              style={{ boxShadow: '0 10px 22px -10px rgba(239,68,68,0.9)' }}>
              <Megaphone size={15} /> Broadcast alert
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-[400px_minmax(0,1fr)] gap-4">
        {/* ── List ── */}
        <div className="dash-rise h-full min-h-0 flex flex-col rounded-2xl bg-white border border-slate-200/70 overflow-hidden" style={{ animationDelay: '60ms' }}>
          <div className="flex-none flex gap-1 p-2 border-b border-slate-100 overflow-x-auto no-scrollbar">
            {TABS.map(([key, label, n]) => {
              const on = statusFilter === key;
              return (
                <button key={key || 'all'} onClick={() => setStatusFilter(key)}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${on ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                  {label}
                  {n != null && <span className={`text-[10px] tabular-nums px-1.5 rounded ${on ? 'bg-white/20' : key === 'open' && n > 0 ? 'bg-red-500 text-white' : 'bg-slate-100'}`}>{n}</span>}
                </button>
              );
            })}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="p-3 space-y-2">{[0, 1, 2, 3, 4].map((k) => <div key={k} className="skeleton h-16 rounded-xl" />)}</div>
            ) : alerts.length === 0 ? (
              <div className="py-16 text-center px-6">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center"><ShieldCheck size={22} className="text-emerald-500" /></div>
                <p className="mt-3 text-[14px] font-semibold text-slate-800">No alerts here</p>
                <p className="mt-0.5 text-[12px] text-slate-400">The estate is calm.</p>
              </div>
            ) : alerts.map((a, i) => {
              const t = typeOf(a);
              const st = STATUS_META[a.status] || STATUS_META.open;
              const on = a._id === selectedId;
              return (
                <button key={a._id} onClick={() => setSelectedId(a._id)}
                  className={`dash-rise relative w-full flex items-start gap-3 px-4 py-3 text-left border-b border-slate-50 transition-colors ${on ? 'bg-slate-50' : 'hover:bg-slate-50/60'}`}
                  style={{ animationDelay: `${80 + i * 30}ms` }}>
                  <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: on ? st.color : a.status === 'open' ? `${st.color}80` : 'transparent' }} />
                  <span className="relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${t.color}14` }}>
                    <t.Icon size={16} style={{ color: t.color }} />
                    {a.status === 'open' && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className={`text-[13px] truncate ${a.status === 'open' ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>{a.title || `${t.label} alert`}</span>
                      {a.isEmergencyBroadcast && <Radio size={11} className="text-red-500 flex-shrink-0" />}
                    </span>
                    <span className="block text-[12px] text-slate-500 truncate">
                      {a.residentId?.name || 'Unknown'}{a.unitId?.unitNumber ? ` · Unit ${a.unitId.unitNumber}` : ''}{a.location ? ` · ${a.location}` : ''}
                    </span>
                    <span className="mt-1 flex items-center gap-2 text-[11px]">
                      <span className="font-semibold" style={{ color: st.color }}>{st.label}</span>
                      <span className="text-slate-400 flex items-center gap-1"><Clock size={10} /> {ago(a.createdAt)}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {pagination.pages > 1 && (
            <div className="flex-none flex items-center justify-between px-3 py-2 border-t border-slate-100 text-[12px] text-slate-500">
              <span>Page {page} of {pagination.pages} · {pagination.total} alerts</span>
              <span className="flex gap-1">
                <button onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page" className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={14} /></button>
                <button onClick={() => onPage(page + 1)} disabled={page >= pagination.pages} aria-label="Next page" className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={14} /></button>
              </span>
            </div>
          )}
        </div>

        {/* ── Detail ── */}
        <div className="dash-rise h-full min-h-0 overflow-y-auto rounded-2xl bg-white border border-slate-200/70" style={{ animationDelay: '120ms' }}>
          {selected ? (
            <AlertDetail a={selected} busy={busy} estate={estate} onAck={(id) => run(onAck, id)} onResolve={(id) => run(onResolve, id)} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <span className="dash-ripple absolute inset-0 rounded-full border-2 border-emerald-200" />
                <span className="dash-ripple absolute inset-0 rounded-full border-2 border-emerald-200" style={{ animationDelay: '1s' }} />
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #34D399, #059669)' }}>
                  <ShieldCheck size={28} />
                </div>
              </div>
              <h2 className="mt-5 text-[16px] font-semibold text-slate-900">Nothing selected</h2>
              <p className="mt-1 text-[13px] text-slate-500 max-w-xs">Alerts raised by residents and security appear on the left the moment they happen.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
