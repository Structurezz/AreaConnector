import { useEffect, useState } from 'react';
import {
  ArrowLeft, Megaphone, Mic, MicOff, Users, X, Loader2, Music, Volume2, VolumeX, Volume1,
  SkipForward, Clock3, TrendingUp, Heart, Smile, Bell, Search, Check, ListChecks, Radio,
} from 'lucide-react';
import { ReactionLayer, ChatPanel, useMicLevel } from '../podcast/StudioPanels';

const RED = '#EF4444';
const RED_DARK = '#DC2626';

const fmtDur = (ms) => {
  const s = Math.floor(ms / 1000); const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};
const ago = (d) => {
  const h = Math.round((Date.now() - new Date(d)) / 3_600_000);
  return h < 1 ? 'just now' : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

const TEMPLATES = [
  ['🚰', 'Water will be off from 10am to 2pm today'],
  ['⚡', 'Power update — generator schedule change'],
  ['🛡️', 'Security notice — please read'],
  ['🚪', 'Main gate will be closed for repairs'],
  ['📅', 'Reminder: estate meeting this Saturday'],
  ['🧹', 'Environmental sanitation this weekend'],
];

const Panel = ({ title, Icon, color, right, children, className = '', style }) => (
  <div className={`dash-rise rounded-2xl bg-white border border-slate-200/70 overflow-hidden ${className}`} style={style}>
    <div className="flex items-center justify-between px-4 h-12 border-b border-slate-100 flex-none">
      <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
        <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: color }}><Icon size={12} className="text-white" /></span>
        {title}
      </h3>
      {right}
    </div>
    {children}
  </div>
);

// Compact horizontal fader for the console (MixerDeck's Fader is vertical)
function HFader({ label, value, max = 100, color, Icon, disabled, onChange, presets = [] }) {
  return (
    <div className={`p-3 rounded-xl bg-black/25 border border-white/10 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5"><Icon size={12} /> {label}</span>
        <span className="text-[13px] font-semibold tabular-nums">{value}<span className="text-[10px] text-white/50 ml-0.5">%</span></span>
      </div>
      <input type="range" min="0" max={max} value={value} disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full mt-2 cursor-pointer disabled:cursor-not-allowed" style={{ accentColor: color }} />
      <div className="flex gap-1.5 mt-1.5">
        {presets.map(([l, v]) => (
          <button key={l} disabled={disabled} onClick={() => onChange(v)}
            className="px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors"
            style={value === v ? { background: color, borderColor: color, color: '#0F172A' } : { borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)' }}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

const thumb = (videoId) => `https://i.ytimg.com/vi/${videoId}/default.jpg`;

/* ── Before going live ─────────────────────────────────────────────────── */
export function BroadcastSetupDesktop({
  user, headline, setHeadline, bgTrack, setBgTrack, library, starting, onGoLive, onBack,
  residentCount, recent,
}) {
  const [q, setQ] = useState('');
  const [testStream, setTestStream] = useState(null);
  const level = useMicLevel(testStream, !!testStream);
  useEffect(() => () => testStream?.getTracks().forEach(t => t.stop()), [testStream]);

  const toggleTest = async () => {
    if (testStream) { testStream.getTracks().forEach(t => t.stop()); setTestStream(null); return; }
    try { setTestStream(await navigator.mediaDevices.getUserMedia({ audio: true })); } catch { /* shown below */ setTestStream(null); }
  };
  const goLive = () => { testStream?.getTracks().forEach(t => t.stop()); setTestStream(null); onGoLive(); };

  const term = q.trim().toLowerCase();
  const crate = library.filter(t => !term || `${t.title} ${t.artist || ''}`.toLowerCase().includes(term));
  const first = user?.name?.split(' ')[0] || 'there';
  const MAX = 120;

  return (
    <div className="max-w-[1200px] mx-auto pb-10">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900 mb-4 transition-colors">
        <ArrowLeft size={14} /> Announcements
      </button>

      <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          {/* Composer */}
          <div className="dash-rise relative overflow-hidden rounded-2xl p-7 text-white"
            style={{ background: 'linear-gradient(130deg, #F43F5E 0%, #EF4444 45%, #B91C1C 100%)', boxShadow: '0 18px 36px -20px rgba(220,38,38,0.9)' }}>
            <div className="dash-blob absolute -top-20 right-10 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(254,205,211,0.35)' }} />
            <Megaphone size={170} className="absolute -right-8 -bottom-10 text-white/[0.08] -rotate-12 pointer-events-none" />
            <div className="relative max-w-xl">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/15 border border-white/25"><Radio size={11} /> Live announcement</span>
              <h1 className="mt-3 text-[24px] font-semibold" style={{ letterSpacing: '-0.025em', color: '#fff' }}>Speak to the whole estate, {first}</h1>
              <p className="mt-1 text-[13px] text-white/80">
                Every resident gets an instant notification and can tap in to hear you live. Best for things they need to know right now.
              </p>

              <div className="mt-5 flex items-end justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-white/75">Headline · shown on their banner</label>
                <span className="text-[11px] text-white/60 tabular-nums">{headline.length}/{MAX}</span>
              </div>
              <input value={headline} maxLength={MAX} onChange={e => setHeadline(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && headline.trim() && !starting) goLive(); }}
                placeholder="e.g. Water will be off from 10am–2pm"
                className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl bg-white/15 border border-white/30 text-[14px] text-white placeholder-white/55 outline-none focus:bg-white/20 focus:border-white/60 transition-colors" />

              <div className="mt-3 flex flex-wrap gap-1.5">
                {TEMPLATES.map(([emoji, text]) => (
                  <button key={text} type="button" onClick={() => setHeadline(text)}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/12 border border-white/25 hover:bg-white/25 transition-colors"
                    style={{ background: headline === text ? 'rgba(255,255,255,0.3)' : undefined }}>
                    {emoji} {text.split(' — ')[0].replace(/ (today|this .*)$/, '')}
                  </button>
                ))}
              </div>

              <button onClick={goLive} disabled={starting || !headline.trim()}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-white font-semibold text-[14px] transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
                style={{ color: RED_DARK, boxShadow: '0 10px 22px -10px rgba(0,0,0,0.4)' }}>
                {starting ? <><Loader2 size={16} className="animate-spin" /> Preparing…</> : <><Megaphone size={16} /> Go live to {residentCount ? `${residentCount} resident${residentCount !== 1 ? 's' : ''}` : 'the estate'}</>}
              </button>
              <p className="mt-2.5 text-[11px] text-white/65 text-center">Needs microphone access · press Enter to go live</p>
            </div>
          </div>

          {/* Banner preview + mic check */}
          <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4">
            <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 p-4" style={{ animationDelay: '60ms' }}>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Bell size={12} /> What residents will see</div>
              <div className="mt-3 rounded-2xl p-3 flex items-start gap-3 border" style={{ background: 'linear-gradient(135deg,#FEF2F2,#FFFFFF)', borderColor: '#FECACA' }}>
                <span className="relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${RED}, ${RED_DARK})` }}>
                  <Megaphone size={15} className="text-white" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white animate-pulse" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold tracking-wider text-red-600">LIVE NOW</span>
                    <span className="text-[10px] text-slate-400">· {user?.name || 'Estate manager'}</span>
                  </div>
                  <div className="text-[13px] font-semibold text-slate-900 mt-0.5 break-words">{headline.trim() || 'Your headline appears here'}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Tap to listen{bgTrack ? ` · 🎵 ${bgTrack.title}` : ''}</div>
                </div>
              </div>
            </div>

            <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 p-4 flex flex-col" style={{ animationDelay: '100ms' }}>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Mic size={12} /> Mic check</div>
              <div className="flex-1 flex items-center gap-3 mt-3">
                <button onClick={toggleTest}
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                  style={testStream ? { background: `linear-gradient(135deg, ${RED}, ${RED_DARK})`, color: '#fff' } : { background: '#F1F5F9', color: '#475569' }}>
                  {testStream ? <Mic size={18} /> : <MicOff size={18} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-end gap-[3px] h-7">
                    {Array.from({ length: 18 }, (_, i) => {
                      const on = testStream && level * 18 > i;
                      return <span key={i} className="flex-1 rounded-sm transition-all duration-75"
                        style={{ height: `${30 + (i / 18) * 70}%`, background: on ? (i > 14 ? '#F59E0B' : '#10B981') : '#E2E8F0' }} />;
                    })}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">{testStream ? (level > 0.08 ? 'Sounding good 👍' : 'Say something…') : 'Test your mic before going live'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="dash-rise grid grid-cols-3 gap-3" style={{ animationDelay: '140ms' }}>
            {[
              ['🔔', 'Instant reach', 'Every resident gets a push notification and a banner in the app.'],
              ['🎚️', 'Soft music bed', 'Optional background track, ducked low under your voice.'],
              ['💬', 'Hear them back', 'Residents react and chat while you speak.'],
            ].map(([e, t, d]) => (
              <div key={t} className="rounded-2xl bg-white border border-slate-200/70 p-4">
                <div className="text-[18px]">{e}</div>
                <div className="text-[13px] font-semibold text-slate-900 mt-1.5">{t}</div>
                <div className="text-[12px] text-slate-500 mt-0.5 leading-snug">{d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Aside */}
        <div className="space-y-4">
          <Panel title="Background music" Icon={Music} color={RED} style={{ animationDelay: '60ms' }}
            right={<span className="text-[12px] text-slate-400">Optional</span>}>
            <div className="p-3 space-y-2">
              <button onClick={() => setBgTrack(null)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl border text-left transition-colors"
                style={!bgTrack ? { borderColor: RED, background: '#FEF2F2' } : { borderColor: '#E2E8F0' }}>
                <span className="w-11 h-8 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0"><VolumeX size={13} className="text-slate-500" /></span>
                <span className="flex-1 text-[12px] font-semibold text-slate-800">Voice only</span>
                {!bgTrack && <Check size={14} style={{ color: RED }} />}
              </button>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search the Lounge library"
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[12px] outline-none focus:bg-white focus:border-slate-300" />
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto pb-2">
              {crate.length === 0 && <p className="px-4 py-4 text-[12px] text-slate-400 text-center">{term ? 'No tracks match.' : 'The Lounge library is empty.'}</p>}
              {crate.map(t => {
                const on = bgTrack?.videoId === t.videoId;
                return (
                  <button key={t._id || t.videoId} onClick={() => setBgTrack({ videoId: t.videoId, title: t.title, artist: t.artist })}
                    className="w-full flex items-center gap-2.5 px-4 py-1.5 text-left hover:bg-slate-50 transition-colors"
                    style={on ? { background: '#FEF2F2' } : undefined}>
                    <img src={thumb(t.videoId)} alt="" loading="lazy" className="w-11 h-8 rounded-md object-cover flex-shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className={`block text-[12px] truncate ${on ? 'font-semibold text-red-700' : 'font-medium text-slate-800'}`}>{t.title}</span>
                      <span className="block text-[11px] text-slate-400 truncate">{t.artist || 'Lounge library'} · {t.votes?.length || 0} votes</span>
                    </span>
                    {on && <Check size={14} style={{ color: RED }} />}
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel title="Recent announcements" Icon={Megaphone} color="#F59E0B" style={{ animationDelay: '100ms' }}>
            {recent.length === 0 ? (
              <p className="px-4 py-4 text-[12px] text-slate-400">No announcements yet.</p>
            ) : (
              <div className="py-1.5">
                {recent.map(a => (
                  <div key={a._id} className="px-4 py-2">
                    <div className="text-[12px] font-semibold text-slate-800 truncate">{a.isPinned ? '📌 ' : ''}{a.title}</div>
                    <div className="text-[11px] text-slate-400">{ago(a.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ── On air ────────────────────────────────────────────────────────────── */
const NOTES_KEY = 'ac_announce_points';

function TalkingPoints() {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(NOTES_KEY)) || []; } catch { return []; }
  });
  const [draft, setDraft] = useState('');
  const save = (next) => { setItems(next); try { localStorage.setItem(NOTES_KEY, JSON.stringify(next)); } catch { /* storage blocked */ } };
  const add = () => { const t = draft.trim(); if (!t) return; save([...items, { id: Date.now(), text: t, done: false }]); setDraft(''); };

  return (
    <Panel title="Talking points" Icon={ListChecks} color="#6366F1"
      right={<span className="text-[12px] text-slate-400">{items.filter(i => i.done).length}/{items.length} covered</span>}>
      <div className="p-3 space-y-1">
        {items.length === 0 && <p className="text-[12px] text-slate-400 px-1 py-1">Jot down what you need to cover, then tick each one off as you go.</p>}
        {items.map(i => (
          <div key={i.id} className="group flex items-start gap-2.5 px-1 py-1">
            <button onClick={() => save(items.map(x => x.id === i.id ? { ...x, done: !x.done } : x))}
              className="w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors"
              style={i.done ? { background: '#6366F1', borderColor: '#6366F1' } : { borderColor: '#CBD5E1' }}>
              {i.done && <Check size={12} className="text-white" strokeWidth={3} />}
            </button>
            <span className={`flex-1 text-[13px] leading-snug ${i.done ? 'line-through text-slate-400' : 'text-slate-800'}`}>{i.text}</span>
            <button onClick={() => save(items.filter(x => x.id !== i.id))} aria-label="Remove"
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-300 hover:text-red-500 transition-all"><X size={13} /></button>
          </div>
        ))}
        <div className="flex gap-2 pt-1.5">
          <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Add a point — e.g. Which blocks are affected"
            className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[12px] outline-none focus:bg-white focus:border-slate-300" />
          <button onClick={add} className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white" style={{ background: '#6366F1' }}>Add</button>
        </div>
      </div>
    </Panel>
  );
}

export function BroadcastStudioDesktop({
  session, user, live, level, elapsed, peak, engagement, current, library, onChangeTrack,
  musicVol, applyVolume, iframeRef, onEnd, shellRef, shellHeight,
}) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  const VolIcon = musicVol === 0 ? VolumeX : musicVol < 40 ? Volume1 : Volume2;
  const others = library.filter(t => t.videoId !== current?.videoId).slice(0, 20);

  return (
    <div ref={shellRef} className="max-w-[1500px] mx-auto flex flex-col gap-4" style={shellHeight ? { height: shellHeight } : undefined}>
      {/* On-air bar */}
      <div className="dash-rise flex-none flex items-center justify-between gap-4 px-5 py-3 rounded-2xl bg-slate-900 text-white">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 flex-shrink-0">
            <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-red-400 animate-ping" /><span className="relative w-2 h-2 rounded-full bg-red-500" /></span>
            <span className="text-[11px] font-bold tracking-wider text-red-300">ON AIR</span>
          </span>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold truncate">{session.message || session.title}</div>
            <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5"><Megaphone size={11} /> Announcement from {user?.name || 'the manager'}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {[
            [Clock3, fmtDur(elapsed), 'On air', '#CBD5E1'],
            [Users, live.listenerCount, 'Listening', '#7DD3FC'],
            [TrendingUp, peak, 'Peak', '#A7F3D0'],
            [Heart, engagement.likes, 'Likes', '#FDA4AF'],
            [Smile, engagement.reactionCount, 'Reactions', '#FDE68A'],
          ].map(([Icon, v, label, color]) => (
            <div key={label} title={label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[12px] tabular-nums">
              <Icon size={13} style={{ color }} /> <span className="font-semibold">{v}</span>
            </div>
          ))}
          {confirmEnd ? (
            <span className="ml-1 inline-flex items-center gap-1.5">
              <span className="text-[12px] text-slate-300">End for everyone?</span>
              <button onClick={onEnd} className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold text-[12px]">End</button>
              <button onClick={() => setConfirmEnd(false)} className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[12px]">Keep going</button>
            </span>
          ) : (
            <button onClick={() => setConfirmEnd(true)}
              className="ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold text-[12px] transition-colors">
              <X size={13} /> End announcement
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
        <div className="h-full min-h-0 overflow-y-auto no-scrollbar space-y-4 min-w-0">
          {/* Console: mic (primary) + music bed */}
          <div className="relative overflow-hidden rounded-2xl text-white" style={{ background: 'linear-gradient(150deg, #0F172A 0%, #450A0A 60%, #B91C1C 160%)' }}>
            <div className="dash-blob absolute -top-24 left-1/4 w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(239,68,68,0.28)' }} />
            <ReactionLayer reactions={engagement.reactions} />
            <div className="relative grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] divide-x divide-white/10">
              {/* Mic */}
              <div className="p-5 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5"><Mic size={12} /> Your mic</span>
                  <span className="text-[11px] font-medium" style={{ color: live.micOn ? '#A7F3D0' : '#FCA5A5' }}>{live.micOn ? 'Everyone can hear you' : 'Muted'}</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center py-4">
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    {live.micOn && (
                      <>
                        <span className="absolute inset-0 rounded-full transition-transform duration-100" style={{ background: 'rgba(239,68,68,0.14)', transform: `scale(${1 + level * 0.5})` }} />
                        <span className="absolute inset-6 rounded-full transition-transform duration-100" style={{ background: 'rgba(239,68,68,0.24)', transform: `scale(${1 + level * 0.3})` }} />
                      </>
                    )}
                    <button onClick={live.toggleMic} aria-label={live.micOn ? 'Mute mic' : 'Unmute mic'}
                      className="relative w-28 h-28 rounded-full flex items-center justify-center transition-all hover:scale-105"
                      style={live.micOn ? { background: `linear-gradient(135deg, ${RED}, ${RED_DARK})`, boxShadow: '0 16px 40px -12px rgba(239,68,68,0.9)' } : { background: '#334155' }}>
                      {live.micOn ? <Mic size={40} /> : <MicOff size={40} />}
                    </button>
                  </div>
                  <div className="mt-3 text-[18px] font-semibold text-center leading-snug max-w-md break-words">{session.message || session.title}</div>
                  <div className="mt-1 text-[12px] text-white/55">{live.micOn ? 'Speak clearly' : 'Tap to unmute'} · press <kbd className="px-1 rounded bg-white/10 text-white/80">M</kbd> to toggle</div>
                </div>
                <HFader label="Mic level" value={Math.round((live.micGain || 1) * 100)} max={200}
                  onChange={(v) => live.setMicGain((v || 0) / 100)} color="#34D399" Icon={Mic}
                  presets={[['Low', 80], ['Normal', 100], ['Hot', 150]]} />
              </div>

              {/* Music bed */}
              <div className="p-5 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5"><Music size={12} /> Music bed</span>
                  <span className="text-[11px] font-medium" style={{ color: current ? '#A7F3D0' : 'rgba(255,255,255,0.4)' }}>{current ? 'Playing softly' : 'Voice only'}</span>
                </div>
                <div className="relative mt-3 w-full aspect-[16/8] rounded-xl overflow-hidden bg-black/40 border border-white/10">
                  {current ? (
                    <iframe ref={iframeRef} key={current.videoId} title="Background music"
                      src={`https://www.youtube.com/embed/${current.videoId}?autoplay=1&modestbranding=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
                      allow="autoplay; encrypted-media" allowFullScreen
                      onLoad={() => setTimeout(() => applyVolume(musicVol), 400)}
                      className="absolute inset-0 w-full h-full border-0" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/45 text-[13px] text-center px-4">
                      <VolumeX size={26} /> No background music — residents hear just your voice
                    </div>
                  )}
                </div>
                <div className="mt-3 text-[13px] font-semibold truncate">{current?.title || 'Voice only'}</div>
                <div className="text-[11px] text-white/50 truncate">{current?.artist || (current ? 'Lounge library' : 'Pick a track below to add a soft music bed')}</div>
                <div className="mt-3">
                  <HFader label="Music · everyone" value={musicVol} disabled={!current} onChange={applyVolume}
                    color="#FCA5A5" Icon={VolIcon}
                    presets={[['Duck', 10], ['Bed', 20], ['Up', 50], ['Mute', 0]]} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            <TalkingPoints />
            <Panel title="Music library" Icon={SkipForward} color={RED}
              right={<span className="text-[12px] text-slate-400">Tap to switch</span>}>
              <div className="max-h-[300px] overflow-y-auto py-1.5">
                {others.length === 0 && <p className="px-4 py-5 text-[12px] text-slate-400 text-center">No other tracks in the Lounge library.</p>}
                {others.map(t => (
                  <button key={t._id || t.videoId} onClick={() => onChangeTrack(t)}
                    className="group w-full flex items-center gap-2.5 px-4 py-1.5 text-left hover:bg-slate-50 transition-colors">
                    <img src={thumb(t.videoId)} alt="" loading="lazy" className="w-11 h-8 rounded-md object-cover flex-shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12px] font-medium text-slate-800 truncate">{t.title}</span>
                      <span className="block text-[11px] text-slate-400 truncate">{t.artist || 'Lounge library'}</span>
                    </span>
                    <SkipForward size={13} className="text-slate-300 group-hover:text-red-500 transition-colors" />
                  </button>
                ))}
              </div>
            </Panel>
          </div>
        </div>

        {/* Right rail: live chat, likes and reactions from listeners */}
        <div className="h-full min-h-0">
          <ChatPanel engagement={engagement} accent={RED} />
        </div>
      </div>
    </div>
  );
}
