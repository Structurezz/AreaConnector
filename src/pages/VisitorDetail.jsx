import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { visitorAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Badge, { visitorStatusBadge } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { ArrowLeft, UserCheck, Share2, CheckCircle, LogIn, LogOut, Ban, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ACCENT      = '#10B981';
const ACCENT_DARK = '#059669';
const BRAND_URL   = 'areaconnect.pro';

const truncate = (s, maxLen) => {
  if (!s) return '';
  const str = String(s);
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
};

const WhatsAppIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const generatePassCanvas = async (v, estate) => {
  const W = 580, H = 820;
  const estateName    = truncate(estate?.name || 'Your Estate', 36);
  const estateAddress = truncate(estate?.address || '', 60);

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // Hero
  const grad = ctx.createLinearGradient(0, 0, W, 230);
  grad.addColorStop(0, ACCENT); grad.addColorStop(1, ACCENT_DARK);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 230);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath(); ctx.arc(W - 40, 30, 110, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.beginPath(); ctx.arc(40, 220, 80, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = 'bold 11px sans-serif';
  const estateCap = estateName.toUpperCase();
  ctx.fillText(estateCap, 36, 46);
  const w = ctx.measureText(estateCap).width;
  ctx.fillStyle = 'rgba(255,255,255,0.70)';
  ctx.fillText('·', 36 + w + 6, 46);
  ctx.fillText('GUEST PASS', 36 + w + 18, 46);

  ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 28px sans-serif';
  ctx.fillText(truncate(v.visitorName, 24), 36, 100);
  ctx.fillStyle = 'rgba(255,255,255,0.82)'; ctx.font = '15px sans-serif';
  ctx.fillText(truncate(v.purpose, 36), 36, 132);
  ctx.fillStyle = 'rgba(255,255,255,0.70)'; ctx.font = '13px sans-serif';
  ctx.fillText(format(new Date(v.expectedDate), 'MMM d, yyyy · h:mm a'), 36, 162);
  if (estateAddress) {
    ctx.fillStyle = 'rgba(255,255,255,0.60)'; ctx.font = '11px sans-serif';
    ctx.fillText(estateAddress, 36, 195);
  }

  // Perforation
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath(); ctx.arc(0, 250, 10, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W, 250, 10, 0, Math.PI * 2); ctx.fill();
  ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(15,23,42,0.14)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(16, 250); ctx.lineTo(W - 16, 250); ctx.stroke();
  ctx.setLineDash([]);

  // Code + QR
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94A3B8'; ctx.font = 'bold 11px sans-serif';
  ctx.fillText('ACCESS CODE', W / 2, 288);
  ctx.fillStyle = ACCENT; ctx.font = 'bold 42px monospace';
  ctx.fillText(v.visitorCode, W / 2, 340);

  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, v.visitorCode, { width: 200, margin: 2, color: { dark: '#0B1C3D', light: '#FFFFFF' } });
  ctx.drawImage(qrCanvas, (W - 200) / 2, 365);

  ctx.fillStyle = '#94A3B8'; ctx.font = '11px sans-serif';
  ctx.fillText('Scan at the security gate', W / 2, 590);

  // Meta
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94A3B8'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('DURATION', 40, 625);
  ctx.fillStyle = '#0F172A'; ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`${v.expectedDuration || 720} min`, 40, 646);
  if (v.visitorPhone) {
    ctx.fillStyle = '#94A3B8'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('PHONE', W / 2, 625);
    ctx.fillStyle = '#0F172A'; ctx.font = 'bold 13px sans-serif'; ctx.fillText(v.visitorPhone, W / 2, 646);
  }
  if (estateAddress) {
    ctx.fillStyle = '#94A3B8'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('LOCATION', 40, 685);
    ctx.fillStyle = '#334155'; ctx.font = '12px sans-serif'; ctx.fillText(estateAddress, 40, 705);
  }

  // Brand footer
  const fgrad = ctx.createLinearGradient(0, 740, W, 820);
  fgrad.addColorStop(0, '#0F172A'); fgrad.addColorStop(1, '#1E293B');
  ctx.fillStyle = fgrad;
  ctx.fillRect(0, 740, W, 80);
  ctx.fillStyle = ACCENT;
  ctx.beginPath(); ctx.arc(44, 783, 5, 0, Math.PI * 2); ctx.fill();
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.50)'; ctx.font = 'bold 9px sans-serif';
  ctx.fillText('POWERED BY', 60, 772);
  ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 18px sans-serif';
  ctx.fillText('AreaConnect', 60, 795);
  ctx.textAlign = 'right';
  ctx.fillStyle = ACCENT; ctx.font = 'bold 13px sans-serif';
  ctx.fillText(BRAND_URL, W - 40, 775);
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '10px sans-serif';
  ctx.fillText('Smart estate management', W - 40, 795);

  ctx.textAlign = 'left';
  return canvas;
};

const shareVisitorPass = async (v, estate) => {
  const date = format(new Date(v.expectedDate), 'MMM d, yyyy · h:mm a');
  const estateLine = estate?.name ? `\n*Estate:* ${estate.name}` : '';
  const waText = `🏠 *Visitor Pass — ${v.visitorName}*${estateLine}\n\n*Code:* ${v.visitorCode}\n*Purpose:* ${v.purpose}\n*Expected:* ${date}\n\n_Powered by AreaConnect — areaconnect.pro_`;

  let file = null;
  try {
    const canvas = await generatePassCanvas(v, estate);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (blob) file = new File([blob], `visitor-pass-${v.visitorCode}.png`, { type: 'image/png' });
  } catch { /* image generation failed — we'll still share text */ }

  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        text: waText,
        title: `Visitor Pass — ${v.visitorName}`,
      });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
  }

  window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank');
  if (file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = file.name; a.click();
    URL.revokeObjectURL(url);
    toast('Pass image downloaded — attach it in the WhatsApp chat.', { icon: '📎', duration: 5000 });
  }
};

function QRCanvas({ value, size = 180 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!value || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size, margin: 2,
      color: { dark: '#0B1C3D', light: '#FFFFFF' },
    });
  }, [value, size]);
  return <canvas ref={canvasRef} className="rounded-xl mx-auto" style={{ border: '1px solid #E2E8F0' }} />;
}

function PassTimer({ visitor }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const now      = new Date();
  const start    = new Date(visitor.expectedDate);
  const duration = visitor.expectedDuration || 720;
  const expiry   = new Date(start.getTime() + duration * 60 * 1000);

  const fmt = (ms) => {
    if (ms <= 0) return null;
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
    return `${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
  };

  if (['checked-out', 'blacklisted', 'expired'].includes(visitor.status)) return null;

  if (visitor.status === 'checked-in') {
    const entryTime = visitor.entryTime ? new Date(visitor.entryTime) : null;
    return (
      <div className="rounded-xl p-4"
        style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.14)' }}>
            <CheckCircle size={20} style={{ color: '#059669' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#059669' }}>Arrived</div>
            <div className="text-sm font-bold mt-0.5" style={{ color: '#0F172A' }}>
              Checked in{entryTime ? ` at ${entryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            </div>
          </div>
          <span className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: '#10B981' }} />
        </div>
      </div>
    );
  }

  if (now < start) {
    return (
      <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.14)' }}>
        <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#94A3B8' }}>Arrives in</div>
        <div className="text-2xl font-bold tabular-nums" style={{ color: ACCENT, letterSpacing: '-0.02em' }}>{fmt(start - now)}</div>
        <div className="text-xs mt-1" style={{ color: '#94A3B8' }}>
          Expected at {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    );
  }

  const left = fmt(expiry - now);
  if (!left) return (
    <div className="rounded-xl p-4 text-center" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
      <div className="text-sm font-semibold" style={{ color: '#DC2626' }}>Pass Expired</div>
    </div>
  );

  const pct      = Math.max(0, Math.min(100, ((expiry - now) / (duration * 60 * 1000)) * 100));
  const isUrgent = pct < 20;
  return (
    <div className="rounded-xl p-4" style={{ background: isUrgent ? '#FEF2F2' : 'rgba(16,185,129,0.06)', border: `1px solid ${isUrgent ? '#FECACA' : 'rgba(16,185,129,0.14)'}` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Pass expires in</div>
        <div className="text-xs font-medium" style={{ color: isUrgent ? '#DC2626' : '#64748B' }}>{Math.round(pct)}% remaining</div>
      </div>
      <div className="text-2xl font-bold tabular-nums mb-3" style={{ color: isUrgent ? '#DC2626' : ACCENT, letterSpacing: '-0.02em' }}>{left}</div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: isUrgent ? '#EF4444' : ACCENT }} />
      </div>
    </div>
  );
}

export default function VisitorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribe } = useSocket() || {};
  const [visitor, setVisitor] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    visitorAPI.getOne(id)
      .then(({ data }) => setVisitor(data.data))
      .catch(() => { toast.error('Visitor not found'); navigate('/visitors'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  // Live updates — if the guard checks the visitor in/out while we're viewing
  // the page, the timer should flip to the "arrived" card instantly.
  useEffect(() => {
    if (!subscribe) return;
    const unsub = subscribe('visitor_update', (incoming) => {
      if (!incoming?._id || incoming._id?.toString() !== id?.toString()) return;
      setVisitor((prev) => (prev ? { ...prev, ...incoming } : incoming));
    });
    return unsub;
  }, [subscribe, id]);

  const copyCode = () => {
    navigator.clipboard?.writeText(visitor.visitorCode);
    toast.success('Access code copied!');
  };

  const handleCheckIn = async () => {
    try { await visitorAPI.checkIn(visitor._id); toast.success('Visitor checked in'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };
  const handleCheckOut = async () => {
    try { await visitorAPI.checkOut(visitor._id); toast.success('Visitor checked out'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };
  const handleBlacklist = async () => {
    if (!confirm('Blacklist this visitor?')) return;
    try { await visitorAPI.blacklist(visitor._id); toast.success('Visitor blacklisted'); navigate('/visitors'); }
    catch { toast.error('Failed'); }
  };

  if (loading) return <div className="flex justify-center p-16"><Spinner /></div>;
  if (!visitor) return null;

  const statusColor = {
    active:        { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
    'checked-in':  { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
    'checked-out': { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' },
    expired:       { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
    blacklisted:   { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  }[visitor.status] || { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' };

  return (
    <div className="animate-fade-in">

      {/* Top bar */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/visitors')}
          className="p-2 rounded-xl transition-all"
          style={{ background: '#F1F5F9', color: '#475569' }}
          onMouseEnter={e => e.currentTarget.style.background = '#E2E8F0'}
          onMouseLeave={e => e.currentTarget.style.background = '#F1F5F9'}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>Visitor Pass</h1>
          <p className="text-sm" style={{ color: '#64748B' }}>{visitor.visitorName}</p>
        </div>
      </div>

      <div className="space-y-5 max-w-lg">

        {/* Status + name */}
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)` }}>
            {visitor.visitorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-lg truncate" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>{visitor.visitorName}</div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}` }}>
                {visitor.status}
              </span>
              <span className="text-sm" style={{ color: '#64748B' }}>{visitor.purpose}</span>
            </div>
          </div>
        </div>

        {/* Countdown */}
        <PassTimer visitor={visitor} />

        {/* Ticket */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(16,185,129,0.18)' }}>
          <div className="p-5 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.70)' }}>Guest Pass</div>
              <div className="text-xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>{visitor.visitorName}</div>
              <div className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>{visitor.purpose}</div>
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.20)', border: '1px solid rgba(255,255,255,0.30)' }}>
              <UserCheck size={20} className="text-white" />
            </div>
          </div>
          <div className="relative" style={{ borderTop: '2px dashed rgba(16,185,129,0.20)' }}>
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }} />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }} />
          </div>
          <div className="p-5 text-center" style={{ background: '#FFFFFF' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#94A3B8' }}>Access Code</div>
            <button onClick={copyCode} className="group inline-block mb-4" title="Click to copy">
              <div className="visitor-code text-4xl font-bold tracking-[0.15em] mb-1" style={{ color: ACCENT }}>{visitor.visitorCode}</div>
              <div className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#94A3B8' }}>Tap to copy</div>
            </button>
            <QRCanvas value={visitor.visitorCode} size={180} />
            <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>Scan at the security gate</p>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Date',     value: format(new Date(visitor.expectedDate), 'MMM d, yyyy') },
            { label: 'Time',     value: format(new Date(visitor.expectedDate), 'h:mm a')      },
            { label: 'Duration', value: `${visitor.expectedDuration || 720} min`              },
            { label: 'Host',     value: visitor.hostResidentId?.name || 'Manager'             },
            ...(visitor.visitorPhone ? [{ label: 'Phone', value: visitor.visitorPhone }] : []),
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div className="text-xs font-medium mb-0.5" style={{ color: '#94A3B8' }}>{label}</div>
              <div className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-2 pb-8">
          {visitor.status === 'active' && (
            <button onClick={handleCheckIn} className="btn-primary w-full gap-2"><LogIn size={14} /> Check In</button>
          )}
          {visitor.status === 'checked-in' && (
            <button onClick={handleCheckOut} className="w-full gap-2"
              style={{ background: 'linear-gradient(135deg,#3B82F6 0%,#2563EB 100%)', color: 'white', fontWeight: 600, padding: '0.5rem 1.125rem', borderRadius: 9, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>
              <LogOut size={14} /> Check Out
            </button>
          )}
          {!['blacklisted', 'checked-out', 'expired'].includes(visitor.status) && (
            <button onClick={handleBlacklist} className="btn-danger w-full gap-2"><Ban size={14} /> Blacklist</button>
          )}
          <button
            onClick={() => shareVisitorPass(visitor, user?.estateId)}
            className="flex items-center justify-center gap-2 w-full rounded-[9px] px-3 py-2 text-sm font-semibold"
            style={{ background: '#25D366', color: 'white', border: 'none', cursor: 'pointer' }}>
            <WhatsAppIcon /> Share Pass
          </button>
          <div className="flex gap-3">
            <button onClick={copyCode} className="btn-outline flex-1 gap-2"><Share2 size={14} /> Copy Code</button>
            <button onClick={() => navigate('/visitors')} className="btn-outline flex-1">Back</button>
          </div>
        </div>
      </div>
    </div>
  );
}
