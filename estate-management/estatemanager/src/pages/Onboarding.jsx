import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { unitAPI, residentAPI } from '../api';
import { Home, Users, CheckCircle, Plus, Trash2, ArrowRight, ArrowLeft, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

const STEPS = ['welcome', 'units', 'residents', 'done'];

function WelcomeStep({ estate, onNext }) {
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
        <Building2 size={36} className="text-emerald-600" />
      </div>
      <div>
        <h2 className="text-3xl font-display font-bold text-slate-900 mb-2">Welcome!</h2>
        <p className="text-slate-500">
          You're managing <span className="text-emerald-600 font-semibold">{estate?.name || 'your estate'}</span>.
          Let's get it set up in just a few steps.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 text-left max-w-xs mx-auto">
        {[
          { icon: Home, label: 'Add estate units' },
          { icon: Users, label: 'Register residents' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="glass-card p-4 flex flex-col items-center gap-2 text-center">
            <Icon size={20} className="text-emerald-600" />
            <span className="text-slate-600 text-sm">{label}</span>
          </div>
        ))}
      </div>
      <button onClick={onNext} className="btn-primary gap-2 mx-auto">
        Get Started <ArrowRight size={16} />
      </button>
    </div>
  );
}

function UnitsStep({ onNext, onBack, onSkip }) {
  const [units, setUnits] = useState([{ unitNumber: '', block: '', type: 'apartment' }]);
  const [saving, setSaving] = useState(false);

  const addRow = () => setUnits([...units, { unitNumber: '', block: '', type: 'apartment' }]);
  const removeRow = (i) => setUnits(units.filter((_, idx) => idx !== i));
  const update = (i, field, val) => setUnits(units.map((u, idx) => idx === i ? { ...u, [field]: val } : u));

  const handleSave = async () => {
    const valid = units.filter((u) => u.unitNumber.trim());
    if (!valid.length) { onSkip(); return; }
    setSaving(true);
    try {
      await Promise.all(valid.map((u) => unitAPI.create(u)));
      toast.success(`${valid.length} unit${valid.length > 1 ? 's' : ''} created`);
      onNext(valid.length);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create units');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900 mb-1">Add Units</h2>
        <p className="text-slate-500 text-sm">Add apartments or houses in your estate. You can add more later.</p>
      </div>

      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {units.map((u, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <input
              className="input-field col-span-4"
              placeholder="Unit No. *"
              value={u.unitNumber}
              onChange={(e) => update(i, 'unitNumber', e.target.value)}
            />
            <input
              className="input-field col-span-3"
              placeholder="Block"
              value={u.block}
              onChange={(e) => update(i, 'block', e.target.value)}
            />
            <select
              className="input-field col-span-4"
              value={u.type}
              onChange={(e) => update(i, 'type', e.target.value)}
            >
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="shop">Shop</option>
              <option value="office">Office</option>
            </select>
            <button
              type="button"
              onClick={() => removeRow(i)}
              disabled={units.length === 1}
              className="col-span-1 p-2 text-slate-300 hover:text-red-500 disabled:opacity-30 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={addRow} className="btn-outline gap-2 text-sm py-2">
        <Plus size={14} /> Add Row
      </button>

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="btn-outline gap-2"><ArrowLeft size={14} /> Back</button>
        <button onClick={onSkip} className="btn-outline flex-1">Skip</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 gap-2">
          {saving ? 'Saving...' : <><span>Save & Next</span><ArrowRight size={14} /></>}
        </button>
      </div>
    </div>
  );
}

function ResidentsStep({ onNext, onBack, onSkip }) {
  const [residents, setResidents] = useState([{ name: '', email: '', phone: '' }]);
  const [saving, setSaving] = useState(false);

  const addRow = () => setResidents([...residents, { name: '', email: '', phone: '' }]);
  const removeRow = (i) => setResidents(residents.filter((_, idx) => idx !== i));
  const update = (i, field, val) =>
    setResidents(residents.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  const handleSave = async () => {
    const valid = residents.filter((r) => r.name.trim() && r.email.trim());
    if (!valid.length) { onSkip(); return; }
    setSaving(true);
    try {
      await Promise.all(valid.map((r) => residentAPI.add(r)));
      toast.success(`${valid.length} resident${valid.length > 1 ? 's' : ''} added`);
      onNext(valid.length);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add residents');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-slate-900 mb-1">Add Residents</h2>
        <p className="text-slate-500 text-sm">Register your first residents. Name and email are required.</p>
      </div>

      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {residents.map((r, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <input
              className="input-field col-span-4"
              placeholder="Name *"
              value={r.name}
              onChange={(e) => update(i, 'name', e.target.value)}
            />
            <input
              type="email"
              className="input-field col-span-4"
              placeholder="Email *"
              value={r.email}
              onChange={(e) => update(i, 'email', e.target.value)}
            />
            <input
              className="input-field col-span-3"
              placeholder="Phone"
              value={r.phone}
              onChange={(e) => update(i, 'phone', e.target.value)}
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
              disabled={residents.length === 1}
              className="col-span-1 p-2 text-slate-300 hover:text-red-500 disabled:opacity-30 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={addRow} className="btn-outline gap-2 text-sm py-2">
        <Plus size={14} /> Add Row
      </button>

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="btn-outline gap-2"><ArrowLeft size={14} /> Back</button>
        <button onClick={onSkip} className="btn-outline flex-1">Skip</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 gap-2">
          {saving ? 'Saving...' : <><span>Save & Next</span><ArrowRight size={14} /></>}
        </button>
      </div>
    </div>
  );
}

function DoneStep({ counts, onFinish }) {
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
        <CheckCircle size={36} className="text-emerald-600" />
      </div>
      <div>
        <h2 className="text-3xl font-display font-bold text-slate-900 mb-2">You're all set!</h2>
        <p className="text-slate-500">Your estate is ready to go.</p>
      </div>
      {(counts.units > 0 || counts.residents > 0) && (
        <div className="flex justify-center gap-6">
          {counts.units > 0 && (
            <div className="glass-card px-6 py-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">{counts.units}</div>
              <div className="text-slate-500 text-sm">Units added</div>
            </div>
          )}
          {counts.residents > 0 && (
            <div className="glass-card px-6 py-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">{counts.residents}</div>
              <div className="text-slate-500 text-sm">Residents added</div>
            </div>
          )}
        </div>
      )}
      <button onClick={onFinish} className="btn-primary gap-2 mx-auto">
        Go to Dashboard <ArrowRight size={16} />
      </button>
    </div>
  );
}

export default function Onboarding() {
  const { user, estate } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [counts, setCounts] = useState({ units: 0, residents: 0 });

  const markDone = () => {
    if (user?._id) localStorage.setItem(`onboarding_done_${user._id}`, '1');
    navigate('/dashboard', { replace: true });
  };

  const stepLabels = ['Welcome', 'Units', 'Residents', 'Done'];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                i === step ? 'text-emerald-600' : i < step ? 'text-emerald-600' : 'text-slate-300'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                  i === step ? 'border-emerald-500 bg-emerald-50 text-emerald-600' :
                  i < step ? 'border-emerald-500 bg-emerald-50 text-emerald-600' :
                  'border-slate-200 text-slate-400'
                }`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className="hidden sm:block">{label}</span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className={`w-8 h-px transition-colors ${i < step ? 'bg-emerald-300' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="glass-card p-8">
          {step === 0 && (
            <WelcomeStep estate={estate} onNext={() => setStep(1)} />
          )}
          {step === 1 && (
            <UnitsStep
              onNext={(n) => { setCounts((c) => ({ ...c, units: n })); setStep(2); }}
              onBack={() => setStep(0)}
              onSkip={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <ResidentsStep
              onNext={(n) => { setCounts((c) => ({ ...c, residents: n })); setStep(3); }}
              onBack={() => setStep(1)}
              onSkip={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <DoneStep counts={counts} onFinish={markDone} />
          )}
        </div>

        <p className="text-center text-slate-400 text-xs mt-4">
          You can always add more units and residents from the dashboard later.
        </p>
      </div>
    </div>
  );
}
