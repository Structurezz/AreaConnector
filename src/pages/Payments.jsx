import { useEffect, useState } from 'react';
import api from '../api/axios';
import Spinner from '../components/ui/Spinner';
import InvoiceModal from '../components/ui/InvoiceModal';
import BottomSheet from '../components/payments/BottomSheet';
import SidePanel from '../components/payments/SidePanel';
import WithdrawSheet, { Row } from '../components/payments/WithdrawSheet';
import BankSheet from '../components/payments/BankSheet';
import {
  Wallet, Plus, TrendingUp, Clock, AlertCircle, CheckCircle2,
  ChevronRight, ChevronLeft, ShieldCheck, Wrench, Gift, FileText,
  ArrowDownCircle, ArrowUpRight, ArrowDownLeft, RefreshCw,
  CircleDollarSign, Landmark, Receipt, Eye, EyeOff, CreditCard, XCircle, Copy,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import toast from 'react-hot-toast';

const TYPE_META = {
  security_dues: { label: 'Security Dues', icon: ShieldCheck, color: 'text-blue-600',    bg: 'bg-blue-50' },
  maintenance:   { label: 'Maintenance',   icon: Wrench,       color: 'text-amber-600',   bg: 'bg-amber-50' },
  levy:          { label: 'Levy',          icon: FileText,     color: 'text-purple-600',  bg: 'bg-purple-50' },
  contribution:  { label: 'Contribution',  icon: Gift,         color: 'text-emerald-600', bg: 'bg-emerald-50' },
  other:         { label: 'Other',         icon: ArrowDownCircle, color: 'text-slate-500', bg: 'bg-slate-100' },
};

const STATUS_STYLE = {
  paid:    'bg-emerald-50 text-emerald-600',
  pending: 'bg-amber-50 text-amber-600',
  overdue: 'bg-red-50 text-red-600',
  waived:  'bg-slate-100 text-slate-400',
};

const WITHDRAWAL_META = {
  pending: { label: 'Processing', pill: 'bg-amber-50 text-amber-600',     icon: Clock,        iconWrap: 'bg-amber-50 text-amber-600' },
  success: { label: 'Successful', pill: 'bg-emerald-50 text-emerald-600', icon: ArrowUpRight, iconWrap: 'bg-slate-100 text-slate-700' },
  failed:  { label: 'Failed',     pill: 'bg-red-50 text-red-600',         icon: XCircle,      iconWrap: 'bg-red-50 text-red-500' },
};

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const maskAcct = (n = '') => (n && n.length > 4 ? `•••• ${n.slice(-4)}` : n || '');
const dayLabel = (d) => isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEE, MMM d, yyyy');

// Group a date-sorted list into [{ label, items }] for statement-style lists.
function groupByDay(items, getDate) {
  const groups = [];
  items.forEach((item) => {
    const raw = getDate(item);
    const label = raw ? dayLabel(new Date(raw)) : 'Earlier';
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  });
  return groups;
}

const HIDE_KEY = 'em_hide_balance';

function ProgressBar({ paid, total }) {
  const pct = total ? Math.round((paid / total) * 100) : 0;
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-slate-400 mb-1.5">
        <span>{paid} of {total} paid</span><span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick, primary, badge }) {
  return (
    <button onClick={onClick} className="group flex flex-col items-center gap-2 min-w-0">
      <span className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all group-active:scale-95 ${
        primary
          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 group-hover:bg-emerald-600'
          : 'bg-white text-slate-700 border border-slate-200 group-hover:border-emerald-300 group-hover:text-emerald-600'
      }`}>
        <Icon size={22} strokeWidth={2.2} />
        {badge && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 ring-2 ring-white" />}
      </span>
      <span className="text-xs font-semibold text-slate-600 text-center leading-tight">{label}</span>
    </button>
  );
}

function StatChip({ icon: Icon, label, value, tone, className = '' }) {
  return (
    <div className={`glass-card px-4 py-3.5 min-w-[150px] snap-start shrink-0 lg:min-w-0 ${className}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${tone}`}><Icon size={14} /></span>
        <span className="text-xs text-slate-500 truncate">{label}</span>
      </div>
      <div className="text-lg font-bold text-slate-900 truncate">{value}</div>
    </div>
  );
}

function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between px-1 pt-1">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</h3>
      {action}
    </div>
  );
}

function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="glass-card py-14 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3"><Icon size={26} /></div>
      <p className="text-slate-700 font-semibold mb-1">{title}</p>
      {body && <p className="text-slate-400 text-sm mb-5 max-w-xs mx-auto">{body}</p>}
      {action}
    </div>
  );
}

export default function ManagerPayments() {
  const [stats, setStats] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('bills'); // bills | withdrawals | paystack

  // Collection (drill-down inside the Bills tab)
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [collectionPayments, setCollectionPayments] = useState([]);
  const [collectionLoading, setCollectionLoading] = useState(false);

  // Wallet
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [hideBalance, setHideBalance] = useState(() => localStorage.getItem(HIDE_KEY) === '1');

  // Paystack ledger
  const [ledger, setLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerLoaded, setLedgerLoaded] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [attachFor, setAttachFor] = useState(null);
  const [attachForm, setAttachForm] = useState({ residentId: '', scheduleId: '' });
  const [residents, setResidents] = useState([]);

  // Sheets
  const [showCreate, setShowCreate] = useState(false);
  const [showManual, setShowManual] = useState(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showBank, setShowBank] = useState(false);
  const [withdrawAfterBank, setWithdrawAfterBank] = useState(false);
  const [withdrawalDetail, setWithdrawalDetail] = useState(null);

  // Forms
  const [manualForm, setManualForm] = useState({ method: 'cash', notes: '', paidAt: '' });
  const [form, setForm] = useState({
    title: '', description: '', type: 'security_dues',
    amount: '', frequency: 'monthly', dueDate: '',
  });
  const [invoicePaymentId, setInvoicePaymentId] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const [statsRes, schedRes] = await Promise.all([
        api.get('/payments/stats'),
        api.get('/payments/schedules'),
      ]);
      setStats(statsRes.data.data);
      setSchedules(schedRes.data.data);
    } catch { toast.error('Failed to load payments'); }
    finally { setLoading(false); }
  };

  const loadWallet = async () => {
    setWalletLoading(true);
    try {
      const { data } = await api.get('/payments/wallet');
      setWallet(data.data);
    } catch { toast.error('Failed to load wallet'); }
    finally { setWalletLoading(false); }
  };

  const loadLedger = async () => {
    setLedgerLoading(true);
    try {
      const { data } = await api.get('/payments/paystack/recent', { params: { limit: 100 } });
      setLedger(data.data || []);
      setLedgerLoaded(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load Paystack ledger');
    } finally { setLedgerLoading(false); }
  };

  useEffect(() => { loadData(); loadWallet(); }, []);
  useEffect(() => { if (tab === 'paystack' && !ledgerLoaded) loadLedger(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleHide = () => {
    setHideBalance(h => { localStorage.setItem(HIDE_KEY, h ? '0' : '1'); return !h; });
  };

  const hasBank = !!wallet?.bank?.recipientCode;
  const bankName = wallet?.bank?.name || wallet?.bank?.bankName;

  const startWithdraw = () => {
    if (!wallet) return;
    if (!hasBank) { setWithdrawAfterBank(true); setShowBank(true); return; }
    setShowWithdraw(true);
  };

  const onBankSaved = async () => {
    setShowBank(false);
    await loadWallet();
    if (withdrawAfterBank) { setWithdrawAfterBank(false); setShowWithdraw(true); }
  };

  const openAttachModal = async (tx) => {
    setAttachFor(tx);
    setAttachForm({ residentId: '', scheduleId: '' });
    if (!residents.length) {
      try {
        const { data } = await api.get('/residents');
        setResidents(data.data || []);
      } catch { /* ignore */ }
    }
  };

  const submitAttach = async () => {
    if (!attachForm.residentId || !attachForm.scheduleId) {
      toast.error('Pick a resident and a schedule');
      return;
    }
    setAttaching(true);
    try {
      await api.post('/payments/paystack/attach', {
        reference: attachFor.reference,
        residentId: attachForm.residentId,
        scheduleId: attachForm.scheduleId,
      });
      toast.success(`Attached ₦${attachFor.amount.toLocaleString()} — payment recorded`);
      setAttachFor(null);
      loadLedger();
      loadData();
      loadWallet();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Attach failed');
    } finally { setAttaching(false); }
  };

  const openCollection = async (schedule) => {
    setSelectedSchedule(schedule);
    setTab('bills');
    setCollectionLoading(true);
    try {
      const { data } = await api.get(`/payments/schedules/${schedule._id}/payments`);
      setCollectionPayments(data.data);
    } catch { toast.error('Failed to load collection data'); }
    finally { setCollectionLoading(false); }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post('/payments/schedules', { ...form, amount: parseFloat(form.amount) });
      toast.success(`Schedule created! ${data.count} residents notified.`);
      setShowCreate(false);
      setForm({ title: '', description: '', type: 'security_dues', amount: '', frequency: 'monthly', dueDate: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleMarkPaid = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/payments/${showManual._id}/manual`, manualForm);
      toast.success('Payment recorded');
      setShowManual(null);
      setManualForm({ method: 'cash', notes: '', paidAt: '' });
      if (selectedSchedule) openCollection(selectedSchedule);
      loadData();
      loadWallet();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleWaive = async (payment) => {
    if (!confirm(`Waive payment for ${payment.residentId?.name}?`)) return;
    try {
      await api.patch(`/payments/${payment._id}/waive`);
      toast.success('Payment waived');
      if (selectedSchedule) openCollection(selectedSchedule);
    } catch { toast.error('Failed'); }
  };

  // Force-sync a stuck pending payment against Paystack. Hits the gateway
  // directly and flips the payment to paid if Paystack says it was captured —
  // unblocks the "paid but not reflecting" case.
  const [reconciling, setReconciling] = useState(null);
  const handleReconcile = async (payment) => {
    if (!payment.paystackReference) {
      toast.error('No Paystack reference on this payment');
      return;
    }
    setReconciling(payment._id);
    try {
      const { data } = await api.post(`/payments/reconcile/${payment.paystackReference}`);
      if (data.alreadyPaid) {
        toast.success('Already paid — refreshing');
      } else {
        toast.success(`Reconciled ₦${Number(payment.amount).toLocaleString()} — Paystack confirmed`);
      }
      if (selectedSchedule) openCollection(selectedSchedule);
      loadWallet();
    } catch (err) {
      // Paystack returned a non-success status for this reference. The real
      // capture almost certainly has a different reference — point them at the
      // ledger tab where every Paystack capture is listed by its real ref.
      const paystackStatus = err?.response?.data?.message || '';
      const gateway = err?.response?.data?.gateway || '';
      toast(
        (t) => (
          <div style={{ maxWidth: 320 }}>
            <div style={{ fontWeight: 700, color: '#B91C1C', marginBottom: 4 }}>
              Reconcile failed — this reference isn't a captured payment
            </div>
            <div style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>
              {paystackStatus}{gateway ? ` · ${gateway}` : ''}
            </div>
            <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>
              The ₦{Number(payment.amount || 0).toLocaleString()} on your Paystack dashboard likely has a <strong>different reference</strong>. Open the Paystack ledger to see every real capture and <strong>Attach</strong> it to this payment.
            </div>
            <button
              onClick={() => { toast.dismiss(t.id); setSelectedSchedule(null); setTab('paystack'); }}
              style={{ background: '#059669', color: '#fff', fontWeight: 700, fontSize: 12, padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer' }}
            >
              Open Paystack ledger →
            </button>
          </div>
        ),
        { duration: 12000, style: { maxWidth: 360 } }
      );
    } finally {
      setReconciling(null);
    }
  };

  if (loading) return <div className="flex justify-center py-24"><Spinner size={28} /></div>;

  const shown = (n) => (hideBalance ? '₦ ••••••' : naira(n));
  const withdrawals = wallet?.withdrawals || [];
  const unlinkedCount = ledger.filter(tx => !tx.matched).length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Desktop: online-banking layout — account column on the left,
          transactions on the right. Phones stack everything in one column. */}
      <div className="space-y-5 xl:space-y-0 xl:grid xl:grid-cols-[minmax(360px,420px)_1fr] xl:gap-6 xl:items-start">
      <aside className="space-y-5 xl:sticky xl:top-0">
      {/* ── Balance card ── */}
      <div
        className="relative overflow-hidden rounded-3xl p-5 sm:p-7 text-white"
        style={{ background: 'linear-gradient(135deg, #064E3B 0%, #047857 55%, #10B981 100%)', boxShadow: '0 16px 40px rgba(4,120,87,0.28)' }}
      >
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-20 right-16 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-2 text-emerald-100/90 text-sm">
            <Wallet size={15} /> Available balance
            <button onClick={toggleHide} aria-label={hideBalance ? 'Show balance' : 'Hide balance'}
              className="ml-1 w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10">
              {hideBalance ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <button
              onClick={() => { loadData(); loadWallet(); if (tab === 'paystack') loadLedger(); }}
              aria-label="Refresh"
              className="ml-auto -mr-1 w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
            >
              <RefreshCw size={15} className={walletLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="mt-1.5 text-[2.5rem] sm:text-5xl font-black tracking-tight leading-none">
            {walletLoading && !wallet ? <span className="inline-block w-40 h-10 rounded-lg bg-white/15 animate-pulse" /> : shown(wallet?.balance)}
          </div>

          {wallet && (
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-emerald-50/80">
              <span className="inline-flex items-center gap-1"><ArrowDownLeft size={13} /> Paid in-app {shown(wallet.collected)}</span>
              <span className="inline-flex items-center gap-1"><ArrowUpRight size={13} /> Withdrawn {shown(wallet.withdrawn)}</span>
            </div>
          )}
          {wallet?.collectedOffline > 0 && (
            <p className="mt-2 text-[11px] leading-snug text-emerald-50/70">
              {shown(wallet.collectedOffline)} was paid outside the app (cash or bank transfer). It counts as paid for the resident, but it isn't in your wallet, so it can't be withdrawn.
            </p>
          )}

          {/* Payout account strip */}
          <button
            onClick={() => setShowBank(true)}
            className="mt-5 w-full flex items-center gap-3 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur px-3.5 py-3 text-left transition-colors"
          >
            <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><Landmark size={17} /></span>
            {hasBank ? (
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold truncate">{wallet.bank.accountName}</span>
                <span className="block text-xs text-emerald-50/75 truncate">{bankName} · {maskAcct(wallet.bank.accountNumber)}</span>
              </span>
            ) : (
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold">Add a bank account</span>
                <span className="block text-xs text-emerald-50/75">Needed before you can withdraw</span>
              </span>
            )}
            <ChevronRight size={16} className="text-emerald-50/70 shrink-0" />
          </button>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4 sm:max-w-lg xl:max-w-none xl:glass-card xl:p-4 xl:gap-2">
        <QuickAction icon={ArrowUpRight} label="Withdraw" primary onClick={startWithdraw} />
        <QuickAction icon={Landmark} label={hasBank ? 'Bank account' : 'Add bank'} onClick={() => setShowBank(true)} badge={wallet && !hasBank} />
        <QuickAction icon={Plus} label="New bill" onClick={() => setShowCreate(true)} />
        <QuickAction icon={CreditCard} label="Paystack" onClick={() => { setSelectedSchedule(null); setTab('paystack'); }} />
      </div>

      {/* ── Stats ── */}
      {stats && (
        <div className="-mx-4 px-4 md:mx-0 md:px-0 flex lg:grid lg:grid-cols-5 xl:grid-cols-2 gap-3 overflow-x-auto lg:overflow-visible no-scrollbar snap-x snap-mandatory">
          <StatChip icon={CircleDollarSign} label="This month"      value={naira(stats.thisMonth)}      tone="bg-emerald-50 text-emerald-600" />
          <StatChip icon={TrendingUp}       label="Total collected" value={naira(stats.totalCollected)} tone="bg-emerald-50 text-emerald-600" />
          <StatChip icon={Clock}            label="Pending"         value={stats.pending}               tone="bg-amber-50 text-amber-600" />
          <StatChip icon={AlertCircle}      label="Overdue"         value={stats.overdue}               tone="bg-red-50 text-red-600" />
          <StatChip icon={FileText}         label="Active bills"    value={stats.activeSchedules}       tone="bg-blue-50 text-blue-600" className="xl:col-span-2" />
        </div>
      )}

      </aside>

      <section className="space-y-5 min-w-0">
      {/* ── Segmented tabs ── */}
      <div className="flex p-1 rounded-2xl bg-slate-100 sticky top-0 z-10">
        {[
          { id: 'bills',       label: 'Bills' },
          { id: 'withdrawals', label: 'Withdrawals' },
          { id: 'paystack',    label: 'Paystack' },
        ].map(({ id, label }) => (
          <button key={id}
            onClick={() => { setTab(id); if (id !== 'bills') setSelectedSchedule(null); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {label}
            {id === 'paystack' && unlinkedCount > 0 && (
              <span className="ml-1.5 text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full align-middle">{unlinkedCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Bills: list ── */}
      {tab === 'bills' && !selectedSchedule && (
        schedules.length === 0 ? (
          <EmptyState icon={FileText} title="No bills yet"
            body="Create a bill (dues, levy or contribution) and every resident gets an invoice to pay."
            action={<button onClick={() => setShowCreate(true)} className="btn-primary gap-2"><Plus size={15} /> Create bill</button>} />
        ) : (
          <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-3">
            {schedules.map((s) => {
              const meta = TYPE_META[s.type] || TYPE_META.other;
              const Icon = meta.icon;
              return (
                <button key={s._id} onClick={() => openCollection(s)}
                  className="glass-card p-4 text-left hover:border-emerald-200 transition-all active:scale-[0.99]">
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${meta.bg} ${meta.color}`}><Icon size={19} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-slate-900 text-sm leading-tight truncate">{s.title}</h3>
                        <span className="text-base font-bold text-slate-900 shrink-0">{naira(s.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="text-xs text-slate-400 truncate">
                          {meta.label} · {s.frequency.replace('_', ' ')} · Due {format(new Date(s.dueDate), 'MMM d')}
                        </span>
                        {!s.isActive && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 shrink-0">Inactive</span>}
                      </div>
                    </div>
                  </div>
                  {s.stats && <ProgressBar paid={s.stats.paid} total={s.stats.total} />}
                  {s.stats && (
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="text-emerald-600 font-medium">{s.stats.paid} paid</span>
                      <span className="text-amber-600 font-medium">{s.stats.pending} pending</span>
                      {s.stats.overdue > 0 && <span className="text-red-600 font-medium">{s.stats.overdue} overdue</span>}
                      <ChevronRight size={14} className="ml-auto text-slate-300" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )
      )}

      {/* ── Bills: collection drill-down ── */}
      {tab === 'bills' && selectedSchedule && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedSchedule(null)} aria-label="Back to bills"
              className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100">
              <ChevronLeft size={20} />
            </button>
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-900 truncate">{selectedSchedule.title}</h2>
              <p className="text-slate-400 text-xs">
                {naira(selectedSchedule.amount)} · Due {format(new Date(selectedSchedule.dueDate), 'MMM d, yyyy')}
              </p>
            </div>
          </div>

          {collectionLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : collectionPayments.length === 0 ? (
            <EmptyState icon={FileText} title="No residents on this bill" />
          ) : (
            <div className="glass-card divide-y divide-slate-100 overflow-hidden">
              {collectionPayments.map((p) => {
                const open = p.status !== 'paid' && p.status !== 'waived';
                return (
                  <div key={p._id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-sm font-bold shrink-0">
                        {p.residentId?.name?.[0] || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-slate-900 font-medium text-sm truncate">{p.residentId?.name || 'Resident'}</div>
                        <div className="text-slate-400 text-xs truncate">
                          {p.paidAt ? `Paid ${format(new Date(p.paidAt), 'MMM d, yyyy')}${p.method ? ` · ${p.method.replace('_', ' ')}` : ''}` : p.residentId?.email}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-slate-900">{naira(p.amount)}</div>
                        <span className={`inline-block mt-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[p.status]}`}>
                          {p.status}
                        </span>
                      </div>
                    </div>

                    {p.paystackReference && p.status === 'pending' && (
                      <div className="mt-2 ml-[52px] inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock size={10} /> Awaiting Paystack confirmation
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-3 ml-[52px]">
                      {open && p.paystackReference && (
                        <button onClick={() => handleReconcile(p)} disabled={reconciling === p._id}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 disabled:opacity-50">
                          <RefreshCw size={12} className={reconciling === p._id ? 'animate-spin' : ''} /> Reconcile
                        </button>
                      )}
                      {open && (<>
                        <button onClick={() => { setShowManual(p); setManualForm({ method: 'cash', notes: '', paidAt: '' }); }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700">
                          <CheckCircle2 size={12} /> Mark paid
                        </button>
                        <button onClick={() => handleWaive(p)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-500">
                          Waive
                        </button>
                      </>)}
                      <button onClick={() => setInvoicePaymentId(p._id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600">
                        <Receipt size={12} /> {p.status === 'paid' ? 'Receipt' : 'Invoice'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Withdrawals: statement ── */}
      {tab === 'withdrawals' && (
        walletLoading && !wallet ? (
          <div className="flex justify-center py-16"><Spinner size={26} /></div>
        ) : !wallet ? (
          <div className="flex justify-center py-12">
            <button onClick={loadWallet} className="btn-outline gap-2"><RefreshCw size={14} /> Retry</button>
          </div>
        ) : withdrawals.length === 0 ? (
          <EmptyState icon={ArrowUpRight} title="No withdrawals yet"
            body="Money you move from your estate wallet to your bank will show up here."
            action={<button onClick={startWithdraw} className="btn-primary gap-2"><ArrowUpRight size={15} /> Make a withdrawal</button>} />
        ) : (
          <div className="space-y-4">
            {groupByDay(withdrawals, w => w.createdAt).map(group => (
              <div key={group.label} className="space-y-2">
                <SectionHeader title={group.label} />
                <div className="glass-card divide-y divide-slate-100 overflow-hidden">
                  {group.items.map(w => {
                    const meta = WITHDRAWAL_META[w.status] || WITHDRAWAL_META.pending;
                    const Icon = meta.icon;
                    return (
                      <button key={w._id} onClick={() => setWithdrawalDetail(w)}
                        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors">
                        <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${meta.iconWrap}`}><Icon size={18} /></span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold text-slate-900 truncate">To {w.bankName || 'bank'}</span>
                          <span className="block text-xs text-slate-400 truncate">
                            {maskAcct(w.accountNumber)} · {format(new Date(w.createdAt), 'h:mm a')}
                          </span>
                        </span>
                        <span className="text-right shrink-0">
                          <span className={`block text-sm font-bold ${w.status === 'failed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                            −{naira(w.amount)}
                          </span>
                          <span className={`inline-block mt-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${meta.pill}`}>{meta.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Paystack ledger ── */}
      {tab === 'paystack' && (
        <div className="space-y-3">
          <div className="rounded-2xl p-4 flex items-start gap-3 bg-amber-50 border border-amber-200">
            <AlertCircle size={18} className="text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-amber-900">Live Paystack payments</div>
              <div className="text-xs mt-1 text-amber-800 leading-relaxed">
                Every successful charge appears here. Tap <strong>Attach</strong> on a <strong>Not linked</strong> payment to match it to a resident and bill — it's then recorded and added to your wallet.
              </div>
            </div>
          </div>

          {ledgerLoading ? (
            <div className="flex justify-center py-16"><Spinner size={26} /></div>
          ) : ledger.length === 0 ? (
            <EmptyState icon={CreditCard} title="No Paystack payments yet" />
          ) : (
            groupByDay(ledger, tx => tx.paidAt || tx.createdAt).map(group => (
              <div key={group.label} className="space-y-2">
                <SectionHeader title={group.label} />
                <div className="glass-card divide-y divide-slate-100 overflow-hidden">
                  {group.items.map(tx => (
                    <div key={tx.reference} className="flex items-center gap-3 p-4">
                      <span className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <ArrowDownLeft size={18} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{tx.customer?.name || tx.customer?.email || 'Customer'}</div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">{tx.reference}</div>
                        <div className="mt-1">
                          {tx.matched ? (
                            tx.payment?.status === 'paid'
                              ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Linked · paid</span>
                              : <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Linked · {tx.payment?.status}</span>
                          ) : (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Not linked</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                        <span className="text-sm font-bold text-emerald-600">+{naira(tx.amount)}</span>
                        {!tx.matched ? (
                          <button onClick={() => openAttachModal(tx)}
                            className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-600 text-white">Attach</button>
                        ) : tx.payment?.status !== 'paid' ? (
                          <button onClick={() => handleReconcile(tx.payment)}
                            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-50 text-amber-700">
                            <RefreshCw size={11} /> Reconcile
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">{tx.paidAt ? format(new Date(tx.paidAt), 'h:mm a') : ''}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      </section>
      </div>

      {/* ── Sheets ── */}
      <WithdrawSheet
        open={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        wallet={wallet}
        onChangeBank={() => { setShowWithdraw(false); setWithdrawAfterBank(true); setShowBank(true); }}
        onWithdrawn={loadWallet}
      />

      <BankSheet
        open={showBank}
        onClose={() => { setShowBank(false); setWithdrawAfterBank(false); }}
        onSaved={onBankSaved}
        currentBank={wallet?.bank}
      />

      {/* Withdrawal detail */}
      <BottomSheet open={!!withdrawalDetail} onClose={() => setWithdrawalDetail(null)} title="Withdrawal details"
        footer={<button onClick={() => setWithdrawalDetail(null)} className="btn-outline w-full py-3">Close</button>}>
        {withdrawalDetail && (() => {
          const w = withdrawalDetail;
          const meta = WITHDRAWAL_META[w.status] || WITHDRAWAL_META.pending;
          return (
            <>
              <div className="text-center py-4">
                <div className="text-4xl font-black text-slate-900 tracking-tight">{naira(w.amount)}</div>
                <span className={`inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full ${meta.pill}`}>{meta.label}</span>
              </div>
              {w.status === 'failed' && w.failureReason && (
                <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{w.failureReason} — the amount has been returned to your wallet.</div>
              )}
              {w.status === 'pending' && w.paystackStatus === 'otp' && (
                <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">Awaiting payout authorisation. You'll get an email once it's sent.</div>
              )}
              <div className="rounded-2xl bg-slate-50 divide-y divide-slate-100 text-sm">
                <Row label="To" value={w.accountName || '—'} sub={`${w.bankName || ''} · ${maskAcct(w.accountNumber)}`} />
                <Row label="Date" value={format(new Date(w.createdAt), 'MMM d, yyyy · h:mm a')} />
                <Row label="Reference" value={
                  <button onClick={() => { navigator.clipboard?.writeText(w.reference); toast.success('Reference copied'); }}
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-700 hover:text-emerald-600 break-all">
                    {w.reference} <Copy size={12} className="shrink-0" />
                  </button>
                } />
              </div>
            </>
          );
        })()}
      </BottomSheet>

      {/* Attach Paystack transaction */}
      <BottomSheet open={!!attachFor} onClose={() => setAttachFor(null)} title="Attach payment"
        subtitle={attachFor ? `Link ${naira(attachFor.amount)} to a resident and bill` : ''}
        footer={
          <div className="flex gap-3">
            <button onClick={() => setAttachFor(null)} className="btn-outline flex-1 py-3">Cancel</button>
            <button onClick={submitAttach} disabled={attaching} className="btn-primary flex-[2] py-3">
              {attaching ? 'Attaching…' : `Attach ${attachFor ? naira(attachFor.amount) : ''}`}
            </button>
          </div>
        }>
        {attachFor && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 divide-y divide-slate-100 text-sm">
              <Row label="Reference" value={<span className="font-mono text-xs break-all">{attachFor.reference}</span>} />
              <Row label="Customer" value={attachFor.customer?.email || '—'} />
              <Row label="Paid" value={attachFor.paidAt ? format(new Date(attachFor.paidAt), 'MMM d, yyyy · h:mm a') : '—'} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Resident</label>
              <select className="input-field w-full py-3" value={attachForm.residentId}
                onChange={e => setAttachForm(f => ({ ...f, residentId: e.target.value }))}>
                <option value="">Select resident…</option>
                {residents.map(r => <option key={r._id} value={r._id}>{r.name} · {r.email}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Bill</label>
              <select className="input-field w-full py-3" value={attachForm.scheduleId}
                onChange={e => setAttachForm(f => ({ ...f, scheduleId: e.target.value }))}>
                <option value="">Select bill…</option>
                {schedules.map(s => <option key={s._id} value={s._id}>{s.title} · {naira(s.amount)} · {s.frequency}</option>)}
              </select>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Create bill */}
      <SidePanel open={showCreate} onClose={() => setShowCreate(false)} title="New bill"
        subtitle="Every active resident gets a pending invoice">
        <form id="create-bill" onSubmit={handleCreateSchedule} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Title *</label>
            <input className="input-field py-3" placeholder="e.g. Security Dues – June 2026"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(TYPE_META).map(([val, { label, icon: Icon, color, bg }]) => (
                <button key={val} type="button" onClick={() => setForm({ ...form, type: val })}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-[11px] font-semibold transition-all ${
                    form.type === val ? 'border-emerald-400 bg-emerald-50/60 text-slate-900' : 'border-slate-200 text-slate-500'
                  }`}>
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg} ${color}`}><Icon size={15} /></span>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Amount (₦) *</label>
              <input type="number" inputMode="numeric" className="input-field py-3" placeholder="5000"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required min="1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Frequency</label>
              <select className="input-field py-3" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
                <option value="one_time">One time</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Due date *</label>
            <input type="date" className="input-field py-3"
              value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Description (optional)</label>
            <textarea className="input-field" rows={2} placeholder="Additional details..."
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-outline flex-1 py-3">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-[2] py-3">
              {saving ? 'Creating…' : 'Create bill'}
            </button>
          </div>
        </form>
      </SidePanel>

      {/* Record manual payment */}
      <BottomSheet open={!!showManual} onClose={() => setShowManual(null)} title="Record payment"
        subtitle={showManual?.residentId?.name}>
        <form onSubmit={handleMarkPaid} className="space-y-4">
          <div className="text-center py-3">
            <div className="text-3xl font-black text-slate-900">{naira(showManual?.amount)}</div>
            <p className="text-xs text-emerald-600 mt-1 inline-flex items-center gap-1"><Wallet size={12} /> Will be added to your wallet</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">How was it paid?</label>
            <div className="grid grid-cols-3 gap-2">
              {[['cash', 'Cash'], ['bank_transfer', 'Transfer'], ['manual', 'Other']].map(([val, label]) => (
                <button key={val} type="button" onClick={() => setManualForm({ ...manualForm, method: val })}
                  className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    manualForm.method === val ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Date paid</label>
            <input type="date" className="input-field py-3" value={manualForm.paidAt}
              onChange={(e) => setManualForm({ ...manualForm, paidAt: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Notes (optional)</label>
            <input className="input-field py-3" placeholder="e.g. Receipt #123, teller no..."
              value={manualForm.notes} onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowManual(null)} className="btn-outline flex-1 py-3">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-[2] py-3">
              {saving ? 'Recording…' : 'Confirm payment'}
            </button>
          </div>
        </form>
      </BottomSheet>

      <InvoiceModal
        paymentId={invoicePaymentId}
        onClose={() => setInvoicePaymentId(null)}
      />
    </div>
  );
}
