import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Megaphone, Mic, MicOff, Users, X, Loader2, Music, Volume2, VolumeX, Volume1,
  SkipForward, Bell, Check, ListChecks,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth }    from '../context/AuthContext';
import { useSocket }  from '../context/SocketContext';
import { djAPI, loungeAPI, estateAPI, announcementAPI } from '../api';
import { useLiveAudio } from '../hooks/useLiveAudio';
import { Fader }      from '../components/MixerDeck';
import AudiencePanel  from '../components/AudiencePanel';
import Portal from '../components/ui/Portal';
import useIsDesktop from '../hooks/useIsDesktop';
import useFillHeight from '../hooks/useFillHeight';
import { useRoomEngagement, useMicLevel } from '../components/podcast/StudioPanels';
import { BroadcastSetupDesktop, BroadcastStudioDesktop, TalkingPoints, TEMPLATES } from '../components/announcements/BroadcastDesktop';
import MobileHostStudio from '../components/podcast/MobileHostStudio';
import SetupSteps, { MicCheck } from '../components/podcast/SetupSteps';

const RED      = '#EF4444';
const RED_DARK = '#DC2626';

const fmtDur = (ms) => {
  const s = Math.floor(ms / 1000); const m = Math.floor(s / 60); const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
};

export default function AnnouncementBroadcast() {
  const { user } = useAuth();
  const { emit } = useSocket() || {};
  const navigate = useNavigate();

  const [session, setSession]     = useState(null);
  const [headline, setHeadline]   = useState('');
  const [starting, setStarting]   = useState(false);
  const [elapsed, setElapsed]     = useState(0);
  const [peak, setPeak]           = useState(0);
  const [library, setLibrary]     = useState([]);
  const [bgTrack, setBgTrack]     = useState(null);  // { videoId, title, artist } or null
  const [current, setCurrent]     = useState(null);
  const [musicVol, setMusicVol]   = useState(20);    // very quiet background — voice is the point
  const [showPicker, setPicker]   = useState(false);

  const [rawStream, setRawStream] = useState(null);
  const [residentCount, setResidentCount] = useState(0);
  const [recent, setRecent]       = useState([]);

  const startRef  = useRef(0);
  const iframeRef = useRef(null);
  const shellRef  = useRef(null);
  const isDesktop = useIsDesktop();

  const live = useLiveAudio({
    roomType: 'dj',
    roomId:   session?._id || null,
    role:     'host',
    enabled:  !!session,
  });

  const engagement  = useRoomEngagement(session?._id);
  const level       = useMicLevel(rawStream, !!session && live.micOn);
  const shellHeight = useFillHeight(shellRef, !!session && isDesktop, { min: 560 });

  useEffect(() => {
    loungeAPI.getSession().then(({ data }) => setLibrary(data.data?.suggestions || [])).catch(() => {});
  }, []);

  // Desktop setup screen: who'll be notified, and what was said recently
  useEffect(() => {
    if (!isDesktop) return;
    estateAPI.getStats().then(({ data }) => setResidentCount(data.data?.totalResidents || 0)).catch(() => {});
    announcementAPI.getAll({ limit: 4 }).then(({ data }) => setRecent(data.data || [])).catch(() => {});
  }, [isDesktop]);

  // M toggles the mic while live (not while typing)
  useEffect(() => {
    if (!session) return;
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'm' || e.key === 'M') { e.preventDefault(); live.toggleMic(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session, live]);

  useEffect(() => { if (live.listenerCount > peak) setPeak(live.listenerCount); }, [live.listenerCount, peak]);

  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setElapsed(Date.now() - startRef.current), 1000);
    return () => clearInterval(id);
  }, [session]);

  const sortedLibrary = useMemo(() =>
    [...library].sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0)), [library]);

  const applyVolume = (v) => {
    setMusicVol(v);
    try { iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [v] }), '*'); } catch {}
    if (session && emit) emit('dj:volume', { sessionId: session._id, volume: v });
  };

  const goLive = async () => {
    if (!headline.trim()) return toast.error('Give the announcement a headline');
    try {
      setStarting(true);
      const stream = await live.getLocalStream();
      setRawStream(live.getRawStream?.() || stream);
      const { data } = await djAPI.start({
        kind: 'announcement',
        title: `Announcement from ${user?.name || 'the manager'}`,
        message: headline.trim(),
        nowPlaying: bgTrack
          ? { videoId: bgTrack.videoId, title: bgTrack.title, artist: bgTrack.artist }
          : {},
      });
      startRef.current = Date.now();
      setSession(data.data);
      if (bgTrack) setCurrent(bgTrack);
      toast.success('📢 Live — speak clearly');
    } catch (e) {
      console.error('[announcement.goLive]', e);
      const serverMsg = e.response?.data?.message;
      const micErrors = {
        NotAllowedError:      'Mic blocked. Allow microphone access.',
        NotFoundError:        'No microphone found.',
        NotReadableError:     'Mic in use by another app.',
        OverconstrainedError: 'Mic settings not supported.',
        SecurityError:        'Mic needs a secure (HTTPS) connection.',
      };
      if (micErrors[e?.name]) toast.error(micErrors[e.name]);
      else if (serverMsg) toast.error(serverMsg);
      else toast.error('Could not start');
    } finally { setStarting(false); }
  };

  const changeTrack = async (t) => {
    setCurrent(t);
    setPicker(false);
    try { await djAPI.updateTrack(session._id, { videoId: t.videoId, title: t.title, artist: t.artist }); } catch {}
  };

  const endBroadcast = async () => {
    if (!session) return;
    try { await djAPI.end(session._id); } catch {}
    toast.success('Announcement ended');
    navigate('/announcements');
  };

  // ── Desktop ───────────────────────────────────────────────────────────────
  if (isDesktop && !session) {
    return (
      <BroadcastSetupDesktop
        user={user} headline={headline} setHeadline={setHeadline}
        bgTrack={bgTrack} setBgTrack={setBgTrack} library={sortedLibrary}
        starting={starting} onGoLive={goLive} onBack={() => navigate('/announcements')}
        residentCount={residentCount} recent={recent} />
    );
  }
  if (isDesktop && session) {
    return (
      <BroadcastStudioDesktop
        session={session} user={user} live={live} level={level} elapsed={elapsed} peak={peak}
        engagement={engagement} current={current} library={sortedLibrary} onChangeTrack={changeTrack}
        musicVol={musicVol} applyVolume={applyVolume} iframeRef={iframeRef} onEnd={endBroadcast}
        shellRef={shellRef} shellHeight={shellHeight} />
    );
  }

  // ── Phone: step-by-step set-up ────────────────────────────────────────────
  if (!session) {
    const firstName = user?.name?.split(' ')[0] || 'there';
    return (
      <SetupSteps heading="Live announcement" accent={RED} onExit={() => navigate('/announcements')}
        onFinish={goLive} finishing={starting} finishLabel="Go live to the estate"
        steps={[
          { key: 'headline', title: 'What do residents need to hear?', hint: `This headline appears on every resident's banner, ${firstName}.`,
            ready: !!headline.trim(),
            content: (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-semibold text-slate-500">Headline</label>
                    <span className="text-[11px] text-slate-400 tabular-nums">{headline.length}/120</span>
                  </div>
                  <input value={headline} maxLength={120} autoFocus onChange={e => setHeadline(e.target.value)}
                    placeholder="e.g. Water will be off from 10am–2pm"
                    className="mt-1.5 w-full px-3.5 py-3 rounded-xl bg-white border border-slate-200 text-[15px] outline-none focus:border-red-300 focus:ring-4 focus:ring-red-50" />
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-slate-500 mb-2">Or start from a template</div>
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATES.map(([emoji, text]) => (
                      <button key={text} type="button" onClick={() => setHeadline(text)}
                        className="text-[12px] font-medium px-3 py-1.5 rounded-full border transition-all active:scale-95"
                        style={headline === text ? { borderColor: RED, background: '#FEF2F2', color: RED_DARK } : { borderColor: '#E2E8F0', background: '#fff', color: '#475569' }}>
                        {emoji} {text.split(' — ')[0].replace(/ (today|this .*)$/, '')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-dashed border-slate-200 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1"><Bell size={11} /> What residents will see</div>
                  <div className="rounded-2xl p-3 flex items-start gap-3 border" style={{ background: 'linear-gradient(135deg,#FEF2F2,#FFFFFF)', borderColor: '#FECACA' }}>
                    <span className="relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${RED}, ${RED_DARK})` }}>
                      <Megaphone size={15} className="text-white" />
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white animate-pulse" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold tracking-wider text-red-600">LIVE NOW <span className="text-slate-400 font-medium tracking-normal">· {user?.name || 'Estate manager'}</span></div>
                      <div className="text-[13px] font-semibold text-slate-900 mt-0.5 break-words">{headline.trim() || 'Your headline appears here'}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Tap to listen</div>
                    </div>
                  </div>
                </div>
              </div>
            ) },
          { key: 'music', title: 'Background music', hint: 'Optional. A soft track plays under your voice — or keep it voice only.',
            content: (
              <div className="space-y-2">
                <button type="button" onClick={() => setBgTrack(null)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl border text-left"
                  style={!bgTrack ? { borderColor: RED, background: '#FEF2F2' } : { borderColor: '#E2E8F0', background: '#fff' }}>
                  <span className="w-12 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0"><VolumeX size={15} className="text-slate-500" /></span>
                  <span className="flex-1 text-[14px] font-semibold text-slate-800">Voice only</span>
                  {!bgTrack && <Check size={16} style={{ color: RED }} />}
                </button>
                {sortedLibrary.length === 0 && <p className="text-[13px] text-slate-400 px-1 py-2">The Lounge library is empty — add songs from the Lounge Music tab.</p>}
                {sortedLibrary.map(t => {
                  const on = bgTrack?.videoId === t.videoId;
                  return (
                    <button key={t._id || t.videoId} type="button" onClick={() => setBgTrack({ videoId: t.videoId, title: t.title, artist: t.artist })}
                      className="w-full flex items-center gap-3 p-2.5 rounded-2xl border text-left"
                      style={on ? { borderColor: RED, background: '#FEF2F2' } : { borderColor: '#E2E8F0', background: '#fff' }}>
                      <img src={`https://i.ytimg.com/vi/${t.videoId}/default.jpg`} alt="" loading="lazy" className="w-12 h-9 rounded-lg object-cover flex-shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className={`block text-[13px] truncate ${on ? 'font-semibold text-red-700' : 'font-medium text-slate-800'}`}>{t.title}</span>
                        <span className="block text-[11px] text-slate-400 truncate">{t.artist || 'Lounge library'}</span>
                      </span>
                      {on && <Check size={16} style={{ color: RED }} />}
                    </button>
                  );
                })}
              </div>
            ) },
          { key: 'mic', title: 'Check your mic', hint: 'Say a few words — make sure the bars move.',
            content: (
              <div className="space-y-3">
                <MicCheck accent={RED} />
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-2 text-[13px] text-slate-600">
                  <div>🔔 Every resident gets a notification the moment you go live.</div>
                  <div>📻 Going live interrupts any DJ set that's playing.</div>
                  <div>🎧 Speak close to the mic, away from noise.</div>
                </div>
              </div>
            ) },
        ]} />
    );
  }

  // ── Phone: on air ─────────────────────────────────────────────────────────
  const nextTrack = sortedLibrary.find(t => t.videoId !== current?.videoId);
  const endOnPhone = () => { if (window.confirm('End the announcement for everyone?')) endBroadcast(); };
  return (
    <MobileHostStudio
      title={session.message || session.title} kindLabel={`Announcement · ${user?.name || 'Estate manager'}`} KindIcon={Megaphone}
      accent={RED} dark={RED_DARK} live={live} level={level} elapsed={elapsed} peak={peak}
      engagement={engagement} onEnd={endOnPhone}
      music={{
        title: current?.title, subtitle: current ? (current.artist || 'Playing softly under your voice') : 'Voice only — add music in the Music tab',
        thumb: current?.videoId ? `https://i.ytimg.com/vi/${current.videoId}/default.jpg` : null,
        onNext: nextTrack ? () => changeTrack(nextTrack) : null, nextLabel: current ? 'Next' : 'Play',
        volume: musicVol, onVolume: applyVolume,
        player: current && (
          <div className="relative mt-3 w-full aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/10">
            <iframe ref={iframeRef} key={current.videoId} title="Background music"
              src={`https://www.youtube.com/embed/${current.videoId}?autoplay=1&playsinline=1&modestbranding=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
              allow="autoplay; encrypted-media"
              onLoad={() => setTimeout(() => applyVolume(musicVol), 400)}
              className="absolute inset-0 w-full h-full border-0" />
          </div>
        ),
      }}
      tabs={[
        { key: 'points', label: 'Talking points', Icon: ListChecks, content: <TalkingPoints /> },
        { key: 'music', label: 'Music', Icon: Music, content: (
          <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
            <p className="px-4 pt-3 pb-1 text-[11px] text-slate-400">Tap a song to play it under your voice. Use Mute on the music slider to go voice only.</p>
            {sortedLibrary.map(t => {
              const on = current?.videoId === t.videoId;
              return (
                <button key={t._id || t.videoId} onClick={() => changeTrack(t)} className="w-full flex items-center gap-3 px-4 py-2 text-left" style={on ? { background: '#FEF2F2' } : undefined}>
                  <img src={`https://i.ytimg.com/vi/${t.videoId}/default.jpg`} alt="" loading="lazy" className="w-11 h-8 rounded-md object-cover flex-shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className={`block text-[13px] truncate ${on ? 'font-semibold text-red-700' : 'font-medium text-slate-800'}`}>{t.title}</span>
                    <span className="block text-[11px] text-slate-400 truncate">{on ? 'Playing now' : (t.artist || 'Lounge library')}</span>
                  </span>
                  {!on && <SkipForward size={14} className="text-slate-300" />}
                </button>
              );
            })}
          </div>
        ) },
      ]} />
  );
}
