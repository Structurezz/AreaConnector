// Single invite form (Residents page, and "Check in guest" on the Room board).
// Words follow the site type; hotel / school / staff fields appear when the
// site's modules use them.
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import { residentAPI } from '../../api';
import { useSite } from '../../context/SiteContext';
import UnitPicker from './UnitPicker';
import { MemberSectorFields, emptySector, sectorPayload, sectorError, useSectorConfig, defaultStay } from '../site/MemberFields';
import { blockName, withAn, lower } from '../../utils/siteTypes';

export function unitOptionLabel(u, site) {
  const base = site.isEstate
    ? (u.block ? `Block ${u.block} · Apt ${u.unitNumber}` : `Apt ${u.unitNumber}`)
    : (u.block ? `${blockName(u.block, site.terms)} · ${site.terms.unit} ${u.unitNumber}` : `${site.terms.unit} ${u.unitNumber}`);
  const count = (u.residentIds || []).length;
  const max   = u.maxOccupants || 7;
  // Classes, departments and wards have no per-unit limit (server returns 10000)
  if (max >= UNLIMITED) return `${base} — ${count} ${count === 1 ? site.terms.member.toLowerCase() : site.terms.members.toLowerCase()}`;
  const full  = count >= max;
  return `${base} — ${count}/${max}${full ? ' (full)' : ''}`;
}

const UNLIMITED = 10000;
export const isFull = (u) => (u.residentIds || []).length >= (u.maxOccupants || 7);

// initial: { unitId?, stay?: { checkIn, checkOut } (datetime-local strings) }
export default function InviteResidentModal({ open, onClose, units = [], onSaved, initial, onUnitCreated }) {
  const site = useSite();
  const T = site.terms;
  const cfg = useSectorConfig();
  const blank = () => ({ email: '', name: '', phone: '', unitId: '' });
  const [form, setForm] = useState(blank);
  const [sector, setSector] = useState(emptySector);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(f => ({ ...f, unitId: initial?.unitId ?? f.unitId }));
    if (initial?.stay) setSector(s => ({ ...s, stay: { ...initial.stay } }));
    // Hotels: start from today 14:00 → tomorrow 12:00
    else if (cfg.stays) setSector(s => (s.stay.checkIn ? s : { ...s, stay: defaultStay() }));
  }, [open, initial, cfg.stays]);

  // Non-estate sites: the member role's own unit label ('Room', 'Ward & bed'…)
  const unitWord = site.isEstate ? 'Apartment' : (site.hasRoles && site.roleOf(site.defaultRole).form?.unit) || T.unit;

  const submit = async (e) => {
    e.preventDefault();
    const err = sectorError(sector, cfg, { requireStay: cfg.stays });
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      const { data } = await residentAPI.invite({ ...form, ...sectorPayload(sector, cfg) });
      toast.success(data.message || 'Invitation sent!');
      setForm(blank());
      setSector(emptySector());
      onClose();
      onSaved?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={cfg.stays ? `Check in ${withAn(lower(T.member))}` : 'Send Invitation'}>
      <div className="space-y-3 mb-4 p-3 rounded-xl text-sm"
        style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', color: '#34D399' }}>
        <p className="font-medium">📧 What happens when you invite:</p>
        <ul className="space-y-1 text-xs" style={{ color: 'rgba(52,211,153,0.8)' }}>
          <li>• An account is created instantly for the {T.member.toLowerCase()}</li>
          <li>• A login credentials email is sent via Resend</li>
          <li>• {cfg.stays ? 'They can log in from check-in with their temp password' : 'They can log in immediately with their temp password'}</li>
        </ul>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sub)' }}>Full Name *</label>
          <input className="input-field" placeholder="e.g. Amaka Johnson"
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sub)' }}>Email Address *</label>
          <input type="email" className="input-field" placeholder={site.isEstate ? 'resident@email.com' : 'name@email.com'}
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div>
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-sub)' }}>Phone (optional)</label>
          <input className="input-field" placeholder="+234 …"
            value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        </div>
        <UnitPicker label={unitWord} value={form.unitId} units={units}
          onChange={(unitId) => setForm(f => ({ ...f, unitId }))} onCreated={onUnitCreated} />
        <MemberSectorFields value={sector} onChange={setSector} requireStay={cfg.stays} />
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Sending…' : cfg.stays ? '🛎️ Check in & invite' : '📨 Send Invitation'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
