import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Building2, Eye, EyeOff, AlertCircle, ArrowRight, ArrowLeft,
  CheckCircle, MapPin, Check, Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from '../components/auth/AuthLayout';

const STEPS = ['Account', 'Estate', 'Plan', 'Done'];

const BILLING_OPTIONS = [
  {
    id: 'flat_monthly', label: 'Monthly flat fee', price: '₦50,000', period: '/month',
    sub: 'For up to 150 residents', billingModel: 'flat', cycle: 'monthly', highlight: false,
  },
  {
    id: 'flat_annual', label: 'Annual flat fee', price: '₦400,000', period: '/year',
    sub: 'Save ₦200,000 vs monthly', billingModel: 'flat', cycle: 'annual',
    highlight: true, badge: 'Best value',
  },
  {
    id: 'per_resident', label: 'Per-resident', price: '₦2,000', period: '/resident/month',
    sub: 'Ideal for smaller or growing estates', billingModel: 'per_resident', cycle: 'monthly', highlight: false,
  },
];

/* ── Step indicator ── */
function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
            i === current ? 'text-emerald-400' : i < current ? 'text-emerald-400' : 'text-white/25'
          }`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
              i === current ? 'border-emerald-400 bg-emerald-400/15 text-emerald-400' :
              i < current  ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400' :
              'border-white/20 text-white/25'
            }`}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className="hidden sm:block">{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-px transition-colors ${i < current ? 'bg-emerald-400/40' : 'bg-white/10'}`}/>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Step 0: Account ── */
function AccountStep({ form, onChange, onNext, error }) {
  const [showPw, setShowPw]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const canNext = form.name.trim() && form.email.trim() &&
    form.password.length >= 6 && form.password === form.confirm;

  return (
    <div className="space-y-4">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">Create your account</h2>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          You'll use these credentials to log in to the manager portal.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl p-3 text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
          <AlertCircle size={15} className="shrink-0"/> {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
          style={{ color: 'rgba(255,255,255,0.38)' }}>Full Name</label>
        <input className="input-field" placeholder="John Doe" value={form.name}
          onChange={e => onChange('name', e.target.value)}/>
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
          style={{ color: 'rgba(255,255,255,0.38)' }}>Email Address</label>
        <input type="email" className="input-field" placeholder="you@example.com" value={form.email}
          onChange={e => onChange('email', e.target.value)}/>
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
          style={{ color: 'rgba(255,255,255,0.38)' }}>Phone (optional)</label>
        <input className="input-field" placeholder="+234…" value={form.phone}
          onChange={e => onChange('phone', e.target.value)}/>
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
          style={{ color: 'rgba(255,255,255,0.38)' }}>Password</label>
        <div className="relative">
          <input type={showPw ? 'text' : 'password'} className="input-field pr-11"
            placeholder="Min. 6 characters" value={form.password}
            onChange={e => onChange('password', e.target.value)}/>
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/65 transition-colors">
            {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
          style={{ color: 'rgba(255,255,255,0.38)' }}>Confirm Password</label>
        <div className="relative">
          <input type={showConfirm ? 'text' : 'password'} className="input-field pr-11"
            placeholder="Repeat password" value={form.confirm}
            onChange={e => onChange('confirm', e.target.value)}/>
          <button type="button" onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/65 transition-colors">
            {showConfirm ? <EyeOff size={15}/> : <Eye size={15}/>}
          </button>
        </div>
        {form.confirm && form.password !== form.confirm && (
          <p className="text-red-400 text-xs mt-1.5">Passwords do not match</p>
        )}
      </div>

      <button onClick={onNext} disabled={!canNext}
        className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mt-2 transition-all disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: 'white',
          boxShadow: canNext ? '0 0 24px rgba(16,185,129,0.3)' : 'none' }}>
        Continue <ArrowRight size={15}/>
      </button>

      <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
        Already have an account?{' '}
        <Link to="/login" className="font-medium" style={{ color: '#10B981' }}>Sign in</Link>
      </p>
    </div>
  );
}

/* ── Step 1: Estate ── */
function EstateStep({ form, onChange, onNext, onBack }) {
  const canNext = form.estateName.trim() && form.estateAddress.trim();

  return (
    <div className="space-y-4">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">Set up your estate</h2>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          We'll create a unique estate code residents use to join.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
          style={{ color: 'rgba(255,255,255,0.38)' }}>Estate Name</label>
        <div className="relative">
          <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"/>
          <input className="input-field pl-9" placeholder="e.g. Greenfield Estate"
            value={form.estateName} onChange={e => onChange('estateName', e.target.value)}/>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
          style={{ color: 'rgba(255,255,255,0.38)' }}>Estate Address</label>
        <div className="relative">
          <MapPin size={15} className="absolute left-3.5 top-3.5 text-white/30"/>
          <textarea className="input-field pl-9 resize-none" rows={3}
            placeholder="Full street address, city, state"
            value={form.estateAddress} onChange={e => onChange('estateAddress', e.target.value)}/>
        </div>
      </div>

      <div className="rounded-xl p-3.5 text-xs flex gap-2.5 items-start"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}>
        <span style={{ color: '#D4AF70' }} className="mt-0.5 flex-shrink-0">#</span>
        A unique 6-character estate code will be auto-generated. Share it with residents so they can register.
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
          <ArrowLeft size={14}/> Back
        </button>
        <button onClick={onNext} disabled={!canNext}
          className="flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: 'white',
            boxShadow: canNext ? '0 0 20px rgba(16,185,129,0.25)' : 'none' }}>
          Continue <ArrowRight size={15}/>
        </button>
      </div>
    </div>
  );
}

/* ── Step 2: Plan ── */
function PlanStep({ selected, onSelect, onNext, onBack, loading }) {
  return (
    <div className="space-y-4">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">Choose your billing</h2>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Start with a <span style={{ color: '#D4AF70', fontWeight: 600 }}>14-day free trial</span> — no payment now.
        </p>
      </div>

      <div className="space-y-2.5">
        {BILLING_OPTIONS.map(opt => (
          <button key={opt.id} onClick={() => onSelect(opt)}
            className="w-full text-left rounded-xl border p-4 transition-all"
            style={{
              border: selected?.id === opt.id
                ? '1px solid rgba(212,175,112,0.5)'
                : '1px solid rgba(255,255,255,0.08)',
              background: selected?.id === opt.id
                ? 'rgba(212,175,112,0.06)'
                : 'rgba(255,255,255,0.02)',
            }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all`}
                  style={{
                    borderColor: selected?.id === opt.id ? '#D4AF70' : 'rgba(255,255,255,0.2)',
                    background:  selected?.id === opt.id ? '#D4AF70' : 'transparent',
                  }}>
                  {selected?.id === opt.id && <Check size={11} color="#040912" strokeWidth={3}/>}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold text-sm">{opt.label}</span>
                    {opt.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(212,175,112,0.15)', color: '#D4AF70', border: '1px solid rgba(212,175,112,0.3)' }}>
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>{opt.sub}</div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-white font-bold">{opt.price}</span>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.38)' }}> {opt.period}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-xl p-3.5 text-xs flex gap-2.5 items-start"
        style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)', color: 'rgba(110,231,183,0.85)' }}>
        <CheckCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#10B981' }}/>
        All plans include: visitor management, QR passes, community chat, announcements, payments, guard app, and analytics.
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
          <ArrowLeft size={14}/> Back
        </button>
        <button onClick={onNext} disabled={!selected || loading}
          className="flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: 'white',
            boxShadow: selected ? '0 0 20px rgba(16,185,129,0.25)' : 'none' }}>
          {loading
            ? <><svg className="animate-spin" width={14} height={14} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity=".3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg> Creating estate…</>
            : <>Start Free Trial <ArrowRight size={15}/></>}
        </button>
      </div>
    </div>
  );
}

/* ── Step 3: Done ── */
function DoneStep({ estateName, estateCode, billingLabel }) {
  const navigate = useNavigate();
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto"
        style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <CheckCircle size={36} style={{ color: '#10B981' }}/>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">You're in!</h2>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Your estate is live. Your 14-day trial has started.
        </p>
      </div>

      <div className="rounded-xl p-5 text-left space-y-3"
        style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
        {[
          ['Estate', estateName],
          ['Billing', billingLabel],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>{k}</span>
            <span className="text-white font-semibold text-sm">{v}</span>
          </div>
        ))}
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Estate Code</span>
          <button onClick={() => { navigator.clipboard.writeText(estateCode); toast.success('Copied!'); }}
            className="font-mono font-black tracking-widest text-lg hover:opacity-75 transition-opacity"
            style={{ color: '#D4AF70' }} title="Click to copy">
            {estateCode}
          </button>
        </div>
        <div className="pt-2 border-t text-xs" style={{ borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(212,175,112,0.65)' }}>
          Share the estate code with residents so they can register on the resident app.
        </div>
      </div>

      <div className="space-y-2.5">
        <button onClick={() => navigate('/onboarding')}
          className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: 'white',
            boxShadow: '0 0 24px rgba(16,185,129,0.3)' }}>
          Set Up Estate <ArrowRight size={15}/>
        </button>
        <button onClick={() => navigate('/dashboard')}
          className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.55)' }}>
          Skip — Go to Dashboard
        </button>
      </div>
    </div>
  );
}

/* ── Main Register page ── */
export default function Register() {
  const [step, setStep]   = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone]   = useState({ estateName: '', estateCode: '', billingLabel: '' });
  const { register } = useAuth();

  const [account, setAccount]   = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [estate, setEstate]     = useState({ estateName: '', estateAddress: '' });
  const [selectedPlan, setSelectedPlan] = useState(BILLING_OPTIONS[0]);

  const setAcct = (k, v) => setAccount(f => ({ ...f, [k]: v }));
  const setEst  = (k, v) => setEstate(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await register({
        name: account.name, email: account.email, phone: account.phone,
        password: account.password, role: 'estate_manager',
        estateName: estate.estateName, estateAddress: estate.estateAddress,
        billingModel: selectedPlan.billingModel, cycle: selectedPlan.cycle,
      });
      const estateCode = user?.estateId?.estateCode || user?.estateId || '—';
      setDone({
        estateName: estate.estateName,
        estateCode: typeof estateCode === 'object' ? estateCode.estateCode : estateCode,
        billingLabel: selectedPlan.label,
      });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const CAPTION_SUBS = [
    'Create your admin account to manage residents, visitors, payments, and more.',
    "Tell us about your estate — we'll generate a unique code for residents to join.",
    'Start free for 14 days. No credit card required.',
    'Welcome to AreaConnect. Set up your estate profile to get started.',
  ];
  const CAPTION_HEADS = [
    ['Your estate awaits.', "Let's get you started."],
    ['One platform.', 'Every corner of your estate.'],
    ['Smart pricing', 'for every estate size.'],
    ['The gate is open.', 'Your estate is live.'],
  ];
  const [head, green] = CAPTION_HEADS[step];
  const caption = <>{head}<br/><span style={{ color: '#10B981' }}>{green}</span></>;
  const sub = CAPTION_SUBS[step];

  return (
    <AuthLayout caption={caption} sub={sub}>
      {/* Logo row */}
      <div className="flex items-center gap-3 mb-7">
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: 'linear-gradient(135deg,#10B981,#059669)',
          boxShadow: '0 0 22px rgba(16,185,129,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Shield size={20} color="white"/>
        </div>
        <div>
          <div className="text-lg font-bold text-white leading-tight">
            Area<span style={{ color: '#10B981' }}>Connect</span>
          </div>
          <div className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.3)' }}>Admin Portal</div>
        </div>
      </div>

      {step < 3 && <StepIndicator current={step}/>}

      {step === 0 && (
        <AccountStep form={account} onChange={setAcct}
          onNext={() => { setError(''); setStep(1); }} error={error}/>
      )}
      {step === 1 && (
        <EstateStep form={estate} onChange={setEst}
          onNext={() => setStep(2)} onBack={() => setStep(0)}/>
      )}
      {step === 2 && (
        <PlanStep selected={selectedPlan} onSelect={setSelectedPlan}
          onNext={handleSubmit} onBack={() => setStep(1)} loading={loading}/>
      )}
      {step === 3 && (
        <DoneStep estateName={done.estateName} estateCode={done.estateCode} billingLabel={done.billingLabel}/>
      )}

      {step === 0 && (
        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.18)' }}>
          By registering you agree to our Terms of Service and Privacy Policy.
        </p>
      )}
    </AuthLayout>
  );
}
