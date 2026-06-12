import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const AnimatedNumber = ({ value }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = parseInt(value) || 0;
    if (target === 0) { setDisplay(0); return; }
    const duration = 900;
    const steps = 40;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (step >= steps) { setDisplay(target); clearInterval(timer); }
    }, interval);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display.toLocaleString()}</span>;
};

const colorMap = {
  gold:   { icon: 'rgba(16,185,129,0.10)',  text: '#059669', glow: 'rgba(16,185,129,0.12)',  gradient: 'linear-gradient(135deg, #10B981, #059669)' },
  green:  { icon: 'rgba(16,185,129,0.10)',  text: '#059669', glow: 'rgba(16,185,129,0.12)',  gradient: 'linear-gradient(135deg, #10B981, #059669)' },
  red:    { icon: 'rgba(239,68,68,0.10)',   text: '#DC2626', glow: 'rgba(239,68,68,0.12)',   gradient: 'linear-gradient(135deg, #EF4444, #DC2626)' },
  blue:   { icon: 'rgba(99,102,241,0.10)',  text: '#4F46E5', glow: 'rgba(99,102,241,0.12)',  gradient: 'linear-gradient(135deg, #6366F1, #4F46E5)' },
  purple: { icon: 'rgba(167,139,250,0.10)', text: '#7C3AED', glow: 'rgba(167,139,250,0.12)', gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' },
};

export default function StatCard({ label, value, icon: Icon, color = 'gold', trend, suffix = '' }) {
  const c = colorMap[color] || colorMap.gold;

  return (
    <div className="stat-card animate-fade-in group">
      <div className="flex items-start justify-between mb-4">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: c.icon, boxShadow: `0 0 0 1px ${c.glow}` }}>
          <Icon size={19} style={{ color: c.text }} />
        </div>

        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
            trend >= 0
              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
              : 'text-red-600 bg-red-50 border border-red-200'
          }`}>
            {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div className="text-3xl font-bold mb-1.5" style={{ color: '#0F172A', letterSpacing: '-0.04em', lineHeight: 1 }}>
        <AnimatedNumber value={value} />
        {suffix && <span className="text-xl ml-0.5">{suffix}</span>}
      </div>

      <div className="text-sm font-medium" style={{ color: 'var(--text-sub)' }}>{label}</div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `linear-gradient(90deg, transparent, ${c.text}30, transparent)` }} />
    </div>
  );
}
