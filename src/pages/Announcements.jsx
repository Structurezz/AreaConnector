import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { announcementAPI } from '../api';
import toast from 'react-hot-toast';
import AnnouncementsDesktop from '../components/announcements/AnnouncementsDesktop';
import AnnouncementsMobile from '../components/announcements/AnnouncementsMobile';
import useIsDesktop from '../hooks/useIsDesktop';

const PAGE_SIZE = 10;

export default function ManagerAnnouncements() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const isDesktop = useIsDesktop();

  const load = async (p = page) => {
    setLoading(true);
    try {
      const { data } = await announcementAPI.getAll({ page: p, limit: PAGE_SIZE });
      setAnnouncements(data.data);
      setPagination(data.pagination || { total: data.data.length, pages: 1 });
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const handlePage = (p) => { setPage(p); load(p); };

  useEffect(() => { load(1); }, []);

  // Posts an announcement; returns true on success (the desktop composer resets on it)
  const postAnnouncement = async (values) => {
    try {
      const fd = new FormData();
      Object.entries(values).forEach(([k, v]) => fd.append(k, v));
      await announcementAPI.create(fd);
      toast.success('Announcement posted!');
      setPage(1); load(1);
      return true;
    } catch {
      toast.error('Failed to post');
      return false;
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

  if (isDesktop) return (
    <AnnouncementsDesktop
      announcements={announcements} loading={loading}
      page={page} pagination={pagination} onPage={handlePage}
      onPost={postAnnouncement} onDelete={handleDelete} onTogglePin={togglePin}
      onGoLive={() => navigate('/announcements/live')}
    />
  );

  return (
    <AnnouncementsMobile
      announcements={announcements} loading={loading}
      page={page} pagination={pagination} pageSize={PAGE_SIZE} onPage={handlePage}
      onPost={postAnnouncement} onDelete={handleDelete} onTogglePin={togglePin}
      onGoLive={() => navigate('/announcements/live')}
    />
  );
}
