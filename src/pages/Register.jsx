import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Building2, Eye, EyeOff, AlertCircle, ArrowRight, ArrowLeft,
  CheckCircle, MapPin, Check, Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from '../components/auth/AuthLayout';

const STEPS = ['Account', 'Estate', 'Plan', 'Done'];

const PLANS = [
  {
    id: 'starter', slug: 'starter', label: 'Starter',
    sub: 'For small estates',
    monthly: 20000, annual: 192000,
    billingModel: 'flat',
    features: ['Up to 50 residents', '1 security gate', 'Visitor & QR pass management', 'Payment schedules & wallet', 'Guard mobile app'],
  },
  {
    id: 'growth', slug: 'growth', label: 'Growth',
    sub: 'For growing communities',
    monthly: 47000, annual: 451200,
    billingModel: 'flat', badge: 'Most popular',
    features: ['Up to 200 residents', 'Unlimited gates', 'Community chat & marketplace', 'Events & polls', 'Priority email support'],
  },
  {
    id: 'premium', slug: 'premium', label: 'Premium',
    sub: 'For large estates',
    monthly: 80000, annual: 768000,
    billingModel: 'flat',
    features: ['Up to 500 residents', 'Unlimited gates', 'Lounge social feed', 'AI insights & analytics', 'Dedicated support'],
  },
];

const TRIAL_PLAN = {
  id: 'trial', slug: 'growth', label: '14-Day Free Trial',
  isTrial: true, billingModel: 'flat',
  features: ['All Growth plan features', 'Up to 200 residents & unlimited gates', 'No credit card required', 'Cancel or upgrade any time'],
};

/* ── Step indicator ── */
function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
            i === current ? 'text-emerald-600' : i < current ? 'text-emerald-600' : 'text-slate-300'
          }`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
              i === current ? 'border-emerald-500 bg-emerald-50 text-emerald-600' :
              i < current  ? 'border-emerald-500 bg-emerald-50 text-emerald-600' :
              'border-slate-200 text-slate-400'
            }`}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className="hidden sm:block">{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-px transition-colors ${i < current ? 'bg-emerald-300' : 'bg-slate-200'}`}/>
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
        <h2 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">Create your account</h2>
        <p className="text-sm text-slate-500">
          You'll use these credentials to log in to the manager portal.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl p-3 text-sm bg-red-50 border border-red-200 text-red-600">
          <AlertCircle size={15} className="shrink-0"/> {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5 text-slate-400">Full Name</label>
        <input className="input-field" placeholder="John Doe" value={form.name}
          onChange={e => onChange('name', e.target.value)}/>
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5 text-slate-400">Email Address</label>
        <input type="email" className="input-field" placeholder="you@example.com" value={form.email}
          onChange={e => onChange('email', e.target.value)}/>
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5 text-slate-400">Phone (optional)</label>
        <input className="input-field" placeholder="+234…" value={form.phone}
          onChange={e => onChange('phone', e.target.value)}/>
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5 text-slate-400">Password</label>
        <div className="relative">
          <input type={showPw ? 'text' : 'password'} className="input-field pr-11"
            placeholder="Min. 6 characters" value={form.password}
            onChange={e => onChange('password', e.target.value)}/>
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
            {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5 text-slate-400">Confirm Password</label>
        <div className="relative">
          <input type={showConfirm ? 'text' : 'password'} className="input-field pr-11"
            placeholder="Repeat password" value={form.confirm}
            onChange={e => onChange('confirm', e.target.value)}/>
          <button type="button" onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
            {showConfirm ? <EyeOff size={15}/> : <Eye size={15}/>}
          </button>
        </div>
        {form.confirm && form.password !== form.confirm && (
          <p className="text-red-500 text-xs mt-1.5">Passwords do not match</p>
        )}
      </div>

      <button onClick={onNext} disabled={!canNext}
        className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mt-2 transition-all disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: 'white',
          boxShadow: canNext ? '0 0 24px rgba(16,185,129,0.3)' : 'none' }}>
        Continue <ArrowRight size={15}/>
      </button>

      <p className="text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-emerald-600">Sign in</Link>
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
        <h2 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">Set up your estate</h2>
        <p className="text-sm text-slate-500">
          We'll create a unique estate code residents use to join.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5 text-slate-400">Estate Name</label>
        <div className="relative">
          <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input className="input-field pl-9" placeholder="e.g. Greenfield Estate"
            value={form.estateName} onChange={e => onChange('estateName', e.target.value)}/>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5 text-slate-400">Estate Address</label>
        <div className="relative">
          <MapPin size={15} className="absolute left-3.5 top-3.5 text-slate-400"/>
          <textarea className="input-field pl-9 resize-none" rows={3}
            placeholder="Full street address, city, state"
            value={form.estateAddress} onChange={e => onChange('estateAddress', e.target.value)}/>
        </div>
      </div>

      <div className="rounded-xl p-3.5 text-xs flex gap-2.5 items-start bg-slate-50 border border-slate-200 text-slate-500">
        <span className="text-emerald-600 mt-0.5 flex-shrink-0">#</span>
        A unique 6-character estate code will be auto-generated. Share it with residents so they can register.
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200">
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

const fmt = n => '₦' + n.toLocaleString('en-NG');

/* ── Step 2: Plan ── */
function PlanStep({ selected, onSelect, onNext, onBack, loading, billingCycle, onCycleChange }) {
  return (
    <div className="space-y-3">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">Choose your plan</h2>
        <p className="text-sm text-slate-500">Start free, upgrade when you're ready.</p>
      </div>

      {/* Free trial card */}
      <button onClick={() => onSelect(TRIAL_PLAN)}
        className="w-full text-left rounded-xl p-4 transition-all"
        style={{
          border: selected?.id === 'trial' ? '2px solid #10B981' : '2px solid #D1FAE5',
          background: selected?.id === 'trial' ? 'rgba(16,185,129,0.08)' : 'rgba(240,253,244,0.6)',
        }}>
        <div className="flex items-start gap-3">
          <div className="rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
            style={{
              width: 18, height: 18,
              borderColor: selected?.id === 'trial' ? '#10B981' : '#34D399',
              background: selected?.id === 'trial' ? '#10B981' : 'transparent',
            }}>
            {selected?.id === 'trial' && <Check size={10} color="#fff" strokeWidth={3}/>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-emerald-900 text-sm">14-Day Free Trial</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">Recommended</span>
            </div>
            <p className="text-xs text-emerald-700 mb-2.5">Full Growth plan · No credit card required</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              {TRIAL_PLAN.features.map(f => (
                <div key={f} className="flex items-start gap-1.5 text-xs text-emerald-700">
                  <Check size={9} className="text-emerald-500 flex-shrink-0 mt-0.5" strokeWidth={3}/>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200"/>
        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">or choose a paid plan</span>
        <div className="flex-1 h-px bg-slate-200"/>
      </div>

      {/* Billing cycle toggle */}
      <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
        <button onClick={() => onCycleChange('monthly')}
          className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={billingCycle === 'monthly'
            ? { background: '#fff', color: '#0F172A', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
            : { color: '#64748B' }}>
          Monthly
        </button>
        <button onClick={() => onCycleChange('annual')}
          className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
          style={billingCycle === 'annual'
            ? { background: '#fff', color: '#0F172A', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
            : { color: '#64748B' }}>
          Annual
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600">Save 20%</span>
        </button>
      </div>

      {/* Plan cards */}
      <div className="space-y-2">
        {PLANS.map(plan => {
          const isSelected = selected?.id === plan.id;
          const displayPrice = billingCycle === 'annual' ? plan.annual : plan.monthly;
          const periodLabel = billingCycle === 'annual' ? '/year' : '/month';
          const monthlyEquiv = billingCycle === 'annual' ? Math.round(plan.annual / 12) : null;

          return (
            <button key={plan.id} onClick={() => onSelect({ ...plan, cycle: billingCycle })}
              className="w-full text-left rounded-xl border p-3.5 transition-all"
              style={{
                borderColor: isSelected ? '#10B981' : '#E2E8F0',
                background: isSelected ? 'rgba(16,185,129,0.05)' : '#fff',
              }}>
              <div className="flex items-start gap-2.5">
                <div className="rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                  style={{
                    width: 18, height: 18,
                    borderColor: isSelected ? '#10B981' : '#CBD5E1',
                    background: isSelected ? '#10B981' : 'transparent',
                  }}>
                  {isSelected && <Check size={10} color="#fff" strokeWidth={3}/>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-slate-900">{plan.label}</span>
                      {plan.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-slate-900 font-bold text-sm leading-tight">{fmt(displayPrice)}</div>
                      <div className="text-[10px] text-slate-400 leading-tight">{periodLabel}</div>
                      {monthlyEquiv && (
                        <div className="text-[10px] text-emerald-600 font-semibold leading-tight">{fmt(monthlyEquiv)}/mo</div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                    {plan.features.map(f => (
                      <div key={f} className="flex items-start gap-1.5 text-xs text-slate-500">
                        <Check size={9} className="text-emerald-400 flex-shrink-0 mt-0.5" strokeWidth={3}/>
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl p-3 text-xs flex gap-2 items-start bg-slate-50 border border-slate-200 text-slate-500">
        <CheckCircle size={13} className="flex-shrink-0 mt-0.5 text-emerald-500"/>
        All plans include visitor management, QR passes, community chat, announcements, payments, guard app &amp; analytics.
      </div>

      <div className="flex gap-3">
        <button onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 transition-all">
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
            : selected?.isTrial
              ? <>Start Free Trial <ArrowRight size={15}/></>
              : <>Continue <ArrowRight size={15}/></>}
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
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto bg-emerald-50 border border-emerald-200">
        <CheckCircle size={36} className="text-emerald-600"/>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">You're in!</h2>
        <p className="text-sm text-slate-500">
          Your estate is live. Your 14-day trial has started.
        </p>
      </div>

      <div className="rounded-xl p-5 text-left space-y-3 bg-emerald-50 border border-emerald-200">
        {[
          ['Estate', estateName],
          ['Billing', billingLabel],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between">
            <span className="text-sm text-slate-500">{k}</span>
            <span className="text-slate-900 font-semibold text-sm">{v}</span>
          </div>
        ))}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Estate Code</span>
          <button onClick={() => { navigator.clipboard.writeText(estateCode); toast.success('Copied!'); }}
            className="font-mono font-black tracking-widest text-lg text-emerald-600 hover:text-emerald-500 transition-colors"
            title="Click to copy">
            {estateCode}
          </button>
        </div>
        <div className="pt-2 border-t border-emerald-200 text-xs text-slate-500">
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
          className="w-full py-2.5 rounded-xl text-sm font-medium transition-all bg-slate-100 border border-slate-200 text-slate-500 hover:bg-slate-200">
          Skip — Go to Dashboard
        </button>
      </div>
    </div>
  );
}

/* ── Main Register page ── */
export default function Register() {
  const [searchParams]    = useSearchParams();
  const [step, setStep]   = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone]   = useState({ estateName: '', estateCode: '', billingLabel: '' });
  const { register } = useAuth();

  const [account, setAccount] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [estate, setEstate]   = useState({ estateName: '', estateAddress: '' });
  const [billingCycle, setBillingCycle] = useState('monthly');

  // Pre-select plan from ?plan= URL param; default to free trial
  const planParam = searchParams.get('plan');
  const initialPlan = planParam === 'trial'
    ? TRIAL_PLAN
    : (PLANS.find(p => p.id === planParam) || TRIAL_PLAN);
  const [selectedPlan, setSelectedPlan] = useState(initialPlan);

  const setAcct = (k, v) => setAccount(f => ({ ...f, [k]: v }));
  const setEst  = (k, v) => setEstate(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const cycle = selectedPlan.isTrial ? 'monthly' : billingCycle;
      const payload = {
        name: account.name, email: account.email, phone: account.phone,
        password: account.password, role: 'estate_manager',
        estateName: estate.estateName, estateAddress: estate.estateAddress,
        planSlug: selectedPlan.slug,
        billingModel: selectedPlan.billingModel,
        cycle,
      };
      if (selectedPlan.isTrial) payload.trialDays = 14;

      const user = await register(payload);
      const estateCode = user?.estateId?.estateCode || user?.estateId || '—';
      const billingLabel = selectedPlan.isTrial
        ? '14-Day Free Trial (Growth)'
        : `${selectedPlan.label} — ${billingCycle === 'annual'
            ? `${fmt(selectedPlan.annual)}/year`
            : `${fmt(selectedPlan.monthly)}/month`}`;
      setDone({
        estateName: estate.estateName,
        estateCode: typeof estateCode === 'object' ? estateCode.estateCode : estateCode,
        billingLabel,
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
          <div className="text-lg font-bold text-slate-900 leading-tight">
            Area<span style={{ color: '#10B981' }}>Connect</span>
          </div>
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">Admin Portal</div>
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
          onNext={handleSubmit} onBack={() => setStep(1)} loading={loading}
          billingCycle={billingCycle} onCycleChange={setBillingCycle}/>
      )}
      {step === 3 && (
        <DoneStep estateName={done.estateName} estateCode={done.estateCode} billingLabel={done.billingLabel}/>
      )}

      {step === 0 && (
        <p className="text-center text-xs mt-6 text-slate-300">
          By registering you agree to our Terms of Service and Privacy Policy.
        </p>
      )}
      <p className="text-[11px] text-slate-400 text-center mt-4 tracking-wide">
        Powered by <span className="font-semibold text-slate-500">AREA CONNECTOR TECHNOLOGIES</span> · RC&nbsp;9607864
      </p>
    </AuthLayout>
  );
}
