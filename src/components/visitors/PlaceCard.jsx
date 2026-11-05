// "Where they're going": the host's hall / building on the site map, with a
// Google Maps directions link (from GET /api/visitors/:id → place).
import { Navigation } from 'lucide-react';
import { KIND_INFO, kindLabel } from '../site/placeKinds';
import { directionsTo } from '../../utils/googleMaps';
import { useSite } from '../../context/SiteContext';

export default function PlaceCard({ place, delay = 140 }) {
  const site = useSite();
  if (!place?.name) return null;
  const k = KIND_INFO[place.kind] || KIND_INFO.other;
  const url = place.directionsUrl || directionsTo(place);
  return (
    <div className="rounded-2xl border p-3.5 flex items-center gap-3"
      style={{ borderColor: `${k.color}33`, background: `linear-gradient(135deg, ${k.color}12, #FFFFFF 70%)`, animation: `dashRise 0.45s cubic-bezier(0.16,1,0.3,1) ${delay}ms both` }}>
      <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${k.color}, ${k.color}CC)`, boxShadow: `0 6px 14px -6px ${k.color}` }}>
        <k.Icon size={17} className="text-white" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Where they're going</div>
        <div className="text-[13.5px] font-semibold text-slate-900 truncate">{place.name}</div>
        <div className="text-[11.5px] text-slate-500 truncate">{kindLabel(place.kind, site.type)}{place.address ? ` · ${place.address}` : ''}</div>
      </div>
      {url && (
        <a href={url} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-xl text-white flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${k.color}, ${k.color}CC)`, textDecoration: 'none' }}>
          <Navigation size={12} /> Directions
        </a>
      )}
    </div>
  );
}
