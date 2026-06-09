import { Lock, ArrowUpRight } from 'lucide-react';
import { usePlan } from '../../hooks/usePlan';

export default function PlanGate({ feature, label, children }) {
  const { can, planName, planColor } = usePlan();

  if (can(feature)) return children;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-30 blur-[1px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="glass-card p-6 text-center max-w-xs mx-4 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-white/8 border border-white/15 flex items-center justify-center mx-auto mb-3">
            <Lock size={22} className="text-white/50" />
          </div>
          <p className="text-white font-semibold mb-1">{label || 'Feature Locked'}</p>
          <p className="text-white/40 text-sm mb-4">
            This feature is not available on your <span className="font-medium" style={{ color: planColor }}>{planName}</span> plan.
            Upgrade to unlock it.
          </p>
          <div className="flex items-center justify-center gap-1.5 text-sm font-semibold text-gold">
            <ArrowUpRight size={15} /> Upgrade your plan
          </div>
          <p className="text-white/25 text-xs mt-2">Contact your administrator to upgrade</p>
        </div>
      </div>
    </div>
  );
}
