import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Megaphone, Mic, MicOff, Users, X, Loader2, Music, Volume2, VolumeX, Volume1,
  SkipForward,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth }    from '../context/AuthContext';
import { useSocket }  from '../context/SocketContext';
import { djAPI, loungeAPI } from '../api';
import { useLiveAudio } from '../hooks/useLiveAudio';

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

  const startRef  = useRef(0);
  const iframeRef = useRef(null);

  const live = useLiveAudio({
    roomType: 'dj',
    roomId:   session?._id || null,
    role:     'host',
    enabled:  !!session,
  });

  useEffect(() => {
    loungeAPI.getSession().then(({ data }) => setLibrary(data.data?.suggestions || [])).catch(() => {});
  }, []);

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
      await live.getLocalStream();
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

  // ── Pre-live screen ───────────────────────────────────────────────────────
  if (!session) {
    return (
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '24px 16px 40px' }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 12, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          ← Back to announcements
        </button>

        <div style={{ background: `linear-gradient(135deg, ${RED}, ${RED_DARK})`, borderRadius: 22, padding: '26px 22px', color: '#fff', boxShadow: '0 20px 44px -18px rgba(239,68,68,0.55)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 14 }}>
            <Megaphone size={13}/> ESTATE ANNOUNCEMENT
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2 }}>Speak to the whole estate.</h1>
          <p style={{ fontSize: 14, lineHeight: 1.55, marginTop: 10, opacity: 0.9 }}>
            Every resident gets an instant notification. Optionally pick a background track to play softly under your voice.
          </p>

          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.9, marginTop: 18 }}>
            Headline (shown on their banner)
          </label>
          <input value={headline} onChange={e => setHeadline(e.target.value)}
            placeholder="e.g. Water will be off from 10am–2pm"
            style={{ width: '100%', marginTop: 6, padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 14, outline: 'none' }} />

          {/* Background music picker */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.9, marginBottom: 6 }}>
              Background music (optional)
            </div>
            {bgTrack ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)' }}>
                <Music size={14} style={{ flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bgTrack.title}</div>
                  <div style={{ fontSize: 11, opacity: 0.75 }}>{bgTrack.artist || 'From the Lounge library'}</div>
                </div>
                <button onClick={() => setPicker(true)}
                  style={{ fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.18)', border: 'none', color: '#fff', cursor: 'pointer' }}>Change</button>
                <button onClick={() => setBgTrack(null)}
                  style={{ padding: 5, borderRadius: 8, background: 'rgba(0,0,0,0.2)', border: 'none', color: '#fff', cursor: 'pointer' }}>
                  <X size={13}/>
                </button>
              </div>
            ) : (
              <button onClick={() => setPicker(true)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px dashed rgba(255,255,255,0.3)', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                <Music size={14}/> Pick a track
              </button>
            )}
          </div>

          <button onClick={goLive} disabled={starting || !headline.trim()}
            style={{ marginTop: 18, width: '100%', padding: '14px 20px', borderRadius: 14, border: 'none',
              background: '#fff', color: RED_DARK, fontWeight: 800, fontSize: 15,
              opacity: !headline.trim() ? 0.5 : 1,
              cursor: starting ? 'wait' : (!headline.trim() ? 'not-allowed' : 'pointer'),
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            {starting ? <><Loader2 size={16} className="animate-spin"/> Preparing…</> : <><Megaphone size={16}/> Start broadcast</>}
          </button>
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 10, textAlign: 'center' }}>
            Mic access required.
          </div>
        </div>

        <div style={{ marginTop: 18, padding: 14, borderRadius: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: 12, color: '#64748B' }}>
          <strong style={{ color: '#334155' }}>Tip:</strong> For non-urgent news, use <em>New Announcement</em> (text post). Live is best for things residents need to hear <em>right now</em>.
        </div>

        {/* Track picker modal */}
        {showPicker && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.65)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Pick a background track</div>
                <button onClick={() => setPicker(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}><X size={16}/></button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                {sortedLibrary.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No tracks in the Lounge library.</div>}
                {sortedLibrary.map(t => (
                  <button key={t._id} onClick={() => { setBgTrack({ videoId: t.videoId, title: t.title, artist: t.artist }); setPicker(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', width: '100%', textAlign: 'left', background: 'transparent', border: '1px solid transparent', borderRadius: 10, cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: '#FEE2E2', color: RED_DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Music size={13}/></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>{t.artist || 'Resident'}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Live view ─────────────────────────────────────────────────────────────
  const hasMusic = !!current;
  const upcoming = sortedLibrary.filter(t => t.videoId !== current?.videoId).slice(0, 15);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 40px' }}>
      <div style={{ background: `linear-gradient(135deg, ${RED} 0%, ${RED_DARK} 100%)`, borderRadius: 20, padding: 22, color: '#fff', boxShadow: '0 20px 44px -18px rgba(239,68,68,0.55)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }}/>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10 }}>
                <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#fff', animation: 'ping 1.6s infinite' }} />
                <span style={{ position: 'relative', borderRadius: '50%', width: 10, height: 10, background: '#fff' }} />
              </span>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em' }}>LIVE · ANNOUNCEMENT</span>
              <span style={{ fontSize: 12, opacity: 0.85, marginLeft: 4 }}>{fmtDur(elapsed)}</span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.18)', padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
              <Users size={13}/> {live.listenerCount}
            </div>
          </div>

          {/* Music player (if a track is set) */}
          {hasMusic && (
            <div style={{ position: 'relative', paddingBottom: '42%', background: '#000', borderRadius: 14, overflow: 'hidden', marginBottom: 14, border: '1px solid rgba(255,255,255,0.15)' }}>
              <iframe ref={iframeRef} key={current.videoId}
                src={`https://www.youtube.com/embed/${current.videoId}?autoplay=1&modestbranding=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
                allow="autoplay; encrypted-media" allowFullScreen
                onLoad={() => setTimeout(() => applyVolume(musicVol), 400)}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
            </div>
          )}

          {/* Mic + message */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={live.toggleMic}
              style={{ width: 70, height: 70, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: live.micOn ? '#fff' : 'rgba(255,255,255,0.14)',
                color: live.micOn ? RED_DARK : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: live.micOn ? '0 10px 24px rgba(0,0,0,0.2)' : 'none', flexShrink: 0 }}>
              {live.micOn ? <Mic size={26}/> : <MicOff size={26}/>}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.85 }}>
                {live.micOn ? 'Speaking' : 'Muted'}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2, marginTop: 3 }}>{session.message || session.title}</div>
              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.85 }}>
                {user?.name} · Peak {peak}
                {hasMusic && <> · 🎵 {current.title}</>}
              </div>
            </div>
          </div>

          {/* Music volume + change track (if music is set) */}
          {hasMusic && (
            <>
              <div style={{ marginTop: 16, padding: 10, borderRadius: 12, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => applyVolume(musicVol === 0 ? 40 : 0)}
                  style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {musicVol === 0 ? <VolumeX size={13}/> : musicVol < 40 ? <Volume1 size={13}/> : <Volume2 size={13}/>}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontWeight: 700, opacity: 0.75, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
                    <span>Music under voice</span><span>{musicVol}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={musicVol}
                    onChange={e => applyVolume(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#fff' }} />
                </div>
                <button onClick={() => applyVolume(15)}
                  style={{ padding: '5px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.14)', border: 'none', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Duck</button>
                <button onClick={() => applyVolume(60)}
                  style={{ padding: '5px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.14)', border: 'none', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Up</button>
              </div>
              {upcoming.length > 0 && (
                <details style={{ marginTop: 10 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 11, opacity: 0.85, fontWeight: 700 }}>Change track →</summary>
                  <div style={{ marginTop: 8, maxHeight: 180, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 6 }}>
                    {upcoming.map(t => (
                      <button key={t._id} onClick={() => changeTrack(t)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <SkipForward size={11}/>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}

          <button onClick={endBroadcast}
            style={{ marginTop: 16, width: '100%', padding: '11px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <X size={14}/> End announcement
          </button>
        </div>
      </div>
      <style>{`@keyframes ping { 75%,100% { transform: scale(2.4); opacity: 0; } }`}</style>
    </div>
  );
}
