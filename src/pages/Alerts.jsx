import { useEffect, useState } from 'react';
import { alertAPI } from '../api';
import { upsertAlert } from '../utils/alertEvents';
import Modal from '../components/ui/Modal';
import { MapPin, Phone, AlertTriangle, ShieldAlert, Users, Shield, Briefcase, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSocket } from '../context/SocketContext';
import AlertsDesktop from '../components/alerts/AlertsDesktop';
import AlertsMobile from '../components/alerts/AlertsMobile';
import useIsDesktop from '../hooks/useIsDesktop';

const PAGE_SIZE = 10;

const AUDIENCE_OPTIONS = [
  { value: 'all',            label: 'Everyone',       sub: 'All residents + staff', Icon: Users },
  { value: 'staff',          label: 'Staff only',     sub: 'Estate manager + security', Icon: Briefcase },
  { value: 'estate_manager', label: 'Estate Manager', sub: 'Managers only', Icon: UserCog },
  { value: 'security',       label: 'Security only',  sub: 'Security team only', Icon: Shield },
];

const AUDIENCE_LABELS = {
  all: 'all residents + staff',
  staff: 'estate manager + security',
  estate_manager: 'estate managers',
  security: 'security team',
};

const AUDIENCE_BANNERS = {
  all: { bg: 'bg-red-50 border-red-200 text-red-600', text: <>This broadcast will immediately notify <strong>all residents</strong> in the estate. Use only for real emergencies.</> },
  staff: { bg: 'bg-amber-50 border-amber-200 text-amber-700', text: <>Only <strong>estate manager and security staff</strong> will see this alert. Residents will not be notified.</> },
  estate_manager: { bg: 'bg-orange-50 border-orange-200 text-orange-700', text: <>Only <strong>estate managers</strong> will see this alert.</> },
  security: { bg: 'bg-blue-50 border-blue-200 text-blue-700', text: <>Only the <strong>security team</strong> will see this alert.</> },
};

export default function ManagerAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [showBroadcast, setShowBroadcast] = useState(false);
  const BLANK_BROADCAST = {
    title: '', type: 'security', severity: 'high',
    location: '', note: '', actionRequired: '', contactNumber: '',
    audience: 'all',
  };
  const [broadcastForm, setBroadcastForm] = useState(BLANK_BROADCAST);
  const [saving, setSaving] = useState(false);
  const { subscribe } = useSocket() || {};
  const isDesktop = useIsDesktop();
  const [counts, setCounts] = useState(null);

  // Totals per status for the desktop banner and filter tabs
  const loadCounts = async () => {
    try {
      const keys = ['open', 'acknowledged', 'resolved'];
      const res = await Promise.all(keys.map((k) => alertAPI.getAll({ status: k, page: 1, limit: 1 })));
      setCounts(Object.fromEntries(keys.map((k, i) => [k, res[i].data.pagination?.total ?? res[i].data.data.length])));
    } catch { /* banner falls back to dashes */ }
  };
  useEffect(() => { loadCounts(); }, []);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const { data } = await alertAPI.getAll({ status: statusFilter || undefined, page: p, limit: PAGE_SIZE });
      setAlerts(data.data);
      setPagination(data.pagination || { total: data.data.length, pages: 1 });
    } catch {
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const handlePage = (p) => { setPage(p); load(p); };

  useEffect(() => { setPage(1); load(1); }, [statusFilter]);

  useEffect(() => {
    if (!subscribe) return;
    // Keep the list in sync with live events. New alerts are announced by
    // the global siren popup (NotificationContext), so no extra toast here.
    const unsub = subscribe('new_alert', (alert) => {
      loadCounts();
      setAlerts((prev) => {
        const next = upsertAlert(prev, alert);
        // Drop rows that no longer match the active status filter.
        return statusFilter ? next.filter((a) => a.status === statusFilter) : next;
      });
    });
    return unsub;
  }, [subscribe, statusFilter]);

  const handleAck = async (id) => {
    try {
      await alertAPI.acknowledge(id);
      toast.success('Alert acknowledged');
      load(); loadCounts();
    } catch { toast.error('Failed'); }
  };

  const handleResolve = async (id) => {
    try {
      await alertAPI.resolve(id);
      toast.success('Alert resolved');
      load(); loadCounts();
    } catch { toast.error('Failed'); }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await alertAPI.broadcast(broadcastForm);
      toast.success(`Alert sent to ${AUDIENCE_LABELS[broadcastForm.audience] || 'recipients'}`);
      load(); loadCounts();
      setShowBroadcast(false);
      setBroadcastForm(BLANK_BROADCAST);
    } catch { toast.error('Failed'); } finally { setSaving(false); }
  };

  const broadcastModal = (
      <Modal open={showBroadcast} onClose={() => setShowBroadcast(false)} title="Emergency Broadcast" size="lg">
        <form onSubmit={handleBroadcast} className="space-y-5">

          {/* Audience selector */}
          <div>
            <label className="text-sm text-slate-500 mb-2 block">Send to</label>
            <div className="grid grid-cols-2 gap-2">
              {AUDIENCE_OPTIONS.map(({ value, label, sub, Icon }) => {
                const active = broadcastForm.audience === value;
                return (
                  <button key={value} type="button"
                    onClick={() => setBroadcastForm({ ...broadcastForm, audience: value })}
                    className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all ${
                      active
                        ? 'border-pink-400 bg-pink-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}>
                    <Icon size={18} className={active ? 'text-pink-600' : 'text-slate-500'} />
                    <div className="min-w-0">
                      <div className={`text-sm font-semibold ${active ? 'text-pink-700' : 'text-slate-800'}`}>{label}</div>
                      <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Warning banner (audience-aware) */}
          {(() => {
            const b = AUDIENCE_BANNERS[broadcastForm.audience] || AUDIENCE_BANNERS.all;
            return (
              <div className={`flex items-start gap-3 p-3.5 rounded-lg border text-sm ${b.bg}`}>
                <ShieldAlert size={18} className="flex-shrink-0 mt-0.5" />
                <span>{b.text}</span>
              </div>
            );
          })()}

          {/* Title */}
          <div>
            <label className="text-sm text-slate-500 mb-1.5 block">Broadcast Title <span className="text-red-500">*</span></label>
            <input className="input-field" placeholder="e.g. Armed Robbery Reported Near Main Gate"
              value={broadcastForm.title}
              onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
              required />
          </div>

          {/* Type + Severity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-500 mb-1.5 block">Emergency Type <span className="text-red-500">*</span></label>
              <select className="input-field" value={broadcastForm.type}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, type: e.target.value })}>
                <option value="security">🔒 Security</option>
                <option value="fire">🔥 Fire</option>
                <option value="medical">🚑 Medical</option>
                <option value="noise">📢 Noise</option>
                <option value="other">⚠️ Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-500 mb-1.5 block">Severity Level <span className="text-red-500">*</span></label>
              <select className="input-field" value={broadcastForm.severity}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, severity: e.target.value })}>
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🟠 High</option>
                <option value="critical">🔴 Critical</option>
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-sm text-slate-500 mb-1.5 block flex items-center gap-1.5">
              <MapPin size={13} /> Location in Estate
            </label>
            <input className="input-field" placeholder="e.g. Block A, Main Gate, Swimming Pool area"
              value={broadcastForm.location}
              onChange={(e) => setBroadcastForm({ ...broadcastForm, location: e.target.value })} />
          </div>

          {/* Message */}
          <div>
            <label className="text-sm text-slate-500 mb-1.5 block">Full Message / Details <span className="text-red-500">*</span></label>
            <textarea className="input-field" rows={3}
              placeholder="Describe exactly what happened or is happening..."
              value={broadcastForm.note}
              onChange={(e) => setBroadcastForm({ ...broadcastForm, note: e.target.value })}
              required />
          </div>

          {/* Action Required */}
          <div>
            <label className="text-sm text-slate-500 mb-2 block flex items-center gap-1.5">
              <AlertTriangle size={13} /> Action Required for Residents
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {['Stay indoors', 'Lock all doors', 'Evacuate immediately', 'Avoid the area', 'Call security'].map((preset) => (
                <button key={preset} type="button"
                  onClick={() => setBroadcastForm({ ...broadcastForm, actionRequired: preset })}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    broadcastForm.actionRequired === preset
                      ? 'bg-red-50 border-red-300 text-red-600'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                  }`}>
                  {preset}
                </button>
              ))}
            </div>
            <input className="input-field" placeholder="Or type a custom instruction..."
              value={broadcastForm.actionRequired}
              onChange={(e) => setBroadcastForm({ ...broadcastForm, actionRequired: e.target.value })} />
          </div>

          {/* Contact Number */}
          <div>
            <label className="text-sm text-slate-500 mb-1.5 block flex items-center gap-1.5">
              <Phone size={13} /> Emergency Contact Number
            </label>
            <input className="input-field" placeholder="e.g. +234 800 000 0000 (security desk)"
              value={broadcastForm.contactNumber}
              onChange={(e) => setBroadcastForm({ ...broadcastForm, contactNumber: e.target.value })} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowBroadcast(false)} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={saving || !broadcastForm.title || !broadcastForm.note}
              className="btn-danger flex-1 gap-2">
              <ShieldAlert size={15} />
              {saving ? 'Sending...' : `Send to ${AUDIENCE_LABELS[broadcastForm.audience]}`}
            </button>
          </div>
        </form>
      </Modal>
  );

  if (isDesktop) return (
    <>
      <AlertsDesktop
        alerts={alerts} loading={loading} counts={counts}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        page={page} pagination={pagination} onPage={handlePage}
        onAck={handleAck} onResolve={handleResolve} onBroadcast={() => setShowBroadcast(true)}
      />
      {broadcastModal}
    </>
  );

  return (
    <>
      <AlertsMobile
        alerts={alerts} loading={loading} counts={counts}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        page={page} pagination={pagination} pageSize={PAGE_SIZE} onPage={handlePage}
        onAck={handleAck} onResolve={handleResolve} onBroadcast={() => setShowBroadcast(true)}
      />
      {broadcastModal}
    </>
  );
}
