import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Users, X, Save, Play, SkipForward, Music, Volume2, Radio,
  Loader2, RefreshCw, Headphones, Megaphone, VolumeX, Volume1,
  Clock3, TrendingUp, Heart, Smile, ListMusic, Disc3, Search, CheckCircle2, ThumbsUp, ArrowLeft,
  Upload, Link2, Plus, Pause, Laptop, Youtube,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth }   from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { djAPI, loungeAPI } from '../api';
import { useLiveAudio } from '../hooks/useLiveAudio';
import { Fader }      from '../components/MixerDeck';
import AudiencePanel  from '../components/AudiencePanel';
import Portal from '../components/ui/Portal';
import useIsDesktop from '../hooks/useIsDesktop';
import useFillHeight from '../hooks/useFillHeight';
import { useRoomEngagement, ReactionLayer, ChatPanel, Soundboard, useMicLevel } from '../components/podcast/StudioPanels';
import { parseYouTubeId } from '../components/podcast/MusicDeck';

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

// Add a track from YouTube (saved to the Lounge library) or from this computer (this session only)
function AddTracks({ onAddYouTube, onAddFiles }) {
  const [link, setLink] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const id = parseYouTubeId(link);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch(`https://noembed.com/embed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`)
      .then((r) => r.json()).then((d) => { if (!cancelled && d?.title) setTitle((t) => t || d.title); }).catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  const addYT = async (e) => {
    e.preventDefault();
    if (!id) { toast.error('Paste a YouTube link'); return; }
    if (!title.trim()) { toast.error('Add the song title'); return; }
    setBusy(true);
    if (await onAddYouTube(id, title.trim())) { setLink(''); setTitle(''); }
    setBusy(false);
  };

  return (
    <div className="p-3 border-t border-slate-100 space-y-2">
      <form onSubmit={addYT} className="space-y-1.5">
        <div className="relative">
          <Youtube size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-red-500" />
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste a YouTube link…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[12px] outline-none focus:bg-white focus:border-slate-300" />
        </div>
        {id && (
          <div className="flex items-center gap-1.5 animate-scale-in">
            <img src={`https://i.ytimg.com/vi/${id}/default.jpg`} alt="" className="w-10 h-7 rounded object-cover flex-shrink-0" />
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Song title"
              className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[12px] outline-none focus:bg-white focus:border-slate-300" />
            <button type="submit" disabled={busy} aria-label="Add to library" className="w-7 h-7 rounded-lg flex items-center justify-center text-white bg-emerald-500 hover:bg-emerald-600 flex-shrink-0 disabled:opacity-50">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />}
            </button>
          </div>
        )}
      </form>
      <input ref={fileRef} type="file" accept="audio/*" multiple className="hidden"
        onChange={(e) => { onAddFiles(e.target.files); e.target.value = ''; }} />
      <button type="button" onClick={() => fileRef.current?.click()}
        className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-slate-300 text-[12px] font-medium text-slate-600 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50/50 transition-colors">
        <Upload size={13} /> Add audio from this computer
      </button>
    </div>
  );
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
  const isDesktop = useIsDesktop();
  const [setTitle, setSetTitle] = useState('');
  const [crateQ, setCrateQ]     = useState('');
  const [rawStream, setRawStream] = useState(null);
  const shellRef = useRef(null);
  const localAudioRef = useRef(null);                 // { audio, gain } for the file playing now
  const [localTracks, setLocalTracks] = useState([]); // { id, title, url } — this session only
  const [localPos, setLocalPos] = useState({ t: 0, d: 0, playing: false });

  // Apply volume to local YouTube iframe + broadcast to listeners
  const applyVolume = (v) => {
    setMusicVol(v);
    if (localAudioRef.current) localAudioRef.current.gain.gain.value = v / 100;
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
  const engagement  = useRoomEngagement(session?._id);
  // Stop any local file and free its memory when leaving the page
  const localTracksRef = useRef([]);
  localTracksRef.current = localTracks;
  useEffect(() => () => {
    try { localAudioRef.current?.audio.pause(); } catch { /* noop */ }
    localTracksRef.current.forEach((t) => URL.revokeObjectURL(t.url));
  }, []);
  const level       = useMicLevel(rawStream, !!session && live.micOn);
  const shellHeight = useFillHeight(shellRef, !!session && isDesktop && session.kind !== 'announcement', { min: 560 });

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
      setRawStream(live.getRawStream?.() || stream);

      const first = sortedLibrary[0] || null;
      const { data } = await djAPI.start({
        kind: 'dj',
        title: setTitle.trim() || `${user?.name || 'DJ'}'s Live Set`,
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
    stopLocal();
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

  // ── Your own tracks ──────────────────────────────────────────────────────
  // YouTube links join the estate's Lounge library. Audio files stay on this
  // computer and are mixed straight into the broadcast (listeners hear them
  // through the live stream, and they're part of the recorded mixtape).
  const addYouTubeTrack = async (videoId, title) => {
    try {
      const { data } = await loungeAPI.suggest({ videoId, title });
      setLibrary(data.data?.suggestions || []);
      toast.success('Added to the Lounge library');
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not add that track');
      return false;
    }
  };

  const addLocalFiles = (fileList) => {
    const files = [...(fileList || [])].filter((f) => f.type.startsWith('audio/'));
    if (!files.length) { toast.error('Pick an audio file (MP3, WAV, M4A…)'); return; }
    setLocalTracks((prev) => [...prev, ...files.map((f, i) => ({
      id: `local-${Date.now()}-${i}`, title: f.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(f),
    }))]);
    toast.success(`${files.length} track${files.length > 1 ? 's' : ''} added from your computer`);
  };

  const removeLocal = (t) => {
    if (current?.local && current.id === t.id) stopLocal();
    URL.revokeObjectURL(t.url);
    setLocalTracks((prev) => prev.filter((x) => x.id !== t.id));
  };

  const stopLocal = () => {
    const cur = localAudioRef.current;
    if (!cur) return;
    try { cur.audio.pause(); cur.gain.disconnect(); } catch { /* already gone */ }
    localAudioRef.current = null;
    setLocalPos({ t: 0, d: 0, playing: false });
  };

  const playLocal = async (t) => {
    if (!session) return;
    const bus = live.getMixBus?.();
    if (!bus) { toast.error('The live mixer is not ready yet'); return; }
    stopLocal();
    const { ctx, dest } = bus;
    if (ctx.state === 'suspended') await ctx.resume();
    const audio = new Audio(t.url);
    const gain = ctx.createGain();
    gain.gain.value = musicVol / 100;
    ctx.createMediaElementSource(audio).connect(gain);
    gain.connect(dest);                 // listeners + recording
    gain.connect(ctx.destination);      // the DJ hears it too
    audio.ontimeupdate = () => setLocalPos({ t: audio.currentTime, d: audio.duration || 0, playing: !audio.paused });
    audio.onpause = () => setLocalPos((p) => ({ ...p, playing: false }));
    audio.onplay = () => setLocalPos((p) => ({ ...p, playing: true }));
    localAudioRef.current = { audio, gain };
    try { await audio.play(); } catch { toast.error('Could not play that file'); return; }

    const now = Date.now();
    const sec = Math.floor((now - sessionStartRef.current) / 1000);
    setSetlist((prev) => {
      const copy = [...prev];
      if (copy.length) copy[copy.length - 1] = { ...copy[copy.length - 1], endSec: sec };
      copy.push({ videoId: '', title: t.title, artist: 'Own track', startSec: sec, endSec: 0 });
      return copy;
    });
    setCurrent({ local: true, id: t.id, title: t.title, artist: 'Own track', startedAt: now });
    // Listeners' YouTube player stops; they hear this track through the stream
    try { await djAPI.updateTrack(session._id, { videoId: '', title: t.title, artist: 'Own track' }); } catch { /* optimistic */ }
  };

  const toggleLocal = () => {
    const a = localAudioRef.current?.audio;
    if (!a) return;
    if (a.paused) a.play().catch(() => {}); else a.pause();
  };
  const seekLocal = (frac) => {
    const a = localAudioRef.current?.audio;
    if (a && a.duration) a.currentTime = Math.max(0, Math.min(1, frac)) * a.duration;
  };

  const endSession = async () => {
    if (!session) return;
    stopLocal();
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
  if (!session && isDesktop) {
    const top = sortedLibrary.slice(0, 8);
    return (
      <div className="max-w-[1200px] mx-auto pb-10">
        <button onClick={() => navigate('/lounge')} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900 mb-4 transition-colors">
          <ArrowLeft size={14} /> Lounge
        </button>
        <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
          <div className="space-y-5 min-w-0">
            <div className="dash-rise relative overflow-hidden rounded-2xl p-7 text-white"
              style={{ background: 'linear-gradient(130deg, #022C22 0%, #064E3B 50%, #059669 100%)', boxShadow: '0 18px 36px -20px rgba(4,120,87,0.9)' }}>
              <div className="dash-blob absolute -top-20 right-10 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(52,211,153,0.3)' }} />
              <Disc3 size={180} className="absolute -right-10 -bottom-12 text-white/[0.06] animate-spin pointer-events-none" style={{ animationDuration: '12s' }} />
              <div className="relative max-w-lg">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/15 border border-white/20"><Radio size={11} /> Lounge radio</span>
                <h1 className="mt-3 text-[24px] font-semibold text-white" style={{ letterSpacing: '-0.025em' }}>Hop on the decks, {user?.name?.split(' ')[0] || 'DJ'}</h1>
                <p className="mt-1 text-[13px] text-white/75">Play tracks from the Lounge library and talk over them live. Residents get a notification, and your set is saved as a mixtape anyone can replay.</p>
                <label className="block mt-5 text-[11px] font-semibold uppercase tracking-wider text-white/70">Set name</label>
                <input value={setTitle} onChange={(e) => setSetTitle(e.target.value)} maxLength={80} placeholder={`${user?.name || 'DJ'}'s Live Set`}
                  className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl bg-white/15 border border-white/25 text-[14px] text-white placeholder-white/50 outline-none focus:bg-white/20 focus:border-white/50 transition-colors" />
                <button onClick={goLive} disabled={starting}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-emerald-700 font-semibold text-[14px] transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-wait"
                  style={{ boxShadow: '0 10px 22px -10px rgba(0,0,0,0.4)' }}>
                  {starting ? <><Loader2 size={16} className="animate-spin" /> Preparing…</> : <><Mic size={16} /> Go live now</>}
                </button>
                <p className="mt-2.5 text-[11px] text-white/60 text-center">Needs microphone access. The top-voted track starts playing when you go live.</p>
              </div>
            </div>

            <div className="dash-rise grid grid-cols-3 gap-3" style={{ animationDelay: '80ms' }}>
              {[
                ['🎚️', 'Mix it live', 'Duck the music under your voice with one tap, then bring it back up.'],
                ['💬', 'Read the room', 'Live chat, likes and emoji reactions from listeners as you play.'],
                ['🎵', 'Keep the set', 'When you end, save it as a mixtape in the Lounge archive.'],
              ].map(([e, t, d]) => (
                <div key={t} className="rounded-2xl bg-white border border-slate-200/70 p-4">
                  <div className="text-[18px]">{e}</div>
                  <div className="text-[13px] font-semibold text-slate-900 mt-1.5">{t}</div>
                  <div className="text-[12px] text-slate-500 mt-0.5 leading-snug">{d}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 overflow-hidden" style={{ animationDelay: '60ms' }}>
              <div className="flex items-center justify-between px-4 h-12 border-b border-slate-100">
                <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center bg-emerald-500"><ListMusic size={12} className="text-white" /></span>
                  Your crate
                </h3>
                <span className="text-[12px] text-slate-400">{sortedLibrary.length} tracks</span>
              </div>
              {top.length === 0 ? (
                <p className="px-4 py-5 text-[12px] text-slate-400">The Lounge library is empty. Add songs from the Lounge Music tab first.</p>
              ) : (
                <div className="py-1.5">
                  {top.map((t, i) => (
                    <div key={t._id || t.videoId} className="flex items-center gap-2.5 px-4 py-1.5">
                      <span className="text-[11px] text-slate-400 w-4 tabular-nums">{i + 1}</span>
                      <img src={`https://i.ytimg.com/vi/${t.videoId}/default.jpg`} alt="" className="w-11 h-8 rounded-md object-cover flex-shrink-0" loading="lazy" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[12px] font-medium text-slate-800 truncate">{t.title}</span>
                        <span className="block text-[11px] text-slate-400 truncate">{t.artist || t.suggestedBy?.name || 'Resident'}</span>
                      </span>
                      <span className="text-[11px] text-slate-400 tabular-nums flex items-center gap-0.5"><ThumbsUp size={11} /> {t.votes?.length || 0}</span>
                    </div>
                  ))}
                  {sortedLibrary.length > top.length && <p className="px-4 pt-1 pb-2 text-[11px] text-slate-400">+{sortedLibrary.length - top.length} more once you're live</p>}
                </div>
              )}
              {localTracks.length > 0 && (
                <div className="py-1.5 border-t border-slate-100">
                  <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Laptop size={11} /> From your computer</div>
                  {localTracks.map((t) => (
                    <div key={t.id} className="group flex items-center gap-2.5 px-4 py-1.5">
                      <span className="w-11 h-8 rounded-md bg-slate-900 flex items-center justify-center flex-shrink-0"><Music size={13} className="text-emerald-300" /></span>
                      <span className="flex-1 min-w-0 text-[12px] font-medium text-slate-800 truncate">{t.title}</span>
                      <button onClick={() => removeLocal(t)} aria-label="Remove" className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-300 hover:text-red-500"><X size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
              <AddTracks onAddYouTube={addYouTubeTrack} onAddFiles={addLocalFiles} />
            </div>

            <div className="dash-rise flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100" style={{ animationDelay: '120ms' }}>
              <span className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0"><Megaphone size={16} /></span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-red-900">Urgent announcement?</div>
                <div className="text-[12px] text-red-800/80">Use a live voice broadcast instead.</div>
              </div>
              <button onClick={() => navigate('/announcements/live')} className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[12px] font-semibold">Go</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
  const saveModal = showSave && (

        <Portal>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
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
        </Portal>
  );
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

  // ── Desktop studio ───────────────────────────────────────────────────────
  if (isDesktop) {
    const played = new Set(setlist.map((s) => s.videoId));
    const term = crateQ.trim().toLowerCase();
    const crate = sortedLibrary.filter((t) => !term || `${t.title} ${t.artist || ''} ${t.suggestedBy?.name || ''}`.toLowerCase().includes(term));
    const nextUp = sortedLibrary.find((t) => t.videoId !== current?.videoId && !played.has(t.videoId)) || sortedLibrary.find((t) => t.videoId !== current?.videoId);
    const VolIcon = musicVol === 0 ? VolumeX : musicVol < 40 ? Volume1 : Volume2;
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
              <div className="text-[14px] font-semibold truncate">{session.title}</div>
              <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5"><Music size={11} /> {current ? `${current.title}${current.artist ? ` · ${current.artist}` : ''}` : 'No track playing'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {[
              [Clock3, fmtDur(elapsed), 'On air', '#CBD5E1'],
              [Users, live.listenerCount, 'Listening', '#7DD3FC'],
              [TrendingUp, peak, 'Peak', '#A7F3D0'],
              [Heart, engagement.likes, 'Likes', '#FDA4AF'],
              [Smile, engagement.reactionCount, 'Reactions', '#FDE68A'],
              [ListMusic, setlist.length, 'Tracks played', '#C4B5FD'],
            ].map(([Icon, v, label, color]) => (
              <div key={label} title={label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[12px] tabular-nums">
                <Icon size={13} style={{ color }} /> <span className="font-semibold">{v}</span>
              </div>
            ))}
            <button onClick={endSession}
              className="ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold text-[12px] transition-colors">
              <X size={13} /> End set
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
          <div className="h-full min-h-0 overflow-y-auto no-scrollbar space-y-4 min-w-0">
            {/* Console: deck + mic side by side */}
            <div className="relative overflow-hidden rounded-2xl text-white" style={{ background: 'linear-gradient(150deg, #0F172A 0%, #022C22 55%, #047857 150%)' }}>
              <div className="dash-blob absolute -top-24 left-1/3 w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(16,185,129,0.28)' }} />
              <ReactionLayer reactions={engagement.reactions} />
              <div className="relative grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] divide-x divide-white/10">
                {/* Deck */}
                <div className="p-5 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5"><Disc3 size={12} className={current ? 'animate-spin' : ''} style={{ animationDuration: '3s' }} /> Deck</span>
                    <span className="text-[11px] font-medium" style={{ color: current ? '#A7F3D0' : 'rgba(255,255,255,0.4)' }}>{current ? 'Playing to everyone' : 'Idle'}</span>
                  </div>
                  <div className="relative mt-3 w-full aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/10">
                    {current?.local ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(16,185,129,0.35), transparent 65%)' }}>
                        <div className="relative w-28 h-28 rounded-full flex items-center justify-center shadow-2xl"
                          style={{ background: 'repeating-radial-gradient(circle, #111827 0 3px, #1F2937 3px 5px)', animation: localPos.playing ? 'spin 3s linear infinite' : 'none' }}>
                          <span className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center"><Laptop size={15} className="text-white" /></span>
                        </div>
                        <div className="w-full max-w-sm">
                          <button onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seekLocal((e.clientX - r.left) / r.width); }}
                            className="block w-full h-1.5 rounded-full bg-white/15 overflow-hidden" aria-label="Seek">
                            <span className="block h-full bg-emerald-400" style={{ width: `${localPos.d ? (localPos.t / localPos.d) * 100 : 0}%` }} />
                          </button>
                          <div className="mt-1 flex justify-between text-[10px] text-white/50 tabular-nums">
                            <span>{fmtDur(localPos.t * 1000)}</span><span>{fmtDur(localPos.d * 1000)}</span>
                          </div>
                        </div>
                        <button onClick={toggleLocal} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-[12px] font-semibold">
                          {localPos.playing ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Play</>}
                        </button>
                      </div>
                    ) : current ? (
                      <iframe ref={iframeRef} key={current.videoId} title="Now playing"
                        src={`https://www.youtube.com/embed/${current.videoId}?autoplay=1&modestbranding=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
                        allow="autoplay; encrypted-media; clipboard-write" allowFullScreen
                        onLoad={() => { setTimeout(() => applyVolume(musicVol), 400); }}
                        className="absolute inset-0 w-full h-full border-0" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/45 text-[13px]">
                        <Disc3 size={30} /> Pick a track from your crate
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold truncate">{current?.title || 'Nothing playing'}</div>
                      <div className="text-[12px] text-white/55 truncate">{nextUp ? `Up next: ${nextUp.title}` : 'Add songs in the Lounge Music tab'}</div>
                    </div>
                    {current?.local && <span className="text-[10px] font-semibold px-2 py-1 rounded-md bg-white/10 text-emerald-200 flex-shrink-0 inline-flex items-center gap-1"><Laptop size={11} /> From this computer</span>}
                    <button onClick={() => nextUp && playTrack(nextUp)} disabled={!nextUp}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white disabled:opacity-40 flex-shrink-0 transition-colors">
                      <SkipForward size={13} /> Next
                    </button>
                  </div>
                  <div className="mt-3 p-3 rounded-xl bg-black/25 border border-white/10">
                    <Fader label="Music · everyone" value={musicVol} max={100} unit="%" disabled={!current} onChange={applyVolume}
                      color={BRAND} icon={<VolIcon size={13} />}
                      quickActions={[{ label: 'Duck', value: 15 }, { label: 'Bed', value: 35 }, { label: 'Up', value: 70 }, { label: 'Mute', value: 0 }]} />
                  </div>
                </div>

                {/* Mic */}
                <div className="p-5 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5"><Mic size={12} /> Mic</span>
                    <span className="text-[11px] font-medium" style={{ color: live.micOn ? '#A7F3D0' : '#FCA5A5' }}>{live.micOn ? 'Live' : 'Muted'}</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center py-4">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      {live.micOn && (
                        <>
                          <span className="absolute inset-0 rounded-full transition-transform duration-100" style={{ background: 'rgba(16,185,129,0.14)', transform: `scale(${1 + level * 0.5})` }} />
                          <span className="absolute inset-5 rounded-full transition-transform duration-100" style={{ background: 'rgba(16,185,129,0.22)', transform: `scale(${1 + level * 0.3})` }} />
                        </>
                      )}
                      <button onClick={live.toggleMic} aria-label={live.micOn ? 'Mute mic' : 'Unmute mic'}
                        className="relative w-24 h-24 rounded-full flex items-center justify-center transition-all hover:scale-105"
                        style={live.micOn ? { background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})`, boxShadow: '0 16px 40px -12px rgba(16,185,129,0.9)' } : { background: '#334155' }}>
                        {live.micOn ? <Mic size={34} /> : <MicOff size={34} />}
                      </button>
                    </div>
                    <div className="mt-2 text-[12px] text-white/60">{live.micOn ? 'Talk over the music' : 'You are muted'} · press <kbd className="px-1 rounded bg-white/10 text-white/80">M</kbd></div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/25 border border-white/10">
                    <Fader label="Mic" value={Math.round((live.micGain || 1) * 100)} max={200} unit="%"
                      onChange={(v) => live.setMicGain((v || 0) / 100)} color={BRAND} icon={<Mic size={13} />}
                      quickActions={[{ label: 'Low', value: 80 }, { label: 'Hot', value: 150 }]} />
                  </div>
                </div>
              </div>
            </div>

            {/* Crate + soundboard */}
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-4 items-start">
              <div className="rounded-2xl bg-white border border-slate-200/70 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 h-12 border-b border-slate-100">
                  <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center bg-emerald-500"><ListMusic size={12} className="text-white" /></span>
                    Your crate
                  </h3>
                  <span className="text-[12px] text-slate-400">{sortedLibrary.length} tracks · top voted first</span>
                </div>
                <div className="px-3 pt-3">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={crateQ} onChange={(e) => setCrateQ(e.target.value)} placeholder="Search tracks"
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[12px] outline-none focus:bg-white focus:border-slate-300" />
                  </div>
                </div>
                <div className="max-h-[340px] overflow-y-auto py-1.5">
                  {localTracks.length > 0 && (
                    <div className="pb-1.5 mb-1.5 border-b border-slate-100">
                      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Laptop size={11} /> From your computer · this session</div>
                      {localTracks.map((t) => {
                        const on = current?.local && current.id === t.id;
                        return (
                          <div key={t.id} className="group flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 transition-colors" style={on ? { background: 'rgba(16,185,129,0.08)' } : undefined}>
                            <button onClick={() => (on ? toggleLocal() : playLocal(t))} aria-label={on ? 'Play or pause' : `Play ${t.title}`}
                              className={`w-12 h-8 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${on ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white/80 group-hover:bg-emerald-600'}`}>
                              {on && localPos.playing
                                ? <span className="dash-eq flex items-end gap-[2px] h-3">{[0, 1, 2].map((k) => <span key={k} className="w-[2px] h-full bg-white rounded-full" style={{ animationDelay: `${k * 200}ms` }} />)}</span>
                                : <Play size={12} fill="currentColor" />}
                            </button>
                            <span className="flex-1 min-w-0">
                              <span className={`block text-[12px] truncate ${on ? 'font-semibold text-emerald-700' : 'font-medium text-slate-800'}`}>{t.title}</span>
                              <span className="block text-[11px] text-slate-400">Audio file</span>
                            </span>
                            <button onClick={() => removeLocal(t)} aria-label="Remove" className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"><X size={13} /></button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {crate.length === 0 && <p className="px-4 py-6 text-[12px] text-slate-400 text-center">{term ? 'No tracks match.' : 'The Lounge library is empty. Add songs from the Music tab.'}</p>}
                  {crate.map((t) => {
                    const on = current?.videoId === t.videoId;
                    const done = !on && played.has(t.videoId);
                    return (
                      <button key={t._id || t.videoId} onClick={() => playTrack(t)}
                        className="group w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-slate-50 transition-colors" style={on ? { background: 'rgba(16,185,129,0.08)' } : undefined}>
                        <span className="relative w-12 h-8 rounded-md overflow-hidden flex-shrink-0 bg-slate-100">
                          <img src={`https://i.ytimg.com/vi/${t.videoId}/default.jpg`} alt="" className="w-full h-full object-cover" loading="lazy" />
                          <span className={`absolute inset-0 flex items-center justify-center text-white transition-opacity ${on ? 'opacity-100 bg-emerald-600/80' : 'opacity-0 group-hover:opacity-100 bg-black/45'}`}>
                            {on ? <span className="dash-eq flex items-end gap-[2px] h-3">{[0, 1, 2].map((k) => <span key={k} className="w-[2px] h-full bg-white rounded-full" style={{ animationDelay: `${k * 200}ms` }} />)}</span> : <Play size={12} fill="currentColor" />}
                          </span>
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className={`block text-[12px] truncate ${on ? 'font-semibold text-emerald-700' : done ? 'text-slate-400' : 'font-medium text-slate-800'}`}>{t.title}</span>
                          <span className="block text-[11px] text-slate-400 truncate">{t.artist || t.suggestedBy?.name || 'Resident'}</span>
                        </span>
                        {done && <CheckCircle2 size={13} className="text-slate-300 flex-shrink-0" title="Played" />}
                        <span className="text-[11px] text-slate-400 tabular-nums flex-shrink-0 flex items-center gap-0.5"><ThumbsUp size={11} /> {t.votes?.length || 0}</span>
                      </button>
                    );
                  })}
                </div>
                <AddTracks onAddYouTube={addYouTubeTrack} onAddFiles={addLocalFiles} />
              </div>
              <Soundboard getMixBus={live.getMixBus} accent={BRAND} enabled={!!session} />
            </div>
          </div>

          {/* Live chat */}
          <div className="h-full min-h-0">
            <ChatPanel engagement={engagement} accent={BRAND} />
          </div>
        </div>
        {saveModal}
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
            {current && !current.local ? (
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

          {/* Mixer: Music + Mic vertical faders — syncs to listeners */}
          <div style={{ padding: '12px 18px', borderTop: '1px solid #F1F5F9', background: '#0F172A', display: 'flex', gap: 12 }}>
            <Fader label="Music" value={musicVol} max={100} unit="%"
              disabled={!current}
              onChange={applyVolume}
              color={BRAND}
              icon={musicVol === 0 ? <VolumeX size={13}/> : musicVol < 40 ? <Volume1 size={13}/> : <Volume2 size={13}/>}
              quickActions={[{ label: 'Duck', value: 20 }, { label: 'Up', value: 60 }]}
            />
            <Fader label="Mic" value={Math.round((live.micGain || 1) * 100)} max={200} unit="%"
              disabled={false}
              onChange={(v) => live.setMicGain((v || 0) / 100)}
              color="#10B981"
              icon={<Mic size={13}/>}
              quickActions={[{ label: 'Low', value: 80 }, { label: 'Hot', value: 150 }]}
            />
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

      {/* Audience panel — chat + likes + reactions from the room */}
      <div style={{ marginTop: 14, background: 'linear-gradient(180deg, #0F172A, #1E1B4B)', borderRadius: 18, padding: 14, border: '1px solid #334155' }}>
        <AudiencePanel roomType="dj" roomId={session._id} accent={BRAND} />
      </div>

      {saveModal}

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
