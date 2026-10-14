import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  ShoppingBag, RefreshCw, ShieldCheck, Check, X, Flag, Users, Settings2, ListChecks, Search,
  Ban, RotateCcw, Trash2, Star, AlertTriangle, TrendingUp, Phone,
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

function ListingRow({ l, median, actions }) {
  const s = l.sellerId || {};
  const over = median && l.price > median ? Math.round((l.price / median) * 10) / 10 : null;
  return (
    <div className="glass-card p-4">
      <div className="flex gap-3">
        <Thumb l={l} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap"><Pill status={l.status} /><span className="text-xs text-slate-400">{CAT[l.category]?.emoji} {CAT[l.category]?.label} · {ago(l.createdAt)}</span></div>
          <p className="font-semibold text-slate-900 truncate mt-1">{l.title}</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-bold text-slate-900">{naira(l.price)}</span>
            {median && <span className={`text-xs ${over >= 2 ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>typical {naira(median)}{over >= 1.5 ? ` · ${over}×` : ''}</span>}
            {l.priceHistory?.length > 1 && <span className="text-xs text-slate-400">({l.priceHistory.map((p) => naira(p.price)).join(' → ')})</span>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">{s.name || 'Resident'} <Rating r={l.sellerRating} /> {l.reportCount > 0 && <span className="text-red-600 font-semibold">· {l.reportCount} report{l.reportCount > 1 ? 's' : ''}</span>}</p>
        </div>
      </div>
      {l.description && <p className="text-sm text-slate-600 mt-3 line-clamp-3" style={{ whiteSpace: 'pre-wrap' }}>{l.description}</p>}
      {l.flags?.length > 0 && l.status === 'pending_approval' && (
        <div className="mt-3 space-y-1">
          {l.flags.map((f, i) => <p key={i} className="text-xs rounded-lg bg-amber-50 text-amber-800 px-2.5 py-1.5 flex gap-1.5"><AlertTriangle size={13} className="shrink-0 mt-px" /><span><b>{FLAG[f.type] || f.type}</b>{f.detail ? ` — ${f.detail}` : ''}</span></p>)}
        </div>
      )}
      {l.moderation?.reason && ['rejected', 'removed'].includes(l.status) && (
        <p className="text-xs text-slate-500 mt-2">Reason: {l.moderation.reason}{l.moderation.by?.name ? ` — ${l.moderation.by.name}` : ''}</p>
      )}
      {actions && <div className="flex gap-2 mt-3 flex-wrap">{actions}</div>}
    </div>
  );
}

const Btn = ({ tone = 'slate', children, ...p }) => {
  const t = { green: 'bg-emerald-600 text-white hover:bg-emerald-700', red: 'bg-red-50 text-red-700 hover:bg-red-100', slate: 'bg-slate-100 text-slate-700 hover:bg-slate-200' }[tone];
  return <button {...p} className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold disabled:opacity-40 ${t}`}>{children}</button>;
};

export default function Marketplace() {
  const { startCall } = useCall() || {};
  const [tab, setTab] = useState('queue');
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [medians, setMedians] = useState({});
  const [all, setAll] = useState([]);
  const [allStatus, setAllStatus] = useState('active');
  const [q, setQ] = useState('');
  const [reports, setReports] = useState([]);
  const [reportStatus, setReportStatus] = useState('open');
  const [sellers, setSellers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ask, setAsk] = useState(null);

  const loadStats = () => marketAdminAPI.stats().then(({ data }) => setStats(data.data)).catch(() => {});
  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'queue') { const { data } = await marketAdminAPI.listings({ status: 'pending_approval' }); setQueue(data.data); setMedians(data.medians || {}); }
      if (tab === 'listings') { const { data } = await marketAdminAPI.listings({ status: allStatus, q: q || undefined }); setAll(data.data); setMedians(data.medians || {}); }
      if (tab === 'reports') { const { data } = await marketAdminAPI.reports(reportStatus); setReports(data.data); }
      if (tab === 'sellers') { const { data } = await marketAdminAPI.sellers(); setSellers(data.data); }
      if (tab === 'rules') { const { data } = await marketAdminAPI.settings(); setSettings({ ...data.data, medians: data.medians }); }
    } catch (e) { toast.error(e.response?.data?.message || 'Couldn\'t load'); }
    finally { setLoading(false); }
  }, [tab, allStatus, q, reportStatus]);

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { const t = setTimeout(load, tab === 'listings' ? 250 : 0); return () => clearTimeout(t); }, [load, tab]);

  const act = async (fn, msg) => {
    try { await fn(); toast.success(msg); load(); loadStats(); }
    catch (e) { toast.error(e.response?.data?.message || 'Action failed'); throw e; }
  };
  const approve = (l) => act(() => marketAdminAPI.approve(l._id), 'Approved — the listing is live');
  const restore = (l) => act(() => marketAdminAPI.restore(l._id), 'Listing restored');
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
    else run(action === 'dismiss' ? 'Reviewed — no action needed' : 'Warning issued');
  };

  const TABS = [
    ['queue', 'Review queue', ListChecks, stats?.pending],
    ['reports', 'Reports', Flag, stats?.openReports],
    ['listings', 'Listings', ShoppingBag],
    ['sellers', 'Sellers', Users],
    ['rules', 'Price & rules', Settings2],
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="rounded-3xl p-5 sm:p-6 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #064E3B 0%, #047857 55%, #10B981 100%)' }}>
        <div className="absolute -top-16 -right-10 w-52 h-52 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-emerald-100/90 text-sm"><ShoppingBag size={15} /> Marketplace</div>
            <p className="text-lg font-bold mt-1">Keep your residents' market fair and safe</p>
            <p className="text-xs text-emerald-50/80 mt-1 flex items-center gap-1.5"><ShieldCheck size={12} /> Price caps, gouging checks, reports and seller suspensions</p>
          </div>
          <button onClick={() => { load(); loadStats(); }} aria-label="Refresh" className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 shrink-0">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        {stats && (
          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
            {[['Live listings', stats.active], ['To review', stats.pending], ['Open reports', stats.openReports], ['Sold value', `₦${Number(stats.soldValue || 0).toLocaleString('en-NG')}`]].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-white/10 px-3 py-2.5"><p className="text-[11px] text-emerald-100/80">{k}</p><p className="text-lg font-bold">{v}</p></div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-1 p-1 rounded-2xl bg-slate-100 overflow-x-auto no-scrollbar">
        {TABS.map(([id, label, Icon, badge]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`shrink-0 flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
            <Icon size={15} /> {label}
            {badge > 0 && <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">{badge}</span>}
          </button>
        ))}
      </div>

      {loading && tab !== 'rules' && <div className="py-12 flex justify-center"><RefreshCw size={22} className="animate-spin text-emerald-500" /></div>}

      {!loading && tab === 'queue' && (queue.length === 0 ? (
        <Empty icon={ListChecks} title="Nothing to review" body="Listings held for price checks, reports or approval show up here." />
      ) : (
        <div className="grid lg:grid-cols-2 gap-3">
          {queue.map((l) => (
            <ListingRow key={l._id} l={l} median={medians[l.category]} actions={<>
              <Btn tone="green" onClick={() => approve(l)}><Check size={15} /> Approve</Btn>
              <Btn tone="red" onClick={() => reject(l)}><X size={15} /> Reject</Btn>
              <Btn onClick={() => remove(l)}><Trash2 size={14} /> Remove</Btn>
            </>} />
          ))}
        </div>
      ))}

      {tab === 'listings' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search listings" className="input-field pl-10" />
            </div>
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {['active', 'sold', 'rejected', 'removed', 'all'].map((s) => (
                <button key={s} onClick={() => setAllStatus(s)} className={`shrink-0 px-3 py-2 rounded-xl text-sm font-semibold capitalize ${allStatus === s ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{s === 'active' ? 'Live' : s}</button>
              ))}
            </div>
          </div>
          {!loading && (all.length === 0 ? <Empty icon={ShoppingBag} title="No listings" body="Nothing matches this filter." /> : (
            <div className="grid lg:grid-cols-2 gap-3">
              {all.map((l) => (
                <ListingRow key={l._id} l={l} median={medians[l.category]} actions={<>
                  {['active', 'sold', 'pending_approval'].includes(l.status) && <Btn tone="red" onClick={() => remove(l)}><Trash2 size={14} /> Take down</Btn>}
                  {['removed', 'rejected'].includes(l.status) && <Btn tone="green" onClick={() => restore(l)}><RotateCcw size={14} /> Restore</Btn>}
                  {l.status === 'pending_approval' && <Btn tone="green" onClick={() => approve(l)}><Check size={15} /> Approve</Btn>}
                </>} />
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-3">
          <div className="flex gap-1">
            {['open', 'upheld', 'dismissed', 'all'].map((s) => (
              <button key={s} onClick={() => setReportStatus(s)} className={`px-3 py-2 rounded-xl text-sm font-semibold capitalize ${reportStatus === s ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{s}</button>
            ))}
          </div>
          {!loading && (reports.length === 0 ? <Empty icon={Flag} title={reportStatus === 'open' ? 'No open reports' : 'No reports'} body="Residents can report scams, price gouging and misleading listings." /> : (
            <div className="grid lg:grid-cols-2 gap-3">
              {reports.map((r) => (
                <div key={r._id} className="glass-card p-4">
                  <div className="flex gap-3">
                    <Thumb l={r.listingId} size={56} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-50 text-red-700">{REASON[r.reason]}</span>
                        {r.listingId && <Pill status={r.listingId.status} />}
                      </div>
                      <p className="font-semibold text-slate-900 truncate mt-1">{r.listingId?.title || 'Deleted listing'} {r.listingId && <span className="font-normal text-slate-500">· {naira(r.listingId.price)}</span>}</p>
                      <p className="text-xs text-slate-500">Seller {r.sellerId?.name || '—'} · reported by {r.reporterId?.name || 'a resident'} {ago(r.createdAt)}</p>
                    </div>
                  </div>
                  {r.note && <p className="text-sm text-slate-700 mt-3 rounded-xl bg-slate-50 p-3">"{r.note}"</p>}
                  {r.status === 'open' ? (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <Btn tone="red" onClick={() => resolve(r, 'uphold', true)}><Trash2 size={14} /> Uphold & remove</Btn>
                      <Btn onClick={() => resolve(r, 'uphold', false)}><Check size={14} /> Uphold, keep</Btn>
                      <Btn onClick={() => resolve(r, 'dismiss')}><X size={14} /> Dismiss</Btn>
                      {r.sellerId?._id && <Btn onClick={() => startCall?.(r.sellerId)}><Phone size={14} /> Call seller</Btn>}
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

      {!loading && tab === 'sellers' && (sellers.length === 0 ? <Empty icon={Users} title="No sellers yet" body="Residents who list items appear here." /> : (
        <div className="glass-card divide-y divide-slate-100 overflow-hidden">
          {sellers.map((s) => (
            <div key={s._id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center shrink-0 overflow-hidden">
                  {s.user.profilePhoto ? <img src={img(s.user.profilePhoto)} alt="" className="w-full h-full object-cover" /> : (s.user.name || '?')[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate flex items-center gap-2">{s.user.name} {s.suspended && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-50 text-red-700">Suspended</span>}</p>
                  <p className="text-xs text-slate-500 flex flex-wrap gap-x-2">
                    <Rating r={s.rating} /> <span>{s.active} live · {s.sold} sold · {s.removed} taken down</span>
                    {s.reports.all > 0 && <span className={s.reports.upheld ? 'text-red-600 font-semibold' : ''}>{s.reports.all} reports ({s.reports.upheld} upheld)</span>}
                  </p>
                  {s.suspended && <p className="text-xs text-red-600">{s.suspended.reason}{s.suspended.until ? ` · until ${new Date(s.suspended.until).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}` : ''}</p>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {<Btn onClick={() => startCall?.({ _id: s._id, ...s.user })}><Phone size={14} /> Call</Btn>}
                {s.suspended
                  ? <Btn tone="green" onClick={() => act(() => marketAdminAPI.unsuspend(s._id), 'Suspension lifted')}><RotateCcw size={14} /> Lift suspension</Btn>
                  : <Btn tone="red" onClick={() => suspend(s)}><Ban size={14} /> Suspend</Btn>}
              </div>
            </div>
          ))}
        </div>
      ))}

      {tab === 'rules' && <Rules settings={settings} onSaved={(s) => setSettings((x) => ({ ...s, medians: x.medians }))} />}

      <ReasonSheet ask={ask} onClose={() => setAsk(null)} />
    </div>
  );
}

function Rules({ settings, onSaved }) {
  const [f, setF] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (settings) setF({
      requireApproval: settings.requireApproval,
      priceCaps: Object.fromEntries(Object.keys(CAT).map((c) => [c, settings.priceCaps?.[c] ?? ''])),
      outlierMultiplier: settings.outlierMultiplier, maxActivePerSeller: settings.maxActivePerSeller,
      autoHideReports: settings.autoHideReports, bannedWords: (settings.bannedWords || []).join(', '),
    });
  }, [settings]);
  if (!f) return <div className="py-12 flex justify-center"><RefreshCw size={22} className="animate-spin text-emerald-500" /></div>;
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
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="glass-card p-5 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><TrendingUp size={17} className="text-emerald-600" /> Price control</h3>
          <p className="text-xs text-slate-500 mt-0.5">Hard caps refuse listings above the limit. Leave blank for no cap.</p>
        </div>
        {Object.entries(CAT).map(([c, meta]) => (
          <div key={c} className="flex items-center gap-3">
            <span className="w-28 text-sm font-medium text-slate-700">{meta.emoji} {meta.label}</span>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₦</span>
              <input type="number" min="0" value={f.priceCaps[c]} onChange={(e) => set('priceCaps', { ...f.priceCaps, [c]: e.target.value })} placeholder="No cap" className="input-field pl-7" />
            </div>
            <span className="w-24 text-[11px] text-slate-400 text-right">{settings.medians?.[c] ? `typical ${naira(settings.medians[c])}` : '—'}</span>
          </div>
        ))}
        <div className="pt-2 border-t border-slate-100">
          <label className="text-sm font-semibold text-slate-800">Price-gouging check</label>
          <p className="text-xs text-slate-500 mb-2">Hold a listing for review when its price is more than this many times the typical price in its category.</p>
          <div className="flex gap-1.5">
            {[[0, 'Off'], [2, '2×'], [3, '3×'], [5, '5×']].map(([v, l]) => (
              <button key={v} onClick={() => set('outlierMultiplier', v)} className={`flex-1 py-2 rounded-xl text-sm font-semibold border ${Number(f.outlierMultiplier) === v ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card p-5 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><ShieldCheck size={17} className="text-emerald-600" /> Consumer protection</h3>
          <p className="text-xs text-slate-500 mt-0.5">How listings get onto the market and what happens when residents complain.</p>
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={f.requireApproval} onChange={(e) => set('requireApproval', e.target.checked)} className="mt-1 w-4 h-4 accent-emerald-600" />
          <span><span className="text-sm font-semibold text-slate-800">Approve every listing</span><span className="block text-xs text-slate-500">New and edited listings wait in your review queue before residents can see them.</span></span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700">Max live listings per seller</label>
            <input type="number" min="1" value={f.maxActivePerSeller} onChange={(e) => set('maxActivePerSeller', e.target.value)} className="input-field mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Hide after N reports</label>
            <input type="number" min="1" value={f.autoHideReports} onChange={(e) => set('autoHideReports', e.target.value)} className="input-field mt-1" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700">Banned words (comma separated)</label>
          <textarea rows={3} value={f.bannedWords} onChange={(e) => set('bannedWords', e.target.value)} placeholder="e.g. tramadol, codeine, gun" className="input-field mt-1 resize-none" />
          <p className="text-[11px] text-slate-400 mt-1">Listings containing these words are refused.</p>
        </div>
      </div>

      <div className="lg:col-span-2 flex justify-end">
        <button onClick={save} disabled={saving} className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save rules'}</button>
      </div>
    </div>
  );
}

function Empty({ icon: Icon, title, body }) {
  return (
    <div className="glass-card py-14 text-center px-6">
      <Icon size={28} className="mx-auto text-slate-300 mb-3" />
      <p className="font-semibold text-slate-700">{title}</p>
      <p className="text-sm text-slate-400 mt-1">{body}</p>
    </div>
  );
}
