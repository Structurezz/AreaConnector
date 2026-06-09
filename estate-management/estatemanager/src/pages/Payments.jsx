import { useEffect, useState } from 'react';
import api from '../api/axios';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import {
  Wallet, Plus, TrendingUp, Clock, AlertCircle, CheckCircle2,
  ChevronRight, X, CreditCard, Banknote, Building,
  ChevronLeft, ShieldCheck, Wrench, Gift, FileText,
  ArrowDownCircle, ArrowUpCircle, RefreshCw, BadgeCheck,
  CircleDollarSign, Landmark, SendHorizonal, History,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const TYPE_META = {
  security_dues: { label: 'Security Dues', icon: ShieldCheck, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  maintenance:   { label: 'Maintenance',   icon: Wrench,       color: 'text-amber-400', bg: 'bg-amber-500/10' },
  levy:          { label: 'Levy',          icon: FileText,     color: 'text-purple-400', bg: 'bg-purple-500/10' },
  contribution:  { label: 'Contribution',  icon: Gift,         color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  other:         { label: 'Other',         icon: ArrowDownCircle, color: 'text-white/50', bg: 'bg-white/5' },
};

const STATUS_STYLE = {
  paid:    'bg-emerald-500/10 text-emerald-400',
  pending: 'bg-amber-500/10 text-amber-400',
  overdue: 'bg-red-500/10 text-red-400',
  waived:  'bg-white/8 text-white/40',
};

const WITHDRAWAL_STYLE = {
  pending: 'bg-amber-500/10 text-amber-400',
  success: 'bg-emerald-500/10 text-emerald-400',
  failed:  'bg-red-500/10 text-red-400',
};

function StatCard({ icon: Icon, label, value, sub, color = 'text-gold' }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-white/40 text-sm">{label}</span>
        <div className={`p-2 rounded-lg bg-white/5 ${color}`}><Icon size={15} /></div>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-white/35 text-xs mt-1">{sub}</div>}
    </div>
  );
}

function ProgressBar({ paid, total }) {
  const pct = total ? Math.round((paid / total) * 100) : 0;
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-white/40 mb-1.5">
        <span>{paid} of {total} paid</span><span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ManagerPayments() {
  const [stats, setStats] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  // Collection state
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [collectionPayments, setCollectionPayments] = useState([]);
  const [collectionLoading, setCollectionLoading] = useState(false);

  // Wallet state
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [banks, setBanks] = useState([]);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showManual, setShowManual] = useState(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showBankSetup, setShowBankSetup] = useState(false);

  // Forms
  const [manualForm, setManualForm] = useState({ method: 'cash', notes: '', paidAt: '' });
  const [form, setForm] = useState({
    title: '', description: '', type: 'security_dues',
    amount: '', frequency: 'monthly', dueDate: '',
  });
  const [bankForm, setBankForm] = useState({ bankCode: '', accountNumber: '' });
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [resolvedAccount, setResolvedAccount] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
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

  const loadBanks = async () => {
    if (banks.length) return;
    try {
      const { data } = await api.get('/payments/wallet/banks');
      setBanks(data.data || []);
    } catch { toast.error('Failed to fetch banks'); }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (tab === 'wallet' && !wallet) loadWallet();
  }, [tab]);

  const openCollection = async (schedule) => {
    setSelectedSchedule(schedule);
    setTab('collection');
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
      if (tab === 'wallet') loadWallet();
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

  // Bank account resolve + save
  const handleResolveAccount = async () => {
    if (bankForm.accountNumber.length !== 10 || !bankForm.bankCode) return;
    setResolving(true);
    setResolvedAccount(null);
    try {
      // We submit and the backend resolves
      const { data } = await api.post('/payments/wallet/bank', bankForm);
      setResolvedAccount(data.data);
      toast.success('Bank account saved!');
      setShowBankSetup(false);
      setBankForm({ bankCode: '', accountNumber: '' });
      loadWallet();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not verify account');
    } finally { setResolving(false); }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/payments/wallet/withdraw', { amount: parseFloat(withdrawAmount) });
      toast.success('Withdrawal initiated successfully!');
      setShowWithdraw(false);
      setWithdrawAmount('');
      loadWallet();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Withdrawal failed');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-24"><Spinner size={28} /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Payments</h1>
          <p className="text-white/40 text-sm">Manage dues, levies, contributions and your wallet</p>
        </div>
        <div className="flex items-center gap-2">
          {wallet && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              <Wallet size={14} className="text-emerald-400" />
              <span className="text-emerald-400 text-sm font-semibold">
                ₦{(wallet.balance || 0).toLocaleString()}
              </span>
            </div>
          )}
          <button onClick={() => setShowCreate(true)} className="btn-primary gap-2">
            <Plus size={15} /> New Schedule
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard icon={TrendingUp}         label="Total Collected"   value={`₦${(stats.totalCollected||0).toLocaleString()}`}  color="text-emerald-400" />
          <StatCard icon={CircleDollarSign}   label="This Month"        value={`₦${(stats.thisMonth||0).toLocaleString()}`}        color="text-gold" />
          <StatCard icon={Clock}              label="Pending"           value={stats.pending}          sub="payments"   color="text-amber-400" />
          <StatCard icon={AlertCircle}        label="Overdue"           value={stats.overdue}          sub="payments"   color="text-red-400" />
          <StatCard icon={FileText}           label="Active Schedules"  value={stats.activeSchedules}  sub="schedules"  color="text-blue-400" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/8">
        {[
          { id: 'overview',   label: 'Schedules' },
          { id: 'collection', label: 'Collection', disabled: !selectedSchedule },
          { id: 'wallet',     label: 'Wallet' },
        ].map(({ id, label, disabled }) => (
          <button key={id} onClick={() => !disabled && setTab(id)}
            disabled={disabled}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
              tab === id
                ? 'border-gold text-gold'
                : 'border-transparent text-white/40 hover:text-white disabled:opacity-30 disabled:cursor-default'
            }`}>
            {label}
            {id === 'wallet' && wallet && (
              <span className="ml-1.5 text-xs bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full">
                ₦{(wallet.balance || 0).toLocaleString()}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Schedules tab ── */}
      {tab === 'overview' && (
        schedules.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <Wallet size={40} className="text-white/15 mx-auto mb-3" />
            <p className="text-white/40 font-medium mb-1">No payment schedules yet</p>
            <p className="text-white/25 text-sm mb-5">Create your first schedule to start collecting dues</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary gap-2">
              <Plus size={15} /> Create Schedule
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {schedules.map((s) => {
              const meta = TYPE_META[s.type] || TYPE_META.other;
              const Icon = meta.icon;
              return (
                <div key={s._id} className="glass-card p-5 hover:border-gold/20 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-lg ${meta.bg} ${meta.color}`}><Icon size={16} /></div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${s.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/8 text-white/30'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-1 leading-tight">{s.title}</h3>
                  <div className="text-xs text-white/40 mb-0.5">{meta.label} · {s.frequency.replace('_', ' ')}</div>
                  <div className="text-xl font-bold text-gold mb-0.5">₦{s.amount.toLocaleString()}</div>
                  <div className="text-xs text-white/35">Due {format(new Date(s.dueDate), 'MMM d, yyyy')}</div>
                  {s.stats && <ProgressBar paid={s.stats.paid} total={s.stats.total} />}
                  {s.stats && (
                    <div className="flex gap-3 mt-2 text-xs text-white/35">
                      <span className="text-emerald-400">✓ {s.stats.paid} paid</span>
                      <span className="text-amber-400">⏳ {s.stats.pending} pending</span>
                      {s.stats.overdue > 0 && <span className="text-red-400">⚠ {s.stats.overdue} overdue</span>}
                    </div>
                  )}
                  <button onClick={() => openCollection(s)}
                    className="mt-4 w-full text-sm text-white/50 hover:text-gold flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-gold/5 border border-white/8 hover:border-gold/20 transition-all">
                    View Collection <ChevronRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Collection tab ── */}
      {tab === 'collection' && selectedSchedule && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setTab('overview')} className="text-white/40 hover:text-white transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div>
              <h2 className="font-semibold text-white">{selectedSchedule.title}</h2>
              <p className="text-white/40 text-sm">
                ₦{selectedSchedule.amount.toLocaleString()} · Due {format(new Date(selectedSchedule.dueDate), 'MMM d, yyyy')}
              </p>
            </div>
          </div>

          {collectionLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : (
            <div className="glass-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="text-left text-white/35 font-medium px-5 py-3">Resident</th>
                    <th className="text-left text-white/35 font-medium px-5 py-3 hidden sm:table-cell">Amount</th>
                    <th className="text-left text-white/35 font-medium px-5 py-3">Status</th>
                    <th className="text-left text-white/35 font-medium px-5 py-3 hidden md:table-cell">Paid At</th>
                    <th className="text-left text-white/35 font-medium px-5 py-3 hidden md:table-cell">Method</th>
                    <th className="text-right text-white/35 font-medium px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {collectionPayments.map((p) => (
                    <tr key={p._id} className="hover:bg-white/3 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center text-gold text-xs font-bold flex-shrink-0">
                            {p.residentId?.name?.[0]}
                          </div>
                          <div>
                            <div className="text-white font-medium text-sm">{p.residentId?.name}</div>
                            <div className="text-white/30 text-xs">{p.residentId?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell text-white font-medium">₦{p.amount.toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-md capitalize ${STATUS_STYLE[p.status]}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell text-white/40 text-xs">
                        {p.paidAt ? format(new Date(p.paidAt), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell text-white/40 text-xs capitalize">
                        {p.method || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {p.status !== 'paid' && p.status !== 'waived' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => { setShowManual(p); setManualForm({ method: 'cash', notes: '', paidAt: '' }); }}
                              className="text-xs text-white/40 hover:text-emerald-400 transition-colors px-2 py-1 rounded hover:bg-emerald-500/10">
                              Mark Paid
                            </button>
                            <button onClick={() => handleWaive(p)}
                              className="text-xs text-white/30 hover:text-white/60 transition-colors px-2 py-1 rounded hover:bg-white/5">
                              Waive
                            </button>
                          </div>
                        )}
                        {p.status === 'paid' && <CheckCircle2 size={16} className="text-emerald-400 ml-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Wallet tab ── */}
      {tab === 'wallet' && (
        <div className="space-y-5">
          {walletLoading ? (
            <div className="flex justify-center py-24"><Spinner size={28} /></div>
          ) : wallet ? (
            <>
              {/* Balance card */}
              <div className="glass-card p-6 bg-gradient-to-br from-emerald-500/8 to-transparent border-emerald-500/15">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/50 text-sm mb-1 flex items-center gap-1.5">
                      <Wallet size={14} /> Wallet Balance
                    </p>
                    <div className="text-4xl font-bold text-white mt-1">
                      ₦{(wallet.balance || 0).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-white/30 text-xs">
                        Collected: <span className="text-emerald-400">₦{(wallet.collected || 0).toLocaleString()}</span>
                      </span>
                      {wallet.withdrawn > 0 && (
                        <span className="text-white/30 text-xs">
                          Withdrawn: <span className="text-amber-400">₦{wallet.withdrawn.toLocaleString()}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!wallet.bank?.recipientCode) {
                        setShowBankSetup(true);
                        loadBanks();
                      } else {
                        setShowWithdraw(true);
                      }
                    }}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <ArrowUpCircle size={16} /> Withdraw
                  </button>
                </div>

                {wallet.balance > 0 && !wallet.bank?.recipientCode && (
                  <div className="mt-4 p-3 rounded-lg bg-amber-500/8 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                    <AlertCircle size={13} />
                    Add a bank account to withdraw your balance.
                    <button onClick={() => { setShowBankSetup(true); loadBanks(); }}
                      className="underline ml-auto shrink-0">Set up now</button>
                  </div>
                )}
              </div>

              {/* Bank account */}
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-white font-medium text-sm">
                    <Landmark size={15} className="text-white/40" /> Bank Account
                  </div>
                  <button
                    onClick={() => { setShowBankSetup(true); loadBanks(); }}
                    className="text-xs text-white/40 hover:text-gold transition-colors"
                  >
                    {wallet.bank?.recipientCode ? 'Update' : 'Add account'}
                  </button>
                </div>

                {wallet.bank?.recipientCode ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                      <Building size={18} className="text-gold" />
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm">{wallet.bank.accountName}</div>
                      <div className="text-white/40 text-xs">{wallet.bank.bankName} · {wallet.bank.accountNumber}</div>
                    </div>
                    <BadgeCheck size={16} className="text-emerald-400 ml-auto" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 gap-2">
                    <Landmark size={32} className="text-white/10" />
                    <p className="text-white/30 text-sm">No bank account added yet</p>
                    <button
                      onClick={() => { setShowBankSetup(true); loadBanks(); }}
                      className="mt-1 text-sm text-gold hover:text-gold/80 transition-colors flex items-center gap-1"
                    >
                      <Plus size={14} /> Add bank account
                    </button>
                  </div>
                )}
              </div>

              {/* Withdrawal history */}
              <div className="glass-card overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-white/8">
                  <History size={15} className="text-white/40" />
                  <span className="text-white font-medium text-sm">Withdrawal History</span>
                </div>
                {wallet.withdrawals?.length === 0 ? (
                  <div className="py-12 text-center text-white/25 text-sm">No withdrawals yet</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left text-white/35 font-medium px-5 py-3">Date</th>
                        <th className="text-left text-white/35 font-medium px-5 py-3">Bank</th>
                        <th className="text-right text-white/35 font-medium px-5 py-3">Amount</th>
                        <th className="text-right text-white/35 font-medium px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {wallet.withdrawals.map((w) => (
                        <tr key={w._id} className="hover:bg-white/3 transition-colors">
                          <td className="px-5 py-3.5 text-white/50 text-xs">
                            {format(new Date(w.createdAt), 'MMM d, yyyy')}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="text-white text-xs font-medium">{w.accountName}</div>
                            <div className="text-white/35 text-xs">{w.bankName} · {w.accountNumber}</div>
                          </td>
                          <td className="px-5 py-3.5 text-right text-white font-semibold text-sm">
                            ₦{w.amount.toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-md capitalize ${WITHDRAWAL_STYLE[w.status]}`}>
                              {w.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div className="flex justify-center py-12">
              <button onClick={loadWallet} className="btn-outline gap-2">
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Create Schedule Modal ── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Payment Schedule">
        <form onSubmit={handleCreateSchedule} className="space-y-4">
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Schedule Title *</label>
            <input className="input-field" placeholder="e.g. Security Dues – June 2026"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Type</label>
              <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {Object.entries(TYPE_META).map(([val, { label }]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Frequency</label>
              <select className="input-field" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
                <option value="one_time">One Time</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Amount (₦) *</label>
              <input type="number" className="input-field" placeholder="5000"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required min="1" />
            </div>
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Due Date *</label>
              <input type="date" className="input-field"
                value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Description (optional)</label>
            <textarea className="input-field" rows={2} placeholder="Additional details..."
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="p-3 rounded-lg bg-blue-500/8 border border-blue-500/20 text-blue-300 text-xs">
            Pending payment records will be automatically created for all active residents.
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Creating...' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Record Manual Payment Modal ── */}
      <Modal open={!!showManual} onClose={() => setShowManual(null)} title={`Record Payment — ${showManual?.residentId?.name}`}>
        <form onSubmit={handleMarkPaid} className="space-y-4">
          <div className="glass-card p-4 flex items-center justify-between">
            <span className="text-white/60 text-sm">Amount</span>
            <span className="text-xl font-bold text-gold">₦{showManual?.amount?.toLocaleString()}</span>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/15 text-emerald-300 text-xs flex items-center gap-2">
            <Wallet size={12} /> This amount will be credited to your wallet.
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Payment Method</label>
            <select className="input-field" value={manualForm.method}
              onChange={(e) => setManualForm({ ...manualForm, method: e.target.value })}>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="manual">Other / Manual</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Date Paid</label>
            <input type="date" className="input-field" value={manualForm.paidAt}
              onChange={(e) => setManualForm({ ...manualForm, paidAt: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Notes (optional)</label>
            <input className="input-field" placeholder="e.g. Receipt #123, teller no..."
              value={manualForm.notes} onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowManual(null)} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Recording...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Bank Account Setup Modal ── */}
      <Modal open={showBankSetup} onClose={() => { setShowBankSetup(false); setBankForm({ bankCode: '', accountNumber: '' }); setResolvedAccount(null); }} title="Bank Account">
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-blue-500/8 border border-blue-500/20 text-blue-300 text-xs flex items-start gap-2">
            <Landmark size={13} className="mt-0.5 shrink-0" />
            Enter your Nigerian bank account to receive withdrawals via Paystack.
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Bank</label>
            <select className="input-field" value={bankForm.bankCode}
              onChange={(e) => setBankForm({ ...bankForm, bankCode: e.target.value })}>
              <option value="">Select a bank...</option>
              {banks.map((b) => (
                <option key={b.code} value={b.code}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Account Number</label>
            <input className="input-field" placeholder="10-digit account number" maxLength={10}
              value={bankForm.accountNumber}
              onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value.replace(/\D/g, '') })} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowBankSetup(false)} className="btn-outline flex-1">Cancel</button>
            <button
              onClick={handleResolveAccount}
              disabled={resolving || bankForm.accountNumber.length !== 10 || !bankForm.bankCode}
              className="btn-primary flex-1 gap-2"
            >
              {resolving ? (
                <><RefreshCw size={13} className="animate-spin" /> Verifying...</>
              ) : (
                <><BadgeCheck size={14} /> Verify &amp; Save</>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Withdraw Modal ── */}
      <Modal open={showWithdraw} onClose={() => { setShowWithdraw(false); setWithdrawAmount(''); }} title="Withdraw Funds">
        <form onSubmit={handleWithdraw} className="space-y-4">
          {wallet?.bank?.recipientCode && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/4 border border-white/8">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center">
                <Building size={16} className="text-gold" />
              </div>
              <div>
                <div className="text-white text-sm font-medium">{wallet.bank.accountName}</div>
                <div className="text-white/40 text-xs">{wallet.bank.bankName} · {wallet.bank.accountNumber}</div>
              </div>
            </div>
          )}

          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/50 text-xs">Available Balance</span>
              <span className="text-emerald-400 text-sm font-bold">₦{(wallet?.balance || 0).toLocaleString()}</span>
            </div>
            <div className="h-px bg-white/8 my-3" />
            <label className="text-sm text-white/60 mb-1.5 block">Withdrawal Amount (₦)</label>
            <input
              type="number"
              className="input-field text-lg font-bold"
              placeholder="Enter amount"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              min="100"
              max={wallet?.balance || 0}
              required
            />
            <div className="flex gap-2 mt-2">
              {[wallet?.balance * 0.25, wallet?.balance * 0.5, wallet?.balance].map((amt, i) => {
                const labels = ['25%', '50%', 'All'];
                if (!amt) return null;
                return (
                  <button key={i} type="button"
                    onClick={() => setWithdrawAmount(Math.floor(amt).toString())}
                    className="flex-1 text-xs text-white/40 hover:text-gold border border-white/8 hover:border-gold/20 rounded-lg py-1.5 transition-all">
                    {labels[i]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-500/8 border border-amber-500/15 text-amber-300 text-xs flex items-start gap-2">
            <AlertCircle size={12} className="mt-0.5 shrink-0" />
            Funds will be sent to your bank account via Paystack. This may take a few minutes.
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowWithdraw(false)} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={saving || !withdrawAmount || parseFloat(withdrawAmount) < 100}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2.5 rounded-xl transition-all disabled:opacity-40">
              {saving ? <><RefreshCw size={13} className="animate-spin" /> Processing...</> : <><SendHorizonal size={14} /> Withdraw ₦{parseFloat(withdrawAmount || 0).toLocaleString()}</>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
