import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Users, X, Save, Play, SkipForward, Music, Volume2, Radio,
  Loader2, RefreshCw, Headphones, Megaphone, VolumeX, Volume1,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth }   from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { djAPI, loungeAPI } from '../api';
import { useLiveAudio } from '../hooks/useLiveAudio';

const BRAND       = '#10B981';
const BRAND_DARK  = '#059669';
const RED         = '#EF4444';
const RED_DARK    = '#DC2626';

const fmtDur = (ms) => {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
};

// Record a MediaStream to a Blob (voice-only mixtape). Returns { start, stop }.
function createVoiceRecorder() {
  let recorder = null;
  const chunks  = [];
  return {
    start(stream) {
      try {
        const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus' : 'audio/webm';
        recorder = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 96000 });
        recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
        recorder.start(1000);
      } catch (e) { console.warn('Recorder unsupported', e); }
    },
    async stop() {
      if (!recorder) return null;
      await new Promise(r => { recorder.onstop = r; recorder.stop(); });
      return new Blob(chunks, { type: 'audio/webm' });
    },
  };
}

export default function DJConsole() {
  const { user } = useAuth();
  const { emit } = useSocket() || {};
  const navigate = useNavigate();
  const [session, setSession]   = useState(null);
  const [starting, setStarting] = useState(false);
  const [library, setLibrary]   = useState([]);
  const [current, setCurrent]   = useState(null); // { videoId, title, artist, startedAt }
  const [setlist, setSetlist]   = useState([]);   // played order with startSec/endSec
  const [elapsed, setElapsed]   = useState(0);    // ms since session start
  const [showSave, setShowSave] = useState(false);
  const [mixTitle, setMixTitle] = useState('');
  const [saving, setSaving]     = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [peak, setPeak]         = useState(0);
  const [musicVol, setMusicVol] = useState(45); // 0-100, broadcast — voice must sit on top

  const recorderRef = useRef(createVoiceRecorder());
  const sessionStartRef = useRef(0);
  const voiceBlobRef = useRef(null);
  const voiceDurRef  = useRef(0);
  const iframeRef = useRef(null);

  // Apply volume to local YouTube iframe + broadcast to listeners
  const applyVolume = (v) => {
    setMusicVol(v);
    const win = iframeRef.current?.contentWindow;
    if (win) {
      try {
        win.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [v] }), '*');
      } catch {}
    }
    if (session && emit) {
      emit('dj:volume', { sessionId: session._id, volume: v });
    }
  };

  // Live audio broadcaster
  const live = useLiveAudio({
    roomType: 'dj',
    roomId:   session?._id || null,
    role:     'host',
    enabled:  !!session,
  });

  // Load the YouTube library
  useEffect(() => {
    loungeAPI.getSession()
      .then(({ data }) => setLibrary(data.data?.suggestions || []))
      .catch(() => {});
  }, []);

  // Track peak listener count
  useEffect(() => {
    if (live.listenerCount > peak) setPeak(live.listenerCount);
  }, [live.listenerCount, peak]);

  // Elapsed timer
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setElapsed(Date.now() - sessionStartRef.current), 1000);
    return () => clearInterval(id);
  }, [session]);

  const sortedLibrary = useMemo(() =>
    [...library].sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0)),
    [library]);

  const goLive = async () => {
    try {
      setStarting(true);
      // Prepare mic + recorder BEFORE marking session live so publisher stream is ready
      const stream = await live.getLocalStream();
      recorderRef.current.start(stream);

      const first = sortedLibrary[0] || null;
      const { data } = await djAPI.start({
        kind: 'dj',
        title: `${user?.name || 'DJ'}'s Live Set`,
        nowPlaying: first ? { videoId: first.videoId, title: first.title, artist: first.artist } : {},
      });
      sessionStartRef.current = Date.now();
      setSession(data.data);
      if (first) {
        setCurrent({ videoId: first.videoId, title: first.title, artist: first.artist, startedAt: Date.now() });
        setSetlist([{ videoId: first.videoId, title: first.title, artist: first.artist, startSec: 0, endSec: 0 }]);
      }
      toast.success('You are LIVE 🎙️');
    } catch (e) {
      toast.error(e?.message === 'Permission denied' || e?.name === 'NotAllowedError'
        ? 'Mic access required to go live'
        : (e.response?.data?.message || 'Could not start session'));
    } finally {
      setStarting(false);
    }
  };

  const playTrack = async (t) => {
    if (!session) return;
    const now = Date.now();
    // Close out the previous setlist entry
    setSetlist(prev => {
      if (prev.length === 0) return [{ videoId: t.videoId, title: t.title, artist: t.artist, startSec: Math.floor((now - sessionStartRef.current) / 1000), endSec: 0 }];
      const copy = [...prev];
      copy[copy.length - 1] = { ...copy[copy.length - 1], endSec: Math.floor((now - sessionStartRef.current) / 1000) };
      copy.push({ videoId: t.videoId, title: t.title, artist: t.artist, startSec: Math.floor((now - sessionStartRef.current) / 1000), endSec: 0 });
      return copy;
    });
    setCurrent({ videoId: t.videoId, title: t.title, artist: t.artist, startedAt: now });
    try {
      await djAPI.updateTrack(session._id, { videoId: t.videoId, title: t.title, artist: t.artist });
    } catch { /* ignore — ui is optimistic */ }
  };

  const endSession = async () => {
    if (!session) return;
    const now = Date.now();
    const totalSec = Math.floor((now - sessionStartRef.current) / 1000);
    // Close out current setlist entry
    setSetlist(prev => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      copy[copy.length - 1] = { ...copy[copy.length - 1], endSec: totalSec };
      return copy;
    });

    // Stop recording and save blob
    const blob = await recorderRef.current.stop();
    voiceBlobRef.current = blob;
    voiceDurRef.current  = totalSec;

    try { await djAPI.end(session._id); } catch { /* best effort */ }
    setMixTitle(`${user?.name || 'DJ'} — ${new Date().toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })} Live`);
    setShowSave(true);
  };

  const uploadVoice = async (blob) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const preset    = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !preset || !blob) return '';
    const form = new FormData();
    form.append('file', blob);
    form.append('upload_preset', preset);
    form.append('resource_type', 'video'); // Cloudinary treats audio/webm as video
    return await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => e.lengthComputable && setUploadPct(Math.round(100 * e.loaded / e.total));
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText).secure_url); } catch { reject(xhr.responseText); }
        } else reject(xhr.statusText);
      };
      xhr.onerror = () => reject(xhr.statusText);
      xhr.send(form);
    });
  };

  const saveMixtape = async () => {
    if (!mixTitle.trim()) { toast.error('Give your mixtape a title'); return; }
    setSaving(true);
    try {
      let voiceAudioUrl = '';
      if (voiceBlobRef.current) {
        try { voiceAudioUrl = await uploadVoice(voiceBlobRef.current); }
        catch (e) { console.warn('Voice upload failed', e); toast('Saved without voice (upload failed)', { icon: '⚠️' }); }
      }
      await djAPI.saveMixtape({
        sessionId:        session._id,
        title:            mixTitle.trim(),
        voiceAudioUrl,
        voiceDurationSec: voiceDurRef.current,
        setlist,
        totalDurationSec: voiceDurRef.current,
        peakListeners:    peak,
      });
      toast.success('Mixtape saved to the Lounge archive 🎵');
      navigate('/lounge');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save mixtape');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})`, borderRadius: 24, padding: '32px 26px', color: '#fff', boxShadow: '0 20px 44px -18px rgba(16,185,129,0.55)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 14 }}>
            <Radio size={13}/> LOUNGE RADIO
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.15 }}>Hop on the decks.</h1>
          <p style={{ fontSize: 14, lineHeight: 1.55, marginTop: 10, opacity: 0.9 }}>
            Play tracks from the Lounge library and talk over them live — we'll save it as a mixtape anyone can replay.
          </p>

          <button onClick={goLive} disabled={starting}
            style={{ marginTop: 18, width: '100%', padding: '14px 20px', borderRadius: 14, border: 'none',
              background: '#fff', color: BRAND_DARK, fontWeight: 800, fontSize: 15,
              cursor: starting ? 'wait' : 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            {starting ? <><Loader2 size={16} className="animate-spin" /> Preparing…</> : <><Mic size={16}/> Go live now</>}
          </button>
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 10, textAlign: 'center' }}>
            Mic access required · Residents get a push notification instantly.
          </div>
        </div>

        <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Megaphone size={16}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#991B1B' }}>Need to make an urgent announcement?</div>
            <div style={{ fontSize: 12, color: '#7F1D1D' }}>Live voice broadcasts live under <strong>Announcements → Broadcast live</strong>.</div>
          </div>
          <button onClick={() => navigate('/announcements/live')}
            style={{ padding: '8px 12px', borderRadius: 10, background: 'linear-gradient(135deg, #EF4444, #DC2626)', color: '#fff', fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Go →
          </button>
        </div>
      </div>
    );
  }

  // Live state
  const upcoming = sortedLibrary.filter(t => t.videoId !== current?.videoId).slice(0, 20);
  const isAnnounce = session.kind === 'announcement';

  // Announcement live view — simpler, voice-only
  if (isAnnounce) {
    return (
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '24px 16px 40px' }}>
        <div style={{
          background: `linear-gradient(135deg, ${RED} 0%, ${RED_DARK} 100%)`,
          borderRadius: 20, padding: 26, color: '#fff', boxShadow: '0 20px 44px -18px rgba(239,68,68,0.55)',
          position: 'relative', overflow: 'hidden',
        }}>
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

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button onClick={live.toggleMic}
                style={{ width: 80, height: 80, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: live.micOn ? '#fff' : 'rgba(255,255,255,0.14)',
                  color: live.micOn ? RED_DARK : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: live.micOn ? '0 10px 24px rgba(0,0,0,0.2)' : 'none', flexShrink: 0 }}>
                {live.micOn ? <Mic size={30}/> : <MicOff size={30}/>}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.85 }}>
                  {live.micOn ? 'Speaking' : 'Muted'}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2, marginTop: 3 }}>{session.message || session.title}</div>
                <div style={{ fontSize: 12, marginTop: 4, opacity: 0.85 }}>{user?.name} · Peak {peak}</div>
              </div>
            </div>

            <button onClick={endSession}
              style={{ marginTop: 20, width: '100%', padding: '11px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <X size={14}/> End announcement
            </button>
          </div>
        </div>
        <style>{`@keyframes ping { 75%,100% { transform: scale(2.4); opacity: 0; } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '12px 16px 40px' }}>
      {/* LIVE header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        padding: '14px 18px', borderRadius: 16, marginBottom: 14,
        background: 'linear-gradient(135deg, #0F172A, #1E293B)', color: '#fff',
        border: '1px solid #334155',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10 }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#EF4444', animation: 'ping 1.6s infinite' }} />
            <span style={{ position: 'relative', borderRadius: '50%', width: 10, height: 10, background: '#EF4444' }} />
          </span>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: '#FCA5A5' }}>ON AIR</span>
          <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 6 }}>{fmtDur(elapsed)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Users size={14} color="#94A3B8" />
            <span style={{ fontSize: 13, fontWeight: 700 }}>{live.listenerCount}</span>
            <span style={{ fontSize: 11, color: '#64748B' }}>listening</span>
          </div>
          <button onClick={endSession}
            style={{ padding: '7px 14px', borderRadius: 10, background: '#EF4444', color: '#fff', fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <X size={13} /> End Set
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 14 }} className="dj-grid">
        {/* Main — Now playing + mic */}
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
            {current ? (
              <iframe ref={iframeRef} key={current.videoId}
                src={`https://www.youtube.com/embed/${current.videoId}?autoplay=1&modestbranding=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
                title="Now playing"
                allow="autoplay; encrypted-media; clipboard-write"
                allowFullScreen
                onLoad={() => { setTimeout(() => applyVolume(musicVol), 400); }}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 13 }}>
                Pick a track to start playing
              </div>
            )}
          </div>

          <div style={{ padding: '14px 18px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Mic toggle */}
            <button onClick={live.toggleMic}
              style={{
                flexShrink: 0, width: 56, height: 56, borderRadius: 999, border: 'none', cursor: 'pointer',
                background: live.micOn ? `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` : '#334155',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: live.micOn ? '0 8px 20px rgba(16,185,129,0.35)' : 'none',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              {live.micOn ? <Mic size={22} /> : <MicOff size={22} />}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {live.micOn ? 'Mic open — your voice is live' : 'Mic muted'}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {current?.title || 'No track selected'}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>
                {current?.artist || 'Spin something from the queue →'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Peak</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{peak}</div>
            </div>
          </div>

          {/* Music ducking slider — syncs to listeners */}
          <div style={{ padding: '12px 18px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => applyVolume(musicVol === 0 ? 60 : 0)}
              style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Mute music">
              {musicVol === 0 ? <VolumeX size={14}/> : musicVol < 40 ? <Volume1 size={14}/> : <Volume2 size={14}/>}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                <span>Music volume</span>
                <span>{musicVol}%</span>
              </div>
              <input type="range" min="0" max="100" value={musicVol}
                onChange={e => applyVolume(Number(e.target.value))}
                style={{ width: '100%', accentColor: BRAND }} />
            </div>
            <button onClick={() => applyVolume(20)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              title="Duck the music while you talk">
              Duck
            </button>
            <button onClick={() => applyVolume(80)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              title="Pump the music back up">
              Up
            </button>
          </div>
        </div>

        {/* Queue */}
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0', padding: 14, maxHeight: 540, overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Music size={14} color={BRAND} />
            <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>Queue</span>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>· top voted first</span>
          </div>
          {upcoming.length === 0 && <div style={{ fontSize: 12, color: '#94A3B8', padding: '20px 0', textAlign: 'center' }}>No tracks in the library</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {upcoming.map((t) => (
              <button key={t._id} onClick={() => playTrack(t)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                  borderRadius: 10, border: '1px solid transparent', background: 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${BRAND}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: BRAND, flexShrink: 0 }}>
                  <SkipForward size={13} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.artist || t.suggestedBy?.name || 'Resident'} · {t.votes?.length || 0} votes
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save mixtape modal */}
      {showSave && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 22, width: '100%', maxWidth: 440, border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${BRAND}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Headphones size={20} color={BRAND_DARK} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Save your mixtape</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>{fmtDur(voiceDurRef.current * 1000)} · {setlist.length} tracks · peak {peak} listeners</div>
              </div>
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Title</label>
            <input className="input-field" style={{ marginTop: 6, marginBottom: 12 }}
              value={mixTitle} onChange={e => setMixTitle(e.target.value)}
              placeholder="e.g. Friday night takeover" />
            {saving && uploadPct > 0 && uploadPct < 100 && (
              <div style={{ height: 6, borderRadius: 999, background: '#F1F5F9', overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ height: '100%', width: `${uploadPct}%`, background: BRAND, transition: 'width 0.3s' }} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowSave(false); navigate('/lounge'); }} disabled={saving}
                style={{ flex: '0 0 auto', padding: '10px 18px', borderRadius: 12, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontWeight: 600, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}>
                Skip
              </button>
              <button onClick={saveMixtape} disabled={saving || !mixTitle.trim()}
                style={{ flex: 1, padding: '10px 0', borderRadius: 12, border: 'none',
                  background: mixTitle.trim() ? `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` : '#E2E8F0',
                  color: mixTitle.trim() ? '#fff' : '#94A3B8',
                  fontWeight: 700, fontSize: 13, cursor: saving || !mixTitle.trim() ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={13} /> Save mixtape</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2.4); opacity: 0; }
        }
        @media (max-width: 820px) {
          .dj-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
