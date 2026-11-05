// Unit / class / room picker for the add-member forms, with an inline
// "+ New class" so a manager doesn't have to leave the form to create one.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, X } from 'lucide-react';
import { unitAPI } from '../../api';
import { useSite } from '../../context/SiteContext';
import { unitOptionLabel, isFull } from './InviteResidentModal';

export default function UnitPicker({ value, onChange, units = [], onCreated, label, allowNone = false, currentId }) {
  const site = useSite();
  const T = site.terms;
  const word = label || (site.isEstate ? 'Apartment' : T.unit);
  const blockWord = site.isEstate ? 'Block' : (T.block || 'Block');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ unitNumber: '', block: '' });
  const [saving, setSaving] = useState(false);

  const create = async () => {
    const unitNumber = draft.unitNumber.trim();
    if (!unitNumber) { toast.error(`Name the ${word.toLowerCase()}`); return; }
    setSaving(true);
    try {
      const { data } = await unitAPI.create({ unitNumber, block: draft.block.trim() });
      // New units take the same capacity as the rest of the site
      const unit = { ...data.data, residentIds: [], maxOccupants: units[0]?.maxOccupants ?? data.data.maxOccupants };
      onCreated?.(unit);
      onChange(unit._id);
      toast.success(`${word} ${unitNumber} created`);
      setDraft({ unitNumber: '', block: '' });
      setAdding(false);
    } catch (err) {
      toast.error(err.response?.status === 409 ? `A ${word.toLowerCase()} called ${unitNumber} already exists` : (err.response?.data?.message || `Couldn't create the ${word.toLowerCase()}`));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold" style={{ color: 'var(--text-sub)' }}>{word}{allowNone ? '' : ' *'}</label>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-emerald-600 hover:text-emerald-700">
            <Plus size={12} /> New {word.toLowerCase()}
          </button>
        )}
      </div>

      {adding ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-emerald-800">New {word.toLowerCase()}</p>
            <button type="button" onClick={() => setAdding(false)} className="text-emerald-700/70 hover:text-emerald-900" aria-label="Cancel"><X size={14} /></button>
          </div>
          <div className="grid grid-cols-[1fr_0.8fr] gap-2">
            <input className="input-field text-sm" autoFocus placeholder={site.type === 'school' ? 'e.g. JSS2 Gold' : site.type === 'university' ? 'e.g. A101' : `${word} name / number`}
              value={draft.unitNumber} onChange={e => setDraft({ ...draft, unitNumber: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); create(); } }} />
            <input className="input-field text-sm" placeholder={`${blockWord} (optional)`}
              value={draft.block} onChange={e => setDraft({ ...draft, block: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); create(); } }} />
          </div>
          <button type="button" onClick={create} disabled={saving} className="btn-primary w-full text-sm">
            {saving ? 'Creating…' : `Create & select`}
          </button>
        </div>
      ) : (
        <>
          <select className="input-field" value={value} required={!allowNone} onChange={e => onChange(e.target.value)}>
            <option value="">{allowNone ? `— No ${word.toLowerCase()} —` : `— Choose their ${word.toLowerCase()} —`}</option>
            {units.map(u => (
              <option key={u._id} value={u._id} disabled={isFull(u) && u._id !== value && u._id !== currentId}>
                {unitOptionLabel(u, site)}
              </option>
            ))}
          </select>
          {units.length === 0 && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
              No {(site.isEstate ? 'apartments' : T.units.toLowerCase())} yet — tap “New {word.toLowerCase()}” to create one.
            </p>
          )}
        </>
      )}
    </div>
  );
}
