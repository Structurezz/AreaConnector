// Right-hand side panel on desktop, bottom sheet on phones — with the
// gradient header used by the household panels (components/residents/FamilyPanels).
import { useEffect } from 'react';
import { X } from 'lucide-react';
import Portal, { Z } from '../ui/Portal';
import useIsDesktop from '../../hooks/useIsDesktop';

export default function SitePanel({ title, eyebrow, subtitle, onClose, children, footer, accent = ['#6366F1', '#4F46E5'], width = 440 }) {
  const desktop = useIsDesktop();
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const header = (
    <div className={`relative overflow-hidden px-5 pt-4 pb-5 flex-shrink-0 text-white ${desktop ? '' : 'rounded-t-3xl'}`}
      style={{ background: `linear-gradient(135deg, ${accent[0]}, ${accent[1]})` }}>
      <div className="pointer-events-none absolute -top-16 -right-12 w-48 h-48 rounded-full bg-white/10" style={{ animation: 'dashFloat 14s ease-in-out infinite' }} />
      {!desktop && <div className="relative flex justify-center -mt-1.5 mb-2"><div className="w-10 h-1.5 rounded-full bg-white/40" /></div>}
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">{eyebrow}</p>}
          <h2 className="text-[17px] font-semibold !text-white truncate mt-0.5">{title}</h2>
          {subtitle && <p className="text-[12px] text-white/80 mt-1">{subtitle}</p>}
        </div>
        <button onClick={onClose} aria-label="Close" className="w-8 h-8 -mr-1 rounded-full flex items-center justify-center text-white/80 hover:bg-white/15 flex-shrink-0"><X size={17} /></button>
      </div>
    </div>
  );
  const foot = footer && (
    <div className="px-5 pt-3 flex-shrink-0 border-t border-slate-100 bg-white" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>{footer}</div>
  );

  return (
    <Portal>
      <div className={`fixed inset-0 ${Z.drawer} flex ${desktop ? 'justify-end' : 'items-end'}`} onClick={onClose}>
        <div className="overlay-backdrop" aria-hidden="true" />
        {desktop ? (
          <aside role="dialog" aria-modal="true" aria-label={title}
            className="animate-slide-in-right relative h-full w-full bg-white flex flex-col"
            style={{ maxWidth: width, boxShadow: '-8px 0 40px rgba(15,23,42,0.18)' }}
            onClick={e => e.stopPropagation()}>
            {header}
            <div className="flex-1 overflow-y-auto">{children}</div>
            {foot}
          </aside>
        ) : (
          <div role="dialog" aria-modal="true" aria-label={title}
            className="sheet-panel relative w-full bg-white rounded-t-3xl flex flex-col max-h-[92vh]"
            style={{ boxShadow: '0 -8px 40px rgba(15,23,42,0.18)' }}
            onClick={e => e.stopPropagation()}>
            {header}
            <div className="flex-1 overflow-y-auto">{children}</div>
            {foot}
          </div>
        )}
      </div>
    </Portal>
  );
}
