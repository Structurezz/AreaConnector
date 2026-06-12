import { Lock, ArrowUpRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePlan } from '../../hooks/usePlan';

export default function PlanGate({ feature, featureName, children }) {
  const { can, loading, planName, planColor } = usePlan();

  if (loading) return null;
  if (can(feature)) return children;

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] text-center px-6">
      {/* lock icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#F1F5F9,#E2E8F0)', border: '1px solid #CBD5E1' }}>
          <Lock size={32} style={{ color: '#94A3B8' }} />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: '#FEF3C7', border: '1.5px solid #F59E0B' }}>
          <Sparkles size={12} style={{ color: '#D97706' }} />
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-2" style={{ color: '#0F172A' }}>
        {featureName} is locked
      </h2>
      <p className="text-sm mb-1 max-w-sm leading-relaxed" style={{ color: '#475569' }}>
        Your current plan
        <span className="font-semibold mx-1" style={{ color: planColor }}>({planName})</span>
        doesn't include <span className="font-semibold">{featureName}</span>.
      </p>
      <p className="text-sm mb-8 max-w-sm" style={{ color: '#94A3B8' }}>
        Upgrade your plan to unlock this feature and more.
      </p>

      <Link
        to="/upgrade"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all"
        style={{ background: '#10B981', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}
        onMouseEnter={e => e.currentTarget.style.background = '#059669'}
        onMouseLeave={e => e.currentTarget.style.background = '#10B981'}>
        <ArrowUpRight size={16} />
        View Plans & Upgrade
      </Link>

      <p className="text-xs mt-4" style={{ color: '#CBD5E1' }}>
        Already upgraded? Try refreshing the page.
      </p>
    </div>
  );
}
