import { useEffect, useRef, useState } from 'react';
import { Radio, Calendar, Play, Pause, X, Volume2 } from 'lucide-react';
import { podcastAPI } from '../api';

const VIOLET      = '#8B5CF6';
const VIOLET_DARK = '#6D28D9';

const niceDate = (d) => d ? new Date(d).toLocaleString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
const fmtMin   = (s) => `${Math.round((s || 0) / 60)} min`;

function EpisodePlayer({ episode, onClose }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos]         = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setPos(a.currentTime);
    const onEnd  = () => setPlaying(false);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnd);
    return () => { a.removeEventListener('timeupdate', onTime); a.removeEventListener('ended', onEnd); };
  }, []);

  const toggle = async () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { try { await audioRef.current.play(); setPlaying(true); } catch {} }
  };

  const dur = episode.durationSec || 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'linear-gradient(180deg, #0F172A, #1E1B4B)', display: 'flex', flexDirection: 'column', color: '#fff' }}>
      <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: '#C4B5FD', textTransform: 'uppercase' }}>AreaConnect FM</div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: 8, color: '#fff', cursor: 'pointer' }}><X size={16}/></button>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 110, height: 110, borderRadius: 28, background: `linear-gradient(135deg, ${VIOLET}, ${VIOLET_DARK})`, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 44px rgba(139,92,246,0.5)' }}>
            <Radio size={44}/>
          </div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: '#C4B5FD', textTransform: 'uppercase' }}>{episode.hostName}</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '4px 0 8px' }}>{episode.title}</h2>
          {episode.description && <p style={{ color: '#CBD5E1', fontSize: 13, lineHeight: 1.55, marginBottom: 20 }}>{episode.description}</p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={toggle}
              style={{ width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg, ${VIOLET}, ${VIOLET_DARK})`, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 10px 24px rgba(139,92,246,0.5)' }}>
              {playing ? <Pause size={22}/> : <Play size={22}/>}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, dur ? (pos / dur) * 100 : 0)}%`, background: `linear-gradient(90deg, ${VIOLET}, ${VIOLET_DARK})`, transition: 'width 0.3s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                <span>{Math.floor(pos / 60)}:{String(Math.floor(pos % 60)).padStart(2,'0')}</span>
                <span>{Math.floor(dur / 60)}:{String(Math.floor(dur % 60)).padStart(2,'0')}</span>
              </div>
            </div>
          </div>
          <audio ref={audioRef} src={episode.audioUrl} preload="auto" />
          {episode.guestNames?.length > 0 && (
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 14 }}>With {episode.guestNames.join(', ')}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PodcastFM() {
  const [upcoming, setUpcoming] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [playing, setPlaying]   = useState(null);

  useEffect(() => {
    podcastAPI.getUpcoming().then(({ data }) => setUpcoming(data.data || [])).catch(() => {});
    podcastAPI.listEpisodes().then(({ data }) => setEpisodes(data.data || [])).catch(() => {});
  }, []);

  if (upcoming.length === 0 && episodes.length === 0) return null;

  return (
    <div className="rounded-2xl p-4 border" style={{ borderColor: '#E2E8F0', background: 'linear-gradient(135deg, #FAF5FF, #F5F3FF)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${VIOLET}18`, color: VIOLET_DARK }}>
          <Radio size={14}/>
        </div>
        <div className="text-sm font-extrabold" style={{ color: '#0F172A' }}>AreaConnect FM</div>
        <span className="text-xs" style={{ color: '#94A3B8' }}>· cross-estate podcast</span>
      </div>

      {upcoming.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={11} style={{ color: VIOLET_DARK }}/>
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: VIOLET_DARK }}>Upcoming</span>
          </div>
          <div className="space-y-2">
            {upcoming.slice(0, 3).map(s => (
              <div key={s._id} className="rounded-xl p-3 flex items-center gap-3 border bg-white" style={{ borderColor: '#E2E8F0' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${VIOLET}18`, color: VIOLET_DARK }}>
                  <Radio size={15}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate" style={{ color: '#0F172A' }}>{s.title}</div>
                  <div className="text-[11px]" style={{ color: '#94A3B8' }}>
                    {s.scheduledAt ? niceDate(s.scheduledAt) : 'Any time'}
                    {s.isRecurring && <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#EDE9FE', color: VIOLET_DARK }}>Recurring</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {episodes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Play size={11} style={{ color: VIOLET_DARK }}/>
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: VIOLET_DARK }}>Past episodes</span>
          </div>
          <div className="space-y-2">
            {episodes.slice(0, 5).map(ep => (
              <button key={ep._id} onClick={() => setPlaying(ep)}
                className="w-full text-left rounded-xl p-3 flex items-center gap-3 border bg-white transition-colors"
                style={{ borderColor: '#E2E8F0' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = VIOLET}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#E2E8F0'}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${VIOLET}18`, color: VIOLET_DARK }}>
                  <Volume2 size={15}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate" style={{ color: '#0F172A' }}>{ep.title}</div>
                  <div className="text-[11px]" style={{ color: '#94A3B8' }}>
                    {new Date(ep.publishedAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })} · {fmtMin(ep.durationSec)}
                    {ep.guestNames?.length > 0 && <> · with {ep.guestNames.slice(0, 2).join(', ')}{ep.guestNames.length > 2 ? '…' : ''}</>}
                  </div>
                </div>
                <Play size={14} style={{ color: VIOLET_DARK }}/>
              </button>
            ))}
          </div>
        </div>
      )}

      {playing && <EpisodePlayer episode={playing} onClose={() => setPlaying(null)}/>}
    </div>
  );
}
