import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { planAPI } from '../api';
import { usePlan } from '../hooks/usePlan';
import toast from 'react-hot-toast';
import {
  Check, X, Zap, RefreshCw, ArrowRight, Crown, Star, Shield,
  Music, MessageSquare, CreditCard, BarChart2, Users, Home,
  Megaphone, ShoppingBag, Sparkles, Headphones, Code2, Palette,
  Phone, CheckCircle,
} from 'lucide-react';

const fmt = (n) => `₦${n.toLocaleString()}`;
const fmtLimit = (n) => n === -1 ? 'Unlimited' : n;

const FEATURE_ROWS = [
  { key: 'maxResidents',        label: 'Residents',               type: 'limit',  icon: Users },
  { key: 'maxUnits',            label: 'Units',                   type: 'limit',  icon: Home },
  { key: 'maxVisitorsPerMonth', label: 'Visitors / month',        type: 'limit',  icon: Users },
  { key: 'announcements',       label: 'Announcements',           icon: Megaphone },
  { key: 'marketplace',         label: 'Marketplace',             icon: ShoppingBag },
  { key: 'securityPortal',      label: 'Security Portal',         icon: Shield },
  { key: 'emergencyBroadcast',  label: 'Emergency Broadcast',     icon: Zap },
  { key: 'communityChat',       label: 'Community Chat',          icon: MessageSquare },
  { key: 'nkechiAI',            label: 'Nkechi AI Moderator',     icon: Sparkles },
  { key: 'paymentSystem',       label: 'Payment System',          icon: CreditCard },
  { key: 'residentLounge',      label: 'Resident Lounge',         icon: Music },
  { key: 'musicPlayer',         label: 'Music Player / Radio',    icon: Music },
  { key: 'fridayNightFunTimes', label: 'Friday Night FunTimes',   icon: Star },
  { key: 'eventBoard',          label: 'Event Board',             icon: Megaphone },
  { key: 'pollsAndVoting',      label: 'Polls & Voting',          icon: BarChart2 },
  { key: 'analytics',           label: 'Analytics',               type: 'tier' },
  { key: 'customBranding',      label: 'Custom Branding',         icon: Palette },
  { key: 'apiAccess',           label: 'API Access',              icon: Code2 },
  { key: 'prioritySupport',     label: 'Priority Support',        icon: Headphones },
];

const GROWTH_FEATURES = [
  'Up to 150 residents',
  'Visitor management & QR passes',
  'Announcements & community chat',
  'Guard mobile app',
  'Payment collection',
  'Resident marketplace',
  'Polls, events & analytics',
  'Resident lounge',
];

function FeatureCell({ value, type }) {
  if (type === 'limit') return <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>{fmtLimit(value)}</span>;
  if (type === 'tier') {
    if (!value || value === 'none') return <X size={14} className="mx-auto" style={{ color: '#CBD5E1' }} />;
    return <span className="text-xs font-semibold text-emerald-500 capitalize">{value}</span>;
  }
  return value
    ? <Check size={15} className="text-emerald-500 mx-auto" />
    : <X size={14} className="mx-auto" style={{ color: '#CBD5E1' }} />;
}

export default function Upgrade() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sub, planName, planColor } = usePlan();
  const [plans, setPlans] = useState([]);
  const [billingModel, setBillingModel] = useState('flat');
  const [cycle, setCycle] = useState('monthly');
  const [residentCount, setResidentCount] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Paystack return
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    if (!ref || !ref.startsWith('PLAN-')) return;

    (async () => {
      setVerifying(true);
      try {
        const { data } = await planAPI.verifyUpgrade(ref);
        if (data.success) {
          toast.success(`Upgraded to ${data.data.planId?.name || 'Growth'}! Refreshing…`);
          setTimeout(() => window.location.replace('/upgrade'), 1800);
        } else {
          toast.error('Payment could not be verified.');
          navigate('/upgrade', { replace: true });
        }
      } catch {
        toast.error('Verification failed. Contact support.');
        navigate('/upgrade', { replace: true });
      } finally {
        setVerifying(false);
      }
    })();
  }, []);

  useEffect(() => {
    planAPI.getPublicPlans()
      .then(({ data }) => setPlans(data.data))
      .catch(() => toast.error('Failed to load plans'))
      .finally(() => setLoading(false));
  }, []);

  const growthPlan = plans.find(p => p.slug === 'growth');
  const isActive = sub?.status === 'active';
  const isTrial = sub?.status === 'trial';
  const currentBillingModel = sub?.billingModel || 'flat';
  const currentCycle = sub?.cycle || 'monthly';

  const priceDisplay = () => {
    if (!growthPlan) return null;
    if (billingModel === 'per_resident') {
      const count = parseInt(residentCount) || 0;
      const monthly = count * (growthPlan.price.perResident || 2000);
      return {
        main: `₦${(growthPlan.price.perResident || 2000).toLocaleString()}`,
        period: '/resident/month',
        total: count > 0 ? `= ₦${monthly.toLocaleString()}/month for ${count} residents` : null,
      };
    }
    if (cycle === 'annual') {
      return {
        main: fmt(growthPlan.price.annual || 400000),
        period: '/year',
        total: `Save ₦${((growthPlan.price.monthly || 50000) * 12 - (growthPlan.price.annual || 400000)).toLocaleString()} vs monthly`,
      };
    }
    return {
      main: fmt(growthPlan.price.monthly || 50000),
      period: '/month',
      total: `or ₦${(growthPlan.price.annual || 400000).toLocaleString()}/year — save 33%`,
    };
  };

  const handleActivate = useCallback(async () => {
    if (!growthPlan) return;
    if (billingModel === 'per_resident' && !parseInt(residentCount)) {
      toast.error('Enter your resident count first');
      return;
    }

    setPaying(true);
    try {
      const { data } = await planAPI.initializeUpgrade({
        planId: growthPlan._id,
        cycle: billingModel === 'per_resident' ? 'monthly' : cycle,
        billingModel,
        residentCount: billingModel === 'per_resident' ? parseInt(residentCount) : undefined,
      });
      if (data.data?.authorizationUrl) {
        window.location.href = data.data.authorizationUrl;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start payment');
    } finally {
      setPaying(false);
    }
  }, [growthPlan, billingModel, cycle, residentCount]);

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-12 text-center">
          <RefreshCw size={36} className="text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="font-bold text-lg" style={{ color: '#0F172A' }}>Confirming your upgrade…</p>
          <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Please wait, do not close this tab.</p>
        </div>
      </div>
    );
  }

  const price = priceDisplay();

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Crown size={22} className="text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-600 uppercase tracking-widest">Subscription</span>
        </div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#0F172A' }}>
          {isActive ? 'Manage your plan' : isTrial ? 'Your trial is active' : 'Activate your subscription'}
        </h1>
        <p className="text-sm" style={{ color: '#94A3B8' }}>
          {isActive
            ? <>On <span className="font-semibold" style={{ color: planColor }}>{planName}</span> · {currentBillingModel === 'per_resident' ? 'Per-resident billing' : currentCycle === 'annual' ? 'Annual billing' : 'Monthly billing'}</>
            : isTrial
            ? 'Choose a billing model and activate when your trial ends.'
            : 'One plan. All features. No hidden fees.'}
        </p>
      </div>

      {/* Trial banner */}
      {isTrial && sub?.trialEndsAt && (
        <div className="max-w-2xl mx-auto rounded-2xl p-4 flex items-center gap-3"
          style={{ background: '#F0FDF4', border: '1px solid rgba(16,185,129,0.25)' }}>
          <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-emerald-700">Free trial active</div>
            <div className="text-xs" style={{ color: '#475569' }}>
              Expires {new Date(sub.trialEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
              Activate before then to keep your estate running.
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><RefreshCw size={24} className="text-emerald-600 animate-spin" /></div>
      ) : (
        <>
          {/* Growth plan card */}
          <div className="max-w-2xl mx-auto">
            <div className="glass-card overflow-hidden" style={{ border: '1px solid rgba(16,185,129,0.2)' }}>
              {/* Card header */}
              <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid #E2E8F0' }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94A3B8' }}>Growth Plan</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}>
                        All features included
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: '#475569' }}>Complete platform for gated communities — no feature limits.</p>
                  </div>
                </div>
              </div>

              {/* Billing model toggle */}
              <div className="px-6 pt-5">
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94A3B8' }}>Billing model</p>
                <div className="grid grid-cols-2 gap-2 mb-5">
                  <button onClick={() => setBillingModel('flat')}
                    className="py-2.5 px-4 rounded-xl text-sm font-semibold transition-all"
                    style={billingModel === 'flat'
                      ? { border: '1px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.08)', color: '#059669' }
                      : { border: '1px solid #E2E8F0', color: '#94A3B8', background: '#FFFFFF' }}>
                    Flat fee
                  </button>
                  <button onClick={() => setBillingModel('per_resident')}
                    className="py-2.5 px-4 rounded-xl text-sm font-semibold transition-all"
                    style={billingModel === 'per_resident'
                      ? { border: '1px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.08)', color: '#059669' }
                      : { border: '1px solid #E2E8F0', color: '#94A3B8', background: '#FFFFFF' }}>
                    Per resident
                  </button>
                </div>

                {billingModel === 'flat' && (
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    {[
                      { label: 'Monthly', value: 'monthly', price: `₦${(growthPlan?.price?.monthly || 50000).toLocaleString()}/mo` },
                      { label: 'Annual', value: 'annual', price: `₦${(growthPlan?.price?.annual || 400000).toLocaleString()}/yr`, badge: 'Save 33%' },
                    ].map(opt => (
                      <button key={opt.value} onClick={() => setCycle(opt.value)}
                        className="py-3 px-4 rounded-xl text-sm font-semibold transition-all text-left"
                        style={cycle === opt.value
                          ? { border: '1px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.08)', color: '#059669' }
                          : { border: '1px solid #E2E8F0', color: '#94A3B8', background: '#FFFFFF' }}>
                        <div className="flex items-center justify-between">
                          <span>{opt.label}</span>
                          {opt.badge && cycle !== opt.value && (
                            <span className="text-[10px] text-emerald-500 font-bold">{opt.badge}</span>
                          )}
                        </div>
                        <div className="text-xs mt-0.5"
                          style={{ color: cycle === opt.value ? '#10B981' : '#94A3B8' }}>{opt.price}</div>
                      </button>
                    ))}
                  </div>
                )}

                {billingModel === 'per_resident' && (
                  <div className="mb-5">
                    <label className="text-xs mb-2 block" style={{ color: '#475569' }}>Number of residents in your estate</label>
                    <input
                      type="number"
                      min="1"
                      max="150"
                      className="input-field"
                      placeholder="e.g. 80"
                      value={residentCount}
                      onChange={e => setResidentCount(e.target.value)}
                    />
                    <p className="text-xs mt-1.5" style={{ color: '#94A3B8' }}>
                      ₦{(growthPlan?.price?.perResident || 2000).toLocaleString()} × {parseInt(residentCount) || 0} residents = ₦{((growthPlan?.price?.perResident || 2000) * (parseInt(residentCount) || 0)).toLocaleString()}/month
                    </p>
                  </div>
                )}

                {/* Price summary */}
                {price && (
                  <div className="rounded-xl p-4 mb-5" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black" style={{ color: '#0F172A' }}>{price.main}</span>
                      <span className="text-sm" style={{ color: '#94A3B8' }}>{price.period}</span>
                    </div>
                    {price.total && <div className="text-emerald-600 text-xs mt-1 font-medium">{price.total}</div>}
                  </div>
                )}
              </div>

              {/* Feature list */}
              <div className="px-6 pb-5">
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94A3B8' }}>Everything included</p>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                  {GROWTH_FEATURES.map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm" style={{ color: '#475569' }}>
                      <Check size={13} className="text-emerald-600 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="px-6 pb-6">
                <button
                  onClick={handleActivate}
                  disabled={paying || isActive}
                  className="w-full py-3.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {paying ? (
                    <><RefreshCw size={16} className="animate-spin" /> Redirecting to payment…</>
                  ) : isActive ? (
                    <><CheckCircle size={16} /> Plan Active</>
                  ) : (
                    <>Activate Growth Plan <ArrowRight size={16} /></>
                  )}
                </button>
                {!isActive && (
                  <p className="text-center text-xs mt-2" style={{ color: '#CBD5E1' }}>
                    Secure payment via Paystack · Cancel anytime
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Enterprise callout */}
          <div className="max-w-2xl mx-auto">
            <div className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Crown size={15} className="text-indigo-500" />
                  <span className="font-bold text-sm" style={{ color: '#0F172A' }}>Enterprise</span>
                </div>
                <p className="text-sm" style={{ color: '#475569' }}>
                  Multiple estates, custom branding, dedicated support, API access, SLA guarantee, and unlimited residents.
                </p>
              </div>
              <a href="mailto:hello@areaconnect.ng"
                className="flex-shrink-0 inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all whitespace-nowrap"
                style={{ border: '1px solid #E2E8F0', color: '#0F172A', background: '#FFFFFF' }}>
                <Phone size={14} /> Contact sales
              </a>
            </div>
          </div>

          {/* Full comparison table */}
          {plans.length > 0 && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-base font-bold mb-4 text-center" style={{ color: '#0F172A' }}>Full feature list</h2>
              <div className="glass-card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <th className="text-left font-medium px-5 py-3" style={{ color: '#94A3B8' }}>Feature</th>
                      {plans.filter(p => p.slug === 'growth').map(p => (
                        <th key={p._id} className="px-4 py-3 text-center font-semibold text-emerald-600">Growth</th>
                      ))}
                      <th className="px-4 py-3 text-center font-semibold text-indigo-500">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FEATURE_ROWS.map(row => {
                      const growth = plans.find(p => p.slug === 'growth');
                      return (
                        <tr key={row.key} className="transition-colors hover:bg-slate-50"
                          style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td className="px-5 py-3 flex items-center gap-2" style={{ color: '#475569' }}>
                            {row.icon && <row.icon size={13} className="flex-shrink-0" style={{ color: '#CBD5E1' }} />}
                            {row.label}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {growth ? <FeatureCell value={growth.features[row.key]} type={row.type} /> : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Check size={15} className="text-indigo-500 mx-auto" />
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="transition-colors hover:bg-slate-50" style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td className="px-5 py-3" style={{ color: '#475569' }}>Multiple estates</td>
                      <td className="px-4 py-3 text-center"><X size={14} className="mx-auto" style={{ color: '#CBD5E1' }} /></td>
                      <td className="px-4 py-3 text-center"><Check size={15} className="text-indigo-500 mx-auto" /></td>
                    </tr>
                    <tr className="transition-colors hover:bg-slate-50" style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td className="px-5 py-3" style={{ color: '#475569' }}>Dedicated support manager</td>
                      <td className="px-4 py-3 text-center"><X size={14} className="mx-auto" style={{ color: '#CBD5E1' }} /></td>
                      <td className="px-4 py-3 text-center"><Check size={15} className="text-indigo-500 mx-auto" /></td>
                    </tr>
                    <tr className="transition-colors hover:bg-slate-50">
                      <td className="px-5 py-3" style={{ color: '#475569' }}>Per-resident pricing</td>
                      <td className="px-4 py-3 text-center"><Check size={15} className="text-emerald-600 mx-auto" /></td>
                      <td className="px-4 py-3 text-center"><Check size={15} className="text-indigo-500 mx-auto" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
