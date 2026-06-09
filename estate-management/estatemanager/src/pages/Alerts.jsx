import { useEffect, useState } from 'react';
import { alertAPI } from '../api';
import Badge, { alertTypeBadge, alertStatusBadge } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { Bell, CheckCircle, XCircle, Megaphone, MapPin, Phone, AlertTriangle, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useSocket } from '../context/SocketContext';

export default function ManagerAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showBroadcast, setShowBroadcast] = useState(false);
  const BLANK_BROADCAST = {
    title: '', type: 'security', severity: 'high',
    location: '', note: '', actionRequired: '', contactNumber: '',
  };
  const [broadcastForm, setBroadcastForm] = useState(BLANK_BROADCAST);
  const [saving, setSaving] = useState(false);
  const { subscribe } = useSocket() || {};

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await alertAPI.getAll({ status: statusFilter || undefined });
      setAlerts(data.data);
    } catch {
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  useEffect(() => {
    if (!subscribe) return;
    const unsub = subscribe('new_alert', (alert) => {
      setAlerts((prev) => [alert, ...prev]);
      toast.error(`🚨 New ${alert.type} alert from ${alert.residentId?.name}!`);
    });
    return unsub;
  }, [subscribe]);

  const handleAck = async (id) => {
    try {
      await alertAPI.acknowledge(id);
      toast.success('Alert acknowledged');
      load();
    } catch { toast.error('Failed'); }
  };

  const handleResolve = async (id) => {
    try {
      await alertAPI.resolve(id);
      toast.success('Alert resolved');
      load();
    } catch { toast.error('Failed'); }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await alertAPI.broadcast(broadcastForm);
      toast.success('Emergency broadcast sent to all residents');
      setShowBroadcast(false);
      setBroadcastForm(BLANK_BROADCAST);
    } catch { toast.error('Failed'); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-1">Security Alerts</h1>
          <p className="text-white/50 text-sm">Monitor and respond to estate alerts</p>
        </div>
        <div className="flex gap-2">
          <select className="input-field w-44"
            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All alerts</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
          <button onClick={() => setShowBroadcast(true)} className="btn-danger gap-2">
            <Megaphone size={16} /> Broadcast
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Spinner /></div>
      ) : alerts.length === 0 ? (
        <EmptyState icon={Bell} title="No alerts found" message="The estate is calm" />
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div key={a._id} className={`glass-card p-5 transition-all ${
              a.status === 'open' ? 'border-red-500/30 bg-red-500/5' :
              a.status === 'acknowledged' ? 'border-amber-500/20' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Badge variant={alertTypeBadge(a.type)}>{a.type}</Badge>
                    <Badge variant={alertStatusBadge(a.status)}>{a.status}</Badge>
                    {a.isEmergencyBroadcast && <Badge variant="red">📢 Broadcast</Badge>}
                    {a.severity && a.isEmergencyBroadcast && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        a.severity === 'critical' ? 'bg-red-500/20 text-red-300' :
                        a.severity === 'high' ? 'bg-orange-500/20 text-orange-300' :
                        a.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-green-500/20 text-green-300'
                      }`}>{a.severity.toUpperCase()}</span>
                    )}
                  </div>
                  {a.title && <div className="text-white font-semibold text-sm mb-0.5">{a.title}</div>}
                  <div className="text-white/50 text-xs mb-1">
                    {a.residentId?.name}{a.unitId?.unitNumber ? ` · Unit ${a.unitId.unitNumber}` : ''}
                    {a.location && <><span className="mx-1.5">·</span><MapPin size={10} className="inline mr-0.5" />{a.location}</>}
                  </div>
                  {a.note && <p className="text-white/60 text-sm mb-1.5">{a.note}</p>}
                  {a.actionRequired && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 mb-1.5">
                      <AlertTriangle size={11} /> <span className="font-medium">Action:</span> {a.actionRequired}
                    </div>
                  )}
                  {a.contactNumber && (
                    <div className="flex items-center gap-1.5 text-xs text-white/40 mb-1.5">
                      <Phone size={11} /> {a.contactNumber}
                    </div>
                  )}
                  <div className="text-xs text-white/30">
                    {format(new Date(a.createdAt), 'MMM d, yyyy · HH:mm')}
                    {a.resolvedBy && ` · Resolved by ${a.resolvedBy.name}`}
                  </div>
                </div>
                {a.status !== 'resolved' && (
                  <div className="flex gap-2 flex-shrink-0">
                    {a.status === 'open' && (
                      <button onClick={() => handleAck(a._id)} className="btn-outline text-sm px-3 py-1.5">
                        Acknowledge
                      </button>
                    )}
                    <button onClick={() => handleResolve(a._id)} className="btn-primary text-sm px-3 py-1.5">
                      Resolve
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showBroadcast} onClose={() => setShowBroadcast(false)} title="Emergency Broadcast" size="lg">
        <form onSubmit={handleBroadcast} className="space-y-5">

          {/* Warning banner */}
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
            <ShieldAlert size={18} className="flex-shrink-0 mt-0.5" />
            <span>This broadcast will immediately notify <strong>all residents</strong> in the estate. Use only for real emergencies.</span>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Broadcast Title <span className="text-red-400">*</span></label>
            <input className="input-field" placeholder="e.g. Armed Robbery Reported Near Main Gate"
              value={broadcastForm.title}
              onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
              required />
          </div>

          {/* Type + Severity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Emergency Type <span className="text-red-400">*</span></label>
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
              <label className="text-sm text-white/60 mb-1.5 block">Severity Level <span className="text-red-400">*</span></label>
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
            <label className="text-sm text-white/60 mb-1.5 block flex items-center gap-1.5">
              <MapPin size={13} /> Location in Estate
            </label>
            <input className="input-field" placeholder="e.g. Block A, Main Gate, Swimming Pool area"
              value={broadcastForm.location}
              onChange={(e) => setBroadcastForm({ ...broadcastForm, location: e.target.value })} />
          </div>

          {/* Message */}
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Full Message / Details <span className="text-red-400">*</span></label>
            <textarea className="input-field" rows={3}
              placeholder="Describe exactly what happened or is happening..."
              value={broadcastForm.note}
              onChange={(e) => setBroadcastForm({ ...broadcastForm, note: e.target.value })}
              required />
          </div>

          {/* Action Required */}
          <div>
            <label className="text-sm text-white/60 mb-2 block flex items-center gap-1.5">
              <AlertTriangle size={13} /> Action Required for Residents
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {['Stay indoors', 'Lock all doors', 'Evacuate immediately', 'Avoid the area', 'Call security'].map((preset) => (
                <button key={preset} type="button"
                  onClick={() => setBroadcastForm({ ...broadcastForm, actionRequired: preset })}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    broadcastForm.actionRequired === preset
                      ? 'bg-red-500/20 border-red-500/40 text-red-300'
                      : 'border-white/15 text-white/40 hover:border-white/30 hover:text-white/70'
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
            <label className="text-sm text-white/60 mb-1.5 block flex items-center gap-1.5">
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
              {saving ? 'Sending...' : 'Send Emergency Broadcast'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
