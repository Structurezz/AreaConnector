import { useEffect, useState } from 'react';
import { estateAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import { Settings2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    if (!user?.estateId) return;
    estateAPI.getOne(user.estateId._id || user.estateId).then(({ data }) => {
      setEstate(data.data);
      setSettings(data.data.settings || {});
    }).catch(console.error).finally(() => setLoading(false));
  }, [user?.estateId]);

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
        <h1 className="text-3xl font-display font-bold mb-1" style={{ color: '#0F172A' }}>Estate Settings</h1>
        <p className="text-sm" style={{ color: '#64748B' }}>
          {estate?.name} · Code:{' '}
          <span className="font-mono font-semibold" style={{ color: '#10B981' }}>{estate?.estateCode}</span>
        </p>
      </div>

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
