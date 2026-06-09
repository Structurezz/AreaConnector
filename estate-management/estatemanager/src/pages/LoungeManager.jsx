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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-sm">{events.length} events</p>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold text-navy font-semibold text-sm hover:opacity-90 transition-opacity">
          <Plus size={14} /> New Event
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><RefreshCw size={18} className="text-gold animate-spin" /></div>
      ) : events.length === 0 ? (
        <div className="glass-card p-10 text-center text-white/30 text-sm">No events yet. Create the first one!</div>
      ) : (
        <div className="space-y-3">
          {events.map(ev => (
            <div key={ev._id} className={`glass-card p-4 flex items-start justify-between gap-3 ${ev.isFridayFunTimes ? 'border-amber-500/25' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {ev.isFridayFunTimes && <span className="text-xs">🎉</span>}
                  <span className="font-medium text-white">{ev.title}</span>
                </div>
                <div className="text-xs text-white/35 mt-0.5">
                  {new Date(ev.date).toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {ev.time && ` · ${ev.time}`}
                  {ev.location && ` · ${ev.location}`}
                </div>
                <div className="text-xs text-white/25 mt-1 flex items-center gap-1">
                  <Users size={10} /> {ev.rsvps?.length || 0} going
                </div>
              </div>
              <button onClick={() => handleDelete(ev._id)}
                className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all flex-shrink-0">
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
              <h2 className="text-lg font-bold text-white">New Event</h2>
              <button onClick={() => { setShowForm(false); setActivePicker(null); }} className="text-white/30 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs text-white/40 block mb-1">Title *</label>
                <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-gold/40" />
              </div>
              <div>
                <label className="text-xs text-white/40 block mb-1.5">Date & Time *</label>
                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => setActivePicker(p => p === 'date' ? null : 'date')}
                    className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      activePicker === 'date'
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : form.date
                          ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                          : 'bg-white/5 border-white/10 text-white/35 hover:border-white/20'
                    }`}>
                    <Calendar size={14} className="shrink-0" />
                    {form.date
                      ? new Date(form.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Select date'}
                  </button>
                  <button type="button"
                    onClick={() => setActivePicker(p => p === 'time' ? null : 'time')}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      activePicker === 'time'
                        ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                        : form.time
                          ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400'
                          : 'bg-white/5 border-white/10 text-white/35 hover:border-white/20'
                    }`}>
                    <Clock size={14} className="shrink-0" />
                    {form.time || 'Time'}
                  </button>
                </div>

                {activePicker === 'date' && (
                  <div className="mt-2 rounded-xl border border-amber-500/20 bg-white/4 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                        <Calendar size={13} className="text-amber-400" />
                      </div>
                      <span className="text-sm font-semibold text-white">Select Date</span>
                      <button type="button" onClick={() => setActivePicker(null)} className="ml-auto text-white/30 hover:text-white/60">
                        <X size={14} />
                      </button>
                    </div>
                    <input required type="date" min={new Date().toISOString().split('T')[0]}
                      value={form.date}
                      onChange={e => { setForm(p => ({ ...p, date: e.target.value })); setActivePicker(null); }}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-amber-500/40 cursor-pointer"
                      autoFocus />
                  </div>
                )}

                {activePicker === 'time' && (
                  <div className="mt-2 rounded-xl border border-indigo-500/20 bg-white/4 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                        <Clock size={13} className="text-indigo-400" />
                      </div>
                      <span className="text-sm font-semibold text-white">Select Time</span>
                      <button type="button" onClick={() => setActivePicker(null)} className="ml-auto text-white/30 hover:text-white/60">
                        <X size={14} />
                      </button>
                    </div>
                    <input type="time"
                      value={form.time}
                      onChange={e => { setForm(p => ({ ...p, time: e.target.value })); setActivePicker(null); }}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500/40 cursor-pointer"
                      autoFocus />
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-white/40 block mb-1">Location</label>
                <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-gold/40" />
              </div>
              <div>
                <label className="text-xs text-white/40 block mb-1">Organizer</label>
                <input value={form.organizer} onChange={e => setForm(p => ({ ...p, organizer: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-gold/40" />
              </div>
              <div>
                <label className="text-xs text-white/40 block mb-1">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-gold/40 resize-none" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setForm(p => ({ ...p, isFridayFunTimes: !p.isFridayFunTimes }))}
                  className={`w-5 h-5 rounded flex items-center justify-center transition-all ${form.isFridayFunTimes ? 'bg-amber-500' : 'bg-white/10'}`}>
                  {form.isFridayFunTimes && <Check size={12} className="text-white" />}
                </div>
                <span className="text-sm text-white/60">🎉 Mark as Friday Night FunTimes</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setActivePicker(null); }}
                  className="flex-1 py-2 rounded-xl bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-gold text-navy text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-sm">{polls.length} polls</p>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold text-navy font-semibold text-sm hover:opacity-90 transition-opacity">
          <Plus size={14} /> New Poll
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><RefreshCw size={18} className="text-gold animate-spin" /></div>
      ) : polls.length === 0 ? (
        <div className="glass-card p-10 text-center text-white/30 text-sm">No polls yet. Create the first one!</div>
      ) : (
        <div className="space-y-3">
          {polls.map(poll => {
            const total   = poll.options.reduce((s, o) => s + o.votes.length, 0);
            const isEnded = !poll.isActive || (poll.endsAt && new Date() > new Date(poll.endsAt));
            return (
              <div key={poll._id} className="glass-card p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-medium text-white">{poll.question}</p>
                    <div className="text-xs text-white/30 mt-0.5">{total} votes · {poll.options.length} options</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEnded ? (
                      <span className="text-xs text-white/25 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5">
                        <Lock size={9} /> Closed
                      </span>
                    ) : (
                      <button onClick={() => handleClose(poll._id)}
                        className="text-xs text-red-400/60 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-400/10 transition-all">
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
                        <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full bg-gold/50" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-white/40 w-24 truncate">{opt.text}</span>
                        <span className="text-xs text-white/25 w-8 text-right">{pct}%</span>
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
              <h2 className="text-lg font-bold text-white">New Poll</h2>
              <button onClick={() => setShowForm(false)} className="text-white/30 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs text-white/40 block mb-1">Question *</label>
                <textarea required rows={2} value={form.question} onChange={e => setForm(p => ({ ...p, question: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-gold/40 resize-none" />
              </div>
              <div>
                <label className="text-xs text-white/40 block mb-2">Options * (min 2)</label>
                <div className="space-y-2">
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input value={opt} onChange={e => setOption(i, e.target.value)} placeholder={`Option ${i + 1}`}
                        className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-gold/40" />
                      {form.options.length > 2 && (
                        <button type="button" onClick={() => removeOption(i)} className="p-1.5 text-white/20 hover:text-red-400 transition-colors">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                  {form.options.length < 6 && (
                    <button type="button" onClick={addOption}
                      className="text-xs text-gold/60 hover:text-gold transition-colors flex items-center gap-1 mt-1">
                      <Plus size={11} /> Add option
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 block mb-1">End Date (optional)</label>
                <input type="datetime-local" value={form.endsAt} onChange={e => setForm(p => ({ ...p, endsAt: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-gold/40" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setForm(p => ({ ...p, allowMultiple: !p.allowMultiple }))}
                  className={`w-5 h-5 rounded flex items-center justify-center transition-all ${form.allowMultiple ? 'bg-gold' : 'bg-white/10'}`}>
                  {form.allowMultiple && <Check size={12} className="text-navy" />}
                </div>
                <span className="text-sm text-white/60">Allow multiple selections</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2 rounded-xl bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-gold text-navy text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
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
    return <div className="flex justify-center py-8"><RefreshCw size={18} className="text-gold animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={handleToggleAutoDJ}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              session?.isAutoDJ
                ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
                : 'text-white/40 border-white/10 bg-white/5 hover:bg-white/10'
            }`}>
            <Shuffle size={12} /> AutoDJ {session?.isAutoDJ ? 'On' : 'Off'}
          </button>
          <button onClick={load} className="p-1.5 text-white/30 hover:text-white transition-colors" title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
        <button onClick={handleResetDefaults}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white text-xs font-medium transition-all hover:bg-white/10">
          <RefreshCw size={12} /> Reset Default Playlist
        </button>
      </div>

      {/* Community Queue */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-white">Community Queue</h3>
          <span className="text-xs text-white/30 px-2 py-0.5 rounded-full bg-white/5">{communityTracks.length}</span>
        </div>
        {communityTracks.length === 0 ? (
          <div className="glass-card p-6 text-center text-white/25 text-sm">No resident suggestions yet</div>
        ) : (
          <div className="space-y-2">
            {communityTracks.map((t, i) => (
              <div key={t._id} className="glass-card p-3 flex items-center gap-3">
                <span className="text-xs font-bold text-white/25 w-5 text-center flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{t.title}</p>
                  <p className="text-xs text-white/35 mt-0.5">
                    {t.suggestedBy?.name ? `by ${t.suggestedBy.name}` : 'Resident'}
                    {' · '}{t.votes?.length || 0} vote{t.votes?.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <a href={`https://youtube.com/watch?v=${t.videoId}`}
                  target="_blank" rel="noopener noreferrer"
                  className="p-1.5 text-white/20 hover:text-gold transition-colors flex-shrink-0"
                  title="Open on YouTube"
                  onClick={e => e.stopPropagation()}>
                  <Music size={13} />
                </a>
                <button onClick={() => handleRemove(t._id)}
                  className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all flex-shrink-0">
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
          <h3 className="text-sm font-semibold text-white">DJ Playlist</h3>
          <span className="text-xs text-white/30 px-2 py-0.5 rounded-full bg-white/5">{defaultTracks.length}</span>
          <span className="text-xs text-white/20 px-2 py-0.5 rounded-full bg-white/5">Auto-seeded</span>
        </div>
        {defaultTracks.length === 0 ? (
          <div className="glass-card p-6 text-center text-white/25 text-sm">
            No default tracks. Click "Reset Default Playlist" to seed.
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {visibleDefaults.map((t, i) => (
                <div key={t._id} className="glass-card p-3 flex items-center gap-3">
                  <span className="text-xs font-bold text-white/25 w-5 text-center flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{t.title}</p>
                    <p className="text-xs text-white/35 mt-0.5">
                      {t.artist || 'Estate DJ Mix'}
                      {' · '}{t.votes?.length || 0} vote{t.votes?.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <a href={`https://youtube.com/watch?v=${t.videoId}`}
                    target="_blank" rel="noopener noreferrer"
                    className="p-1.5 text-white/20 hover:text-gold transition-colors flex-shrink-0"
                    title="Open on YouTube"
                    onClick={e => e.stopPropagation()}>
                    <Music size={13} />
                  </a>
                  <button onClick={() => handleRemove(t._id)}
                    className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all flex-shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            {hasMoreDefaults && (
              <button onClick={() => setDefaultsPage(p => p + 1)}
                className="w-full mt-3 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs text-white/40 hover:text-white border border-white/8 hover:bg-white/5 transition-all">
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
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Music size={22} className="text-gold" /> Lounge & Community
        </h1>
        <p className="text-white/40 text-sm mt-0.5">Manage events, polls and the community DJ queue</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
        {[
          { key: 'events',   icon: Calendar,   label: 'Event Board'   },
          { key: 'polls',    icon: BarChart2,   label: 'Polls & Voting' },
          { key: 'djqueue',  icon: Music,       label: 'DJ Queue'      },
        ].map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
            }`}>
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
