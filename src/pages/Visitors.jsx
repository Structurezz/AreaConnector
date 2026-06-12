import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { visitorAPI } from '../api';
import Badge, { visitorStatusBadge } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import {
  UserCheck, Search, LogIn, LogOut, Ban, Plus, X,
  Phone, Mail, Calendar, Clock, MapPin, User,
  Package, Wrench, Users, Home, MoreHorizontal,
  FileText, ChevronDown, ChevronUp,
  Share2, CheckCircle, QrCode, StickyNote,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ACCENT      = '#10B981';
const ACCENT_DARK = '#059669';

const WhatsAppIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const generatePassCanvas = async (v) => {
  const W = 560, H = 700;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, ACCENT); grad.addColorStop(1, ACCENT_DARK);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 185);
  ctx.fillStyle = 'rgba(255,255,255,0.70)'; ctx.font = 'bold 12px sans-serif';
  ctx.fillText('GUEST PASS', 36, 44);
  ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 26px sans-serif';
  ctx.fillText(v.visitorName, 36, 90);
  ctx.fillStyle = 'rgba(255,255,255,0.78)'; ctx.font = '15px sans-serif';
  ctx.fillText(v.purpose, 36, 122);
  ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = '13px sans-serif';
  ctx.fillText(format(new Date(v.expectedDate), 'MMM d, yyyy · h:mm a'), 36, 154);
  ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(0,0,0,0.10)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(16, 200); ctx.lineTo(W - 16, 200); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#94A3B8'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('ACCESS CODE', W / 2, 238);
  ctx.fillStyle = ACCENT; ctx.font = 'bold 38px monospace';
  ctx.fillText(v.visitorCode, W / 2, 288);
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, v.visitorCode, { width: 200, margin: 2, color: { dark: '#0B1C3D', light: '#FFFFFF' } });
  ctx.drawImage(qrCanvas, (W - 200) / 2, 308);
  ctx.fillStyle = '#94A3B8'; ctx.font = '11px sans-serif';
  ctx.fillText('Scan at the security gate', W / 2, 528);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94A3B8'; ctx.font = '11px sans-serif'; ctx.fillText('Duration', 40, 568);
  ctx.fillStyle = '#0F172A'; ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`${v.expectedDuration || 720} min`, 40, 586);
  if (v.visitorPhone) {
    ctx.fillStyle = '#94A3B8'; ctx.font = '11px sans-serif'; ctx.fillText('Phone', W / 2, 568);
    ctx.fillStyle = '#0F172A'; ctx.font = 'bold 13px sans-serif'; ctx.fillText(v.visitorPhone, W / 2, 586);
  }
  ctx.textAlign = 'center'; ctx.fillStyle = '#CBD5E1'; ctx.font = '11px sans-serif';
  ctx.fillText('Show this pass at the security gate', W / 2, 640);
  return canvas;
};

const shareVisitorPass = (v) => {
  const date = format(new Date(v.expectedDate), 'MMM d, yyyy · h:mm a');
  const waText = `🏠 *Visitor Pass — ${v.visitorName}*\n\n*Code:* ${v.visitorCode}\n*Purpose:* ${v.purpose}\n*Expected:* ${date}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank');
  generatePassCanvas(v)
    .then(canvas => new Promise(resolve => canvas.toBlob(resolve, 'image/png')))
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'visitor-pass.png'; a.click();
      URL.revokeObjectURL(url);
    })
    .catch(() => {});
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

  if (['checked-out', 'blacklisted', 'expired'].includes(visitor.status)) return null;

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

const STATUSES = ['', 'active', 'checked-in', 'checked-out', 'expired', 'blacklisted'];

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
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="absolute right-0 top-0 bottom-0 w-[480px] flex flex-col bg-white animate-slide-in-right"
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
          <CreatePassForm onClose={onClose} onSuccess={onSuccess} />
        </div>
      </div>
    </div>
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
          onClick={() => shareVisitorPass(v)}
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
  const [pagination,    setPagination]    = useState({ total: 0, pages: 1 });
  const [showCreate,    setShowCreate]    = useState(false);
  const [passResult,    setPassResult]    = useState(null);
  const [selectedVisitor, setSelectedVisitor] = useState(null);

  const openVisitor = (v) => {
    if (window.innerWidth < 640) navigate(`/visitors/${v._id}`);
    else setSelectedVisitor(v);
  };

  const load = async (p = page, q = search, status = statusFilter) => {
    setLoading(true);
    try {
      const { data } = await visitorAPI.getAll({
        status: status || undefined,
        search: q || undefined,
        page: p,
        limit: PAGE_SIZE,
      });
      setVisitors(data.data);
      setPagination(data.pagination || { total: data.data.length, pages: 1 });
    } catch {
      toast.error('Failed to load visitors');
    } finally { setLoading(false); }
  };

  const handlePage         = (p) => { setPage(p); load(p, search, statusFilter); };
  const handleSearch       = (q) => { setSearch(q); setPage(1); load(1, q, statusFilter); };
  const handleStatusChange = (s) => { setStatusFilter(s); setPage(1); load(1, search, s); };

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
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>Visitor Log</h1>
          <p className="text-sm" style={{ color: '#64748B' }}>All visitor records for your estate</p>
        </div>
        <button onClick={() => window.innerWidth < 1024 ? navigate('/visitors/new') : setShowCreate(true)} className="btn-primary gap-2">
          <Plus size={15} /> Create Guest Pass
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
          <input className="input-field pl-9" placeholder="Search name, purpose, code…"
            value={search} onChange={(e) => handleSearch(e.target.value)} />
        </div>
        <select className="input-field sm:w-44" value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s ? s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ') : 'All statuses'}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12"><Spinner /></div>
        ) : visitors.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <UserCheck size={40} style={{ color: '#CBD5E1' }} />
            <p className="font-medium" style={{ color: '#94A3B8' }}>No visitors found</p>
            <button onClick={() => window.innerWidth < 1024 ? navigate('/visitors/new') : setShowCreate(true)} className="btn-primary gap-2 mt-1">
              <Plus size={14} /> Create Guest Pass
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  {['Visitor', 'Host', 'Purpose', 'Expected', 'Code', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium uppercase tracking-wider px-4 py-3"
                      style={{ color: '#94A3B8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visitors.map((v) => (
                  <tr key={v._id}
                    onClick={() => openVisitor(v)}
                    style={{ borderTop: '1px solid rgba(0,0,0,0.04)', transition: 'background 0.15s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm" style={{ color: '#0F172A' }}>{v.visitorName}</div>
                      <div className="text-xs" style={{ color: '#94A3B8' }}>{v.visitorPhone || v.visitorEmail || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#475569' }}>{v.hostResidentId?.name || 'Manager'}</td>
                    <td className="px-4 py-3 text-sm max-w-[140px] truncate" style={{ color: '#475569' }}>{v.purpose}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: '#475569' }}>
                      {format(new Date(v.expectedDate), 'MMM d, HH:mm')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm tracking-widest" style={{ color: ACCENT }}>{v.visitorCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={visitorStatusBadge(v.status)}>{v.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        {v.status === 'active' && (
                          <button onClick={() => handleCheckIn(v._id)} title="Check in"
                            className="p-1.5 rounded-lg transition-all"
                            style={{ color: '#94A3B8' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.10)'; e.currentTarget.style.color = '#059669'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}>
                            <LogIn size={15} />
                          </button>
                        )}
                        {v.status === 'checked-in' && (
                          <button onClick={() => handleCheckOut(v._id)} title="Check out"
                            className="p-1.5 rounded-lg transition-all"
                            style={{ color: '#94A3B8' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.10)'; e.currentTarget.style.color = '#2563EB'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}>
                            <LogOut size={15} />
                          </button>
                        )}
                        {!['blacklisted', 'checked-out', 'expired'].includes(v.status) && (
                          <button onClick={() => handleBlacklist(v._id)} title="Blacklist"
                            className="p-1.5 rounded-lg transition-all"
                            style={{ color: '#94A3B8' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.10)'; e.currentTarget.style.color = '#DC2626'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}>
                            <Ban size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={PAGE_SIZE} onPage={handlePage} />

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
