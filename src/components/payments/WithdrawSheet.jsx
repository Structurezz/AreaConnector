import { useEffect, useRef, useState } from 'react';
import {
  Landmark, ArrowDown, CheckCircle2, Clock, RefreshCw, Wallet, ShieldCheck, Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import BottomSheet from './BottomSheet';

const MIN_WITHDRAWAL = 100; // matches server-side minimum in requestWithdrawal
const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
const maskAcct = (n = '') => (n.length > 4 ? `•••• ${n.slice(-4)}` : n);

// Three-step bank-style transfer: amount → review → result.
export default function WithdrawSheet({ open, onClose, wallet, onChangeBank, onWithdrawn }) {
  const [step, setStep] = useState('amount');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const balance = wallet?.balance || 0;
  const bank = wallet?.bank || {};
  const bankName = bank.name || bank.bankName;
  const value = parseFloat(amount) || 0;

  const error =
    !amount ? null
    : value < MIN_WITHDRAWAL ? `Minimum withdrawal is ${naira(MIN_WITHDRAWAL)}`
    : value > balance ? 'Amount is more than your available balance'
    : null;
  const canContinue = amount && !error;

  useEffect(() => {
    if (!open) return;
    setStep('amount'); setAmount(''); setResult(null);
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, [open]);

  const quickAmounts = [
    ...[5000, 10000, 50000].filter(v => v <= balance).map(v => ({ label: naira(v), value: v })),
    ...(balance >= MIN_WITHDRAWAL * 2 ? [{ label: '50%', value: Math.floor(balance / 2) }] : []),
    ...(balance >= MIN_WITHDRAWAL ? [{ label: 'All', value: Math.floor(balance) }] : []),
  ];

  const send = async () => {
    setSending(true);
    try {
      const { data } = await api.post('/payments/wallet/withdraw', { amount: value });
      setResult({ ...data.data, amount: value });
      setStep('done');
      onWithdrawn?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Withdrawal failed');
    } finally { setSending(false); }
  };

  const close = () => { if (!sending) onClose(); };

  // ── Step 3: result ──────────────────────────────────────────────────
  if (step === 'done' && result) {
    const success = result.status === 'success';
    return (
      <BottomSheet open={open} onClose={close}
        footer={<button onClick={close} className="btn-primary w-full py-3.5 text-base">Done</button>}>
        <div className="text-center pt-6 pb-2">
          <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-5 ${success ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            {success
              ? <CheckCircle2 size={44} className="text-emerald-500" />
              : <Clock size={40} className="text-amber-500" />}
          </div>
          <p className="text-sm text-slate-400 mb-1">{success ? 'Transfer successful' : 'Transfer processing'}</p>
          <div className="text-4xl font-black text-slate-900 tracking-tight mb-3">{naira(result.amount)}</div>
          <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">{result.message}</p>
        </div>
        <div className="mt-6 rounded-2xl bg-slate-50 divide-y divide-slate-100 text-sm">
          <Row label="To" value={bank.accountName} sub={`${bankName || ''} · ${maskAcct(bank.accountNumber)}`} />
          {result.reference && (
            <Row label="Reference" value={
              <button
                onClick={() => { navigator.clipboard?.writeText(result.reference); toast.success('Reference copied'); }}
                className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-700 hover:text-emerald-600"
              >
                {result.reference} <Copy size={12} />
              </button>
            } />
          )}
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">An email receipt is on its way to you.</p>
      </BottomSheet>
    );
  }

  // ── Step 2: review ──────────────────────────────────────────────────
  if (step === 'review') {
    return (
      <BottomSheet open={open} onClose={close} title="Confirm withdrawal" subtitle="Check the details before you send"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setStep('amount')} disabled={sending} className="btn-outline flex-1 py-3.5">Back</button>
            <button onClick={send} disabled={sending} className="btn-primary flex-[2] py-3.5 gap-2 text-base">
              {sending ? <><RefreshCw size={16} className="animate-spin" /> Sending…</> : <>Send {naira(value)}</>}
            </button>
          </div>
        }>
        <div className="text-center py-5">
          <p className="text-xs uppercase tracking-widest font-semibold text-slate-400 mb-1">You're sending</p>
          <div className="text-4xl font-black text-slate-900 tracking-tight">{naira(value)}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <Party icon={Wallet} tint="bg-emerald-50 text-emerald-600" label="From" title="Estate wallet" sub={`Balance ${naira(balance)}`} />
          <div className="relative h-0">
            <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400">
              <ArrowDown size={14} />
            </div>
          </div>
          <div className="border-t border-slate-200" />
          <Party icon={Landmark} tint="bg-blue-50 text-blue-600" label="To" title={bank.accountName} sub={`${bankName || 'Bank'} · ${bank.accountNumber || ''}`} />
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 divide-y divide-slate-100 text-sm">
          <Row label="Balance after" value={naira(balance - value)} />
          <Row label="Arrives" value="Usually within minutes" />
        </div>

        <div className="mt-4 flex items-start gap-2 text-xs text-slate-500">
          <ShieldCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />
          Sent securely via Paystack to your verified account. Transfers can't be reversed once sent.
        </div>
      </BottomSheet>
    );
  }

  // ── Step 1: amount ──────────────────────────────────────────────────
  return (
    <BottomSheet open={open} onClose={close} title="Withdraw" subtitle="Move money from your wallet to your bank"
      footer={
        <button onClick={() => setStep('review')} disabled={!canContinue} className="btn-primary w-full py-3.5 text-base">
          Continue
        </button>
      }>
      {/* Destination account */}
      <button
        type="button"
        onClick={onChangeBank}
        className="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-colors text-left"
      >
        <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Landmark size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">To</div>
          <div className="text-sm font-semibold text-slate-900 truncate">{bank.accountName}</div>
          <div className="text-xs text-slate-400 truncate">{bankName} · {maskAcct(bank.accountNumber)}</div>
        </div>
        <span className="text-xs font-semibold text-emerald-600 shrink-0">Change</span>
      </button>

      {/* Amount */}
      <div className="text-center pt-7 pb-2">
        <label htmlFor="withdraw-amount" className="text-xs uppercase tracking-widest font-semibold text-slate-400">
          Amount
        </label>
        <div className="flex items-center justify-center mt-2">
          <span className={`text-4xl font-black ${amount ? 'text-slate-900' : 'text-slate-300'}`}>₦</span>
          <input
            id="withdraw-amount"
            ref={inputRef}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={amount ? Number(amount).toLocaleString('en-NG') : ''}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
            className="bg-transparent text-4xl font-black text-slate-900 tracking-tight outline-none text-center placeholder:text-slate-300"
            style={{ width: `${Math.max(2, (amount ? Number(amount).toLocaleString('en-NG') : '0').length + 0.5)}ch` }}
          />
        </div>
        <p className={`text-xs mt-2 h-4 ${error ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
          {error || `Available: ${naira(balance)}`}
        </p>
      </div>

      {/* Quick amounts */}
      {quickAmounts.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {quickAmounts.map(q => (
            <button
              key={q.label}
              type="button"
              onClick={() => setAmount(String(q.value))}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                value === q.value
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'border-slate-200 text-slate-600 hover:border-emerald-200'
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>
      )}
    </BottomSheet>
  );
}

function Party({ icon: Icon, tint, label, title, sub }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tint}`}><Icon size={20} /></div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">{label}</div>
        <div className="text-sm font-semibold text-slate-900 truncate">{title}</div>
        <div className="text-xs text-slate-400 truncate">{sub}</div>
      </div>
    </div>
  );
}

export function Row({ label, value, sub }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="text-slate-400 shrink-0">{label}</span>
      <div className="text-right min-w-0">
        <div className="font-semibold text-slate-900 break-words">{value}</div>
        {sub && <div className="text-xs text-slate-400">{sub}</div>}
      </div>
    </div>
  );
}
