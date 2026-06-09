import { useEffect, useState } from 'react';
import { announcementAPI } from '../api';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { Megaphone, Plus, Pin, Trash2, Edit3 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const CATEGORY_COLORS = {
  general: 'blue', urgent: 'red', event: 'gold', maintenance: 'yellow',
};

export default function ManagerAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', category: 'general', isPinned: false });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await announcementAPI.getAll();
      setAnnouncements(data.data);
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      await announcementAPI.create(fd);
      toast.success('Announcement posted!');
      setShowCreate(false);
      setForm({ title: '', body: '', category: 'general', isPinned: false });
      load();
    } catch {
      toast.error('Failed to post');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await announcementAPI.delete(id);
      toast.success('Deleted');
      load();
    } catch {
      toast.error('Failed');
    }
  };

  const togglePin = async (a) => {
    try {
      await announcementAPI.update(a._id, { isPinned: !a.isPinned });
      load();
    } catch {
      toast.error('Failed');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-1">Announcements</h1>
          <p className="text-white/50 text-sm">Post notices and updates for residents</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary gap-2">
          <Plus size={16} /> New Announcement
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Spinner /></div>
      ) : announcements.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements yet" />
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div key={a._id} className={`glass-card p-5 transition-all hover:border-gold/20 ${a.isPinned ? 'border-gold/30' : ''}`}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {a.isPinned && <Pin size={14} className="text-gold flex-shrink-0" />}
                  <h3 className="font-display font-semibold text-white">{a.title}</h3>
                  <Badge variant={CATEGORY_COLORS[a.category]}>{a.category}</Badge>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => togglePin(a)}
                    className={`p-1.5 rounded-lg transition-all ${a.isPinned ? 'text-gold hover:bg-gold/10' : 'text-white/30 hover:text-gold hover:bg-gold/10'}`}
                    title={a.isPinned ? 'Unpin' : 'Pin'}>
                    <Pin size={15} />
                  </button>
                  <button onClick={() => handleDelete(a._id)}
                    className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <p className="text-white/60 text-sm leading-relaxed mb-3 whitespace-pre-wrap">{a.body}</p>
              <div className="flex items-center gap-2 text-xs text-white/30">
                <span>{a.authorId?.name}</span>
                <span>·</span>
                <span>{format(new Date(a.createdAt), 'MMM d, yyyy HH:mm')}</span>
                <span>·</span>
                <span>{a.readBy?.length || 0} reads</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Announcement" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Title</label>
            <input className="input-field" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Message</label>
            <textarea className="input-field resize-none" rows={5} value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Category</label>
              <select className="input-field" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="general">General</option>
                <option value="urgent">Urgent</option>
                <option value="event">Event</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.isPinned}
                  onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                  className="w-4 h-4 accent-gold" />
                <span className="text-sm text-white/70">Pin to top</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Posting...' : 'Post Announcement'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
