import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  ShoppingBag, RefreshCw, ShieldCheck, Receipt, Lock, Check, X, Flag, Users, Settings2, ListChecks, Search,
  Ban, RotateCcw, Trash2, Star, AlertTriangle, TrendingUp, Phone, ChevronRight, CheckCircle2, Eye,
} from 'lucide-react';
import BottomSheet from '../components/payments/BottomSheet';
import { marketAdminAPI } from '../api';
import { useCall } from '../context/CallContext';

// Estate manager's control room for the residents' marketplace:
// approve/reject listings, act on reports, suspend sellers, set price rules.

const SERVER_URL = (import.meta.env.VITE_API_URL || 'https://areaconnectapi-production.up.railway.app/api').replace('/api', '');
const img = (p) => (!p ? '' : p.startsWith('http') || p.startsWith('data:') ? p : `${SERVER_URL}${p}`);
const naira = (n) => (Number(n) === 0 ? 'Free' : `₦${Number(n || 0).toLocaleString('en-NG')}`);
const ago = (d) => (d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : '');

const CAT = {
  food: { label: 'Food', emoji: '🍲' }, services: { label: 'Services', emoji: '🔧' }, skills: { label: 'Skills', emoji: '💡' },
  items_for_sale: { label: 'For sale', emoji: '🏷️' }, rentals: { label: 'Rentals', emoji: '🏠' },
};
const STATUS = {
  active: ['Live', 'bg-emerald-50 text-emerald-700'], pending_approval: ['In review', 'bg-amber-50 text-amber-700'],
  rejected: ['Rejected', 'bg-red-50 text-red-700'], removed: ['Removed', 'bg-slate-100 text-slate-600'], sold: ['Sold', 'bg-sky-50 text-sky-700'],
};
const REASON = { scam: 'Scam / fraud', overpriced: 'Price gouging', misleading: 'Misleading', unsafe: 'Unsafe / prohibited', not_delivered: 'Not delivered', other: 'Other' };
const FLAG = { price_outlier: 'Price far above typical', reported: 'Reported by residents', approval_required: 'Approval required' };
const QUICK_REASONS = ['Price is too high for this estate', 'Prohibited item', 'Photos or description are misleading', 'Duplicate listing', 'Not suitable for the marketplace'];

function Thumb({ l, size = 64 }) {
  return (
    <div className="rounded-xl overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center text-2xl" style={{ width: size, height: size }}>
      {l?.images?.[0] ? <img src={img(l.images[0])} alt="" className="w-full h-full object-cover" /> : (CAT[l?.category]?.emoji || '📦')}
    </div>
  );
}
function Pill({ status }) {
  const [label, cls] = STATUS[status] || [status, 'bg-slate-100 text-slate-600'];
  return <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}
function Rating({ r }) {
  if (!r?.count) return <span className="text-xs text-slate-400">No ratings</span>;
  return <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-700"><Star size={12} className="text-amber-400" fill="currentColor" strokeWidth={0} />{r.avg.toFixed(1)} <span className="font-normal text-slate-400">({r.count})</span></span>;
}

// Asks for the reason the seller will see.
function ReasonSheet({ ask, onClose }) {
  const [reason, setReason] = useState('');
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setReason(''); setDays(7); }, [ask]);
  if (!ask) return null;
  const go = async () => {
    setBusy(true);
    try { await ask.run(reason.trim(), days); onClose(); } catch { /* toast shown */ } finally { setBusy(false); }
  };
  return (
    <BottomSheet open onClose={onClose} title={ask.title} subtitle={ask.subtitle}
      footer={<button onClick={go} disabled={!reason.trim() || busy} className={`w-full py-3 rounded-xl font-bold text-white disabled:opacity-40 ${ask.danger ? 'bg-red-600' : 'bg-emerald-600'}`}>{busy ? 'Saving…' : ask.cta}</button>}>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {(ask.quick || QUICK_REASONS).map((q) => <button key={q} onClick={() => setReason(q)} className={`text-xs px-2.5 py-1.5 rounded-full border ${reason === q ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}>{q}</button>)}
      </div>
      <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (the seller will see this)" className="input-field resize-none" />
      {ask.withDays && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-600 mb-1.5">Suspend for</p>
          <div className="grid grid-cols-4 gap-1.5">
            {[[3, '3 days'], [7, '7 days'], [30, '30 days'], [0, 'Until lifted']].map(([d, label]) => (
              <button key={d} onClick={() => setDays(d)} className={`py-2 rounded-xl text-xs font-semibold border ${days === d ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-200 text-slate-600'}`}>{label}</button>
            ))}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}


// One card per listing. On phones the actions become a full-width row of
// equal buttons so they're easy to hit with a thumb.
function ListingRow({ l, median, actions }) {
  const s = l.sellerId || {};
  const [open, setOpen] = useState(false);
  const over = median && l.price > median ? Math.round((l.price / median) * 10) / 10 : null;
  return (
    <div className="glass-card p-3.5 sm:p-4">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex gap-3 text-left">
        <Thumb l={l} size={60} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap"><Pill status={l.status} /><span className="text-[11px] text-slate-400">{CAT[l.category]?.emoji} {CAT[l.category]?.label} · {ago(l.createdAt)}</span></div>
          <p className="font-semibold text-slate-900 truncate mt-1 text-[15px]">{l.title}</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-bold text-slate-900">{naira(l.price)}</span>
            {median && <span className={`text-xs ${over >= 2 ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>typical {naira(median)}{over >= 1.5 ? ` · ${over}×` : ''}</span>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">{s.name || 'Resident'} <Rating r={l.sellerRating} /> {l.reportCount > 0 && <span className="text-red-600 font-semibold">· {l.reportCount} report{l.reportCount > 1 ? 's' : ''}</span>}</p>
        </div>
        <ChevronRight size={18} className={`text-slate-300 shrink-0 self-center transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {l.flags?.length > 0 && l.status === 'pending_approval' && (
        <div className="mt-3 space-y-1">
          {l.flags.map((f, i) => <p key={i} className="text-xs rounded-lg bg-amber-50 text-amber-800 px-2.5 py-1.5 flex gap-1.5"><AlertTriangle size={13} className="shrink-0 mt-px" /><span><b>{FLAG[f.type] || f.type}</b>{f.detail ? ` — ${f.detail}` : ''}</span></p>)}
        </div>
      )}
      {l.moderation?.reason && ['rejected', 'removed'].includes(l.status) && (
        <p className="text-xs text-slate-500 mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5">Reason: {l.moderation.reason}{l.moderation.by?.name ? ` — ${l.moderation.by.name}` : ''}</p>
      )}
      {open && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
          {l.images?.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">{l.images.map((src, i) => <img key={i} src={img(src)} alt="" className="w-24 h-24 rounded-xl object-cover shrink-0" />)}</div>
          )}
          <p className="text-sm text-slate-600" style={{ whiteSpace: 'pre-wrap' }}>{l.description}</p>
          <p className="text-xs text-slate-400 flex flex-wrap gap-x-3">
            <span className="inline-flex items-center gap-1"><Eye size={12} /> {l.views || 0} views</span>
            {l.isNegotiable && <span>Negotiable</span>}
            {l.priceHistory?.length > 1 && <span>Price: {l.priceHistory.map((p) => naira(p.price)).join(' → ')}</span>}
            {s.phone && <span>{s.phone}</span>}
          </p>
        </div>
      )}
      {actions && <div className="grid grid-flow-col auto-cols-fr gap-2 mt-3 sm:flex sm:flex-wrap">{actions}</div>}
    </div>
  );
}

const Btn = ({ tone = 'slate', children, ...p }) => {
  const t = { green: 'bg-emerald-600 text-white hover:bg-emerald-700', red: 'bg-red-50 text-red-700 hover:bg-red-100', slate: 'bg-slate-100 text-slate-700 hover:bg-slate-200' }[tone];
  return <button {...p} className={`inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2.5 sm:py-2 rounded-xl text-sm font-semibold whitespace-nowrap active:scale-[0.98] transition disabled:opacity-40 ${t}`}>{children}</button>;
};

function Chips({ value, onChange, options }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
      {options.map(([id, label]) => (
        <button key={id} onClick={() => onChange(id)}
          className={`shrink-0 px-3.5 py-2 rounded-full text-[13px] font-semibold ${value === id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{label}</button>
      ))}
    </div>
  );
}

function SectionHead({ title, hint, busy }) {
  return (
    <div className="px-0.5">
      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">{title}{busy && <RefreshCw size={13} className="animate-spin text-emerald-500" />}</h2>
      <p className="text-xs text-slate-500">{hint}</p>
    </div>
  );
}

// Placeholder cards shown inside the tab body on first load.
function Skeleton({ rows = 3, compact }) {
  return (
    <div className={compact ? 'glass-card divide-y divide-slate-100 overflow-hidden' : 'grid lg:grid-cols-2 gap-3'}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`${compact ? 'p-4' : 'glass-card p-4'} animate-pulse`}>
          <div className="flex gap-3">
            <div className={`${compact ? 'w-11 h-11 rounded-full' : 'w-[60px] h-[60px] rounded-xl'} bg-slate-200 shrink-0`} />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3 w-20 rounded bg-slate-200" />
              <div className="h-4 w-3/4 rounded bg-slate-200" />
              <div className="h-3 w-1/2 rounded bg-slate-100" />
            </div>
          </div>
          {!compact && <div className="grid grid-cols-3 gap-2 mt-4"><div className="h-10 rounded-xl bg-slate-100" /><div className="h-10 rounded-xl bg-slate-100" /><div className="h-10 rounded-xl bg-slate-100" /></div>}
        </div>
      ))}
    </div>
  );
}

// Seller details + actions in one sheet (tap a seller on mobile).
function SellerSheet({ seller: s, onClose, onCall, onListings, onSuspend, onLift }) {
  if (!s) return null;
  return (
    <BottomSheet open onClose={onClose} title={s.user.name} subtitle={s.suspended ? 'Suspended from the marketplace' : `Last listed ${ago(s.lastListed)}`}
      footer={(
        <div className="grid grid-cols-2 gap-2">
          <Btn onClick={onCall}><Phone size={15} /> Call</Btn>
          <Btn onClick={onListings}><ShoppingBag size={15} /> Listings</Btn>
          {s.suspended
            ? <span className="col-span-2 grid"><Btn tone="green" onClick={onLift}><RotateCcw size={15} /> Lift suspension</Btn></span>
            : <span className="col-span-2 grid"><Btn tone="red" onClick={onSuspend}><Ban size={15} /> Suspend seller</Btn></span>}
        </div>
      )}>
      {s.suspended && <p className="text-sm rounded-xl bg-red-50 text-red-700 p-3 mb-3">{s.suspended.reason}{s.suspended.until ? ` · until ${new Date(s.suspended.until).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}` : ' · until lifted'}</p>}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[['Live', s.active], ['Sold', s.sold], ['Taken down', s.removed]].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-slate-50 py-3"><p className="text-lg font-bold text-slate-900">{v}</p><p className="text-[11px] text-slate-500">{k}</p></div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-slate-100 divide-y divide-slate-100 text-sm">
        <div className="flex justify-between p-3"><span className="text-slate-500">Rating</span><Rating r={s.rating} /></div>
        <div className="flex justify-between p-3"><span className="text-slate-500">Reports</span><span className="font-semibold text-slate-800">{s.reports.all} total · {s.reports.upheld} upheld · {s.reports.open} open</span></div>
        {s.user.phone && <div className="flex justify-between p-3"><span className="text-slate-500">Phone</span><span className="font-semibold text-slate-800">{s.user.phone}</span></div>}
      </div>
    </BottomSheet>
  );
}

const TABS = [
  { id: 'queue',    label: 'Review queue',  short: 'Review',   icon: ListChecks, hint: 'Listings waiting for your decision' },
  { id: 'reports',  label: 'Reports',       short: 'Reports',  icon: Flag,       hint: 'What residents flagged as unfair or unsafe' },
  { id: 'orders',   label: 'Orders',        short: 'Orders',   icon: Receipt,    hint: 'Payments held in escrow and buyer disputes' },
  { id: 'listings', label: 'Listings',      short: 'Listings', icon: ShoppingBag, hint: 'Everything on your estate\'s marketplace' },
  { id: 'sellers',  label: 'Sellers',       short: 'Sellers',  icon: Users,      hint: 'Ratings, reports and suspensions' },
  { id: 'rules',    label: 'Price & rules', short: 'Rules',    icon: Settings2,  hint: 'Price caps and protection settings' },
];

export default function Marketplace() {
  const { startCall } = useCall() || {};
  const [tab, setTab] = useState('queue');
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState(null); // null = not loaded yet
  const [medians, setMedians] = useState({});
  const [all, setAll] = useState(null); // null = not loaded yet
  const [allStatus, setAllStatus] = useState('active');
  const [sellerFilter, setSellerFilter] = useState(null); // { _id, name }
  const [q, setQ] = useState('');
  const [reports, setReports] = useState(null); // null = not loaded yet
  const [reportStatus, setReportStatus] = useState('open');
  const [orders, setOrders] = useState(null);
  const [orderStatus, setOrderStatus] = useState('disputed');
  const [sellers, setSellers] = useState(null); // null = not loaded yet
  const [sellerOpen, setSellerOpen] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ask, setAsk] = useState(null);

  const loadStats = () => marketAdminAPI.stats().then(({ data }) => setStats(data.data)).catch(() => {});
  // Only the latest request may update the screen (fast tab/filter switches).
  const reqId = useRef(0);
  const load = useCallback(async () => {
    const id = ++reqId.current;
    const fresh = () => id === reqId.current;
    setLoading(true);
    try {
      if (tab === 'queue') { const { data } = await marketAdminAPI.listings({ status: 'pending_approval' }); if (!fresh()) return; setQueue(data.data); setMedians(data.medians || {}); }
      if (tab === 'listings') { const { data } = await marketAdminAPI.listings({ status: allStatus, q: q || undefined, sellerId: sellerFilter?._id }); if (!fresh()) return; setAll(data.data); setMedians(data.medians || {}); }
      if (tab === 'reports') { const { data } = await marketAdminAPI.reports(reportStatus); if (fresh()) setReports(data.data); }
      if (tab === 'orders') { const { data } = await marketAdminAPI.orders(orderStatus); if (fresh()) setOrders(data.data); }
      if (tab === 'sellers') { const { data } = await marketAdminAPI.sellers(); if (fresh()) setSellers(data.data); }
      if (tab === 'rules') { const { data } = await marketAdminAPI.settings(); if (fresh()) setSettings({ ...data.data, medians: data.medians }); }
    } catch (e) {
      if (!fresh()) return;
      toast.error(e.response?.data?.message || 'Couldn\'t load');
      // Don't leave skeletons up forever after a failed first load.
      ({ queue: setQueue, listings: setAll, reports: setReports, sellers: setSellers, orders: setOrders })[tab]?.((v) => v ?? []);
    }
    finally { if (fresh()) setLoading(false); }
  }, [tab, allStatus, q, reportStatus, sellerFilter, orderStatus]);

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { const t = setTimeout(load, tab === 'listings' ? 250 : 0); return () => clearTimeout(t); }, [load, tab]);

  const go = (id, status) => {
    setTab(id);
    if (status) setAllStatus(status);
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const act = async (fn, msg) => {
    try { await fn(); toast.success(msg); load(); loadStats(); }
    catch (e) { toast.error(e.response?.data?.message || 'Action failed'); throw e; }
  };
  const approve = (l) => act(() => marketAdminAPI.approve(l._id), 'Approved — the listing is live').catch(() => {});
  const restore = (l) => act(() => marketAdminAPI.restore(l._id), 'Listing restored').catch(() => {});
  const reject = (l) => setAsk({ title: 'Reject listing', subtitle: `"${l.title}" — the seller can edit and resubmit`, cta: 'Reject', danger: true, run: (r) => act(() => marketAdminAPI.reject(l._id, r), 'Listing rejected') });
  const remove = (l) => setAsk({ title: 'Remove listing', subtitle: `"${l.title}" — taken down for good`, cta: 'Remove listing', danger: true, run: (r) => act(() => marketAdminAPI.remove(l._id, r), 'Listing removed') });
  const suspend = (s) => setAsk({
    title: `Suspend ${s.user.name}`, subtitle: 'Their live listings are taken down and they can\'t list until lifted', cta: 'Suspend seller', danger: true, withDays: true,
    quick: ['Repeated scam reports', 'Price gouging', 'Selling prohibited items', 'Did not deliver paid orders'],
    run: (r, d) => act(() => marketAdminAPI.suspend(s._id, r, d), 'Seller suspended'),
  });
  const resolve = (rep, action, removeListing) => {
    const run = (resolution = '') => act(() => marketAdminAPI.resolve(rep._id, { action, resolution, removeListing }), action === 'dismiss' ? 'Report dismissed' : removeListing ? 'Upheld — listing removed' : 'Report upheld');
    if (removeListing) setAsk({ title: 'Uphold & remove listing', subtitle: 'Resolves every open report on this listing', cta: 'Remove listing', danger: true, quick: ['Confirmed scam', 'Price gouging', 'Misleading listing', 'Unsafe item'], run });
    else run(action === 'dismiss' ? 'Reviewed — no action needed' : 'Warning issued').catch(() => {});
  };

  const badges = { queue: stats?.pending, reports: stats?.openReports, orders: stats?.disputes };
  const settleDispute = (o, action) => setAsk({
    title: action === 'refund' ? 'Refund the buyer' : 'Pay the seller',
    subtitle: action === 'refund' ? `${naira(o.amount)} goes back to ${o.buyerId?.name || 'the buyer'}` : `${naira(o.sellerAmount)} is released to ${o.sellerId?.name || 'the seller'}`,
    cta: action === 'refund' ? 'Refund buyer' : 'Release payment', danger: action === 'refund',
    quick: action === 'refund' ? ['Item not delivered', 'Item not as described', 'Seller unresponsive'] : ['Delivery confirmed by estate', 'Item matched the listing', 'Buyer\'s claim not supported'],
    run: (note) => act(() => marketAdminAPI.resolveOrder(o._id, action, note), action === 'refund' ? 'Buyer refunded' : 'Seller paid'),
  });
  const current = TABS.find((t) => t.id === tab);
  const TILES = stats ? [
    { k: 'To review', v: stats.pending, onClick: () => go('queue'), alert: stats.pending > 0 },
    { k: 'Open reports', v: stats.openReports, onClick: () => go('reports'), alert: stats.openReports > 0 },
    { k: 'Live listings', v: stats.active, onClick: () => go('listings', 'active') },
    { k: stats.disputes ? 'Disputes' : 'Sold value', v: stats.disputes || `₦${Number(stats.soldValue || 0).toLocaleString('en-NG')}`, onClick: () => { setOrderStatus(stats.disputes ? 'disputed' : 'completed'); go('orders'); }, alert: stats.disputes > 0 },
  ] : [];

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in">
      {/* Overview — every tile jumps to the matching list */}
      <div className="rounded-3xl p-4 sm:p-6 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #064E3B 0%, #047857 55%, #10B981 100%)' }}>
        <div className="absolute -top-16 -right-10 w-52 h-52 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2"><ShoppingBag size={19} /> Marketplace</h1>
            <p className="text-xs text-emerald-50/80 mt-0.5 flex items-center gap-1.5"><ShieldCheck size={12} /> Keep your residents' market fair and safe</p>
          </div>
          <button onClick={() => { load(); loadStats(); }} aria-label="Refresh" className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 shrink-0">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          {(stats ? TILES : Array.from({ length: 4 }, (_, i) => ({ k: i }))).map((t) => (
            <button key={t.k} onClick={t.onClick} disabled={!stats}
              className={`text-left rounded-2xl px-3 py-2.5 transition-colors active:scale-[0.98] ${t.alert ? 'bg-white text-emerald-900' : 'bg-white/10 hover:bg-white/15'}`}>
              <p className={`text-[11px] flex items-center justify-between ${t.alert ? 'text-emerald-700 font-semibold' : 'text-emerald-100/80'}`}>
                {stats ? t.k : '…'} {stats && <ChevronRight size={13} className="opacity-60" />}
              </p>
              <p className="text-lg font-bold leading-tight">{stats ? t.v : '—'}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Sticky section switcher: icon grid on phones, labelled pills on larger screens */}
      <div className="sticky -top-4 md:-top-6 lg:-top-8 z-20 -mx-4 px-4 md:mx-0 md:px-0 py-2 bg-[#F8FAFC]/95 backdrop-blur">
        <nav className="grid grid-cols-6 gap-1 p-1 rounded-2xl bg-white border border-slate-200 shadow-sm">
          {TABS.map(({ id, label, short, icon: Icon }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => go(id)} aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-sm font-semibold transition-colors ${active ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                <Icon size={18} className="sm:w-4 sm:h-4" />
                <span className="sm:hidden">{short}</span><span className="hidden sm:inline">{label}</span>
                {badges[id] > 0 && (
                  <span className={`absolute top-1 right-1.5 sm:static min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${active ? 'bg-white text-emerald-700' : 'bg-red-500 text-white'}`}>{badges[id]}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <SectionHead title={current.label} hint={current.hint} busy={loading} />


      {tab === 'queue' && (queue === null ? <Skeleton /> : queue.length === 0 ? (
        <AllClear title="All caught up" body="Listings held for price checks, reports or approval show up here."
          next={stats?.openReports ? { label: `Review ${stats.openReports} open report${stats.openReports > 1 ? 's' : ''}`, onClick: () => go('reports') } : null} />
      ) : (
        <div className={`grid lg:grid-cols-2 gap-3 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {queue.map((l) => (
            <ListingRow key={l._id} l={l} median={medians[l.category]} actions={<>
              <Btn tone="green" onClick={() => approve(l)}><Check size={16} /> Approve</Btn>
              <Btn tone="red" onClick={() => reject(l)}><X size={16} /> Reject</Btn>
              <Btn onClick={() => remove(l)}><Trash2 size={15} /> Remove</Btn>
            </>} />
          ))}
        </div>
      ))}

      {tab === 'listings' && (
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search listings" className="input-field pl-10 py-3" />
          </div>
          <Chips value={allStatus} onChange={setAllStatus} options={[['active', 'Live'], ['sold', 'Sold'], ['rejected', 'Rejected'], ['removed', 'Removed'], ['all', 'All']]} />
          {sellerFilter && (
            <button onClick={() => setSellerFilter(null)} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[13px] font-semibold px-3 py-1.5">
              {sellerFilter.name}'s listings <X size={14} />
            </button>
          )}
          {all === null ? <Skeleton /> : (all.length === 0 ? <AllClear icon={ShoppingBag} title="No listings" body="Nothing matches this filter." /> : (
            <div className={`grid lg:grid-cols-2 gap-3 transition-opacity ${loading ? 'opacity-60' : ''}`}>
              {all.map((l) => (
                <ListingRow key={l._id} l={l} median={medians[l.category]} actions={
                  ['active', 'sold'].includes(l.status) ? <Btn tone="red" onClick={() => remove(l)}><Trash2 size={15} /> Take down</Btn>
                  : l.status === 'pending_approval' ? <><Btn tone="green" onClick={() => approve(l)}><Check size={16} /> Approve</Btn><Btn tone="red" onClick={() => reject(l)}><X size={16} /> Reject</Btn></>
                  : <Btn tone="green" onClick={() => restore(l)}><RotateCcw size={15} /> Restore</Btn>
                } />
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-3">
          <Chips value={orderStatus} onChange={setOrderStatus} options={[['disputed', 'Disputes'], ['paid', 'Awaiting delivery'], ['delivered', 'Delivered'], ['completed', 'Completed'], ['refunded', 'Refunded'], ['all', 'All']]} />
          {orders === null ? <Skeleton /> : orders.length === 0 ? (
            <AllClear icon={orderStatus === 'disputed' ? CheckCircle2 : Receipt} title={orderStatus === 'disputed' ? 'No disputes' : 'No orders'} body="Residents pay through the app; money is held until the buyer confirms delivery." />
          ) : (
            <div className={`grid lg:grid-cols-2 gap-3 transition-opacity ${loading ? 'opacity-60' : ''}`}>
              {orders.map((o) => (
                <div key={o._id} className="glass-card p-3.5 sm:p-4">
                  <div className="flex gap-3">
                    <Thumb l={{ images: o.image ? [o.image] : [], category: o.category }} size={56} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${o.status === 'disputed' ? 'bg-red-50 text-red-700' : o.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : o.status === 'refunded' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>{o.status === 'paid' ? 'Awaiting delivery' : o.status}</span>
                        {['paid', 'delivered', 'disputed'].includes(o.status) && <span className="text-[10px] font-semibold text-slate-500 inline-flex items-center gap-0.5"><Lock size={10} /> in escrow</span>}
                      </div>
                      <p className="font-semibold text-slate-900 truncate mt-1">{o.title}{o.quantity > 1 ? ` × ${o.quantity}` : ''}</p>
                      <p className="text-sm font-bold text-slate-700">{naira(o.amount)}</p>
                      <p className="text-xs text-slate-500">{o.buyerId?.name || 'Buyer'} → {o.sellerId?.name || 'Seller'} · {ago(o.paidAt)}</p>
                    </div>
                  </div>
                  {o.status === 'disputed' && (
                    <p className="text-sm text-red-800 mt-3 rounded-xl bg-red-50 p-3"><b>{o.dispute?.reason}</b>{o.dispute?.note ? ` — “${o.dispute.note}”` : ''}</p>
                  )}
                  {o.dispute?.resolution && o.status !== 'disputed' && <p className="text-xs text-slate-500 mt-2">Decision: {o.dispute.resolution}{o.dispute.resolvedBy?.name ? ` — ${o.dispute.resolvedBy.name}` : ''}</p>}
                  {o.refund?.status === 'failed' && <p className="text-xs text-red-600 mt-2">Refund failed at Paystack — AreaConnect support will retry it.</p>}
                  {['paid', 'delivered', 'disputed'].includes(o.status) && (
                    <div className="grid grid-cols-2 gap-2 mt-3 sm:flex sm:flex-wrap">
                      <Btn tone="red" onClick={() => settleDispute(o, 'refund')}><RotateCcw size={15} /> Refund buyer</Btn>
                      <Btn tone="green" onClick={() => settleDispute(o, 'release')}><Check size={15} /> Pay seller</Btn>
                      {o.buyerId?._id && <Btn onClick={() => startCall?.(o.buyerId)}><Phone size={15} /> Buyer</Btn>}
                      {o.sellerId?._id && <Btn onClick={() => startCall?.(o.sellerId)}><Phone size={15} /> Seller</Btn>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-3">
          <Chips value={reportStatus} onChange={setReportStatus} options={[['open', 'Open'], ['upheld', 'Upheld'], ['dismissed', 'Dismissed'], ['all', 'All']]} />
          {reports === null ? <Skeleton /> : (reports.length === 0 ? (
            <AllClear icon={Flag} title={reportStatus === 'open' ? 'No open reports' : 'No reports'} body="Residents can report scams, price gouging and misleading listings." />
          ) : (
            <div className={`grid lg:grid-cols-2 gap-3 transition-opacity ${loading ? 'opacity-60' : ''}`}>
              {reports.map((r) => (
                <div key={r._id} className="glass-card p-3.5 sm:p-4">
                  <div className="flex gap-3">
                    <Thumb l={r.listingId} size={56} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-50 text-red-700">{REASON[r.reason]}</span>
                        {r.listingId && <Pill status={r.listingId.status} />}
                      </div>
                      <p className="font-semibold text-slate-900 truncate mt-1">{r.listingId?.title || 'Deleted listing'}</p>
                      {r.listingId && <p className="text-sm font-bold text-slate-700">{naira(r.listingId.price)}</p>}
                      <p className="text-xs text-slate-500">By {r.reporterId?.name || 'a resident'} · {ago(r.createdAt)} · seller {r.sellerId?.name || '—'}</p>
                    </div>
                  </div>
                  {r.note && <p className="text-sm text-slate-700 mt-3 rounded-xl bg-slate-50 p-3">“{r.note}”</p>}
                  {r.status === 'open' ? (
                    <div className="grid grid-cols-2 gap-2 mt-3 sm:flex sm:flex-wrap">
                      <Btn tone="red" onClick={() => resolve(r, 'uphold', true)}><Trash2 size={15} /> Remove listing</Btn>
                      <Btn onClick={() => resolve(r, 'dismiss')}><X size={15} /> Dismiss</Btn>
                      <Btn onClick={() => resolve(r, 'uphold', false)}><Check size={15} /> Uphold, keep</Btn>
                      {r.sellerId?._id && <Btn onClick={() => startCall?.(r.sellerId)}><Phone size={15} /> Call seller</Btn>}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 mt-3 capitalize">{r.status}{r.resolution ? ` — ${r.resolution}` : ''}{r.resolvedBy?.name ? ` · ${r.resolvedBy.name}` : ''}</p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'sellers' && (sellers === null ? <Skeleton rows={4} compact /> : sellers.length === 0 ? <AllClear icon={Users} title="No sellers yet" body="Residents who list items appear here." /> : (
        <div className={`glass-card divide-y divide-slate-100 overflow-hidden transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {sellers.map((s) => (
            <button key={s._id} onClick={() => setSellerOpen(s)} className="w-full p-3.5 sm:p-4 flex items-center gap-3 text-left hover:bg-slate-50 active:bg-slate-50">
              <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center shrink-0 overflow-hidden">
                {s.user.profilePhoto ? <img src={img(s.user.profilePhoto)} alt="" className="w-full h-full object-cover" /> : (s.user.name || '?')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate flex items-center gap-2">{s.user.name} {s.suspended && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-50 text-red-700">Suspended</span>}</p>
                <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2">
                  <Rating r={s.rating} /> <span>{s.active} live · {s.sold} sold</span>
                  {s.reports.all > 0 && <span className={s.reports.upheld || s.reports.open ? 'text-red-600 font-semibold' : ''}>{s.reports.all} report{s.reports.all > 1 ? 's' : ''}</span>}
                </p>
              </div>
              <ChevronRight size={18} className="text-slate-300 shrink-0" />
            </button>
          ))}
        </div>
      ))}

      {tab === 'rules' && <Rules settings={settings} onSaved={(s) => setSettings((x) => ({ ...s, medians: x.medians }))} />}

      <SellerSheet seller={sellerOpen} onClose={() => setSellerOpen(null)}
        onCall={() => { startCall?.({ _id: sellerOpen._id, ...sellerOpen.user }); setSellerOpen(null); }}
        onListings={() => { setSellerFilter({ _id: sellerOpen._id, name: sellerOpen.user.name.split(' ')[0] }); setSellerOpen(null); go('listings', 'all'); }}
        onSuspend={() => { const s = sellerOpen; setSellerOpen(null); suspend(s); }}
        onLift={() => { const s = sellerOpen; setSellerOpen(null); act(() => marketAdminAPI.unsuspend(s._id), 'Suspension lifted').catch(() => {}); }} />
      <ReasonSheet ask={ask} onClose={() => setAsk(null)} />
    </div>
  );
}

const toForm = (s) => ({
  requireApproval: !!s.requireApproval,
  priceCaps: Object.fromEntries(Object.keys(CAT).map((c) => [c, s.priceCaps?.[c] ?? ''])),
  outlierMultiplier: s.outlierMultiplier, maxActivePerSeller: s.maxActivePerSeller,
  autoHideReports: s.autoHideReports, bannedWords: (s.bannedWords || []).join(', '),
});

function Rules({ settings, onSaved }) {
  const [f, setF] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (settings) setF(toForm(settings)); }, [settings]);
  const dirty = useMemo(() => f && settings && JSON.stringify(f) !== JSON.stringify(toForm(settings)), [f, settings]);
  if (!f) return <Skeleton rows={2} />;
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await marketAdminAPI.saveSettings({ ...f, bannedWords: f.bannedWords.split(',').map((w) => w.trim()).filter(Boolean) });
      onSaved(data.data); toast.success('Marketplace rules saved');
    } catch (e) { toast.error(e.response?.data?.message || 'Couldn\'t save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass-card p-4 sm:p-5 space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><TrendingUp size={17} className="text-emerald-600" /> Price caps</h3>
            <p className="text-xs text-slate-500 mt-0.5">Listings above the cap are refused. Leave blank for no cap.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            {Object.entries(CAT).map(([c, meta]) => (
              <div key={c}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-700">{meta.emoji} {meta.label}</span>
                  <span className="text-[11px] text-slate-400">{settings.medians?.[c] ? `typical ${naira(settings.medians[c])}` : 'no data yet'}</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₦</span>
                  <input type="number" inputMode="numeric" min="0" value={f.priceCaps[c]} onChange={(e) => set('priceCaps', { ...f.priceCaps, [c]: e.target.value })} placeholder="No cap" className="input-field pl-7 py-3" />
                </div>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-slate-100">
            <p className="text-sm font-semibold text-slate-800">Price-gouging check</p>
            <p className="text-xs text-slate-500 mb-2">Hold a listing for review when it's priced this many times above typical.</p>
            <div className="grid grid-cols-4 gap-1.5">
              {[[0, 'Off'], [2, '2×'], [3, '3×'], [5, '5×']].map(([v, l]) => (
                <button key={v} onClick={() => set('outlierMultiplier', v)} className={`py-2.5 rounded-xl text-sm font-semibold border ${Number(f.outlierMultiplier) === v ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}>{l}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card p-4 sm:p-5 space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><ShieldCheck size={17} className="text-emerald-600" /> Consumer protection</h3>
            <p className="text-xs text-slate-500 mt-0.5">How listings go live and what happens when residents complain.</p>
          </div>
          <button type="button" onClick={() => set('requireApproval', !f.requireApproval)} className="w-full flex items-center gap-3 text-left rounded-xl border border-slate-200 p-3">
            <span className="flex-1"><span className="text-sm font-semibold text-slate-800 block">Approve every listing</span><span className="text-xs text-slate-500">New and edited listings wait in your review queue.</span></span>
            <span className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${f.requireApproval ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${f.requireApproval ? 'translate-x-5' : ''}`} />
            </span>
          </button>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Max live listings / seller</label>
              <input type="number" inputMode="numeric" min="1" value={f.maxActivePerSeller} onChange={(e) => set('maxActivePerSeller', e.target.value)} className="input-field mt-1 py-3" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Hide after N reports</label>
              <input type="number" inputMode="numeric" min="1" value={f.autoHideReports} onChange={(e) => set('autoHideReports', e.target.value)} className="input-field mt-1 py-3" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Banned words (comma separated)</label>
            <textarea rows={3} value={f.bannedWords} onChange={(e) => set('bannedWords', e.target.value)} placeholder="e.g. tramadol, codeine, gun" className="input-field mt-1 resize-none" />
            <p className="text-[11px] text-slate-400 mt-1">Listings containing these words are refused.</p>
          </div>
        </div>
      </div>

      {/* Save bar: floats above the bottom nav on phones once something changes */}
      <div className={`${dirty ? 'sticky' : 'hidden lg:flex'} bottom-[4.5rem] lg:bottom-0 lg:static z-20 flex justify-end`}>
        <div className={`w-full lg:w-auto flex items-center gap-3 ${dirty ? 'rounded-2xl bg-slate-900 p-2 pl-4 shadow-xl lg:bg-transparent lg:p-0 lg:shadow-none' : ''}`}>
          {dirty && <span className="flex-1 text-sm text-white lg:hidden">Unsaved changes</span>}
          <button onClick={save} disabled={saving || !dirty} className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save rules'}</button>
        </div>
      </div>
    </div>
  );
}

function AllClear({ icon: Icon = CheckCircle2, title, body, next }) {
  return (
    <div className="glass-card py-12 text-center px-6">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center mb-3"><Icon size={26} className="text-emerald-500" /></div>
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="text-sm text-slate-400 mt-1">{body}</p>
      {next && <button onClick={next.onClick} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">{next.label} <ChevronRight size={15} /></button>}
    </div>
  );
}
