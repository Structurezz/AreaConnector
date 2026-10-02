import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Mic, MicOff, Users, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth }   from '../context/AuthContext';
import { djAPI }     from '../api';
import { useLiveAudio } from '../hooks/useLiveAudio';

const RED      = '#EF4444';
const RED_DARK = '#DC2626';

const fmtDur = (ms) => {
  const s = Math.floor(ms / 1000); const m = Math.floor(s / 60); const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
};

export default function AnnouncementBroadcast() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [headline, setHeadline] = useState('');
  const [starting, setStarting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [peak, setPeak] = useState(0);
  const startRef = useRef(0);

  const live = useLiveAudio({
    roomType: 'dj',
    roomId:   session?._id || null,
    role:     'host',
    enabled:  !!session,
  });

  useEffect(() => { if (live.listenerCount > peak) setPeak(live.listenerCount); }, [live.listenerCount, peak]);

  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setElapsed(Date.now() - startRef.current), 1000);
    return () => clearInterval(id);
  }, [session]);

  const goLive = async () => {
    if (!headline.trim()) return toast.error('Give the announcement a headline');
    try {
      setStarting(true);
      await live.getLocalStream();
      const { data } = await djAPI.start({
        kind: 'announcement',
        title: `Announcement from ${user?.name || 'the manager'}`,
        message: headline.trim(),
      });
      startRef.current = Date.now();
      setSession(data.data);
      toast.success('📢 Live — speak clearly');
    } catch (e) {
      toast.error(e?.name === 'NotAllowedError'
        ? 'Mic access required'
        : (e.response?.data?.message || 'Could not start'));
    } finally { setStarting(false); }
  };

  const endBroadcast = async () => {
    if (!session) return;
    try { await djAPI.end(session._id); } catch {}
    toast.success('Announcement ended');
    navigate('/announcements');
  };

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
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2 }}>
            Speak to the whole estate.
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.55, marginTop: 10, opacity: 0.9 }}>
            Every resident gets an instant notification. No music — just your voice. This will preempt any active DJ or room.
          </p>

          <label style={{ display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.9, marginTop: 18 }}>
            Headline (shown on their banner)
          </label>
          <input value={headline} onChange={e => setHeadline(e.target.value)}
            placeholder="e.g. Water will be off from 10am–2pm"
            style={{ width: '100%', marginTop: 6, padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 14, outline: 'none' }} />

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
          <strong style={{ color: '#334155' }}>Tip:</strong> For non-urgent news, use <em>New Announcement</em> (text post). Live broadcast is best for things residents need to hear <em>right now</em>.
        </div>
      </div>
    );
  }

  // Live view
  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '24px 16px 40px' }}>
      <div style={{ background: `linear-gradient(135deg, ${RED} 0%, ${RED_DARK} 100%)`, borderRadius: 20, padding: 26, color: '#fff', boxShadow: '0 20px 44px -18px rgba(239,68,68,0.55)', position: 'relative', overflow: 'hidden' }}>
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

          <button onClick={endBroadcast}
            style={{ marginTop: 20, width: '100%', padding: '11px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <X size={14}/> End announcement
          </button>
        </div>
      </div>
      <style>{`@keyframes ping { 75%,100% { transform: scale(2.4); opacity: 0; } }`}</style>
    </div>
  );
}
