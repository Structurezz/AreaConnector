import { useEffect, useRef, useState } from 'react';
import { estateAPI, authAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import ProfileCard from '../components/ProfileCard';
import { Settings2, Save, ScrollText, Upload, FileText, Trash2, Download, Sparkles, MapPin, Building2, CheckCircle2, KeyRound, Lock, ShieldCheck, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ManagerSettings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [estate, setEstate] = useState(null);
  const [settings, setSettings] = useState({
    requireVisitorApproval: false,
    marketplaceApproval: false,
    allowGuestChat: true,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Change password
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const mustReset = user?.mustChangePassword;

  const submitPw = async () => {
    if (!pw.next || pw.next.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (pw.next !== pw.confirm)         { toast.error('Passwords don\'t match'); return; }
    if (!mustReset && !pw.current)       { toast.error('Enter your current password'); return; }
    setPwSaving(true);
    try {
      await authAPI.changePassword({ currentPassword: pw.current, newPassword: pw.next });
      toast.success('Password changed — please sign in again');
      setPw({ current: '', next: '', confirm: '' });
      try { await logout?.(); } catch {}
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not change password');
    } finally { setPwSaving(false); }
  };

  // Editable estate info (name + address)
  const [infoDraft, setInfoDraft] = useState({ name: '', address: '' });
  const [infoSaving, setInfoSaving] = useState(false);
  const [constitution, setConstitution] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const estateId = user?.estateId?._id || user?.estateId;

  const loadConstitution = () => {
    if (!estateId) return;
    estateAPI.getConstitutionMeta(estateId)
      .then(({ data }) => setConstitution(data.data))
      .catch(() => setConstitution({ hasConstitution: false }));
  };

  useEffect(() => {
    if (!estateId) return;
    estateAPI.getOne(estateId).then(({ data }) => {
      setEstate(data.data);
      setSettings(data.data.settings || {});
      setInfoDraft({ name: data.data.name || '', address: data.data.address || '' });
    }).catch(console.error).finally(() => setLoading(false));
    loadConstitution();
  }, [estateId]);

  const handleUpload = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are allowed');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('File too large — max 15MB');
      return;
    }
    setUploading(true);
    try {
      await estateAPI.uploadConstitution(estateId, file);
      toast.success('Constitution uploaded — AI court now grounded on it');
      loadConstitution();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Remove the estate constitution? The AI judge and lawyers will fall back to generic reasoning.')) return;
    try {
      await estateAPI.deleteConstitution(estateId);
      toast.success('Constitution removed');
      loadConstitution();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove');
    }
  };

  const downloadUrl = constitution?.hasConstitution
    ? `${API_BASE}${estateAPI.constitutionFileUrl(estateId)}`
    : null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await estateAPI.update(estate._id, { settings });
      toast.success('Settings saved');
    } catch { toast.error('Failed'); } finally { setSaving(false); }
  };

  // ── Save estate info (name + address). Backend geocodes on address change
  // whenever GOOGLE_MAPS_API_KEY is set, so the pin updates automatically.
  const infoDirty = (
    (infoDraft.name    || '').trim() !== (estate?.name    || '').trim() ||
    (infoDraft.address || '').trim() !== (estate?.address || '').trim()
  );

  const handleSaveInfo = async () => {
    const name = (infoDraft.name || '').trim();
    const address = (infoDraft.address || '').trim();
    if (!name)    { toast.error('Estate name is required'); return; }
    if (!address) { toast.error('Address is required'); return; }
    setInfoSaving(true);
    try {
      const addressChanged = address !== (estate?.address || '').trim();
      const { data } = await estateAPI.update(estate._id, { name, address });
      setEstate(data.data);
      setInfoDraft({ name: data.data.name || '', address: data.data.address || '' });
      // Backend reports what happened with Google geocoding
      const outcome = data.geocode;
      if (addressChanged) {
        if (outcome === 'success' || outcome === 'manual') {
          toast.success('Address saved and pin updated on the map');
        } else if (outcome === 'failed') {
          toast('Address saved. We couldn\'t find a map pin — try adding more detail (street, city).', { icon: '⚠️' });
        } else if (outcome === 'not_configured') {
          toast('Address saved. Google Maps isn\'t configured on the server, so the pin didn\'t update.', { icon: '⚠️' });
        } else {
          toast.success('Address saved');
        }
      } else {
        toast.success('Estate info saved');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save estate info');
    } finally {
      setInfoSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Spinner /></div>;

  const toggles = [
    { key: 'requireVisitorApproval', label: 'Require Visitor Approval', desc: 'All visitor pre-registrations require manager approval before the code is sent.' },
    { key: 'marketplaceApproval', label: 'Marketplace Approval', desc: 'All marketplace listings require manager approval before going live.' },
    { key: 'allowGuestChat', label: 'Allow Community Chat', desc: 'Residents can message each other in the estate group chat.' },
  ];

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold mb-1" style={{ color: '#0F172A' }}>Settings</h1>
        <p className="text-sm" style={{ color: '#64748B' }}>
          {estate?.name} · Code:{' '}
          <span className="font-mono font-semibold" style={{ color: '#10B981' }}>{estate?.estateCode}</span>
        </p>
      </div>

      <ProfileCard />

      <div className="glass-card p-6 space-y-1">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: '#0F172A' }}>
          <Settings2 size={18} style={{ color: '#10B981' }} /> General Settings
        </h2>
        {toggles.map(({ key, label, desc }) => (
          <div key={key} className="flex items-start gap-4 py-4" style={{ borderBottom: '1px solid #F1F5F9' }}>
            <div className="flex-1">
              <div className="font-medium mb-0.5" style={{ color: '#0F172A' }}>{label}</div>
              <div className="text-sm" style={{ color: '#64748B' }}>{desc}</div>
            </div>
            <button
              onClick={() => setSettings({ ...settings, [key]: !settings[key] })}
              className="relative w-11 h-6 rounded-full transition-all flex-shrink-0 mt-0.5"
              style={{ background: settings[key] ? '#10B981' : '#E2E8F0' }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{ transform: settings[key] ? 'translateX(1.25rem)' : 'translateX(0)' }}
              />
            </button>
          </div>
        ))}
        <div className="pt-4">
          <button onClick={handleSave} disabled={saving} className="btn-primary gap-2">
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* ─── Estate Constitution ─── */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: '#0F172A' }}>
              <ScrollText size={18} style={{ color: '#EC4899' }} /> Estate Constitution
            </h2>
            <p className="text-xs mt-1" style={{ color: '#64748B' }}>
              Upload your estate's constitution as a PDF. The AI Judge and AI lawyers in the Courtroom will be grounded on these rules for every case in this estate.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full flex-shrink-0"
                style={{ background: 'rgba(236,72,153,0.10)', color: '#EC4899' }}>
            <Sparkles size={10} /> AI-grounded
          </span>
        </div>

        {constitution?.hasConstitution ? (
          <div className="rounded-xl p-4 flex items-center gap-3"
               style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.06), rgba(236,72,153,0.02))',
                        border: '1px solid rgba(236,72,153,0.18)' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(236,72,153,0.14)' }}>
              <FileText size={20} style={{ color: '#EC4899' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>
                {constitution.fileName || 'constitution.pdf'}
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                {formatBytes(constitution.sizeBytes)}
                {constitution.pageCount ? ` · ${constitution.pageCount} page${constitution.pageCount === 1 ? '' : 's'}` : ''}
                {constitution.uploadedAt ? ` · uploaded ${format(new Date(constitution.uploadedAt), 'MMM d, yyyy')}` : ''}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a href={downloadUrl} target="_blank" rel="noreferrer"
                 className="p-2 rounded-lg transition-all"
                 style={{ background: 'rgba(236,72,153,0.10)', color: '#EC4899' }}
                 title="View / download">
                <Download size={15} />
              </a>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                      className="p-2 rounded-lg transition-all disabled:opacity-50"
                      style={{ background: 'rgba(15,23,42,0.05)', color: '#64748B' }}
                      title="Replace with new file">
                <Upload size={15} />
              </button>
              <button onClick={handleDelete}
                      className="p-2 rounded-lg transition-all"
                      style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}
                      title="Remove constitution">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleUpload(f);
            }}
            className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all"
            style={{
              borderColor: dragOver ? '#EC4899' : '#E2E8F0',
              background: dragOver ? 'rgba(236,72,153,0.04)' : 'transparent',
            }}
          >
            <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                 style={{ background: 'rgba(236,72,153,0.10)' }}>
              <Upload size={20} style={{ color: '#EC4899' }} />
            </div>
            <div className="text-sm font-semibold mb-1" style={{ color: '#0F172A' }}>
              {uploading ? 'Uploading and indexing…' : 'Upload your Estate Constitution'}
            </div>
            <div className="text-xs" style={{ color: '#64748B' }}>
              Drag & drop a PDF here, or click to browse · Max 15MB
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = '';
          }}
        />
      </div>

      {/* Estate info — editable */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: '#0F172A' }}>
              <Building2 size={18} style={{ color: '#10B981' }} /> Estate Information
            </h2>
            <p className="text-xs mt-1" style={{ color: '#64748B' }}>
              Keep your estate name and address up to date. The map pin is re-generated automatically from the address.
            </p>
          </div>
          {estate?.location?.lat && estate?.location?.lng && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full flex-shrink-0"
                  style={{ background: 'rgba(16,185,129,0.10)', color: '#059669' }}
                  title="This address has a verified Google Maps pin.">
              <CheckCircle2 size={10} /> Geocoded
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#475569' }}>Estate name</label>
            <input
              className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }}
              onFocus={e => (e.currentTarget.style.borderColor = '#10B981')}
              onBlur={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
              value={infoDraft.name}
              onChange={e => setInfoDraft({ ...infoDraft, name: e.target.value })}
              placeholder="e.g. Sunrise Estate"
            />
          </div>

          <div>
            <label className="text-xs font-semibold mb-1.5 block flex items-center gap-1.5" style={{ color: '#475569' }}>
              <MapPin size={12} style={{ color: '#10B981' }} /> Street address
            </label>
            <textarea
              rows={2}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all resize-none"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A', fontFamily: 'inherit' }}
              onFocus={e => (e.currentTarget.style.borderColor = '#10B981')}
              onBlur={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
              value={infoDraft.address}
              onChange={e => setInfoDraft({ ...infoDraft, address: e.target.value })}
              placeholder="e.g. 24 Admiralty Way, Lekki Phase 1, Lagos"
            />
            <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: '#94A3B8' }}>
              <MapPin size={10} /> We re-geocode via Google Maps as soon as you save.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1" style={{ borderTop: '1px solid #F1F5F9' }}>
            <div className="text-xs" style={{ color: '#64748B' }}>
              Invite code
              <span className="ml-2 font-mono font-semibold" style={{ color: '#10B981' }}>{estate?.estateCode || '—'}</span>
              <span className="ml-3">· Manager <span className="font-semibold" style={{ color: '#0F172A' }}>{user?.name || '—'}</span></span>
            </div>
            <div className="flex items-center gap-2">
              {infoDirty && (
                <button
                  type="button"
                  onClick={() => setInfoDraft({ name: estate?.name || '', address: estate?.address || '' })}
                  className="text-xs font-semibold px-3 py-2 rounded-lg transition-all"
                  style={{ background: '#F1F5F9', color: '#475569' }}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSaveInfo}
                disabled={!infoDirty || infoSaving}
                className="btn-primary gap-2"
                style={{ opacity: (!infoDirty || infoSaving) ? 0.6 : 1 }}
              >
                <Save size={16} />
                {infoSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Change Password ─────────────────────────────────────────── */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: '#0F172A' }}>
          <KeyRound size={18} style={{ color: '#6366F1' }} /> Password
        </h2>
        {mustReset && (
          <div className="rounded-xl p-3 mb-3 flex items-start gap-2"
               style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <ShieldCheck size={16} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.55 }}>
              <strong>Temporary password detected.</strong> Set a new password to continue.
            </div>
          </div>
        )}
        <div className="space-y-2.5">
          {!mustReset && (
            <input type={showPw ? 'text' : 'password'}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }}
              placeholder="Current password"
              value={pw.current}
              onChange={e => setPw({ ...pw, current: e.target.value })}
            />
          )}
          <input type={showPw ? 'text' : 'password'}
            className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
            style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }}
            placeholder="New password (min. 6 characters)"
            value={pw.next}
            onChange={e => setPw({ ...pw, next: e.target.value })}
          />
          <input type={showPw ? 'text' : 'password'}
            className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
            style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }}
            placeholder="Confirm new password"
            value={pw.confirm}
            onChange={e => setPw({ ...pw, confirm: e.target.value })}
          />
          <label className="flex items-center gap-2 text-xs" style={{ color: '#64748B' }}>
            <input type="checkbox" checked={showPw} onChange={e => setShowPw(e.target.checked)} />
            Show passwords
          </label>
          <button
            onClick={submitPw}
            disabled={pwSaving}
            className="btn-primary gap-2 w-full justify-center"
          >
            <Lock size={16} /> {pwSaving ? 'Changing…' : 'Change password'}
          </button>
        </div>
      </div>

      {/* ── Password reset requests ────────────────────────────────── */}
      <Link to="/settings/password-requests"
        className="glass-card p-4 flex items-center gap-3 transition-all hover:border-brand"
        style={{ textDecoration: 'none' }}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
             style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)', color: '#fff' }}>
          <KeyRound size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm" style={{ color: '#0F172A' }}>Password reset requests</div>
          <div className="text-xs mt-0.5" style={{ color: '#64748B' }}>
            Approve or deny password resets from your residents and security staff.
          </div>
        </div>
        <ChevronRight size={16} style={{ color: '#94A3B8' }} />
      </Link>
    </div>
  );
}
