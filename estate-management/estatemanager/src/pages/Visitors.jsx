import { useEffect, useState } from 'react';
import { visitorAPI } from '../api';
import Badge, { visitorStatusBadge } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import {
  UserCheck, Search, LogIn, LogOut, Ban, Plus,
  Ticket, CheckCircle2, Phone, Mail, Calendar, Clock, X,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUSES  = ['', 'active', 'checked-in', 'checked-out', 'expired', 'blacklisted'];
const PURPOSES  = ['Visit', 'Delivery', 'Maintenance', 'Meeting', 'Moving', 'Other'];
const EMPTY_FORM = {
  visitorName: '', visitorPhone: '', visitorEmail: '',
  purpose: 'Visit', expectedDate: '', expectedTime: '10:00',
  expectedDuration: '60', notes: '',
};

export default function ManagerVisitors() {
  const [visitors,     setVisitors]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Guest pass create
  const [showCreate,   setShowCreate]   = useState(false);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [passResult,   setPassResult]   = useState(null);
  const [activePicker, setActivePicker] = useState(null); // null | 'date' | 'time'

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await visitorAPI.getAll({ status: statusFilter || undefined });
      setVisitors(data.data);
    } catch {
      toast.error('Failed to load visitors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  // ── Create pass ───────────────────────────────────────────────────
  const createPass = async (e) => {
    e.preventDefault();
    if (!form.visitorName.trim()) { toast.error('Visitor name is required'); return; }
    if (!form.expectedDate)       { toast.error('Expected date is required'); return; }

    const expectedDate = new Date(`${form.expectedDate}T${form.expectedTime || '10:00'}`);
    setSaving(true);
    try {
      const { data } = await visitorAPI.preRegister({
        visitorName:      form.visitorName.trim(),
        visitorPhone:     form.visitorPhone.trim() || undefined,
        visitorEmail:     form.visitorEmail.trim() || undefined,
        purpose:          form.purpose,
        expectedDate:     expectedDate.toISOString(),
        expectedDuration: parseInt(form.expectedDuration, 10) || 60,
        notes:            form.notes.trim() || undefined,
      });
      toast.success('Guest pass created!');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setPassResult(data.data);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create pass');
    } finally { setSaving(false); }
  };

  // ── Actions ───────────────────────────────────────────────────────
  const handleCheckIn = async (id) => {
    try { await visitorAPI.checkIn(id);   toast.success('Visitor checked in');    load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };
  const handleCheckOut = async (id) => {
    try { await visitorAPI.checkOut(id);  toast.success('Visitor checked out');   load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };
  const handleBlacklist = async (id) => {
    if (!confirm('Blacklist this visitor? They will be denied re-entry.')) return;
    try { await visitorAPI.blacklist(id); toast.success('Visitor blacklisted');   load(); }
    catch { toast.error('Failed'); }
  };

  const filtered = visitors.filter((v) =>
    v.visitorName.toLowerCase().includes(search.toLowerCase()) ||
    v.purpose.toLowerCase().includes(search.toLowerCase()) ||
    v.visitorCode?.includes(search.toUpperCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Visitor Log</h1>
          <p className="text-white/40 text-sm">All visitor records for your estate</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary gap-2">
          <Plus size={15} /> Create Guest Pass
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input className="input-field pl-9" placeholder="Search name, purpose, code…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-field sm:w-44" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ') : 'All statuses'}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <UserCheck size={40} className="text-white/15" />
            <p className="text-white/40 font-medium">No visitors found</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary gap-2 mt-1">
              <Plus size={14} /> Create Guest Pass
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['Visitor', 'Host', 'Purpose', 'Expected', 'Code', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-white/40 uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((v) => (
                  <tr key={v._id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white text-sm">{v.visitorName}</div>
                      <div className="text-white/40 text-xs">{v.visitorPhone || v.visitorEmail || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-white/70">{v.hostResidentId?.name || 'Manager'}</td>
                    <td className="px-4 py-3 text-sm text-white/70 max-w-[140px] truncate">{v.purpose}</td>
                    <td className="px-4 py-3 text-sm text-white/70 whitespace-nowrap">
                      {format(new Date(v.expectedDate), 'MMM d, HH:mm')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-emerald-400 tracking-widest">{v.visitorCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={visitorStatusBadge(v.status)}>{v.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {v.status === 'active' && (
                          <button onClick={() => handleCheckIn(v._id)} title="Check in"
                            className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-white/40 hover:text-emerald-400 transition-all">
                            <LogIn size={15} />
                          </button>
                        )}
                        {v.status === 'checked-in' && (
                          <button onClick={() => handleCheckOut(v._id)} title="Check out"
                            className="p-1.5 rounded-lg hover:bg-blue-500/20 text-white/40 hover:text-blue-400 transition-all">
                            <LogOut size={15} />
                          </button>
                        )}
                        {!['blacklisted', 'checked-out', 'expired'].includes(v.status) && (
                          <button onClick={() => handleBlacklist(v._id)} title="Blacklist"
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all">
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

      {/* ── Create Guest Pass Modal ── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="">
        <div className="flex items-center gap-3 mb-5 -mt-1">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <Ticket size={16} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-base leading-tight">Create Guest Pass</h2>
            <p className="text-white/40 text-xs">Generate an access code for your guest</p>
          </div>
        </div>

        <form onSubmit={createPass} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Guest Name *</label>
            <input className="input-field" placeholder="Full name"
              value={form.visitorName} onChange={(e) => set('visitorName', e.target.value)} required />
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-white/60 mb-1.5 flex items-center gap-1.5 block">
                <Phone size={12} /> Phone
              </label>
              <input className="input-field" placeholder="+234…" type="tel"
                value={form.visitorPhone} onChange={(e) => set('visitorPhone', e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-white/60 mb-1.5 flex items-center gap-1.5 block">
                <Mail size={12} /> Email
              </label>
              <input className="input-field" placeholder="guest@email.com" type="email"
                value={form.visitorEmail} onChange={(e) => set('visitorEmail', e.target.value)} />
            </div>
          </div>

          {/* Purpose chips */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Purpose</label>
            <div className="flex flex-wrap gap-2">
              {PURPOSES.map((p) => (
                <button key={p} type="button"
                  onClick={() => set('purpose', p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    form.purpose === p
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
                  }`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Date + Time — pill pickers */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Expected Date &amp; Time *</label>
            <div className="flex gap-2 mb-2">
              {/* Date pill */}
              <button type="button"
                onClick={() => setActivePicker(p => p === 'date' ? null : 'date')}
                className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  activePicker === 'date'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : form.expectedDate
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/15'
                      : 'border-white/10 text-white/35 hover:border-white/20 hover:text-white/55'
                }`}>
                <Calendar size={14} className="shrink-0" />
                {form.expectedDate
                  ? format(new Date(form.expectedDate + 'T00:00'), 'EEE, MMM d yyyy')
                  : 'Select date'}
              </button>
              {/* Time pill */}
              <button type="button"
                onClick={() => setActivePicker(p => p === 'time' ? null : 'time')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all whitespace-nowrap ${
                  activePicker === 'time'
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400 hover:bg-indigo-500/15'
                }`}>
                <Clock size={14} className="shrink-0" />
                {form.expectedTime || '10:00'}
              </button>
            </div>

            {/* Date picker popover */}
            {activePicker === 'date' && (
              <div className="rounded-xl border border-emerald-500/20 bg-white/4 backdrop-blur-sm p-4 mb-1 animate-fade-in">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                    <Calendar size={13} className="text-emerald-400" />
                  </div>
                  <span className="text-sm font-semibold text-white">Select Date</span>
                  <button type="button" onClick={() => setActivePicker(null)} className="ml-auto text-white/30 hover:text-white/60 transition-colors">
                    <X size={14} />
                  </button>
                </div>
                <input type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={form.expectedDate}
                  onChange={(e) => { set('expectedDate', e.target.value); setActivePicker(null); }}
                  className="input-field w-full cursor-pointer"
                  autoFocus
                />
              </div>
            )}

            {/* Time picker popover */}
            {activePicker === 'time' && (
              <div className="rounded-xl border border-indigo-500/20 bg-white/4 backdrop-blur-sm p-4 mb-1 animate-fade-in">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                    <Clock size={13} className="text-indigo-400" />
                  </div>
                  <span className="text-sm font-semibold text-white">Select Time</span>
                  <button type="button" onClick={() => setActivePicker(null)} className="ml-auto text-white/30 hover:text-white/60 transition-colors">
                    <X size={14} />
                  </button>
                </div>
                <input type="time"
                  value={form.expectedTime}
                  onChange={(e) => { set('expectedTime', e.target.value); setActivePicker(null); }}
                  className="input-field w-full cursor-pointer"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Duration (minutes)</label>
            <input className="input-field" type="number" min="15" placeholder="60"
              value={form.expectedDuration} onChange={(e) => set('expectedDuration', e.target.value)} />
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Notes (optional)</label>
            <textarea className="input-field resize-none" rows={2}
              placeholder="Any additional info…"
              value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          {/* Info note */}
          <div className="p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/15 text-emerald-300 text-xs flex items-start gap-2">
            <Ticket size={12} className="mt-0.5 shrink-0" />
            An access code and QR code will be generated. If contact info is provided, the pass will be sent to your guest.
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 gap-2">
              {saving ? 'Generating…' : <><Ticket size={14} /> Generate Pass</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Pass Created Modal ── */}
      <Modal open={!!passResult} onClose={() => setPassResult(null)} title="">
        {passResult && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={18} className="text-emerald-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-base leading-tight">Pass Created!</h2>
                <p className="text-white/40 text-xs">{passResult.visitorName} · {passResult.purpose}</p>
              </div>
              <button onClick={() => setPassResult(null)} className="ml-auto text-white/30 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Access code */}
            <div className="p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-center">
              <p className="text-emerald-400/70 text-xs font-semibold uppercase tracking-widest mb-1">Access Code</p>
              <p className="text-4xl font-bold text-emerald-400 tracking-[0.25em] font-mono">{passResult.visitorCode}</p>
            </div>

            {/* QR code */}
            {passResult.qrCodeUrl && (
              <div className="flex flex-col items-center gap-2">
                <img src={passResult.qrCodeUrl} alt="QR Code"
                  className="w-40 h-40 rounded-xl border border-white/10 bg-white p-1" />
                <p className="text-white/35 text-xs">Guest can show this QR at the gate</p>
              </div>
            )}

            {/* Details row */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="glass-card p-3">
                <p className="text-white/40 text-xs mb-1">Expected</p>
                <p className="text-white font-medium">{format(new Date(passResult.expectedDate), 'MMM d, yyyy HH:mm')}</p>
              </div>
              <div className="glass-card p-3">
                <p className="text-white/40 text-xs mb-1">Duration</p>
                <p className="text-white font-medium">{passResult.expectedDuration || 60} min</p>
              </div>
            </div>

            {/* Sent note */}
            {(passResult.visitorEmail || passResult.visitorPhone) && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/15 text-emerald-300 text-xs">
                <CheckCircle2 size={12} />
                Pass sent to {passResult.visitorEmail || passResult.visitorPhone}
              </div>
            )}

            <button onClick={() => setPassResult(null)} className="btn-primary w-full">Done</button>
          </div>
        )}
      </Modal>

    </div>
  );
}
