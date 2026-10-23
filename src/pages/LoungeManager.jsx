import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Music, Calendar, BarChart2, Plus, Trash2, X,
  RefreshCw, Check, Lock, Users, Shuffle, ChevronDown,
  Pin, Eye, EyeOff, Zap, TrendingUp, Activity,
  MessageCircle, Trophy, ShoppingBag, Newspaper, Lightbulb,
  Dumbbell, Handshake, PartyPopper, Mic, Radio, Play, Headphones,
} from 'lucide-react';
import { eventAPI, pollAPI, loungeAPI, djAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import DJLive from '../components/DJLive';
import Portal from '../components/ui/Portal';
import Feed from '../components/lounge/Feed';
import { LoungeBanner, LoungeNav, LoungeRightRail, EventsDesktop } from '../components/lounge/LoungeDesktop';
import useIsDesktop from '../hooks/useIsDesktop';
import useFillHeight from '../hooks/useFillHeight';

// ── Helpers ────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: '12px',
  background: '#F8FAFC', border: '1px solid #E2E8F0',
  fontSize: '14px', color: '#0F172A', outline: 'none',
};

// ── Activity types & defaults ─────────────────────────────────────
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
  { id:'da_1', type:'fitness',     pinned:true,  visible:true, day:'Daily',   title:'Morning Walk Club',         desc:'7:00 AM at the estate gate. All fitness levels welcome — let\'s get those steps in together!' },
  { id:'da_2', type:'icebreaker',  pinned:true,  visible:true, day:'Daily',   title:'Icebreaker of the Day',     desc:'What\'s one skill you have that most of your neighbours probably don\'t know about?' },
  { id:'da_3', type:'challenge',   pinned:false, visible:true, day:'Daily',   title:'10,000 Steps Challenge',    desc:'Can you hit 10,000 steps today? Share your progress with the community!' },
  { id:'da_4', type:'networking',  pinned:false, visible:true, day:'Weekly',  title:'Neighbour Spotlight',       desc:'Say hello to a neighbour you haven\'t met yet this week.' },
  { id:'da_5', type:'tip',         pinned:false, visible:true, day:'Daily',   title:'Estate Tip of the Day',     desc:'Keep shared corridors clear at all times for emergency access and neighbour courtesy.' },
  { id:'da_6', type:'social',      pinned:false, visible:true, day:'Weekly',  title:'Friday Night FunTimes',     desc:'Community bonding every Friday evening at the Estate Clubhouse, 7 PM.' },
  { id:'da_7', type:'marketplace', pinned:false, visible:true, day:'Weekly',  title:'Marketplace Monday',        desc:'New week, new listings! Check out what your neighbours are offering.' },
  { id:'da_8', type:'news',        pinned:false, visible:true, day:'Daily',   title:'Estate Update Board',       desc:'Check Announcements for this week\'s maintenance schedule and community updates.' },
  { id:'da_9', type:'fitness',     pinned:false, visible:true, day:'Weekly',  title:'Weekend Yoga Session',      desc:'Outdoor yoga every Saturday at 8 AM by the estate pool area. Bring your own mat!' },
  { id:'da_10',type:'networking',  pinned:false, visible:true, day:'Monthly', title:'Residents\' Mixer',         desc:'Monthly get-together for new and old residents to meet, mingle and build community bonds.' },
  { id:'da_11',type:'challenge',   pinned:false, visible:true, day:'Weekly',  title:'Community Clean-Up Drive',  desc:'Join residents this weekend for a 30-minute shared-space tidy-up. Gloves provided!' },
  { id:'da_12',type:'social',      pinned:false, visible:true, day:'Daily',   title:'Good Morning Wall',         desc:'Drop a good morning in the community chat. Positivity is contagious!' },
];

const ACTS_KEY = 'ac_lounge_activities';
function loadActivities() { try { return JSON.parse(localStorage.getItem(ACTS_KEY)) || DEFAULT_ACTIVITIES; } catch { return DEFAULT_ACTIVITIES; } }
function saveActivities(a) { localStorage.setItem(ACTS_KEY, JSON.stringify(a)); }

// ── Activities Tab ────────────────────────────────────────────────
function ActivitiesTab() {
  const [activities, setActivities] = useState(loadActivities);
  const [filter, setFilter]         = useState('all');
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState({ type:'fitness', title:'', desc:'', day:'Daily' });

  const persist    = (u) => { setActivities(u); saveActivities(u); };
  const togglePin  = (id) => persist(activities.map(a => a.id === id ? { ...a, pinned: !a.pinned } : a));
  const toggleVis  = (id) => persist(activities.map(a => a.id === id ? { ...a, visible: !a.visible } : a));
  const remove     = (id) => persist(activities.filter(a => a.id !== id));

  const handleCreate = (e) => {
    e.preventDefault();
    persist([{ ...form, id:`custom_${Date.now()}`, pinned:false, visible:true, isCustom:true }, ...activities]);
    setShowForm(false);
    setForm({ type:'fitness', title:'', desc:'', day:'Daily' });
    toast.success('Activity added');
  };

  const filtered = filter === 'all' ? activities : activities.filter(a => a.type === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm" style={{ color:'#94A3B8' }}>
          <span style={{ color:'#10B981', fontWeight:700 }}>{activities.filter(a=>a.visible).length}</span> visible &nbsp;·&nbsp;
          <span style={{ color:'#F59E0B', fontWeight:700 }}>{activities.filter(a=>a.pinned).length}</span> pinned
        </p>
        <div className="flex gap-2">
          <button onClick={() => { persist(DEFAULT_ACTIVITIES); toast.success('Reset to defaults'); }}
            className="text-xs px-3 py-1.5 rounded-xl border" style={{ color:'#94A3B8', borderColor:'#E2E8F0', background:'#F8FAFC' }}>
            Reset
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold" style={{ background:'#10B981' }}>
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {['all', ...ACTIVITY_TYPES.map(t => t.id)].map(id => {
          const t = typeMap[id];
          return (
            <button key={id} onClick={() => setFilter(id)}
              className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
              style={filter === id
                ? { background: t ? t.color : '#0F172A', color:'#fff', borderColor: t ? t.color : '#0F172A' }
                : { color:'#64748B', borderColor:'#E2E8F0', background:'#fff' }}>
              {t ? `${t.emoji} ${t.label}` : 'All'}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map(act => {
          const t = typeMap[act.type] || ACTIVITY_TYPES[0];
          return (
            <div key={act.id} className="rounded-2xl p-4 border transition-all"
              style={{ background: act.visible ? t.bg : '#F8FAFC', borderColor: act.visible ? t.color+'30' : '#E2E8F0', opacity: act.visible ? 1 : 0.6 }}>
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">{t.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: t.color+'20', color: t.color }}>{t.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full border" style={{ color:'#94A3B8', borderColor:'#E2E8F0', background:'#fff' }}>{act.day}</span>
                    {act.pinned && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background:'#FFFBEB', color:'#D97706' }}>📌 Pinned</span>}
                    {act.isCustom && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background:'#ECFDF5', color:'#10B981' }}>Custom</span>}
                  </div>
                  <p className="text-sm font-bold leading-snug mb-1" style={{ color: act.visible ? '#0F172A' : '#94A3B8' }}>{act.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color:'#64748B' }}>{act.desc}</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t" style={{ borderColor: t.color+'20' }}>
                <button onClick={() => togglePin(act.id)} title={act.pinned ? 'Unpin' : 'Pin'}
                  className="p-1.5 rounded-lg transition-all"
                  style={act.pinned ? { color:'#D97706', background:'#FFFBEB' } : { color:'#94A3B8' }}>
                  <Pin size={13} />
                </button>
                <button onClick={() => toggleVis(act.id)} className="p-1.5 rounded-lg transition-all"
                  style={act.visible ? { color:'#10B981', background:'#ECFDF5' } : { color:'#94A3B8' }}>
                  {act.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
                <button onClick={() => remove(act.id)} className="p-1.5 rounded-lg hover:bg-red-50" style={{ color:'#CBD5E1' }}
                  onMouseEnter={e => e.currentTarget.style.color='#EF4444'}
                  onMouseLeave={e => e.currentTarget.style.color='#CBD5E1'}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <Portal>
        <div className="fixed inset-0 z-[100] overlay-scrim flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl p-6 bg-white shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold" style={{ color:'#0F172A' }}>New Activity</h2>
              <button onClick={() => setShowForm(false)} style={{ color:'#94A3B8' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs block mb-1.5 font-medium" style={{ color:'#64748B' }}>Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {ACTIVITY_TYPES.map(t => (
                    <button key={t.id} type="button" onClick={() => setForm(p=>({...p,type:t.id}))}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-all"
                      style={form.type===t.id ? { background:t.color, color:'#fff', borderColor:t.color } : { color:'#64748B', borderColor:'#E2E8F0', background:'#fff' }}>
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs block mb-1 font-medium" style={{ color:'#64748B' }}>Title *</label>
                <input required value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs block mb-1 font-medium" style={{ color:'#64748B' }}>Description *</label>
                <textarea required rows={3} value={form.desc} onChange={e=>setForm(p=>({...p,desc:e.target.value}))} style={{...inputStyle,resize:'none'}} />
              </div>
              <div>
                <label className="text-xs block mb-1 font-medium" style={{ color:'#64748B' }}>Frequency</label>
                <div className="flex gap-2">
                  {['Daily','Weekly','Monthly','One-time'].map(d => (
                    <button key={d} type="button" onClick={() => setForm(p=>({...p,day:d}))}
                      className="flex-1 py-1.5 rounded-xl text-xs font-semibold border"
                      style={form.day===d ? { background:'#0F172A', color:'#fff', borderColor:'#0F172A' } : { color:'#64748B', borderColor:'#E2E8F0' }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm" style={{ background:'#F1F5F9', color:'#475569' }}>Cancel</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold" style={{ background:'#10B981' }}>
                  Add Activity
                </button>
              </div>
            </form>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}

// ── Events Tab ────────────────────────────────────────────────────
const EVENT_CATEGORIES = [
  { id:'general',    label:'General',    color:'#6366F1', emoji:'📅' },
  { id:'fitness',    label:'Fitness',    color:'#0EA5E9', emoji:'🏃' },
  { id:'social',     label:'Social',     color:'#EC4899', emoji:'🎉' },
  { id:'networking', label:'Networking', color:'#8B5CF6', emoji:'🤝' },
  { id:'maintenance',label:'Maintenance',color:'#F59E0B', emoji:'🔧' },
  { id:'kids',       label:'Kids',       color:'#F97316', emoji:'👶' },
];
const catMap = Object.fromEntries(EVENT_CATEGORIES.map(c => [c.id, c]));

function EventsTab({ desktop = false, createSignal = 0 }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title:'', description:'', date:'', time:'', location:'', organizer:'', category:'general', isFridayFunTimes:false });

  const load = useCallback(() => {
    setLoading(true);
    eventAPI.getAll().then(({data}) => setEvents(data.data)).catch(() => toast.error('Failed to load events')).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (createSignal) setShowForm(true); }, [createSignal]);

  const removeEvent = async (id) => {
    try { await eventAPI.delete(id); setEvents(prev => prev.filter(e => e._id !== id)); toast.success('Removed'); }
    catch { toast.error('Failed to remove'); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const {data} = await eventAPI.create(form);
      setEvents(prev => [data.data, ...prev]);
      setShowForm(false);
      setForm({ title:'', description:'', date:'', time:'', location:'', organizer:'', category:'general', isFridayFunTimes:false });
      toast.success('Event created');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const upcoming = events.filter(e => new Date(e.date) >= new Date()).sort((a,b) => new Date(a.date)-new Date(b.date));
  const past     = events.filter(e => new Date(e.date) < new Date()).sort((a,b) => new Date(b.date)-new Date(a.date));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color:'#94A3B8' }}>{upcoming.length} upcoming · {past.length} past</p>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-sm" style={{ background:'#10B981' }}>
          <Plus size={14} /> New Event
        </button>
      </div>

      {loading ? <div className="flex justify-center py-8"><RefreshCw size={18} className="text-emerald-500 animate-spin" /></div>
       : events.length === 0 ? <div className="rounded-2xl p-10 text-center text-sm border" style={{ color:'#94A3B8', borderColor:'#F1F5F9' }}>No events yet. Create the first one!</div>
       : desktop ? (
        <EventsDesktop upcoming={upcoming} past={past} catMap={catMap} onDelete={removeEvent} onNew={() => setShowForm(true)} />
       ) : (
        <div className="space-y-3">
          {upcoming.map(ev => {
            const cat = catMap[ev.category] || catMap['general'];
            return (
              <div key={ev._id} className="rounded-2xl p-4 border flex items-start gap-4"
                style={{ background:'#fff', borderColor: ev.isFridayFunTimes ? '#FDE68A' : '#F1F5F9' }}>
                <div className="w-12 h-12 rounded-2xl flex-shrink-0 flex flex-col items-center justify-center"
                  style={{ background: ev.isFridayFunTimes ? '#FFFBEB' : cat.color+'15' }}>
                  <span className="text-[10px] font-bold uppercase" style={{ color: ev.isFridayFunTimes ? '#D97706' : cat.color }}>
                    {new Date(ev.date).toLocaleDateString('en',{month:'short'})}
                  </span>
                  <span className="text-lg font-black leading-none" style={{ color: ev.isFridayFunTimes ? '#D97706' : '#0F172A' }}>
                    {new Date(ev.date).getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: cat.color+'15', color: cat.color }}>{cat.emoji} {cat.label}</span>
                    {ev.isFridayFunTimes && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background:'#FFFBEB', color:'#D97706' }}>🎉 FunTimes</span>}
                  </div>
                  <p className="text-sm font-bold" style={{ color:'#0F172A' }}>{ev.title}</p>
                  <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>{ev.time && `${ev.time} · `}{ev.location || 'Estate Grounds'}</p>
                  <p className="text-xs mt-1 flex items-center gap-1" style={{ color:'#10B981' }}>
                    <Users size={10} /> {ev.rsvps?.length || 0} going
                  </p>
                </div>
                <button onClick={async () => { await eventAPI.delete(ev._id); setEvents(prev => prev.filter(e=>e._id!==ev._id)); toast.success('Removed'); }}
                  className="p-1.5 rounded-lg flex-shrink-0 hover:bg-red-50" style={{ color:'#CBD5E1' }}
                  onMouseEnter={e=>e.currentTarget.style.color='#EF4444'}
                  onMouseLeave={e=>e.currentTarget.style.color='#CBD5E1'}>
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
          {past.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2 mt-5" style={{ color:'#94A3B8' }}>Past</p>
              {past.slice(0,3).map(ev => (
                <div key={ev._id} className="rounded-xl p-3 flex items-center gap-3 mb-2" style={{ background:'#F8FAFC', opacity:.7 }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color:'#64748B' }}>{ev.title}</p>
                    <p className="text-xs mt-0.5" style={{ color:'#94A3B8' }}>{new Date(ev.date).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'})} · {ev.rsvps?.length||0} attended</p>
                  </div>
                  <button onClick={async () => { await eventAPI.delete(ev._id); setEvents(prev=>prev.filter(e=>e._id!==ev._id)); }} className="p-1.5 rounded-lg hover:bg-red-50" style={{ color:'#CBD5E1' }} onMouseEnter={e=>e.currentTarget.style.color='#EF4444'} onMouseLeave={e=>e.currentTarget.style.color='#CBD5E1'}><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <Portal>
        <div className="fixed inset-0 z-[100] overlay-scrim flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl p-6 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold" style={{ color:'#0F172A' }}>New Event</h2>
              <button onClick={() => setShowForm(false)} style={{ color:'#94A3B8' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs block mb-1.5 font-medium" style={{ color:'#64748B' }}>Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {EVENT_CATEGORIES.map(c => (
                    <button key={c.id} type="button" onClick={() => setForm(p=>({...p,category:c.id}))}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-all"
                      style={form.category===c.id ? { background:c.color,color:'#fff',borderColor:c.color } : { color:'#64748B',borderColor:'#E2E8F0',background:'#fff' }}>
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="text-xs block mb-1 font-medium" style={{color:'#64748B'}}>Title *</label><input required value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} style={inputStyle} /></div>
              <div className="flex gap-2">
                <div className="flex-1"><label className="text-xs block mb-1 font-medium" style={{color:'#64748B'}}>Date *</label><input required type="date" min={new Date().toISOString().split('T')[0]} value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={inputStyle} /></div>
                <div className="w-28"><label className="text-xs block mb-1 font-medium" style={{color:'#64748B'}}>Time</label><input type="time" value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))} style={inputStyle} /></div>
              </div>
              <div><label className="text-xs block mb-1 font-medium" style={{color:'#64748B'}}>Location</label><input value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} style={inputStyle} placeholder="Estate Grounds" /></div>
              <div><label className="text-xs block mb-1 font-medium" style={{color:'#64748B'}}>Organizer</label><input value={form.organizer} onChange={e=>setForm(p=>({...p,organizer:e.target.value}))} style={inputStyle} /></div>
              <div><label className="text-xs block mb-1 font-medium" style={{color:'#64748B'}}>Description</label><textarea rows={2} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} style={{...inputStyle,resize:'none'}} /></div>
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setForm(p=>({...p,isFridayFunTimes:!p.isFridayFunTimes}))} className="w-5 h-5 rounded flex items-center justify-center" style={{ background:form.isFridayFunTimes?'#F59E0B':'#E2E8F0' }}>
                  {form.isFridayFunTimes && <Check size={12} className="text-white" />}
                </div>
                <span className="text-sm" style={{color:'#475569'}}>🎉 Friday Night FunTimes</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm" style={{background:'#F1F5F9',color:'#475569'}}>Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2" style={{background:'#10B981'}}>
                  {saving ? <RefreshCw size={13} className="animate-spin" /> : <Calendar size={13} />} Create
                </button>
              </div>
            </form>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}

// ── Polls Tab ─────────────────────────────────────────────────────
function PollsTab({ createSignal = 0 }) {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ question:'', options:['',''], endsAt:'', allowMultiple:false });

  useEffect(() => {
    pollAPI.getAll().then(({data}) => setPolls(data.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (createSignal) setShowForm(true); }, [createSignal]);

  const setOption=(i,v)=>setForm(p=>{const o=[...p.options];o[i]=v;return{...p,options:o};});

  const handleCreate = async (e) => {
    e.preventDefault();
    const opts=form.options.filter(o=>o.trim());
    if(opts.length<2){toast.error('Need at least 2 options');return;}
    setSaving(true);
    try {
      const {data}=await pollAPI.create({...form,options:opts});
      setPolls(prev=>[data.data,...prev]);
      setShowForm(false);
      setForm({question:'',options:['',''],endsAt:'',allowMultiple:false});
      toast.success('Poll created');
    } catch(err){toast.error(err.response?.data?.message||'Failed');}
    finally{setSaving(false);}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{color:'#94A3B8'}}>{polls.length} polls</p>
        <button onClick={()=>setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-sm" style={{background:'#10B981'}}>
          <Plus size={14} /> New Poll
        </button>
      </div>
      {loading ? <div className="flex justify-center py-8"><RefreshCw size={18} className="text-emerald-500 animate-spin" /></div>
       : polls.length===0 ? <div className="rounded-2xl p-10 text-center text-sm border" style={{color:'#94A3B8',borderColor:'#F1F5F9'}}>No polls yet.</div>
       : (
        <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start">
          {polls.map(poll => {
            const total=poll.options.reduce((s,o)=>s+o.votes.length,0);
            const isEnded=!poll.isActive||(poll.endsAt&&new Date()>new Date(poll.endsAt));
            const leading=poll.options.reduce((a,b)=>a.votes.length>=b.votes.length?a:b,poll.options[0]);
            return (
              <div key={poll._id} className="rounded-2xl p-4 border" style={{background:'#fff',borderColor:'#F1F5F9'}}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{color:'#0F172A'}}>{poll.question}</p>
                    <p className="text-xs mt-0.5" style={{color:'#94A3B8'}}>{total} vote{total!==1?'s':''}</p>
                  </div>
                  {isEnded
                    ? <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{color:'#94A3B8',background:'#F1F5F9'}}><Lock size={9}/> Closed</span>
                    : <button onClick={async()=>{const{data}=await pollAPI.close(poll._id);setPolls(prev=>prev.map(p=>p._id===poll._id?data.data:p));}} className="text-xs px-2.5 py-1 rounded-lg flex-shrink-0 font-semibold" style={{color:'#EF4444',background:'#FEF2F2'}}>Close</button>
                  }
                </div>
                <div className="space-y-2">
                  {poll.options.map((opt,i)=>{
                    const pct=total?Math.round((opt.votes.length/total)*100):0;
                    const isTop=opt===leading&&total>0;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium flex items-center gap-1" style={{color:isTop?'#0F172A':'#64748B'}}>
                            {isTop&&<TrendingUp size={10} style={{color:'#10B981'}}/>}{opt.text}
                          </span>
                          <span className="text-xs font-bold" style={{color:isTop?'#10B981':'#94A3B8'}}>{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{background:'#F1F5F9'}}>
                          <div className="h-full rounded-full transition-all duration-500" style={{width:`${pct}%`,background:isTop?'#10B981':'#CBD5E1'}}/>
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
        <Portal>
        <div className="fixed inset-0 z-[100] overlay-scrim flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl p-6 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold" style={{color:'#0F172A'}}>New Poll</h2>
              <button onClick={()=>setShowForm(false)} style={{color:'#94A3B8'}}><X size={18}/></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="text-xs block mb-1 font-medium" style={{color:'#64748B'}}>Question *</label><textarea required rows={2} value={form.question} onChange={e=>setForm(p=>({...p,question:e.target.value}))} style={{...inputStyle,resize:'none'}}/></div>
              <div>
                <label className="text-xs block mb-2 font-medium" style={{color:'#64748B'}}>Options * (min 2)</label>
                {form.options.map((opt,i)=>(
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input value={opt} onChange={e=>setOption(i,e.target.value)} placeholder={`Option ${i+1}`} style={inputStyle}/>
                    {form.options.length>2&&<button type="button" onClick={()=>setForm(p=>({...p,options:p.options.filter((_,j)=>j!==i)}))} style={{color:'#CBD5E1'}}><X size={13}/></button>}
                  </div>
                ))}
                {form.options.length<6&&<button type="button" onClick={()=>setForm(p=>({...p,options:[...p.options,'']}))} className="text-xs flex items-center gap-1" style={{color:'#10B981'}}><Plus size={11}/> Add option</button>}
              </div>
              <div><label className="text-xs block mb-1 font-medium" style={{color:'#64748B'}}>End Date (optional)</label><input type="datetime-local" value={form.endsAt} onChange={e=>setForm(p=>({...p,endsAt:e.target.value}))} style={inputStyle}/></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm" style={{background:'#F1F5F9',color:'#475569'}}>Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold" style={{background:'#10B981'}}>
                  {saving?<RefreshCw size={13} className="animate-spin"/>:'Create Poll'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}

// ── Music Tab ─────────────────────────────────────────────────────
function MusicTab() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [defaultsPage, setDefaultsPage] = useState(1);
  const [activeDJ, setActiveDJ] = useState(null);
  const [mixtapes, setMixtapes] = useState([]);
  const DJ_PAGE = 10;

  const load = useCallback(() => {
    setLoading(true);
    loungeAPI.getSession().then(({data})=>setSession(data.data)).catch(()=>toast.error('Failed to load')).finally(()=>setLoading(false));
    djAPI.getActive().then(({data})=>setActiveDJ(data.data)).catch(()=>{});
    djAPI.listMixtapes().then(({data})=>setMixtapes(data.data || [])).catch(()=>{});
  },[]);
  useEffect(()=>{load();},[load]);

  const handleDeleteMixtape = async (m) => {
    if (!confirm(`Delete "${m.title}" from the archive? This can't be undone.`)) return;
    try { await djAPI.deleteMixtape(m._id); setMixtapes(prev=>prev.filter(x=>x._id!==m._id)); toast.success('Removed from archive'); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed to delete'); }
  };

  const handleRemove = async (id) => {
    try { await loungeAPI.remove(id); setSession(prev=>prev?{...prev,suggestions:prev.suggestions.filter(s=>s._id!==id)}:prev); toast.success('Removed'); }
    catch { toast.error('Failed'); }
  };

  const queue=[ ...(session?.suggestions||[]) ].sort((a,b)=>b.votes.length-a.votes.length);
  const communityTracks=queue.filter(t=>!t.isDefault);
  const defaultTracks=queue.filter(t=>t.isDefault);
  const visibleDefaults=defaultTracks.slice(0,defaultsPage*DJ_PAGE);

  if(loading) return <div className="flex justify-center py-8"><RefreshCw size={18} className="text-pink-500 animate-spin"/></div>;

  return (
    <div className="space-y-6">
      {/* ── Live now banner (announcements show on /announcements instead) ─── */}
      <DJLive only="not-announcement" />

      {/* ── Go Live / Live DJ hero ─────────────────────────────── */}
      <div className="rounded-2xl p-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)', color: '#fff' }}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20" style={{ background: 'rgba(255,255,255,0.4)' }} />
        <div className="relative flex items-center gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)' }}>
            {activeDJ ? <Radio size={22} /> : <Mic size={22} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold tracking-[0.14em] uppercase opacity-80">
              {activeDJ ? (activeDJ.hostUserId === user?._id ? 'Your set is live' : 'A resident is live') : 'Lounge Radio'}
            </div>
            <div className="text-lg font-extrabold leading-tight">
              {activeDJ
                ? (activeDJ.hostUserId === user?._id ? 'Open your decks' : `${activeDJ.hostName} is on air`)
                : 'Go live as DJ or make an announcement'}
            </div>
            <div className="text-xs opacity-85 mt-0.5">
              {activeDJ
                ? (activeDJ.hostUserId === user?._id ? 'Finish the set or change track.' : 'Tune in from the banner above, or start an announcement to override.')
                : "Play tracks and talk live, or push an urgent announcement to the whole estate."}
            </div>
          </div>
          <button onClick={()=>navigate('/lounge/dj')}
            className="px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 whitespace-nowrap"
            style={{ background: '#fff', color: '#047857' }}>
            {activeDJ && activeDJ.hostUserId === user?._id
              ? <><Radio size={14}/> Open decks</>
              : <><Mic size={14}/> Go live</>}
          </button>
        </div>
      </div>

      {/* ── Mixtape archive ─────────────────────────────────────── */}
      {mixtapes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Headphones size={14} className="text-emerald-500" />
            <h3 className="text-sm font-bold" style={{ color: '#0F172A' }}>Mixtape Archive</h3>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: '#94A3B8', background: '#F1F5F9' }}>{mixtapes.length}</span>
          </div>
          <div className="space-y-2">
            {mixtapes.slice(0, 5).map(m => (
              <div key={m._id} className="rounded-xl p-3 flex items-center gap-3 border" style={{ background:'#fff', borderColor:'#F1F5F9' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.12)', color: '#059669' }}>
                  <Play size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>{m.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                    {m.hostName} · {Math.round((m.totalDurationSec || 0) / 60)} min · {m.setlist?.length || 0} tracks · {m.peakListeners || 0} peak
                  </p>
                </div>
                <button onClick={() => handleDeleteMixtape(m)} title="Delete from archive" aria-label="Delete from archive"
                  className="p-1.5 rounded-lg hover:bg-red-50 flex-shrink-0" style={{ color:'#CBD5E1' }}
                  onMouseEnter={e => e.currentTarget.style.color='#EF4444'}
                  onMouseLeave={e => e.currentTarget.style.color='#CBD5E1'}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={async()=>{const next=!session?.isAutoDJ;const{data}=await loungeAPI.updateMood({isAutoDJ:next});setSession(data.data);toast.success(`AutoDJ ${next?'on':'off'}`);}}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border"
          style={session?.isAutoDJ?{color:'#059669',borderColor:'rgba(16,185,129,0.4)',background:'rgba(16,185,129,0.08)'}:{color:'#94A3B8',borderColor:'#E2E8F0',background:'#F8FAFC'}}>
          <Shuffle size={12}/> AutoDJ {session?.isAutoDJ?'On':'Off'}
        </button>
        <button onClick={load} style={{color:'#94A3B8'}}><RefreshCw size={14}/></button>
        <button onClick={async()=>{await loungeAPI.resetDefaults();load();toast.success('Playlist reset');}} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border" style={{background:'#F8FAFC',borderColor:'#E2E8F0',color:'#475569'}}>
          <RefreshCw size={12}/> Reset
        </button>
      </div>

      {[{label:'Community Queue',tracks:communityTracks},{label:'DJ Playlist',tracks:visibleDefaults,auto:true}].map(({label,tracks,auto})=>(
        <div key={label}>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-bold" style={{color:'#0F172A'}}>{label}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{color:'#94A3B8',background:'#F1F5F9'}}>{auto?defaultTracks.length:tracks.length}</span>
            {auto&&<span className="text-xs px-2 py-0.5 rounded-full" style={{color:'#94A3B8',background:'#F1F5F9'}}>Auto-seeded</span>}
          </div>
          {tracks.length===0?<div className="rounded-2xl p-6 text-center text-sm border" style={{color:'#94A3B8',borderColor:'#F1F5F9'}}>No tracks yet</div>:(
            <div className="space-y-2">
              {tracks.map((t,i)=>(
                <div key={t._id} className="rounded-xl p-3 flex items-center gap-3 border" style={{background:'#fff',borderColor:'#F1F5F9'}}>
                  <span className="text-xs font-black w-5 text-center flex-shrink-0" style={{color:'#CBD5E1'}}>{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{color:'#0F172A'}}>{t.title}</p>
                    <p className="text-xs mt-0.5" style={{color:'#94A3B8'}}>{t.artist||t.suggestedBy?.name||'Resident'} · {t.votes?.length||0} votes</p>
                  </div>
                  <a href={`https://youtube.com/watch?v=${t.videoId}`} target="_blank" rel="noopener noreferrer" className="p-1.5 flex-shrink-0" style={{color:'#CBD5E1'}} onMouseEnter={e=>e.currentTarget.style.color='#059669'} onMouseLeave={e=>e.currentTarget.style.color='#CBD5E1'}><Music size={13}/></a>
                  <button onClick={()=>handleRemove(t._id)} className="p-1.5 rounded-lg hover:bg-red-50 flex-shrink-0" style={{color:'#CBD5E1'}} onMouseEnter={e=>e.currentTarget.style.color='#EF4444'} onMouseLeave={e=>e.currentTarget.style.color='#CBD5E1'}><Trash2 size={13}/></button>
                </div>
              ))}
              {auto&&visibleDefaults.length<defaultTracks.length&&(
                <button onClick={()=>setDefaultsPage(p=>p+1)} className="w-full mt-2 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs border" style={{color:'#94A3B8',borderColor:'#E2E8F0',background:'#F8FAFC'}}>
                  <ChevronDown size={14}/> Load more
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
const TABS = [
  { key:'feed',       Icon:Activity,  label:'Feed',       color:'#10B981' },
  { key:'events',     Icon:Calendar,  label:'Events',     color:'#0D9488' },
  { key:'activities', Icon:Zap,       label:'Activities', color:'#059669' },
  { key:'polls',      Icon:BarChart2, label:'Polls',      color:'#16A34A' },
  { key:'music',      Icon:Music,     label:'Music',      color:'#047857' },
];

// ── Friday countdown ──────────────────────────────────────────────
function getNextFriday() {
  const now = new Date();
  const daysUntil = ((5 - now.getDay() + 7) % 7) || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntil);
  next.setHours(18, 0, 0, 0);
  return next;
}

function useCountdown(target) {
  const [diff, setDiff] = useState(target - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDiff(target - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  const totalSec = Math.max(0, Math.floor(diff / 1000));
  return {
    d: Math.floor(totalSec / 86400),
    h: Math.floor((totalSec % 86400) / 3600),
    m: Math.floor((totalSec % 3600) / 60),
    s: totalSec % 60,
  };
}

// Same social hub as the residents' Lounge (shared feed + stories via
// components/lounge), plus manager tools on the Events/Activities/Polls/Music tabs.
export default function LoungeManager() {
  const [tab, setTab] = useState('feed');
  const { user } = useAuth();

  const now           = new Date();
  const isFridayNight = now.getDay() === 5 && now.getHours() >= 18;
  const countdown     = useCountdown(getNextFriday().getTime());
  const pad           = n => String(n).padStart(2, '0');
  const isDesktop     = useIsDesktop();
  const [createSignal, setCreateSignal] = useState({ events: 0, polls: 0 });
  const createIn = (key) => { setTab(key); setCreateSignal(c => ({ ...c, [key]: c[key] + 1 })); };
  const shellRef    = useRef(null);
  const centreRef   = useRef(null);
  const shellHeight = useFillHeight(shellRef, isDesktop);
  const switchTab   = (key) => { setTab(key); centreRef.current?.scrollTo({ top: 0 }); };

  // Desktop: banner + side rails stay put; only the centre column scrolls.
  if (isDesktop) return (
    <div ref={shellRef} className="max-w-[1400px] mx-auto flex flex-col gap-5 overflow-hidden"
      style={{ height: shellHeight ?? 'calc(100vh - 4rem)' }}>
      <div className="flex-none"><LoungeBanner isFridayNight={isFridayNight} countdown={countdown} /></div>
      <div className="flex-1 min-h-0 grid grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_300px] gap-6">
        <div className="h-full min-h-0 overflow-y-auto no-scrollbar">
          <LoungeNav tabs={TABS} tab={tab} onTab={switchTab} onCreate={(key) => { createIn(key); centreRef.current?.scrollTo({ top: 0 }); }} />
        </div>
        <div ref={centreRef} data-lounge-scroll
          className={`h-full min-h-0 min-w-0 overflow-y-auto overscroll-contain pr-1 pb-8 ${tab === 'feed' ? '' : 'xl:col-span-2'}`}>
          {tab === 'feed'       && <Feed me={user} />}
          {tab === 'events'     && <EventsTab desktop createSignal={createSignal.events} />}
          {tab === 'activities' && <ActivitiesTab />}
          {tab === 'polls'      && <PollsTab createSignal={createSignal.polls} />}
          {tab === 'music'      && <MusicTab />}
        </div>
        {tab === 'feed' && (
          <div className="hidden xl:block h-full min-h-0 overflow-y-auto no-scrollbar pb-2">
            <LoungeRightRail onTab={switchTab} catMap={catMap} />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in pb-12 -mt-4 md:-mt-6 lg:-mt-8">
      {/* Sticky header + tabs. Offsets cancel <main>'s padding so no see-through strip shows on top. */}
      <div className="sticky -top-4 md:-top-6 lg:-top-8 z-30 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 pt-3 pb-2 bg-white/90 backdrop-blur-xl border-b border-slate-100">
        <div className="flex items-center justify-between gap-3 max-w-[960px] mx-auto">
          <h1 className="text-[26px] font-black tracking-tight leading-none"
            style={{ background: 'linear-gradient(90deg,#10B981,#059669)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
            Lounge
          </h1>
          {isFridayNight ? (
            <span className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white animate-pulse"
              style={{ background: 'linear-gradient(90deg,#F59E0B,#EF4444)' }}>
              🎉 Friday Night is LIVE
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold text-slate-600 bg-slate-100 tabular-nums" title="Friday Night FunTimes">
              🎉 Fri night in {countdown.d > 0 ? `${countdown.d}d ` : ''}{pad(countdown.h)}:{pad(countdown.m)}:{pad(countdown.s)}
            </span>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar mt-3 max-w-[960px] mx-auto">
          {TABS.map(({ key, Icon, label }) => {
            const active = tab === key;
            return (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all shrink-0 ${active ? 'text-white shadow-sm' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'}`}
                style={active ? { background: 'linear-gradient(90deg,#10B981,#059669)' } : undefined}>
                <Icon size={15} /> {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="pt-4">
        {tab === 'feed'       && <Feed me={user} />}
        {tab === 'events'     && <div className="max-w-[960px] mx-auto"><EventsTab /></div>}
        {tab === 'activities' && <div className="max-w-[960px] mx-auto"><ActivitiesTab /></div>}
        {tab === 'polls'      && <div className="max-w-[960px] mx-auto"><PollsTab /></div>}
        {tab === 'music'      && <div className="max-w-[960px] mx-auto"><MusicTab /></div>}
      </div>
    </div>
  );
}
