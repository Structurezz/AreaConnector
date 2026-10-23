import { useEffect, useState } from 'react';
import { teamAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';
import {
  UsersRound, MailPlus, Crown, Check, Users, Shield, Wallet, Megaphone, Music,
  Settings2, Trash2, RotateCw, PauseCircle, PlayCircle, Pencil,
} from 'lucide-react';

// Area metadata for the UI; keys match server/utils/teamAccess.js AREAS
const AREAS = [
  { key: 'residents',      label: 'Residents & units', desc: 'Residents, units, invites',                 Icon: Users,     color: '#6366F1' },
  { key: 'security',       label: 'Security',          desc: 'Visitors, guards, alerts, safety',          Icon: Shield,    color: '#EF4444' },
  { key: 'finance',        label: 'Finance',           desc: 'Dues, payments, wallet, withdrawals, plan', Icon: Wallet,    color: '#10B981' },
  { key: 'communications', label: 'Communications',    desc: 'Announcements and community chat',          Icon: Megaphone, color: '#F59E0B' },
  { key: 'community',      label: 'Community',         desc: 'Lounge, events, polls, marketplace',        Icon: Music,     color: '#EC4899' },
  { key: 'settings',       label: 'Settings & team',   desc: 'Estate settings and this Team page',        Icon: Settings2, color: '#64748B' },
];
const AREA = Object.fromEntries(AREAS.map(a => [a.key, a]));

const PRESETS = [
  { key: 'admin',          label: 'Admin',          permissions: AREAS.map(a => a.key) },
  { key: 'finance',        label: 'Finance',        permissions: ['finance', 'residents'] },
  { key: 'security',       label: 'Security lead',  permissions: ['security', 'residents'] },
  { key: 'communications', label: 'Communications', permissions: ['communications', 'community'] },
];

const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
const presetFor = (perms) => PRESETS.find(p => sameSet(p.permissions, perms));

function AccessPicker({ value, onChange }) {
  const toggle = (k) => onChange(value.includes(k) ? value.filter(x => x !== k) : [...value, k]);
  const current = presetFor(value);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map(p => {
          const on = current?.key === p.key;
          return (
            <button key={p.key} type="button" onClick={() => onChange(p.permissions)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
              style={on ? { background: '#10B981', color: '#fff', borderColor: '#10B981' } : { background: '#fff', color: '#475569', borderColor: '#E2E8F0' }}>
              {p.label}
            </button>
          );
        })}
        <span className="px-3 py-1.5 rounded-full text-xs font-semibold border"
          style={!current && value.length ? { background: '#0F172A', color: '#fff', borderColor: '#0F172A' } : { color: '#94A3B8', borderColor: '#F1F5F9' }}>
          Custom
        </span>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {AREAS.map(({ key, label, desc, Icon, color }) => {
          const on = value.includes(key);
          return (
            <button key={key} type="button" onClick={() => toggle(key)}
              className="flex items-start gap-3 p-3 rounded-xl border text-left transition-all"
              style={{ borderColor: on ? color : '#E2E8F0', background: on ? `${color}0D` : '#fff' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}1A`, color }}>
                <Icon size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold" style={{ color: '#0F172A' }}>{label}</div>
                <div className="text-[11px] leading-snug" style={{ color: '#64748B' }}>{desc}</div>
              </div>
              <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: on ? color : '#F1F5F9' }}>
                {on && <Check size={12} className="text-white" strokeWidth={3} />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AccessChips({ permissions }) {
  return (
    <div className="flex flex-wrap gap-1">
      {permissions.map(k => AREA[k] && (
        <span key={k} className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: `${AREA[k].color}14`, color: AREA[k].color }}>
          {AREA[k].label}
        </span>
      ))}
    </div>
  );
}

export default function Team() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', permissions: PRESETS[1].permissions });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null); // { member, permissions }
  const [busy, setBusy] = useState(null);

  const load = () => teamAPI.list()
    .then(({ data }) => setMembers(data.data || []))
    .catch(() => toast.error('Could not load your team'))
    .finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!form.permissions.length) return toast.error('Pick at least one area');
    setSaving(true);
    try {
      const { data } = await teamAPI.invite(form);
      data.emailed ? toast.success(data.message) : toast(data.message);
      setShowInvite(false);
      setForm({ name: '', email: '', phone: '', permissions: PRESETS[1].permissions });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send the invite');
    } finally { setSaving(false); }
  };

  const act = async (id, fn, success) => {
    setBusy(id);
    try { const { data } = await fn(); toast.success(success || data.message); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Something went wrong'); }
    finally { setBusy(null); }
  };

  const saveEdit = async () => {
    if (!editing.permissions.length) return toast.error('Pick at least one area');
    await act(editing.member._id, () => teamAPI.update(editing.member._id, { permissions: editing.permissions }), 'Access updated');
    setEditing(null);
  };

  const remove = (m) => {
    if (!window.confirm(`Remove ${m.name} from the team? They'll lose access straight away.`)) return;
    act(m._id, () => teamAPI.remove(m._id));
  };

  const invited = members.filter(m => !m.isOwner).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ letterSpacing: '-0.03em' }}>Team</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-sub)' }}>
            {invited ? `${invited} team member${invited !== 1 ? 's' : ''} invited` : 'Invite co-managers and choose what each one can access'}
          </p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary gap-2">
          <MailPlus size={14} /> Invite team member
        </button>
      </div>

      <div className="rounded-xl px-4 py-3 flex items-start gap-3"
        style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}>
        <UsersRound size={16} style={{ color: '#10B981', flexShrink: 0, marginTop: 1 }} />
        <div className="text-xs leading-relaxed" style={{ color: '#047857' }}>
          <span className="font-semibold">How it works: </span>
          Each team member gets their own login to this dashboard and only sees the areas you tick — for example,
          your accountant gets <strong>Finance</strong>, your security lead gets <strong>Security</strong>. You can change or remove access anytime.
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : (
        <div className="glass-card divide-y" style={{ borderColor: '#F1F5F9' }}>
          {members.map(m => {
            const isMe = String(m._id) === String(user?._id);
            return (
              <div key={m._id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3" style={{ opacity: m.isActive ? 1 : 0.6 }}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold flex-shrink-0 overflow-hidden"
                    style={{ background: m.isOwner ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)', color: m.isOwner ? '#D97706' : '#059669' }}>
                    {m.profilePhoto ? <img src={m.profilePhoto} alt="" className="w-full h-full object-cover" /> : m.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                      {m.name}{isMe && <span className="text-xs font-normal" style={{ color: '#94A3B8' }}>(you)</span>}
                      {m.isOwner && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: '#FEF3C7', color: '#B45309' }}>
                          <Crown size={10} /> Owner
                        </span>
                      )}
                      {!m.isActive && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEE2E2', color: '#DC2626' }}>Paused</span>}
                      {m.pendingFirstLogin && m.isActive && !m.isOwner && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#EEF2FF', color: '#4F46E5' }}>Invite pending</span>
                      )}
                      {m.needsPasswordChange && m.isActive && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#B45309' }}>Signed in · password not set yet</span>
                      )}
                    </div>
                    <div className="text-xs truncate" style={{ color: '#64748B' }}>{m.email}</div>
                    <div className="mt-2">
                      {m.isOwner
                        ? <span className="text-[11px] font-semibold" style={{ color: '#94A3B8' }}>Full access to everything</span>
                        : <AccessChips permissions={m.permissions} />}
                    </div>
                  </div>
                </div>
                {!m.isOwner && !isMe && (
                  <div className="flex items-center gap-1.5 flex-wrap sm:justify-end">
                    <button disabled={busy === m._id} onClick={() => setEditing({ member: m, permissions: m.permissions })}
                      className="btn-outline gap-1.5 text-xs px-3 py-1.5"><Pencil size={12} /> Access</button>
                    {m.pendingFirstLogin && (
                      <button disabled={busy === m._id} onClick={() => act(m._id, () => teamAPI.resendInvite(m._id))}
                        className="btn-outline gap-1.5 text-xs px-3 py-1.5"><RotateCw size={12} /> Resend</button>
                    )}
                    <button disabled={busy === m._id} onClick={() => act(m._id, () => teamAPI.update(m._id, { isActive: !m.isActive }), m.isActive ? 'Access paused' : 'Access restored')}
                      className="btn-outline gap-1.5 text-xs px-3 py-1.5">
                      {m.isActive ? <><PauseCircle size={12} /> Pause</> : <><PlayCircle size={12} /> Restore</>}
                    </button>
                    <button disabled={busy === m._id} onClick={() => remove(m)} title="Remove"
                      className="p-2 rounded-lg hover:bg-red-50" style={{ color: '#EF4444' }}><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite team member" size="lg">
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sub)' }}>Full name *</label>
              <input className="input-field" placeholder="e.g. Ngozi Okafor" required
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sub)' }}>Email *</label>
              <input type="email" className="input-field" placeholder="name@email.com" required
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sub)' }}>Phone (optional)</label>
            <input className="input-field" placeholder="+234 …"
              value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-sub)' }}>What can they access?</label>
            <AccessPicker value={form.permissions} onChange={permissions => setForm({ ...form, permissions })} />
          </div>
          <p className="text-xs" style={{ color: '#94A3B8' }}>
            They'll get an email with a temporary password and must set their own the first time they sign in.
          </p>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowInvite(false)} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Sending…' : 'Send invite'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing ? `${editing.member.name}'s access` : ''} size="lg">
        {editing && (
          <div className="space-y-4">
            <AccessPicker value={editing.permissions} onChange={permissions => setEditing({ ...editing, permissions })} />
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setEditing(null)} className="btn-outline flex-1">Cancel</button>
              <button type="button" disabled={busy === editing.member._id} onClick={saveEdit} className="btn-primary flex-1">Save access</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
