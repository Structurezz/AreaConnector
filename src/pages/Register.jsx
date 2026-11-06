import AddressAutocomplete from '../components/ui/AddressAutocomplete';
import { createContext, useContext, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Building2, Eye, EyeOff, AlertCircle, ArrowRight, ArrowLeft,
  CheckCircle, MapPin, Check, Shield, Hash, Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MobileAuthShell, DesktopAuthShell } from '../components/auth/AuthShell';
import SiteTypePicker from '../components/site/SiteTypePicker';
import { TERMS, SITE_TYPES } from '../utils/siteTypes';

const TYPE_EXAMPLE = { school: 'Kings College', university: 'University of Lagos', hotel: 'Harbour View Hotel', industrial: 'Apapa Industrial Park', hospital: 'St. Mary’s Hospital' };

// Same frame as the login page (components/auth/AuthShell). The steps render
// on both the dark phone card and the light desktop panel, so they use the
// theme-aware `ax-*` classes and pick their input style from this context.
const Ui = createContext({ input: 'dl-input', dark: false });

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

const fmt = n => '₦' + n.toLocaleString('en-NG');

const Spinner = () => (
  <svg className="animate-spin" width={15} height={15} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity=".3"/>
    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

// A <label> wrapping the input links them (tap the label → focus the field).
// `group` = a set of buttons (e.g. the site-type picker), which must not be
// inside a label.
function Field({ label, children, group = false }) {
  if (group) return <div role="group" aria-label={label}><span className="ax-label block">{label}</span>{children}</div>;
  return <label className="block"><span className="ax-label block">{label}</span>{children}</label>;
}

function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div className="ax-error flex items-start gap-2 rounded-lg px-3.5 py-3 text-[13px]">
      <AlertCircle size={15} className="shrink-0 mt-0.5"/> {error}
    </div>
  );
}

function Heading({ title, sub }) {
  return (
    <div className="mb-6">
      <div className="ax-title">{title}</div>
      <p className="ax-sub mt-1.5">{sub}</p>
    </div>
  );
}

/* ── Step indicator: progress bar + labels ── */
function StepIndicator({ current }) {
  return (
    <div className="mb-7">
      <div className="flex gap-1.5">
        {STEPS.slice(0, 3).map((_, i) => (
          <span key={i} className="ax-line flex-1 h-1.5 rounded-full overflow-hidden">
            <span className="block h-full rounded-full transition-all duration-500"
              style={{ width: i < current ? '100%' : i === current ? '50%' : '0%', background: 'linear-gradient(90deg,#10B981,#059669)' }}/>
          </span>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11.5px] font-medium">
        {STEPS.slice(0, 3).map((label, i) => (
          <span key={label} className={i <= current ? 'ax-link' : 'ax-faint'}>
            {i < current ? '✓ ' : `${i + 1}. `}{label}
          </span>
        ))}
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, autoComplete }) {
  const { input, dark } = useContext(Ui);
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} className={input} style={{ paddingRight: 44 }}
        placeholder={placeholder} value={value} onChange={onChange} autoComplete={autoComplete}/>
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
        style={{ color: dark ? 'rgba(255,255,255,0.4)' : '#98A2B3' }}>
        {show ? <EyeOff size={16}/> : <Eye size={16}/>}
      </button>
    </div>
  );
}

/* ── Step 0: Account ── */
function AccountStep({ form, onChange, onNext, error }) {
  const { input } = useContext(Ui);
  const canNext = form.name.trim() && form.email.trim() &&
    form.password.length >= 6 && form.password === form.confirm;

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (canNext) onNext(); }} className="space-y-4">
      <Heading title="Create your account" sub="You'll use these details to sign in to the manager portal."/>
      <ErrorBox error={error}/>

      <Field label="Full name">
        <input className={input} placeholder="John Doe" value={form.name} autoComplete="name"
          onChange={e => onChange('name', e.target.value)}/>
      </Field>
      <Field label="Email">
        <input type="email" className={input} placeholder="you@estate.com" value={form.email} autoComplete="email"
          onChange={e => onChange('email', e.target.value)}/>
      </Field>
      <Field label="Phone (optional)">
        <input className={input} type="tel" inputMode="tel" placeholder="+234…" value={form.phone} autoComplete="tel"
          onChange={e => onChange('phone', e.target.value)}/>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Password">
          <PasswordInput placeholder="Min. 6 characters" value={form.password} autoComplete="new-password"
            onChange={e => onChange('password', e.target.value)}/>
        </Field>
        <Field label="Confirm password">
          <PasswordInput placeholder="Repeat password" value={form.confirm} autoComplete="new-password"
            onChange={e => onChange('confirm', e.target.value)}/>
        </Field>
      </div>
      {form.confirm && form.password !== form.confirm && (
        <p className="text-[12px] -mt-2" style={{ color: '#F04438' }}>Passwords do not match</p>
      )}

      <button type="submit" disabled={!canNext} className="ax-btn mt-2">
        Continue <ArrowRight size={16}/>
      </button>
    </form>
  );
}

/* ── Step 1: Estate (or campus / property / site / hospital) ── */
function EstateStep({ form, onChange, onNext, onBack }) {
  const { input, dark } = useContext(Ui);
  const canNext = form.estateName.trim() && form.estateAddress.trim();
  const type = form.siteType || 'estate';
  const isEstate = type === 'estate';
  const word = TERMS[type].site; // Estate / Campus / Property / Site / Hospital
  const members = TERMS[type].members.toLowerCase();
  const iconColor = dark ? 'rgba(255,255,255,0.35)' : '#98A2B3';

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (canNext) onNext(); }} className="space-y-4">
      <Heading title={`Set up your ${word.toLowerCase()}`}
        sub={isEstate ? "We'll create a unique estate code residents use to join." : `We'll create a unique code your ${members} use to join.`}/>

      <Field label="What are you managing?" group>
        <SiteTypePicker variant="compact" dark={dark} value={type} onChange={v => onChange('siteType', v)} />
      </Field>
      <Field label={`${word} name`}>
        <div className="relative">
          <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: iconColor }}/>
          <input className={input} style={{ paddingLeft: 38 }} placeholder={isEstate ? 'e.g. Greenfield Estate' : `e.g. ${TYPE_EXAMPLE[type]}`}
            value={form.estateName} onChange={e => onChange('estateName', e.target.value)}/>
        </div>
      </Field>
      <Field label={`${word} address`}>
        <div className="relative">
          <MapPin size={15} className="absolute left-3.5 top-3.5" style={{ color: iconColor }}/>
          <AddressAutocomplete as="textarea" className={`${input} resize-none`} rows={3} style={{ paddingLeft: 38, paddingTop: 11, height: 'auto' }}
            placeholder="Start typing the address — pick a suggestion"
            value={form.estateAddress} onChange={(v) => onChange('estateAddress', v)}
            onSelect={(p) => onChange('estateLocation', p.lat != null ? { lat: p.lat, lng: p.lng, formattedAddress: p.address, placeId: p.placeId } : null)}/>
        </div>
      </Field>

      <div className="ax-panel-soft rounded-xl px-3.5 py-3 flex gap-3 items-start text-[12.5px]">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.14)', color: '#10B981' }}><Hash size={14}/></span>
        <span className="ax-muted leading-relaxed">
          {isEstate
            ? 'A unique 6-character estate code is generated for you. Share it with residents so they can join.'
            : `A unique 6-character code is generated for you. Share it with your ${members} so they can join.`}
        </span>
      </div>

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onBack} className="ax-ghost"><ArrowLeft size={15}/> Back</button>
        <button type="submit" disabled={!canNext} className="ax-btn flex-1">Continue <ArrowRight size={16}/></button>
      </div>
    </form>
  );
}

function Radio({ on }) {
  return (
    <span className="rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
      style={{ width: 18, height: 18, borderColor: on ? '#10B981' : '#98A2B3', background: on ? '#10B981' : 'transparent' }}>
      {on && <Check size={10} color="#fff" strokeWidth={3}/>}
    </span>
  );
}

/* ── Step 2: Plan ── */
function PlanStep({ selected, onSelect, onNext, onBack, loading, billingCycle, onCycleChange, error }) {
  const trialOn = selected?.id === 'trial';
  return (
    <div className="space-y-3.5">
      <Heading title="Choose your plan" sub="Start free for 14 days, upgrade when you're ready."/>
      <ErrorBox error={error}/>

      {/* Free trial */}
      <button type="button" onClick={() => onSelect(TRIAL_PLAN)}
        className={`ax-panel w-full text-left rounded-xl p-4 transition-all ${trialOn ? 'ax-panel-on' : ''}`}>
        <div className="flex items-start gap-3">
          <Radio on={trialOn}/>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="ax-strong font-semibold text-[14px]">14-day free trial</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#059669' }}>Recommended</span>
            </div>
            <p className="ax-muted text-[12.5px] mb-2.5">Full Growth plan · No credit card required</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              {TRIAL_PLAN.features.map(f => (
                <div key={f} className="ax-muted flex items-start gap-1.5 text-[12px]">
                  <Check size={11} className="flex-shrink-0 mt-0.5" style={{ color: '#10B981' }} strokeWidth={3}/>{f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </button>

      <div className="flex items-center gap-3">
        <span className="ax-line flex-1 h-px"/>
        <span className="ax-faint text-[11.5px] font-medium whitespace-nowrap">or choose a paid plan</span>
        <span className="ax-line flex-1 h-px"/>
      </div>

      {/* Billing cycle */}
      <div className="ax-seg flex items-center p-1 rounded-xl">
        {[['monthly', 'Monthly'], ['annual', 'Annual']].map(([id, label]) => (
          <button key={id} type="button" onClick={() => onCycleChange(id)}
            className={`flex-1 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all flex items-center justify-center gap-1.5 ${billingCycle === id ? 'ax-seg-on' : 'ax-seg-off'}`}>
            {label}
            {id === 'annual' && <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>Save 20%</span>}
          </button>
        ))}
      </div>

      {/* Plans */}
      <div className="space-y-2">
        {PLANS.map(plan => {
          const on = selected?.id === plan.id;
          const price = billingCycle === 'annual' ? plan.annual : plan.monthly;
          return (
            <button key={plan.id} type="button" onClick={() => onSelect({ ...plan, cycle: billingCycle })}
              className={`ax-panel w-full text-left rounded-xl p-3.5 transition-all ${on ? 'ax-panel-on' : ''}`}>
              <div className="flex items-start gap-2.5">
                <Radio on={on}/>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="ax-strong font-semibold text-[14px]">{plan.label}</span>
                      {plan.badge && <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.14)', color: '#10B981' }}>{plan.badge}</span>}
                    </div>
                    <div className="text-right flex-shrink-0 leading-tight">
                      <div className="ax-strong font-semibold text-[14px]">{fmt(price)}</div>
                      <div className="ax-faint text-[10.5px]">{billingCycle === 'annual' ? '/year' : '/month'}</div>
                      {billingCycle === 'annual' && <div className="text-[10.5px] font-semibold" style={{ color: '#10B981' }}>{fmt(Math.round(plan.annual / 12))}/mo</div>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                    {plan.features.map(f => (
                      <div key={f} className="ax-muted flex items-start gap-1.5 text-[11.5px]">
                        <Check size={10} className="flex-shrink-0 mt-0.5" style={{ color: '#10B981' }} strokeWidth={3}/>{f}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="ax-faint text-[11.5px] flex gap-1.5 items-start">
        <CheckCircle size={13} className="flex-shrink-0 mt-px" style={{ color: '#10B981' }}/>
        Every plan includes visitor management, QR passes, chat, announcements, payments, the guard app and analytics.
      </p>

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onBack} className="ax-ghost"><ArrowLeft size={15}/> Back</button>
        <button type="button" onClick={onNext} disabled={!selected || loading} className="ax-btn flex-1">
          {loading ? <><Spinner/> Creating…</> : selected?.isTrial ? <>Start free trial <ArrowRight size={16}/></> : <>Continue <ArrowRight size={16}/></>}
        </button>
      </div>
    </div>
  );
}

/* ── Step 3: Done ── */
const clearSignupDone = () => { try { sessionStorage.removeItem('ac:signupDone'); } catch { /* storage off */ } };

function DoneStep({ estateName, estateCode, billingLabel, siteType }) {
  const navigate = useNavigate();
  const type = siteType || 'estate';
  const word = TERMS[type].site;
  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#10B981,#059669)', boxShadow: '0 10px 30px -10px rgba(16,185,129,.6)' }}>
          <CheckCircle size={30} color="#fff"/>
        </span>
        <div className="ax-title mt-5">You're in!</div>
        <p className="ax-sub mt-1.5">Your {word.toLowerCase()} is live and your 14-day trial has started.</p>
      </div>

      <div className="ax-panel-soft rounded-xl p-4 space-y-3 text-[13.5px]">
        {[[word, estateName], ['Billing', billingLabel]].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3">
            <span className="ax-muted">{k}</span>
            <span className="ax-strong font-semibold text-right">{v}</span>
          </div>
        ))}
        <div className="flex items-center justify-between">
          <span className="ax-muted">{word} code</span>
          <button type="button" onClick={() => { navigator.clipboard.writeText(estateCode); toast.success('Copied!'); }}
            className="flex items-center gap-1.5 font-mono font-bold tracking-[0.2em] text-[17px]" style={{ color: '#10B981' }} title="Copy">
            {estateCode} <Copy size={13}/>
          </button>
        </div>
        <p className="ax-faint text-[12px] pt-2" style={{ borderTop: '1px solid rgba(127,127,127,0.18)' }}>
          Share the code with your {TERMS[type].members.toLowerCase()} so they can join on AreaMates.
        </p>
      </div>

      <div className="space-y-2.5">
        <button type="button" onClick={() => { clearSignupDone(); navigate('/onboarding'); }} className="ax-btn">Set up {word.toLowerCase()} <ArrowRight size={16}/></button>
        <button type="button" onClick={() => { clearSignupDone(); navigate('/dashboard'); }} className="ax-ghost w-full">Skip — go to dashboard</button>
      </div>
    </div>
  );
}

const SHOWCASE = [
  [<>Your estate awaits. <span style={{ color: '#34D399' }}>Let's get you started.</span></>, 'Create your admin account to manage residents, visitors, payments and more.'],
  [<>One platform. <span style={{ color: '#34D399' }}>Every corner of your estate.</span></>, "Tell us what you manage — we'll generate a unique code for people to join."],
  [<>Smart pricing <span style={{ color: '#34D399' }}>for every estate size.</span></>, 'Start free for 14 days. No credit card required.'],
  [<>The gate is open. <span style={{ color: '#34D399' }}>You're live.</span></>, 'Welcome to AreaConnect. Set up your profile to get started.'],
];

/* ── Main Register page ── */
export default function Register() {
  const [searchParams]    = useSearchParams();
  const [step, setStep]   = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone]   = useState({ estateName: '', estateCode: '', billingLabel: '' });
  const { register } = useAuth();

  // Admin invitations arrive with the manager's details pre-filled
  const [account, setAccount] = useState({
    name: searchParams.get('name') || '', email: searchParams.get('email') || '',
    phone: searchParams.get('phone') || '', password: '', confirm: '',
  });
  const [estate, setEstate]   = useState({ estateName: searchParams.get('estate') || '', estateAddress: searchParams.get('address') || '', siteType: SITE_TYPES.includes(searchParams.get('type')) ? searchParams.get('type') : 'estate' });
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
        estateLocation: estate.estateLocation?.formattedAddress === estate.estateAddress ? estate.estateLocation : undefined,
        siteType: estate.siteType || 'estate',
        planSlug: selectedPlan.slug,
        billingModel: selectedPlan.billingModel,
        cycle,
      };
      if (searchParams.get('invite')) payload.inviteToken = searchParams.get('invite');
      if (selectedPlan.isTrial) payload.trialDays = 14;

      // Keep this page (not the dashboard redirect) so the "You're in" step
      // with the estate code shows — App.jsx checks this flag
      try { sessionStorage.setItem('ac:signupDone', '1'); } catch { /* storage off */ }
      const user = await register(payload);
      const estateCode = user?.estate?.estateCode || user?.estateId?.estateCode || '—';
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
      clearSignupDone();
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = (
    <>
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
          onNext={handleSubmit} onBack={() => setStep(1)} loading={loading} error={error}
          billingCycle={billingCycle} onCycleChange={setBillingCycle}/>
      )}
      {step === 3 && (
        <DoneStep estateName={done.estateName} estateCode={done.estateCode} billingLabel={done.billingLabel} siteType={estate.siteType}/>
      )}
      {step === 0 && (
        <p className="ax-faint text-center text-[11.5px] mt-5">By registering you agree to our Terms of Service and Privacy Policy.</p>
      )}
    </>
  );

  const [headline, sub] = SHOWCASE[step];

  return (
    <>
      {/* ── Mobile ── */}
      <div className="lg:hidden">
        <Ui.Provider value={{ input: 'mg-input', dark: true }}>
          <MobileAuthShell>
            {steps}
            {step < 3 && (
              <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: '#10B981', fontWeight: 600 }}>Sign in</Link>
              </p>
            )}
          </MobileAuthShell>
        </Ui.Provider>
      </div>

      {/* ── Desktop ── */}
      <div className="hidden lg:block">
        <Ui.Provider value={{ input: 'dl-input', dark: false }}>
          <DesktopAuthShell width={step === 2 ? 460 : 400} headline={headline} sub={sub}
            topRight={<>Already have an account?&nbsp;<Link to="/login" className="font-semibold text-[#059669] hover:text-[#047857]">Sign in</Link></>}>
            {step < 3 && (
              <span className="w-12 h-12 rounded-xl bg-[#ECFDF3] border border-[#ABEFC6] flex items-center justify-center text-[#059669] mb-6"><Shield size={22} /></span>
            )}
            {steps}
          </DesktopAuthShell>
        </Ui.Provider>
      </div>
    </>
  );
}
