import { useEffect, useState, useCallback } from 'react';
import {
  Music, Calendar, BarChart2, Plus, Trash2, X,
  RefreshCw, Check, Lock, Users, Shuffle, ChevronDown, Clock,
} from 'lucide-react';
import { eventAPI, pollAPI, loungeAPI } from '../api';
import toast from 'react-hot-toast';

const DJ_PAGE_SIZE = 10;

// ── Events Tab ─────────────────────────────────────────────────────

function EventsTab() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', date: '', time: '', location: '', organizer: '', isFridayFunTimes: false });
  const [activePicker, setActivePicker] = useState(null); // null | 'date' | 'time'

  const load = useCallback(() => {
    setLoading(true);
    eventAPI.getAll()
      .then(({ data }) => setEvents(data.data))
      .catch(() => toast.error('Failed to load events'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await eventAPI.create(form);
      setEvents(prev => [data.data, ...prev]);
      setShowForm(false);
      setActivePicker(null);
      setForm({ title: '', description: '', date: '', time: '', location: '', organizer: '', isFridayFunTimes: false });
      toast.success('Event created');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await eventAPI.delete(id);
      setEvents(prev => prev.filter(e => e._id !== id));
      toast.success('Event removed');
    } catch {
      toast.error('Failed to delete event');
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '12px',
    background: '#F8FAFC',
    border: '1px solid #E2E8F0',
    fontSize: '14px',
    color: '#0F172A',
    outline: 'none',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p style={{ color: '#94A3B8' }} className="text-sm">{events.length} events</p>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity">
          <Plus size={14} /> New Event
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><RefreshCw size={18} className="text-emerald-600 animate-spin" /></div>
      ) : events.length === 0 ? (
        <div className="glass-card p-10 text-center text-sm" style={{ color: '#94A3B8' }}>No events yet. Create the first one!</div>
      ) : (
        <div className="space-y-3">
          {events.map(ev => (
            <div key={ev._id} className="glass-card p-4 flex items-start justify-between gap-3"
              style={ev.isFridayFunTimes ? { borderColor: 'rgba(245,158,11,0.3)' } : {}}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {ev.isFridayFunTimes && <span className="text-xs">🎉</span>}
                  <span className="font-medium" style={{ color: '#0F172A' }}>{ev.title}</span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                  {new Date(ev.date).toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {ev.time && ` · ${ev.time}`}
                  {ev.location && ` · ${ev.location}`}
                </div>
                <div className="text-xs mt-1 flex items-center gap-1" style={{ color: '#94A3B8' }}>
                  <Users size={10} /> {ev.rsvps?.length || 0} going
                </div>
              </div>
              <button onClick={() => handleDelete(ev._id)}
                className="p-1.5 rounded-lg transition-all flex-shrink-0 hover:bg-red-50"
                style={{ color: '#CBD5E1' }}
                onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>New Event</h2>
              <button onClick={() => { setShowForm(false); setActivePicker(null); }}
                style={{ color: '#94A3B8' }} className="hover:text-gray-600 transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs block mb-1" style={{ color: '#94A3B8' }}>Title *</label>
                <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  style={inputStyle} />
              </div>
              <div>
                <label className="text-xs block mb-1.5" style={{ color: '#94A3B8' }}>Date & Time *</label>
                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => setActivePicker(p => p === 'date' ? null : 'date')}
                    className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all"
                    style={activePicker === 'date'
                      ? { background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.4)', color: '#D97706' }
                      : form.date
                        ? { background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.25)', color: '#D97706' }
                        : { background: '#F8FAFC', borderColor: '#E2E8F0', color: '#94A3B8' }}>
                    <Calendar size={14} className="shrink-0" />
                    {form.date
                      ? new Date(form.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Select date'}
                  </button>
                  <button type="button"
                    onClick={() => setActivePicker(p => p === 'time' ? null : 'time')}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all"
                    style={activePicker === 'time'
                      ? { background: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.4)', color: '#6366F1' }
                      : form.time
                        ? { background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.25)', color: '#6366F1' }
                        : { background: '#F8FAFC', borderColor: '#E2E8F0', color: '#94A3B8' }}>
                    <Clock size={14} className="shrink-0" />
                    {form.time || 'Time'}
                  </button>
                </div>

                {activePicker === 'date' && (
                  <div className="mt-2 rounded-xl p-4 animate-fade-in"
                    style={{ border: '1px solid rgba(245,158,11,0.2)', background: '#FFFBEB' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(245,158,11,0.12)' }}>
                        <Calendar size={13} style={{ color: '#D97706' }} />
                      </div>
                      <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>Select Date</span>
                      <button type="button" onClick={() => setActivePicker(null)}
                        className="ml-auto transition-colors" style={{ color: '#94A3B8' }}>
                        <X size={14} />
                      </button>
                    </div>
                    <input required type="date" min={new Date().toISOString().split('T')[0]}
                      value={form.date}
                      onChange={e => { setForm(p => ({ ...p, date: e.target.value })); setActivePicker(null); }}
                      style={{ ...inputStyle, background: '#FFFFFF' }}
                      autoFocus />
                  </div>
                )}

                {activePicker === 'time' && (
                  <div className="mt-2 rounded-xl p-4 animate-fade-in"
                    style={{ border: '1px solid rgba(99,102,241,0.2)', background: '#EEF2FF' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(99,102,241,0.12)' }}>
                        <Clock size={13} style={{ color: '#6366F1' }} />
                      </div>
                      <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>Select Time</span>
                      <button type="button" onClick={() => setActivePicker(null)}
                        className="ml-auto transition-colors" style={{ color: '#94A3B8' }}>
                        <X size={14} />
                      </button>
                    </div>
                    <input type="time"
                      value={form.time}
                      onChange={e => { setForm(p => ({ ...p, time: e.target.value })); setActivePicker(null); }}
                      style={{ ...inputStyle, background: '#FFFFFF' }}
                      autoFocus />
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: '#94A3B8' }}>Location</label>
                <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                  style={inputStyle} />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: '#94A3B8' }}>Organizer</label>
                <input value={form.organizer} onChange={e => setForm(p => ({ ...p, organizer: e.target.value }))}
                  style={inputStyle} />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: '#94A3B8' }}>Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  style={{ ...inputStyle, resize: 'none' }} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setForm(p => ({ ...p, isFridayFunTimes: !p.isFridayFunTimes }))}
                  className="w-5 h-5 rounded flex items-center justify-center transition-all"
                  style={{ background: form.isFridayFunTimes ? '#F59E0B' : '#E2E8F0' }}>
                  {form.isFridayFunTimes && <Check size={12} className="text-white" />}
                </div>
                <span className="text-sm" style={{ color: '#475569' }}>🎉 Mark as Friday Night FunTimes</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setActivePicker(null); }}
                  className="flex-1 py-2 rounded-xl text-sm transition-colors"
                  style={{ background: '#F1F5F9', color: '#475569' }}>Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : <><Calendar size={13} /> Create Event</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Polls Tab ──────────────────────────────────────────────────────

function PollsTab() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ question: '', options: ['', ''], endsAt: '', allowMultiple: false });

  useEffect(() => {
    pollAPI.getAll()
      .then(({ data }) => setPolls(data.data))
      .catch(() => toast.error('Failed to load polls'))
      .finally(() => setLoading(false));
  }, []);

  const setOption    = (i, v) => setForm(p => { const opts = [...p.options]; opts[i] = v; return { ...p, options: opts }; });
  const addOption    = () => setForm(p => ({ ...p, options: [...p.options, ''] }));
  const removeOption = (i) => setForm(p => ({ ...p, options: p.options.filter((_, j) => j !== i) }));

  const handleCreate = async (e) => {
    e.preventDefault();
    const opts = form.options.filter(o => o.trim());
    if (opts.length < 2) { toast.error('Need at least 2 options'); return; }
    setSaving(true);
    try {
      const { data } = await pollAPI.create({ ...form, options: opts });
      setPolls(prev => [data.data, ...prev]);
      setShowForm(false);
      setForm({ question: '', options: ['', ''], endsAt: '', allowMultiple: false });
      toast.success('Poll created');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create poll');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async (id) => {
    try {
      const { data } = await pollAPI.close(id);
      setPolls(prev => prev.map(p => p._id === id ? data.data : p));
      toast.success('Poll closed');
    } catch {
      toast.error('Failed to close poll');
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '12px',
    background: '#F8FAFC',
    border: '1px solid #E2E8F0',
    fontSize: '14px',
    color: '#0F172A',
    outline: 'none',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p style={{ color: '#94A3B8' }} className="text-sm">{polls.length} polls</p>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity">
          <Plus size={14} /> New Poll
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><RefreshCw size={18} className="text-emerald-600 animate-spin" /></div>
      ) : polls.length === 0 ? (
        <div className="glass-card p-10 text-center text-sm" style={{ color: '#94A3B8' }}>No polls yet. Create the first one!</div>
      ) : (
        <div className="space-y-3">
          {polls.map(poll => {
            const total   = poll.options.reduce((s, o) => s + o.votes.length, 0);
            const isEnded = !poll.isActive || (poll.endsAt && new Date() > new Date(poll.endsAt));
            return (
              <div key={poll._id} className="glass-card p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-medium" style={{ color: '#0F172A' }}>{poll.question}</p>
                    <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{total} votes · {poll.options.length} options</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEnded ? (
                      <span className="text-xs flex items-center gap-1 px-2 py-0.5 rounded-full"
                        style={{ color: '#94A3B8', background: '#F1F5F9' }}>
                        <Lock size={9} /> Closed
                      </span>
                    ) : (
                      <button onClick={() => handleClose(poll._id)}
                        className="text-xs px-2 py-1 rounded-lg transition-all"
                        style={{ color: '#EF4444' }}>
                        Close
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {poll.options.map((opt, i) => {
                    const pct = total ? Math.round((opt.votes.length / total) * 100) : 0;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#10B981' }} />
                        </div>
                        <span className="text-xs w-24 truncate" style={{ color: '#475569' }}>{opt.text}</span>
                        <span className="text-xs w-8 text-right" style={{ color: '#94A3B8' }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>New Poll</h2>
              <button onClick={() => setShowForm(false)} style={{ color: '#94A3B8' }} className="hover:text-gray-600 transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs block mb-1" style={{ color: '#94A3B8' }}>Question *</label>
                <textarea required rows={2} value={form.question} onChange={e => setForm(p => ({ ...p, question: e.target.value }))}
                  style={{ ...inputStyle, resize: 'none' }} />
              </div>
              <div>
                <label className="text-xs block mb-2" style={{ color: '#94A3B8' }}>Options * (min 2)</label>
                <div className="space-y-2">
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input value={opt} onChange={e => setOption(i, e.target.value)} placeholder={`Option ${i + 1}`}
                        style={inputStyle} />
                      {form.options.length > 2 && (
                        <button type="button" onClick={() => removeOption(i)}
                          className="p-1.5 transition-colors" style={{ color: '#CBD5E1' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                          onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}>
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                  {form.options.length < 6 && (
                    <button type="button" onClick={addOption}
                      className="text-xs transition-colors flex items-center gap-1 mt-1"
                      style={{ color: '#10B981' }}>
                      <Plus size={11} /> Add option
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: '#94A3B8' }}>End Date (optional)</label>
                <input type="datetime-local" value={form.endsAt} onChange={e => setForm(p => ({ ...p, endsAt: e.target.value }))}
                  style={inputStyle} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setForm(p => ({ ...p, allowMultiple: !p.allowMultiple }))}
                  className="w-5 h-5 rounded flex items-center justify-center transition-all"
                  style={{ background: form.allowMultiple ? '#10B981' : '#E2E8F0' }}>
                  {form.allowMultiple && <Check size={12} className="text-white" />}
                </div>
                <span className="text-sm" style={{ color: '#475569' }}>Allow multiple selections</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2 rounded-xl text-sm transition-colors"
                  style={{ background: '#F1F5F9', color: '#475569' }}>Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : 'Create Poll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── DJ Queue Tab ───────────────────────────────────────────────────

function DJQueueTab() {
  const [session, setSession]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [defaultsPage, setDefaultsPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    loungeAPI.getSession()
      .then(({ data }) => setSession(data.data))
      .catch(() => toast.error('Failed to load lounge session'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (id) => {
    try {
      await loungeAPI.remove(id);
      setSession(prev => prev
        ? { ...prev, suggestions: prev.suggestions.filter(s => s._id !== id) }
        : prev);
      toast.success('Track removed');
    } catch {
      toast.error('Failed to remove track');
    }
  };

  const handleToggleAutoDJ = async () => {
    try {
      const next = !session?.isAutoDJ;
      const { data } = await loungeAPI.updateMood({ isAutoDJ: next });
      setSession(data.data);
      toast.success(`AutoDJ ${next ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update AutoDJ');
    }
  };

  const handleResetDefaults = async () => {
    try {
      await loungeAPI.resetDefaults();
      load();
      toast.success('Default playlist reset');
    } catch {
      toast.error('Failed to reset defaults');
    }
  };

  const queue           = [...(session?.suggestions || [])].sort((a, b) => b.votes.length - a.votes.length);
  const communityTracks = queue.filter(t => !t.isDefault);
  const defaultTracks   = queue.filter(t => t.isDefault);
  const visibleDefaults = defaultTracks.slice(0, defaultsPage * DJ_PAGE_SIZE);
  const hasMoreDefaults = visibleDefaults.length < defaultTracks.length;

  if (loading) {
    return <div className="flex justify-center py-8"><RefreshCw size={18} className="text-emerald-600 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={handleToggleAutoDJ}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border"
            style={session?.isAutoDJ
              ? { color: '#D97706', borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.08)' }
              : { color: '#94A3B8', borderColor: '#E2E8F0', background: '#F8FAFC' }}>
            <Shuffle size={12} /> AutoDJ {session?.isAutoDJ ? 'On' : 'Off'}
          </button>
          <button onClick={load}
            className="p-1.5 transition-colors"
            style={{ color: '#94A3B8' }}
            title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
        <button onClick={handleResetDefaults}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
          style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569' }}>
          <RefreshCw size={12} /> Reset Default Playlist
        </button>
      </div>

      {/* Community Queue */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold" style={{ color: '#0F172A' }}>Community Queue</h3>
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ color: '#94A3B8', background: '#F1F5F9' }}>{communityTracks.length}</span>
        </div>
        {communityTracks.length === 0 ? (
          <div className="glass-card p-6 text-center text-sm" style={{ color: '#94A3B8' }}>No resident suggestions yet</div>
        ) : (
          <div className="space-y-2">
            {communityTracks.map((t, i) => (
              <div key={t._id} className="glass-card p-3 flex items-center gap-3">
                <span className="text-xs font-bold w-5 text-center flex-shrink-0" style={{ color: '#CBD5E1' }}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>{t.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                    {t.suggestedBy?.name ? `by ${t.suggestedBy.name}` : 'Resident'}
                    {' · '}{t.votes?.length || 0} vote{t.votes?.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <a href={`https://youtube.com/watch?v=${t.videoId}`}
                  target="_blank" rel="noopener noreferrer"
                  className="p-1.5 flex-shrink-0 transition-colors"
                  style={{ color: '#CBD5E1' }}
                  title="Open on YouTube"
                  onMouseEnter={e => e.currentTarget.style.color = '#10B981'}
                  onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}
                  onClick={e => e.stopPropagation()}>
                  <Music size={13} />
                </a>
                <button onClick={() => handleRemove(t._id)}
                  className="p-1.5 rounded-lg transition-all flex-shrink-0 hover:bg-red-50"
                  style={{ color: '#CBD5E1' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                  onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Default Playlist */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold" style={{ color: '#0F172A' }}>DJ Playlist</h3>
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ color: '#94A3B8', background: '#F1F5F9' }}>{defaultTracks.length}</span>
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ color: '#94A3B8', background: '#F1F5F9' }}>Auto-seeded</span>
        </div>
        {defaultTracks.length === 0 ? (
          <div className="glass-card p-6 text-center text-sm" style={{ color: '#94A3B8' }}>
            No default tracks. Click "Reset Default Playlist" to seed.
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {visibleDefaults.map((t, i) => (
                <div key={t._id} className="glass-card p-3 flex items-center gap-3">
                  <span className="text-xs font-bold w-5 text-center flex-shrink-0" style={{ color: '#CBD5E1' }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>{t.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                      {t.artist || 'Estate DJ Mix'}
                      {' · '}{t.votes?.length || 0} vote{t.votes?.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <a href={`https://youtube.com/watch?v=${t.videoId}`}
                    target="_blank" rel="noopener noreferrer"
                    className="p-1.5 flex-shrink-0 transition-colors"
                    style={{ color: '#CBD5E1' }}
                    title="Open on YouTube"
                    onMouseEnter={e => e.currentTarget.style.color = '#10B981'}
                    onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}
                    onClick={e => e.stopPropagation()}>
                    <Music size={13} />
                  </a>
                  <button onClick={() => handleRemove(t._id)}
                    className="p-1.5 rounded-lg transition-all flex-shrink-0 hover:bg-red-50"
                    style={{ color: '#CBD5E1' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            {hasMoreDefaults && (
              <button onClick={() => setDefaultsPage(p => p + 1)}
                className="w-full mt-3 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs transition-all"
                style={{ color: '#94A3B8', border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                <ChevronDown size={14} />
                Load {Math.min(DJ_PAGE_SIZE, defaultTracks.length - visibleDefaults.length)} more tracks
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export default function LoungeManager() {
  const [tab, setTab] = useState('events');

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#0F172A' }}>
          <Music size={22} className="text-emerald-600" /> Lounge & Community
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>Manage events, polls and the community DJ queue</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl p-1 w-fit" style={{ background: '#F1F5F9' }}>
        {[
          { key: 'events',   icon: Calendar,   label: 'Event Board'   },
          { key: 'polls',    icon: BarChart2,   label: 'Polls & Voting' },
          { key: 'djqueue',  icon: Music,       label: 'DJ Queue'      },
        ].map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === key
              ? { background: '#FFFFFF', color: '#0F172A', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
              : { color: '#94A3B8' }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'events'  && <EventsTab />}
      {tab === 'polls'   && <PollsTab />}
      {tab === 'djqueue' && <DJQueueTab />}
    </div>
  );
}
