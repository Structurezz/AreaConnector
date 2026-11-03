import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { visitorAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import TablePager from '../components/dashboard/TablePager';
import InviteForm from '../components/visitors/InviteForm';
import { VISITOR_STATUS, purposeIcon } from '../components/visitors/MobileVisitors';
import VisitorsMobile from '../components/visitors/VisitorsMobile';
import useCountUp from '../hooks/useCountUp';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import {
  UserCheck, Search, LogIn, LogOut, Ban, Plus, X,
  Phone, Mail, Calendar, Clock, MapPin, User,
  Package, Wrench, Users, Home, MoreHorizontal,
  FileText, ChevronDown, ChevronUp,
  Share2, CheckCircle, QrCode, StickyNote, XCircle, ChevronRight, Copy, Check, LayoutGrid, List, Radio, AlertTriangle,
} from 'lucide-react';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import toast from 'react-hot-toast';
import Portal, { Z, useScrollLock } from '../components/ui/Portal';

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
  ['', 'All'], ['pending', 'Needs approval'], ['active', 'Expected'], ['checked-in', 'Inside'], ['checked-out', 'Left'], ['expired', 'Expired'], ['blacklisted', 'Blocked'],
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
const STATUS_TONE = {
  active:        { color: '#10B981', tint: 'linear-gradient(135deg, #ECFDF5 0%, #F0FDFA 55%, #FFFFFF 100%)' },
  'checked-in':  { color: '#2563EB', tint: 'linear-gradient(135deg, #EFF6FF 0%, #EEF2FF 55%, #FFFFFF 100%)' },
  'checked-out': { color: '#64748B', tint: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 55%, #FFFFFF 100%)' },
  expired:       { color: '#D97706', tint: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 55%, #FFFFFF 100%)' },
  blacklisted:   { color: '#DC2626', tint: 'linear-gradient(135deg, #FEF2F2 0%, #FFE4E6 55%, #FFFFFF 100%)' },
  cancelled:     { color: '#94A3B8', tint: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 55%, #FFFFFF 100%)' },
  pending:       { color: '#6366F1', tint: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 55%, #FFFFFF 100%)' },
};

const fmtLeft = (ms) => {
  if (ms <= 0) return null;
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s` : `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
};

/** Live pass state: countdown ring until arrival / expiry, or "inside now". */
function PassStatus({ visitor: v }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (['checked-out', 'blacklisted', 'expired', 'cancelled'].includes(v.status)) return null;

  const now = Date.now();
  const start = new Date(v.expectedDate).getTime();
  const duration = (v.expectedDuration || 720) * 60 * 1000;
  const expiry = start + duration;
  const entry = v.entryTime || v.checkInTime;

  let label, value, sub, pct, color;
  if (v.status === 'checked-in') {
    const inside = entry ? fmtLeft(now - new Date(entry).getTime()) : null;
    label = 'Inside the estate'; value = inside || 'Checked in';
    sub = entry ? `Arrived at ${format(new Date(entry), 'h:mm a')}` : 'Arrival time not recorded';
    pct = 100; color = '#2563EB';
  } else if (now < start) {
    label = 'Arrives in'; value = fmtLeft(start - now);
    sub = `Expected ${format(new Date(start), 'EEE d MMM · h:mm a')}`;
    pct = Math.max(4, 100 - ((start - now) / (24 * 3600 * 1000)) * 100); color = '#0EA5E9';
  } else {
    const left = fmtLeft(expiry - now);
    if (!left) {
      label = 'Pass window'; value = 'Expired'; sub = `Ended ${format(new Date(expiry), 'h:mm a')}`; pct = 0; color = '#DC2626';
    } else {
      pct = Math.max(0, Math.min(100, ((expiry - now) / duration) * 100));
      color = pct < 20 ? '#DC2626' : '#10B981';
      label = 'Pass expires in'; value = left; sub = `Valid until ${format(new Date(expiry), 'h:mm a')} · ${Math.round(pct)}% left`;
    }
  }

  const R = 24, C = 2 * Math.PI * R;
  return (
    <div className="rounded-2xl p-4 flex items-center gap-4 border"
         style={{ background: `linear-gradient(135deg, ${color}10, ${color}03)`, borderColor: `${color}33` }}>
      <div className="relative w-14 h-14 flex-shrink-0">
        <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
          <circle cx="28" cy="28" r={R} fill="none" stroke={`${color}22`} strokeWidth="5" />
          <circle cx="28" cy="28" r={R} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center">
          {v.status === 'checked-in'
            ? <span className="relative flex w-3 h-3"><span className="absolute inset-0 rounded-full animate-ping opacity-60" style={{ background: color }} /><span className="relative w-3 h-3 rounded-full" style={{ background: color }} /></span>
            : <Clock size={17} style={{ color }} />}
        </span>
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</div>
        <div className="text-[22px] font-semibold tabular-nums text-slate-900 leading-tight" style={{ letterSpacing: '-0.02em' }}>{value}</div>
        <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
      </div>
    </div>
  );
}

function VisitorDetailDrawer({ visitor, onClose, onCheckIn, onCheckOut, onBlacklist }) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!visitor) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visitor, onClose]);

  if (!visitor) return null;

  const v = visitor;
  const initials = (v.visitorName || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const st = VISITOR_STATUS[v.status] || VISITOR_STATUS['checked-out'];
  const tone = STATUS_TONE[v.status] || STATUS_TONE['checked-out'];
  const [PIcon, pColor, pBg] = purposeIcon(v.purpose);
  const entry = v.entryTime || v.checkInTime;
  const exit  = v.exitTime  || v.checkOutTime;
  const unit  = v.hostUnitId?.unitNumber ? `${v.hostUnitId.block ? `${v.hostUnitId.block} · ` : ''}Unit ${v.hostUnitId.unitNumber}` : '';
  const dt = (d) => format(new Date(d), 'EEE d MMM · h:mm a');

  const copyCode = () => {
    navigator.clipboard?.writeText(v.visitorCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success('Access code copied!');
  };

  const journey = [
    { label: 'Pass created',  time: v.createdAt,    done: !!v.createdAt, color: '#10B981' },
    { label: 'Expected',      time: v.expectedDate, done: true,          color: '#0EA5E9', note: v.expectedDuration ? `${v.expectedDuration >= 60 ? `${Math.round(v.expectedDuration / 60 * 10) / 10}h` : `${v.expectedDuration} min`} window` : '' },
    { label: 'Checked in',    time: entry,          done: !!entry,       color: '#2563EB' },
    { label: 'Checked out',   time: exit,           done: !!exit,        color: '#64748B' },
  ];
  if (v.status === 'blacklisted') journey.push({ label: 'Blacklisted', done: true, color: '#DC2626' });
  if (v.status === 'cancelled')   journey.push({ label: 'Cancelled', time: v.cancelledAt, done: true, color: '#94A3B8' });
  if (v.status === 'expired')     journey.push({ label: 'Expired', done: true, color: '#D97706' });

  const facts = [
    { icon: Home,     label: 'Host',     value: v.hostResidentId?.name || 'Estate manager', sub: unit, color: '#10B981' },
    { icon: PIcon,    label: 'Purpose',  value: v.purpose, color: pColor },
    { icon: Phone,    label: 'Phone',    value: v.visitorPhone, href: v.visitorPhone && `tel:${v.visitorPhone}`, color: '#0EA5E9' },
    { icon: Mail,     label: 'Email',    value: v.visitorEmail, href: v.visitorEmail && `mailto:${v.visitorEmail}`, color: '#8B5CF6' },
  ].filter(f => f.value);

  const canBlacklist = !['blacklisted', 'checked-out', 'expired', 'cancelled'].includes(v.status);

  return (
    <Portal>
    <div className={`fixed inset-0 ${Z.drawer} flex justify-end`} onClick={onClose}>
      <div className="overlay-backdrop" aria-hidden="true" />
      <aside role="dialog" aria-modal="true" aria-label={`Visitor ${v.visitorName}`}
             className="animate-slide-in-right relative h-full w-full sm:w-[440px] bg-white flex flex-col"
             style={{ boxShadow: '-8px 0 40px rgba(15,23,42,0.18)' }}
             onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="relative overflow-hidden px-5 pt-4 pb-5 flex-shrink-0 border-b border-slate-100" style={{ background: tone.tint }}>
          <div className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full opacity-30"
               style={{ background: `radial-gradient(circle, ${tone.color}, transparent 70%)`, animation: 'dashFloat 14s ease-in-out infinite' }} />
          <div className="relative flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Visitor log</span>
            <button onClick={onClose} aria-label="Close"
                    className="w-8 h-8 -mr-1 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors">
              <X size={17} />
            </button>
          </div>
          <div className="relative flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white"
                   style={{ background: `linear-gradient(135deg, ${tone.color}, ${tone.color}BB)`, boxShadow: `0 10px 22px -10px ${tone.color}` }}>
                {initials}
              </div>
              <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-lg flex items-center justify-center border-2 border-white"
                    style={{ background: pBg, color: pColor }} title={v.purpose}>
                <PIcon size={12} />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[17px] font-semibold text-slate-900 truncate">{v.visitorName}</h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: st.bg, color: st.text }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} /> {st.label}
                </span>
                {v.expectedDate && (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Calendar size={11} /> {format(new Date(v.expectedDate), 'd MMM, h:mm a')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <PassStatus visitor={v} />

          {/* Access pass */}
          {v.visitorCode && (
            <div className="rounded-2xl border border-slate-200 overflow-hidden flex" style={{ animation: 'dashRise 0.45s cubic-bezier(0.16,1,0.3,1) 60ms both' }}>
              <div className="flex-1 p-4 flex flex-col justify-between" style={{ background: 'linear-gradient(160deg, #10B981, #047857)' }}>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/70 flex items-center gap-1.5"><QrCode size={11} /> Access code</div>
                <button onClick={copyCode} className="text-left group mt-2" title="Copy code">
                  <div className="visitor-code text-[26px] font-bold tracking-[0.12em] text-white leading-none">{v.visitorCode}</div>
                  <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-white/80 group-hover:text-white">
                    {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy code</>}
                  </div>
                </button>
                <div className="text-[11px] text-white/70 mt-3">Scan or read out at the security gate</div>
              </div>
              <div className="relative p-3 bg-white flex items-center" style={{ borderLeft: '2px dashed #D1FAE5' }}>
                <span className="absolute -left-[9px] -top-2 w-4 h-4 rounded-full bg-white border border-slate-200" />
                <span className="absolute -left-[9px] -bottom-2 w-4 h-4 rounded-full bg-white border border-slate-200" />
                <QRCanvas value={v.visitorCode} size={112} />
              </div>
            </div>
          )}

          {/* Facts */}
          {facts.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5">
              {facts.map(({ icon: I, label, value, sub, href, color }, i) => {
                const inner = (
                  <>
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: `${color}14`, color }}>
                      <I size={13} />
                    </span>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
                    <div className="text-[13px] font-semibold text-slate-900 truncate mt-0.5">{value}</div>
                    {sub && <div className="text-[11px] text-slate-500 truncate">{sub}</div>}
                  </>
                );
                const cls = 'block rounded-xl border border-slate-200 p-3 min-w-0 transition-all hover:-translate-y-0.5 hover:shadow-card-md';
                const style = { animation: `dashRise 0.45s cubic-bezier(0.16,1,0.3,1) ${100 + i * 40}ms both` };
                return href
                  ? <a key={label} href={href} className={cls} style={style}>{inner}</a>
                  : <div key={label} className={cls} style={style}>{inner}</div>;
              })}
            </div>
          )}

          {/* Notes */}
          {v.notes && (
            <div className="rounded-xl p-3.5 bg-amber-50 border border-amber-200 flex gap-2.5">
              <StickyNote size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Notes</div>
                <p className="text-[13px] text-amber-950 mt-0.5 leading-relaxed whitespace-pre-wrap">{v.notes}</p>
              </div>
            </div>
          )}

          {/* Journey */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Visit timeline</div>
            <ol className="relative">
              {journey.map((s, i) => {
                const last = i === journey.length - 1;
                return (
                  <li key={s.label} className="relative flex gap-3 pb-4 last:pb-0">
                    {!last && <span className="absolute left-[9px] top-5 bottom-0 w-px" style={{ background: s.done && journey[i + 1].done ? `${s.color}55` : '#E2E8F0' }} />}
                    <span className="relative w-[19px] h-[19px] rounded-full flex items-center justify-center flex-shrink-0 mt-px"
                          style={s.done ? { background: s.color, boxShadow: `0 0 0 4px ${s.color}1F` } : { background: '#fff', border: '2px dashed #CBD5E1' }}>
                      {s.done && <Check size={11} className="text-white" strokeWidth={3} />}
                    </span>
                    <div className="min-w-0 flex-1 flex items-baseline justify-between gap-2">
                      <span className={`text-[13px] font-semibold ${s.done ? 'text-slate-900' : 'text-slate-400'}`}>
                        {s.label}{s.note && <span className="ml-1.5 text-[11px] font-normal text-slate-400">{s.note}</span>}
                      </span>
                      <span className="text-[11px] text-slate-500 tabular-nums flex-shrink-0">{s.time ? dt(s.time) : s.done ? '' : 'Pending'}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pt-3 pb-4 flex-shrink-0 border-t border-slate-100 space-y-2 bg-white">
          {v.status === 'active' && (
            <button onClick={() => { onCheckIn(v._id); onClose(); }} className="btn-primary w-full gap-2 justify-center">
              <LogIn size={15} /> Check in visitor
            </button>
          )}
          {v.status === 'checked-in' && (
            <button onClick={() => { onCheckOut(v._id); onClose(); }} className="btn-primary w-full gap-2 justify-center"
                    style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}>
              <LogOut size={15} /> Check out visitor
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={() => shareVisitorPass(v, user?.estateId)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-[9px] px-3 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
                    style={{ background: '#25D366', boxShadow: '0 6px 14px -8px #25D366' }}>
              <WhatsAppIcon /> Share pass
            </button>
            {canBlacklist && (
              <button onClick={() => { onBlacklist(v._id); onClose(); }} title="Blacklist visitor"
                      className="flex items-center justify-center gap-1.5 rounded-[9px] px-3 py-2 text-sm font-semibold border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                <Ban size={14} /> Blacklist
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
    </Portal>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Desktop list pieces                                    */
/* ─────────────────────────────────────────────────────── */
const statusOf = (v) => VISITOR_STATUS[v.status] || VISITOR_STATUS['checked-out'];
const toneOf   = (v) => STATUS_TONE[v.status] || STATUS_TONE['checked-out'];
const initialsOf = (name) => (name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
const unitOf = (v) => (v.hostUnitId?.unitNumber ? `${v.hostUnitId.block ? `${v.hostUnitId.block} · ` : ''}${v.hostUnitId.unitNumber}` : '');

const relTime = (d, now = Date.now()) => {
  const diff = new Date(d).getTime() - now;
  const abs = Math.abs(diff), m = Math.round(abs / 60000);
  const txt = m < 1 ? 'now' : m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
  if (txt === 'now') return 'now';
  return diff > 0 ? `in ${txt}` : `${txt} ago`;
};
const dayTime = (d) => {
  const x = new Date(d);
  const day = isToday(x) ? 'Today' : isTomorrow(x) ? 'Tomorrow' : isYesterday(x) ? 'Yesterday' : format(x, 'EEE d MMM');
  return { day, time: format(x, 'h:mm a') };
};

function VisitorAvatar({ v, size = 40 }) {
  const tone = toneOf(v);
  const [PIcon, pColor, pBg] = purposeIcon(v.purpose);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div className="w-full h-full rounded-xl flex items-center justify-center font-bold text-white transition-transform duration-300 group-hover:scale-105"
           style={{ fontSize: Math.round(size * 0.32), background: `linear-gradient(135deg, ${tone.color}, ${tone.color}BB)`, boxShadow: `0 6px 14px -8px ${tone.color}` }}>
        {initialsOf(v.visitorName)}
      </div>
      <span className="absolute -bottom-1 -right-1 w-[18px] h-[18px] rounded-md flex items-center justify-center border-2 border-white"
            style={{ background: pBg, color: pColor }}>
        <PIcon size={9} />
      </span>
    </div>
  );
}

function StatusPill({ v }) {
  const st = statusOf(v);
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
          style={{ background: st.bg, color: st.text }}>
      <span className={`w-1.5 h-1.5 rounded-full ${v.status === 'checked-in' ? 'animate-pulse' : ''}`} style={{ background: st.dot }} />
      {st.label}
    </span>
  );
}

function CodeChip({ code }) {
  const [copied, setCopied] = useState(false);
  if (!code) return <span className="text-slate-300">—</span>;
  return (
    <button type="button" title="Copy code"
            onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
            className="group/code inline-flex items-center gap-1.5 font-mono text-[12px] font-bold tracking-[0.14em] pl-2 pr-1.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
      {code}
      {copied ? <Check size={11} /> : <Copy size={11} className="opacity-0 group-hover/code:opacity-70 transition-opacity" />}
    </button>
  );
}

function RowActions({ v, onApprove, onDecline, onCheckIn, onCheckOut, onBlacklist, compact }) {
  const btn = 'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all';
  return (
    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
      {v.status === 'pending' && v.awaitingApproval && (<>
        <button onClick={() => onApprove(v)} className={`${btn} text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white`}><CheckCircle size={13} /> Approve</button>
        <button onClick={() => onDecline(v)} className={`${btn} text-slate-500 hover:text-red-600 hover:bg-red-50`}>Decline</button>
      </>)}
      {v.status === 'active' && (
        <button onClick={() => onCheckIn(v._id)} className={`${btn} text-emerald-700 bg-emerald-50 hover:bg-emerald-500 hover:text-white`}><LogIn size={13} /> Check in</button>
      )}
      {v.status === 'checked-in' && (
        <button onClick={() => onCheckOut(v._id)} className={`${btn} text-blue-700 bg-blue-50 hover:bg-blue-500 hover:text-white`}><LogOut size={13} /> Check out</button>
      )}
      {!compact && !['blacklisted', 'checked-out', 'expired', 'cancelled'].includes(v.status) && (
        <button onClick={() => onBlacklist(v._id)} title="Blacklist" aria-label="Blacklist"
                className="p-1.5 rounded-lg text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 transition-all">
          <Ban size={15} />
        </button>
      )}
    </div>
  );
}

/** Ticket-style card used by the grid view — mirrors the detail drawer. */
function VisitorCard({ v, i, selected, onOpen, actions }) {
  const tone = toneOf(v);
  const [, pColor, pBg] = purposeIcon(v.purpose);
  const when = v.expectedDate ? dayTime(v.expectedDate) : null;
  const unit = unitOf(v);
  return (
    <div onClick={() => onOpen(v)}
         className="dash-rise group cursor-pointer rounded-2xl bg-white border overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-card-md"
         style={{ animationDelay: `${80 + i * 30}ms`, borderColor: selected ? tone.color : '#E2E8F0', boxShadow: selected ? `0 0 0 3px ${tone.color}22` : undefined }}>
      <div className="relative p-4 pb-3.5" style={{ background: tone.tint }}>
        <div className="flex items-start gap-3">
          <VisitorAvatar v={v} size={42} />
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-slate-900 truncate">{v.visitorName}</div>
            <div className="text-[11px] text-slate-500 truncate">{v.visitorPhone || v.visitorEmail || 'No contact'}</div>
          </div>
          <StatusPill v={v} />
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-[11px]">
          <span className="font-semibold capitalize px-2 py-0.5 rounded-md truncate max-w-[50%]" style={{ background: pBg, color: pColor }}>{v.purpose}</span>
          <span className="text-slate-500 truncate flex items-center gap-1"><Home size={11} className="flex-shrink-0" />{v.hostResidentId?.name || 'Manager'}{unit && ` · ${unit}`}</span>
        </div>
      </div>
      <div className="relative border-t-2 border-dashed border-slate-100">
        <span className="absolute -left-2 -top-2 w-4 h-4 rounded-full bg-slate-50 border border-slate-200" />
        <span className="absolute -right-2 -top-2 w-4 h-4 rounded-full bg-slate-50 border border-slate-200" />
      </div>
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          {when && <div className="text-[12px] font-semibold text-slate-800">{when.day} · {when.time}</div>}
          {v.expectedDate && <div className="text-[11px] text-slate-400">{relTime(v.expectedDate)}</div>}
        </div>
        <CodeChip code={v.visitorCode} />
      </div>
      {actions && <div className="px-4 pb-3.5 -mt-1">{actions}</div>}
    </div>
  );
}

function RailCard({ title, icon: Icon, color, count, children, empty }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100" style={{ background: `linear-gradient(135deg, ${color}12, transparent 70%)` }}>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 4px 10px -4px ${color}` }}>
          <Icon size={13} className="text-white" />
        </span>
        <span className="text-[13px] font-semibold text-slate-900 flex-1">{title}</span>
        {typeof count === 'number' && <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md tabular-nums" style={{ background: `${color}18`, color }}>{count}</span>}
      </div>
      {children || <p className="px-4 py-6 text-center text-xs text-slate-400">{empty}</p>}
    </div>
  );
}

function HeroStat({ i, label, hint, value, Icon, color, active, pulse, onClick }) {
  const n = useCountUp(value || 0);
  return (
    <button type="button" onClick={onClick}
      className="dash-rise group relative text-left rounded-2xl p-3.5 border bg-white/75 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white min-w-0 overflow-hidden"
      style={{
        animationDelay: `${140 + i * 60}ms`,
        borderColor: active ? color : 'rgba(255,255,255,0.9)',
        boxShadow: active ? `0 0 0 3px ${color}26, 0 12px 24px -16px ${color}` : '0 8px 20px -16px rgba(15,23,42,0.35)',
      }}>
      <span className="absolute -bottom-7 -right-7 w-20 h-20 rounded-full pointer-events-none transition-transform duration-500 group-hover:scale-125" style={{ background: `${color}14` }} />
      <div className="relative flex items-center justify-between">
        <span className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:-rotate-6"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 14px -6px ${color}` }}>
          <Icon size={15} className="text-white" />
        </span>
        {pulse ? (
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full animate-ping opacity-70" style={{ background: color }} />
            <span className="relative w-2 h-2 rounded-full" style={{ background: color }} />
          </span>
        ) : active ? (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: `${color}1F`, color }}>Filtered</span>
        ) : null}
      </div>
      <div className="relative mt-2.5 text-[24px] font-semibold leading-none text-slate-900 tabular-nums" style={{ letterSpacing: '-0.03em' }}>{n}</div>
      <div className="relative mt-1 text-[12px] font-medium text-slate-600 truncate">{label}</div>
      <div className="relative text-[11px] text-slate-400 truncate">{hint}</div>
    </button>
  );
}

/** Desktop hero: light status-tinted banner with gate ring + filter stats. */
function VisitorsHeroBanner({ counts, now, statusFilter, onPick, onAll, onCreate, arrivingCount }) {
  const due = counts?.today || 0;
  const inside = counts?.['checked-in'] || 0;
  const pct = due ? Math.min(100, Math.round((inside / due) * 100)) : 0;
  const hour = new Date(now).getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const R = 34, C = 2 * Math.PI * R;

  const stats = [
    { key: 'active',     label: 'Expected',     hint: 'Passes not yet used',      value: counts?.active ?? 0,         Icon: Calendar,  color: '#10B981' },
    { key: 'checked-in', label: 'Inside now',   hint: 'Checked in at the gate',   value: inside,                      Icon: LogIn,     color: '#2563EB', pulse: inside > 0 },
    { key: 'today',      label: 'Due today',    hint: 'Expected at the gate',     value: due,                         Icon: Clock,     color: '#F59E0B' },
    { key: '',           label: 'All visitors', hint: 'Every pass issued',        value: counts?.all ?? 0,            Icon: UserCheck, color: '#8B5CF6' },
  ];

  return (
    <div className="dash-rise relative overflow-hidden rounded-3xl border border-emerald-100 p-5"
         style={{ background: 'linear-gradient(120deg, #ECFDF5 0%, #F0FDFA 38%, #EFF6FF 100%)' }}>
      {/* ambience */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.35]"
           style={{ backgroundImage: 'linear-gradient(rgba(16,185,129,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.12) 1px, transparent 1px)', backgroundSize: '28px 28px', maskImage: 'linear-gradient(90deg, transparent, #000 40%, #000 70%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 40%, #000 70%, transparent)' }} />
      <div className="pointer-events-none absolute -top-24 right-10 w-72 h-72 rounded-full opacity-40"
           style={{ background: 'radial-gradient(circle, #6EE7B7, transparent 70%)', animation: 'dashFloat 16s ease-in-out infinite' }} />
      <div className="pointer-events-none absolute -bottom-28 right-1/3 w-72 h-72 rounded-full opacity-30"
           style={{ background: 'radial-gradient(circle, #93C5FD, transparent 70%)', animation: 'dashFloat 20s ease-in-out infinite reverse' }} />

      {/* Title row */}
      <div className="relative flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-white/80 border border-emerald-200 text-emerald-700">
              <span className="relative flex w-1.5 h-1.5"><span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-70" /><span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" /></span>
              Live gate
            </span>
            <span className="text-[11px] text-slate-500">{format(new Date(now), 'EEEE d MMMM · h:mm a')}</span>
          </div>
          <h1 className="text-[22px] font-semibold text-slate-900" style={{ letterSpacing: '-0.025em' }}>Visitor log</h1>
          <p className="text-[13px] text-slate-600 mt-0.5">
            {greet}. {due ? <><strong className="font-semibold text-slate-900">{due}</strong> visitor{due === 1 ? '' : 's'} due today</> : 'No visitors due today'}
            {inside > 0 && <>, <strong className="font-semibold text-blue-700">{inside}</strong> inside the estate right now</>}.
          </p>
        </div>
        <button onClick={onCreate}
                className="btn-primary gap-2 !text-[13px] !px-3.5 !py-2.5 transition-transform hover:-translate-y-0.5"
                style={{ boxShadow: '0 10px 22px -12px #047857' }}>
          <Plus size={15} /> Create guest pass
        </button>
      </div>

      {/* Ring + stats */}
      <div className="relative grid gap-3 md:grid-cols-4 xl:grid-cols-[230px_repeat(4,minmax(0,1fr))]">
        <div className="dash-rise md:col-span-4 xl:col-span-1 rounded-2xl p-3.5 bg-white/75 backdrop-blur-sm border border-white flex items-center gap-4"
             style={{ animationDelay: '80ms', boxShadow: '0 8px 20px -16px rgba(15,23,42,0.35)' }}>
          <div className="relative w-[84px] h-[84px] flex-shrink-0">
            <svg width="84" height="84" viewBox="0 0 84 84" className="-rotate-90">
              <defs>
                <linearGradient id="gateRing" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#10B981" /><stop offset="100%" stopColor="#2563EB" />
                </linearGradient>
              </defs>
              <circle cx="42" cy="42" r={R} fill="none" stroke="#E2E8F0" strokeWidth="7" />
              <circle cx="42" cy="42" r={R} fill="none" stroke="url(#gateRing)" strokeWidth="7" strokeLinecap="round"
                      strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
                      style={{ '--len': C, '--to': C * (1 - pct / 100), animation: 'dashDraw 1.2s cubic-bezier(0.16,1,0.3,1) both' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[18px] font-semibold text-slate-900 leading-none tabular-nums">{pct}%</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">arrived</span>
            </div>
          </div>
          <div className="min-w-0 space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gate today</div>
            <div className="flex items-center gap-2 text-[12px] text-slate-600"><span className="w-2 h-2 rounded-full bg-blue-600" /><span className="font-semibold text-slate-900 tabular-nums">{inside}</span> inside</div>
            <div className="flex items-center gap-2 text-[12px] text-slate-600"><span className="w-2 h-2 rounded-full bg-amber-500" /><span className="font-semibold text-slate-900 tabular-nums">{arrivingCount}</span> still to arrive</div>
            <div className="flex items-center gap-2 text-[12px] text-slate-600"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="font-semibold text-slate-900 tabular-nums">{due}</span> due in total</div>
          </div>
        </div>
        {stats.map((s, i) => (
          <HeroStat key={s.label} i={i} {...s}
            active={s.key !== '' && statusFilter === s.key}
            onClick={() => (s.key === '' ? onAll() : onPick(s.key))} />
        ))}
      </div>
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
  // ?status=pending deep-links from the "pass needs approval" notification
  const [statusFilter,  setStatusFilter]  = useState(() => new URLSearchParams(window.location.search).get('status') || '');
  const [page,          setPage]          = useState(1);
  const [limit,         setLimit]         = useState(PAGE_SIZE);
  const [pagination,    setPagination]    = useState({ total: 0, pages: 1 });
  const [showCreate,    setShowCreate]    = useState(false);
  const [passResult,    setPassResult]    = useState(null);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [counts,        setCounts]        = useState(null);
  const searchTimer = useRef(null);
  const [rail, setRail] = useState({ inside: [], arriving: [], arrivingTotal: 0 });
  const [now, setNow] = useState(Date.now());
  const [view, setView] = useState(() => { try { return localStorage.getItem('visitors:view') || 'list'; } catch { return 'list'; } });
  const changeView = (v) => { setView(v); try { localStorage.setItem('visitors:view', v); } catch {} };

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // Side rail: who's inside right now + today's remaining arrivals
  const loadRail = async () => {
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [inside, arriving] = await Promise.all([
        visitorAPI.getAll({ status: 'checked-in', limit: 8 }),
        visitorAPI.getAll({ status: 'active', date: today.toISOString(), limit: 50 }),
      ]);
      setRail({
        inside: inside.data.data || [],
        arrivingTotal: arriving.data.pagination?.total ?? (arriving.data.data || []).length,
        arriving: (arriving.data.data || []).sort((x, y) => new Date(x.expectedDate) - new Date(y.expectedDate)).slice(0, 6),
      });
    } catch { /* rail is best-effort */ }
  };

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
      if (window.innerWidth >= 768) loadRail();
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

  useEffect(() => { load(1, '', statusFilter); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Passes held because the host's visitor passes are restricted for overdue dues
  const handleApprove = async (v) => {
    try { const { data } = await visitorAPI.approvePass(v._id); toast.success(data.message || 'Pass approved'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };
  const handleDecline = async (v) => {
    if (!confirm(`Decline ${v.visitorName}'s pass? ${v.hostResidentId?.name || 'The host'} will be told it was not approved.`)) return;
    try { await visitorAPI.cancel(v._id); toast.success('Pass declined'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

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
      <div className="md:hidden">
        <VisitorsMobile
          visitors={visitors} loading={loading} counts={counts}
          search={search} onSearch={handleSearch}
          statusFilter={statusFilter} onPick={pickStatus} onStatus={handleStatusChange}
          page={page} pagination={pagination} limit={limit} onPage={handlePage}
          onOpen={(v) => navigate(`/visitors/${v._id}`)} onCreate={createPass}
          onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} onCancel={handleCancel}
        />
      </div>

      {/* ── Tablet / desktop ── */}
      <div className="hidden md:block space-y-5">
      <VisitorsHeroBanner counts={counts} now={now} statusFilter={statusFilter}
        onPick={pickStatus} onAll={() => handleStatusChange('')} onCreate={createPass}
        arrivingCount={rail.arrivingTotal} />

      {/* Passes held for approval */}
      {(counts?.pending || 0) > 0 && statusFilter !== 'pending' && (
        <button onClick={() => handleStatusChange('pending')}
          className="dash-rise w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left border border-indigo-200 transition-all hover:-translate-y-0.5 hover:shadow-card-md"
          style={{ background: 'linear-gradient(120deg, #EEF2FF, #F5F3FF 60%, #FFFFFF)', animationDelay: '300ms' }}>
          <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', boxShadow: '0 6px 14px -6px #6366F1' }}>
            <AlertTriangle size={15} className="text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-slate-900">{counts.pending} pass{counts.pending === 1 ? '' : 'es'} waiting for your approval</div>
            <div className="text-xs text-slate-500">Held because the host's visitor passes are restricted. Review them before guests arrive.</div>
          </div>
          <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1">Review <ChevronRight size={14} /></span>
        </button>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px] items-start">
      <div className="space-y-4 min-w-0">
      {/* Toolbar */}
      <div className="dash-rise flex items-center gap-2.5 flex-wrap" style={{ animationDelay: '360ms' }}>
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="w-full rounded-xl bg-white border border-slate-200 pl-10 pr-9 py-2.5 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            placeholder="Search name, phone, purpose or code…"
            value={search} onChange={(e) => handleSearch(e.target.value)} />
          {search && (
            <button onClick={() => handleSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={15} />
            </button>
          )}
        </div>
        <div className="flex items-center p-1 rounded-xl bg-white border border-slate-200">
          {[['list', List, 'List'], ['cards', LayoutGrid, 'Cards']].map(([key, I, label]) => (
            <button key={key} onClick={() => changeView(key)} title={`${label} view`}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all ${view === key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'}`}>
              <I size={13} /> {label}
            </button>
          ))}
        </div>
      </div>
      <div className="dash-rise flex items-center gap-1.5 overflow-x-auto no-scrollbar" style={{ animationDelay: '400ms' }}>
        {STATUS_TABS.map(([key, label]) => {
          const on = statusFilter === key;
          const n = key === '' ? counts?.all : counts?.[key];
          const color = key === '' ? '#0F172A' : (STATUS_TONE[key]?.color || '#10B981');
          return (
            <button key={key || 'all'} onClick={() => handleStatusChange(key)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold pl-2.5 pr-2 py-1.5 rounded-full border transition-all ${on ? 'text-white' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
              style={on ? { background: color, borderColor: color, boxShadow: `0 6px 14px -8px ${color}` } : undefined}>
              {key && <span className="w-1.5 h-1.5 rounded-full" style={{ background: on ? '#fff' : color }} />}
              {label}
              {typeof n === 'number' && (
                <span className={`text-[10px] font-bold px-1.5 rounded-md tabular-nums ${on ? 'bg-white/25' : 'bg-slate-100 text-slate-500'}`}>{n}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* List / cards */}
      <div className={`dash-rise ${view === 'list' || loading || visitors.length === 0 ? 'rounded-2xl bg-white border border-slate-200/70 overflow-hidden' : ''}`} style={{ animationDelay: '440ms' }}>
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
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
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10B981, #047857)' }}>
                <UserCheck size={28} className="text-white" />
              </div>
            </div>
            <p className="font-semibold text-slate-800 mt-2">{search ? `No visitors match “${search}”` : 'No visitors found'}</p>
            <p className="text-sm text-slate-400">Guest passes you or residents create will show up here.</p>
            {!search && (
              <button onClick={createPass} className="btn-primary gap-2 mt-2">
                <Plus size={14} /> Create guest pass
              </button>
            )}
          </div>
        ) : view === 'cards' ? (
          <div className="grid gap-3.5 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
            {visitors.map((v, i) => (
              <VisitorCard key={v._id} v={v} i={i} selected={selectedVisitor?._id === v._id} onOpen={openVisitor}
                actions={(['pending', 'active', 'checked-in'].includes(v.status)) && (
                  <RowActions v={v} compact onApprove={handleApprove} onDecline={handleDecline} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} onBlacklist={handleBlacklist} />
                )} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Visitor', 'Host', 'Purpose', 'Expected', 'Code', 'Status', ''].map((h, i) => (
                    <th key={i} className={`text-[10px] font-bold uppercase tracking-wider px-4 py-3 text-slate-400 ${i === 6 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visitors.map((v, i) => {
                  const [PIcon, pColor, pBg] = purposeIcon(v.purpose);
                  const tone = toneOf(v);
                  const when = v.expectedDate ? dayTime(v.expectedDate) : null;
                  const unit = unitOf(v);
                  const sel = selectedVisitor?._id === v._id;
                  return (
                    <tr key={v._id} onClick={() => openVisitor(v)}
                      className="dash-rise group cursor-pointer border-t border-slate-100 first:border-0 transition-colors hover:bg-slate-50/80"
                      style={{ animationDelay: `${480 + i * 30}ms`, background: sel ? `${tone.color}0D` : undefined, boxShadow: `inset 3px 0 0 ${sel ? tone.color : 'transparent'}` }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <VisitorAvatar v={v} size={38} />
                          <div className="min-w-0">
                            <div className="font-semibold text-[13px] text-slate-900 truncate">{v.visitorName}</div>
                            <div className="text-[11px] text-slate-400 truncate">{v.visitorPhone || v.visitorEmail || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-[13px] text-slate-700">{v.hostResidentId?.name || 'Manager'}</div>
                        {unit && <div className="text-[11px] text-slate-400">Unit {unit}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold capitalize px-2 py-1 rounded-lg max-w-[140px]"
                          style={{ background: pBg, color: pColor }}>
                          <PIcon size={12} className="flex-shrink-0" /><span className="truncate">{v.purpose}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {when && <div className="text-[13px] font-medium text-slate-700">{when.day} · {when.time}</div>}
                        {v.expectedDate && <div className="text-[11px] text-slate-400">{relTime(v.expectedDate, now)}</div>}
                      </td>
                      <td className="px-4 py-3"><CodeChip code={v.visitorCode} /></td>
                      <td className="px-4 py-3"><StatusPill v={v} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <RowActions v={v} onApprove={handleApprove} onDecline={handleDecline} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} onBlacklist={handleBlacklist} />
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
        {!loading && visitors.length > 0 && (
          <div className={view === 'cards' ? 'mt-4 rounded-2xl bg-white border border-slate-200/70 overflow-hidden' : ''}>
            <TablePager page={page} pages={pagination.pages} total={pagination.total} limit={limit}
              onPage={handlePage} onLimit={handleLimit} accent={ACCENT} />
          </div>
        )}
      </div>
      </div>

      {/* Live rail */}
      <aside className="hidden xl:block space-y-4 sticky top-0">
        <div className="dash-rise" style={{ animationDelay: '380ms' }}>
          <RailCard title="Inside now" icon={Radio} color="#2563EB" count={counts?.['checked-in'] ?? rail.inside.length} empty="Nobody is inside right now.">
            {rail.inside.length > 0 && (
              <ul className="divide-y divide-slate-100">
                {rail.inside.map((v) => {
                  const entry = v.entryTime || v.checkInTime;
                  return (
                    <li key={v._id}>
                      <button onClick={() => openVisitor(v)} className="group w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-blue-50/50 transition-colors">
                        <VisitorAvatar v={v} size={32} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold text-slate-900 truncate">{v.visitorName}</div>
                          <div className="text-[11px] text-slate-400 truncate">{v.hostResidentId?.name || 'Manager'}{unitOf(v) && ` · ${unitOf(v)}`}</div>
                        </div>
                        <span className="text-[11px] font-semibold text-blue-700 tabular-nums flex-shrink-0">{entry ? relTime(entry, now).replace(' ago', '') : '—'}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </RailCard>
        </div>
        <div className="dash-rise" style={{ animationDelay: '440ms' }}>
          <RailCard title="Arriving today" icon={Clock} color="#F59E0B" count={rail.arrivingTotal} empty="No more arrivals expected today.">
            {rail.arriving.length > 0 && (
              <ol className="px-4 py-3">
                {rail.arriving.map((v, i) => {
                  const late = new Date(v.expectedDate).getTime() < now;
                  const last = i === rail.arriving.length - 1;
                  return (
                    <li key={v._id} className="relative flex gap-3 pb-3 last:pb-0">
                      {!last && <span className="absolute left-[5px] top-4 bottom-0 w-px bg-amber-200" />}
                      <span className="relative mt-1.5 w-[11px] h-[11px] rounded-full flex-shrink-0 border-2 border-white"
                            style={{ background: late ? '#EF4444' : '#F59E0B', boxShadow: `0 0 0 2px ${late ? '#FECACA' : '#FDE68A'}` }} />
                      <button onClick={() => openVisitor(v)} className="min-w-0 flex-1 text-left group">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[13px] font-semibold text-slate-900 truncate group-hover:text-emerald-700">{v.visitorName}</span>
                          <span className="text-[11px] font-semibold tabular-nums flex-shrink-0" style={{ color: late ? '#DC2626' : '#B45309' }}>{format(new Date(v.expectedDate), 'h:mm a')}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate capitalize">{v.purpose} · {late ? `late by ${relTime(v.expectedDate, now).replace(' ago', '')}` : relTime(v.expectedDate, now)}</div>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </RailCard>
        </div>
        <div className="dash-rise rounded-2xl p-4 border border-emerald-100" style={{ background: 'linear-gradient(135deg, #ECFDF5, #F0FDFA 60%, #FFFFFF)', animationDelay: '500ms' }}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-2">Gate today</div>
          {(() => {
            const total = counts?.today || 0;
            const inside = counts?.['checked-in'] || 0;
            const pct = total ? Math.min(100, Math.round((inside / total) * 100)) : 0;
            return (<>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[24px] font-semibold text-slate-900 tabular-nums leading-none" style={{ letterSpacing: '-0.03em' }}>{total}</span>
                <span className="text-xs text-slate-500">visitor{total === 1 ? '' : 's'} due today</span>
              </div>
              <div className="h-1.5 rounded-full bg-emerald-100 mt-3 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #10B981, #2563EB)', transformOrigin: 'left', animation: 'dashGrowX 0.9s cubic-bezier(0.16,1,0.3,1) both' }} />
              </div>
              <div className="text-[11px] text-slate-500 mt-1.5">{inside} inside the estate now</div>
            </>);
          })()}
        </div>
      </aside>
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
