import { useEffect, useMemo, useState } from 'react';
import {
  Radio, Mic, Play, Clock, Calendar, Headphones, Trash2, ListMusic, Repeat, Search, X,
  BarChart3, Disc3, Flame, Sparkles,
} from 'lucide-react';
import DJLive from './DJLive';
import useCountUp from '../hooks/useCountUp';
import { useSite } from '../context/SiteContext';
import { lower, withAn } from '../utils/siteTypes';

const useW = () => { const { terms: T, isEstate: E } = useSite(); return { T, E, site: lower(T.site), Site: T.site, member: lower(T.member), Member: T.member, members: lower(T.members), Members: T.members }; };

const fmtMin = (s) => `${Math.round((s || 0) / 60)} min`;
const fmtClock = (s) => `${Math.floor((s || 0) / 60)}:${String(Math.floor((s || 0) % 60)).padStart(2, '0')}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

// Cover colours for items without artwork — stable per title
const COVERS = [
  ['#6366F1', '#8B5CF6'], ['#EC4899', '#8B5CF6'], ['#0EA5E9', '#6366F1'],
  ['#F59E0B', '#EC4899'], ['#10B981', '#0EA5E9'], ['#8B5CF6', '#DB2777'],
];
const coverFor = (s = '') => COVERS[[...s].reduce((t, c) => t + c.charCodeAt(0), 0) % COVERS.length];

function Equalizer({ bars = 5, className = '', color = '#fff' }) {
  return (
    <div className={`dash-eq flex items-end gap-[3px] ${className}`} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} className="w-[3px] h-full rounded-full" style={{ background: color, animationDelay: `${(i * 137) % 900}ms` }} />
      ))}
    </div>
  );
}

// Spinning record with the item's artwork (or a gradient) as the label
function Vinyl({ image, colors, spinning = true, size = 150 }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full shadow-[0_18px_40px_-18px_rgba(15,23,42,0.6)]"
        style={{
          background: 'repeating-radial-gradient(circle at 50% 50%, #111827 0 2px, #1F2937 2px 4px)',
          animation: spinning ? 'dashRadar 6s linear infinite' : 'none',
        }}>
        <div className="absolute rounded-full overflow-hidden border-4 border-slate-900"
          style={{ inset: size * 0.3, background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}>
          {image && <img src={image} alt="" className="w-full h-full object-cover" />}
        </div>
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-slate-100" />
        <span className="absolute inset-0 rounded-full pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.18), transparent 45%)' }} />
      </div>
    </div>
  );
}

function SectionHead({ Icon, color, title, count, right }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
        <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 4px 10px -4px ${color}` }}>
          <Icon size={12} className="text-white" />
        </span>
        {title}
        {count != null && <span className="text-[12px] font-normal text-slate-400">· {count}</span>}
      </h2>
      {right}
    </div>
  );
}

function Stat({ i, label, value, suffix = '', Icon, color }) {
  const n = useCountUp(value || 0);
  return (
    <div className="dash-rise group relative overflow-hidden rounded-2xl p-4 border bg-white transition-all hover:-translate-y-0.5"
      style={{ animationDelay: `${120 + i * 60}ms`, background: `linear-gradient(140deg, ${color}14 0%, #FFFFFF 60%)`, borderColor: `${color}2E` }}>
      <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 14px -6px ${color}` }}>
        <Icon size={15} className="text-white" />
      </span>
      <div className="mt-3 text-[22px] font-semibold text-slate-900 tabular-nums leading-none" style={{ letterSpacing: '-0.03em' }}>{n.toLocaleString()}{suffix}</div>
      <div className="mt-1 text-[12px] font-medium text-slate-500">{label}</div>
    </div>
  );
}

function useCountdown(target) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!target) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return 'Starting soon';
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
  return d ? `${d}d ${h}h ${m}m` : `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

/* ── Spotlight ─────────────────────────────────────────────────── */

function Spotlight({ activeDJ, liveFM, next, latest, onPlay, onStart }) {
  const W = useW();
  const countdown = useCountdown(!activeDJ && !liveFM ? next?.scheduledAt : null);
  const live = activeDJ || liveFM;

  if (activeDJ) {
    return (
      <div className="dash-rise h-full rounded-2xl border border-red-200 bg-white p-5" style={{ background: 'linear-gradient(120deg, #FEF2F2 0%, #FFFFFF 55%)' }}>
        <div className="flex items-center gap-2 mb-3 text-[11px] font-bold uppercase tracking-wider text-red-500">
          <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-red-400 animate-ping" /><span className="relative w-2 h-2 rounded-full bg-red-500" /></span>
          On air now
        </div>
        <DJLive />
      </div>
    );
  }

  const item = liveFM || latest?.item;
  const colors = coverFor(item?.title || next?.title || 'AreaConnect');
  const image = item?.coverImage || item?.hostPhoto;

  return (
    <div className="dash-rise relative h-full overflow-hidden rounded-2xl border border-slate-200/70 p-6 flex items-center gap-7"
      style={{ background: `linear-gradient(120deg, ${colors[0]}14 0%, #FFFFFF 50%, ${colors[1]}10 100%)` }}>
      <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full opacity-40"
        style={{ background: `radial-gradient(circle, ${colors[1]}55, transparent 70%)`, animation: 'dashFloat 16s ease-in-out infinite' }} />
      <Vinyl image={image} colors={colors} spinning={!!live || !!item} />
      <div className="relative min-w-0 flex-1">
        {liveFM ? (
          <>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-red-500">
              <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-red-400 animate-ping" /><span className="relative w-2 h-2 rounded-full bg-red-500" /></span>
              AreaConnect FM · Live
            </div>
            <h2 className="mt-2 text-[22px] font-semibold text-slate-900 truncate" style={{ letterSpacing: '-0.025em' }}>{liveFM.title}</h2>
            <p className="mt-1 text-[13px] text-slate-500">Tune in with the floating player at the bottom of the screen.</p>
            <Equalizer bars={18} color="#EF4444" className="h-7 mt-4 opacity-70" />
          </>
        ) : next ? (
          <>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5"><Calendar size={12} /> Next on AreaConnect FM</div>
            <h2 className="mt-2 text-[22px] font-semibold text-slate-900 truncate" style={{ letterSpacing: '-0.025em' }}>{next.title}</h2>
            <p className="mt-1 text-[13px] text-slate-500">
              {next.scheduledAt ? new Date(next.scheduledAt).toLocaleString('en-NG', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Any time'}
              {next.isRecurring && ' · weekly'}
            </p>
            {countdown && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-emerald-200">
                <Clock size={14} className="text-emerald-600" />
                <span className="text-[15px] font-semibold text-slate-900 tabular-nums">{countdown}</span>
              </div>
            )}
          </>
        ) : item ? (
          <>
            <div className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: colors[0] }}><Sparkles size={12} /> Latest from your {W.site}</div>
            <h2 className="mt-2 text-[22px] font-semibold text-slate-900 truncate" style={{ letterSpacing: '-0.025em' }}>{item.title}</h2>
            <p className="mt-1 text-[13px] text-slate-500 truncate">
              {item.hostName || 'AreaConnect FM'} · {fmtMin(latest.kind === 'ep' ? item.durationSec : item.totalDurationSec)}
              {latest.kind === 'mix' && ` · ${item.setlist?.length || 0} tracks`}
            </p>
            <button onClick={() => onPlay(latest.kind, item)}
              className="mt-4 inline-flex items-center gap-2 h-10 pl-1.5 pr-4 rounded-full bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 transition-all hover:-translate-y-0.5">
              <span className="w-7 h-7 rounded-full bg-white text-slate-900 flex items-center justify-center"><Play size={13} className="ml-0.5" fill="currentColor" /></span>
              Play now
            </button>
          </>
        ) : (
          <>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Off air</div>
            <h2 className="mt-2 text-[22px] font-semibold text-slate-900" style={{ letterSpacing: '-0.025em' }}>Your {W.site}'s radio is quiet</h2>
            <p className="mt-1 text-[13px] text-slate-500">Start the first live room: a prayer, a chat or a DJ set. {W.E ? 'Neighbours' : W.Members} get notified.</p>
            <button onClick={onStart} className="mt-4 btn-primary gap-2 !text-[13px] !px-4 !py-2"><Mic size={14} /> Start a live room</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */

export default function PodcastsDesktop({ upcoming, episodes, mixtapes, activeDJ, liveFM, deleting, onPlay, onDeleteMixtape, onStart }) {
  const W = useW();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');

  const query = q.trim().toLowerCase();
  const match = (x) => !query || [x.title, x.hostName, ...(x.guestNames || [])].some((v) => (v || '').toLowerCase().includes(query));
  const mixShown = mixtapes.filter(match);
  const epShown = episodes.filter(match);

  const stats = useMemo(() => {
    const plays = [...episodes, ...mixtapes].reduce((t, x) => t + (x.playCount || 0), 0);
    const secs = episodes.reduce((t, e) => t + (e.durationSec || 0), 0) + mixtapes.reduce((t, m) => t + (m.totalDurationSec || 0), 0);
    return { plays, hours: Math.round(secs / 3600) };
  }, [episodes, mixtapes]);

  const latest = useMemo(() => {
    const all = [
      ...episodes.map((e) => ({ kind: 'ep', item: e, at: e.publishedAt || e.createdAt })),
      ...mixtapes.map((m) => ({ kind: 'mix', item: m, at: m.createdAt })),
    ].filter((x) => x.at).sort((a, b) => new Date(b.at) - new Date(a.at));
    return all[0] || null;
  }, [episodes, mixtapes]);

  const topPlayed = useMemo(() => [
    ...episodes.map((e) => ({ kind: 'ep', item: e })),
    ...mixtapes.map((m) => ({ kind: 'mix', item: m })),
  ].filter((x) => (x.item.playCount || 0) > 0).sort((a, b) => (b.item.playCount || 0) - (a.item.playCount || 0)).slice(0, 5), [episodes, mixtapes]);

  const onAir = !!(activeDJ || liveFM);
  const TABS = [['all', 'All', mixtapes.length + episodes.length], ['mix', 'Mixtapes', mixtapes.length], ['ep', 'FM episodes', episodes.length]];

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-10">
      {/* ── Header ── */}
      <div className="dash-rise flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] text-slate-500">
            {onAir ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-red-500">
                <span className="relative flex w-1.5 h-1.5"><span className="absolute inset-0 rounded-full bg-red-400 animate-ping" /><span className="relative w-1.5 h-1.5 rounded-full bg-red-500" /></span>
                On air
              </span>
            ) : <span className="inline-flex items-center gap-1.5"><Radio size={12} className="text-emerald-600" /> AreaConnect FM</span>}
          </div>
          <h1 className="mt-1 text-[22px] font-semibold text-slate-900" style={{ letterSpacing: '-0.025em' }}>Podcast</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Live rooms, mixtapes and FM shows from your {W.site}.</p>
        </div>
        <button onClick={onStart} className="group inline-flex items-center gap-1.5 h-9 text-[13px] font-semibold px-3.5 rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-all">
          <Mic size={14} /> Start a live room
        </button>
      </div>

      {/* ── Spotlight + stats ── */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 xl:col-span-8 min-h-[200px]">
          <Spotlight activeDJ={activeDJ} liveFM={liveFM} next={upcoming[0]} latest={latest} onPlay={onPlay} onStart={onStart} />
        </div>
        <div className="col-span-12 xl:col-span-4 grid grid-cols-2 gap-4">
          <Stat i={0} label="Mixtapes" value={mixtapes.length} Icon={Disc3} color="#8B5CF6" />
          <Stat i={1} label="FM episodes" value={episodes.length} Icon={ListMusic} color="#10B981" />
          <Stat i={2} label="Total plays" value={stats.plays} Icon={Headphones} color="#0EA5E9" />
          <Stat i={3} label="Hours of audio" value={stats.hours} suffix="h" Icon={Clock} color="#F59E0B" />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5 items-start">
        {/* ── Library ── */}
        <div className="col-span-12 xl:col-span-8 space-y-5 min-w-0">
          <div className="dash-rise flex items-center gap-2.5" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200">
              {TABS.map(([k, label, n]) => (
                <button key={k} onClick={() => setTab(k)}
                  className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-1.5 rounded-lg transition-all ${tab === k ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                  {label}
                  <span className={`text-[10px] font-bold px-1.5 rounded-md tabular-nums ${tab === k ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{n}</span>
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles, hosts or guests…"
                className="w-full rounded-xl bg-white border border-slate-200 pl-10 pr-9 py-2 text-sm outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
              {q && <button onClick={() => setQ('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={15} /></button>}
            </div>
          </div>

          {tab !== 'ep' && (
            <section className="dash-rise" style={{ animationDelay: '340ms' }}>
              <SectionHead Icon={Disc3} color="#8B5CF6" title="Mixtapes & live sets" count={mixShown.length} />
              {!mixShown.length ? (
                <div className="rounded-2xl bg-white border border-dashed border-slate-300 py-10 text-center text-[13px] text-slate-400">
                  {query ? 'No mixtapes match your search.' : 'No recordings yet. Live rooms are saved here when they end.'}
                </div>
              ) : (
                <div className="grid grid-cols-3 2xl:grid-cols-4 gap-4">
                  {mixShown.map((m, i) => {
                    const [c1, c2] = coverFor(m.title);
                    return (
                      <div key={m._id} className="dash-rise group rounded-2xl bg-white border border-slate-200/70 p-2.5 transition-all hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)]"
                        style={{ animationDelay: `${380 + i * 35}ms` }}>
                        <button onClick={() => onPlay('mix', m)} className="relative block w-full aspect-square rounded-xl overflow-hidden"
                          style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} aria-label={`Play ${m.title}`}>
                          {m.hostPhoto
                            ? <img src={m.hostPhoto} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            : (<>
                                <Disc3 size={44} className="absolute inset-0 m-auto text-white/35 transition-transform duration-700 group-hover:rotate-180" />
                                <Equalizer bars={14} className="absolute left-3 right-3 bottom-3 h-8 opacity-30" />
                              </>)}
                          <span className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span className="absolute right-2.5 bottom-2.5 w-10 h-10 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                            <Play size={16} className="ml-0.5" fill="currentColor" />
                          </span>
                          <span className="absolute left-2 top-2 text-[10px] font-semibold text-white px-2 py-0.5 rounded-full bg-black/30 backdrop-blur">{fmtMin(m.totalDurationSec)}</span>
                          {(m.playCount || 0) > 0 && (
                            <span className="absolute right-2 top-2 text-[10px] font-semibold text-white px-2 py-0.5 rounded-full bg-black/30 backdrop-blur flex items-center gap-1"><Headphones size={9} /> {m.playCount}</span>
                          )}
                        </button>
                        <div className="mt-2.5 px-1 flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-slate-900 truncate">{m.title}</div>
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">{m.hostName} · {m.setlist?.length || 0} tracks</div>
                          </div>
                          <button onClick={() => onDeleteMixtape(m)} disabled={deleting === m._id} aria-label="Delete from archive" title="Delete from archive"
                            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {tab !== 'mix' && (
            <section className="dash-rise" style={{ animationDelay: '400ms' }}>
              <SectionHead Icon={ListMusic} color="#10B981" title="AreaConnect FM episodes" count={epShown.length} />
              {!epShown.length ? (
                <div className="rounded-2xl bg-white border border-dashed border-slate-300 py-10 text-center text-[13px] text-slate-400">
                  {query ? 'No episodes match your search.' : 'No FM episodes published yet.'}
                </div>
              ) : (
                <div className="rounded-2xl bg-white border border-slate-200/70 overflow-hidden">
                  <div className="grid grid-cols-[44px_minmax(0,1fr)_90px_110px_64px] gap-3 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <span /><span>Episode</span><span className="text-right">Plays</span><span>Published</span><span className="text-right">Length</span>
                  </div>
                  {epShown.slice(0, 30).map((ep, i) => {
                    const [c1, c2] = coverFor(ep.title);
                    return (
                      <button key={ep._id} onClick={() => onPlay('ep', ep)}
                        className="dash-rise group w-full grid grid-cols-[44px_minmax(0,1fr)_90px_110px_64px] gap-3 items-center px-4 py-2.5 text-left border-t border-slate-50 first-of-type:border-0 hover:bg-slate-50/80 transition-colors"
                        style={{ animationDelay: `${440 + i * 25}ms` }}>
                        <span className="relative w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                          {ep.coverImage ? <img src={ep.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <Radio size={15} className="text-white/80" />}
                          <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play size={14} className="ml-0.5" fill="currentColor" />
                          </span>
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold text-slate-900 truncate">
                            {ep.episodeNumber ? <span className="text-slate-400 font-medium mr-1">#{ep.episodeNumber}</span> : null}{ep.title}
                          </span>
                          <span className="block text-[11px] text-slate-400 truncate">
                            {ep.seriesName || ep.hostName || 'AreaConnect FM'}
                            {ep.guestNames?.length > 0 && <> · with {ep.guestNames.slice(0, 2).join(', ')}{ep.guestNames.length > 2 ? '…' : ''}</>}
                          </span>
                        </span>
                        <span className="text-[12px] text-slate-500 text-right tabular-nums">{(ep.playCount || 0).toLocaleString()}</span>
                        <span className="text-[12px] text-slate-500">{fmtDate(ep.publishedAt)}</span>
                        <span className="text-[12px] text-slate-500 text-right tabular-nums">{fmtClock(ep.durationSec)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        {/* ── Rail ── */}
        <aside className="col-span-12 xl:col-span-4 space-y-4">
          {/* Schedule */}
          <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 overflow-hidden" style={{ animationDelay: '320ms' }}>
            <div className="flex items-center justify-between px-4 h-11 border-b border-slate-100">
              <h3 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}><Calendar size={12} className="text-white" /></span>
                FM schedule
              </h3>
              <span className="text-[12px] text-slate-400">{upcoming.length}</span>
            </div>
            {upcoming.length === 0 ? (
              <p className="px-4 py-5 text-[12px] text-slate-400">No shows scheduled.</p>
            ) : (
              <div className="p-2">
                {upcoming.slice(0, 6).map((s, i) => {
                  const d = s.scheduledAt ? new Date(s.scheduledAt) : null;
                  return (
                    <div key={s._id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors">
                      <span className={`w-11 text-center rounded-xl py-1 leading-none flex-shrink-0 border ${i === 0 ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-emerald-50/60 border-emerald-100'}`}>
                        <span className={`block text-[9.5px] uppercase font-semibold ${i === 0 ? 'text-white/80' : 'text-emerald-600'}`}>{d ? d.toLocaleDateString('en-NG', { month: 'short' }) : '—'}</span>
                        <span className={`block text-[16px] font-semibold ${i === 0 ? 'text-white' : 'text-slate-900'}`}>{d ? d.getDate() : '∞'}</span>
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-slate-900 truncate">{s.title}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          {d ? d.toLocaleTimeString('en-NG', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : 'Any time'}
                          {s.isRecurring && <span className="inline-flex items-center gap-0.5 px-1.5 rounded-full bg-emerald-50 text-emerald-600 font-medium"><Repeat size={9} /> Weekly</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Most played */}
          <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 overflow-hidden" style={{ animationDelay: '380ms' }}>
            <div className="flex items-center justify-between px-4 h-11 border-b border-slate-100">
              <h3 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}><Flame size={12} className="text-white" /></span>
                Most played
              </h3>
              <BarChart3 size={14} className="text-slate-300" />
            </div>
            {!topPlayed.length ? (
              <p className="px-4 py-5 text-[12px] text-slate-400">Plays show up here once {W.members} start listening.</p>
            ) : (
              <div className="p-2">
                {topPlayed.map(({ kind, item }, i) => {
                  const max = topPlayed[0].item.playCount || 1;
                  return (
                    <button key={item._id} onClick={() => onPlay(kind, item)} className="group w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left hover:bg-slate-50 transition-colors">
                      <span className={`w-6 text-center text-[13px] font-semibold tabular-nums ${i === 0 ? 'text-orange-500' : 'text-slate-400'}`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-slate-900 truncate group-hover:text-violet-700 transition-colors">{item.title}</div>
                        <div className="mt-1 h-1 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${((item.playCount || 0) / max) * 100}%`, background: 'linear-gradient(90deg, #FDBA74, #F97316)', transformOrigin: 'left', animation: `dashGrowX 0.9s cubic-bezier(0.16,1,0.3,1) ${400 + i * 70}ms both` }} />
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 tabular-nums flex items-center gap-1"><Headphones size={10} />{item.playCount}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Go live */}
          <button onClick={onStart}
            className="dash-rise group w-full relative overflow-hidden rounded-2xl p-4 text-left border border-violet-100 transition-all hover:-translate-y-0.5"
            style={{ animationDelay: '440ms', background: 'linear-gradient(135deg, #F5F3FF, #EEF2FF 60%, #FFFFFF)' }}>
            <div className="relative flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)', boxShadow: '0 8px 18px -8px #6366F1' }}>
                <Mic size={18} />
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-slate-900">Host a live room</div>
                <div className="text-[11.5px] text-slate-500">Prayer, chat, DJ set or FM show</div>
              </div>
              <Equalizer bars={5} color="#8B5CF6" className="ml-auto h-6" />
            </div>
          </button>
        </aside>
      </div>
    </div>
  );
}
