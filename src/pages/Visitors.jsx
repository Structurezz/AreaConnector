import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { visitorAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import TablePager from '../components/dashboard/TablePager';
import InviteForm from '../components/visitors/InviteForm';
import { VisitorsHero, VisitorsFilters, VisitorCards, CardAction, VisitorsPager, VISITOR_STATUS, purposeIcon } from '../components/visitors/MobileVisitors';
import PageHeader, { HEADER_BTN_PRIMARY } from '../components/dashboard/PageHeader';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import {
  UserCheck, Search, LogIn, LogOut, Ban, Plus, X,
  Phone, Mail, Calendar, Clock, MapPin, User,
  Package, Wrench, Users, Home, MoreHorizontal,
  FileText, ChevronDown, ChevronUp,
  Share2, CheckCircle, QrCode, StickyNote, XCircle, ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Portal, { useScrollLock } from '../components/ui/Portal';

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

const drawShieldLogo = (ctx, x, y, size, text, opts = {}) => {
  const { outerStroke = 'rgba(255,255,255,0.5)', innerFill = 'rgba(255,255,255,0.18)', textColor = '#FFFFFF', bgGrad = null } = opts;
  const s = size / 40;
  ctx.save();
  ctx.translate(x, y);
  if (bgGrad) {
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, bgGrad[0]); g.addColorStop(1, bgGrad[1]);
    ctx.fillStyle = g;
    const r = size * 0.22;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(size, 0, size, r, r);
    ctx.arcTo(size, size, size - r, size, r);
    ctx.arcTo(0, size, 0, size - r, r);
    ctx.arcTo(0, 0, r, 0, r);
    ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = outerStroke;
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.beginPath();
  ctx.moveTo(20 * s, 4 * s);
  ctx.lineTo(6 * s, 12 * s);
  ctx.lineTo(6 * s, 28 * s);
  ctx.lineTo(20 * s, 36 * s);
  ctx.lineTo(34 * s, 28 * s);
  ctx.lineTo(34 * s, 12 * s);
  ctx.closePath(); ctx.stroke();
  ctx.fillStyle = innerFill;
  ctx.beginPath();
  ctx.moveTo(20 * s, 9 * s);
  ctx.lineTo(9 * s, 15.5 * s);
  ctx.lineTo(9 * s, 28.5 * s);
  ctx.lineTo(20 * s, 35 * s);
  ctx.lineTo(31 * s, 28.5 * s);
  ctx.lineTo(31 * s, 15.5 * s);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = textColor;
  ctx.font = `bold ${13 * s}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 20 * s, 22 * s);
  ctx.restore();
};

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

  // Top-right AreaConnect app logo
  drawShieldLogo(ctx, W - 100, 32, 64, 'AC');

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
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

  // AreaConnect brand mark
  drawShieldLogo(ctx, 32, 758, 44, 'AC', { bgGrad: ['#10B981', '#059669'] });

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.50)'; ctx.font = 'bold 9px sans-serif';
  ctx.fillText('POWERED BY', 88, 772);

  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#FFFFFF'; ctx.fillText('Area ', 88, 795);
  const areaW = ctx.measureText('Area ').width;
  ctx.fillStyle = '#34D399'; ctx.fillText('Connector Technologies', 88 + areaW, 795);

  ctx.textAlign = 'right';
  ctx.fillStyle = ACCENT; ctx.font = 'bold 13px sans-serif';
  ctx.fillText(BRAND_URL, W - 40, 775);
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '10px sans-serif';
  ctx.fillText('RC 9607864', W - 40, 795);

  ctx.textAlign = 'left';
  return canvas;
};

const shareVisitorPass = async (v, estate) => {
  const date = format(new Date(v.expectedDate), 'MMM d, yyyy · h:mm a');
  const estateLine = estate?.name ? `\n*Estate:* ${estate.name}` : '';
  const waText = `🏠 *Visitor Pass — ${v.visitorName}*${estateLine}\n\n*Code:* ${v.visitorCode}\n*Purpose:* ${v.purpose}\n*Expected:* ${date}\n\n_Powered by Area Connector Technologies · RC 9607864_\n${BRAND_URL}`;

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

function PassTimer({ visitor }) {
  const [tick, setTick] = useState(0);
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

  if (['checked-out', 'blacklisted', 'expired', 'cancelled'].includes(visitor.status)) return null;

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
    const left = fmt(start - now);
    return (
      <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.14)' }}>
        <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#94A3B8' }}>Arrives in</div>
        <div className="text-2xl font-bold tabular-nums" style={{ color: ACCENT, letterSpacing: '-0.02em' }}>{left}</div>
        <div className="text-xs mt-1" style={{ color: '#94A3B8' }}>
          Expected at {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    );
  }

  const left = fmt(expiry - now);
  if (!left) {
    return (
      <div className="rounded-xl p-4 text-center" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
        <div className="text-sm font-semibold" style={{ color: '#DC2626' }}>Pass Expired</div>
      </div>
    );
  }

  const pct     = Math.max(0, Math.min(100, ((expiry - now) / (duration * 60 * 1000)) * 100));
  const isUrgent = pct < 20;
  return (
    <div className="rounded-xl p-4" style={{ background: isUrgent ? '#FEF2F2' : 'rgba(16,185,129,0.06)', border: `1px solid ${isUrgent ? '#FECACA' : 'rgba(16,185,129,0.14)'}` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Pass expires in</div>
        <div className="text-xs font-medium" style={{ color: isUrgent ? '#DC2626' : '#64748B' }}>
          {Math.round(pct)}% remaining
        </div>
      </div>
      <div className="text-2xl font-bold tabular-nums mb-3" style={{ color: isUrgent ? '#DC2626' : ACCENT, letterSpacing: '-0.02em' }}>
        {left}
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: isUrgent ? '#EF4444' : ACCENT }} />
      </div>
    </div>
  );
}

function QRCanvas({ value, size = 144 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!value || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: { dark: '#0B1C3D', light: '#FFFFFF' },
    });
  }, [value, size]);
  return <canvas ref={canvasRef} className="rounded-xl mx-auto" style={{ border: '1px solid #E2E8F0' }} />;
}


const STATUS_TABS = [
  ['', 'All'], ['active', 'Expected'], ['checked-in', 'Inside'], ['checked-out', 'Left'], ['expired', 'Expired'], ['blacklisted', 'Blocked'],
];

const PURPOSE_CHIPS = [
  { label: 'Visit',       Icon: UserCheck      },
  { label: 'Delivery',    Icon: Package        },
  { label: 'Maintenance', Icon: Wrench         },
  { label: 'Meeting',     Icon: Users          },
  { label: 'Moving',      Icon: Home           },
  { label: 'Other',       Icon: MoreHorizontal },
];

const DURATIONS = [
  { label: '30m',     value: 30  },
  { label: '1h',      value: 60  },
  { label: '2h',      value: 120 },
  { label: '4h',      value: 240 },
  { label: 'All day', value: 480 },
];

const EMPTY_FORM = {
  visitorName: '', visitorPhone: '', visitorEmail: '',
  purpose: '', expectedDate: '', expectedTime: '10:00',
  expectedDuration: 60, notes: '',
};

/* ─────────────────────────────────────────────────────── */
/*  Create Guest Pass Form                                 */
/* ─────────────────────────────────────────────────────── */
function CreatePassForm({ onClose, onSuccess }) {
  const tomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [form, setForm] = useState({ ...EMPTY_FORM, expectedDate: tomorrow() });
  const [customPurpose, setCustomPurpose] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const selectPurpose = (label) => {
    if (label === 'Other') {
      setCustomPurpose(true);
      set('purpose', '');
    } else {
      setCustomPurpose(false);
      set('purpose', label);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.visitorName.trim()) { toast.error('Visitor name is required'); return; }
    if (!form.expectedDate)       { toast.error('Expected date is required'); return; }
    setSaving(true);
    try {
      const expectedDate = new Date(`${form.expectedDate}T${form.expectedTime || '10:00'}`).toISOString();
      const { data } = await visitorAPI.preRegister({
        visitorName:      form.visitorName.trim(),
        visitorPhone:     form.visitorPhone.trim() || undefined,
        visitorEmail:     form.visitorEmail.trim() || undefined,
        purpose:          form.purpose,
        expectedDate,
        expectedDuration: Number(form.expectedDuration) || 60,
        notes:            form.notes.trim() || undefined,
      });
      toast.success('Guest pass created!');
      onSuccess(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create pass');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Visitor Details ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94A3B8' }}>
          Visitor Details
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block" style={{ color: '#475569' }}>
              Full Name <span style={{ color: ACCENT }}>*</span>
            </label>
            <input
              className="input-field"
              placeholder="e.g. John Adeyemi"
              value={form.visitorName}
              onChange={(e) => set('visitorName', e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: '#475569' }}>
                <Phone size={12} /> Phone
              </label>
              <input
                className="input-field"
                placeholder="+234..."
                value={form.visitorPhone}
                onChange={(e) => set('visitorPhone', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: '#475569' }}>
                <Mail size={12} /> Email
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="optional"
                value={form.visitorEmail}
                onChange={(e) => set('visitorEmail', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Purpose ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94A3B8' }}>
          Purpose of Visit <span style={{ color: ACCENT }}>*</span>
        </p>
        <div className="grid grid-cols-3 gap-2">
          {PURPOSE_CHIPS.map(({ label, Icon }) => {
            const isSelected = customPurpose ? label === 'Other' : form.purpose === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => selectPurpose(label)}
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-semibold transition-all"
                style={isSelected ? {
                  background: 'rgba(16,185,129,0.08)',
                  borderColor: ACCENT,
                  color: ACCENT_DARK,
                } : {
                  background: '#F8FAFC',
                  borderColor: '#E2E8F0',
                  color: '#64748B',
                }}
                onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.30)'; e.currentTarget.style.background = 'rgba(16,185,129,0.04)'; }}}
                onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#F8FAFC'; }}}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </div>
        {customPurpose && (
          <input
            className="input-field mt-2"
            placeholder="Describe the visit purpose..."
            value={form.purpose}
            onChange={(e) => set('purpose', e.target.value)}
            required
            autoFocus
          />
        )}
      </div>

      {/* ── Schedule ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94A3B8' }}>
          Visit Schedule <span style={{ color: ACCENT }}>*</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: '#475569' }}>
              <Calendar size={12} /> Date
            </label>
            <input
              type="date"
              className="input-field"
              min={new Date().toISOString().split('T')[0]}
              value={form.expectedDate}
              onChange={(e) => set('expectedDate', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: '#475569' }}>
              <Clock size={12} /> Time
            </label>
            <input
              type="time"
              className="input-field"
              value={form.expectedTime}
              onChange={(e) => set('expectedTime', e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="text-sm font-medium mb-2 block" style={{ color: '#475569' }}>Duration</label>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map(({ label, value }) => {
              const isSelected = form.expectedDuration === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => set('expectedDuration', value)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
                  style={isSelected ? {
                    background: ACCENT,
                    borderColor: ACCENT,
                    color: 'white',
                  } : {
                    background: '#F8FAFC',
                    borderColor: '#E2E8F0',
                    color: '#475569',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Notes (collapsible) ── */}
      <div>
        <button
          type="button"
          onClick={() => setShowNotes(v => !v)}
          className="flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: showNotes ? ACCENT : '#94A3B8' }}
        >
          <FileText size={14} />
          {showNotes ? 'Hide notes' : 'Add notes (optional)'}
          {showNotes ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        {showNotes && (
          <textarea
            className="input-field resize-none mt-2"
            rows={2}
            placeholder="Special instructions for security..."
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        )}
      </div>

      {/* ── Info blurb ── */}
      <div className="flex items-start gap-2.5 rounded-xl p-3"
        style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.14)' }}>
        <QrCode size={14} style={{ color: ACCENT, flexShrink: 0, marginTop: 1 }} />
        <p className="text-xs" style={{ color: '#64748B' }}>
          A unique access code and QR code will be generated and sent to your visitor automatically.
        </p>
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
        <button
          type="submit"
          disabled={saving || !form.visitorName || (!form.purpose && !customPurpose)}
          className="btn-primary flex-1 gap-2"
        >
          <QrCode size={15} />
          {saving ? 'Generating pass...' : 'Create Pass'}
        </button>
      </div>
    </form>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Create Pass Drawer (desktop only — mobile uses /visitors/new) */
/* ─────────────────────────────────────────────────────── */
function CreatePassDrawer({ open, onClose, onSuccess }) {
  useScrollLock(open);

  if (!open) return null;

  return (
    <Portal>
    <div className="fixed inset-0 z-[100] flex" onClick={onClose}>
      <div className="overlay-backdrop" aria-hidden="true" />
      <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[480px] flex flex-col bg-white animate-slide-in-right"
        style={{ boxShadow: '-16px 0 48px rgba(15,23,42,0.12)', borderLeft: '1px solid #E2E8F0' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid #E2E8F0' }}>
          <h2 className="text-lg font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
            Create Guest Pass
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-all" style={{ color: '#94A3B8' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#0F172A'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}>
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <InviteForm onCancel={onClose} onCreated={onSuccess} />
        </div>
      </div>
    </div>
    </Portal>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Visitor Pass Ticket Modal                              */
/* ─────────────────────────────────────────────────────── */
function PassResultModal({ pass, onClose }) {
  if (!pass) return null;

  const copyCode = () => {
    navigator.clipboard?.writeText(pass.visitorCode);
    toast.success('Access code copied!');
  };

  return (
    <Modal open={!!pass} onClose={onClose} title="Visitor Pass">
      <div className="space-y-5">

        {/* Ticket */}
        <div className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(16,185,129,0.18)' }}>

          {/* Gradient top band */}
          <div className="p-5 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-1"
                style={{ color: 'rgba(255,255,255,0.70)' }}>
                Guest Pass
              </div>
              <div className="text-xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>
                {pass.visitorName}
              </div>
              <div className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {pass.purpose}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.20)', border: '1px solid rgba(255,255,255,0.30)' }}>
              <UserCheck size={20} className="text-white" />
            </div>
          </div>

          {/* Ticket stub divider */}
          <div className="relative" style={{ borderTop: '2px dashed rgba(16,185,129,0.20)' }}>
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }} />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }} />
          </div>

          {/* Code area */}
          <div className="p-5 text-center" style={{ background: '#FFFFFF' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#94A3B8' }}>
              Access Code
            </div>
            <button onClick={copyCode} className="group inline-block" title="Click to copy">
              <div className="visitor-code text-4xl sm:text-5xl font-bold tracking-[0.15em] mb-1 transition-colors"
                style={{ color: ACCENT }}>
                {pass.visitorCode}
              </div>
              <div className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#94A3B8' }}>
                Click to copy
              </div>
            </button>

            {pass.visitorCode && (
              <div className="mt-4">
                <QRCanvas value={pass.visitorCode} size={160} />
                <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>Scan at the security gate</p>
              </div>
            )}
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Date',     value: format(new Date(pass.expectedDate), 'MMM d, yyyy') },
            { label: 'Time',     value: format(new Date(pass.expectedDate), 'h:mm a')      },
            { label: 'Duration', value: `${pass.expectedDuration || 60} min`               },
            ...(pass.visitorPhone || pass.visitorEmail
              ? [{ label: 'Contact', value: pass.visitorPhone || pass.visitorEmail }]
              : []),
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-3"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div className="text-xs font-medium mb-0.5" style={{ color: '#94A3B8' }}>{label}</div>
              <div className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>{value}</div>
            </div>
          ))}
        </div>

        {(pass.visitorEmail || pass.visitorPhone) && (
          <div className="flex items-center gap-2 rounded-xl p-3"
            style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.14)' }}>
            <CheckCircle size={14} style={{ color: ACCENT, flexShrink: 0 }} />
            <p className="text-xs" style={{ color: '#475569' }}>
              Pass sent to {pass.visitorEmail || pass.visitorPhone}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={copyCode} className="btn-outline flex-1 gap-2">
            <Share2 size={14} /> Copy Code
          </button>
          <button onClick={onClose} className="btn-primary flex-1 gap-2">
            <CheckCircle size={14} /> Done
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Visitor Detail Drawer                                  */
/* ─────────────────────────────────────────────────────── */
function VisitorDetailDrawer({ visitor, onClose, onCheckIn, onCheckOut, onBlacklist }) {
  const { user } = useAuth();
  useEffect(() => {
    if (visitor) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [visitor]);

  if (!visitor) return null;

  const v = visitor;

  const initials = v.visitorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const statusColor = {
    active:        { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
    'checked-in':  { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
    'checked-out': { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' },
    expired:       { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
    blacklisted:   { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  }[v.status] || { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' };

  const copyCode = () => {
    navigator.clipboard?.writeText(v.visitorCode);
    toast.success('Access code copied!');
  };

  const DetailRow = ({ icon: Icon, label, value }) => value ? (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'rgba(16,185,129,0.08)' }}>
        <Icon size={13} style={{ color: ACCENT }} />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium mb-0.5" style={{ color: '#94A3B8' }}>{label}</div>
        <div className="text-sm font-medium" style={{ color: '#0F172A' }}>{value}</div>
      </div>
    </div>
  ) : null;

  const Panel = ({ children }) => (
    <div
      className="flex flex-col bg-white h-full overflow-hidden"
      style={{ boxShadow: '-16px 0 48px rgba(15,23,42,0.12)', borderLeft: '1px solid #E2E8F0' }}
      onClick={e => e.stopPropagation()}
    >
      {children}
    </div>
  );

  const content = (
    <>
      {/* Header */}
      <div className="px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid #E2E8F0' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>
            Visitor Details
          </span>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-all" style={{ color: '#94A3B8' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#0F172A'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}>
            <X size={18} />
          </button>
        </div>
        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)` }}>
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold truncate" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
              {v.visitorName}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}` }}>
                {v.status}
              </span>
              {v.visitorCode && (
                <button onClick={copyCode} className="font-mono text-xs font-bold tracking-widest transition-opacity hover:opacity-70"
                  style={{ color: ACCENT }} title="Click to copy">
                  {v.visitorCode}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">

        <PassTimer visitor={v} />

        <DetailRow icon={User}     label="Purpose"       value={v.purpose} />
        <DetailRow icon={MapPin}   label="Host Resident" value={v.hostResidentId?.name || 'Manager'} />
        <DetailRow icon={Calendar} label="Expected"
          value={v.expectedDate ? format(new Date(v.expectedDate), 'MMM d, yyyy · h:mm a') : undefined} />
        <DetailRow icon={Clock}    label="Duration"
          value={v.expectedDuration ? `${v.expectedDuration} minutes` : undefined} />
        <DetailRow icon={Phone}    label="Phone"         value={v.visitorPhone} />
        <DetailRow icon={Mail}     label="Email"         value={v.visitorEmail} />
        {v.checkInTime && (
          <DetailRow icon={LogIn}  label="Checked In"
            value={format(new Date(v.checkInTime), 'MMM d, yyyy · h:mm a')} />
        )}
        {v.checkOutTime && (
          <DetailRow icon={LogOut} label="Checked Out"
            value={format(new Date(v.checkOutTime), 'MMM d, yyyy · h:mm a')} />
        )}
        {v.notes && (
          <DetailRow icon={StickyNote} label="Notes" value={v.notes} />
        )}

        {/* Access code large display */}
        {v.visitorCode && (
          <div className="mt-4 mb-2 rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(16,185,129,0.18)' }}>
            <div className="p-3 text-center" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
              <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Access Code
              </div>
            </div>
            <div className="relative" style={{ borderTop: '2px dashed rgba(16,185,129,0.20)' }}>
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }} />
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }} />
            </div>
            <div className="p-4 text-center" style={{ background: '#FFFFFF' }}>
              <button onClick={copyCode} className="group inline-block mb-3" title="Click to copy">
                <div className="visitor-code text-3xl font-bold tracking-[0.15em]" style={{ color: ACCENT }}>
                  {v.visitorCode}
                </div>
                <div className="text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#94A3B8' }}>
                  Click to copy
                </div>
              </button>
              {v.visitorCode && (
                <div>
                  <QRCanvas value={v.visitorCode} size={144} />
                  <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>Scan at the security gate</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-6 py-4 flex-shrink-0 space-y-2" style={{ borderTop: '1px solid #E2E8F0' }}>
        {v.status === 'active' && (
          <button onClick={() => { onCheckIn(v._id); onClose(); }} className="btn-primary w-full gap-2">
            <LogIn size={14} /> Check In
          </button>
        )}
        {v.status === 'checked-in' && (
          <button onClick={() => { onCheckOut(v._id); onClose(); }} className="w-full gap-2"
            style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', color: 'white', fontWeight: 600, padding: '0.5rem 1.125rem', borderRadius: 9, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>
            <LogOut size={14} /> Check Out
          </button>
        )}
        {!['blacklisted', 'checked-out', 'expired'].includes(v.status) && (
          <button onClick={() => { onBlacklist(v._id); onClose(); }} className="btn-danger w-full gap-2">
            <Ban size={14} /> Blacklist Visitor
          </button>
        )}
        <button
          onClick={() => shareVisitorPass(v, user?.estateId)}
          className="flex items-center justify-center gap-2 w-full rounded-[9px] px-3 py-2 text-sm font-semibold"
          style={{ background: '#25D366', color: 'white', border: 'none', cursor: 'pointer' }}>
          <WhatsAppIcon /> Share Pass
        </button>
        <button onClick={onClose} className="btn-outline w-full">Close</button>
      </div>
    </>
  );

  return (
    <div className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[420px] animate-slide-in-right">
      <Panel>{content}</Panel>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Page                                                   */
/* ─────────────────────────────────────────────────────── */
const PAGE_SIZE = 20;

export default function ManagerVisitors() {
  const navigate = useNavigate();
  const [visitors,      setVisitors]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [page,          setPage]          = useState(1);
  const [limit,         setLimit]         = useState(PAGE_SIZE);
  const [pagination,    setPagination]    = useState({ total: 0, pages: 1 });
  const [showCreate,    setShowCreate]    = useState(false);
  const [passResult,    setPassResult]    = useState(null);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [counts,        setCounts]        = useState(null);
  const searchTimer = useRef(null);

  const openVisitor = (v) => {
    if (window.innerWidth < 640) navigate(`/visitors/${v._id}`);
    else setSelectedVisitor(v);
  };

  const load = async (p = page, q = search, status = statusFilter, lim = limit) => {
    setLoading(true);
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { data } = await visitorAPI.getAll({
        ...(status === 'today' ? { date: today.toISOString() } : { status: status || undefined }),
        search: q || undefined,
        page: p,
        limit: lim,
      });
      setVisitors(data.data);
      setPagination(data.pagination || { total: data.data.length, pages: 1 });
      if (data.counts) setCounts(data.counts);
    } catch {
      toast.error('Failed to load visitors');
    } finally { setLoading(false); }
  };

  const handlePage         = (p) => { setPage(p); load(p, search, statusFilter); document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleSearch       = (q) => {
    setSearch(q); setPage(1);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, q, statusFilter), 300);
  };
  const handleLimit        = (l) => { setLimit(l); setPage(1); load(1, search, statusFilter, l); };
  const handleStatusChange = (s) => { setStatusFilter(s); setPage(1); load(1, search, s); };
  const pickStatus = (s) => handleStatusChange(s === statusFilter ? '' : s);
  const createPass = () => (window.innerWidth < 1024 ? navigate('/visitors/new') : setShowCreate(true));
  const handleCancel = async (v) => {
    if (!confirm(`Cancel ${v.visitorName}'s pass? The gate will refuse the code.`)) return;
    try { await visitorAPI.cancel(v._id); toast.success('Pass cancelled'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  useEffect(() => { load(1, '', ''); }, []);

  const handleCheckIn = async (id) => {
    try { await visitorAPI.checkIn(id);   toast.success('Visitor checked in');  load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };
  const handleCheckOut = async (id) => {
    try { await visitorAPI.checkOut(id);  toast.success('Visitor checked out'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };
  const handleBlacklist = async (id) => {
    if (!confirm('Blacklist this visitor? They will be denied re-entry.')) return;
    try { await visitorAPI.blacklist(id); toast.success('Visitor blacklisted');  load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="animate-fade-in">
      {/* ── Phone ── */}
      <div className="md:hidden pb-6">
        <VisitorsHero
          title="Visitor log" subtitle="Everyone coming in and out of the estate"
          gradient="linear-gradient(135deg,#064E3B 0%,#047857 55%,#10B981 100%)"
          counts={counts} statusFilter={statusFilter} onPick={pickStatus}
          cta="Create guest pass" onCta={createPass}
        />
        <VisitorsFilters search={search} onSearch={handleSearch} statusFilter={statusFilter} onStatus={pickStatus} counts={counts} accent={ACCENT} />
        <VisitorCards
          visitors={visitors} loading={loading} accent={ACCENT_DARK} showHost
          onOpen={(v) => navigate(`/visitors/${v._id}`)}
          emptyText={search ? `No visitors match "${search}"` : statusFilter ? 'No visitors here' : 'No visitors yet'}
          emptyCta={!search && !statusFilter ? 'Create guest pass' : null} onEmptyCta={createPass}
          renderActions={(v) => {
            if (!['active', 'checked-in'].includes(v.status)) return null;
            return (
              <>
                {v.status === 'active' && <CardAction tone="primary" accent={ACCENT} onClick={() => handleCheckIn(v._id)}><LogIn size={14} /> Check in</CardAction>}
                {v.status === 'checked-in' && <CardAction tone="primary" accent="#2563EB" onClick={() => handleCheckOut(v._id)}><LogOut size={14} /> Check out</CardAction>}
                {v.visitorPhone && <CardAction onClick={() => { window.location.href = `tel:${v.visitorPhone}`; }}><Phone size={14} style={{ color: ACCENT }} /> Call</CardAction>}
                {v.status === 'active' && <CardAction tone="danger" onClick={() => handleCancel(v)}><XCircle size={14} /> Cancel</CardAction>}
              </>
            );
          }}
        />
        <VisitorsPager page={page} pages={pagination.pages} total={pagination.total} limit={limit} onPage={handlePage} accent={ACCENT} />
      </div>

      {/* ── Tablet / desktop ── */}
      <div className="hidden md:block space-y-5">
      <PageHeader
        title="Visitor Log"
        subtitle="Everyone coming in and out of the estate"
        actions={
          <button onClick={createPass} className={HEADER_BTN_PRIMARY}>
            <Plus size={15} /> Create guest pass
          </button>
        }
        stats={[
          { label: 'Expected',   value: counts?.active ?? 0,         Icon: Calendar,  color: '#10B981', hint: 'Passes not yet used',    active: statusFilter === 'active',     onClick: () => pickStatus('active') },
          { label: 'Inside now', value: counts?.['checked-in'] ?? 0, Icon: LogIn,     color: '#0EA5E9', hint: 'Checked in at the gate', active: statusFilter === 'checked-in', onClick: () => pickStatus('checked-in'), pulse: (counts?.['checked-in'] || 0) > 0 },
          { label: 'Today',      value: counts?.today ?? 0,          Icon: Clock,     color: '#F59E0B', hint: 'Due in today',           active: statusFilter === 'today',      onClick: () => pickStatus('today') },
          { label: 'All visitors', value: counts?.all ?? 0,          Icon: UserCheck, color: '#8B5CF6', hint: 'Every pass issued',      onClick: () => handleStatusChange('') },
        ]}
      />

      {/* Filters */}
      <div className="dash-rise flex items-center gap-3 flex-wrap" style={{ animationDelay: '420ms' }}>
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="w-full rounded-2xl bg-white border border-slate-200 pl-11 pr-10 py-3 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            placeholder="Search name, phone, purpose or code…"
            value={search} onChange={(e) => handleSearch(e.target.value)} />
          {search && (
            <button onClick={() => handleSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white border border-slate-200 overflow-x-auto no-scrollbar">
          {STATUS_TABS.map(([key, label]) => {
            const on = statusFilter === key;
            const n = key === '' ? counts?.all : counts?.[key];
            return (
              <button key={key || 'all'} onClick={() => handleStatusChange(key)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all duration-300 ${on ? 'text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                style={on ? { background: 'linear-gradient(135deg, #10B981, #047857)', boxShadow: '0 6px 16px -6px rgba(16,185,129,0.6)' } : undefined}>
                {label}
                {typeof n === 'number' && (
                  <span className={`text-[10px] font-black px-1.5 rounded-md tabular-nums ${on ? 'bg-white/25' : 'bg-slate-100 text-slate-500'}`}>{n}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="dash-rise rounded-3xl bg-white border border-slate-200/70 overflow-hidden" style={{ animationDelay: '480ms' }}>
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2"><div className="skeleton h-3 w-40 rounded" /><div className="skeleton h-2.5 w-24 rounded" /></div>
                <div className="skeleton h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : visitors.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3 text-center">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <span className="dash-ripple absolute inset-0 rounded-full border-2 border-emerald-200" />
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <UserCheck size={28} className="text-emerald-500" />
              </div>
            </div>
            <p className="font-bold text-slate-800 mt-2">{search ? `No visitors match “${search}”` : 'No visitors found'}</p>
            <p className="text-sm text-slate-400">Guest passes you or residents create will show up here.</p>
            {!search && (
              <button onClick={createPass} className="btn-primary gap-2 mt-2">
                <Plus size={14} /> Create guest pass
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  {['Visitor', 'Host', 'Purpose', 'Expected', 'Code', 'Status', ''].map((h, i) => (
                    <th key={i} className={`text-[10px] font-bold uppercase tracking-wider px-5 py-3 text-slate-400 ${i === 6 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visitors.map((v, i) => {
                  const st = VISITOR_STATUS[v.status] || VISITOR_STATUS['checked-out'];
                  const [PIcon, pColor, pBg] = purposeIcon(v.purpose);
                  const initials = (v.visitorName || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
                  return (
                    <tr key={v._id} onClick={() => openVisitor(v)}
                      className="dash-rise group cursor-pointer border-t border-slate-100 first:border-0 transition-colors hover:bg-emerald-50/40"
                      style={{ animationDelay: `${520 + i * 35}ms` }}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-bold flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                            style={{ background: st.bg, color: st.text }}>{initials}</div>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-slate-900 truncate">{v.visitorName}</div>
                            <div className="text-xs text-slate-400 truncate">{v.visitorPhone || v.visitorEmail || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600 whitespace-nowrap">{v.hostResidentId?.name || 'Manager'}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold capitalize px-2.5 py-1 rounded-lg max-w-[150px]"
                          style={{ background: pBg, color: pColor }}>
                          <PIcon size={12} className="flex-shrink-0" /><span className="truncate">{v.purpose}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-700">{format(new Date(v.expectedDate), 'MMM d')}</div>
                        <div className="text-xs text-slate-400">{format(new Date(v.expectedDate), 'h:mm a')}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-[13px] font-bold tracking-[0.18em] px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700">{v.visitorCode}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full whitespace-nowrap"
                          style={{ background: st.bg, color: st.text }}>
                          <span className={`w-1.5 h-1.5 rounded-full ${v.status === 'checked-in' ? 'animate-pulse' : ''}`} style={{ background: st.dot }} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {v.status === 'active' && (
                            <button onClick={() => handleCheckIn(v._id)}
                              className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-500 hover:text-white transition-all">
                              <LogIn size={13} /> Check in
                            </button>
                          )}
                          {v.status === 'checked-in' && (
                            <button onClick={() => handleCheckOut(v._id)}
                              className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-500 hover:text-white transition-all">
                              <LogOut size={13} /> Check out
                            </button>
                          )}
                          {!['blacklisted', 'checked-out', 'expired', 'cancelled'].includes(v.status) && (
                            <button onClick={() => handleBlacklist(v._id)} title="Blacklist" aria-label="Blacklist"
                              className="p-1.5 rounded-lg text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 transition-all">
                              <Ban size={15} />
                            </button>
                          )}
                          <ChevronRight size={16} className="text-slate-300 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && (
          <TablePager page={page} pages={pagination.pages} total={pagination.total} limit={limit}
            onPage={handlePage} onLimit={handleLimit} accent={ACCENT} />
        )}
      </div>
      </div>

      {/* Create Guest Pass Modal */}
      <CreatePassDrawer
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={(pass) => { setShowCreate(false); setPassResult(pass); load(); }}
      />

      {/* Pass Result Modal */}
      <PassResultModal pass={passResult} onClose={() => setPassResult(null)} />

      {/* Visitor Detail Drawer */}
      <VisitorDetailDrawer
        visitor={selectedVisitor}
        onClose={() => setSelectedVisitor(null)}
        onCheckIn={(id) => { handleCheckIn(id); setSelectedVisitor(null); }}
        onCheckOut={(id) => { handleCheckOut(id); setSelectedVisitor(null); }}
        onBlacklist={(id) => { handleBlacklist(id); setSelectedVisitor(null); }}
      />
    </div>
  );
}
