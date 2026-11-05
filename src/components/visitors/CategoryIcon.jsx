// Icon + badge for a visitor pass category (guest, pickup, contractor, …)
import { UserCheck, GraduationCap, Wrench, Truck, Package, HeartPulse } from 'lucide-react';
import { CATEGORY_STYLE, CATEGORY_INFO } from '../../utils/siteTypes';

const ICONS = { guest: UserCheck, pickup: GraduationCap, contractor: Wrench, supplier: Truck, delivery: Package, patient_visit: HeartPulse };

export default function CategoryIcon({ category, ...props }) {
  const Icon = ICONS[category] || UserCheck;
  return <Icon {...props} />;
}

// Small coloured badge; renders nothing for plain guests
export function CategoryBadge({ category, className = '', showGuest = false }) {
  if (!category || (category === 'guest' && !showGuest)) return null;
  const st = CATEGORY_STYLE[category] || CATEGORY_STYLE.guest;
  const Icon = ICONS[category] || UserCheck;
  return (
    <span className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap ${className}`}
      style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}26` }}>
      <Icon size={10} /> {CATEGORY_INFO[category]?.label || category}
    </span>
  );
}
