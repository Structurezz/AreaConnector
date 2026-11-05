// Sector details on a visitor pass: category (pickup / contractor / patient
// visit …), its extra fields, when the safety induction was accepted and any
// outside-visiting-hours override the guard entered.
import { HardHat, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { CATEGORY_STYLE, CATEGORY_INFO, DETAIL_LABELS } from '../../utils/siteTypes';
import CategoryIcon from './CategoryIcon';

const ORDER = ['studentName', 'studentClass', 'patientName', 'ward', 'company', 'job', 'goods', 'vehiclePlate'];
const dt = (d) => format(new Date(d), 'EEE d MMM · h:mm a');

export const hasSiteDetails = (v) => !!(v && ((v.category && v.category !== 'guest') || ORDER.some(k => v.details?.[k]) || v.inductionAcceptedAt || v.outsideHoursOverride?.reason));

export default function VisitorSiteDetails({ visitor: v, delay = 120 }) {
  if (!hasSiteDetails(v)) return null;
  const cat = v.category && v.category !== 'guest' ? v.category : null;
  const st = CATEGORY_STYLE[cat] || CATEGORY_STYLE.guest;
  const rows = ORDER.filter(k => v.details?.[k]).map(k => [DETAIL_LABELS[k], v.details[k]]);
  const by = v.outsideHoursOverride?.by;
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: `${st.color}33`, animation: `dashRise 0.45s cubic-bezier(0.16,1,0.3,1) ${delay}ms both` }}>
      <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: `${st.color}1F`, background: `linear-gradient(135deg, ${st.bg}, #FFFFFF 75%)` }}>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${st.color}, ${st.color}CC)`, boxShadow: `0 4px 10px -4px ${st.color}` }}>
          <CategoryIcon category={cat || 'guest'} size={13} className="text-white" />
        </span>
        <span className="text-[13px] font-semibold text-slate-900 flex-1">{cat ? CATEGORY_INFO[cat]?.label || cat : 'Visit details'}</span>
      </div>
      {rows.length > 0 && (
        <div className="grid grid-cols-2 gap-2 p-3">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 px-3 py-2 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
              <div className={`text-[12.5px] font-semibold text-slate-900 truncate mt-0.5 ${label === 'Vehicle plate' ? 'font-mono tracking-wide' : ''}`}>{value}</div>
            </div>
          ))}
        </div>
      )}
      {(v.inductionAcceptedAt || v.outsideHoursOverride?.reason) && (
        <div className={`px-4 pb-3 space-y-2 ${rows.length ? '' : 'pt-3'}`}>
          {v.inductionAcceptedAt && (
            <div className="flex items-start gap-2 text-[12px] text-orange-800 rounded-xl bg-orange-50 border border-orange-100 px-3 py-2">
              <HardHat size={13} className="mt-0.5 flex-shrink-0" />
              <span>Safety induction accepted <b>{dt(v.inductionAcceptedAt)}</b></span>
            </div>
          )}
          {v.outsideHoursOverride?.reason && (
            <div className="flex items-start gap-2 text-[12px] text-rose-800 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2">
              <ShieldAlert size={13} className="mt-0.5 flex-shrink-0" />
              <span>
                Let in outside visiting hours: “{v.outsideHoursOverride.reason}”
                {(by?.name || v.outsideHoursOverride.at) && <span className="text-rose-700/70"> · {[by?.name, v.outsideHoursOverride.at && dt(v.outsideHoursOverride.at)].filter(Boolean).join(' · ')}</span>}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
