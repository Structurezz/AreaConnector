import { RollCallStrip } from '../site/RollCall';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UserCheck, Bell, Home, Megaphone, ArrowRight, ArrowUpRight, ShieldCheck, ShieldAlert,
  Plus, UsersRound, LogIn, UserPlus, Users, MapPin, Activity, Zap,
  Wallet, Shield, CalendarDays, BarChart3, Clock, AlertTriangle, BedDouble, Truck, LogOut,
} from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { lower } from '../../utils/siteTypes';
import useSitePlaces from '../site/useSitePlaces';
import { siteAPI, gateLogAPI } from '../../api';
import { format, subDays, formatDistanceToNow, isAfter, startOfDay } from 'date-fns';
import { visitorAPI, paymentAPI, guardAPI, eventAPI, pollAPI } from '../../api';
import { VISITOR_STATUS, purposeIcon } from '../visitors/MobileVisitors';
import EstateMap from '../EstateMap';
import useCountUp from '../../hooks/useCountUp';
import { CampaignBanner } from '../campaigns/CampaignSlots';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// Visitor totals per day for the past 7 days (uses the list endpoint's pagination total)
function useWeeklyTraffic() {
  const [days, setDays] = useState(null);
  useEffect(() => {
    const dates = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
    Promise.all(dates.map((d) =>
      visitorAPI.getAll({ date: format(d, 'yyyy-MM-dd'), limit: 1 })
        .then((r) => r.data.pagination?.total ?? 0)
        .catch(() => 0),
    )).then((totals) => setDays(dates.map((d, i) => ({ date: d, count: totals[i] }))));
  }, []);
  return days;
}

const delay = (i) => ({ animationDelay: `${i * 50}ms` });
const CARD = 'dash-rise rounded-2xl bg-white border border-slate-200/70';

/* ── Pieces ─────────────────────────────────────────────────────────── */

function CardHead({ title, Icon, color = '#10B981', right }) {
  return (
    <div className="flex items-center justify-between px-5 h-12 border-b border-slate-100">
      <h2 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2" style={{ letterSpacing: '-0.01em' }}>
        {Icon && (
          <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 4px 10px -4px ${color}` }}>
            <Icon size={13} className="text-white" />
          </span>
        )}
        {title}
      </h2>
      {right}
    </div>
  );
}

function HeadLink({ to, children }) {
  return (
    <Link to={to} className="group text-[12px] font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors">
      {children} <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function Sparkline({ data, color }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 64, h = 22;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 2 - (v / max) * (h - 4)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        className="dash-ring" style={{ strokeDasharray: 200, '--len': 200 }} />
      <circle cx={pts.at(-1)[0]} cy={pts.at(-1)[1]} r="2.5" fill={color} />
    </svg>
  );
}

function Stat({ i, label, value, Icon, color, to, sub, spark, live }) {
  const n = useCountUp(value);
  return (
    <Link to={to} className="dash-tile dash-rise group rounded-2xl p-4 border min-w-0"
      style={{ animationDelay: `${60 + i * 60}ms`, textDecoration: 'none', background: `linear-gradient(140deg, ${color}17 0%, #FFFFFF 55%)`, borderColor: `${color}2E` }}>
      <span className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full pointer-events-none transition-transform duration-500 group-hover:scale-125" style={{ background: `${color}12` }} />
      <div className="relative flex items-center justify-between">
        <span className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 14px -6px ${color}` }}>
          <Icon size={15} className="text-white" />
        </span>
        {live ? (
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full animate-ping opacity-70" style={{ background: color }} />
            <span className="relative w-2 h-2 rounded-full" style={{ background: color }} />
          </span>
        ) : (
          <ArrowUpRight size={14} className="text-slate-300 transition-all group-hover:text-slate-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        )}
      </div>
      <div className="relative mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[24px] font-semibold leading-none text-slate-900 tabular-nums" style={{ letterSpacing: '-0.03em' }}>{n}</div>
          <div className="mt-1 text-[12px] font-medium text-slate-500 truncate">{label}</div>
        </div>
        {spark && <Sparkline data={spark} color={color} />}
      </div>
      {sub && <div className="relative mt-1 text-[11px] text-slate-400 truncate">{sub}</div>}
    </Link>
  );
}

function TrafficChart({ days }) {
  const [hover, setHover] = useState(null);
  const list = days || Array.from({ length: 7 }, (_, i) => ({ date: subDays(new Date(), 6 - i), count: 0, loading: true }));
  const max = Math.max(1, ...list.map((d) => d.count));
  const total = days ? days.reduce((t, d) => t + d.count, 0) : null;
  const avg = days ? (total / 7).toFixed(1) : null;

  return (
    <div className={`${CARD} h-full flex flex-col`} style={delay(6)}>
      <CardHead title="Visitor traffic" Icon={Activity} color="#10B981" right={<span className="text-[12px] text-slate-400">Last 7 days</span>} />
      <div className="px-5 pt-4 flex items-baseline gap-3">
        <div>
          <span className="text-[22px] font-semibold text-slate-900 tabular-nums" style={{ letterSpacing: '-0.03em' }}>{total ?? '—'}</span>
          <span className="ml-1.5 text-[12px] text-slate-400">visitors</span>
        </div>
        {avg && <span className="text-[12px] text-slate-400">· {avg} a day on average</span>}
      </div>
      <div className="flex-1 min-h-[150px] flex items-end gap-2.5 px-5 pb-4 pt-5">
        {list.map((d, i) => {
          const h = d.loading ? 10 : Math.max(3, (d.count / max) * 100);
          const isToday = i === 6;
          const on = hover === i;
          return (
            <div key={i} className="relative flex-1 h-full flex flex-col items-center justify-end gap-2"
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {on && !d.loading && (
                <div className="absolute z-10 px-2 py-1 rounded-md bg-slate-900 text-white text-[11px] font-medium whitespace-nowrap animate-scale-in"
                  style={{ bottom: `calc(${h}% + 26px)` }}>
                  {d.count} · {format(d.date, 'EEE d MMM')}
                </div>
              )}
              <div className="w-full flex-1 flex items-end">
                <div className={`dash-bar w-full rounded-lg transition-colors duration-200 ${d.loading ? 'skeleton' : ''}`}
                  style={{
                    height: `${h}%`,
                    animationDelay: `${200 + i * 50}ms`,
                    background: d.loading ? undefined : isToday ? 'linear-gradient(180deg, #34D399, #059669)' : on ? 'linear-gradient(180deg, #6EE7B7, #34D399)' : 'linear-gradient(180deg, #A7F3D0, #ECFDF5)',
                    boxShadow: isToday && !d.loading ? '0 8px 18px -8px rgba(5,150,105,0.7)' : 'none',
                  }} />
              </div>
              <span className={`text-[11px] ${isToday ? 'font-semibold text-emerald-600' : 'text-slate-400'}`}>
                {isToday ? 'Today' : format(d.date, 'EEE')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SecurityCard({ alerts }) {
  const hot = alerts.length > 0;
  return (
    <div className={`${CARD} h-full flex flex-col overflow-hidden ${hot ? '!border-red-200' : '!border-emerald-200/70'}`}
      style={{ ...delay(7), background: hot ? 'linear-gradient(160deg, #FEF2F2 0%, #FFFFFF 60%)' : 'linear-gradient(160deg, #ECFDF5 0%, #FFFFFF 60%)' }}>
      <CardHead title="Security" Icon={hot ? ShieldAlert : ShieldCheck} color={hot ? '#EF4444' : '#10B981'} right={<HeadLink to="/alerts">Alerts</HeadLink>} />
      {!hot ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-5 py-6">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <span className="dash-ripple absolute inset-0 rounded-full border border-emerald-300" />
            <span className="dash-ripple absolute inset-0 rounded-full border border-emerald-300" style={{ animationDelay: '1s' }} />
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #34D399, #059669)', boxShadow: '0 8px 18px -8px rgba(5,150,105,0.8)' }}>
              <ShieldCheck size={18} className="text-white" />
            </div>
          </div>
          <div className="text-[14px] font-semibold text-slate-900 mt-3">All quiet</div>
          <div className="text-[12px] text-slate-400 mt-0.5">No open alerts right now</div>
        </div>
      ) : (
        <div className="flex-1 p-3 space-y-1">
          <div className="flex items-center gap-2 px-2 pb-2">
            <ShieldAlert size={15} className="text-red-500" />
            <span className="text-[13px] font-semibold text-red-600">{alerts.length} open alert{alerts.length === 1 ? '' : 's'}</span>
          </div>
          {alerts.slice(0, 4).map((a) => (
            <Link key={a._id} to="/alerts" className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-red-50/60 transition-colors" style={{ textDecoration: 'none' }}>
              <span className="relative flex w-1.5 h-1.5 flex-shrink-0">
                <span className="absolute inset-0 rounded-full bg-red-400 animate-ping" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-red-500" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium capitalize text-slate-900 truncate">{a.type}</div>
                <div className="text-[11px] text-slate-400 truncate">{a.residentId?.name || 'Unknown'}</div>
              </div>
              <span className="text-[11px] text-slate-400 flex-shrink-0">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const VTONE = { active: '#10B981', 'checked-in': '#2563EB', 'checked-out': '#64748B', expired: '#D97706', blacklisted: '#DC2626', cancelled: '#94A3B8', pending: '#6366F1' };

function RecentVisitors({ visitors }) {
  const site = useSite();
  return (
    <div className={`${CARD} overflow-hidden`} style={delay(8)}>
      <CardHead title="Recent visitors" Icon={UserCheck} color="#0EA5E9" right={<HeadLink to="/visitors">Visitor log</HeadLink>} />
      {visitors.length === 0 ? (
        <div className="py-10 text-center">
          <UserCheck size={20} className="mx-auto text-slate-300" />
          <p className="text-[13px] text-slate-500 mt-2">No visitors yet</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {visitors.slice(0, 6).map((v, i) => {
            const st = VISITOR_STATUS[v.status] || VISITOR_STATUS['checked-out'];
            const tone = VTONE[v.status] || '#64748B';
            const [PIcon, pColor, pBg] = purposeIcon(v.purpose);
            const initials = (v.visitorName || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
            const unit = v.hostUnitId?.unitNumber ? `${v.hostUnitId.block ? `${v.hostUnitId.block} · ` : ''}${v.hostUnitId.unitNumber}` : '';
            return (
              <Link key={v._id} to={`/visitors/${v._id}`}
                className="dash-rise group flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50/80 transition-colors"
                style={{ animationDelay: `${450 + i * 40}ms`, textDecoration: 'none' }}>
                <span className="relative flex-shrink-0">
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold text-white transition-transform group-hover:scale-105"
                    style={{ background: `linear-gradient(135deg, ${tone}, ${tone}BB)`, boxShadow: `0 6px 14px -8px ${tone}` }}>{initials}</span>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-md flex items-center justify-center border-2 border-white" style={{ background: pBg, color: pColor }}>
                    <PIcon size={8} />
                  </span>
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-semibold text-slate-900 truncate">{v.visitorName}</span>
                  <span className="block text-[11px] text-slate-400 truncate capitalize">{v.purpose} · {v.hostResidentId?.name || site.terms.manager}{unit && ` · ${unit}`}</span>
                </span>
                <span className="text-[11.5px] text-slate-500 whitespace-nowrap tabular-nums">{v.expectedDate ? format(new Date(v.expectedDate), 'MMM d, h:mm a') : '—'}</span>
                <span className="w-[104px] flex justify-end">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: st.bg, color: st.text }}>
                    <span className={`w-1.5 h-1.5 rounded-full ${v.status === 'checked-in' ? 'animate-pulse' : ''}`} style={{ background: st.dot }} />
                    {st.label}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Notices({ items }) {
  return (
    <div className={CARD} style={delay(9)}>
      <CardHead title="Notices" Icon={Megaphone} color="#F59E0B" right={
        <Link to="/announcements" aria-label="Post notice"
          className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all hover:rotate-90">
          <Plus size={14} />
        </Link>
      } />
      {items.length === 0 ? (
        <p className="px-5 py-4 text-[12px] text-slate-400">Nothing posted yet.</p>
      ) : (
        <div className="py-1.5">
          {items.slice(0, 3).map((a) => (
            <Link key={a._id} to="/announcements" className="flex items-start gap-2.5 px-5 py-2 hover:bg-slate-50/80 transition-colors" style={{ textDecoration: 'none' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-[7px] flex-shrink-0 ring-4 ring-amber-100" />
              <span className="min-w-0">
                <span className="block text-[13px] text-slate-800 truncate">{a.title}</span>
                <span className="block text-[11px] text-slate-400">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const ACTIONS = [
  { to: '/visitors/new',  icon: UserPlus,  label: 'New visitor', color: '#10B981' },
  { to: '/residents',     icon: Users,     label: (t) => t.members, color: '#6366F1' },
  { to: '/units',         icon: Home,      label: (t) => t.units,   color: '#8B5CF6' },
  { to: '/announcements', icon: Megaphone, label: 'Post notice', color: '#F59E0B' },
];

function QuickActions() {
  const site = useSite();
  const actions = ACTIONS.map(a => {
    // Hotels get the room board instead of the plain units list
    if (a.to === '/units' && site.modules?.stays) return { to: '/rooms', icon: BedDouble, label: `${site.terms.unit} board`, color: '#8B5CF6' };
    return { ...a, label: typeof a.label === 'function' ? a.label(site.terms) : a.label };
  });
  return (
    <div className={CARD} style={delay(10)}>
      <CardHead title="Shortcuts" Icon={Zap} color="#8B5CF6" />
      <div className="grid grid-cols-2 gap-2 p-3">
        {actions.map(({ to, icon: Icon, label, color }) => (
          <Link key={to} to={to}
            className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{ textDecoration: 'none', background: `linear-gradient(135deg, ${color}12, #fff 70%)`, borderColor: `${color}26` }}>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 group-hover:-rotate-6"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 12px -6px ${color}` }}>
              <Icon size={14} className="text-white" />
            </span>
            <span className="text-[12px] font-medium text-slate-700">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Money, guards and community data — each part fails independently (team members may lack access)
function useExtras() {
  const [x, setX] = useState({ loading: true });
  useEffect(() => {
    Promise.allSettled([paymentAPI.getStats(), paymentAPI.getWallet(), guardAPI.getAll({ limit: 50 }), eventAPI.getAll(), pollAPI.getAll()])
      .then(([ps, w, g, e, p]) => {
        const val = (r) => (r.status === 'fulfilled' ? r.value.data : null);
        setX({
          loading: false,
          pay: val(ps)?.data || null,
          wallet: val(w)?.data || null,
          guards: val(g)?.data || null,
          guardTotal: val(g)?.pagination?.total,
          events: val(e)?.data || null,
          polls: val(p)?.data || null,
        });
      });
  }, []);
  return x;
}

const naira = (n) => `₦${Math.round(n || 0).toLocaleString()}`;

function FinanceCard({ pay, wallet, loading }) {
  const site = useSite();
  if (!loading && !pay && !wallet) return null;
  return (
    <div className={`${CARD} h-full flex flex-col`} style={delay(7)}>
      <CardHead title={`${site.terms.site} money`} Icon={Wallet} color="#0EA5E9" right={<HeadLink to="/payments">Payments</HeadLink>} />
      <div className="p-5 flex-1 flex flex-col">
        <p className="text-[12px] text-slate-500">Available to withdraw</p>
        <p className="mt-1 text-[28px] font-semibold text-slate-900 tabular-nums leading-none" style={{ letterSpacing: '-0.03em' }}>
          {loading ? <span className="skeleton inline-block w-32 h-7 rounded" /> : naira(wallet?.balance)}
        </p>
        <p className="mt-1.5 text-[11.5px] text-slate-400">Paid online through AreaConnector · {naira(wallet?.collectedOffline)} recorded offline</p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {[
            ['This month', naira(pay?.thisMonth), '#10B981'],
            ['All time', naira(pay?.totalCollected), '#6366F1'],
            ['Pending', pay?.pending ?? 0, '#F59E0B'],
            ['Overdue', pay?.overdue ?? 0, (pay?.overdue || 0) > 0 ? '#EF4444' : '#94A3B8'],
          ].map(([l, v, c]) => (
            <div key={l} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />{l}</p>
              <p className="mt-0.5 text-[15px] font-semibold text-slate-900 tabular-nums">{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-auto pt-4 flex gap-2">
          <Link to="/payments" className="flex-1 text-center text-[12.5px] font-semibold px-3 py-2 rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 transition-colors" style={{ textDecoration: 'none' }}>Withdraw</Link>
          <Link to="/payments" className="flex-1 text-center text-[12.5px] font-medium px-3 py-2 rounded-xl text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors" style={{ textDecoration: 'none' }}>
            {pay?.activeSchedules ?? 0} active {site.isEstate ? 'dues' : lower(site.terms.dues)}
          </Link>
        </div>
      </div>
    </div>
  );
}

function GuardsCard({ guards, total }) {
  if (!guards) return null;
  const online = (g) => g.lastSeen && Date.now() - new Date(g.lastSeen).getTime() < 15 * 60000;
  const sorted = [...guards].sort((a, b) => Number(online(b)) - Number(online(a)));
  const on = guards.filter(online).length;
  return (
    <div className={CARD} style={delay(9)}>
      <CardHead title="Security team" Icon={Shield} color="#0F766E" right={<HeadLink to="/guards">Guards</HeadLink>} />
      <div className="px-5 pt-3 pb-1 flex items-baseline gap-2">
        <span className="text-[22px] font-semibold text-slate-900 tabular-nums">{on}</span>
        <span className="text-[12px] text-slate-500">of {total ?? guards.length} active in the last 15 min</span>
      </div>
      <div className="px-3 pb-3">
        {!guards.length && <p className="px-2 py-3 text-[12.5px] text-slate-400">No guards yet — invite them from the Guards page.</p>}
        {sorted.slice(0, 4).map((g) => (
          <Link key={g._id} to={`/guards/${g._id}`} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-50" style={{ textDecoration: 'none' }}>
            <span className="relative">
              {g.profilePhoto
                ? <img src={g.profilePhoto} alt="" className="w-8 h-8 rounded-full object-cover" />
                : <span className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 text-[12px] font-semibold flex items-center justify-center">{g.name?.[0]?.toUpperCase()}</span>}
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${online(g) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[12.5px] font-medium text-slate-800 truncate">{g.name}</span>
              <span className="block text-[11px] text-slate-400 truncate">{online(g) ? 'Active now' : g.lastSeen ? `Seen ${formatDistanceToNow(new Date(g.lastSeen))} ago` : 'Not signed in yet'}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CommunityCard({ events: ev, polls: pl }) {
  const site = useSite();
  // Hide the halves whose modules are off for this site
  const events = site.on('events') ? ev : null;
  const polls = site.on('community') ? pl : null;
  if (!events && !polls) return null;
  const upcoming = (events || []).filter((e) => e.isActive !== false && isAfter(new Date(e.date), startOfDay(new Date()))).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 3);
  const live = (polls || []).filter((p) => p.isActive !== false && (!p.endsAt || isAfter(new Date(p.endsAt), new Date()))).slice(0, 2);
  return (
    <div className="grid grid-cols-2 gap-5">
      <div className={CARD} style={delay(12)}>
        <CardHead title="Upcoming events" Icon={CalendarDays} color="#EC4899" right={<HeadLink to="/announcements">Community</HeadLink>} />
        <div className="p-3">
          {!upcoming.length && <p className="px-2 py-4 text-[12.5px] text-slate-400">{site.isEstate ? 'No upcoming events. Residents love a Friday hangout.' : 'No upcoming events.'}</p>}
          {upcoming.map((e) => (
            <div key={e._id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50">
              <span className="w-11 text-center rounded-xl border border-pink-100 bg-pink-50/60 py-1 leading-none flex-shrink-0">
                <span className="block text-[9.5px] uppercase font-semibold text-pink-500">{format(new Date(e.date), 'MMM')}</span>
                <span className="block text-[16px] font-semibold text-slate-900">{format(new Date(e.date), 'd')}</span>
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-slate-800 truncate">{e.title}</span>
                <span className="block text-[11.5px] text-slate-400 truncate">{[e.time, e.location].filter(Boolean).join(' · ') || format(new Date(e.date), 'EEEE')}</span>
              </span>
              <span className="text-[11.5px] text-slate-500 tabular-nums whitespace-nowrap">{e.rsvps?.length || 0} going</span>
            </div>
          ))}
        </div>
      </div>
      <div className={CARD} style={delay(13)}>
        <CardHead title="Live polls" Icon={BarChart3} color="#6366F1" right={<HeadLink to="/announcements">Polls</HeadLink>} />
        <div className="p-4 space-y-4">
          {!live.length && <p className="px-1 py-3 text-[12.5px] text-slate-400">No open polls right now.</p>}
          {live.map((p) => {
            const totalVotes = p.options.reduce((t, o) => t + (o.votes?.length || 0), 0);
            return (
              <div key={p._id}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13px] font-medium text-slate-800 line-clamp-1">{p.question}</p>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">{totalVotes} votes</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {p.options.slice(0, 3).map((o, k) => {
                    const pct = totalVotes ? Math.round(((o.votes?.length || 0) / totalVotes) * 100) : 0;
                    return (
                      <div key={k} className="relative h-7 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-indigo-100 transition-all" style={{ width: `${pct}%` }} />
                        <div className="relative h-full px-2.5 flex items-center justify-between text-[12px]">
                          <span className="text-slate-700 truncate">{o.text}</span>
                          <span className="font-semibold text-slate-900 tabular-nums">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Bento overview ─────────────────────────────────────────────────── */

const TILE = 'dash-rise group relative overflow-hidden rounded-2xl bg-white border border-slate-200/70 transition-all duration-300 hover:border-slate-300 hover:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)]';

function TileLabel({ Icon, color, children, right }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-[12px] font-medium text-slate-500">
        <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${color}14`, color }}>
          <Icon size={13} />
        </span>
        {children}
      </span>
      {right ?? <ArrowUpRight size={14} className="text-slate-300 transition-all group-hover:text-slate-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}
    </div>
  );
}

function Big({ value, suffix, className = '' }) {
  const n = useCountUp(typeof value === 'number' ? value : 0);
  return (
    <span className={`font-semibold text-slate-900 tabular-nums leading-none ${className}`} style={{ letterSpacing: '-0.035em' }}>
      {typeof value === 'number' ? n.toLocaleString() : value}{suffix}
    </span>
  );
}

// Smooth area chart; dots/tooltips are HTML so they don't stretch with the SVG
function AreaChart({ days }) {
  const [hover, setHover] = useState(null);
  const list = days || [];
  const W = 600, H = 150, PAD = 10;
  const max = Math.max(1, ...list.map((d) => d.count));
  const pts = list.map((d, i) => [(i / Math.max(1, list.length - 1)) * W, PAD + (1 - d.count / max) * (H - PAD * 2)]);
  const path = pts.reduce((acc, [x, y], i) => {
    if (!i) return `M${x},${y}`;
    const [px, py] = pts[i - 1];
    const mx = (px + x) / 2;
    return `${acc} C${mx},${py} ${mx},${y} ${x},${y}`;
  }, '');
  if (!days) return <div className="skeleton h-[150px] rounded-xl" />;
  return (
    <div className="relative h-[150px]" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible">
        <defs>
          <linearGradient id="gateFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gateLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#34D399" /><stop offset="100%" stopColor="#0EA5E9" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="#F1F5F9" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={`${path} L${W},${H} L0,${H} Z`} fill="url(#gateFill)" style={{ animation: 'fadeIn 0.9s ease-out 0.3s both' }} />
        <path d={path} fill="none" stroke="url(#gateLine)" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke"
          style={{ strokeDasharray: 1400, '--len': 1400, animation: 'dashDraw 1.6s cubic-bezier(0.16,1,0.3,1) both' }} />
      </svg>
      <div className="absolute inset-0 flex">
        {list.map((d, i) => (
          <div key={i} className="flex-1 h-full relative cursor-default" onMouseEnter={() => setHover(i)} />
        ))}
      </div>
      {pts.map(([x, y], i) => {
        const on = hover === i, last = i === pts.length - 1;
        if (!on && !last) return null;
        return (
          <div key={i} className="absolute pointer-events-none" style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}>
            <span className="absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-[2.5px] border-emerald-500 shadow" />
            {last && !on && <span className="absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-400 animate-ping opacity-60" />}
            {on && (
              <span className="absolute -translate-x-1/2 -translate-y-[calc(100%+12px)] px-2 py-1 rounded-md bg-slate-900 text-white text-[11px] font-medium whitespace-nowrap animate-scale-in">
                {list[i].count} · {format(list[i].date, 'EEE d MMM')}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GateTile({ s, week }) {
  const total = week ? week.reduce((t, d) => t + d.count, 0) : null;
  const prev = week ? week.slice(0, 6).reduce((t, d) => t + d.count, 0) / 6 : 0;
  const today = s.todaysVisitors || 0;
  const delta = prev ? Math.round(((today - prev) / prev) * 100) : null;
  return (
    <Link to="/visitors" className={`${TILE} col-span-7 row-span-2 p-5 flex flex-col`} style={{ ...delay(1), textDecoration: 'none' }}>
      <span className="absolute -top-24 -right-24 w-64 h-64 rounded-full pointer-events-none opacity-60 transition-transform duration-700 group-hover:scale-110"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.14), transparent 70%)' }} />
      <TileLabel Icon={Activity} color="#10B981">Gate activity</TileLabel>
      <div className="relative mt-4 flex items-end gap-6">
        <div>
          <Big value={today} className="text-[40px]" />
          <div className="mt-1.5 flex items-center gap-2 text-[12px] text-slate-500">
            Visitors today
            {delta !== null && (
              <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${delta >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}% vs avg
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-5 pb-1 ml-auto">
          {[
            ['Inside now', s.activeVisitors || 0, '#0EA5E9', (s.activeVisitors || 0) > 0],
            ['Last 7 days', total ?? 0, '#8B5CF6'],
          ].map(([l, v, c, live]) => (
            <div key={l} className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                {live && <span className="relative flex w-1.5 h-1.5"><span className="absolute inset-0 rounded-full animate-ping opacity-70" style={{ background: c }} /><span className="relative w-1.5 h-1.5 rounded-full" style={{ background: c }} /></span>}
                <Big value={v} className="text-[20px]" />
              </div>
              <div className="text-[11px] text-slate-400 mt-1">{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="relative mt-auto pt-5"><AreaChart days={week} /></div>
      <div className="relative mt-2 flex justify-between text-[10.5px] text-slate-400">
        {(week || []).map((d, i) => <span key={i} className={i === 6 ? 'font-semibold text-emerald-600' : ''}>{i === 6 ? 'Today' : format(d.date, 'EEE')}</span>)}
      </div>
    </Link>
  );
}

function MoneyTile({ pay, wallet, loading }) {
  if (!loading && !pay && !wallet) return null;
  const overdue = pay?.overdue || 0;
  return (
    <Link to="/payments" className={`${TILE} col-span-3 p-5 flex flex-col`} style={{ ...delay(2), textDecoration: 'none' }}>
      <TileLabel Icon={Wallet} color="#0EA5E9">Wallet balance</TileLabel>
      <div className="mt-4">{loading ? <span className="skeleton inline-block w-28 h-7 rounded" /> : <Big value={naira(wallet?.balance)} className="text-[26px]" />}</div>
      <div className="mt-1 text-[11.5px] text-slate-400">{naira(pay?.thisMonth)} collected this month</div>
      <div className="mt-auto pt-4 flex items-center gap-2 text-[11.5px]">
        <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full ${overdue ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-700'}`}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: overdue ? '#F97316' : '#10B981' }} />
          {overdue ? `${overdue} overdue` : 'No overdue'}
        </span>
        <span className="text-slate-400">{pay?.pending ?? 0} pending</span>
      </div>
    </Link>
  );
}

function SecurityTile({ alerts, count }) {
  const hot = count > 0;
  const color = hot ? '#EF4444' : '#10B981';
  return (
    <Link to="/alerts" className={`${TILE} col-span-3 p-5 flex flex-col`} style={{ ...delay(3), textDecoration: 'none', borderColor: hot ? '#FECACA' : undefined }}>
      <TileLabel Icon={hot ? ShieldAlert : ShieldCheck} color={color}>Security</TileLabel>
      <div className="mt-4 flex items-center gap-4">
        <span className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center">
          <span className="dash-ripple absolute inset-0 rounded-full border" style={{ borderColor: `${color}66` }} />
          <span className="dash-ripple absolute inset-0 rounded-full border" style={{ borderColor: `${color}66`, animationDelay: '1s' }} />
          <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 8px 18px -8px ${color}` }}>
            {hot ? <ShieldAlert size={16} className="text-white" /> : <ShieldCheck size={16} className="text-white" />}
          </span>
        </span>
        <div className="min-w-0">
          {hot ? <Big value={count} className="text-[26px]" /> : <span className="text-[17px] font-semibold text-slate-900">All quiet</span>}
          <div className="text-[11.5px] text-slate-400 mt-1">{hot ? `open alert${count === 1 ? '' : 's'}` : 'No open alerts'}</div>
        </div>
      </div>
      <div className="mt-auto pt-3 text-[11.5px] text-slate-500 truncate">
        {hot && alerts[0] ? <><span className="capitalize font-medium text-red-600">{alerts[0].type}</span> · {formatDistanceToNow(new Date(alerts[0].createdAt), { addSuffix: true })}</> : 'Panic alerts reach you instantly'}
      </div>
    </Link>
  );
}

function OccupancyTile({ s }) {
  const { terms: T, isEstate } = useSite();
  const units = s.totalUnits || 0, res = s.totalResidents || 0;
  const pct = units ? Math.min(100, Math.round((res / units) * 100)) : 0;
  const R = 22, C = 2 * Math.PI * R;
  return (
    <Link to="/residents" className={`${TILE} col-span-3 p-5 flex flex-col`} style={{ ...delay(4), textDecoration: 'none' }}>
      <TileLabel Icon={UsersRound} color="#6366F1">{T.members}</TileLabel>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <Big value={res} className="text-[26px]" />
          <div className="text-[11.5px] text-slate-400 mt-1">across {units} {units === 1 ? T.unit.toLowerCase() : T.units.toLowerCase()}</div>
        </div>
        <span className="relative w-14 h-14 flex-shrink-0">
          <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
            <defs><linearGradient id="occRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#A78BFA" /><stop offset="100%" stopColor="#6366F1" /></linearGradient></defs>
            <circle cx="28" cy="28" r={R} fill="none" stroke="#EEF2FF" strokeWidth="6" />
            <circle cx="28" cy="28" r={R} fill="none" stroke="url(#occRing)" strokeWidth="6" strokeLinecap="round" strokeDasharray={C}
              style={{ '--len': C, '--to': C * (1 - pct / 100), strokeDashoffset: C * (1 - pct / 100), animation: 'dashDraw 1.3s cubic-bezier(0.16,1,0.3,1) 0.3s both' }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-slate-700 tabular-nums">{pct}%</span>
        </span>
      </div>
      <div className="mt-auto pt-3 text-[11.5px] text-slate-500">{isEstate ? 'Occupancy across the estate' : `Occupancy across the ${T.site.toLowerCase()}`}</div>
    </Link>
  );
}

// Hotels: rooms occupied, arrivals and departures in the next 24h
function RoomsTile() {
  const { terms: T } = useSite();
  const [sum, setSum] = useState(null);
  useEffect(() => { siteAPI.rooms().then(({ data }) => setSum(data.summary || {})).catch(() => setSum({})); }, []);
  const pct = sum?.total ? Math.round((sum.occupied / sum.total) * 100) : 0;
  return (
    <Link to="/rooms" className={`${TILE} col-span-3 p-5 flex flex-col`} style={{ ...delay(2), textDecoration: 'none' }}>
      <TileLabel Icon={BedDouble} color="#14B8A6">{T.unit} board</TileLabel>
      <div className="mt-4 flex items-baseline gap-1.5">
        {sum ? <Big value={sum.occupied || 0} className="text-[26px]" /> : <span className="skeleton inline-block w-16 h-7 rounded" />}
        <span className="text-[13px] text-slate-400">/ {sum?.total ?? 0}</span>
      </div>
      <div className="text-[11.5px] text-slate-400 mt-1">{pct}% occupied</div>
      <div className="mt-auto pt-3 flex items-center gap-2 text-[11.5px]">
        <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700"><LogIn size={11} /> {sum?.arriving ?? 0} in</span>
        <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600"><LogOut size={11} /> {sum?.departing ?? 0} out</span>
        <span className="text-slate-400">next 24h</span>
      </div>
    </Link>
  );
}

// Deliveries & vehicles still on site
function GateLogTile() {
  const [d, setD] = useState(null);
  useEffect(() => {
    gateLogAPI.list({ date: format(new Date(), 'yyyy-MM-dd'), limit: 200 })
      .then(({ data }) => setD({ open: data.openCount || 0, today: (data.data || []).length }))
      .catch(() => setD({ open: 0, today: 0 }));
  }, []);
  return (
    <Link to="/gate-log" className={`${TILE} col-span-3 p-5 flex flex-col`} style={{ ...delay(2), textDecoration: 'none' }}>
      <TileLabel Icon={Truck} color="#F97316">Deliveries & vehicles</TileLabel>
      <div className="mt-4 flex items-center gap-2">
        {d ? <Big value={d.open} className="text-[26px]" /> : <span className="skeleton inline-block w-16 h-7 rounded" />}
        {d?.open > 0 && <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-amber-500 animate-ping opacity-70" /><span className="relative w-2 h-2 rounded-full bg-amber-500" /></span>}
      </div>
      <div className="text-[11.5px] text-slate-400 mt-1">on site now</div>
      <div className="mt-auto pt-3 text-[11.5px] text-slate-500">{d?.today ?? 0} logged at the gate today</div>
    </Link>
  );
}

function GuardsTile({ guards, total }) {
  if (!guards) return null;
  const online = (g) => g.lastSeen && Date.now() - new Date(g.lastSeen).getTime() < 15 * 60000;
  const sorted = [...guards].sort((a, b) => Number(online(b)) - Number(online(a)));
  const on = guards.filter(online).length;
  return (
    <Link to="/guards" className={`${TILE} col-span-3 p-5 flex flex-col`} style={{ ...delay(5), textDecoration: 'none' }}>
      <TileLabel Icon={Shield} color="#0F766E">Guards on duty</TileLabel>
      <div className="mt-4 flex items-baseline gap-1.5">
        <Big value={on} className="text-[26px]" />
        <span className="text-[13px] text-slate-400">/ {total ?? guards.length}</span>
      </div>
      <div className="text-[11.5px] text-slate-400 mt-1">active in the last 15 min</div>
      <div className="mt-auto pt-3 flex items-center">
        {!guards.length && <span className="text-[11.5px] text-slate-400">No guards yet</span>}
        {sorted.slice(0, 5).map((g, i) => (
          <span key={g._id} className="relative -ml-2 first:ml-0" style={{ zIndex: 10 - i }} title={g.name}>
            {g.profilePhoto
              ? <img src={g.profilePhoto} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white" />
              : <span className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 text-[11px] font-semibold flex items-center justify-center border-2 border-white">{g.name?.[0]?.toUpperCase()}</span>}
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${online(g) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          </span>
        ))}
        {guards.length > 5 && <span className="-ml-2 w-8 h-8 rounded-full bg-slate-100 text-slate-500 text-[10.5px] font-semibold flex items-center justify-center border-2 border-white">+{guards.length - 5}</span>}
      </div>
    </Link>
  );
}

/* ── Page ───────────────────────────────────────────────────────────── */

export default function DesktopDashboard({ stats, recentVisitors, openAlerts, announcements, estate, estateName, firstName }) {
  const now = useClock();
  const week = useWeeklyTraffic();
  const s = stats || {};
  const alertsOpen = s.openAlerts || 0;
  const x = useExtras();
  const site = useSite();
  const places = useSitePlaces();
  // Sites without payments get a sector tile in the money slot
  const moneySlot = site.on('payments')
    ? <MoneyTile pay={x.pay} wallet={x.wallet} loading={x.loading} />
    : site.modules?.stays ? <RoomsTile /> : site.modules?.gatelog ? <GateLogTile /> : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="dash-rise flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] text-slate-500">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping" />
              <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="font-medium text-slate-700">{estate?.name || estateName}</span>
            <span className="text-slate-300">/</span>
            {format(now, 'EEEE d MMMM · HH:mm')}
          </div>
          <h1 className="mt-1.5 text-[22px] font-semibold text-slate-900" style={{ letterSpacing: '-0.025em' }}>
            {greeting()}, {firstName}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link to="/alerts" aria-label="Alerts" className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-all">
            <Bell size={15} />
            {alertsOpen > 0 && <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9.5px] font-semibold flex items-center justify-center ring-2 ring-white">{alertsOpen}</span>}
          </Link>
          <Link to="/announcements" className="inline-flex items-center gap-1.5 h-9 text-[13px] font-medium px-3 rounded-xl text-slate-700 bg-white border border-slate-200 hover:border-slate-300 transition-all" style={{ textDecoration: 'none' }}>
            <Megaphone size={14} /> Post notice
          </Link>
          <Link to="/visitors/new" className="group inline-flex items-center gap-1.5 h-9 text-[13px] font-semibold px-3.5 rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-all" style={{ textDecoration: 'none' }}>
            <Plus size={14} /> Register visitor
          </Link>
        </div>
      </div>

      <CampaignBanner />

      {/* ── Bento overview ── */}
      <div className="grid grid-cols-12 auto-rows-[minmax(168px,auto)] gap-4">
        <GateTile s={s} week={week} />
        <div className="dash-rise col-span-5 row-span-2 min-w-0" style={delay(2)}>
          <EstateMap name={estate?.name || estateName} address={estate?.address} location={estate?.location} height={352} variant="card" places={places} />
        </div>
        {moneySlot}
        <SecurityTile alerts={openAlerts} count={alertsOpen} />
        <OccupancyTile s={s} />
        <GuardsTile guards={x.guards} total={x.guardTotal} />
      </div>

      {/* Start an emergency roll-call (hospitals, schools, industry…) — below the overview */}
      <RollCallStrip />

      {/* ── Activity ── */}
      <div className="grid grid-cols-12 gap-5 items-start">
        <div className="col-span-8 min-w-0"><RecentVisitors visitors={recentVisitors} /></div>
        <div className="col-span-4 space-y-5 min-w-0">
          <Notices items={announcements} />
          <QuickActions />
        </div>
      </div>

      <CommunityCard events={x.events} polls={x.polls} />
    </div>
  );
}
