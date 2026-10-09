import { useEffect, useState } from 'react';
import api from '../api/axios';

let cached = null;
let expiryNotified = false;

export function usePlan() {
  const [sub, setSub] = useState(cached);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;
    api.get('/plans/my-subscription')
      .then(({ data }) => {
        cached = data.data;
        setSub(data.data);

        // Fire plan expiry notification once per session
        const days = data.data?.daysUntilExpiry;
        const status = data.data?.status;
        if (!expiryNotified && days != null && days > 0 && (status === 'trial' || status === 'active')) {
          expiryNotified = true;
          const isUrgent = days <= 3;
          const label = status === 'trial' ? 'trial' : 'subscription';
          window.dispatchEvent(new CustomEvent('plan:expiry', {
            detail: {
              type: isUrgent ? 'plan_expiry_urgent' : 'plan_expiry_warning',
              title: isUrgent ? `Your ${label} expires in ${days} day${days === 1 ? '' : 's'}!` : `${label.charAt(0).toUpperCase() + label.slice(1)} expiring soon`,
              body: isUrgent
                ? `Renew now to avoid losing access to your estate features.`
                : `Your ${label} expires in ${days} days. Visit Upgrade to renew.`,
              days,
            },
          }));
        }
      })
      .catch(() => setSub(null))
      .finally(() => setLoading(false));
  }, []);

  // When the backend reports an active comp (promo / VIP / beta gift), the
  // sub carries `effectivePlan` — the plan the manager should feel like
  // they're on for feature-gating purposes — alongside their real billed
  // `planId`. Prefer effectivePlan when it's there so comp features unlock
  // immediately in the sidebar, in PlanGate, and anywhere else that reads
  // off this hook.
  const isComp     = !!sub?.isComp;
  const activePlan = sub?.effectivePlan || sub?.planId || null;

  const features  = activePlan?.features || {};
  const planName  = activePlan?.name || 'Free';
  const planColor = activePlan?.color || '#6B7280';
  const status    = sub?.status || 'trial';

  const BLOCKED = ['suspended', 'expired', 'cancelled'];
  const isBlocked = BLOCKED.includes(status);

  const can = (featureKey) => {
    if (isBlocked) return false;
    if (features[featureKey] === undefined) return true;
    if (typeof features[featureKey] === 'boolean') return features[featureKey];
    if (typeof features[featureKey] === 'number') return features[featureKey] !== 0;
    return features[featureKey] !== 'none';
  };

  return { sub, loading, features, planName, planColor, status, isBlocked, isComp, activePlan, can };
}
