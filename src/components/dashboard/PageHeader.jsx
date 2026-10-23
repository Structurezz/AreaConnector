import useCountUp from '../../hooks/useCountUp';

export const HEADER_BTN_PRIMARY = 'btn-primary !text-[13px] !px-3 !py-2';
export const HEADER_BTN_GHOST   = 'btn-outline !text-[13px] !px-3 !py-2';

function Stat({ i, label, value, Icon, color, hint, pulse, active, onClick }) {
  const n = useCountUp(value || 0);
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick}
      className="dash-tile dash-rise group text-left rounded-2xl p-4 border min-w-0"
      style={{
        animationDelay: `${60 + i * 60}ms`,
        background: `linear-gradient(140deg, ${color}${active ? '26' : '17'} 0%, #FFFFFF 55%)`,
        borderColor: active ? color : `${color}2E`,
        boxShadow: active ? `0 0 0 3px ${color}1F` : undefined,
      }}>
      <span className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full pointer-events-none transition-transform duration-500 group-hover:scale-125" style={{ background: `${color}12` }} />
      <div className="relative flex items-center justify-between">
        <span className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 14px -6px ${color}` }}>
          <Icon size={15} className="text-white" />
        </span>
        {pulse ? (
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full animate-ping opacity-70" style={{ background: color }} />
            <span className="relative w-2 h-2 rounded-full" style={{ background: color }} />
          </span>
        ) : active ? (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: `${color}1F`, color }}>Filtered</span>
        ) : null}
      </div>
      <div className="relative mt-3 text-[24px] font-semibold leading-none text-slate-900 tabular-nums" style={{ letterSpacing: '-0.03em' }}>{n}</div>
      <div className="relative mt-1 text-[12px] font-medium text-slate-500 truncate">{label}</div>
      {hint && <div className="relative mt-0.5 text-[11px] text-slate-400 truncate">{hint}</div>}
    </Tag>
  );
}

/**
 * Compact page header for desktop manager pages: title + actions, then an animated stat strip.
 * stats: [{ label, value, Icon, color, hint?, pulse?, active?, onClick? }]
 */
export default function PageHeader({ title, subtitle, actions, stats = [] }) {
  return (
    <div className="space-y-5">
      <div className="dash-rise flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900" style={{ letterSpacing: '-0.025em' }}>{title}</h1>
          {subtitle && <p className="text-[13px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
      {stats.length > 0 && (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
          {stats.map((s, i) => <Stat key={s.label} i={i} {...s} />)}
        </div>
      )}
    </div>
  );
}
