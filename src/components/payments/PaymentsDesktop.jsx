import { useMemo, useState } from 'react';
import {
  Wallet, Plus, Clock, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, ShieldCheck, Wrench, Gift, FileText,
  ArrowDownCircle, ArrowUpRight, ArrowDownLeft, RefreshCw, Landmark, Receipt, Eye, EyeOff, CreditCard, XCircle,
  Search, Link2, TrendingUp, CalendarClock, Users,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import Spinner from '../ui/Spinner';

const TYPE_META = {
  security_dues: { label: 'Security dues', icon: ShieldCheck,     color: '#2563EB' },
  maintenance:   { label: 'Maintenance',   icon: Wrench,          color: '#D97706' },
  levy:          { label: 'Levy',          icon: FileText,        color: '#7C3AED' },
  contribution:  { label: 'Contribution',  icon: Gift,            color: '#059669' },
  other:         { label: 'Other',         icon: ArrowDownCircle, color: '#64748B' },
};
const PAY_STATUS = {
  paid:    { label: 'Paid',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  overdue: { label: 'Overdue', cls: 'bg-red-50 text-red-700 border-red-200' },
  waived:  { label: 'Waived',  cls: 'bg-slate-50 text-slate-500 border-slate-200' },
};
const WD_STATUS = {
  pending: { label: 'Processing', text: 'text-amber-600', icon: Clock,        wrap: 'bg-amber-50 text-amber-600' },
  success: { label: 'Sent',       text: 'text-slate-400', icon: ArrowUpRight, wrap: 'bg-slate-100 text-slate-700' },
  failed:  { label: 'Failed',     text: 'text-red-600',   icon: XCircle,      wrap: 'bg-red-50 text-red-500' },
};

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const maskAcct = (n = '') => (n && n.length > 4 ? `•••• ${n.slice(-4)}` : n || '');
const dayLabel = (d) => (isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEEE, d MMM yyyy'));
function groupByDay(items, getDate) {
  const groups = [];
  items.forEach((item) => {
    const raw = getDate(item);
    const label = raw ? dayLabel(new Date(raw)) : 'Earlier';
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item); else groups.push({ label, items: [item] });
  });
  return groups;
}

function Pill({ status }) {
  const s = PAY_STATUS[status] || PAY_STATUS.pending;
  return <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span>;
}

function DayHeader({ label, right }) {
  return (
    <div className="sticky top-0 z-[1] flex justify-between px-5 py-1.5 bg-slate-50 border-y border-slate-100 text-[11.5px]">
      <span className="font-semibold text-slate-600">{label}</span>
      {right && <span className="text-slate-400 tabular-nums">{right}</span>}
    </div>
  );
}

function Empty({ icon: Icon, title, body, action }) {
  return (
    <div className="py-16 text-center px-6">
      <span className="mx-auto w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"><Icon size={20} /></span>
      <p className="mt-3 text-[14px] font-semibold text-slate-900">{title}</p>
      {body && <p className="mt-1 text-[12.5px] text-slate-500 max-w-sm mx-auto">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default function PaymentsDesktop(p) {
  const {
    stats, schedules, wallet, walletLoading, hideBalance, toggleHide, refreshAll,
    tab, setTab, selectedSchedule, setSelectedSchedule, collectionPayments, collectionLoading, openCollection,
    ledger, ledgerLoading, unlinkedCount, hasBank, bankName,
    startWithdraw, openBank, openCreate, openManual, handleWaive, handleReconcile, reconciling, openInvoice,
    openWithdrawal, openAttachModal,
  } = p;
  const [billQ, setBillQ] = useState('');
  const [payFilter, setPayFilter] = useState('all');
  const [payQ, setPayQ] = useState('');
  const shown = (n) => (hideBalance ? '₦ ••••••' : naira(n));
  const withdrawals = wallet?.withdrawals || [];

  // Collection rate across active bills
  const totals = useMemo(() => schedules.reduce((t, s) => {
    if (!s.isActive || !s.stats) return t;
    return { paid: t.paid + (s.stats.paid || 0), total: t.total + (s.stats.total || 0), expected: t.expected + (s.stats.total || 0) * (s.amount || 0), collected: t.collected + (s.stats.paid || 0) * (s.amount || 0) };
  }, { paid: 0, total: 0, expected: 0, collected: 0 }), [schedules]);
  const rate = totals.total ? Math.round((totals.paid / totals.total) * 100) : 0;

  const bills = schedules.filter((s) => !billQ || `${s.title} ${s.type}`.toLowerCase().includes(billQ.toLowerCase()));
  const payCounts = collectionPayments.reduce((m, x) => ({ ...m, [x.status]: (m[x.status] || 0) + 1 }), {});
  const payShown = collectionPayments.filter((x) => (payFilter === 'all' || x.status === payFilter)
    && (!payQ || `${x.residentId?.name} ${x.residentId?.email} ${x.paystackReference || ''}`.toLowerCase().includes(payQ.toLowerCase())));
  const billCollected = collectionPayments.filter((x) => x.status === 'paid').reduce((t, x) => t + Number(x.amount || 0), 0);
  const billOutstanding = collectionPayments.filter((x) => x.status === 'pending' || x.status === 'overdue').reduce((t, x) => t + Number(x.amount || 0), 0);

  const TABS = [
    { id: 'bills', label: 'Bills', hint: `${schedules.length} bill${schedules.length === 1 ? '' : 's'}` },
    { id: 'withdrawals', label: 'Withdrawals', hint: `${withdrawals.length} payout${withdrawals.length === 1 ? '' : 's'}` },
    { id: 'paystack', label: 'Paystack', hint: unlinkedCount ? `${unlinkedCount} not linked` : 'Online payments', alert: unlinkedCount > 0 },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 animate-fade-in">
      {/* ── Account + collection ── */}
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-8 relative overflow-hidden rounded-2xl p-6 text-white"
          style={{ background: 'radial-gradient(120% 140% at 100% 0%, #047857 0%, #052E22 50%, #04140F 100%)', boxShadow: '0 18px 40px -18px rgba(4,120,87,.55)' }}>
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full border border-white/10 pointer-events-none" />
          <div className="absolute -right-2 -top-2 w-40 h-40 rounded-full border border-white/10 pointer-events-none" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-[12px] text-white/60 flex items-center gap-1.5"><Wallet size={13} /> Estate wallet · NGN</p>
              <p className="mt-4 text-[12.5px] text-white/70">Available to withdraw</p>
              <div className="mt-1.5 flex items-center gap-3">
                <span className="text-[42px] leading-none font-semibold tracking-tight tabular-nums" style={{ color: '#fff' }}>
                  {walletLoading && !wallet ? <span className="inline-block w-44 h-10 rounded-lg bg-white/15 animate-pulse" /> : shown(wallet?.balance)}
                </span>
                <button onClick={toggleHide} aria-label={hideBalance ? 'Show balance' : 'Hide balance'} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10">
                  {hideBalance ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
            </div>
            <button onClick={refreshAll} title="Refresh" className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
              <RefreshCw size={16} className={walletLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="relative mt-5 grid grid-cols-3 gap-3 max-w-2xl">
            {[
              ['Paid in-app', wallet?.collected, ArrowDownLeft, 'text-emerald-300'],
              ['Withdrawn', wallet?.withdrawn, ArrowUpRight, 'text-white'],
              ['Paid offline', wallet?.collectedOffline, Receipt, 'text-white/80'],
            ].map(([l, v, Icon, c]) => (
              <div key={l} className="rounded-xl bg-white/[0.06] border border-white/10 px-3.5 py-2.5">
                <p className="text-[11px] text-white/55 flex items-center gap-1"><Icon size={11} /> {l}</p>
                <p className={`mt-0.5 text-[16px] font-semibold tabular-nums ${c}`}>{wallet ? shown(v) : '—'}</p>
              </div>
            ))}
          </div>
          {wallet?.collectedOffline > 0 && (
            <p className="relative mt-2.5 text-[11px] text-white/45 max-w-2xl">Offline payments (cash or bank transfer) count as paid for the resident but never reach your wallet, so they can’t be withdrawn.</p>
          )}

          <div className="relative mt-5 flex items-center gap-3">
            <button onClick={startWithdraw} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white text-emerald-800 text-[13.5px] font-semibold hover:bg-emerald-50 transition-colors">
              <ArrowUpRight size={16} /> Withdraw
            </button>
            <button onClick={openCreate} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white/10 border border-white/15 text-white text-[13.5px] font-semibold hover:bg-white/15 transition-colors">
              <Plus size={16} /> New bill
            </button>
            <button onClick={openBank} className="ml-auto flex items-center gap-3 h-12 pl-2 pr-3 rounded-xl bg-white/[0.06] border border-white/10 hover:bg-white/10 text-left transition-colors max-w-[300px]">
              <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0"><Landmark size={15} /></span>
              <span className="min-w-0 leading-tight">
                {hasBank ? (
                  <>
                    <span className="block text-[12.5px] font-semibold truncate">{wallet.bank.accountName}</span>
                    <span className="block text-[11px] text-white/55 truncate">{bankName} · {maskAcct(wallet.bank.accountNumber)}</span>
                  </>
                ) : (
                  <>
                    <span className="block text-[12.5px] font-semibold">Add a payout bank</span>
                    <span className="block text-[11px] text-amber-200">Needed before you can withdraw</span>
                  </>
                )}
              </span>
              <ChevronRight size={14} className="text-white/50 flex-shrink-0" />
            </button>
          </div>
        </div>

        <div className="col-span-4 rounded-2xl bg-white border border-slate-200/80 p-5 flex flex-col">
          <div className="flex items-center justify-between">
            <p className="text-[12.5px] font-medium text-slate-600 flex items-center gap-1.5"><TrendingUp size={14} className="text-emerald-600" /> Collections</p>
            <span className="text-[11.5px] text-slate-400">{stats?.activeSchedules ?? 0} active bills</span>
          </div>
          <p className="mt-3 text-[11.5px] text-slate-500">Collected this month</p>
          <p className="text-[30px] font-semibold text-slate-900 tabular-nums leading-tight" style={{ letterSpacing: '-0.03em' }}>{shown(stats?.thisMonth)}</p>
          <p className="text-[11.5px] text-slate-400">{shown(stats?.totalCollected)} all time</p>

          <div className="mt-4">
            <div className="flex justify-between text-[12px]"><span className="text-slate-500">Residents paid · active bills</span><span className="font-semibold text-slate-900 tabular-nums">{rate}%</span></div>
            <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${rate}%` }} /></div>
            <p className="mt-1.5 text-[11px] text-slate-400 tabular-nums">{totals.paid} of {totals.total} invoices · {shown(totals.expected - totals.collected)} still to collect</p>
          </div>

          <div className="mt-auto pt-4 grid grid-cols-2 gap-2.5">
            <button onClick={() => setTab('bills')} className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5 text-left hover:border-amber-200">
              <p className="text-[11px] text-amber-700 flex items-center gap-1"><Clock size={11} /> Pending</p>
              <p className="text-[18px] font-semibold text-slate-900 tabular-nums">{stats?.pending ?? 0}</p>
            </button>
            <button onClick={() => setTab('bills')} className="rounded-xl border border-red-100 bg-red-50/60 px-3 py-2.5 text-left hover:border-red-200">
              <p className="text-[11px] text-red-700 flex items-center gap-1"><AlertCircle size={11} /> Overdue</p>
              <p className="text-[18px] font-semibold text-slate-900 tabular-nums">{stats?.overdue ?? 0}</p>
            </button>
          </div>
        </div>
      </div>

      {/* ── Ledger ── */}
      <div className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden">
        <div className="px-5 pt-4 border-b border-slate-100 flex items-end justify-between gap-4">
          <div className="flex gap-7">
            {TABS.map(({ id, label, hint, alert }) => (
              <button key={id} onClick={() => { setTab(id); if (id !== 'bills') setSelectedSchedule(null); }}
                className={`pb-3 -mb-px border-b-2 text-left transition-colors ${tab === id ? 'border-emerald-600' : 'border-transparent hover:border-slate-200'}`}>
                <span className={`block text-[14px] ${tab === id ? 'font-semibold text-slate-900' : 'font-medium text-slate-500'}`}>{label}</span>
                <span className={`block text-[11px] ${alert ? 'text-red-600 font-medium' : 'text-slate-400'}`}>{hint}</span>
              </button>
            ))}
          </div>
          {tab === 'bills' && !selectedSchedule && (
            <div className="mb-3 flex items-center gap-2">
              <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 w-60">
                <Search size={14} className="text-slate-400" />
                <input value={billQ} onChange={(e) => setBillQ(e.target.value)} placeholder="Search bills" className="flex-1 min-w-0 bg-transparent outline-none text-[13px]" />
              </div>
              <button onClick={openCreate} className="btn-primary gap-1.5 !py-2"><Plus size={14} /> New bill</button>
            </div>
          )}
        </div>

        {/* Bills table */}
        {tab === 'bills' && !selectedSchedule && (
          !schedules.length ? (
            <Empty icon={FileText} title="No bills yet" body="Create a bill — dues, a levy or a contribution — and every resident gets an invoice they can pay in the app."
              action={<button onClick={openCreate} className="btn-primary gap-2"><Plus size={15} /> Create bill</button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11.5px] text-slate-500 bg-slate-50/70 border-b border-slate-100">
                    <th className="font-medium px-5 py-2.5">Bill</th>
                    <th className="font-medium px-3 py-2.5 text-right">Amount</th>
                    <th className="font-medium px-3 py-2.5">Schedule</th>
                    <th className="font-medium px-3 py-2.5 w-[260px]">Collection</th>
                    <th className="font-medium px-3 py-2.5 text-right">Collected</th>
                    <th className="font-medium px-3 py-2.5">Status</th>
                    <th className="px-3" />
                  </tr>
                </thead>
                <tbody>
                  {bills.map((s) => {
                    const m = TYPE_META[s.type] || TYPE_META.other;
                    const st = s.stats || { paid: 0, pending: 0, overdue: 0, total: 0 };
                    const pct = st.total ? Math.round((st.paid / st.total) * 100) : 0;
                    return (
                      <tr key={s._id} onClick={() => openCollection(s)} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 cursor-pointer">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${m.color}14`, color: m.color }}><m.icon size={16} /></span>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate max-w-[260px]">{s.title}</p>
                              <p className="text-[11.5px] text-slate-400">{m.label}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-slate-900 tabular-nums">{naira(s.amount)}</td>
                        <td className="px-3 py-3">
                          <p className="text-slate-700 capitalize">{String(s.frequency || '').replace('_', ' ')}</p>
                          <p className="text-[11.5px] text-slate-400 flex items-center gap-1"><CalendarClock size={11} /> Due {format(new Date(s.dueDate), 'd MMM yyyy')}</p>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden flex">
                              <div className="h-full bg-emerald-500" style={{ width: `${st.total ? (st.paid / st.total) * 100 : 0}%` }} />
                              <div className="h-full bg-red-400" style={{ width: `${st.total ? (st.overdue / st.total) * 100 : 0}%` }} />
                            </div>
                            <span className="text-[12px] font-semibold text-slate-700 tabular-nums w-9 text-right">{pct}%</span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-400 tabular-nums">
                            <span className="text-emerald-600">{st.paid} paid</span> · <span className="text-amber-600">{st.pending} pending</span>{st.overdue > 0 && <> · <span className="text-red-600">{st.overdue} overdue</span></>}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          <p className="font-semibold text-slate-900">{shown((st.paid || 0) * (s.amount || 0))}</p>
                          <p className="text-[11px] text-slate-400">of {shown((st.total || 0) * (s.amount || 0))}</p>
                        </td>
                        <td className="px-3 py-3">
                          {s.isActive
                            ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
                            : <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">Inactive</span>}
                        </td>
                        <td className="px-3 py-3 text-slate-300"><ChevronRight size={16} /></td>
                      </tr>
                    );
                  })}
                  {!bills.length && <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">No bills match “{billQ}”.</td></tr>}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Bill drill-down */}
        {tab === 'bills' && selectedSchedule && (() => {
          const m = TYPE_META[selectedSchedule.type] || TYPE_META.other;
          return (
            <div>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-4">
                <button onClick={() => setSelectedSchedule(null)} aria-label="Back to bills" className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
                  <ChevronLeft size={18} />
                </button>
                <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${m.color}14`, color: m.color }}><m.icon size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-slate-900 truncate">{selectedSchedule.title}</p>
                  <p className="text-[12px] text-slate-500">{m.label} · {naira(selectedSchedule.amount)} per resident · due {format(new Date(selectedSchedule.dueDate), 'd MMM yyyy')}</p>
                </div>
                <div className="flex gap-6 text-right">
                  <div><p className="text-[11px] text-slate-500">Collected</p><p className="text-[16px] font-semibold text-emerald-700 tabular-nums">{shown(billCollected)}</p></div>
                  <div><p className="text-[11px] text-slate-500">Outstanding</p><p className="text-[16px] font-semibold text-slate-900 tabular-nums">{shown(billOutstanding)}</p></div>
                  <div><p className="text-[11px] text-slate-500">Residents</p><p className="text-[16px] font-semibold text-slate-900 tabular-nums">{collectionPayments.length}</p></div>
                </div>
              </div>
              <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
                <div className="flex p-0.5 rounded-lg bg-slate-100">
                  {['all', 'paid', 'pending', 'overdue', 'waived'].map((f) => (
                    <button key={f} onClick={() => setPayFilter(f)}
                      className={`px-3 h-8 rounded-md text-[12.5px] capitalize ${payFilter === f ? 'bg-white text-slate-900 font-semibold shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      {f} <span className="text-slate-400 font-normal tabular-nums">{f === 'all' ? collectionPayments.length : payCounts[f] || 0}</span>
                    </button>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 w-64">
                  <Search size={14} className="text-slate-400" />
                  <input value={payQ} onChange={(e) => setPayQ(e.target.value)} placeholder="Resident or reference" className="flex-1 min-w-0 bg-transparent outline-none text-[13px]" />
                </div>
              </div>
              {collectionLoading ? <div className="flex justify-center py-14"><Spinner /></div> : !payShown.length ? (
                <Empty icon={Users} title={collectionPayments.length ? 'No residents match' : 'No residents on this bill'} />
              ) : (
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-[11.5px] text-slate-500 bg-slate-50/70 border-b border-slate-100">
                      <th className="font-medium px-5 py-2.5">Resident</th>
                      <th className="font-medium px-3 py-2.5">Status</th>
                      <th className="font-medium px-3 py-2.5">Paid</th>
                      <th className="font-medium px-3 py-2.5 text-right">Amount</th>
                      <th className="font-medium px-5 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payShown.map((x) => {
                      const open = x.status !== 'paid' && x.status !== 'waived';
                      return (
                        <tr key={x._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 text-[12px] font-semibold flex items-center justify-center flex-shrink-0">{x.residentId?.name?.[0] || '?'}</span>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-900 truncate">{x.residentId?.name || 'Resident'}</p>
                                <p className="text-[11.5px] text-slate-400 truncate">{x.residentId?.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-col items-start gap-1">
                              <Pill status={x.status} />
                              {x.paystackReference && x.status === 'pending' && <span className="text-[10.5px] text-amber-700 flex items-center gap-1"><Clock size={10} /> Awaiting Paystack</span>}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {x.paidAt ? <>{format(new Date(x.paidAt), 'd MMM yyyy')}<span className="block text-[11px] text-slate-400 capitalize">{(x.method || '').replace('_', ' ')}</span></> : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-slate-900 tabular-nums">{naira(x.amount)}</td>
                          <td className="px-5 py-3">
                            <div className="flex justify-end gap-1.5">
                              {open && x.paystackReference && (
                                <button onClick={() => handleReconcile(x)} disabled={reconciling === x._id}
                                  className="inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 h-8 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 disabled:opacity-50">
                                  <RefreshCw size={12} className={reconciling === x._id ? 'animate-spin' : ''} /> Reconcile
                                </button>
                              )}
                              {open && (
                                <>
                                  <button onClick={() => openManual(x)} className="inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 h-8 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                                    <CheckCircle2 size={12} /> Mark paid
                                  </button>
                                  <button onClick={() => handleWaive(x)} className="text-[12px] font-medium px-2.5 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Waive</button>
                                </>
                              )}
                              <button onClick={() => openInvoice(x._id)} className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                                <Receipt size={12} /> {x.status === 'paid' ? 'Receipt' : 'Invoice'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          );
        })()}

        {/* Withdrawals statement */}
        {tab === 'withdrawals' && (
          walletLoading && !wallet ? <div className="flex justify-center py-16"><Spinner size={26} /></div>
            : !withdrawals.length ? (
              <Empty icon={ArrowUpRight} title="No withdrawals yet" body="Money you move from the estate wallet to your bank shows up here."
                action={<button onClick={startWithdraw} className="btn-primary gap-2"><ArrowUpRight size={15} /> Make a withdrawal</button>} />
            ) : (
              <div className="max-h-[70vh] overflow-y-auto">
                {groupByDay(withdrawals, (w) => w.createdAt).map((g) => (
                  <div key={g.label}>
                    <DayHeader label={g.label} right={`−${shown(g.items.filter((w) => w.status !== 'failed').reduce((t, w) => t + w.amount, 0))}`} />
                    {g.items.map((w) => {
                      const m = WD_STATUS[w.status] || WD_STATUS.pending;
                      return (
                        <button key={w._id} onClick={() => openWithdrawal(w)} className="w-full flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/60 text-left">
                          <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${m.wrap}`}><m.icon size={16} /></span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[13px] font-medium text-slate-900 truncate">To {w.bankName || 'bank'} · {w.accountName || ''}</span>
                            <span className="block text-[11.5px] text-slate-400 truncate">{format(new Date(w.createdAt), 'HH:mm')} · {maskAcct(w.accountNumber)}{w.reference ? <> · <span className="font-mono">{w.reference}</span></> : ''}</span>
                          </span>
                          <span className="text-right flex-shrink-0 w-28">
                            <span className={`block text-[13.5px] font-semibold tabular-nums ${w.status === 'failed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>−{shown(w.amount)}</span>
                            <span className={`block text-[11px] ${m.text}`}>{m.label}</span>
                          </span>
                          <ChevronRight size={15} className="text-slate-300" />
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )
        )}

        {/* Paystack inflow */}
        {tab === 'paystack' && (
          <div>
            <div className="px-5 py-3 border-b border-slate-100 flex items-start gap-2 text-[12.5px] text-slate-600">
              <AlertCircle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
              Every successful Paystack charge for your estate. <b className="font-semibold text-slate-800">Not linked</b> payments aren’t tied to a resident yet — Attach them to a resident and bill so they’re recorded and added to your wallet.
            </div>
            {ledgerLoading ? <div className="flex justify-center py-16"><Spinner size={26} /></div> : !ledger.length ? (
              <Empty icon={CreditCard} title="No Paystack payments yet" body="Online payments from residents will appear here as they come in." />
            ) : (
              <div className="max-h-[70vh] overflow-y-auto">
                {groupByDay(ledger, (tx) => tx.paidAt || tx.createdAt).map((g) => (
                  <div key={g.label}>
                    <DayHeader label={g.label} right={`+${shown(g.items.reduce((t, tx) => t + tx.amount, 0))}`} />
                    {g.items.map((tx) => (
                      <div key={tx.reference} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                        <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${tx.matched ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                          {tx.matched ? <ArrowDownLeft size={16} /> : <Link2 size={15} />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-medium text-slate-900 truncate">
                            {tx.customer?.name || tx.customer?.email || 'Customer'}
                            {tx.payment?.scheduleId?.title && <span className="font-normal text-slate-500"> · {tx.payment.scheduleId.title}</span>}
                          </span>
                          <span className="block text-[11.5px] text-slate-400 truncate">{tx.paidAt ? `${format(new Date(tx.paidAt), 'HH:mm')} · ` : ''}<span className="font-mono">{tx.reference}</span>{tx.channel ? ` · ${String(tx.channel).replace('_', ' ')}` : ''}</span>
                        </span>
                        <span className="flex-shrink-0">
                          {!tx.matched ? (
                            <button onClick={() => openAttachModal(tx)} className="text-[12px] font-semibold px-3 h-8 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Attach</button>
                          ) : tx.payment?.status !== 'paid' ? (
                            <button onClick={() => handleReconcile(tx.payment)} className="inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 h-8 rounded-lg border border-amber-200 bg-amber-50 text-amber-700"><RefreshCw size={12} /> Reconcile</button>
                          ) : null}
                        </span>
                        <span className="text-right flex-shrink-0 w-28">
                          <span className="block text-[13.5px] font-semibold tabular-nums text-emerald-700">+{shown(tx.amount)}</span>
                          <span className={`block text-[11px] ${tx.matched ? 'text-slate-400' : 'text-red-600'}`}>{tx.matched ? (tx.payment?.status === 'paid' ? 'Recorded' : `Linked · ${tx.payment?.status}`) : 'Not linked'}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
