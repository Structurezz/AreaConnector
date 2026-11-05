// Address field with Google Places predictions as you type. Works as a plain
// input when Maps isn't configured or fails to load. Uses the new Places
// AutocompleteSuggestion API when the key has it, else the legacy
// AutocompleteService. Our own dropdown (not Google's pac-container) so it
// sits correctly inside modals and side panels.
import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { useGoogleMaps, GOOGLE_MAPS_API_KEY } from '../../utils/googleMaps';

const NIGERIA = { lat: 9.08, lng: 8.68 };
// Set once the new Places API refuses this key (403 when "Places API (New)"
// isn't enabled) — from then on use the legacy AutocompleteService.
let newApiBlocked = false;
// Both APIs refused (key without any Places API): behave as a plain input.
let placesUnavailable = false;

function legacyPredictions(P, input, token) {
  const svc = new P.AutocompleteService();
  return new Promise((resolve) => svc.getPlacePredictions(
    { input, sessionToken: token || undefined, region: 'ng', locationBias: { center: NIGERIA, radius: 50000 } },
    (preds, status) => {
      if (status === 'REQUEST_DENIED') placesUnavailable = true;
      resolve((preds || []).map(p => ({
      id: p.place_id, main: p.structured_formatting?.main_text || p.description,
      secondary: p.structured_formatting?.secondary_text || '', full: p.description,
    })));
    },
  ));
}

export default function AddressAutocomplete({
  value, onChange, onSelect, as = 'input', className = '', style, placeholder, rows = 2, required, autoFocus,
}) {
  const { isLoaded } = useGoogleMaps();
  const ready = !!GOOGLE_MAPS_API_KEY && isLoaded && !!window.google?.maps?.places;
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const tokenRef = useRef(null);
  const timer = useRef(null);
  const seq = useRef(0);
  const boxRef = useRef(null);

  useEffect(() => {
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => { document.removeEventListener('mousedown', close); clearTimeout(timer.current); };
  }, []);

  const places = () => window.google.maps.places;
  const newToken = () => {
    const P = places();
    tokenRef.current = P.AutocompleteSessionToken ? new P.AutocompleteSessionToken() : null;
  };

  const fetchPredictions = async (input) => {
    const P = places();
    const id = ++seq.current;
    if (!tokenRef.current) newToken();
    setLoading(true);
    try {
      let list = null;
      if (!newApiBlocked && P.AutocompleteSuggestion?.fetchAutocompleteSuggestions) {
        try {
          const { suggestions } = await P.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input, sessionToken: tokenRef.current, locationBias: { center: NIGERIA, radius: 50000 }, region: 'ng',
          });
          list = (suggestions || []).filter(s => s.placePrediction).map(s => ({
            id: s.placePrediction.placeId,
            main: s.placePrediction.mainText?.text || s.placePrediction.text?.text,
            secondary: s.placePrediction.secondaryText?.text || '',
            full: s.placePrediction.text?.text,
            prediction: s.placePrediction,
          }));
        } catch {
          newApiBlocked = true; // new API not enabled for this key
          newToken();
        }
      }
      if (list === null) list = await legacyPredictions(P, input, tokenRef.current);
      if (id !== seq.current) return; // a newer keystroke won
      setItems(list.slice(0, 6));
      setActive(-1);
      setOpen(list.length > 0);
    } catch {
      if (id === seq.current) { setItems([]); setOpen(false); }
    } finally {
      if (id === seq.current) setLoading(false);
    }
  };

  const handleChange = (e) => {
    const text = e.target.value;
    onChange(text);
    if (!ready || placesUnavailable) return;
    clearTimeout(timer.current);
    if (text.trim().length < 3) { setItems([]); setOpen(false); return; }
    timer.current = setTimeout(() => fetchPredictions(text.trim()), 220);
  };

  const choose = async (item) => {
    setOpen(false);
    setItems([]);
    onChange(item.full);
    const P = places();
    let detail = { address: item.full, placeId: item.id, name: item.main, lat: null, lng: null };
    try {
      if (item.prediction?.toPlace && !newApiBlocked) {
        const place = item.prediction.toPlace();
        await place.fetchFields({ fields: ['formattedAddress', 'location', 'displayName'] });
        detail = { address: place.formattedAddress || item.full, placeId: item.id, name: place.displayName || item.main, lat: place.location?.lat(), lng: place.location?.lng() };
      } else {
        const svc = new P.PlacesService(document.createElement('div'));
        const res = await new Promise((resolve) => svc.getDetails(
          { placeId: item.id, fields: ['formatted_address', 'geometry', 'name'], sessionToken: tokenRef.current || undefined },
          (r) => resolve(r),
        ));
        if (res) detail = { address: res.formatted_address || item.full, placeId: item.id, name: res.name || item.main, lat: res.geometry?.location?.lat(), lng: res.geometry?.location?.lng() };
      }
    } catch { /* keep the prediction text */ }
    tokenRef.current = null; // a session ends with a details call
    if (detail.address && detail.address !== item.full) onChange(detail.address);
    onSelect?.(detail);
  };

  const onKeyDown = (e) => {
    if (!open || !items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => (i + 1) % items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => (i <= 0 ? items.length - 1 : i - 1)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(items[active]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  const Field = as === 'textarea' ? 'textarea' : 'input';
  return (
    <div ref={boxRef} className="relative">
      <Field
        className={className} style={style} placeholder={placeholder} required={required} autoFocus={autoFocus}
        rows={as === 'textarea' ? rows : undefined} value={value} onChange={handleChange} onKeyDown={onKeyDown}
        onFocus={() => items.length && setOpen(true)} autoComplete="off" spellCheck={false}
      />
      {loading && <Loader2 size={14} className="absolute right-3 top-3 animate-spin text-slate-400" />}
      {open && items.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-[80] rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          {items.map((it, i) => (
            <button key={it.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(it)}
              onMouseEnter={() => setActive(i)}
              className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors ${i === active ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
              <MapPin size={14} className="mt-0.5 shrink-0 text-emerald-600" />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-slate-800 truncate">{it.main}</span>
                {it.secondary && <span className="block text-[11.5px] text-slate-500 truncate">{it.secondary}</span>}
              </span>
            </button>
          ))}
          <div className="px-3 py-1.5 text-[10px] text-slate-400 text-right border-t border-slate-100">Powered by Google</div>
        </div>
      )}
    </div>
  );
}
