import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Plus, Check, Building2, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { estateAPI } from '../../api';
import toast from 'react-hot-toast';

export default function EstateSwitcher({ compact = false }) {
  const { user, estate, switchEstate } = useAuth();
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [estates, setEstates] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [switching, setSwitching] = useState(null);
  const [form, setForm] = useState({ name: '', address: '' });
  const [adding, setAdding] = useState(false);

  const currentName = typeof estate === 'object' ? estate?.name : 'My Estate';

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') { setOpen(false); setShowAdd(false); } };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const openModal = async () => {
    setOpen(true);
    setShowAdd(false);
    setLoadingList(true);
    try {
      const { data } = await estateAPI.getMine();
      setEstates(data.data);
    } catch {
      toast.error('Could not load estates');
    } finally {
      setLoadingList(false);
    }
  };

  const closeModal = () => {
    setOpen(false);
    setShowAdd(false);
    setForm({ name: '', address: '' });
  };

  const handleSwitch = async (id) => {
    const activeId = typeof estate === 'object' ? estate?._id : estate;
    if (id === activeId?.toString()) { closeModal(); return; }
    setSwitching(id);
    try {
      await switchEstate(id);
      closeModal();
      toast.success('Estate switched');
      window.location.reload();
    } catch {
      toast.error('Could not switch estate');
    } finally {
      setSwitching(null);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim()) return;
    setAdding(true);
    try {
      const { data } = await estateAPI.addEstate(form);
      toast.success(`"${data.data.name}" created`);
      setForm({ name: '', address: '' });
      setShowAdd(false);
      const res = await estateAPI.getMine();
      setEstates(res.data.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not create estate');
    } finally {
      setAdding(false);
    }
  };

  if (user?.role !== 'estate_manager') return null;

  const activeId = typeof estate === 'object' ? estate?._id?.toString() : estate?.toString();

  const modal = open && createPortal(
    <div
      onClick={closeModal}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15,23,42,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: 20,
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 24px 64px rgba(15,23,42,0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Modal header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 20px 0',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
              Switch Estate
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94A3B8' }}>
              Select or add an estate to manage
            </p>
          </div>
          <button
            onClick={closeModal}
            style={{
              width: 32, height: 32, borderRadius: 10, border: 'none',
              background: '#F1F5F9', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#64748B', flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#E2E8F0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F1F5F9'; }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Estate list */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {loadingList ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '32px 0' }}>
              <Loader2 size={22} style={{ color: '#10B981', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 13, color: '#94A3B8' }}>Loading estates…</span>
            </div>
          ) : estates.length === 0 ? (
            <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: '24px 0' }}>No estates found</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {estates.map((e) => {
                const isCurrent = e._id?.toString() === activeId;
                const isLoading = switching === e._id?.toString();
                return (
                  <button
                    key={e._id}
                    onClick={() => handleSwitch(e._id?.toString())}
                    disabled={!!isLoading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      width: '100%', padding: '14px 16px',
                      border: isCurrent ? '2px solid #10B981' : '2px solid #E2E8F0',
                      borderRadius: 14, cursor: 'pointer',
                      background: isCurrent ? '#F0FDF4' : '#FAFAFA',
                      transition: 'all 0.15s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={ev => { if (!isCurrent) { ev.currentTarget.style.borderColor = '#CBD5E1'; ev.currentTarget.style.background = '#F1F5F9'; } }}
                    onMouseLeave={ev => { if (!isCurrent) { ev.currentTarget.style.borderColor = '#E2E8F0'; ev.currentTarget.style.background = '#FAFAFA'; } }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: isCurrent
                        ? 'linear-gradient(135deg, #10B981, #059669)'
                        : 'linear-gradient(135deg, #94A3B8, #64748B)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Building2 size={18} color="white" />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {e.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                        Code: {e.estateCode}
                      </div>
                    </div>

                    {isLoading ? (
                      <Loader2 size={16} style={{ color: '#10B981', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                    ) : isCurrent ? (
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 11, fontWeight: 700, color: '#059669',
                        background: '#D1FAE5', padding: '3px 8px', borderRadius: 20, flexShrink: 0,
                      }}>
                        <Check size={10} /> Active
                      </span>
                    ) : (
                      <ArrowRight size={15} style={{ color: '#CBD5E1', flexShrink: 0 }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#F1F5F9', margin: '0 20px' }} />

        {/* Add new estate section */}
        <div style={{ padding: '16px 20px 20px' }}>
          {!showAdd ? (
            <button
              onClick={() => setShowAdd(true)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '12px 0',
                border: '2px dashed #CBD5E1', borderRadius: 14,
                background: 'transparent', cursor: 'pointer',
                color: '#64748B', fontSize: 13, fontWeight: 600,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.color = '#10B981'; e.currentTarget.style.background = '#F0FDF4'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#64748B'; e.currentTarget.style.background = 'transparent'; }}
            >
              <Plus size={15} /> Add New Estate
            </button>
          ) : (
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0F172A' }}>New Estate</p>
              <input
                autoFocus
                placeholder="Estate name *"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                style={{
                  padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0',
                  fontSize: 13, color: '#0F172A', outline: 'none',
                  width: '100%', boxSizing: 'border-box',
                }}
                onFocus={e => { e.target.style.borderColor = '#10B981'; }}
                onBlur={e => { e.target.style.borderColor = '#E2E8F0'; }}
              />
              <input
                placeholder="Address *"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                required
                style={{
                  padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0',
                  fontSize: 13, color: '#0F172A', outline: 'none',
                  width: '100%', boxSizing: 'border-box',
                }}
                onFocus={e => { e.target.style.borderColor = '#10B981'; }}
                onBlur={e => { e.target.style.borderColor = '#E2E8F0'; }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="submit"
                  disabled={adding}
                  style={{
                    flex: 1, padding: '11px 0', borderRadius: 10,
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    color: 'white', border: 'none', fontSize: 13, fontWeight: 700,
                    cursor: adding ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    opacity: adding ? 0.8 : 1,
                  }}
                >
                  {adding && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
                  {adding ? 'Creating…' : 'Create Estate'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setForm({ name: '', address: '' }); }}
                  style={{
                    padding: '11px 16px', borderRadius: 10,
                    background: '#F1F5F9', color: '#64748B',
                    border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#E2E8F0'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#F1F5F9'; }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      <button
        onClick={openModal}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '2px 4px', borderRadius: 6,
        }}
        title="Switch estate"
      >
        {!compact && (
          <span
            className="text-xs font-medium truncate"
            style={{ color: '#64748B', maxWidth: 130 }}
          >
            {currentName}
          </span>
        )}
        <ChevronDown
          size={12}
          style={{ color: '#94A3B8', flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      {modal}
    </>
  );
}
