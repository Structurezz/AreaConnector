import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Users, X, Save, Loader2, Headphones, MessageSquare, Heart, ArrowLeft, Clock, TrendingUp, Smile,
  Music, Sparkles, ListChecks, StickyNote,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { djAPI } from '../api';
import { useLiveAudio } from '../hooks/useLiveAudio';
import useIsDesktop from '../hooks/useIsDesktop';
import useFillHeight from '../hooks/useFillHeight';
import { Fader } from '../components/MixerDeck';
import Portal from '../components/ui/Portal';
import {
  useRoomEngagement, ReactionLayer, ChatPanel, Soundboard, useRundown, RundownPanel, NotesPanel, useMicLevel,
} from '../components/podcast/StudioPanels';
import DeckList, { useMusicDeck, useMusicPlayer, MusicChannel } from '../components/podcast/MusicDeck';
import MobileHostStudio from '../components/podcast/MobileHostStudio';
import SetupSteps, { OptionCard, MicCheck } from '../components/podcast/SetupSteps';

// Podcast rooms are voice-only live sessions (server kinds: podcast | chat | prayer).
// Everything here stays inside the Podcast section; the Lounge's DJ console is separate.
const STYLES = [
  { key: 'podcast', Icon: Headphones,    label: 'Podcast show', desc: 'Host a show; it is recorded and saved to the archive.', color: '#10B981', dark: '#059669' },
  { key: 'chat',    Icon: MessageSquare, label: 'Talk room',    desc: 'An open conversation with your residents.',             color: '#0EA5E9', dark: '#0369A1' },
  { key: 'prayer',  Icon: Heart,         label: 'Prayer room',  desc: 'Lead a prayer or devotional session.',                  color: '#EC4899', dark: '#BE185D' },
];

const MIC_ERRORS = {
  NotAllowedError:      'Mic blocked. Allow microphone access in your browser.',
  NotFoundError:        'No microphone found on this device.',
  NotReadableError:     'Your microphone is in use by another app.',
  OverconstrainedError: 'Mic settings not supported on this device.',
  SecurityError:        'Mic needs a secure (HTTPS) connection to work.',
};

const fmtDur = (ms) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(r).padStart(2, '0')}`;
};

function createVoiceRecorder() {
  let recorder = null;
  const chunks = [];
  return {
    start(stream) {
      try {
        const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
        recorder = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 96000 });
        recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
        recorder.start(1000);
      } catch (e) { console.warn('recorder unsupported', e); }
    },
    async stop() {
      if (!recorder || recorder.state === 'inactive') return chunks.length ? new Blob(chunks, { type: 'audio/webm' }) : null;
      await new Promise((r) => { recorder.onstop = r; recorder.stop(); });
      return new Blob(chunks, { type: 'audio/webm' });
    },
  };
}

async function uploadVoice(blob) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const preset    = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !preset || !blob) return '';
  const form = new FormData();
  form.append('file', blob); form.append('upload_preset', preset); form.append('resource_type', 'video');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  return (await res.json()).secure_url;
}

export default function PodcastStudio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  const [style, setStyle]       = useState('podcast');
  const [title, setTitle]       = useState('');
  const [topic, setTopic]       = useState('');
  const [session, setSession]   = useState(null);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding]     = useState(false);
  const [elapsed, setElapsed]   = useState(0);
  const [peak, setPeak]         = useState(0);
  const [showSave, setShowSave] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saving, setSaving]     = useState(false);
  const [rawStream, setRawStream] = useState(null);
  const [setlist, setSetlist]   = useState([]);   // songs played, for the saved recording

  const recorderRef  = useRef(createVoiceRecorder());
  const startedAtRef = useRef(0);
  const voiceBlobRef = useRef(null);
  const voiceDurRef  = useRef(0);
  const shellRef     = useRef(null);

  const live = useLiveAudio({ roomType: 'dj', roomId: session?._id || null, role: 'host', enabled: !!session });
  const engagement = useRoomEngagement(session?._id);
  const rundown = useRundown();
  const deck = useMusicDeck();
  const player = useMusicPlayer({ deck, session, startedAt: startedAtRef.current, onSetlist: setSetlist });
  const level = useMicLevel(rawStream, !!session && live.micOn);
  const meta = STYLES.find((s) => s.key === (session?.kind || style)) || STYLES[0];
  const shellHeight = useFillHeight(shellRef, !!session && isDesktop, { min: 560 });

  useEffect(() => { if (live.listenerCount > peak) setPeak(live.listenerCount); }, [live.listenerCount, peak]);
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setElapsed(Date.now() - startedAtRef.current), 1000);
    return () => clearInterval(id);
  }, [session]);

  // Warn before closing the tab mid-broadcast
  useEffect(() => {
    if (!session) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [session]);

  // M toggles the mic while live
  useEffect(() => {
    if (!session) return;
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'm' || e.key === 'M') { e.preventDefault(); live.toggleMic(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session, live]);

  const goLive = async () => {
    try {
      setStarting(true);
      const stream = await live.getLocalStream();   // processed mix (mic + soundboard) — what listeners hear
      recorderRef.current.start(stream);
      setRawStream(live.getRawStream?.() || stream);
      const { data } = await djAPI.start({
        kind: style,
        title: title.trim() || `${user?.name}'s ${meta.label}`,
        message: topic.trim(),
      });
      startedAtRef.current = Date.now();
      setSession(data.data);
      rundown.start();
      toast.success('You are live 🎙️');
    } catch (e) {
      console.error('[podcast goLive]', e);
      const serverMsg = e.response?.data?.message;
      if (MIC_ERRORS[e?.name]) toast.error(MIC_ERRORS[e.name]);
      else if (serverMsg) toast.error(serverMsg);
      else if (!e?.response && e?.message) toast.error(`Network: ${e.message}`);
      else toast.error('Could not start the room');
    } finally {
      setStarting(false);
    }
  };

  const endRoom = async () => {
    if (!session || ending) return;
    if (!confirm('End the room for everyone?')) return;
    setEnding(true);
    const totalSec = Math.floor((Date.now() - startedAtRef.current) / 1000);
    voiceBlobRef.current = await recorderRef.current.stop();
    voiceDurRef.current = totalSec;
    setSetlist((prev) => {
      if (!prev.length) return prev;
      const copy = [...prev];
      copy[copy.length - 1] = { ...copy[copy.length - 1], endSec: totalSec };
      return copy;
    });
    try { await djAPI.end(session._id); } catch { /* room may already be closed */ }
    setEnding(false);
    setSaveTitle(`${session.title} · ${new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}`);
    setShowSave(true);
  };

  const saveRecording = async () => {
    if (!saveTitle.trim()) { toast.error('Give it a title'); return; }
    setSaving(true);
    try {
      let voiceAudioUrl = '';
      if (voiceBlobRef.current) {
        try { voiceAudioUrl = await uploadVoice(voiceBlobRef.current); }
        catch { toast('Saved without audio (upload failed)', { icon: '⚠️' }); }
      }
      await djAPI.saveMixtape({
        sessionId: session._id, title: saveTitle.trim(), voiceAudioUrl,
        voiceDurationSec: voiceDurRef.current, setlist, totalDurationSec: voiceDurRef.current,
        peakListeners: peak,
      });
      toast.success('Saved to the Podcast archive');
      navigate('/podcasts');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const saveModal = showSave && (
    <Portal>
          <div className="fixed inset-0 z-[100] overlay-scrim flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-scale-in">
              <div className="text-[16px] font-semibold text-slate-900">Save to the Podcast archive?</div>
              <p className="text-[13px] text-slate-500 mt-1">
                {fmtDur(voiceDurRef.current * 1000)} recorded{setlist.length ? ` · ${setlist.length} song${setlist.length === 1 ? '' : 's'}` : ''} · peak {peak} listener{peak === 1 ? '' : 's'} · {engagement.likes} like{engagement.likes === 1 ? '' : 's'}
              </p>
              <input value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} className="input-field mt-4" placeholder="Title" />
              <div className="flex gap-2 mt-4">
                <button onClick={() => navigate('/podcasts')} disabled={saving} className="btn-outline">Discard</button>
                <button onClick={saveRecording} disabled={saving || !saveTitle.trim()} className="btn-primary flex-1"
                  style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.dark})` }}>
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save recording</>}
                </button>
              </div>
            </div>
          </div>
        </Portal>
  );

  /* ── Phone: step-by-step set-up ─────────────────────────────────────── */
  if (!session && !isDesktop) {
    const inputCls = 'w-full px-3.5 py-3 rounded-xl bg-white border border-slate-200 text-[15px] outline-none focus:border-slate-400';
    return (
      <SetupSteps heading={meta.label} accent={meta.color} onExit={() => navigate('/podcasts')}
        onFinish={goLive} finishing={starting}
        steps={[
          { key: 'style', title: 'What kind of room?', hint: 'Pick how you want to talk to your residents.',
            content: (
              <div className="space-y-2.5">
                {STYLES.map(({ key, Icon, label, desc, color }) => (
                  <OptionCard key={key} on={style === key} color={color} Icon={Icon} label={label} desc={desc} onClick={() => setStyle(key)} />
                ))}
              </div>
            ) },
          { key: 'details', title: 'Name your room', hint: 'This is what residents see in their notification.',
            content: (
              <div className="space-y-4">
                <div>
                  <label className="text-[12px] font-semibold text-slate-500">Title</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} autoFocus
                    placeholder={`${user?.name || 'Your'}'s ${meta.label}`} className={`mt-1.5 ${inputCls}`} />
                  <p className="text-[11px] text-slate-400 mt-1">Leave blank to use “{user?.name || 'Your'}'s {meta.label}”.</p>
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-slate-500">What's it about? <span className="font-normal text-slate-400">(optional)</span></label>
                  <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={3} maxLength={200}
                    placeholder="e.g. Monthly estate update and Q&A" className={`mt-1.5 resize-none ${inputCls}`} />
                </div>
              </div>
            ) },
          { key: 'music', title: 'Add music (optional)', hint: 'Songs you can play between segments. You can skip this and add them later.',
            content: <DeckList deck={deck} accent={meta.color} /> },
          { key: 'rundown', title: 'Plan your show (optional)', hint: 'A simple running order you can tick off while you are live.',
            content: <RundownPanel rundown={rundown} live={false} accent={meta.color} /> },
          { key: 'mic', title: 'Check your mic', hint: 'Make sure residents can hear you clearly.',
            content: (
              <div className="space-y-3">
                <MicCheck accent={meta.color} />
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-2 text-[13px] text-slate-600">
                  <div>🎧 Use headphones so your speaker doesn't echo into the mic.</div>
                  <div>🔔 Residents get a notification the moment you go live.</div>
                  {style === 'podcast' && <div>💾 When you end, you can save the recording to the Podcast archive.</div>}
                </div>
              </div>
            ) },
        ]} />
    );
  }

  /* ── Phone: live ────────────────────────────────────────────────────── */
  if (session && !isDesktop) {
    const cur = player.current;
    return (
      <>
        <MobileHostStudio
          title={session.title} kindLabel={`${meta.label}${session.message ? ` · ${session.message}` : ''}`} KindIcon={meta.Icon}
          accent={meta.color} dark={meta.dark} live={live} level={level} elapsed={elapsed} peak={peak}
          engagement={engagement} onEnd={endRoom} ending={ending}
          music={{
            title: cur?.title, subtitle: cur ? 'Playing to everyone' : (deck.tracks.length ? 'Tap Next to start the music' : 'Add songs in the Music tab'),
            thumb: cur?.videoId ? `https://i.ytimg.com/vi/${cur.videoId}/default.jpg` : null,
            onNext: deck.tracks.length ? player.next : null, nextLabel: cur ? 'Next' : 'Play',
            volume: player.vol, onVolume: player.setVolume,
            player: cur && (
              <div className="relative mt-3 w-full aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/10">
                <iframe ref={player.iframeRef} key={cur.videoId} title="Now playing"
                  src={`https://www.youtube.com/embed/${cur.videoId}?autoplay=1&playsinline=1&modestbranding=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
                  allow="autoplay; encrypted-media"
                  onLoad={() => {
                    try { player.iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening' }), '*'); } catch {}
                    setTimeout(() => player.post('setVolume', [player.vol]), 400);
                  }}
                  className="absolute inset-0 w-full h-full border-0" />
              </div>
            ),
          }}
          tabs={[
            { key: 'music', label: 'Music', Icon: Music, content: <DeckList deck={deck} player={player} accent={meta.color} /> },
            { key: 'sounds', label: 'Sounds', Icon: Sparkles, content: <Soundboard getMixBus={live.getMixBus} accent={meta.color} enabled /> },
            { key: 'rundown', label: 'Rundown', Icon: ListChecks, content: <RundownPanel rundown={rundown} live accent={meta.color} /> },
            { key: 'notes', label: 'Notes', Icon: StickyNote, content: <NotesPanel accent={meta.color} /> },
          ]} />
        {saveModal}
      </>
    );
  }

  /* ── Set-up ─────────────────────────────────────────────────────────── */
  if (!session) {
    return (
      <div className="max-w-[1200px] mx-auto pb-10">
        <button onClick={() => navigate('/podcasts')} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900 mb-4 transition-colors">
          <ArrowLeft size={14} /> Podcasts
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
          <div className="space-y-5 min-w-0">
            <div className="dash-rise relative overflow-hidden rounded-2xl p-6 text-white"
              style={{ background: `linear-gradient(120deg, ${meta.dark}, ${meta.color})`, boxShadow: `0 18px 36px -20px ${meta.color}` }}>
              <div className="dash-blob absolute -top-20 right-10 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(255,255,255,0.22)' }} />
              <div className="relative">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/15 border border-white/20">
                  <meta.Icon size={11} /> {meta.label}
                </span>
                <h1 className="mt-3 text-[22px] font-semibold text-white" style={{ letterSpacing: '-0.025em' }}>Go live, {user?.name?.split(' ')[0] || 'there'}</h1>
                <p className="mt-1 text-[13px] text-white/80">{meta.desc} Residents get a notification when you start.</p>

                <label className="block mt-5 text-[11px] font-semibold uppercase tracking-wider text-white/70">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80}
                  placeholder={`${user?.name || 'Your'}'s ${meta.label}`}
                  className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl bg-white/15 border border-white/25 text-[14px] text-white placeholder-white/50 outline-none focus:bg-white/20 focus:border-white/50 transition-colors" />

                <label className="block mt-3 text-[11px] font-semibold uppercase tracking-wider text-white/70">What's it about? <span className="normal-case font-normal text-white/50">(optional)</span></label>
                <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={2} maxLength={200}
                  placeholder="e.g. Monthly estate update and Q&A"
                  className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl bg-white/15 border border-white/25 text-[14px] text-white placeholder-white/50 outline-none resize-none focus:bg-white/20 focus:border-white/50 transition-colors" />

                <button onClick={goLive} disabled={starting}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-white font-semibold text-[14px] transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-wait"
                  style={{ color: meta.dark, boxShadow: '0 10px 22px -10px rgba(0,0,0,0.4)' }}>
                  {starting ? <><Loader2 size={16} className="animate-spin" /> Starting…</> : <><Mic size={16} /> Go live now</>}
                </button>
                <p className="mt-2.5 text-[11px] text-white/65 text-center">Needs microphone access. Only one live room can run in the estate at a time.</p>
              </div>
            </div>

            <div className="dash-rise grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ animationDelay: '80ms' }}>
              {[
                ['🎧', 'Use headphones', 'Stops your speakers echoing into the mic.'],
                ['💬', 'Run the room', 'Play music, chat, pin messages, fire sound effects and track your rundown.'],
                ['💾', 'Keep the show', 'When you end, save the recording to the Podcast archive.'],
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
            <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 p-3" style={{ animationDelay: '60ms' }}>
              <div className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Room style</div>
              <div className="space-y-2">
                {STYLES.map(({ key, Icon, label, desc, color }) => {
                  const on = style === key;
                  return (
                    <button key={key} onClick={() => setStyle(key)}
                      className="w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all hover:-translate-y-0.5"
                      style={on ? { borderColor: color, background: `${color}10`, boxShadow: `0 0 0 3px ${color}1A` } : { borderColor: '#E2E8F0' }}>
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={on ? { background: `linear-gradient(135deg, ${color}, ${color}CC)` } : { background: `${color}14` }}>
                        <Icon size={15} style={{ color: on ? '#fff' : color }} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold" style={{ color: on ? color : '#0F172A' }}>{label}</span>
                        <span className="block text-[12px] text-slate-500 leading-snug mt-0.5">{desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="dash-rise" style={{ animationDelay: '120ms' }}>
              <DeckList deck={deck} accent={meta.color} />
            </div>
            <div className="dash-rise" style={{ animationDelay: '180ms' }}>
              <RundownPanel rundown={rundown} live={false} accent={meta.color} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Live studio ────────────────────────────────────────────────────── */
  return (
    <div ref={shellRef} className="max-w-[1500px] mx-auto flex flex-col gap-4 pb-6 lg:pb-0"
      style={shellHeight ? { height: shellHeight } : undefined}>

      {/* On-air bar: status, title, live numbers, end */}
      <div className="dash-rise flex-none flex items-center justify-between gap-4 px-5 py-3 rounded-2xl bg-slate-900 text-white">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 flex-shrink-0">
            <span className="relative flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-red-400 animate-ping" />
              <span className="relative w-2 h-2 rounded-full bg-red-500" />
            </span>
            <span className="text-[11px] font-bold tracking-wider text-red-300">ON AIR</span>
          </span>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold truncate">{session.title}</div>
            <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5"><meta.Icon size={11} /> {meta.label}{session.message ? ` · ${session.message}` : ''}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {[
            [Clock, fmtDur(elapsed), 'On air', '#CBD5E1'],
            [Users, live.listenerCount, 'Listening', '#7DD3FC'],
            [TrendingUp, peak, 'Peak', '#A7F3D0'],
            [Heart, engagement.likes, 'Likes', '#FDA4AF'],
            [Smile, engagement.reactionCount, 'Reactions', '#FDE68A'],
          ].map(([Icon, v, label, color]) => (
            <div key={label} title={label} className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[12px] tabular-nums">
              <Icon size={13} style={{ color }} /> <span className="font-semibold">{v}</span>
            </div>
          ))}
          <button onClick={endRoom} disabled={ending}
            className="ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold text-[12px] transition-colors disabled:opacity-60">
            {ending ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} End room
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
        {/* Main: console, then paired tool rows */}
        <div className="lg:h-full lg:min-h-0 lg:overflow-y-auto no-scrollbar space-y-4 min-w-0">

          {/* Console — mic and music channels side by side */}
          <div className="relative overflow-hidden rounded-2xl text-white"
            style={{ background: `linear-gradient(150deg, #0F172A 0%, #022C22 55%, ${meta.dark} 150%)` }}>
            <div className="dash-blob absolute -top-24 left-1/4 w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ background: `${meta.color}44` }} />
            <ReactionLayer reactions={engagement.reactions} />
            <div className="relative grid grid-cols-1 md:grid-cols-2 md:divide-x divide-white/10">
              {/* Mic channel */}
              <div className="p-5 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5"><Mic size={12} /> Mic</span>
                  <span className="text-[11px] font-medium" style={{ color: live.micOn ? '#A7F3D0' : '#FCA5A5' }}>{live.micOn ? 'Live' : 'Muted'}</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center py-4">
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    {live.micOn && (
                      <>
                        <span className="absolute inset-0 rounded-full transition-transform duration-100" style={{ background: `${meta.color}22`, transform: `scale(${1 + level * 0.5})` }} />
                        <span className="absolute inset-5 rounded-full transition-transform duration-100" style={{ background: `${meta.color}33`, transform: `scale(${1 + level * 0.3})` }} />
                      </>
                    )}
                    <button onClick={live.toggleMic} aria-label={live.micOn ? 'Mute mic' : 'Unmute mic'}
                      className="relative w-24 h-24 rounded-full flex items-center justify-center transition-all hover:scale-105"
                      style={live.micOn
                        ? { background: `linear-gradient(135deg, ${meta.color}, ${meta.dark})`, boxShadow: `0 16px 40px -12px ${meta.color}` }
                        : { background: '#334155' }}>
                      {live.micOn ? <Mic size={34} /> : <MicOff size={34} />}
                    </button>
                  </div>
                  <div className="mt-2 text-[12px] text-white/60">{live.micOn ? 'You are speaking' : 'You are muted'} · press <kbd className="px-1 rounded bg-white/10 text-white/80">M</kbd></div>
                </div>
                <div className="p-3 rounded-xl bg-black/25 border border-white/10">
                  <Fader label="Mic" value={Math.round((live.micGain || 1) * 100)} max={200} unit="%"
                    onChange={(v) => live.setMicGain((v || 0) / 100)} color={meta.color} icon={<Mic size={13} />}
                    quickActions={[{ label: 'Low', value: 80 }, { label: 'Hot', value: 150 }]} />
                </div>
              </div>

              {/* Music channel */}
              <div className="p-5 border-t md:border-t-0 border-white/10">
                <MusicChannel player={player} hasTracks={deck.tracks.length > 0} accent={meta.color} />
              </div>
            </div>
          </div>

          {/* Music deck + soundboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <DeckList deck={deck} player={player} accent={meta.color} />
            <Soundboard getMixBus={live.getMixBus} accent={meta.color} enabled={!!session} />
          </div>

          {/* Rundown + notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <RundownPanel rundown={rundown} live accent={meta.color} />
            <NotesPanel accent={meta.color} />
          </div>
        </div>

        {/* Right: live chat */}
        <div className="h-[520px] lg:h-full min-h-0">
          <ChatPanel engagement={engagement} accent={meta.color} />
        </div>
      </div>

      {saveModal}
    </div>
  );
}
