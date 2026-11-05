// Pick a site type (estate / school / hotel / industrial / hospital).
// variant 'cards' = icon + label + description; 'compact' = small chips.
import { Check } from 'lucide-react';
import { SITE_TYPES, TYPE_INFO } from '../../utils/siteTypes';

// `dark` restyles the compact chips for dark backgrounds (e.g. the phone sign-up card).
export default function SiteTypePicker({ value = 'estate', onChange, variant = 'cards', disabled = false, dark = false }) {
  if (variant === 'compact') {
    return (
      <div className="grid grid-cols-3 gap-1.5">
        {SITE_TYPES.map(k => {
          const { label, short, Icon, color } = TYPE_INFO[k];
          const on = value === k;
          return (
            <button type="button" key={k} disabled={disabled} onClick={() => onChange(k)}
              className="flex flex-col items-center gap-1 rounded-xl border px-1.5 py-2 text-[11px] font-semibold transition-all disabled:opacity-60"
              style={on
                ? { borderColor: color, background: `${color}14`, color, boxShadow: `0 0 0 3px ${color}1A` }
                : dark
                  ? { borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)' }
                  : { borderColor: '#E2E8F0', background: '#FFFFFF', color: '#475569' }}>
              <Icon size={15} />
              <span className="truncate max-w-full">{short || label}</span>
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div className="grid gap-2.5 grid-cols-2 md:grid-cols-3">
      {SITE_TYPES.map((k, i) => {
        const { label, Icon, color, description } = TYPE_INFO[k];
        const on = value === k;
        return (
          <button type="button" key={k} disabled={disabled} onClick={() => onChange(k)}
            className="dash-rise relative text-left rounded-2xl border p-3.5 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
            style={{
              animationDelay: `${i * 50}ms`,
              borderColor: on ? color : '#E2E8F0',
              background: on ? `linear-gradient(140deg, ${color}1F 0%, #FFFFFF 60%)` : '#FFFFFF',
              boxShadow: on ? `0 0 0 3px ${color}1F` : undefined,
            }}>
            {on && (
              <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: color }}>
                <Check size={12} />
              </span>
            )}
            <span className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 14px -6px ${color}` }}>
              <Icon size={16} className="text-white" />
            </span>
            <div className="mt-2.5 text-[13.5px] font-semibold text-slate-900">{label}</div>
            <div className="text-[11.5px] text-slate-500 leading-snug mt-0.5">{description}</div>
          </button>
        );
      })}
    </div>
  );
}
