// Live emergency roll-call: Expected / Safe / Need help / Missing, with call
// buttons for anyone who needs help or hasn't answered. GET
// /api/site/rollcall/active, refreshed on socket `rollcall_update` and every 10s.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { formatDistanceToNowStrict } from 'date-fns';
import { Users, ShieldCheck, LifeBuoy, HelpCircle, Phone, Siren, Square, Home } from 'lucide-react';
import { rollcallAPI } from '../api';
import { useSite } from '../context/SiteContext';
import StatTile from '../components/site/StatTile';
import { PageLoader } from '../components/ui/Spinner';
import { StartRollCallButton, useActiveRollCall } from '../components/site/RollCall';

const initials = (n = '?') => n.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

function Person({ p, tone, showCall }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      {p.profilePhoto
        ? <img src={p.profilePhoto} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
        : <span className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0" style={{ background: `linear-gradient(135deg, ${tone}, ${tone}AA)` }}>{initials(p.name)}</span>}
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-slate-900 truncate">{p.name || 'Unknown'}</div>
        <div className="text-[11.5px] text-slate-500 truncate">
          {[p.roleLabel, p.unit && <span key="u"><Home size={10} className="inline -mt-0.5" /> {p.unit}</span>].filter(Boolean).reduce((a, x, i) => (i ? [...a, ' · ', x] : [x]), [])}
          {p.at && <span className="text-slate-400"> · {formatDistanceToNowStrict(new Date(p.at))} ago</span>}
        </div>
        {p.note && <div className="text-[12px] text-red-700 mt-0.5">“{p.note}”</div>}
      </div>
      {showCall && p.phone && (
        <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg text-white flex-shrink-0" style={{ background: `linear-gradient(135deg, ${tone}, ${tone}CC)` }}>
          <Phone size={12} /> Call
        </a>
      )}
    </div>
  );
}

function List({ title, Icon, tone, people, showCall, empty, delay }) {
  return (
    <section className="dash-rise rounded-2xl bg-white border overflow-hidden" style={{ borderColor: `${tone}40`, animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: `${tone}26`, background: `linear-gradient(135deg, ${tone}17, transparent 70%)` }}>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${tone}, ${tone}CC)` }}><Icon size={13} className="text-white" /></span>
        <span className="text-[13.5px] font-semibold text-slate-900 flex-1">{title}</span>
        <span className="text-[12px] font-semibold tabular-nums" style={{ color: tone }}>{people.length}</span>
      </div>
      {people.length
        ? <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">{people.map(p => <Person key={p._id} p={p} tone={tone} showCall={showCall} />)}</div>
        : <p className="px-4 py-5 text-[12.5px] text-slate-400">{empty}</p>}
    </section>
  );
}

export default function RollCall() {
  const site = useSite();
  const { rc, setRc, loaded, enabled } = useActiveRollCall({ every: 10000 });
  const [ending, setEnding] = useState(false);

  if (!enabled) {
    return <div className="max-w-md mx-auto py-20 text-center text-[13px] text-slate-500">Emergency roll-call is switched off for this {site.terms.site.toLowerCase()}. Turn it on in Settings → Site type & features.</div>;
  }
  if (!loaded) return <PageLoader />;

  if (!rc) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4 animate-fade-in">
        <span className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #34D399, #059669)' }}><ShieldCheck size={28} className="text-white" /></span>
        <h1 className="text-[22px] font-semibold text-slate-900">No roll-call running</h1>
        <p className="text-[13px] text-slate-500">In an evacuation, start a roll-call. Everyone expected on site gets an urgent alert to say they're safe or need help, and you see who's missing.</p>
        <StartRollCallButton />
      </div>
    );
  }

  const end = async () => {
    if (!window.confirm(`End the roll-call? ${rc.missing} ${rc.missing === 1 ? 'person hasn\'t' : 'people haven\'t'} answered.`)) return;
    setEnding(true);
    try {
      const { data } = await rollcallAPI.end(rc._id);
      toast.success(data.message || 'Roll-call ended');
      setRc(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not end the roll-call');
    } finally { setEnding(false); }
  };

  const pct = rc.expected ? Math.round((rc.safe / rc.expected) * 100) : 0;
  return (
    <div className="max-w-[1200px] mx-auto space-y-5 animate-fade-in">
      <div className="dash-rise flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-red-600">
            <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-70" /><span className="relative w-2 h-2 rounded-full bg-red-500" /></span>
            Live roll-call · started {formatDistanceToNowStrict(new Date(rc.startedAt))} ago
          </div>
          <h1 className="text-[22px] font-semibold text-slate-900 mt-1" style={{ letterSpacing: '-0.025em' }}>{rc.reason || 'Emergency roll-call'}</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">{pct}% accounted for · updates live</p>
        </div>
        {rc.canManage && (
          <button onClick={end} disabled={ending}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-60">
            <Square size={13} /> {ending ? 'Ending…' : 'End roll-call'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile i={0} label="Expected" value={rc.expected} Icon={Users} color="#6366F1" />
        <StatTile i={1} label="Safe" value={rc.safe} Icon={ShieldCheck} color="#10B981" hint={`${pct}% of expected`} />
        <StatTile i={2} label="Need help" value={rc.help} Icon={LifeBuoy} color="#EF4444" pulse={rc.help > 0} />
        <StatTile i={3} label="Missing" value={rc.missing} Icon={HelpCircle} color="#F59E0B" hint="Haven't answered" pulse={rc.missing > 0} />
      </div>

      <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex">
        <div style={{ width: `${rc.expected ? (rc.safe / rc.expected) * 100 : 0}%`, background: '#10B981' }} />
        <div style={{ width: `${rc.expected ? (rc.help / rc.expected) * 100 : 0}%`, background: '#EF4444' }} />
      </div>

      {rc.canManage ? (
        <>
          <List title="Need help" Icon={Siren} tone="#EF4444" people={rc.needHelp || []} showCall empty="Nobody has asked for help." delay={200} />
          <div className="grid lg:grid-cols-2 gap-4 items-start">
            <List title="Missing — not answered" Icon={HelpCircle} tone="#F59E0B" people={rc.missingPeople || []} showCall empty="Everyone has answered." delay={260} />
            <List title="Safe" Icon={ShieldCheck} tone="#10B981" people={rc.safePeople || []} empty="Nobody has checked in yet." delay={320} />
          </div>
        </>
      ) : <p className="text-[13px] text-slate-500">You can see the totals; only people running the roll-call see the lists.</p>}
    </div>
  );
}
