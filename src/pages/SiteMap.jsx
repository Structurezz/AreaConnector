// Site map: real Google Maps with the site's places — halls / hostels,
// buildings, faculties, gates, the clinic… Managers add places by searching
// Google (Places Autocomplete) or dropping a pin, move pins by dragging, and
// link units (rooms / flats) to a hall so visitors get directions to it.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, OverlayViewF, OverlayView, MarkerF, Autocomplete } from '@react-google-maps/api';
import {
  Plus, Search, X, MapPin, Navigation, Pencil, Trash2, Link2, Eye, EyeOff, Save, Layers, Check, Map as MapIcon, Crosshair, Home,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { placeAPI, unitAPI } from '../api';
import { useSite } from '../context/SiteContext';
import { useAuth } from '../context/AuthContext';
import useIsDesktop from '../hooks/useIsDesktop';
import { useGoogleMaps, GOOGLE_MAPS_API_KEY, directionsTo } from '../utils/googleMaps';
import { blockWord, blockName } from '../utils/siteTypes';
import { PLACE_KINDS, KIND_INFO, kindLabel } from '../components/site/placeKinds';
import StatTile from '../components/site/StatTile';
import { HEADER_BTN_PRIMARY } from '../components/dashboard/PageHeader';

const LAGOS = { lat: 6.5244, lng: 3.3792 };
const BLANK = { name: '', kind: 'hall', block: '', description: '', isPublic: true, lat: null, lng: null, googlePlaceId: '', address: '' };

/* ── Pin ──────────────────────────────────────────────────────────── */
function PlacePin({ place, selected, onClick, type }) {
  const k = KIND_INFO[place.kind] || KIND_INFO.other;
  const st = place.stats;
  const showOcc = place.kind === 'hall' && st?.units;
  return (
    <OverlayViewF position={{ lat: place.lat, lng: place.lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -h })}>
      <button type="button" onClick={(e) => { e.stopPropagation(); onClick(place); }}
        className="group flex flex-col items-center" style={{ transform: selected ? 'scale(1.12)' : undefined, transition: 'transform .2s', cursor: 'pointer', pointerEvents: selected ? 'none' : 'auto' }}>
        {(selected || showOcc) && (
          <span className="mb-1 px-2 py-0.5 rounded-lg bg-white text-[10.5px] font-semibold text-slate-800 whitespace-nowrap shadow-md border"
            style={{ borderColor: `${k.color}40` }}>
            {selected ? place.name : ''}{selected && showOcc ? ' · ' : ''}
            {showOcc ? <span style={{ color: k.color }}>{st.occupied}/{st.units}</span> : null}
          </span>
        )}
        <span className="relative w-8 h-8 rounded-full flex items-center justify-center border-[2.5px] border-white transition-transform group-hover:-translate-y-0.5"
          style={{ background: `linear-gradient(135deg, ${k.color}, ${k.color}CC)`, boxShadow: `0 6px 14px -4px ${k.color}AA` }}
          title={`${place.name} · ${kindLabel(place.kind, type)}`}>
          <k.Icon size={14} color="#fff" strokeWidth={2.4} />
          {selected && <span className="absolute inset-0 rounded-full animate-ping opacity-40" style={{ background: k.color }} />}
        </span>
        <span className="w-0 h-0 -mt-[1px]" style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `7px solid ${k.color}` }} />
      </button>
    </OverlayViewF>
  );
}

/* ── Place editor (add / edit) ────────────────────────────────────── */
function PlaceEditor({ draft, setDraft, isLoaded, onSave, onCancel, saving, editing, T, type, onPickPlace }) {
  const acRef = useRef(null);
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const bw = blockWord(T);
  const onPlaceChanged = () => {
    const pl = acRef.current?.getPlace?.();
    if (!pl?.geometry?.location) { toast.error('Pick a result from the list'); return; }
    const lat = pl.geometry.location.lat(), lng = pl.geometry.location.lng();
    setDraft(d => ({ ...d, name: d.name || pl.name || '', lat, lng, googlePlaceId: pl.place_id || '', address: pl.formatted_address || '' }));
    onPickPlace({ lat, lng });
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="p-4 space-y-4">
      {isLoaded && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Find on Google Maps</p>
          <Autocomplete onLoad={(a) => { acRef.current = a; }} onPlaceChanged={onPlaceChanged}
            options={{ fields: ['name', 'geometry', 'place_id', 'formatted_address'] }}>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input-field text-sm !pl-9" placeholder={type === 'university' ? 'e.g. Moremi Hall UNILAG' : 'Search a building, gate or address'}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />
            </div>
          </Autocomplete>
        </div>
      )}
      <div className={`rounded-xl px-3 py-2.5 text-[12px] flex items-start gap-2 ${draft.lat != null ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-amber-50 text-amber-800 border border-amber-100'}`}>
        <Crosshair size={14} className="flex-shrink-0 mt-0.5" />
        <span>
          {draft.lat != null
            ? <>Pinned at <span className="font-mono">{draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}</span>. Drag the pin or click the map to move it.</>
            : 'Search above, or click the map to drop the pin.'}
          {draft.address && <span className="block text-[11px] opacity-80 mt-0.5 truncate">{draft.address}</span>}
        </span>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Kind of place</p>
        <div className="grid grid-cols-3 gap-1.5">
          {PLACE_KINDS.map(k => {
            const info = KIND_INFO[k];
            const on = draft.kind === k;
            return (
              <button type="button" key={k} onClick={() => set('kind', k)}
                className="flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11.5px] font-semibold transition-all text-left"
                style={on ? { borderColor: info.color, background: `${info.color}14`, color: info.color } : { borderColor: '#E2E8F0', color: '#475569' }}>
                <info.Icon size={12} className="flex-shrink-0" /><span className="truncate">{kindLabel(k, type)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2.5">
        <input className="input-field text-sm" placeholder="Name *" value={draft.name} onChange={e => set('name', e.target.value)} required />
        {(draft.kind === 'hall' || draft.block) && (
          <div>
            <input className="input-field text-sm" placeholder={`${bw} name (as on your ${T.units.toLowerCase()})`} value={draft.block} onChange={e => set('block', e.target.value)} />
            <p className="text-[11px] text-slate-400 mt-1">{T.units} in this {bw.toLowerCase()} are linked automatically.</p>
          </div>
        )}
        <textarea rows={2} className="input-field text-sm resize-none" placeholder="Description (optional) — e.g. Entrance by the car park" value={draft.description} onChange={e => set('description', e.target.value)} />
        <button type="button" onClick={() => set('isPublic', !draft.isPublic)} className="w-full flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left hover:bg-slate-50">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: draft.isPublic ? '#ECFDF5' : '#F1F5F9', color: draft.isPublic ? '#059669' : '#94A3B8' }}>
            {draft.isPublic ? <Eye size={14} /> : <EyeOff size={14} />}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] font-semibold text-slate-800">Visible to {T.members.toLowerCase()}</span>
            <span className="block text-[11.5px] text-slate-400">Shown in AreaMates and on visitor passes. Off: only staff and guards see it.</span>
          </span>
          <span className="relative inline-flex w-9 h-5 rounded-full flex-shrink-0 transition-colors" style={{ background: draft.isPublic ? '#10B981' : '#E2E8F0' }}>
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" style={{ left: draft.isPublic ? 18 : 2 }} />
          </span>
        </button>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-[9px] text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">Cancel</button>
        <button type="submit" disabled={saving}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-[9px] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 8px 18px -10px #059669' }}>
          <Save size={14} /> {saving ? 'Saving…' : editing ? 'Save place' : 'Add place'}
        </button>
      </div>
    </form>
  );
}

/* ── Link units ───────────────────────────────────────────────────── */
function LinkUnits({ place, units, T, onDone, onCancel }) {
  const [picked, setPicked] = useState(() => new Set(units.filter(u => String(u.placeId || '') === String(place._id)).map(u => u._id)));
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const bw = blockWord(T);
  const blocks = useMemo(() => [...new Set(units.map(u => u.block).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [units]);
  const shown = units.filter(u => !q || `${u.block || ''} ${u.unitNumber}`.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id) => setPicked(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const send = async (body, msg) => {
    setBusy(true);
    try {
      const { data } = await placeAPI.linkUnits(place._id, body);
      toast.success(data.message || msg);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not link');
    } finally { setBusy(false); }
  };
  return (
    <div className="p-4 space-y-4">
      {blocks.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Link a whole {bw.toLowerCase()}</p>
          <div className="flex flex-wrap gap-1.5">
            {blocks.map(b => (
              <button key={b} type="button" disabled={busy} onClick={() => send({ block: b }, 'Linked')}
                className="inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1 rounded-full border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-60">
                <Link2 size={11} /> {blockName(b, T)} · {units.filter(u => u.block === b).length}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Or pick {T.units.toLowerCase()}</p>
          <span className="text-[11px] text-slate-400">{picked.size} selected</span>
        </div>
        <div className="relative mb-2">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-field text-sm !pl-8" placeholder={`Search ${T.units.toLowerCase()}…`} value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
          {!shown.length && <p className="px-3 py-4 text-[12px] text-slate-400 text-center">No {T.units.toLowerCase()} found</p>}
          {shown.map(u => {
            const on = picked.has(u._id);
            return (
              <button key={u._id} type="button" onClick={() => toggle(u._id)} className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50">
                <span className={`w-4 h-4 rounded flex items-center justify-center border ${on ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>{on && <Check size={11} />}</span>
                <span className="text-[12.5px] font-semibold text-slate-800">{T.unit} {u.unitNumber}</span>
                {u.block && <span className="text-[11px] text-slate-400">{blockName(u.block, T)}</span>}
                <span className="ml-auto text-[11px] text-slate-400 tabular-nums">{(u.residentIds || []).length} in</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5">Linking moves a {T.unit.toLowerCase()} to this place even if its {bw.toLowerCase()} name differs.</p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-[9px] text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">Back</button>
        <button type="button" disabled={busy || !picked.size} onClick={() => send({ unitIds: [...picked] }, 'Linked')}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-[9px] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}>
          <Link2 size={14} /> {busy ? 'Linking…' : `Link ${picked.size || ''} ${picked.size === 1 ? T.unit.toLowerCase() : T.units.toLowerCase()}`}
        </button>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function SiteMap() {
  const site = useSite();
  const T = site.terms;
  const { user } = useAuth();
  const desktop = useIsDesktop();
  const { isLoaded, loadError } = useGoogleMaps();
  const [places, setPlaces] = useState([]);
  const [center, setCenter] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [q, setQ] = useState('');
  const [mapType, setMapType] = useState('roadmap');
  const [panel, setPanel] = useState(null); // { mode: 'view'|'edit'|'add'|'link', id? }
  const [draft, setDraft] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const mapRef = useRef(null);
  const fitted = useRef(false);

  const estateLoc = user?.estateId?.location?.lat ? { lat: user.estateId.location.lat, lng: user.estateId.location.lng } : null;

  const load = useCallback(async () => {
    try {
      const [p, u] = await Promise.allSettled([placeAPI.list(), unitAPI.getAll()]);
      if (p.status === 'fulfilled') {
        setPlaces(p.value.data.data || []);
        setCenter(p.value.data.center || null);
        setUnavailable(false);
      } else if (p.reason?.response?.status === 404) {
        setUnavailable(true);
      } else {
        toast.error(p.reason?.response?.data?.message || 'Could not load places');
      }
      if (u.status === 'fulfilled') setUnits(u.value.data.data || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const mapCenter = center || estateLoc || LAGOS;
  const selected = panel?.id ? places.find(p => p._id === panel.id) : null;

  // Fit the map to the places once they arrive
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fitted.current || !isLoaded || loading) return;
    fitted.current = true;
    const pts = places.filter(p => p.lat != null);
    if (pts.length > 1) {
      const b = new window.google.maps.LatLngBounds();
      pts.forEach(p => b.extend({ lat: p.lat, lng: p.lng }));
      if (center) b.extend(center);
      map.fitBounds(b, 60);
    } else {
      map.setCenter(pts[0] ? { lat: pts[0].lat, lng: pts[0].lng } : mapCenter);
      map.setZoom(pts.length ? 17 : 16);
    }
  }, [isLoaded, loading, places, center, mapCenter]);

  const panTo = (pos, zoom = 18) => { const m = mapRef.current; if (m && pos) { m.panTo(pos); if (m.getZoom() < zoom) m.setZoom(zoom); } };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return places.filter(p => !s || `${p.name} ${p.block} ${p.description} ${p.address}`.toLowerCase().includes(s));
  }, [places, q]);
  const groups = useMemo(() => PLACE_KINDS.map(k => [k, filtered.filter(p => p.kind === k)]).filter(([, l]) => l.length), [filtered]);

  const counts = useMemo(() => ({
    total: places.length,
    halls: places.filter(p => p.kind === 'hall').length,
    gates: places.filter(p => p.kind === 'gate').length,
    linked: places.reduce((t, p) => t + (p.stats?.units || 0), 0),
  }), [places]);

  const openPlace = (p) => { setPanel({ mode: 'view', id: p._id }); panTo({ lat: p.lat, lng: p.lng }); };
  const startAdd = () => {
    const c = mapRef.current?.getCenter?.();
    setDraft({ ...BLANK, kind: site.type === 'university' ? 'hall' : 'building', lat: c ? c.lat() : null, lng: c ? c.lng() : null });
    setPanel({ mode: 'add' });
  };
  const startEdit = (p) => {
    setDraft({ name: p.name, kind: p.kind, block: p.block || '', description: p.description || '', isPublic: p.isPublic !== false, lat: p.lat, lng: p.lng, googlePlaceId: p.googlePlaceId || '', address: p.address || '' });
    setPanel({ mode: 'edit', id: p._id });
  };
  const editingPin = panel && (panel.mode === 'add' || panel.mode === 'edit');

  const save = async () => {
    if (!draft.name.trim()) { toast.error('Give the place a name'); return; }
    if (draft.lat == null) { toast.error('Pick the place on the map'); return; }
    setSaving(true);
    try {
      const body = { ...draft, name: draft.name.trim() };
      const { data } = panel.mode === 'edit' ? await placeAPI.update(panel.id, body) : await placeAPI.create(body);
      toast.success(data.message || 'Saved');
      await load();
      setPanel({ mode: 'view', id: data.data?._id || panel.id });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the place');
    } finally { setSaving(false); }
  };
  const remove = async (p) => {
    if (!window.confirm(`Remove ${p.name} from the map? Linked ${T.units.toLowerCase()} fall back to matching by ${blockWord(T).toLowerCase()} name.`)) return;
    try {
      await placeAPI.remove(p._id);
      toast.success('Place removed');
      setPanel(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Could not remove'); }
  };
  // Drag a pin straight on the map (view mode) → save the new spot
  const movePlace = async (p, pos) => {
    setPlaces(list => list.map(x => (x._id === p._id ? { ...x, ...pos } : x)));
    try { await placeAPI.update(p._id, pos); toast.success(`${p.name} moved`); }
    catch (err) { toast.error(err.response?.data?.message || 'Could not move'); load(); }
  };

  const onMapClick = (e) => {
    if (!editingPin) return;
    setDraft(d => ({ ...d, lat: e.latLng.lat(), lng: e.latLng.lng() }));
  };

  /* ── panel content ── */
  const panelTitle = !panel ? '' : panel.mode === 'add' ? 'Add place' : panel.mode === 'link' ? `Link ${T.units.toLowerCase()}` : selected?.name || '';
  const accent = KIND_INFO[(panel?.mode === 'add' || panel?.mode === 'edit') ? draft.kind : selected?.kind]?.color || '#10B981';
  const panelBody = !panel ? null : (panel.mode === 'add' || panel.mode === 'edit') ? (
    <PlaceEditor draft={draft} setDraft={setDraft} isLoaded={isLoaded} saving={saving} editing={panel.mode === 'edit'} T={T} type={site.type}
      onSave={save} onCancel={() => setPanel(selected ? { mode: 'view', id: selected._id } : null)} onPickPlace={(pos) => panTo(pos)} />
  ) : panel.mode === 'link' && selected ? (
    <LinkUnits place={selected} units={units} T={T} onCancel={() => setPanel({ mode: 'view', id: selected._id })}
      onDone={() => { load(); setPanel({ mode: 'view', id: selected._id }); }} />
  ) : selected ? (() => {
    const k = KIND_INFO[selected.kind] || KIND_INFO.other;
    const st = selected.stats;
    const pct = st?.units ? Math.round((st.occupied / st.units) * 100) : 0;
    return (
      <div className="p-4 space-y-3.5">
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${k.color}14`, color: k.color }}><k.Icon size={11} /> {kindLabel(selected.kind, site.type)}</span>
          {selected.block && <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"><Home size={11} /> {blockName(selected.block, T)}</span>}
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${selected.isPublic !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            {selected.isPublic !== false ? <><Eye size={11} /> Visible to {T.members.toLowerCase()}</> : <><EyeOff size={11} /> Staff only</>}
          </span>
        </div>
        {selected.description && <p className="text-[12.5px] text-slate-600 leading-relaxed">{selected.description}</p>}
        {selected.address && <p className="text-[11.5px] text-slate-400 flex items-start gap-1.5"><MapPin size={12} className="mt-0.5 flex-shrink-0" />{selected.address}</p>}
        {st?.units ? (
          <div className="rounded-xl border border-slate-200 p-3" style={{ background: `linear-gradient(135deg, ${k.color}0D, #fff 70%)` }}>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[[st.units, T.units], [st.occupied, 'Occupied'], [st.people, 'People']].map(([v, l]) => (
                <div key={l}><div className="text-[18px] font-semibold text-slate-900 tabular-nums leading-none">{v}</div><div className="text-[10.5px] text-slate-500 mt-1 truncate">{l}</div></div>
              ))}
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-3">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${k.color}AA, ${k.color})`, transformOrigin: 'left', animation: 'dashGrowX 0.9s cubic-bezier(0.16,1,0.3,1) both' }} />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">{pct}% occupied</p>
          </div>
        ) : selected.kind === 'hall' ? (
          <p className="text-[12px] text-slate-500 rounded-xl bg-slate-50 px-3 py-2.5">No {T.units.toLowerCase()} linked yet. Set the {blockWord(T).toLowerCase()} name to match your {T.units.toLowerCase()}, or link them.</p>
        ) : null}
        <a href={selected.directionsUrl || directionsTo(selected)} target="_blank" rel="noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 rounded-[9px] px-3 py-2.5 text-sm font-semibold text-white"
          style={{ background: `linear-gradient(135deg, ${k.color}, ${k.color}CC)`, boxShadow: `0 8px 18px -10px ${k.color}`, textDecoration: 'none' }}>
          <Navigation size={14} /> Directions
        </a>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => startEdit(selected)} className="inline-flex items-center justify-center gap-1.5 rounded-[9px] px-2 py-2 text-[12.5px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"><Pencil size={13} /> Edit</button>
          <button onClick={() => setPanel({ mode: 'link', id: selected._id })} className="inline-flex items-center justify-center gap-1.5 rounded-[9px] px-2 py-2 text-[12.5px] font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100"><Link2 size={13} /> Link</button>
          <button onClick={() => remove(selected)} className="inline-flex items-center justify-center gap-1.5 rounded-[9px] px-2 py-2 text-[12.5px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100"><Trash2 size={13} /> Delete</button>
        </div>
        <p className="text-[11px] text-slate-400">Tip: drag the pin on the map to move it.</p>
      </div>
    );
  })() : null;

  const panelEl = panel && panelBody && (
    <div className={desktop
      ? 'absolute top-3 right-3 bottom-3 w-[360px] bg-white rounded-2xl flex flex-col overflow-hidden animate-slide-in-right z-10'
      : 'sheet-panel rounded-3xl bg-white border border-slate-200 overflow-hidden'}
      style={{ boxShadow: '0 18px 48px -16px rgba(15,23,42,0.35)' }}>
      <div className="relative overflow-hidden px-4 pt-3.5 pb-4 flex-shrink-0 text-white" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}CC)` }}>
        <div className="pointer-events-none absolute -top-14 -right-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="relative flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/75">{panel.mode === 'edit' ? 'Edit place' : panel.mode === 'link' ? selected?.name : `${T.site} map`}</p>
            <h2 className="text-[16px] font-semibold !text-white truncate mt-0.5">{panelTitle}</h2>
          </div>
          <button onClick={() => setPanel(null)} aria-label="Close" className="w-8 h-8 -mr-1 rounded-full flex items-center justify-center text-white/85 hover:bg-white/15"><X size={16} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">{panelBody}</div>
    </div>
  );

  /* ── map ── */
  let mapEl;
  if (!GOOGLE_MAPS_API_KEY) mapEl = <MapNote text="Set VITE_GOOGLE_MAPS_API_KEY to show the map." />;
  else if (loadError) mapEl = <MapNote text="Google Maps failed to load. Check the API key and billing." />;
  else if (!isLoaded) mapEl = <div className="skeleton w-full h-full" />;
  else mapEl = (
    <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={mapCenter} zoom={16}
      onLoad={(m) => { mapRef.current = m; }} onUnmount={() => { mapRef.current = null; }}
      onClick={onMapClick}
      options={{ mapTypeId: mapType, disableDefaultUI: true, zoomControl: true, fullscreenControl: desktop, gestureHandling: 'greedy', clickableIcons: false, draggableCursor: editingPin ? 'crosshair' : undefined }}>
      {places.filter(p => p.lat != null && !(editingPin && panel.mode === 'edit' && p._id === panel.id)).map(p => (
        <PlacePin key={p._id} place={p} type={site.type} selected={selected?._id === p._id && !editingPin} onClick={openPlace} />
      ))}
      {/* Selected place in view mode: a draggable handle under its pin */}
      {panel?.mode === 'view' && selected && (
        <MarkerF position={{ lat: selected.lat, lng: selected.lng }} draggable opacity={0.01} cursor="grab" title="Drag to move"
          onDragEnd={(e) => movePlace(selected, { lat: e.latLng.lat(), lng: e.latLng.lng() })} />
      )}
      {editingPin && draft.lat != null && (
        <MarkerF position={{ lat: draft.lat, lng: draft.lng }} draggable animation={window.google?.maps?.Animation?.DROP}
          onDragEnd={(e) => setDraft(d => ({ ...d, lat: e.latLng.lat(), lng: e.latLng.lng() }))} />
      )}
    </GoogleMap>
  );

  const typeToggle = isLoaded && GOOGLE_MAPS_API_KEY && (
    <div className="absolute top-3 left-3 z-[5] flex p-0.5 rounded-xl bg-white/95 backdrop-blur shadow-md">
      {[['roadmap', MapIcon, 'Map'], ['hybrid', Layers, 'Satellite']].map(([v, I, l]) => (
        <button key={v} onClick={() => setMapType(v)}
          className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px] font-semibold transition-all ${mapType === v ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
          <I size={13} /> {l}
        </button>
      ))}
    </div>
  );

  const list = (
    <div className="rounded-2xl bg-white border border-slate-200/70 overflow-hidden flex flex-col min-h-0">
      <div className="p-3 border-b border-slate-100">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="w-full rounded-xl bg-slate-50 border border-slate-200 pl-9 pr-8 py-2 text-[13px] outline-none focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            placeholder="Search places…" value={q} onChange={e => setQ(e.target.value)} />
          {q && <button onClick={() => setQ('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"><X size={14} /></button>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-11 rounded-xl" />)}</div>
        ) : unavailable ? (
          <p className="p-4 text-[12.5px] text-slate-500">Places aren’t available on the server yet. They’ll appear here once it’s updated.</p>
        ) : !places.length ? (
          <div className="p-5 text-center">
            <span className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #34D399, #059669)' }}><MapPin size={20} className="text-white" /></span>
            <p className="text-[13px] font-semibold text-slate-800 mt-3">No places yet</p>
            <p className="text-[12px] text-slate-400 mt-1">{site.type === 'university' ? 'Add your halls, faculties and gates' : 'Add buildings, gates and other places'} so visitors get directions to the right spot.</p>
            <button onClick={startAdd} className="btn-primary !text-[12.5px] !px-3 !py-2 mt-3 gap-1.5"><Plus size={14} /> Add place</button>
          </div>
        ) : !filtered.length ? (
          <p className="p-4 text-[12.5px] text-slate-400 text-center">Nothing matches “{q}”</p>
        ) : groups.map(([kind, items]) => {
          const k = KIND_INFO[kind];
          return (
            <div key={kind} className="py-1.5">
              <div className="px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: k.color }}>
                <k.Icon size={11} /> {kindLabel(kind, site.type)} <span className="text-slate-300 font-semibold">· {items.length}</span>
              </div>
              {items.map(p => {
                const sel = selected?._id === p._id;
                return (
                  <button key={p._id} onClick={() => openPlace(p)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-slate-50"
                    style={{ background: sel ? `${k.color}0F` : undefined, boxShadow: `inset 3px 0 0 ${sel ? k.color : 'transparent'}` }}>
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${k.color}, ${k.color}CC)` }}><k.Icon size={13} className="text-white" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-semibold text-slate-900 truncate">{p.name}</span>
                      <span className="block text-[11px] text-slate-400 truncate">{p.stats?.units ? `${p.stats.occupied}/${p.stats.units} occupied` : p.block ? blockName(p.block, T) : p.description || p.address || ' '}</span>
                    </span>
                    {p.isPublic === false && <EyeOff size={12} className="text-slate-300 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="max-w-[1500px] mx-auto space-y-5 animate-fade-in">
      <div className="dash-rise flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900" style={{ letterSpacing: '-0.025em' }}>{T.site} map</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">{site.type === 'university' ? 'Halls, faculties, gates and more' : 'Buildings, gates and more'} on Google Maps, with directions for visitors.</p>
        </div>
        <button onClick={startAdd} disabled={unavailable} className={HEADER_BTN_PRIMARY}><Plus size={15} /> Add place</button>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatTile i={0} label="Places" value={counts.total} Icon={MapPin} color="#10B981" hint="On the map" />
        <StatTile i={1} label={kindLabel('hall', site.type)} value={counts.halls} Icon={KIND_INFO.hall.Icon} color={KIND_INFO.hall.color} hint={`${counts.linked} ${T.units.toLowerCase()} linked`} />
        <StatTile i={2} label="Gates" value={counts.gates} Icon={KIND_INFO.gate.Icon} color={KIND_INFO.gate.color} hint="Entry points" />
        <StatTile i={3} label={T.units} value={units.length} Icon={Home} color="#6366F1" hint={`In your ${T.site.toLowerCase()}`} />
      </div>

      {desktop ? (
        <div className="dash-rise grid gap-4 grid-cols-[300px_minmax(0,1fr)]" style={{ animationDelay: '300ms', height: 'calc(100vh - 290px)', minHeight: 520 }}>
          {list}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200/70 bg-slate-100">
            {mapEl}
            {typeToggle}
            {editingPin && <div className="absolute bottom-3 left-3 z-[5] px-3 py-1.5 rounded-full bg-slate-900/85 text-white text-[11.5px] font-semibold">Click the map or drag the pin</div>}
            {panelEl}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-slate-200/70 bg-slate-100" style={{ height: 360 }}>
            {mapEl}
            {typeToggle}
          </div>
          {panelEl}
          <div style={{ maxHeight: 520 }} className="flex">{list}</div>
        </div>
      )}
    </div>
  );
}

function MapNote({ text }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-center p-6" style={{ background: 'linear-gradient(135deg, #ECFDF5, #F0F9FF)' }}>
      <MapPin size={24} className="text-emerald-500" />
      <p className="text-[12.5px] font-semibold text-slate-600">{text}</p>
    </div>
  );
}
