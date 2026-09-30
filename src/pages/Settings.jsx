import { useEffect, useRef, useState } from 'react';
import { estateAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import ProfileCard from '../components/ProfileCard';
import { Settings2, Save, ScrollText, Upload, FileText, Trash2, Download, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ManagerSettings() {
  const { user } = useAuth();
  const [estate, setEstate] = useState(null);
  const [settings, setSettings] = useState({
    requireVisitorApproval: false,
    marketplaceApproval: false,
    allowGuestChat: true,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
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

      {/* Estate info */}
      <div className="glass-card p-6 space-y-1">
        <h2 className="text-base font-semibold mb-4" style={{ color: '#0F172A' }}>Estate Information</h2>
        <div className="divide-y" style={{ '--tw-divide-opacity': 1 }}>
          {[
            ['Estate Name', estate?.name],
            ['Address', estate?.address],
            ['Invite Code', estate?.estateCode],
            ['Manager', user?.name],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-center py-3">
              <span className="text-sm" style={{ color: '#64748B' }}>{label}</span>
              <span className="text-sm font-semibold font-mono" style={{ color: '#0F172A' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
