import { ChevronLeft, ChevronRight } from 'lucide-react';

const SIZES = [10, 20, 50];

// Footer bar for desktop tables: range, rows-per-page and page buttons. Always visible.
export default function TablePager({ page, pages, total, limit, onPage, onLimit, accent = '#10B981' }) {
  if (!total) return null;
  const last = Math.max(1, pages || 1);
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const nums = [...new Set([1, last, page - 1, page, page + 1].filter((n) => n >= 1 && n <= last))].sort((a, b) => a - b);
  const items = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) items.push(`gap-${n}`);
    items.push(n);
  });

  const arrow = 'w-9 h-9 rounded-xl flex items-center justify-center border border-slate-200 bg-white text-slate-500 transition-all hover:border-slate-300 hover:text-slate-800 hover:-translate-y-0.5 disabled:opacity-40 disabled:pointer-events-none';

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap px-6 py-3.5 border-t border-slate-100 bg-slate-50/60">
      <div className="flex items-center gap-4 text-[13px] text-slate-500">
        <span>
          Showing <strong className="text-slate-800 tabular-nums">{from}–{to}</strong> of <strong className="text-slate-800 tabular-nums">{total}</strong>
        </span>
        {onLimit && (
          <label className="flex items-center gap-2">
            <span className="text-slate-400">Rows</span>
            <select value={limit} onChange={(e) => onLimit(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[13px] font-semibold text-slate-700 outline-none focus:border-slate-400 cursor-pointer">
              {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1} className={arrow} aria-label="Previous page">
          <ChevronLeft size={16} />
        </button>
        {items.map((n) => typeof n === 'string' ? (
          <span key={n} className="w-9 text-center text-slate-300 select-none">…</span>
        ) : (
          <button key={n} onClick={() => onPage(n)} aria-current={n === page ? 'page' : undefined}
            className={`min-w-[36px] h-9 px-2 rounded-xl text-[13px] font-bold tabular-nums transition-all duration-300 ${n === page ? 'text-white scale-105' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:-translate-y-0.5'}`}
            style={n === page ? { background: accent, boxShadow: `0 8px 18px -8px ${accent}` } : undefined}>
            {n}
          </button>
        ))}
        <button onClick={() => onPage(page + 1)} disabled={page >= last} className={arrow} aria-label="Next page">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
