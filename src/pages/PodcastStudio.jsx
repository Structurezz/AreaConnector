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
import { useSite } from '../context/SiteContext';
import { lower, withAn } from '../utils/siteTypes';

const useW = () => { const { terms: T, isEstate: E } = useSite(); return { T, E, site: lower(T.site), Site: T.site, member: lower(T.member), Member: T.member, members: lower(T.members), Members: T.members }; };

// Podcast rooms are voice-only live sessions (server kinds: podcast | chat | prayer).
// Everything here stays inside the Podcast section; the Lounge's DJ console is separate.
const STYLES = [
  { key: 'podcast', Icon: Headphones,    label: 'Podcast show', desc: 'Host a show; it is recorded and saved to the archive.', color: '#10B981', dark: '#059669' },
  { key: 'chat',    Icon: MessageSquare, label: 'Talk room',    desc: 'An open conversation with your community.',             color: '#0EA5E9', dark: '#0369A1' },
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
  const W = useW();
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
  const [leftTab, setLeftTab]   = useState('music');
  const [rightTab, setRightTab] = useState('rundown');

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
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-scale-in overflow-hidden">
          <div className="px-6 pt-6 pb-5" style={{ background: `linear-gradient(160deg, ${meta.color}18, #FFFFFF 70%)` }}>
            <span className="w-11 h-11 rounded-xl flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.dark})`, boxShadow: `0 10px 22px -10px ${meta.color}` }}>
              <Save size={18} />
            </span>
            <div className="mt-3 text-[17px] font-semibold text-slate-900">That's a wrap 🎉</div>
            <p className="text-[13px] text-slate-500 mt-0.5">Save the recording so {W.members} can replay it on the Podcast page.</p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {[
                ['Length', fmtDur(voiceDurRef.current * 1000)],
                ['Peak', peak],
                ['Likes', engagement.likes],
                ['Songs', setlist.length],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-white border border-slate-200 px-2 py-2 text-center">
                  <div className="text-[15px] font-semibold text-slate-900 tabular-nums">{v}</div>
                  <div className="text-[10px] text-slate-400">{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="px-6 pb-6">
            <label className="text-[12px] font-semibold text-slate-600">Title</label>
            <input value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} className="input-field mt-1.5" placeholder="Title" />
            <div className="flex gap-2 mt-4">
              <button onClick={() => navigate('/podcasts')} disabled={saving} className="btn-outline">Discard</button>
              <button onClick={saveRecording} disabled={saving || !saveTitle.trim()} className="btn-primary flex-1"
                style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.dark})` }}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save recording</>}
              </button>
            </div>
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
          { key: 'style', title: 'What kind of room?', hint: `Pick how you want to talk to your ${W.members}.`,
            content: (
              <div className="space-y-2.5">
                {STYLES.map(({ key, Icon, label, desc, color }) => (
                  <OptionCard key={key} on={style === key} color={color} Icon={Icon} label={label} desc={desc} onClick={() => setStyle(key)} />
                ))}
              </div>
            ) },
          { key: 'details', title: 'Name your room', hint: `This is what ${W.members} see in their notification.`,
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
                    placeholder={`e.g. Monthly ${W.site} update and Q&A`} className={`mt-1.5 resize-none ${inputCls}`} />
                </div>
              </div>
            ) },
          { key: 'music', title: 'Add music (optional)', hint: 'Songs you can play between segments. You can skip this and add them later.',
            content: <DeckList deck={deck} accent={meta.color} /> },
          { key: 'rundown', title: 'Plan your show (optional)', hint: 'A simple running order you can tick off while you are live.',
            content: <RundownPanel rundown={rundown} live={false} accent={meta.color} /> },
          { key: 'mic', title: 'Check your mic', hint: `Make sure ${W.members} can hear you clearly.`,
            content: (
              <div className="space-y-3">
                <MicCheck accent={meta.color} />
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-2 text-[13px] text-slate-600">
                  <div>🎧 Use headphones so your speaker doesn't echo into the mic.</div>
                  <div>🔔 {W.Members} get a notification the moment you go live.</div>
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
    const first = user?.name?.split(' ')[0] || 'there';
    const shownTitle = title.trim() || `${user?.name || 'Your'}'s ${meta.label}`;
    const trackCount = (deck.tracks || []).length;
    const segCount = (rundown.items || []).length;
    const checks = [
      { label: 'Room style', done: true, value: meta.label },
      { label: 'Title', done: !!title.trim(), value: title.trim() ? 'Named' : 'Using default' },
      { label: 'Music', done: trackCount > 0, value: trackCount ? `${trackCount} song${trackCount === 1 ? '' : 's'}` : 'Optional' },
      { label: 'Rundown', done: segCount > 0, value: segCount ? `${segCount} segment${segCount === 1 ? '' : 's'}` : 'Optional' },
    ];
    const field = 'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:bg-white focus:ring-4';

    return (
      <div className="max-w-[1300px] mx-auto pb-10 space-y-5">
        {/* Header */}
        <div className="dash-rise flex items-end justify-between gap-4">
          <div className="min-w-0">
            <button onClick={() => navigate('/podcasts')} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-500 hover:text-slate-900 transition-colors">
              <ArrowLeft size={14} /> Podcast
            </button>
            <h1 className="mt-1.5 text-[22px] font-semibold text-slate-900" style={{ letterSpacing: '-0.025em' }}>Go live, {first}</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">Set up your room. {W.Members} get a notification the moment you start.</p>
          </div>
          <div className="hidden xl:flex items-center gap-1.5">
            {checks.map((c, i) => (
              <div key={c.label} className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-full border transition-all"
                  style={c.done ? { borderColor: `${meta.color}55`, background: `${meta.color}10`, color: meta.dark } : { borderColor: '#E2E8F0', background: '#fff', color: '#64748B' }}>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={c.done ? { background: meta.color, color: '#fff' } : { background: '#F1F5F9', color: '#94A3B8' }}>{c.done ? '✓' : i + 1}</span>
                  {c.label}
                </span>
                {i < checks.length - 1 && <span className="w-4 h-px bg-slate-200" />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
          <div className="space-y-5 min-w-0">
            {/* 1 · Room style */}
            <section className="dash-rise rounded-2xl bg-white border border-slate-200/70 p-5" style={{ animationDelay: '60ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">1</span>
                <h2 className="text-[14px] font-semibold text-slate-900">What kind of room?</h2>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {STYLES.map(({ key, Icon, label, desc, color, dark }) => {
                  const on = style === key;
                  return (
                    <button key={key} onClick={() => setStyle(key)}
                      className="group relative overflow-hidden text-left rounded-2xl border p-4 transition-all hover:-translate-y-0.5"
                      style={on ? { borderColor: color, background: `linear-gradient(140deg, ${color}18, #FFFFFF 70%)`, boxShadow: `0 0 0 3px ${color}22, 0 14px 28px -20px ${color}` } : { borderColor: '#E2E8F0', background: '#fff' }}>
                      {on && <span className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center text-white text-[11px] font-bold" style={{ background: color }}>✓</span>}
                      <span className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:-rotate-6"
                        style={on ? { background: `linear-gradient(135deg, ${color}, ${dark})`, boxShadow: `0 8px 18px -8px ${color}` } : { background: `${color}14` }}>
                        <Icon size={18} style={{ color: on ? '#fff' : color }} />
                      </span>
                      <div className="mt-3 text-[14px] font-semibold" style={{ color: on ? dark : '#0F172A' }}>{label}</div>
                      <div className="mt-0.5 text-[12px] text-slate-500 leading-snug">{desc}</div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 2 · Details */}
            <section className="dash-rise rounded-2xl bg-white border border-slate-200/70 p-5" style={{ animationDelay: '110ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                <h2 className="text-[14px] font-semibold text-slate-900">Name your room</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between"><label className="text-[12px] font-semibold text-slate-600">Title</label><span className="text-[11px] text-slate-400 tabular-nums">{title.length}/80</span></div>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80}
                    placeholder={`${user?.name || 'Your'}'s ${meta.label}`} className={`mt-1.5 ${field}`}
                    style={{ '--tw-ring-color': `${meta.color}22` }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = meta.color)} onBlur={(e) => (e.currentTarget.style.borderColor = '')} />
                  <p className="text-[11px] text-slate-400 mt-1">Leave blank to use “{user?.name || 'Your'}'s {meta.label}”.</p>
                </div>
                <div>
                  <div className="flex justify-between"><label className="text-[12px] font-semibold text-slate-600">What's it about? <span className="font-normal text-slate-400">(optional)</span></label><span className="text-[11px] text-slate-400 tabular-nums">{topic.length}/200</span></div>
                  <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={2} maxLength={200}
                    placeholder={`e.g. Monthly ${W.site} update and Q&A`} className={`mt-1.5 resize-none ${field}`}
                    style={{ fontFamily: 'inherit', '--tw-ring-color': `${meta.color}22` }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = meta.color)} onBlur={(e) => (e.currentTarget.style.borderColor = '')} />
                </div>
              </div>
            </section>

            {/* 3 · Music + rundown */}
            <section className="dash-rise" style={{ animationDelay: '160ms' }}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">3</span>
                <h2 className="text-[14px] font-semibold text-slate-900">Prepare your show</h2>
                <span className="text-[12px] text-slate-400">· optional, you can do this while live too</span>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                <DeckList deck={deck} accent={meta.color} />
                <RundownPanel rundown={rundown} live={false} accent={meta.color} />
              </div>
            </section>
          </div>

          {/* Pre-flight rail */}
          <aside className="space-y-4 lg:sticky lg:top-0">
            <div className="dash-rise rounded-2xl border overflow-hidden" style={{ animationDelay: '80ms', borderColor: `${meta.color}40`, background: `linear-gradient(160deg, ${meta.color}12, #FFFFFF 45%)` }}>
              <div className="p-5">
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: meta.dark }}>Ready to go live</div>

                {/* Notification preview */}
                <div className="mt-3 rounded-2xl bg-white border border-slate-200 p-3 shadow-[0_12px_28px_-20px_rgba(15,23,42,0.5)]">
                  <div className="flex items-center gap-2 text-[10.5px] text-slate-400">
                    <span className="w-4 h-4 rounded-md flex items-center justify-center text-white" style={{ background: meta.color }}><meta.Icon size={9} /></span>
                    AreaMates · now
                  </div>
                  <div className="mt-1.5 text-[13px] font-semibold text-slate-900 truncate">🔴 {user?.name || 'You'} is live</div>
                  <div className="text-[12px] text-slate-600 truncate">{shownTitle}</div>
                  {topic.trim() && <div className="text-[11.5px] text-slate-400 truncate">{topic.trim()}</div>}
                </div>
                <div className="mt-1.5 text-[11px] text-slate-400 text-center">What {W.members} see on their phones</div>

                {/* Mic check */}
                <div className="mt-4">
                  <div className="text-[12px] font-semibold text-slate-600 mb-1.5">Test your mic</div>
                  <MicCheck accent={meta.color} />
                </div>

                {/* Checklist */}
                <div className="mt-4 rounded-xl bg-white border border-slate-200 divide-y divide-slate-100">
                  {checks.map((c) => (
                    <div key={c.label} className="flex items-center gap-2.5 px-3 py-2 text-[12.5px]">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                        style={c.done ? { background: meta.color, color: '#fff' } : { background: '#F1F5F9', color: '#CBD5E1' }}>✓</span>
                      <span className="text-slate-600 flex-1">{c.label}</span>
                      <span className={c.done ? 'font-medium text-slate-900' : 'text-slate-400'}>{c.value}</span>
                    </div>
                  ))}
                </div>

                <button onClick={goLive} disabled={starting}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-semibold text-[14px] transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-wait"
                  style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.dark})`, boxShadow: `0 14px 28px -14px ${meta.color}` }}>
                  {starting ? <><Loader2 size={16} className="animate-spin" /> Starting…</> : <><span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-white animate-ping opacity-70" /><span className="relative w-2 h-2 rounded-full bg-white" /></span> Go live now</>}
                </button>
                <p className="mt-2 text-[11px] text-slate-400 text-center">Needs microphone access · one live room per {W.site} at a time</p>
              </div>
            </div>

            <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 p-4 space-y-2.5" style={{ animationDelay: '140ms' }}>
              {[
                ['🎧', 'Use headphones', 'Stops your speakers echoing into the mic.'],
                ['⌨️', 'Press M to mute', 'Toggle your mic instantly while you are live.'],
                ['💾', style === 'podcast' ? 'Saved to the archive' : 'Keep it if you like', 'When you end, you can save the recording to the Podcast page.'],
              ].map(([e, t, d]) => (
                <div key={t} className="flex gap-3">
                  <span className="text-[16px] leading-none mt-0.5">{e}</span>
                  <div><div className="text-[12.5px] font-semibold text-slate-900">{t}</div><div className="text-[11.5px] text-slate-500">{d}</div></div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    );
  }

  /* ── Live studio ────────────────────────────────────────────────────── */
  const metrics = [
    { Icon: Users, v: live.listenerCount, label: 'Listening now', color: '#0EA5E9', pulse: live.listenerCount > 0 },
    { Icon: TrendingUp, v: peak, label: 'Peak', color: '#10B981' },
    { Icon: Heart, v: engagement.likes, label: 'Likes', color: '#F43F5E' },
    { Icon: Smile, v: engagement.reactionCount, label: 'Reactions', color: '#F59E0B' },
  ];
  const leftTabs = [['music', 'Music queue', Music], ['sounds', 'Soundboard', Sparkles]];
  const rightTabs = [['rundown', 'Rundown', ListChecks], ['notes', 'Notes', StickyNote]];
  const TabBar = ({ tabs, value, onChange }) => (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200 w-fit">
      {tabs.map(([k, l, I]) => (
        <button key={k} onClick={() => onChange(k)}
          className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg transition-all ${value === k ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}
          style={value === k ? { background: meta.color } : undefined}>
          <I size={12} /> {l}
        </button>
      ))}
    </div>
  );

  return (
    <div ref={shellRef} className="max-w-[1500px] mx-auto flex flex-col gap-4 pb-6 lg:pb-0"
      style={shellHeight ? { height: shellHeight } : undefined}>

      {/* On-air bar */}
      <div className="dash-rise flex-none relative overflow-hidden rounded-2xl border px-5 py-3.5 flex items-center gap-5"
        style={{ borderColor: `${meta.color}40`, background: `linear-gradient(110deg, #FEF2F2 0%, #FFFFFF 30%, ${meta.color}10 100%)` }}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-red-500 text-white flex-shrink-0 shadow-[0_6px_16px_-6px_#EF4444]">
            <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-white animate-ping opacity-80" /><span className="relative w-2 h-2 rounded-full bg-white" /></span>
            <span className="text-[11px] font-bold tracking-wider">ON AIR</span>
          </span>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-slate-900 truncate">{session.title}</div>
            <div className="text-[11.5px] text-slate-500 truncate flex items-center gap-1.5"><meta.Icon size={11} style={{ color: meta.color }} /> {meta.label}{session.message ? ` · ${session.message}` : ''}</div>
          </div>
        </div>
        <div className="flex-shrink-0 text-center px-4 border-x border-slate-200/70">
          <div className="text-[22px] font-semibold text-slate-900 tabular-nums leading-none" style={{ letterSpacing: '-0.02em' }}>{fmtDur(elapsed)}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1 flex items-center justify-center gap-1"><Clock size={10} /> On air</div>
        </div>
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          {metrics.map(({ Icon, v, label, color, pulse }) => (
            <div key={label} title={label} className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-white border border-slate-200">
              <span className="relative w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}14`, color }}>
                <Icon size={14} />
                {pulse && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />}
              </span>
              <div className="leading-tight">
                <div className="text-[14px] font-semibold text-slate-900 tabular-nums">{v}</div>
                <div className="text-[10px] text-slate-400">{label}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={endRoom} disabled={ending}
          className="flex-shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 font-semibold text-[13px] transition-colors disabled:opacity-60">
          {ending ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} End room
        </button>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
        <div className="lg:h-full lg:min-h-0 lg:overflow-y-auto no-scrollbar space-y-4 min-w-0">

          {/* Console — the mixing desk */}
          <div className="relative overflow-hidden rounded-2xl text-white"
            style={{ background: `linear-gradient(150deg, #0B1220 0%, #0F172A 55%, ${meta.dark} 170%)`, boxShadow: `0 24px 48px -32px ${meta.dark}` }}>
            <div className="absolute inset-0 pointer-events-none opacity-[0.07]"
              style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            <div className="dash-blob absolute -top-24 left-1/4 w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ background: `${meta.color}40` }} />
            <ReactionLayer reactions={engagement.reactions} />
            <div className="relative grid grid-cols-1 md:grid-cols-2 md:divide-x divide-white/10">
              {/* Mic channel */}
              <div className="p-5 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5"><Mic size={12} /> Mic</span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={live.micOn ? { background: `${meta.color}26`, color: '#A7F3D0' } : { background: 'rgba(248,113,113,0.15)', color: '#FCA5A5' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: live.micOn ? '#34D399' : '#F87171' }} />
                    {live.micOn ? 'Live' : 'Muted'}
                  </span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center py-4">
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    {live.micOn && (<>
                      <span className="absolute inset-0 rounded-full transition-transform duration-100" style={{ background: `${meta.color}1F`, transform: `scale(${1 + level * 0.5})` }} />
                      <span className="absolute inset-5 rounded-full transition-transform duration-100" style={{ background: `${meta.color}33`, transform: `scale(${1 + level * 0.3})` }} />
                    </>)}
                    <button onClick={live.toggleMic} aria-label={live.micOn ? 'Mute mic' : 'Unmute mic'}
                      className="relative w-24 h-24 rounded-full flex items-center justify-center transition-all hover:scale-105"
                      style={live.micOn
                        ? { background: `linear-gradient(135deg, ${meta.color}, ${meta.dark})`, boxShadow: `0 16px 40px -12px ${meta.color}` }
                        : { background: '#334155' }}>
                      {live.micOn ? <Mic size={34} /> : <MicOff size={34} />}
                    </button>
                  </div>
                  {/* level meter */}
                  <div className="mt-3 flex items-end gap-[3px] h-5 w-40">
                    {Array.from({ length: 20 }, (_, i) => (
                      <span key={i} className="flex-1 rounded-sm transition-all duration-75"
                        style={{ height: `${35 + (i / 20) * 65}%`, background: live.micOn && level * 20 > i ? (i > 16 ? '#F87171' : i > 12 ? '#FBBF24' : '#34D399') : 'rgba(255,255,255,0.1)' }} />
                    ))}
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

          {/* Tools */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div className="space-y-3">
              <TabBar tabs={leftTabs} value={leftTab} onChange={setLeftTab} />
              {leftTab === 'music'
                ? <DeckList deck={deck} player={player} accent={meta.color} />
                : <Soundboard getMixBus={live.getMixBus} accent={meta.color} enabled={!!session} />}
            </div>
            <div className="space-y-3">
              <TabBar tabs={rightTabs} value={rightTab} onChange={setRightTab} />
              {rightTab === 'rundown'
                ? <RundownPanel rundown={rundown} live accent={meta.color} />
                : <NotesPanel accent={meta.color} />}
            </div>
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
