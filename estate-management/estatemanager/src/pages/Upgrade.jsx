import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { planAPI } from '../api';
import { usePlan } from '../hooks/usePlan';
import toast from 'react-hot-toast';
import {
  Check, X, Zap, RefreshCw, ArrowRight, Crown, Star, Shield,
  Music, MessageSquare, CreditCard, BarChart2, Users, Home,
  Megaphone, ShoppingBag, Sparkles, Headphones, Code2, Palette,
  Phone, CheckCircle, Infinity,
} from 'lucide-react';

const fmt     = (n) => `₦${n.toLocaleString()}`;
const fmtLim  = (n) => (n === -1 ? 'Unlimited' : n?.toLocaleString() ?? '—');

// Map plan feature keys → human label + icon (matches admin FEATURE_GROUPS exactly)
const FEATURE_META = {
  maxResidents:        { label: 'Max residents',           icon: Users,        type: 'limit'  },
  maxUnits:            { label: 'Max units',               icon: Home,         type: 'limit'  },
  maxVisitorsPerMonth: { label: 'Visitors / month',        icon: Users,        type: 'limit'  },
  visitorManagement:   { label: 'Visitor management',      icon: Users                        },
  residentManagement:  { label: 'Resident management',     icon: Users                        },
  unitManagement:      { label: 'Unit management',         icon: Home                         },
  announcements:       { label: 'Announcements',           icon: Megaphone                    },
  communityChat:       { label: 'Community chat',          icon: MessageSquare                },
  nkechiAI:            { label: 'Nkechi AI moderator',     icon: Sparkles                     },
  marketplace:         { label: 'Marketplace',             icon: ShoppingBag                  },
  paymentSystem:       { label: 'Payment system',          icon: CreditCard                   },
  securityPortal:      { label: 'Security portal',         icon: Shield                       },
  emergencyBroadcast:  { label: 'Emergency broadcast',     icon: Zap                          },
  residentLounge:      { label: 'Resident lounge',         icon: Music                        },
  musicPlayer:         { label: 'Music player / radio',    icon: Music                        },
  fridayNightFunTimes: { label: 'Friday night FunTimes',   icon: Star                         },
  eventBoard:          { label: 'Event board',             icon: Megaphone                    },
  pollsAndVoting:      { label: 'Polls & voting',          icon: BarChart2                    },
  analytics:           { label: 'Analytics',               icon: BarChart2,    type: 'tier'   },
  customBranding:      { label: 'Custom branding',         icon: Palette                      },
  apiAccess:           { label: 'API access',              icon: Code2                        },
  prioritySupport:     { label: 'Priority support',        icon: Headphones                   },
  whiteLabel:          { label: 'White label',             icon: Star                         },
};

// Ordered list used in the comparison table (same order as admin)
const FEATURE_KEYS = Object.keys(FEATURE_META);

// Derive a plain-English bullet list from a plan's features object
function getBullets(features = {}) {
  const bullets = [];
  if (features.maxResidents != null)
    bullets.push(`Up to ${fmtLim(features.maxResidents)} residents`);
  if (features.maxUnits != null)
    bullets.push(`Up to ${fmtLim(features.maxUnits)} units`);
  if (features.maxVisitorsPerMonth != null)
    bullets.push(`${fmtLim(features.maxVisitorsPerMonth)} visitor passes/month`);
  if (features.visitorManagement)    bullets.push('Visitor management & QR passes');
  if (features.announcements)        bullets.push('Announcements');
  if (features.communityChat)        bullets.push('Community chat');
  if (features.securityPortal)       bullets.push('Security portal & guard app');
  if (features.emergencyBroadcast)   bullets.push('Emergency broadcast');
  if (features.paymentSystem)        bullets.push('Payment collection');
  if (features.marketplace)          bullets.push('Resident marketplace');
  if (features.residentLounge)       bullets.push('Resident lounge');
  if (features.musicPlayer)          bullets.push('Music player / radio');
  if (features.eventBoard)           bullets.push('Event board');
  if (features.pollsAndVoting)       bullets.push('Polls & voting');
  if (features.nkechiAI)             bullets.push('Nkechi AI moderator');
  if (features.analytics && features.analytics !== 'none')
    bullets.push(`Analytics (${features.analytics})`);
  if (features.customBranding)       bullets.push('Custom branding');
  if (features.apiAccess)            bullets.push('API access');
  if (features.prioritySupport)      bullets.push('Priority support');
  return bullets;
}

// Render a single cell value in the comparison table
function FeatureCell({ value, type }) {
  if (type === 'limit') {
    return <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>{fmtLim(value)}</span>;
  }
  if (type === 'tier') {
    if (!value || value === 'none')
      return <X size={14} className="mx-auto" style={{ color: '#CBD5E1' }} />;
    return <span className="text-xs font-semibold text-emerald-500 capitalize">{value}</span>;
  }
  return value
    ? <Check size={15} className="text-emerald-500 mx-auto" />
    : <X size={14} className="mx-auto" style={{ color: '#CBD5E1' }} />;
}

// Calc annual savings %
function savePct(monthly, annual) {
  if (!monthly || !annual || monthly <= 0) return null;
  const pct = Math.round((1 - annual / (monthly * 12)) * 100);
  return pct > 0 ? `Save ${pct}%` : null;
}

export default function Upgrade() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { sub, planName, planColor } = usePlan();

  const [plans, setPlans]               = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [billingModel, setBillingModel] = useState('flat');
  const [cycle, setCycle]               = useState('monthly');
  const [residentCount, setResidentCount] = useState('');
  const [loading, setLoading]           = useState(true);
  const [paying, setPaying]             = useState(false);
  const [verifying, setVerifying]       = useState(false);

  // Handle Paystack return
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    if (!ref || !ref.startsWith('PLAN-')) return;

    (async () => {
      setVerifying(true);
      try {
        const { data } = await planAPI.verifyUpgrade(ref);
        if (data.success) {
          toast.success(`Upgraded to ${data.data.planId?.name || 'your new plan'}! Refreshing…`);
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

  // Load public plans
  useEffect(() => {
    planAPI.getPublicPlans()
      .then(({ data }) => {
        const list = data.data || [];
        setPlans(list);
        // Pre-select: currently active plan, or first in list
        const activePlanId = sub?.planId?._id || sub?.planId;
        const match = activePlanId ? list.find(p => p._id === activePlanId) : null;
        setSelectedPlanId(match?._id || list[0]?._id || null);
      })
      .catch(() => toast.error('Failed to load plans'))
      .finally(() => setLoading(false));
  }, [sub]);

  const selectedPlan = plans.find(p => p._id === selectedPlanId) || plans[0] || null;

  const hasPerResident = selectedPlan?.price?.perResident > 0;
  const hasAnnual      = (selectedPlan?.price?.annual ?? 0) > 0;
  const hasMonthly     = (selectedPlan?.price?.monthly ?? 0) > 0;

  // Reset billing model when plan changes and its model isn't available
  useEffect(() => {
    if (!selectedPlan) return;
    if (billingModel === 'per_resident' && !hasPerResident) setBillingModel('flat');
    if (billingModel === 'flat' && !hasMonthly && !hasAnnual) setBillingModel('per_resident');
  }, [selectedPlanId]);

  // Reset cycle when annual is not available
  useEffect(() => {
    if (cycle === 'annual' && !hasAnnual) setCycle('monthly');
  }, [selectedPlanId]);

  const isActive   = sub?.status === 'active';
  const isTrial    = sub?.status === 'trial';
  const isCurrentPlan = sub?.planId?._id === selectedPlanId || sub?.planId === selectedPlanId;
  const currentBillingModel = sub?.billingModel || 'flat';
  const currentCycle        = sub?.cycle || 'monthly';

  const maxResidents = selectedPlan?.features?.maxResidents;
  const residentInputMax = (!maxResidents || maxResidents === -1) ? undefined : maxResidents;

  const priceDisplay = () => {
    if (!selectedPlan) return null;
    if (billingModel === 'per_resident') {
      const ppr   = selectedPlan.price.perResident;
      const count = parseInt(residentCount) || 0;
      return {
        main:   `${fmt(ppr)}`,
        period: '/resident/month',
        total:  count > 0 ? `= ${fmt(ppr * count)}/month for ${count} residents` : null,
      };
    }
    if (cycle === 'annual') {
      const annual  = selectedPlan.price.annual;
      const monthly = selectedPlan.price.monthly;
      const saving  = savePct(monthly, annual);
      return {
        main:   fmt(annual),
        period: '/year',
        total:  saving && monthly
          ? `${saving} vs monthly (₦${(monthly * 12).toLocaleString()}/year)`
          : null,
      };
    }
    const monthly = selectedPlan.price.monthly;
    const annual  = selectedPlan.price.annual;
    const saving  = savePct(monthly, annual);
    return {
      main:   fmt(monthly),
      period: '/month',
      total:  saving && annual
        ? `or ${fmt(annual)}/year — ${saving}`
        : null,
    };
  };

  const handleActivate = useCallback(async () => {
    if (!selectedPlan) return;
    if (billingModel === 'per_resident' && !parseInt(residentCount)) {
      toast.error('Enter your resident count first');
      return;
    }
    setPaying(true);
    try {
      const { data } = await planAPI.initializeUpgrade({
        planId:        selectedPlan._id,
        cycle:         billingModel === 'per_resident' ? 'monthly' : cycle,
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
  }, [selectedPlan, billingModel, cycle, residentCount]);

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
      {/* ── Header ── */}
      <div className="text-center max-w-2xl mx-auto">
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
            ? 'Choose a plan and billing model, then activate when ready.'
            : 'Pick the plan that fits your community.'}
        </p>
      </div>

      {/* ── Trial banner ── */}
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
        <div className="flex justify-center py-20">
          <RefreshCw size={24} className="text-emerald-600 animate-spin" />
        </div>
      ) : plans.length === 0 ? (
        <div className="max-w-2xl mx-auto glass-card p-12 text-center">
          <CreditCard size={36} className="mx-auto mb-3" style={{ color: '#CBD5E1' }} />
          <p className="font-semibold" style={{ color: '#0F172A' }}>No plans available</p>
          <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Contact your administrator to set up subscription plans.</p>
        </div>
      ) : (
        <>
          {/* ── Plan selector (shows when multiple plans exist) ── */}
          {plans.length > 1 && (
            <div className="max-w-2xl mx-auto">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-center" style={{ color: '#94A3B8' }}>
                Choose a plan
              </p>
              <div className={`grid gap-3 ${plans.length === 2 ? 'grid-cols-2' : plans.length >= 3 ? 'grid-cols-3' : 'grid-cols-1'}`}>
                {plans.map(plan => {
                  const selected = plan._id === selectedPlanId;
                  return (
                    <button key={plan._id}
                      onClick={() => setSelectedPlanId(plan._id)}
                      className="relative rounded-2xl p-4 text-left transition-all"
                      style={selected
                        ? { border: `2px solid ${plan.color}`, background: plan.color + '0E' }
                        : { border: '2px solid #E2E8F0', background: '#FFFFFF' }}>
                      {plan.badge && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{ background: plan.color, color: '#FFFFFF' }}>
                          {plan.badge}
                        </span>
                      )}
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: plan.color + '18' }}>
                          <CreditCard size={13} style={{ color: plan.color }} />
                        </div>
                        <span className="font-bold text-sm" style={{ color: '#0F172A' }}>{plan.name}</span>
                        {!plan.isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full ml-auto"
                            style={{ background: '#F1F5F9', color: '#94A3B8' }}>Inactive</span>
                        )}
                      </div>
                      {plan.price.monthly > 0 && (
                        <div className="text-sm font-semibold" style={{ color: plan.color }}>
                          {fmt(plan.price.monthly)}<span className="text-xs font-normal" style={{ color: '#94A3B8' }}>/mo</span>
                        </div>
                      )}
                      {plan.price.monthly === 0 && plan.price.annual === 0 && (
                        <div className="text-sm font-semibold text-emerald-600">Free</div>
                      )}
                      {plan.description && (
                        <p className="text-xs mt-1 line-clamp-2" style={{ color: '#94A3B8' }}>{plan.description}</p>
                      )}
                      {selected && (
                        <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: plan.color }}>
                          <Check size={11} style={{ color: '#FFF' }} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Main plan card ── */}
          {selectedPlan && (
            <div className="max-w-2xl mx-auto">
              <div className="glass-card overflow-hidden"
                style={{ border: `1px solid ${selectedPlan.color}33` }}>
                {/* Plan header */}
                <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ background: selectedPlan.color + '14', border: `1px solid ${selectedPlan.color}30` }}>
                        <CreditCard size={22} style={{ color: selectedPlan.color }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-lg" style={{ color: '#0F172A' }}>
                            {selectedPlan.name}
                          </span>
                          {selectedPlan.badge && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ background: selectedPlan.color + '18', color: selectedPlan.color, border: `1px solid ${selectedPlan.color}30` }}>
                              {selectedPlan.badge}
                            </span>
                          )}
                          {isActive && isCurrentPlan && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(16,185,129,0.10)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}>
                              Current plan
                            </span>
                          )}
                        </div>
                        {selectedPlan.description && (
                          <p className="text-sm mt-0.5" style={{ color: '#475569' }}>{selectedPlan.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 pt-5">
                  {/* Billing model toggle */}
                  {(hasMonthly || hasAnnual) && hasPerResident && (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94A3B8' }}>
                        Billing model
                      </p>
                      <div className="grid grid-cols-2 gap-2 mb-5">
                        {[
                          { value: 'flat',         label: 'Flat fee' },
                          { value: 'per_resident', label: 'Per resident' },
                        ].map(opt => (
                          <button key={opt.value} onClick={() => setBillingModel(opt.value)}
                            className="py-2.5 px-4 rounded-xl text-sm font-semibold transition-all"
                            style={billingModel === opt.value
                              ? { border: `1px solid ${selectedPlan.color}60`, background: selectedPlan.color + '0E', color: selectedPlan.color }
                              : { border: '1px solid #E2E8F0', color: '#94A3B8', background: '#FFFFFF' }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Cycle selector (flat billing only) */}
                  {billingModel === 'flat' && (hasMonthly || hasAnnual) && (
                    <div className="mb-5">
                      {hasMonthly && hasAnnual && (
                        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94A3B8' }}>
                          Billing cycle
                        </p>
                      )}
                      <div className={`grid gap-2 mb-0 ${hasMonthly && hasAnnual ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {hasMonthly && (
                          <button onClick={() => setCycle('monthly')}
                            className="py-3 px-4 rounded-xl text-sm font-semibold transition-all text-left"
                            style={cycle === 'monthly'
                              ? { border: `1px solid ${selectedPlan.color}60`, background: selectedPlan.color + '0E', color: selectedPlan.color }
                              : { border: '1px solid #E2E8F0', color: '#94A3B8', background: '#FFFFFF' }}>
                            <div>Monthly</div>
                            <div className="text-xs mt-0.5"
                              style={{ color: cycle === 'monthly' ? selectedPlan.color : '#94A3B8' }}>
                              {fmt(selectedPlan.price.monthly)}/mo
                            </div>
                          </button>
                        )}
                        {hasAnnual && (
                          <button onClick={() => setCycle('annual')}
                            className="py-3 px-4 rounded-xl text-sm font-semibold transition-all text-left"
                            style={cycle === 'annual'
                              ? { border: `1px solid ${selectedPlan.color}60`, background: selectedPlan.color + '0E', color: selectedPlan.color }
                              : { border: '1px solid #E2E8F0', color: '#94A3B8', background: '#FFFFFF' }}>
                            <div className="flex items-center justify-between">
                              <span>Annual</span>
                              {savePct(selectedPlan.price.monthly, selectedPlan.price.annual) && cycle !== 'annual' && (
                                <span className="text-[10px] text-emerald-500 font-bold">
                                  {savePct(selectedPlan.price.monthly, selectedPlan.price.annual)}
                                </span>
                              )}
                            </div>
                            <div className="text-xs mt-0.5"
                              style={{ color: cycle === 'annual' ? selectedPlan.color : '#94A3B8' }}>
                              {fmt(selectedPlan.price.annual)}/yr
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Per-resident input */}
                  {billingModel === 'per_resident' && hasPerResident && (
                    <div className="mb-5">
                      <label className="text-xs mb-2 block" style={{ color: '#475569' }}>
                        Number of residents in your estate
                        {residentInputMax && <span className="ml-1" style={{ color: '#94A3B8' }}>(max {residentInputMax})</span>}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={residentInputMax}
                        className="input-field"
                        placeholder="e.g. 80"
                        value={residentCount}
                        onChange={e => setResidentCount(e.target.value)}
                      />
                      <p className="text-xs mt-1.5" style={{ color: '#94A3B8' }}>
                        {fmt(selectedPlan.price.perResident)} × {parseInt(residentCount) || 0} residents
                        = {fmt(selectedPlan.price.perResident * (parseInt(residentCount) || 0))}/month
                      </p>
                    </div>
                  )}

                  {/* Price summary box */}
                  {price && (
                    <div className="rounded-xl p-4 mb-5" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-black" style={{ color: '#0F172A' }}>{price.main}</span>
                        <span className="text-sm" style={{ color: '#94A3B8' }}>{price.period}</span>
                      </div>
                      {price.total && (
                        <div className="text-xs mt-1 font-medium" style={{ color: selectedPlan.color }}>
                          {price.total}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Feature bullet list — generated from real plan features */}
                {(() => {
                  const bullets = getBullets(selectedPlan.features);
                  return bullets.length > 0 && (
                    <div className="px-6 pb-5">
                      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94A3B8' }}>
                        What's included
                      </p>
                      <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                        {bullets.map(f => (
                          <div key={f} className="flex items-center gap-2 text-sm" style={{ color: '#475569' }}>
                            <Check size={13} style={{ color: selectedPlan.color, flexShrink: 0 }} />
                            {f}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* CTA button */}
                <div className="px-6 pb-6">
                  <button
                    onClick={handleActivate}
                    disabled={paying || (isActive && isCurrentPlan)}
                    className="w-full py-3.5 rounded-xl font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    style={{ background: selectedPlan.color }}
                    onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.opacity = '0.88'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                  >
                    {paying ? (
                      <><RefreshCw size={16} className="animate-spin" /> Redirecting to payment…</>
                    ) : isActive && isCurrentPlan ? (
                      <><CheckCircle size={16} /> {selectedPlan.name} Active</>
                    ) : isActive ? (
                      <>Switch to {selectedPlan.name} <ArrowRight size={16} /></>
                    ) : (
                      <>Activate {selectedPlan.name} <ArrowRight size={16} /></>
                    )}
                  </button>
                  {!(isActive && isCurrentPlan) && (
                    <p className="text-center text-xs mt-2" style={{ color: '#CBD5E1' }}>
                      Secure payment via Paystack · Cancel anytime
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Enterprise callout ── */}
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

          {/* ── Full feature comparison table ── */}
          {plans.length > 0 && (
            <div className="max-w-3xl mx-auto">
              <h2 className="text-base font-bold mb-4 text-center" style={{ color: '#0F172A' }}>
                Full feature comparison
              </h2>
              <div className="glass-card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <th className="text-left font-medium px-5 py-3 w-40" style={{ color: '#94A3B8' }}>Feature</th>
                      {plans.map(p => (
                        <th key={p._id} className="px-4 py-3 text-center font-semibold min-w-[90px]"
                          style={{ color: p.color }}>
                          {p.name}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center font-semibold text-indigo-500 min-w-[90px]">
                        Enterprise
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {FEATURE_KEYS.map(key => {
                      const meta    = FEATURE_META[key];
                      const Icon    = meta.icon;
                      // Only render rows where at least one plan has a non-default value
                      const hasData = plans.some(p => p.features?.[key] !== undefined);
                      if (!hasData) return null;
                      return (
                        <tr key={key} className="transition-colors hover:bg-slate-50"
                          style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2" style={{ color: '#475569' }}>
                              {Icon && <Icon size={12} className="flex-shrink-0" style={{ color: '#CBD5E1' }} />}
                              {meta.label}
                            </div>
                          </td>
                          {plans.map(p => (
                            <td key={p._id} className="px-4 py-3 text-center">
                              <FeatureCell value={p.features?.[key]} type={meta.type} />
                            </td>
                          ))}
                          <td className="px-4 py-3 text-center">
                            {meta.type === 'limit'
                              ? <span className="text-sm font-semibold text-indigo-500">∞</span>
                              : <Check size={15} className="text-indigo-500 mx-auto" />
                            }
                          </td>
                        </tr>
                      );
                    })}
                    {/* Extra enterprise-only rows */}
                    {[
                      'Multiple estates',
                      'Dedicated support manager',
                      'White label',
                      'SLA guarantee',
                    ].map(label => (
                      <tr key={label} className="transition-colors hover:bg-slate-50"
                        style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td className="px-5 py-3" style={{ color: '#475569' }}>{label}</td>
                        {plans.map(p => (
                          <td key={p._id} className="px-4 py-3 text-center">
                            <X size={14} className="mx-auto" style={{ color: '#CBD5E1' }} />
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center">
                          <Check size={15} className="text-indigo-500 mx-auto" />
                        </td>
                      </tr>
                    ))}
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
