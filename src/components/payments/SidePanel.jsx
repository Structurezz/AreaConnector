import { X } from 'lucide-react';
import { useEffect } from 'react';
import Portal, { Z, useScrollLock } from '../ui/Portal';

// Same API as <BottomSheet>, but slides in from the right as a full-height
// side panel — suited to longer forms where the page should stay in view.
export default function SidePanel({ open, onClose, title, subtitle, children, footer }) {
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Portal>
    <div className={`fixed inset-0 ${Z.drawer} flex justify-end`} onClick={onClose}>
      <div className="overlay-backdrop" aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-slide-in-right relative h-full w-full sm:max-w-md bg-white flex flex-col"
        style={{ boxShadow: '-8px 0 40px rgba(15,23,42,0.18)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div
            className="flex items-start justify-between gap-3 px-5 pb-4 border-b border-slate-100"
            style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
          >
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
              {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 -mr-1 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="px-5 py-5 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div
            className="px-5 pt-3 border-t border-slate-100 bg-white"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            {footer}
          </div>
        )}
      </aside>
    </div>
    </Portal>
  );
}
