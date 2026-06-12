import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Music, Calendar, BarChart2, Plus, Trash2, X,
  RefreshCw, Check, Lock, Users, Shuffle, ChevronDown,
  Pin, Eye, EyeOff, Zap, TrendingUp, Activity,
  MessageCircle, Trophy, ShoppingBag, Newspaper, Lightbulb,
  Dumbbell, Handshake, PartyPopper, Heart, ImageIcon,
  Send, ChevronRight, MoreHorizontal,
} from 'lucide-react';
import { eventAPI, pollAPI, loungeAPI, postAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// ── Helpers ────────────────────────────────────────────────────────
const SERVER_URL = (import.meta.env.VITE_API_URL || 'https://areaconnectapi-production.up.railway.app/api').replace('/api', '');
const imgUrl     = (path) => path?.startsWith('http') ? path : `${SERVER_URL}${path}`;

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60)   return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400)return `${Math.floor(s / 3600)}h`;
  if (s < 604800)return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

function Avatar({ name, size = 36, src }) {
  const initials = (name || '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  if (src) return <img src={imgUrl(src)} alt={name} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />;
  const colors = ['#10B981','#6366F1','#EC4899','#F59E0B','#0EA5E9','#8B5CF6'];
  const color  = colors[initials.charCodeAt(0) % colors.length];
  return (
    <div className="rounded-full flex items-center justify-center font-black flex-shrink-0 text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.35 }}>
      {initials}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: '12px',
  background: '#F8FAFC', border: '1px solid #E2E8F0',
  fontSize: '14px', color: '#0F172A', outline: 'none',
};

// ── Image grid ────────────────────────────────────────────────────
function ImageGrid({ images }) {
  if (!images?.length) return null;
  const n = images.length;
  return (
    <div className={`grid gap-1 rounded-2xl overflow-hidden mt-3 ${n === 1 ? 'grid-cols-1' : n === 2 ? 'grid-cols-2' : n === 3 ? 'grid-cols-2' : 'grid-cols-2'}`}
      style={{ maxHeight: n === 1 ? 400 : 300 }}>
      {images.slice(0, 4).map((img, i) => (
        <div key={i} className={`relative overflow-hidden bg-slate-100 ${n === 3 && i === 0 ? 'row-span-2' : ''}`}
          style={{ height: n === 1 ? 400 : 150 }}>
          <img src={imgUrl(img)} alt="" className="w-full h-full object-cover" />
          {n > 4 && i === 3 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-xl font-black">+{n - 4}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Create Post ───────────────────────────────────────────────────
function CreatePost({ user, onCreated }) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent]   = useState('');
  const [files, setFiles]       = useState([]);
  const [previews, setPreviews] = useState([]);
  const [posting, setPosting]   = useState(false);
  const fileRef = useRef(null);

  const addFiles = (e) => {
    const picked = Array.from(e.target.files || []).slice(0, 4 - files.length);
    setFiles(prev => [...prev, ...picked].slice(0, 4));
    picked.forEach(f => {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviews(prev => [...prev, ev.target.result].slice(0, 4));
      reader.readAsDataURL(f);
    });
    e.target.value = '';
  };

  const removeFile = (i) => {
    setFiles(prev => prev.filter((_, j) => j !== i));
    setPreviews(prev => prev.filter((_, j) => j !== i));
  };

  const handlePost = async () => {
    if (!content.trim() && files.length === 0) return;
    setPosting(true);
    try {
      const fd = new FormData();
      fd.append('content', content.trim());
      files.forEach(f => fd.append('images', f));
      const { data } = await postAPI.create(fd);
      onCreated(data.data);
      setContent('');
      setFiles([]);
      setPreviews([]);
      setExpanded(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post');
    } finally { setPosting(false); }
  };

  return (
    <div className="rounded-2xl border p-4" style={{ background: '#fff', borderColor: '#F1F5F9' }}>
      <div className="flex items-center gap-3">
        <Avatar name={user?.name} size={38} src={user?.avatar} />
        {!expanded ? (
          <button onClick={() => setExpanded(true)}
            className="flex-1 text-left px-4 py-2.5 rounded-2xl text-sm transition-all"
            style={{ background: '#F8FAFC', color: '#94A3B8', border: '1px solid #E2E8F0' }}>
            Share something with the estate…
          </button>
        ) : (
          <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>{user?.name}</span>
        )}
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          <textarea
            autoFocus
            rows={3}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="What's happening in the estate?"
            style={{ ...inputStyle, resize: 'none', fontSize: 15, lineHeight: 1.6 }}
          />

          {previews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border" style={{ borderColor: '#E2E8F0' }}>
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button onClick={() => fileRef.current?.click()}
                disabled={files.length >= 4}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                style={{ color: files.length < 4 ? '#6366F1' : '#CBD5E1', borderColor: files.length < 4 ? '#C7D2FE' : '#E2E8F0', background: files.length < 4 ? '#EEF2FF' : '#F8FAFC' }}>
                <ImageIcon size={13} /> Photo {files.length > 0 && `(${files.length}/4)`}
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={addFiles} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setExpanded(false); setContent(''); setFiles([]); setPreviews([]); }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ color: '#64748B', background: '#F1F5F9' }}>
                Cancel
              </button>
              <button onClick={handlePost} disabled={posting || (!content.trim() && files.length === 0)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-all"
                style={{ background: '#10B981' }}>
                {posting ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Post Card ─────────────────────────────────────────────────────
function PostCard({ post, currentUserId, onDelete, onLike }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText]   = useState('');
  const [comments, setComments]         = useState(post.comments || []);
  const [likes, setLikes]               = useState(post.likes?.length || 0);
  const [liked, setLiked]               = useState((post.likes || []).some(l => l === currentUserId || l?._id === currentUserId));
  const [submitting, setSubmitting]     = useState(false);
  const [deleting, setDeleting]         = useState(null);

  const handleLike = async () => {
    try {
      const { data } = await postAPI.like(post._id);
      setLikes(data.likes);
      setLiked(data.liked);
    } catch { toast.error('Failed to update like'); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await postAPI.addComment(post._id, commentText.trim());
      setComments(prev => [...prev, data.data]);
      setCommentText('');
    } catch { toast.error('Failed to add comment'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteComment = async (commentId) => {
    setDeleting(commentId);
    try {
      await postAPI.deleteComment(post._id, commentId);
      setComments(prev => prev.filter(c => c._id !== commentId));
    } catch { toast.error('Failed to delete comment'); }
    finally { setDeleting(null); }
  };

  const isManager = post.author?.role === 'estate_manager';

  return (
    <div className="rounded-2xl border" style={{ background: '#fff', borderColor: '#F1F5F9' }}>
      {/* Author row */}
      <div className="flex items-start justify-between p-4 pb-0">
        <div className="flex items-center gap-3">
          <Avatar name={post.author?.name} size={40} src={post.author?.avatar} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: '#0F172A' }}>{post.author?.name || 'Resident'}</span>
              {isManager && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#F0FDF4', color: '#10B981' }}>Manager</span>
              )}
            </div>
            <span className="text-xs" style={{ color: '#94A3B8' }}>{timeAgo(post.createdAt)}</span>
          </div>
        </div>
        <button onClick={() => onDelete(post._id)}
          className="p-1.5 rounded-lg transition-all"
          style={{ color: '#CBD5E1' }}
          onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
          onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}
          title="Delete post">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Content */}
      {post.content && (
        <p className="px-4 pt-3 text-sm leading-relaxed" style={{ color: '#0F172A', whiteSpace: 'pre-wrap' }}>
          {post.content}
        </p>
      )}

      {/* Images */}
      {post.images?.length > 0 && (
        <div className="px-4">
          <ImageGrid images={post.images} />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 pt-3 pb-3 border-t mt-3" style={{ borderColor: '#F8FAFC' }}>
        <button onClick={handleLike}
          className="flex items-center gap-1.5 text-sm font-semibold transition-all"
          style={{ color: liked ? '#EF4444' : '#94A3B8' }}>
          <Heart size={17} fill={liked ? '#EF4444' : 'none'} strokeWidth={liked ? 0 : 2} />
          {likes > 0 && <span>{likes}</span>}
        </button>
        <button onClick={() => setShowComments(s => !s)}
          className="flex items-center gap-1.5 text-sm font-semibold transition-all"
          style={{ color: showComments ? '#6366F1' : '#94A3B8' }}>
          <MessageCircle size={17} />
          {comments.length > 0 && <span>{comments.length}</span>}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: '#F8FAFC' }}>
          {comments.length > 0 && (
            <div className="space-y-3 py-3">
              {comments.map(c => (
                <div key={c._id} className="flex items-start gap-2.5 group">
                  <Avatar name={c.author?.name} size={28} src={c.author?.avatar} />
                  <div className="flex-1 min-w-0">
                    <div className="rounded-2xl px-3 py-2" style={{ background: '#F8FAFC' }}>
                      <span className="text-xs font-bold" style={{ color: '#0F172A' }}>{c.author?.name || 'Resident'} </span>
                      <span className="text-xs" style={{ color: '#374151' }}>{c.text}</span>
                    </div>
                    <span className="text-[11px] pl-3" style={{ color: '#94A3B8' }}>{timeAgo(c.createdAt)}</span>
                  </div>
                  <button onClick={() => handleDeleteComment(c._id)}
                    disabled={deleting === c._id}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all flex-shrink-0"
                    style={{ color: '#CBD5E1' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}>
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add comment */}
          <form onSubmit={handleComment} className="flex items-center gap-2 mt-2">
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Write a comment…"
              style={{ ...inputStyle, fontSize: 13, padding: '6px 12px' }}
            />
            <button type="submit" disabled={submitting || !commentText.trim()}
              className="p-2 rounded-xl flex-shrink-0 disabled:opacity-40"
              style={{ background: '#EEF2FF', color: '#6366F1' }}>
              {submitting ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Social Feed Tab ───────────────────────────────────────────────
function SocialFeedTab({ user }) {
  const [posts, setPosts]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (p = 1, append = false) => {
    p === 1 ? setLoading(true) : setLoadingMore(true);
    try {
      const { data } = await postAPI.getAll(p);
      setPosts(prev => append ? [...prev, ...(data.data || [])] : (data.data || []));
      setHasMore(p < data.pages);
      setPage(p);
    } catch { toast.error('Failed to load posts'); }
    finally { setLoading(false); setLoadingMore(false); }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const handleCreated = (post) => setPosts(prev => [post, ...prev]);

  const handleDelete = async (id) => {
    try {
      await postAPI.delete(id);
      setPosts(prev => prev.filter(p => p._id !== id));
      toast.success('Post removed');
    } catch { toast.error('Failed to delete post'); }
  };

  return (
    <div className="space-y-3 max-w-xl mx-auto">
      <CreatePost user={user} onCreated={handleCreated} />

      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw size={20} className="text-emerald-500 animate-spin" /></div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl p-12 text-center border" style={{ borderColor: '#F1F5F9' }}>
          <PartyPopper size={32} className="mx-auto mb-3" style={{ color: '#CBD5E1' }} />
          <p className="font-semibold" style={{ color: '#94A3B8' }}>The feed is empty</p>
          <p className="text-sm mt-1" style={{ color: '#CBD5E1' }}>Be the first to post something for the community!</p>
        </div>
      ) : (
        <>
          {posts.map(post => (
            <PostCard
              key={post._id}
              post={post}
              currentUserId={user?._id}
              onDelete={handleDelete}
              onLike={() => {}}
            />
          ))}

          {hasMore && (
            <button onClick={() => load(page + 1, true)} disabled={loadingMore}
              className="w-full py-3 rounded-2xl text-sm font-semibold border transition-all flex items-center justify-center gap-2"
              style={{ color: '#64748B', borderColor: '#E2E8F0', background: '#fff' }}>
              {loadingMore ? <RefreshCw size={14} className="animate-spin" /> : <ChevronDown size={14} />}
              Load more
            </button>
          )}
        </>
      )}
    </div>
  );
}

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    {act.isCustom && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background:'#EEF2FF', color:'#6366F1' }}>Custom</span>}
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
                  style={act.visible ? { color:'#10B981', background:'#F0FDF4' } : { color:'#94A3B8' }}>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
      )}
    </div>
  );
}

// ── Events Tab ────────────────────────────────────────────────────
const EVENT_CATEGORIES = [
  { id:'general',    label:'General',    color:'#10B981', emoji:'📅' },
  { id:'fitness',    label:'Fitness',    color:'#0EA5E9', emoji:'🏃' },
  { id:'social',     label:'Social',     color:'#EC4899', emoji:'🎉' },
  { id:'networking', label:'Networking', color:'#8B5CF6', emoji:'🤝' },
  { id:'maintenance',label:'Maintenance',color:'#F59E0B', emoji:'🔧' },
  { id:'kids',       label:'Kids',       color:'#F97316', emoji:'👶' },
];
const catMap = Object.fromEntries(EVENT_CATEGORIES.map(c => [c.id, c]));

function EventsTab() {
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
       : (
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
      )}
    </div>
  );
}

// ── Polls Tab ─────────────────────────────────────────────────────
function PollsTab() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ question:'', options:['',''], endsAt:'', allowMultiple:false });

  useEffect(() => {
    pollAPI.getAll().then(({data}) => setPolls(data.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false));
  }, []);

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
        <button onClick={()=>setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-sm" style={{background:'#6366F1'}}>
          <Plus size={14} /> New Poll
        </button>
      </div>
      {loading ? <div className="flex justify-center py-8"><RefreshCw size={18} className="text-indigo-500 animate-spin" /></div>
       : polls.length===0 ? <div className="rounded-2xl p-10 text-center text-sm border" style={{color:'#94A3B8',borderColor:'#F1F5F9'}}>No polls yet.</div>
       : (
        <div className="space-y-3">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                {form.options.length<6&&<button type="button" onClick={()=>setForm(p=>({...p,options:[...p.options,'']}))} className="text-xs flex items-center gap-1" style={{color:'#6366F1'}}><Plus size={11}/> Add option</button>}
              </div>
              <div><label className="text-xs block mb-1 font-medium" style={{color:'#64748B'}}>End Date (optional)</label><input type="datetime-local" value={form.endsAt} onChange={e=>setForm(p=>({...p,endsAt:e.target.value}))} style={inputStyle}/></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm" style={{background:'#F1F5F9',color:'#475569'}}>Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold" style={{background:'#6366F1'}}>
                  {saving?<RefreshCw size={13} className="animate-spin"/>:'Create Poll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Music Tab ─────────────────────────────────────────────────────
function MusicTab() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [defaultsPage, setDefaultsPage] = useState(1);
  const DJ_PAGE = 10;

  const load = useCallback(() => {
    setLoading(true);
    loungeAPI.getSession().then(({data})=>setSession(data.data)).catch(()=>toast.error('Failed to load')).finally(()=>setLoading(false));
  },[]);
  useEffect(()=>{load();},[load]);

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
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={async()=>{const next=!session?.isAutoDJ;const{data}=await loungeAPI.updateMood({isAutoDJ:next});setSession(data.data);toast.success(`AutoDJ ${next?'on':'off'}`);}}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border"
          style={session?.isAutoDJ?{color:'#EC4899',borderColor:'rgba(236,72,153,0.4)',background:'rgba(236,72,153,0.08)'}:{color:'#94A3B8',borderColor:'#E2E8F0',background:'#F8FAFC'}}>
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
                  <a href={`https://youtube.com/watch?v=${t.videoId}`} target="_blank" rel="noopener noreferrer" className="p-1.5 flex-shrink-0" style={{color:'#CBD5E1'}} onMouseEnter={e=>e.currentTarget.style.color='#EC4899'} onMouseLeave={e=>e.currentTarget.style.color='#CBD5E1'}><Music size={13}/></a>
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
  { key:'events',     Icon:Calendar,  label:'Events',     color:'#F59E0B' },
  { key:'activities', Icon:Zap,       label:'Activities', color:'#8B5CF6' },
  { key:'polls',      Icon:BarChart2, label:'Polls',      color:'#6366F1' },
  { key:'music',      Icon:Music,     label:'Music',      color:'#EC4899' },
];

export default function LoungeManager() {
  const [tab, setTab] = useState('feed');
  const { user } = useAuth();

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{color:'#0F172A'}}>
          <PartyPopper size={22} className="text-emerald-500"/> Community Lounge
        </h1>
        <p className="text-sm mt-0.5" style={{color:'#94A3B8'}}>Posts, events, activities, polls and music — all in one place</p>
      </div>

      <div className="flex gap-1 rounded-2xl p-1 overflow-x-auto" style={{background:'#F1F5F9',scrollbarWidth:'none'}}>
        {TABS.map(({key,Icon,label,color})=>(
          <button key={key} onClick={()=>setTab(key)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0"
            style={tab===key?{background:'#FFFFFF',color:color,boxShadow:'0 1px 3px rgba(0,0,0,0.08)'}:{color:'#94A3B8'}}>
            <Icon size={13}/> {label}
          </button>
        ))}
      </div>

      {tab==='feed'       && <SocialFeedTab user={user} />}
      {tab==='events'     && <EventsTab />}
      {tab==='activities' && <ActivitiesTab />}
      {tab==='polls'      && <PollsTab />}
      {tab==='music'      && <MusicTab />}
    </div>
  );
}
