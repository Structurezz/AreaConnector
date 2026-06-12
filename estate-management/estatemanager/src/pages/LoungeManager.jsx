import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Music, Calendar, BarChart2, Plus, Trash2, X,
  RefreshCw, Check, Lock, Users, Shuffle, ChevronDown,
  Clock, Pin, Eye, EyeOff, Zap, TrendingUp, Activity,
  MessageCircle, Trophy, ShoppingBag, Newspaper, Lightbulb,
  Dumbbell, Handshake, PartyPopper, Star, ChevronRight,
} from 'lucide-react';
import { eventAPI, pollAPI, loungeAPI } from '../api';
import toast from 'react-hot-toast';

// ── Activity types ─────────────────────────────────────────────────
const ACTIVITY_TYPES = [
  { id: 'fitness',     emoji: '🏃', label: 'Fitness',      color: '#10B981', bg: '#F0FDF4', Icon: Dumbbell },
  { id: 'icebreaker',  emoji: '💬', label: 'Icebreaker',   color: '#6366F1', bg: '#EEF2FF', Icon: MessageCircle },
  { id: 'news',        emoji: '📰', label: 'Estate News',  color: '#0EA5E9', bg: '#F0F9FF', Icon: Newspaper },
  { id: 'tip',         emoji: '💡', label: 'Daily Tip',    color: '#F59E0B', bg: '#FFFBEB', Icon: Lightbulb },
  { id: 'networking',  emoji: '🤝', label: 'Networking',   color: '#8B5CF6', bg: '#F5F3FF', Icon: Handshake },
  { id: 'social',      emoji: '🎉', label: 'Fun & Social', color: '#EC4899', bg: '#FDF2F8', Icon: PartyPopper },
  { id: 'marketplace', emoji: '🛒', label: 'Marketplace',  color: '#F97316', bg: '#FFF7ED', Icon: ShoppingBag },
  { id: 'challenge',   emoji: '🏆', label: 'Challenge',    color: '#EF4444', bg: '#FEF2F2', Icon: Trophy },
];

const typeMap = Object.fromEntries(ACTIVITY_TYPES.map(t => [t.id, t]));

const DEFAULT_ACTIVITIES = [
  { id: 'da_1', type: 'fitness',     pinned: true,  visible: true, day: 'Daily',   title: 'Morning Walk Club', desc: '7:00 AM at the estate gate. All fitness levels welcome — let\'s get those steps in together!' },
  { id: 'da_2', type: 'icebreaker',  pinned: true,  visible: true, day: 'Daily',   title: 'Icebreaker of the Day', desc: 'What\'s one skill you have that most of your neighbors probably don\'t know about?' },
  { id: 'da_3', type: 'challenge',   pinned: false, visible: true, day: 'Daily',   title: '10,000 Steps Challenge', desc: 'Can you hit 10,000 steps today? Share your progress with the community!' },
  { id: 'da_4', type: 'networking',  pinned: false, visible: true, day: 'Weekly',  title: 'Neighbour Spotlight', desc: 'Say hello to a neighbour you haven\'t met yet this week. Great communities start with great connections.' },
  { id: 'da_5', type: 'tip',         pinned: false, visible: true, day: 'Daily',   title: 'Estate Tip of the Day', desc: 'Keep shared corridors and stairways clear at all times for emergency access and neighbour courtesy.' },
  { id: 'da_6', type: 'social',      pinned: false, visible: true, day: 'Weekly',  title: 'Friday Night FunTimes', desc: 'Join your neighbours every Friday evening for community bonding. Venue: Estate Clubhouse, 7 PM.' },
  { id: 'da_7', type: 'marketplace', pinned: false, visible: true, day: 'Weekly',  title: 'Marketplace Monday', desc: 'New week, new listings! See what your neighbours are selling, swapping, or offering this week.' },
  { id: 'da_8', type: 'news',        pinned: false, visible: true, day: 'Daily',   title: 'Estate Update Board', desc: 'Check the Announcements tab for this week\'s maintenance schedule and community updates.' },
  { id: 'da_9', type: 'fitness',     pinned: false, visible: true, day: 'Weekly',  title: 'Weekend Yoga Session', desc: 'Outdoor yoga every Saturday at 8 AM by the estate pool area. Bring your own mat!' },
  { id: 'da_10',type: 'networking',  pinned: false, visible: true, day: 'Monthly', title: 'Residents\' Mixer', desc: 'Monthly get-together for new and old residents to meet, mingle and build community bonds.' },
  { id: 'da_11',type: 'challenge',   pinned: false, visible: true, day: 'Weekly',  title: 'Community Clean-Up Drive', desc: 'Join fellow residents this weekend for a 30-minute shared-space tidy-up. Gloves provided!' },
  { id: 'da_12',type: 'social',      pinned: false, visible: true, day: 'Daily',   title: 'Good Morning Wall', desc: 'Start your day by dropping a good morning in the community chat. Positivity is contagious!' },
];

const ACTS_KEY = 'ac_lounge_activities';

function loadActivities() {
  try {
    const stored = JSON.parse(localStorage.getItem(ACTS_KEY));
    return stored || DEFAULT_ACTIVITIES;
  } catch { return DEFAULT_ACTIVITIES; }
}

function saveActivities(acts) {
  localStorage.setItem(ACTS_KEY, JSON.stringify(acts));
}

const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: '12px',
  background: '#F8FAFC', border: '1px solid #E2E8F0',
  fontSize: '14px', color: '#0F172A', outline: 'none',
};

// ── Feed Tab ────────────────────────────────────────────────────────

function FeedTab({ onTabChange }) {
  const [events, setEvents]   = useState([]);
  const [polls, setPolls]     = useState([]);
  const [session, setSession] = useState(null);
  const [acts]                = useState(loadActivities);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      eventAPI.getAll().catch(() => ({ data: { data: [] } })),
      pollAPI.getAll().catch(() => ({ data: { data: [] } })),
      loungeAPI.getSession().catch(() => ({ data: { data: null } })),
    ]).then(([ev, po, lo]) => {
      setEvents(ev.data.data || []);
      setPolls(po.data.data || []);
      setSession(lo.data.data);
    }).finally(() => setLoading(false));
  }, []);

  const pinned      = acts.filter(a => a.pinned && a.visible);
  const upcoming    = [...events].sort((a, b) => new Date(a.date) - new Date(b.date))
                        .filter(e => new Date(e.date) >= new Date()).slice(0, 3);
  const activePolls = polls.filter(p => p.isActive);
  const queueSize   = (session?.suggestions || []).filter(s => !s.isDefault).length;

  const STATS = [
    { label: 'Upcoming Events', value: upcoming.length,    color: '#10B981', emoji: '📅', tab: 'events' },
    { label: 'Active Polls',    value: activePolls.length, color: '#6366F1', emoji: '📊', tab: 'polls' },
    { label: 'Queue Tracks',    value: queueSize,          color: '#EC4899', emoji: '🎵', tab: 'music' },
    { label: 'Activities Live', value: acts.filter(a => a.visible).length, color: '#F59E0B', emoji: '⚡', tab: 'activities' },
  ];

  if (loading) return <div className="flex justify-center py-16"><RefreshCw size={20} className="text-emerald-500 animate-spin" /></div>;

  return (
    <div className="space-y-6">

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map(s => (
          <button key={s.tab} onClick={() => onTabChange(s.tab)}
            className="rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{ background: '#fff', border: '1px solid #F1F5F9' }}>
            <div className="text-2xl mb-1">{s.emoji}</div>
            <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs font-medium mt-0.5" style={{ color: '#94A3B8' }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* Pinned Activities */}
      {pinned.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: '#0F172A' }}>
              <Pin size={13} className="text-emerald-500" /> Featured Today
            </h2>
            <button onClick={() => onTabChange('activities')}
              className="text-xs flex items-center gap-1 font-semibold" style={{ color: '#10B981' }}>
              Manage <ChevronRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pinned.slice(0, 4).map(act => {
              const t = typeMap[act.type] || ACTIVITY_TYPES[0];
              return (
                <div key={act.id} className="rounded-2xl p-4 border"
                  style={{ background: t.bg, borderColor: t.color + '30' }}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{t.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: t.color + '20', color: t.color }}>{t.label}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{ background: '#fff', color: '#94A3B8' }}>{act.day}</span>
                      </div>
                      <p className="text-sm font-bold leading-snug" style={{ color: '#0F172A' }}>{act.title}</p>
                      <p className="text-xs mt-1 leading-relaxed line-clamp-2" style={{ color: '#64748B' }}>{act.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: '#0F172A' }}>
            <Calendar size={13} className="text-emerald-500" /> Upcoming Events
          </h2>
          <button onClick={() => onTabChange('events')}
            className="text-xs flex items-center gap-1 font-semibold" style={{ color: '#10B981' }}>
            View all <ChevronRight size={12} />
          </button>
        </div>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl p-5 text-center text-sm border" style={{ color: '#94A3B8', borderColor: '#F1F5F9', background: '#FAFAFA' }}>
            No upcoming events — <button onClick={() => onTabChange('events')} className="font-semibold" style={{ color: '#10B981' }}>create one</button>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map(ev => (
              <div key={ev._id} className="rounded-2xl p-3.5 flex items-center gap-3 border"
                style={{ background: '#fff', borderColor: '#F1F5F9' }}>
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex flex-col items-center justify-center text-center"
                  style={{ background: ev.isFridayFunTimes ? '#FFFBEB' : '#F0FDF4' }}>
                  <span className="text-[10px] font-bold uppercase"
                    style={{ color: ev.isFridayFunTimes ? '#D97706' : '#10B981' }}>
                    {new Date(ev.date).toLocaleDateString('en', { month: 'short' })}
                  </span>
                  <span className="text-base font-black leading-none"
                    style={{ color: ev.isFridayFunTimes ? '#D97706' : '#0F172A' }}>
                    {new Date(ev.date).getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>{ev.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                    {ev.time && `${ev.time} · `}{ev.location || 'Estate Grounds'}
                    {' · '}<span style={{ color: '#10B981' }}>{ev.rsvps?.length || 0} going</span>
                  </p>
                </div>
                {ev.isFridayFunTimes && <span className="text-lg flex-shrink-0">🎉</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Polls */}
      {activePolls.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: '#0F172A' }}>
              <BarChart2 size={13} className="text-indigo-500" /> Live Polls
            </h2>
            <button onClick={() => onTabChange('polls')}
              className="text-xs flex items-center gap-1 font-semibold" style={{ color: '#6366F1' }}>
              Manage <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {activePolls.slice(0, 2).map(poll => {
              const total = poll.options.reduce((s, o) => s + o.votes.length, 0);
              return (
                <div key={poll._id} className="rounded-2xl p-3.5 border"
                  style={{ background: '#fff', borderColor: '#F1F5F9' }}>
                  <p className="text-sm font-semibold mb-2" style={{ color: '#0F172A' }}>{poll.question}</p>
                  <div className="flex items-center justify-between text-xs" style={{ color: '#94A3B8' }}>
                    <span>{total} vote{total !== 1 ? 's' : ''} · {poll.options.length} options</span>
                    <span className="px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: '#EEF2FF', color: '#6366F1' }}>Live</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Music status */}
      {session && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: '#0F172A' }}>
              <Music size={13} className="text-pink-500" /> Community Music
            </h2>
            <button onClick={() => onTabChange('music')}
              className="text-xs flex items-center gap-1 font-semibold" style={{ color: '#EC4899' }}>
              DJ Queue <ChevronRight size={12} />
            </button>
          </div>
          <div className="rounded-2xl p-4 flex items-center gap-3 border"
            style={{ background: 'linear-gradient(135deg, #FDF2F8, #EEF2FF)', borderColor: '#EC489930' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#EC489920' }}>
              <Music size={18} style={{ color: '#EC4899' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                {queueSize > 0 ? `${queueSize} resident track${queueSize !== 1 ? 's' : ''} in queue` : 'No community tracks queued'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                AutoDJ {session.isAutoDJ ? 'enabled' : 'off'} · {(session.suggestions || []).length} total tracks
              </p>
            </div>
            <div className="ml-auto flex-shrink-0">
              {session.isAutoDJ && (
                <span className="text-xs px-2 py-1 rounded-full font-bold"
                  style={{ background: '#FDF2F8', color: '#EC4899' }}>● Live</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Activities Tab ──────────────────────────────────────────────────

function ActivitiesTab() {
  const [activities, setActivities] = useState(loadActivities);
  const [filter, setFilter]         = useState('all');
  const [showForm, setShowForm]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState({ type: 'fitness', title: '', desc: '', day: 'Daily' });

  const persist = (updated) => { setActivities(updated); saveActivities(updated); };

  const togglePin = (id) => persist(activities.map(a => a.id === id ? { ...a, pinned: !a.pinned } : a));
  const toggleVis = (id) => persist(activities.map(a => a.id === id ? { ...a, visible: !a.visible } : a));
  const remove    = (id) => persist(activities.filter(a => a.id !== id));

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.desc.trim()) { toast.error('Title and description required'); return; }
    setSaving(true);
    const newAct = { ...form, id: `custom_${Date.now()}`, pinned: false, visible: true, isCustom: true };
    persist([newAct, ...activities]);
    setShowForm(false);
    setForm({ type: 'fitness', title: '', desc: '', day: 'Daily' });
    setSaving(false);
    toast.success('Activity added');
  };

  const resetToDefaults = () => {
    persist(DEFAULT_ACTIVITIES);
    toast.success('Activities reset to defaults');
  };

  const filtered = filter === 'all' ? activities : activities.filter(a => a.type === filter);
  const pinnedCount  = activities.filter(a => a.pinned).length;
  const visibleCount = activities.filter(a => a.visible).length;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm" style={{ color: '#94A3B8' }}>
            <span style={{ color: '#10B981', fontWeight: 700 }}>{visibleCount}</span> visible ·&nbsp;
            <span style={{ color: '#F59E0B', fontWeight: 700 }}>{pinnedCount}</span> pinned
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetToDefaults}
            className="text-xs px-3 py-1.5 rounded-xl border font-medium transition-all"
            style={{ color: '#94A3B8', borderColor: '#E2E8F0', background: '#F8FAFC' }}>
            Reset defaults
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-sm"
            style={{ background: '#10B981' }}>
            <Plus size={14} /> Add Activity
          </button>
        </div>
      </div>

      {/* Type filter */}
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => setFilter('all')}
          className="px-3 py-1 rounded-full text-xs font-semibold transition-all border"
          style={filter === 'all'
            ? { background: '#0F172A', color: '#fff', borderColor: '#0F172A' }
            : { color: '#64748B', borderColor: '#E2E8F0', background: '#fff' }}>
          All
        </button>
        {ACTIVITY_TYPES.map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-all border flex items-center gap-1"
            style={filter === t.id
              ? { background: t.color, color: '#fff', borderColor: t.color }
              : { color: '#64748B', borderColor: '#E2E8F0', background: '#fff' }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Activity cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(act => {
          const t = typeMap[act.type] || ACTIVITY_TYPES[0];
          return (
            <div key={act.id}
              className="rounded-2xl p-4 border transition-all"
              style={{
                background: act.visible ? t.bg : '#F8FAFC',
                borderColor: act.visible ? t.color + '30' : '#E2E8F0',
                opacity: act.visible ? 1 : 0.6,
              }}>
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">{t.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: t.color + '20', color: t.color }}>{t.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium"
                      style={{ color: '#94A3B8', borderColor: '#E2E8F0', background: '#fff' }}>{act.day}</span>
                    {act.pinned && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: '#FFFBEB', color: '#D97706' }}>📌 Pinned</span>
                    )}
                    {act.isCustom && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: '#EEF2FF', color: '#6366F1' }}>Custom</span>
                    )}
                  </div>
                  <p className="text-sm font-bold leading-snug mb-1" style={{ color: act.visible ? '#0F172A' : '#94A3B8' }}>
                    {act.title}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: '#64748B' }}>{act.desc}</p>
                </div>
              </div>

              {/* Action row */}
              <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t"
                style={{ borderColor: t.color + '20' }}>
                <button onClick={() => togglePin(act.id)}
                  title={act.pinned ? 'Unpin' : 'Pin to top'}
                  className="p-1.5 rounded-lg transition-all text-xs flex items-center gap-1 font-medium"
                  style={act.pinned
                    ? { color: '#D97706', background: '#FFFBEB' }
                    : { color: '#94A3B8', background: 'transparent' }}>
                  <Pin size={12} />
                </button>
                <button onClick={() => toggleVis(act.id)}
                  title={act.visible ? 'Hide from residents' : 'Show to residents'}
                  className="p-1.5 rounded-lg transition-all"
                  style={act.visible
                    ? { color: '#10B981', background: '#F0FDF4' }
                    : { color: '#94A3B8', background: 'transparent' }}>
                  {act.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
                <button onClick={() => remove(act.id)}
                  className="p-1.5 rounded-lg transition-all hover:bg-red-50"
                  style={{ color: '#CBD5E1' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                  onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl p-10 text-center text-sm border"
          style={{ color: '#94A3B8', borderColor: '#F1F5F9', background: '#FAFAFA' }}>
          No activities in this category.
        </div>
      )}

      {/* Add Activity Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl p-6 bg-white shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>New Activity</h2>
              <button onClick={() => setShowForm(false)} style={{ color: '#94A3B8' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs block mb-1.5 font-medium" style={{ color: '#64748B' }}>Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {ACTIVITY_TYPES.map(t => (
                    <button key={t.id} type="button" onClick={() => setForm(p => ({ ...p, type: t.id }))}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-all"
                      style={form.type === t.id
                        ? { background: t.color, color: '#fff', borderColor: t.color }
                        : { color: '#64748B', borderColor: '#E2E8F0', background: '#fff' }}>
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs block mb-1 font-medium" style={{ color: '#64748B' }}>Title *</label>
                <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs block mb-1 font-medium" style={{ color: '#64748B' }}>Description *</label>
                <textarea required rows={3} value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))}
                  style={{ ...inputStyle, resize: 'none' }} />
              </div>
              <div>
                <label className="text-xs block mb-1 font-medium" style={{ color: '#64748B' }}>Frequency</label>
                <div className="flex gap-2">
                  {['Daily', 'Weekly', 'Monthly', 'One-time'].map(d => (
                    <button key={d} type="button" onClick={() => setForm(p => ({ ...p, day: d }))}
                      className="flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                      style={form.day === d
                        ? { background: '#0F172A', color: '#fff', borderColor: '#0F172A' }
                        : { color: '#64748B', borderColor: '#E2E8F0', background: '#fff' }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm"
                  style={{ background: '#F1F5F9', color: '#475569' }}>Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2"
                  style={{ background: '#10B981' }}>
                  {saving ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />} Add Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Events Tab ──────────────────────────────────────────────────────

const EVENT_CATEGORIES = [
  { id: 'general',    label: 'General',    color: '#10B981', emoji: '📅' },
  { id: 'fitness',    label: 'Fitness',    color: '#0EA5E9', emoji: '🏃' },
  { id: 'social',     label: 'Social',     color: '#EC4899', emoji: '🎉' },
  { id: 'networking', label: 'Networking', color: '#8B5CF6', emoji: '🤝' },
  { id: 'maintenance',label: 'Maintenance',color: '#F59E0B', emoji: '🔧' },
  { id: 'kids',       label: 'Kids',       color: '#F97316', emoji: '👶' },
];
const catMap = Object.fromEntries(EVENT_CATEGORIES.map(c => [c.id, c]));

function EventsTab() {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({ title: '', description: '', date: '', time: '', location: '', organizer: '', category: 'general', isFridayFunTimes: false });

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
      setForm({ title: '', description: '', date: '', time: '', location: '', organizer: '', category: 'general', isFridayFunTimes: false });
      toast.success('Event created');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create event');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await eventAPI.delete(id);
      setEvents(prev => prev.filter(e => e._id !== id));
      toast.success('Event removed');
    } catch { toast.error('Failed to delete event'); }
  };

  const upcoming = events.filter(e => new Date(e.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date));
  const past     = events.filter(e => new Date(e.date) < new Date()).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: '#94A3B8' }}>{upcoming.length} upcoming · {past.length} past</p>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-sm"
          style={{ background: '#10B981' }}>
          <Plus size={14} /> New Event
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><RefreshCw size={18} className="text-emerald-500 animate-spin" /></div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl p-10 text-center text-sm border" style={{ color: '#94A3B8', borderColor: '#F1F5F9' }}>
          No events yet. Create the first one!
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="space-y-3">
              {upcoming.map(ev => {
                const cat = catMap[ev.category] || catMap['general'];
                return (
                  <div key={ev._id} className="rounded-2xl p-4 border flex items-start gap-4"
                    style={{ background: '#fff', borderColor: ev.isFridayFunTimes ? '#FDE68A' : '#F1F5F9' }}>
                    <div className="w-12 h-12 rounded-2xl flex-shrink-0 flex flex-col items-center justify-center text-center"
                      style={{ background: ev.isFridayFunTimes ? '#FFFBEB' : cat.color + '15' }}>
                      <span className="text-[10px] font-bold uppercase"
                        style={{ color: ev.isFridayFunTimes ? '#D97706' : cat.color }}>
                        {new Date(ev.date).toLocaleDateString('en', { month: 'short' })}
                      </span>
                      <span className="text-lg font-black leading-none"
                        style={{ color: ev.isFridayFunTimes ? '#D97706' : '#0F172A' }}>
                        {new Date(ev.date).getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: cat.color + '15', color: cat.color }}>
                          {cat.emoji} {cat.label}
                        </span>
                        {ev.isFridayFunTimes && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ background: '#FFFBEB', color: '#D97706' }}>🎉 FunTimes</span>
                        )}
                      </div>
                      <p className="text-sm font-bold" style={{ color: '#0F172A' }}>{ev.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                        {ev.time && `${ev.time} · `}{ev.location || 'Estate Grounds'}
                        {ev.organizer && ` · by ${ev.organizer}`}
                      </p>
                      {ev.description && (
                        <p className="text-xs mt-1 line-clamp-1" style={{ color: '#64748B' }}>{ev.description}</p>
                      )}
                      <div className="flex items-center gap-1 mt-1.5">
                        <Users size={10} style={{ color: '#10B981' }} />
                        <span className="text-xs font-semibold" style={{ color: '#10B981' }}>
                          {ev.rsvps?.length || 0} going
                        </span>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(ev._id)}
                      className="p-1.5 rounded-lg flex-shrink-0 transition-all hover:bg-red-50"
                      style={{ color: '#CBD5E1' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {past.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2 mt-5" style={{ color: '#94A3B8' }}>Past Events</p>
              <div className="space-y-2">
                {past.slice(0, 3).map(ev => (
                  <div key={ev._id} className="rounded-xl p-3 flex items-center gap-3"
                    style={{ background: '#F8FAFC', opacity: 0.7 }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#64748B' }}>{ev.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                        {new Date(ev.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}{ev.rsvps?.length || 0} attended
                      </p>
                    </div>
                    <button onClick={() => handleDelete(ev._id)}
                      className="p-1.5 rounded-lg flex-shrink-0 transition-all hover:bg-red-50"
                      style={{ color: '#CBD5E1' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl p-6 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>New Event</h2>
              <button onClick={() => setShowForm(false)} style={{ color: '#94A3B8' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs block mb-1.5 font-medium" style={{ color: '#64748B' }}>Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {EVENT_CATEGORIES.map(c => (
                    <button key={c.id} type="button" onClick={() => setForm(p => ({ ...p, category: c.id }))}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-all"
                      style={form.category === c.id
                        ? { background: c.color, color: '#fff', borderColor: c.color }
                        : { color: '#64748B', borderColor: '#E2E8F0', background: '#fff' }}>
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs block mb-1 font-medium" style={{ color: '#64748B' }}>Title *</label>
                <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={inputStyle} />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs block mb-1 font-medium" style={{ color: '#64748B' }}>Date *</label>
                  <input required type="date" min={new Date().toISOString().split('T')[0]}
                    value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={inputStyle} />
                </div>
                <div className="w-28">
                  <label className="text-xs block mb-1 font-medium" style={{ color: '#64748B' }}>Time</label>
                  <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div>
                <label className="text-xs block mb-1 font-medium" style={{ color: '#64748B' }}>Location</label>
                <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} style={inputStyle} placeholder="Estate Grounds" />
              </div>
              <div>
                <label className="text-xs block mb-1 font-medium" style={{ color: '#64748B' }}>Organizer</label>
                <input value={form.organizer} onChange={e => setForm(p => ({ ...p, organizer: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs block mb-1 font-medium" style={{ color: '#64748B' }}>Description</label>
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
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: '#F1F5F9', color: '#475569' }}>Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2"
                  style={{ background: '#10B981' }}>
                  {saving ? <RefreshCw size={13} className="animate-spin" /> : <Calendar size={13} />} Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Polls Tab (unchanged logic, restyled) ───────────────────────────

function PollsTab() {
  const [polls, setPolls]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({ question: '', options: ['', ''], endsAt: '', allowMultiple: false });

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
    } finally { setSaving(false); }
  };

  const handleClose = async (id) => {
    try {
      const { data } = await pollAPI.close(id);
      setPolls(prev => prev.map(p => p._id === id ? data.data : p));
      toast.success('Poll closed');
    } catch { toast.error('Failed to close poll'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: '#94A3B8' }}>{polls.length} polls</p>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-sm"
          style={{ background: '#6366F1' }}>
          <Plus size={14} /> New Poll
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><RefreshCw size={18} className="text-indigo-500 animate-spin" /></div>
      ) : polls.length === 0 ? (
        <div className="rounded-2xl p-10 text-center text-sm border" style={{ color: '#94A3B8', borderColor: '#F1F5F9' }}>No polls yet. Create the first one!</div>
      ) : (
        <div className="space-y-3">
          {polls.map(poll => {
            const total   = poll.options.reduce((s, o) => s + o.votes.length, 0);
            const isEnded = !poll.isActive || (poll.endsAt && new Date() > new Date(poll.endsAt));
            const leading = poll.options.reduce((a, b) => a.votes.length >= b.votes.length ? a : b, poll.options[0]);
            return (
              <div key={poll._id} className="rounded-2xl p-4 border" style={{ background: '#fff', borderColor: '#F1F5F9' }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: '#0F172A' }}>{poll.question}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                      {total} vote{total !== 1 ? 's' : ''} · {poll.options.length} options
                    </p>
                  </div>
                  {isEnded ? (
                    <span className="text-xs flex items-center gap-1 px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ color: '#94A3B8', background: '#F1F5F9' }}>
                      <Lock size={9} /> Closed
                    </span>
                  ) : (
                    <button onClick={() => handleClose(poll._id)}
                      className="text-xs px-2.5 py-1 rounded-lg flex-shrink-0 font-semibold"
                      style={{ color: '#EF4444', background: '#FEF2F2' }}>
                      Close
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {poll.options.map((opt, i) => {
                    const pct     = total ? Math.round((opt.votes.length / total) * 100) : 0;
                    const isTop   = opt === leading && total > 0;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium flex items-center gap-1" style={{ color: isTop ? '#0F172A' : '#64748B' }}>
                            {isTop && <TrendingUp size={10} style={{ color: '#10B981' }} />}
                            {opt.text}
                          </span>
                          <span className="text-xs font-bold" style={{ color: isTop ? '#10B981' : '#94A3B8' }}>{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: isTop ? '#10B981' : '#CBD5E1' }} />
                        </div>
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
          <div className="w-full max-w-md rounded-2xl p-6 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>New Poll</h2>
              <button onClick={() => setShowForm(false)} style={{ color: '#94A3B8' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs block mb-1 font-medium" style={{ color: '#64748B' }}>Question *</label>
                <textarea required rows={2} value={form.question} onChange={e => setForm(p => ({ ...p, question: e.target.value }))}
                  style={{ ...inputStyle, resize: 'none' }} />
              </div>
              <div>
                <label className="text-xs block mb-2 font-medium" style={{ color: '#64748B' }}>Options * (min 2)</label>
                <div className="space-y-2">
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input value={opt} onChange={e => setOption(i, e.target.value)} placeholder={`Option ${i + 1}`} style={inputStyle} />
                      {form.options.length > 2 && (
                        <button type="button" onClick={() => removeOption(i)} style={{ color: '#CBD5E1' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                          onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}>
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                  {form.options.length < 6 && (
                    <button type="button" onClick={addOption} className="text-xs flex items-center gap-1" style={{ color: '#6366F1' }}>
                      <Plus size={11} /> Add option
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs block mb-1 font-medium" style={{ color: '#64748B' }}>End Date (optional)</label>
                <input type="datetime-local" value={form.endsAt} onChange={e => setForm(p => ({ ...p, endsAt: e.target.value }))} style={inputStyle} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setForm(p => ({ ...p, allowMultiple: !p.allowMultiple }))}
                  className="w-5 h-5 rounded flex items-center justify-center transition-all"
                  style={{ background: form.allowMultiple ? '#6366F1' : '#E2E8F0' }}>
                  {form.allowMultiple && <Check size={12} className="text-white" />}
                </div>
                <span className="text-sm" style={{ color: '#475569' }}>Allow multiple selections</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: '#F1F5F9', color: '#475569' }}>Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2"
                  style={{ background: '#6366F1' }}>
                  {saving ? <RefreshCw size={13} className="animate-spin" /> : 'Create Poll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Music Tab ───────────────────────────────────────────────────────

const DJ_PAGE_SIZE = 10;

function MusicTab() {
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
      setSession(prev => prev ? { ...prev, suggestions: prev.suggestions.filter(s => s._id !== id) } : prev);
      toast.success('Track removed');
    } catch { toast.error('Failed to remove track'); }
  };

  const handleToggleAutoDJ = async () => {
    try {
      const next = !session?.isAutoDJ;
      const { data } = await loungeAPI.updateMood({ isAutoDJ: next });
      setSession(data.data);
      toast.success(`AutoDJ ${next ? 'enabled' : 'disabled'}`);
    } catch { toast.error('Failed to update AutoDJ'); }
  };

  const handleResetDefaults = async () => {
    try {
      await loungeAPI.resetDefaults();
      load();
      toast.success('Default playlist reset');
    } catch { toast.error('Failed to reset defaults'); }
  };

  const queue           = [...(session?.suggestions || [])].sort((a, b) => b.votes.length - a.votes.length);
  const communityTracks = queue.filter(t => !t.isDefault);
  const defaultTracks   = queue.filter(t => t.isDefault);
  const visibleDefaults = defaultTracks.slice(0, defaultsPage * DJ_PAGE_SIZE);

  if (loading) return <div className="flex justify-center py-8"><RefreshCw size={18} className="text-pink-500 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={handleToggleAutoDJ}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
            style={session?.isAutoDJ
              ? { color: '#EC4899', borderColor: 'rgba(236,72,153,0.4)', background: 'rgba(236,72,153,0.08)' }
              : { color: '#94A3B8', borderColor: '#E2E8F0', background: '#F8FAFC' }}>
            <Shuffle size={12} /> AutoDJ {session?.isAutoDJ ? 'On' : 'Off'}
          </button>
          <button onClick={load} className="p-1.5 transition-colors" style={{ color: '#94A3B8' }}>
            <RefreshCw size={14} />
          </button>
        </div>
        <button onClick={handleResetDefaults}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border"
          style={{ background: '#F8FAFC', borderColor: '#E2E8F0', color: '#475569' }}>
          <RefreshCw size={12} /> Reset Playlist
        </button>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-bold" style={{ color: '#0F172A' }}>Community Queue</h3>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: '#94A3B8', background: '#F1F5F9' }}>
            {communityTracks.length}
          </span>
        </div>
        {communityTracks.length === 0 ? (
          <div className="rounded-2xl p-6 text-center text-sm border" style={{ color: '#94A3B8', borderColor: '#F1F5F9' }}>
            No resident suggestions yet
          </div>
        ) : (
          <div className="space-y-2">
            {communityTracks.map((t, i) => (
              <div key={t._id} className="rounded-xl p-3 flex items-center gap-3 border"
                style={{ background: '#fff', borderColor: '#F1F5F9' }}>
                <span className="text-xs font-black w-5 text-center flex-shrink-0" style={{ color: '#CBD5E1' }}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>{t.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                    {t.suggestedBy?.name ? `by ${t.suggestedBy.name}` : 'Resident'}
                    {' · '}{t.votes?.length || 0} vote{t.votes?.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <a href={`https://youtube.com/watch?v=${t.videoId}`} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 flex-shrink-0 transition-colors" style={{ color: '#CBD5E1' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#EC4899'}
                  onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}>
                  <Music size={13} />
                </a>
                <button onClick={() => handleRemove(t._id)}
                  className="p-1.5 rounded-lg flex-shrink-0 transition-all hover:bg-red-50" style={{ color: '#CBD5E1' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                  onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-bold" style={{ color: '#0F172A' }}>DJ Playlist</h3>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: '#94A3B8', background: '#F1F5F9' }}>
            {defaultTracks.length}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: '#94A3B8', background: '#F1F5F9' }}>Auto-seeded</span>
        </div>
        {defaultTracks.length === 0 ? (
          <div className="rounded-2xl p-6 text-center text-sm border" style={{ color: '#94A3B8', borderColor: '#F1F5F9' }}>
            No default tracks. Click "Reset Playlist" to seed.
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {visibleDefaults.map((t, i) => (
                <div key={t._id} className="rounded-xl p-3 flex items-center gap-3 border"
                  style={{ background: '#fff', borderColor: '#F1F5F9' }}>
                  <span className="text-xs font-black w-5 text-center flex-shrink-0" style={{ color: '#CBD5E1' }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>{t.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                      {t.artist || 'Estate DJ Mix'} · {t.votes?.length || 0} vote{t.votes?.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <a href={`https://youtube.com/watch?v=${t.videoId}`} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 flex-shrink-0 transition-colors" style={{ color: '#CBD5E1' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#EC4899'}
                    onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}>
                    <Music size={13} />
                  </a>
                  <button onClick={() => handleRemove(t._id)}
                    className="p-1.5 rounded-lg flex-shrink-0 transition-all hover:bg-red-50" style={{ color: '#CBD5E1' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            {visibleDefaults.length < defaultTracks.length && (
              <button onClick={() => setDefaultsPage(p => p + 1)}
                className="w-full mt-3 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs border"
                style={{ color: '#94A3B8', borderColor: '#E2E8F0', background: '#F8FAFC' }}>
                <ChevronDown size={14} />
                Load {Math.min(DJ_PAGE_SIZE, defaultTracks.length - visibleDefaults.length)} more
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────

const TABS = [
  { key: 'feed',       Icon: Activity,    label: 'Live Feed',   color: '#10B981' },
  { key: 'events',     Icon: Calendar,    label: 'Events',      color: '#F59E0B' },
  { key: 'activities', Icon: Zap,         label: 'Activities',  color: '#6366F1' },
  { key: 'polls',      Icon: BarChart2,   label: 'Polls',       color: '#6366F1' },
  { key: 'music',      Icon: Music,       label: 'Music',       color: '#EC4899' },
];

export default function LoungeManager() {
  const [tab, setTab] = useState('feed');
  const active = TABS.find(t => t.key === tab);

  return (
    <div className="space-y-5 animate-fade-in pb-12">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#0F172A' }}>
          <PartyPopper size={22} className="text-emerald-500" /> Community Lounge
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>
          The social heart of your estate — events, activities, polls and music
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-2xl p-1 overflow-x-auto"
        style={{ background: '#F1F5F9', scrollbarWidth: 'none' }}>
        {TABS.map(({ key, Icon, label, color }) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0"
            style={tab === key
              ? { background: '#FFFFFF', color: color, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
              : { color: '#94A3B8' }}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === 'feed'       && <FeedTab onTabChange={setTab} />}
      {tab === 'events'     && <EventsTab />}
      {tab === 'activities' && <ActivitiesTab />}
      {tab === 'polls'      && <PollsTab />}
      {tab === 'music'      && <MusicTab />}
    </div>
  );
}
