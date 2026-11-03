import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, Phone, Mail, Calendar, Home, UserX, UserCheck, Wallet, AlertTriangle,
  UserCheck as VisitorIcon, ShieldAlert, ShieldCheck, Activity, Building2, CheckCircle2,
  Clock, Receipt, Eye, EyeOff, Gavel, ChevronRight, BarChart3,
} from 'lucide-react';
import { format, formatDistanceToNow, subMonths, startOfMonth, isSameMonth } from 'date-fns';
import { paymentAPI, visitorAPI, alertAPI } from '../../api';
import { VISITOR_STATUS, purposeIcon } from '../visitors/MobileVisitors';
import useCountUp from '../../hooks/useCountUp';

const naira = (n) => `₦${Math.round(n || 0).toLocaleString()}`;
const idOf = (x) => (x && typeof x === 'object' ? x._id : x);

const PAY_STATUS = {
  paid:    { label: 'Paid',    bg: '#ECFDF5', text: '#047857', dot: '#10B981' },
  pending: { label: 'Pending', bg: '#FFFBEB', text: '#B45309', dot: '#F59E0B' },
  overdue: { label: 'Overdue', bg: '#FEF2F2', text: '#B91C1C', dot: '#EF4444' },
  waived:  { label: 'Waived',  bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' },
};
const ALERT_TONE = {
  open:         { label: 'Open',         bg: '#FEF2F2', text: '#B91C1C', dot: '#EF4444' },
  acknowledged: { label: 'Acknowledged', bg: '#FFFBEB', text: '#B45309', dot: '#F59E0B' },
  resolved:     { label: 'Resolved',     bg: '#ECFDF5', text: '#047857', dot: '#10B981' },
};
const RESTRICTION = {
  notice: { label: 'Dues notice sent', color: '#F59E0B', text: 'A written dues notice has been sent. Nothing is restricted yet.' },
  active: { label: 'Services paused',  color: '#EF4444', text: 'Convenience services are paused until the overdue dues are paid.' },
};

function Pill({ tone }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: tone.bg, color: tone.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone.dot }} /> {tone.label}
    </span>
  );
}

function Card({ title, Icon, color, right, children, className = '', delay = 0 }) {
  return (
    <section className={`dash-rise rounded-2xl bg-white border border-slate-200/70 overflow-hidden ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {title && (
        <div className="flex items-center justify-between px-5 h-12 border-b border-slate-100">
          <h2 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2" style={{ letterSpacing: '-0.01em' }}>
            <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 4px 10px -4px ${color}` }}>
              <Icon size={13} className="text-white" />
            </span>
            {title}
          </h2>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

function Kpi({ i, label, value, display, sub, Icon, color }) {
  const n = useCountUp(value || 0);
  return (
    <div className="dash-tile dash-rise group rounded-2xl p-4 border min-w-0"
      style={{ animationDelay: `${80 + i * 60}ms`, background: `linear-gradient(140deg, ${color}17 0%, #FFFFFF 55%)`, borderColor: `${color}2E` }}>
      <span className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full pointer-events-none transition-transform duration-500 group-hover:scale-125" style={{ background: `${color}12` }} />
      <span className="relative w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 14px -6px ${color}` }}>
        <Icon size={15} className="text-white" />
      </span>
      <div className="relative mt-3 text-[24px] font-semibold leading-none text-slate-900 tabular-nums" style={{ letterSpacing: '-0.03em' }}>{display ? display(n) : n}</div>
      <div className="relative mt-1 text-[12px] font-medium text-slate-500 truncate">{label}</div>
      {sub && <div className="relative mt-0.5 text-[11px] text-slate-400 truncate">{sub}</div>}
    </div>
  );
}

function Empty({ Icon, text }) {
  return (
    <div className="py-10 text-center">
      <Icon size={20} className="mx-auto text-slate-300" />
      <p className="text-[13px] text-slate-500 mt-2">{text}</p>
    </div>
  );
}

/* ── Overview pieces ─────────────────────────────────────────────── */

function VisitorTrend({ visitors }) {
  const months = useMemo(() => Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(new Date(), 5 - i))).map((m) => ({
    m, count: visitors.filter((v) => v.expectedDate && isSameMonth(new Date(v.expectedDate), m)).length,
  })), [visitors]);
  const max = Math.max(1, ...months.map((x) => x.count));
  return (
    <div className="flex items-end gap-3 h-[140px] px-5 pb-4 pt-5">
      {months.map(({ m, count }, i) => {
        const last = i === months.length - 1;
        return (
          <div key={i} className="flex-1 h-full flex flex-col items-center justify-end gap-2 group">
            <span className="text-[11px] font-semibold text-slate-700 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">{count}</span>
            <div className="w-full flex-1 flex items-end">
              <div className="dash-bar w-full rounded-lg"
                style={{ height: `${Math.max(4, (count / max) * 100)}%`, animationDelay: `${200 + i * 60}ms`,
                  background: last ? 'linear-gradient(180deg, #38BDF8, #0284C7)' : 'linear-gradient(180deg, #BAE6FD, #E0F2FE)' }} />
            </div>
            <span className={`text-[11px] ${last ? 'font-semibold text-sky-600' : 'text-slate-400'}`}>{format(m, 'MMM')}</span>
          </div>
        );
      })}
    </div>
  );
}

function PaymentHealth({ payments }) {
  const billed = payments.filter((p) => p.status !== 'waived');
  const paid = billed.filter((p) => p.status === 'paid').length;
  const pct = billed.length ? Math.round((paid / billed.length) * 100) : 0;
  const R = 34, C = 2 * Math.PI * R;
  const color = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';
  const rows = ['paid', 'pending', 'overdue', 'waived'].map((k) => [k, payments.filter((p) => p.status === k).length]);
  return (
    <div className="p-5 flex items-center gap-5">
      <span className="relative w-[88px] h-[88px] flex-shrink-0">
        <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
          <circle cx="44" cy="44" r={R} fill="none" stroke="#F1F5F9" strokeWidth="8" />
          <circle cx="44" cy="44" r={R} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={C}
            style={{ strokeDashoffset: C * (1 - pct / 100), '--len': C, '--to': C * (1 - pct / 100), animation: 'dashDraw 1.3s cubic-bezier(0.16,1,0.3,1) 0.3s both' }} />
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[19px] font-semibold text-slate-900 tabular-nums leading-none">{billed.length ? `${pct}%` : '—'}</span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">paid</span>
        </span>
      </span>
      <div className="flex-1 space-y-2">
        {rows.map(([k, n]) => (
          <div key={k} className="flex items-center justify-between text-[12px]">
            <span className="flex items-center gap-2 text-slate-600"><span className="w-2 h-2 rounded-full" style={{ background: PAY_STATUS[k].dot }} />{PAY_STATUS[k].label}</span>
            <span className="font-semibold text-slate-900 tabular-nums">{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Purposes({ visitors }) {
  const top = useMemo(() => {
    const m = new Map();
    visitors.forEach((v) => { const k = (v.purpose || 'other').toLowerCase(); m.set(k, (m.get(k) || 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [visitors]);
  const max = Math.max(1, ...top.map(([, n]) => n));
  if (!top.length) return <Empty Icon={BarChart3} text="No visits yet" />;
  return (
    <div className="p-5 space-y-3">
      {top.map(([k, n], i) => {
        const [I, c, bg] = purposeIcon(k);
        return (
          <div key={k} className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg, color: c }}><I size={13} /></span>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-[12px] mb-1"><span className="font-medium text-slate-700 capitalize truncate">{k}</span><span className="text-slate-400 tabular-nums">{n}</span></div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(n / max) * 100}%`, background: c, transformOrigin: 'left', animation: `dashGrowX 0.9s cubic-bezier(0.16,1,0.3,1) ${300 + i * 80}ms both` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Timeline({ payments, visitors, alerts }) {
  const items = useMemo(() => [
    ...payments.map((p) => ({ at: p.paidAt || p.createdAt, color: PAY_STATUS[p.status]?.dot || '#94A3B8', Icon: Wallet,
      text: p.status === 'paid' ? `Paid ${naira(p.amount)} for ${p.scheduleId?.title || 'dues'}` : `${naira(p.amount)} billed for ${p.scheduleId?.title || 'dues'}` })),
    ...visitors.map((v) => ({ at: v.expectedDate || v.createdAt, color: '#0EA5E9', Icon: VisitorIcon, text: `${v.visitorName} — ${v.purpose}` })),
    ...alerts.map((a) => ({ at: a.createdAt, color: '#EF4444', Icon: ShieldAlert, text: `Raised a ${a.type} alert${a.title ? `: ${a.title}` : ''}` })),
  ].filter((x) => x.at).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8), [payments, visitors, alerts]);
  if (!items.length) return <Empty Icon={Activity} text="No activity yet" />;
  return (
    <ol className="px-5 py-4">
      {items.map((it, i) => (
        <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
          {i < items.length - 1 && <span className="absolute left-[13px] top-7 bottom-0 w-px bg-slate-100" />}
          <span className="relative w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${it.color}14`, color: it.color }}><it.Icon size={13} /></span>
          <div className="min-w-0 flex-1 flex items-baseline justify-between gap-3 pt-1">
            <span className="text-[13px] text-slate-700 truncate">{it.text}</span>
            <span className="text-[11px] text-slate-400 whitespace-nowrap">{formatDistanceToNow(new Date(it.at), { addSuffix: true })}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */

export default function ResidentProfileDesktop({ resident: r, units, onBack, onToggle, acting, assignUnitId, setAssignUnitId, onAssign, savingUnit }) {
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState({ loading: true, payments: [], visitors: [], alerts: [], dues: null });

  useEffect(() => {
    Promise.allSettled([
      paymentAPI.getHistory({ resident: r._id, limit: 200 }),
      visitorAPI.getAll({ host: r._id, limit: 100 }),
      alertAPI.getAll({ resident: r._id, limit: 50 }),
      paymentAPI.enforcementResident(r._id),
    ]).then(([p, v, a, d]) => {
      const ok = (x) => (x.status === 'fulfilled' ? x.value.data.data : null);
      setData({
        loading: false,
        // filter again client-side so an older server that ignores the filter can't leak other residents' records
        payments: (ok(p) || []).filter((x) => idOf(x.residentId) === r._id),
        visitors: (ok(v) || []).filter((x) => idOf(x.hostResidentId) === r._id),
        alerts: (ok(a) || []).filter((x) => idOf(x.residentId) === r._id),
        dues: ok(d),
      });
    });
  }, [r._id]);

  const { payments, visitors, alerts, dues } = data;
  const totalPaid = payments.filter((p) => p.status === 'paid').reduce((t, p) => t + (p.amount || 0), 0);
  const outstanding = payments.filter((p) => ['pending', 'overdue'].includes(p.status)).reduce((t, p) => t + (p.amount || 0), 0);
  const overdueN = payments.filter((p) => p.status === 'overdue').length;
  const openAlerts = alerts.filter((a) => a.status !== 'resolved').length;
  const visitors30 = visitors.filter((v) => v.expectedDate && Date.now() - new Date(v.expectedDate) < 30 * 86400000).length;

  const hue = (r.name.charCodeAt(0) * 37) % 360;
  const initials = r.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const curUnit = units.find((u) => u._id === idOf(r.unitId));
  const unitDisplay = r.unitId ? (r.unitId.block ? `Block ${r.unitId.block} · Apt ${r.unitId.unitNumber}` : `Apt ${r.unitId.unitNumber}`) : null;
  const daysIn = r.createdAt ? Math.max(0, Math.floor((Date.now() - new Date(r.createdAt)) / 86400000)) : 0;
  const restriction = dues?.restriction?.status && dues.restriction.status !== 'none' ? RESTRICTION[dues.restriction.status] : null;
  const changed = (idOf(r.unitId) || '') !== assignUnitId;
  const picked = units.find((u) => u._id === assignUnitId);

  const TABS = [
    ['overview', 'Overview', null],
    ['payments', 'Payments', payments.length],
    ['visitors', 'Visitors', visitors.length],
    ['security', 'Security', alerts.length],
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      <button onClick={onBack} className="dash-rise inline-flex items-center gap-1 text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors">
        <ChevronLeft size={16} /> Residents
      </button>

      {/* ── Profile header ── */}
      <div className="dash-rise relative overflow-hidden rounded-2xl border border-slate-200/70 p-5"
        style={{ background: r.isActive ? `linear-gradient(120deg, hsl(${hue} 80% 97%) 0%, hsl(${(hue + 40) % 360} 80% 98%) 50%, #FFFFFF 100%)` : 'linear-gradient(120deg, #FEF2F2, #FFFFFF 60%)' }}>
        <div className="pointer-events-none absolute -top-24 right-24 w-72 h-72 rounded-full opacity-40"
          style={{ background: `radial-gradient(circle, ${r.isActive ? `hsl(${hue} 70% 80%)` : '#FECACA'}, transparent 70%)`, animation: 'dashFloat 16s ease-in-out infinite' }} />
        <div className="relative flex items-center gap-5">
          <span className="relative block flex-shrink-0 w-[72px] h-[72px]">
            {r.profilePhoto
              ? <img src={r.profilePhoto} alt="" className="w-full h-full rounded-2xl object-cover ring-4 ring-white shadow" />
              : <span className="w-full h-full rounded-2xl flex items-center justify-center text-[24px] font-semibold text-white ring-4 ring-white shadow"
                  style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 62%), hsl(${(hue + 40) % 360} 70% 46%))` }}>{initials}</span>}
            <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-white ${r.isActive ? 'bg-emerald-400' : 'bg-red-500'}`} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[22px] font-semibold text-slate-900" style={{ letterSpacing: '-0.025em' }}>{r.name}</h1>
              <Pill tone={r.isActive ? { label: 'Active', bg: '#ECFDF5', text: '#047857', dot: '#10B981' } : { label: 'Suspended', bg: '#FEF2F2', text: '#B91C1C', dot: '#EF4444' }} />
              {restriction && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${restriction.color}1A`, color: restriction.color }}>{restriction.label}</span>}
            </div>
            <div className="mt-2 flex items-center gap-x-4 gap-y-1 flex-wrap text-[12.5px] text-slate-500">
              {unitDisplay
                ? <span className="inline-flex items-center gap-1 font-semibold text-indigo-700"><Home size={13} /> {unitDisplay}</span>
                : <span className="italic text-slate-400">No apartment</span>}
              <span className="inline-flex items-center gap-1.5"><Mail size={13} className="text-slate-400" />{r.email}</span>
              {r.phone && <span className="inline-flex items-center gap-1.5"><Phone size={13} className="text-slate-400" />{r.phone}</span>}
              {r.createdAt && <span className="inline-flex items-center gap-1.5"><Calendar size={13} className="text-slate-400" />Joined {format(new Date(r.createdAt), 'd MMM yyyy')}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {r.phone && (
              <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[13px] font-medium bg-white border border-slate-200 text-slate-700 hover:border-slate-300 transition-all hover:-translate-y-0.5">
                <Phone size={14} className="text-sky-500" /> Call
              </a>
            )}
            <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[13px] font-medium bg-white border border-slate-200 text-slate-700 hover:border-slate-300 transition-all hover:-translate-y-0.5">
              <Mail size={14} className="text-violet-500" /> Email
            </a>
            <button onClick={onToggle} disabled={acting}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[13px] font-semibold border transition-colors disabled:opacity-60 ${r.isActive ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100' : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'}`}>
              {r.isActive ? <><UserX size={14} /> Suspend</> : <><UserCheck size={14} /> Activate</>}
            </button>
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-4 gap-4">
        <Kpi i={0} label="Total paid" value={totalPaid} display={naira} sub={`${payments.filter((p) => p.status === 'paid').length} payments`} Icon={Wallet} color="#10B981" />
        <Kpi i={1} label="Outstanding" value={outstanding} display={naira} sub={overdueN ? `${overdueN} overdue` : 'Nothing overdue'} Icon={AlertTriangle} color={overdueN ? '#EF4444' : '#F59E0B'} />
        <Kpi i={2} label="Visitors hosted" value={visitors.length} sub={`${visitors30} in the last 30 days`} Icon={VisitorIcon} color="#0EA5E9" />
        <Kpi i={3} label="Alerts raised" value={alerts.length} sub={openAlerts ? `${openAlerts} still open` : 'None open'} Icon={ShieldAlert} color="#8B5CF6" />
      </div>

      <div className="grid grid-cols-12 gap-5 items-start">
        {/* ── Main ── */}
        <div className="col-span-8 space-y-4 min-w-0">
          <div className="dash-rise flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200 w-fit" style={{ animationDelay: '300ms' }}>
            {TABS.map(([k, label, n]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-lg transition-all ${tab === k ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                {label}
                {typeof n === 'number' && <span className={`text-[10px] font-bold px-1.5 rounded-md tabular-nums ${tab === k ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{n}</span>}
              </button>
            ))}
          </div>

          {data.loading ? (
            <div className="grid grid-cols-2 gap-4">{[0, 1, 2, 3].map((k) => <div key={k} className="skeleton h-48 rounded-2xl" />)}</div>
          ) : tab === 'overview' ? (
            <div className="grid grid-cols-2 gap-4">
              <Card title="Visitors per month" Icon={BarChart3} color="#0EA5E9" delay={340}><VisitorTrend visitors={visitors} /></Card>
              <Card title="Payment record" Icon={Receipt} color="#10B981" delay={380}><PaymentHealth payments={payments} /></Card>
              <Card title="Why people visit" Icon={VisitorIcon} color="#F59E0B" delay={420}><Purposes visitors={visitors} /></Card>
              <Card title="Recent activity" Icon={Activity} color="#8B5CF6" delay={460}><Timeline payments={payments} visitors={visitors} alerts={alerts} /></Card>
            </div>
          ) : tab === 'payments' ? (
            <Card title="Payment history" Icon={Wallet} color="#10B981" delay={340} right={<Link to="/payments" className="text-[12px] font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1">Payments <ChevronRight size={13} /></Link>}>
              {!payments.length ? <Empty Icon={Wallet} text="No bills for this resident yet" /> : (
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-left">
                      <th className="px-5 py-2.5">Bill</th><th className="px-3 py-2.5">Amount</th><th className="px-3 py-2.5">Billed</th><th className="px-3 py-2.5">Paid</th><th className="px-5 py-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p._id} className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3">
                          <div className="text-[13px] font-medium text-slate-900">{p.scheduleId?.title || 'Estate dues'}</div>
                          <div className="text-[11px] text-slate-400 capitalize">{[p.scheduleId?.frequency, p.method && p.method.replace('_', ' ')].filter(Boolean).join(' · ')}</div>
                        </td>
                        <td className="px-3 py-3 text-[13px] font-semibold text-slate-900 tabular-nums">{naira(p.amount)}</td>
                        <td className="px-3 py-3 text-[12px] text-slate-500 whitespace-nowrap">{format(new Date(p.createdAt), 'd MMM yyyy')}</td>
                        <td className="px-3 py-3 text-[12px] text-slate-500 whitespace-nowrap">{p.paidAt ? format(new Date(p.paidAt), 'd MMM yyyy') : '—'}</td>
                        <td className="px-5 py-3 text-right"><Pill tone={PAY_STATUS[p.status] || PAY_STATUS.pending} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          ) : tab === 'visitors' ? (
            <Card title="Visitors hosted" Icon={VisitorIcon} color="#0EA5E9" delay={340} right={<Link to="/visitors" className="text-[12px] font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1">Visitor log <ChevronRight size={13} /></Link>}>
              {!visitors.length ? <Empty Icon={VisitorIcon} text="No visitors registered by this resident" /> : (
                <div className="divide-y divide-slate-100">
                  {visitors.map((v) => {
                    const st = VISITOR_STATUS[v.status] || VISITOR_STATUS['checked-out'];
                    const [PIcon, pColor, pBg] = purposeIcon(v.purpose);
                    return (
                      <Link key={v._id} to={`/visitors/${v._id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50/80 transition-colors" style={{ textDecoration: 'none' }}>
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: pBg, color: pColor }}><PIcon size={14} /></span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-semibold text-slate-900 truncate">{v.visitorName}</span>
                          <span className="block text-[11px] text-slate-400 capitalize truncate">{v.purpose}{v.visitorPhone ? ` · ${v.visitorPhone}` : ''}</span>
                        </span>
                        <span className="text-[11.5px] text-slate-500 whitespace-nowrap tabular-nums">{v.expectedDate ? format(new Date(v.expectedDate), 'd MMM yyyy, h:mm a') : '—'}</span>
                        <span className="w-[104px] flex justify-end"><Pill tone={st} /></span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>
          ) : (
            <div className="space-y-4">
              <Card title="Alerts raised" Icon={ShieldAlert} color="#EF4444" delay={340} right={<Link to="/alerts" className="text-[12px] font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1">Alerts <ChevronRight size={13} /></Link>}>
                {!alerts.length ? <Empty Icon={ShieldCheck} text="This resident hasn't raised any alerts" /> : (
                  <div className="divide-y divide-slate-100">
                    {alerts.map((a) => (
                      <div key={a._id} className="flex items-center gap-3 px-5 py-3">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-50 text-red-500"><ShieldAlert size={14} /></span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-semibold text-slate-900 truncate capitalize">{a.title || `${a.type} alert`}</span>
                          <span className="block text-[11px] text-slate-400 truncate capitalize">{[a.type, a.severity, a.location].filter(Boolean).join(' · ')}</span>
                        </span>
                        <span className="text-[11.5px] text-slate-500 whitespace-nowrap">{format(new Date(a.createdAt), 'd MMM yyyy, h:mm a')}</span>
                        <span className="w-[110px] flex justify-end"><Pill tone={ALERT_TONE[a.status] || ALERT_TONE.open} /></span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              {dues?.history?.length > 0 && (
                <Card title="Dues enforcement log" Icon={Gavel} color="#F97316" delay={380}>
                  <ol className="px-5 py-4">
                    {dues.history.map((h, i) => (
                      <li key={h._id || i} className="relative flex gap-3 pb-3 last:pb-0">
                        {i < dues.history.length - 1 && <span className="absolute left-[5px] top-4 bottom-0 w-px bg-orange-100" />}
                        <span className="mt-1.5 w-[11px] h-[11px] rounded-full bg-orange-400 border-2 border-white flex-shrink-0" style={{ boxShadow: '0 0 0 2px #FED7AA' }} />
                        <div className="flex-1 min-w-0 flex items-baseline justify-between gap-3">
                          <span className="text-[13px] text-slate-700 capitalize">{(h.action || 'update').replace(/_/g, ' ')}{h.byId?.name ? ` · by ${h.byId.name}` : ''}</span>
                          <span className="text-[11px] text-slate-400 whitespace-nowrap">{h.createdAt ? format(new Date(h.createdAt), 'd MMM yyyy') : ''}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* ── Rail ── */}
        <div className="col-span-4 space-y-4 min-w-0">
          {/* Dues standing */}
          <Card delay={320} className="p-5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dues standing</div>
            {data.loading ? <div className="skeleton h-14 rounded-xl mt-3" /> : restriction ? (
              <div className="mt-3 rounded-xl p-3.5 border" style={{ background: `${restriction.color}0D`, borderColor: `${restriction.color}40` }}>
                <div className="text-[13px] font-semibold" style={{ color: restriction.color }}>{restriction.label}</div>
                <p className="text-[12px] text-slate-600 mt-1 leading-relaxed">{restriction.text}</p>
                {dues?.overdue?.amount > 0 && <p className="text-[12px] text-slate-700 mt-2 font-medium">{naira(dues.overdue.amount)} overdue</p>}
              </div>
            ) : overdueN ? (
              <div className="mt-3 rounded-xl p-3.5 bg-red-50 border border-red-200">
                <div className="text-[13px] font-semibold text-red-700">{overdueN} overdue bill{overdueN === 1 ? '' : 's'}</div>
                <p className="text-[12px] text-red-700/80 mt-1">{naira(payments.filter((p) => p.status === 'overdue').reduce((t, p) => t + p.amount, 0))} past due. You can send a dues notice from Payments.</p>
              </div>
            ) : (
              <div className="mt-3 rounded-xl p-3.5 bg-emerald-50 border border-emerald-200 flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                <div>
                  <div className="text-[13px] font-semibold text-emerald-800">In good standing</div>
                  <div className="text-[11.5px] text-emerald-700/80">No overdue dues</div>
                </div>
              </div>
            )}
          </Card>

          {/* Apartment */}
          <Card title="Apartment" Icon={Building2} color="#6366F1" delay={360}>
            <div className="p-5 space-y-3">
              {curUnit && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Housemates</div>
                    <div className="text-[15px] font-semibold text-slate-900 tabular-nums">{Math.max(0, (curUnit.residentIds || []).length - 1)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Space left</div>
                    <div className="text-[15px] font-semibold text-slate-900 tabular-nums">{Math.max(0, (curUnit.maxOccupants || 7) - (curUnit.residentIds || []).length)}</div>
                  </div>
                </div>
              )}
              <select className="input-field text-sm" value={assignUnitId} onChange={(e) => setAssignUnitId(e.target.value)}>
                <option value="">— No apartment —</option>
                {units.map((u) => {
                  const cnt = (u.residentIds || []).length, mx = u.maxOccupants || 7;
                  const full = cnt >= mx && u._id !== idOf(r.unitId);
                  return <option key={u._id} value={u._id} disabled={full}>{u.block ? `Block ${u.block} · Apt ${u.unitNumber}` : `Apt ${u.unitNumber}`} — {cnt}/{mx}{full ? ' (full)' : ''}</option>;
                })}
              </select>
              {picked && (
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, ((picked.residentIds || []).length / (picked.maxOccupants || 7)) * 100)}%`, background: 'linear-gradient(90deg, #818CF8, #6366F1)' }} />
                </div>
              )}
              <button onClick={onAssign} disabled={!changed || savingUnit}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 disabled:opacity-50">
                {savingUnit ? 'Saving…' : !changed ? 'Current apartment' : assignUnitId ? 'Save assignment' : 'Remove from apartment'}
              </button>
            </div>
          </Card>

          {/* Account */}
          <Card title="Account" Icon={Clock} color="#0EA5E9" delay={400}>
            <div className="divide-y divide-slate-100">
              {[
                ['Member for', `${daysIn} day${daysIn === 1 ? '' : 's'}`],
                ['Joined', r.createdAt ? format(new Date(r.createdAt), 'd MMM yyyy') : '—'],
                ['Last active', r.lastSeen ? formatDistanceToNow(new Date(r.lastSeen), { addSuffix: true }) : '—'],
                ['DM search', r.isDiscoverable === false ? 'Hidden' : 'Visible', r.isDiscoverable === false ? EyeOff : Eye],
                ['Password', r.mustChangePassword ? 'Temporary — not changed yet' : 'Set by resident'],
              ].map(([k, v, I]) => (
                <div key={k} className="flex items-center justify-between px-5 py-2.5 text-[12.5px]">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-medium text-slate-800 flex items-center gap-1.5">{I && <I size={12} className="text-slate-400" />}{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
