import { useEffect, useState } from 'react';
import {
  ShieldAlert, ShieldCheck, Scale, Send, Ban, RotateCcw, ChevronDown, Settings2, CheckCircle2, MessageSquareWarning,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { paymentAPI } from '../../api';
import Modal from '../ui/Modal';
import Spinner, { PageLoader } from '../ui/Spinner';
import { useSite } from '../../context/SiteContext';
import { blockName, lower } from '../../utils/siteTypes';

// Dues enforcement — pause convenience services for residents with overdue
// bills: notice → grace period → manager confirms → auto-lifts on payment.
// Server: utils/duesEnforcement + controllers/duesEnforcementController.

const NGN = (n) => `₦${Math.round(n || 0).toLocaleString()}`;
const day = (d) => (d ? format(new Date(d), 'd MMM yyyy') : '—');

const STATUS = {
  active:   { label: 'Restricted',    cls: 'bg-red-50 text-red-700 border-red-200' },
  notice:   { label: 'Notice sent',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  eligible: { label: 'Eligible',      cls: 'bg-slate-50 text-slate-600 border-slate-200' },
  owing:    { label: 'Owing',         cls: 'bg-slate-50 text-slate-500 border-slate-200' },
};
// Site words for this screen — estates keep the original wording exactly
function useWords() {
  const { terms: T, isEstate: E } = useSite();
  return {
    T, E,
    site: E ? 'estate' : lower(T.site),
    member: lower(T.member), Member: T.member, Members: T.members, members: lower(T.members),
    dues: E ? 'dues' : lower(T.dues), Dues: E ? 'Dues' : T.dues,
  };
}

const ACTION_LABEL = {
  notice: 'Notice sent', applied: 'Restrictions applied', lifted: 'Restrictions lifted by manager',
  auto_lifted: 'Restored — bills paid', cancelled: 'Notice withdrawn', dispute: 'Member disputed',
};

function SettingsModal({ open, onClose, onSaved }) {
  const W = useWords();
  const [meta, setMeta] = useState(null);
  const [f, setF] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    paymentAPI.enforcementSettings()
      .then(({ data }) => { setMeta(data.data); setF(data.data.settings); setConfirm(!!data.data.settings.enabled); })
      .catch(() => toast.error('Could not load settings'));
  }, [open]);

  const toggleService = (k) => setF((x) => ({ ...x, services: x.services.includes(k) ? x.services.filter((s) => s !== k) : [...x.services, k] }));
  const save = async () => {
    if (f.enabled && !confirm) return toast.error(`Please confirm the ${W.site} has the right to do this`);
    setSaving(true);
    try {
      const { data } = await paymentAPI.saveEnforcementSettings(f);
      toast.success(data.message);
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Could not save'); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={`${W.Dues} enforcement settings`} size="lg">
      {!f ? <PageLoader variant="section" /> : (
        <div className="space-y-5">
          <label className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-slate-200">
            <span>
              <span className="block text-[13.5px] font-semibold text-slate-900">Allow restricting services for overdue {W.dues}</span>
              <span className="block text-[12px] text-slate-500">You still confirm every restriction yourself.</span>
            </span>
            <input type="checkbox" className="w-5 h-5 accent-emerald-600" checked={f.enabled} onChange={(e) => setF({ ...f, enabled: e.target.checked })} />
          </label>

          <div>
            <p className="text-[12px] font-semibold text-slate-600 mb-2">What allows the {W.site} to do this? *</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {meta.bases.map((b) => (
                <button key={b.key} type="button" onClick={() => setF({ ...f, basisType: b.key })}
                  className={`text-left px-3 py-2 rounded-xl border text-[12.5px] font-medium ${f.basisType === b.key ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/10' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {b.label}
                </button>
              ))}
            </div>
            {(() => {
              const b = meta.bases.find((x) => x.key === f.basisType) || meta.bases[0];
              const isConst = b.key === 'constitution';
              return (
                <>
                  <label className="block text-[12px] font-semibold text-slate-600 mt-3">{isConst ? 'Clause / section' : b.key === 'other' ? 'Describe it' : 'Reference'}</label>
                  <input className="input-field mt-1" placeholder={`e.g. ${b.example}`}
                    value={f.constitutionClause} onChange={(e) => setF({ ...f, constitutionClause: e.target.value })} />
                  <p className="text-[11.5px] text-slate-400 mt-1">
                    Notices will read: “Under <span className="text-slate-600">{isConst ? `${f.constitutionClause || b.example} of the ${W.site} constitution` : (f.constitutionClause || b.example)}</span>, …”
                    {isConst && !meta.hasConstitution && ` Tip: upload your constitution in Settings so ${W.members} can read it.`}
                  </p>
                </>
              );
            })()}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              ['minOverdueDays', 'Overdue for at least', 'days'],
              ['noticeDays', 'Notice period', 'days (7–60)'],
              ['minAmount', 'Minimum owed', '₦'],
            ].map(([k, label, unit]) => (
              <label key={k}>
                <span className="text-[12px] font-semibold text-slate-600">{label}</span>
                <input type="number" min="0" className="input-field mt-1" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
                <span className="text-[11px] text-slate-400">{unit}</span>
              </label>
            ))}
          </div>

          <div>
            <p className="text-[12px] font-semibold text-slate-600 mb-2">Services that can be restricted</p>
            <div className="space-y-2">
              {meta.services.map((s) => (
                <label key={s.key} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${f.services.includes(s.key) ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200'}`}>
                  <input type="checkbox" className="mt-0.5 w-4 h-4 accent-emerald-600" checked={f.services.includes(s.key)} onChange={() => toggleService(s.key)} />
                  <span>
                    <span className="block text-[13px] font-semibold text-slate-900">{s.label}</span>
                    <span className="block text-[12px] text-slate-500">{s.effect}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-3.5 bg-emerald-50 border border-emerald-200">
            <p className="text-[12px] font-semibold text-emerald-800 flex items-center gap-1.5"><ShieldCheck size={14} /> Never restricted</p>
            <ul className="mt-1.5 text-[12px] text-emerald-900/80 list-disc pl-5 space-y-0.5">
              {meta.protected.map((p) => <li key={p}>{p}</li>)}
            </ul>
            <p className="text-[11.5px] text-emerald-900/70 mt-2">Guards are never told why a pass is held, and debts are never shown to other {W.members}.</p>
          </div>

          {f.enabled && (
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-200 bg-amber-50">
              <input type="checkbox" className="mt-0.5 w-4 h-4 accent-amber-600" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
              <span className="text-[12.5px] text-amber-900">
                I confirm the basis above gives the {W.site} the right to restrict these services for unpaid {W.dues}, and {W.members} have been told about this rule.
                A written, agreed basis (constitution, AGM resolution or agreement) is strongest — we recommend a lawyer reviews it.
              </span>
            </label>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save settings'}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function NoticeModal({ row, services, settings, onClose, onDone }) {
  const W = useWords();
  const manual = row && !row.eligible;
  const [picked, setPicked] = useState([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (row) { setPicked(settings?.services || []); setNote(''); } }, [row]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    setBusy(true);
    try {
      const { data } = await paymentAPI.sendDuesNotice(row.resident._id, { services: picked, note, manual });
      toast.success(data.message);
      onDone(); onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Could not send notice'); }
    finally { setBusy(false); }
  };

  const allowed = services.filter((s) => settings?.services?.includes(s.key));
  return (
    <Modal open={!!row} onClose={onClose} title={row ? `Send ${W.dues} notice to ${row.resident.name}` : ''}>
      {row && (
        <div className="space-y-4">
          <div className="rounded-xl p-3.5 bg-amber-50 border border-amber-200 text-[12.5px] text-amber-900">
            {manual && <span className="block mb-1.5 font-semibold">Manual notice — they haven't reached your automatic threshold ({settings.minOverdueDays} days{settings.minAmount ? ` / ${NGN(settings.minAmount)}` : ''}) yet.</span>}
            {row.resident.name} owes <b>{NGN(row.overdue)}</b> in overdue bills. They'll get an email and app notice quoting <b>{settings.basis}</b>,
            and have <b>{settings.noticeDays} days</b> to pay before you can restrict anything. Nothing changes for them today.
          </div>
          <div>
            <p className="text-[12px] font-semibold text-slate-600 mb-2">Services to pause if they don't pay</p>
            <div className="space-y-1.5">
              {allowed.map((s) => (
                <label key={s.key} className="flex items-center gap-2.5 text-[13px] text-slate-800">
                  <input type="checkbox" className="w-4 h-4 accent-emerald-600" checked={picked.includes(s.key)}
                    onChange={() => setPicked((p) => (p.includes(s.key) ? p.filter((x) => x !== s.key) : [...p, s.key]))} />
                  {s.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[12px] font-semibold text-slate-600">Personal message (optional)</label>
            <textarea className="input-field mt-1" rows={3} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={`e.g. Happy to agree a payment plan — please reach out to the ${W.E ? 'estate office' : 'office'}.`} />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button onClick={send} disabled={busy || !picked.length} className="btn-primary flex-1 gap-1.5"><Send size={14} /> {busy ? 'Sending…' : 'Send notice'}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ResidentRow({ row, onNotice, onAction, busy }) {
  const W = useWords();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const r = row.restriction || {};
  const key = r.status === 'active' ? 'active' : r.status === 'notice' ? 'notice' : row.eligible ? 'eligible' : 'owing';
  const st = STATUS[key];
  const unit = row.resident.unit;

  const toggle = () => {
    setOpen((o) => !o);
    if (!detail) paymentAPI.enforcementResident(row.resident._id).then(({ data }) => setDetail(data.data)).catch(() => {});
  };

  return (
    <div className="border-b border-slate-100 last:border-0">
      <div className="flex flex-wrap items-center gap-3 px-4 sm:px-5 py-3">
        <button onClick={toggle} className="flex items-center gap-3 flex-1 min-w-[180px] text-left">
          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700 font-bold text-[13px] flex items-center justify-center flex-shrink-0">
            {row.resident.name?.[0]?.toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-slate-900 truncate">
              {row.resident.name}
              {r.dispute?.at && <MessageSquareWarning size={14} className="text-amber-600" title={`${W.Member} disputed`} />}
            </span>
            <span className="block text-[11.5px] text-slate-400 truncate">
              {unit ? `${unit.block ? `${blockName(unit.block, W.T)} · ` : ''}${W.T.unit} ${unit.unitNumber} · ` : ''}
              {row.overdue ? `${NGN(row.overdue)} overdue · since ${day(row.oldestDue)}` : 'Nothing overdue'}
            </span>
          </span>
          <ChevronDown size={14} className={`text-slate-300 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>

        <div className="flex items-center gap-2">
          {key === 'eligible' && (
            <button onClick={() => onNotice(row)} className="h-8 px-3 rounded-lg text-[12px] font-semibold bg-amber-500 text-white hover:bg-amber-600 flex items-center gap-1.5"><Send size={12} /> Send notice</button>
          )}
          {key === 'owing' && row.overdue > 0 && (
            <button onClick={() => onNotice(row)} title="Below your automatic threshold — send a notice manually"
              className="h-8 px-3 rounded-lg text-[12px] font-semibold border border-amber-300 text-amber-700 bg-white hover:bg-amber-50 flex items-center gap-1.5"><Send size={12} /> Notice manually</button>
          )}
          {key === 'notice' && (
            <>
              <button disabled={!row.canApply || busy} onClick={() => onAction('apply', row)}
                title={row.canApply ? '' : `Available from ${day(r.effectiveAt)}`}
                className="h-8 px-3 rounded-lg text-[12px] font-semibold bg-red-600 text-white hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-500 flex items-center gap-1.5">
                <Ban size={12} /> {row.canApply ? 'Apply restrictions' : `From ${day(r.effectiveAt)}`}
              </button>
              <button disabled={busy} onClick={() => onAction('lift', row)} className="h-8 px-2.5 rounded-lg text-[12px] font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">Withdraw</button>
            </>
          )}
          {key === 'active' && (
            <button disabled={busy} onClick={() => onAction('lift', row)} className="h-8 px-3 rounded-lg text-[12px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 flex items-center gap-1.5"><RotateCcw size={12} /> Lift</button>
          )}
        </div>
      </div>

      {open && (
        <div className="px-4 sm:px-5 pb-4 -mt-1">
          {!detail ? <div className="py-4 flex justify-center"><Spinner size={18} /></div> : (
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 space-y-3">
              {r.status && r.status !== 'none' && (
                <p className="text-[12px] text-slate-600">
                  <b>Services:</b> {(r.services || []).join(', ').replace(/_/g, ' ') || '—'}
                  {r.noticeAt && <> · notice {day(r.noticeAt)}</>}
                  {r.effectiveAt && <> · effective {day(r.effectiveAt)}</>}
                </p>
              )}
              {detail.restriction?.dispute?.at && (
                <div className="rounded-lg p-3 bg-amber-50 border border-amber-200">
                  <p className="text-[11.5px] font-semibold text-amber-800">Dispute · {day(detail.restriction.dispute.at)}</p>
                  <p className="text-[12.5px] text-amber-900 mt-0.5 whitespace-pre-wrap">{detail.restriction.dispute.message}</p>
                </div>
              )}
              {detail.overdue.bills.length > 0 && (
                <div>
                  <p className="text-[11.5px] font-semibold text-slate-500 mb-1">Overdue bills</p>
                  {detail.overdue.bills.map((b) => (
                    <div key={b._id} className="flex justify-between text-[12.5px] py-0.5">
                      <span className="text-slate-700">{b.title} <span className="text-slate-400">· due {day(b.dueDate)}</span></span>
                      <span className="font-semibold tabular-nums">{NGN(b.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <p className="text-[11.5px] font-semibold text-slate-500 mb-1">History</p>
                {!detail.history.length ? <p className="text-[12px] text-slate-400">No enforcement actions yet</p> : detail.history.map((h) => (
                  <div key={h._id} className="text-[12px] text-slate-600 py-0.5">
                    <span className="text-slate-400">{format(new Date(h.createdAt), 'd MMM yyyy, HH:mm')}</span> · {h.action === 'dispute' ? `${W.Member} disputed` : (ACTION_LABEL[h.action] || h.action)}
                    {h.byId?.name && h.action !== 'dispute' ? ` by ${h.byId.name}` : ''}{h.amountOwed ? ` · ${NGN(h.amountOwed)} owed` : ''}
                    {h.note && h.action !== 'dispute' ? <span className="text-slate-400"> — “{h.note}”</span> : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DuesEnforcement() {
  const W = useWords();
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const [noticeRow, setNoticeRow] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind: 'apply'|'lift', row }
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => paymentAPI.enforcementOverview()
    .then(({ data: d }) => setData(d))
    .catch((err) => { toast.error(err.response?.data?.message || 'Could not load enforcement'); setData({ data: [], settings: {}, services: [] }); });
  useEffect(() => { load(); }, []);

  const runAction = async () => {
    const { kind, row } = confirm;
    setBusy(true);
    try {
      const fn = kind === 'apply' ? paymentAPI.applyRestriction : paymentAPI.liftRestriction;
      const { data: d } = await fn(row.resident._id, { note });
      toast.success(d.message);
      setConfirm(null); setNote('');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
    finally { setBusy(false); }
  };

  if (!data) return <PageLoader variant="section" />;
  const { settings = {}, services = [] } = data;
  const rows = data.data || [];
  const counts = {
    active: rows.filter((r) => r.restriction?.status === 'active').length,
    notice: rows.filter((r) => r.restriction?.status === 'notice').length,
    eligible: rows.filter((r) => r.eligible).length,
  };
  const shown = rows.filter((r) => filter === 'all' || (filter === 'eligible' ? r.eligible : r.restriction?.status === filter));

  return (
    <div>
      {/* Status / settings strip */}
      <div className={`px-4 sm:px-5 py-4 border-b border-slate-100 flex flex-wrap items-start gap-3 ${settings.enabled ? '' : 'bg-gradient-to-br from-amber-50 to-white'}`}>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${settings.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {settings.enabled ? <Scale size={17} /> : <ShieldAlert size={17} />}
        </span>
        <div className="flex-1 min-w-[220px]">
          {settings.enabled ? (
            <>
              <p className="text-[13.5px] font-semibold text-slate-900">Enforcement is on · under {settings.basis}</p>
              <p className="text-[12px] text-slate-500">
                Suggested after {settings.minOverdueDays} days overdue{settings.minAmount ? ` and ${NGN(settings.minAmount)}+ owed` : ''} (or notice anyone manually) · {settings.noticeDays}-day notice · you confirm every restriction · lifts automatically on payment
              </p>
            </>
          ) : (
            <>
              <p className="text-[13.5px] font-semibold text-slate-900">Encourage payment by pausing convenience services</p>
              <p className="text-[12px] text-slate-600 mt-0.5">
                {W.Members} with overdue bills get a written notice, a grace period, then — only if you confirm — services like visitor passes, the lounge, events and marketplace are paused until they pay.
                {W.E
                  ? 'Essentials (home access, emergencies, medical visitors) are never touched. Needs a basis such as your constitution, an AGM resolution, the service-charge agreement or estate rules.'
                  : `Essentials (${lower(W.T.unit)} and site access, emergencies, medical visitors) are never touched. Needs a basis such as your constitution, a board resolution, a fees agreement or ${W.site} rules.`}
              </p>
            </>
          )}
        </div>
        <button onClick={() => setShowSettings(true)} className={settings.enabled ? 'h-9 px-3 rounded-lg border border-slate-200 text-[12.5px] font-semibold text-slate-700 flex items-center gap-1.5 hover:bg-slate-50' : 'btn-primary gap-1.5 !py-2'}>
          <Settings2 size={14} /> {settings.enabled ? 'Settings' : 'Set up'}
        </button>
      </div>

      {/* Filters */}
      <div className="px-4 sm:px-5 py-3 border-b border-slate-100 flex flex-wrap gap-2">
        {[
          ['all', `All · ${rows.length}`],
          ['eligible', `Eligible · ${counts.eligible}`],
          ['notice', `Notice sent · ${counts.notice}`],
          ['active', `Restricted · ${counts.active}`],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            className={`h-8 px-3 rounded-full text-[12px] font-semibold border ${filter === id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {!shown.length ? (
        <div className="py-14 text-center">
          <CheckCircle2 size={26} className="mx-auto text-emerald-500" />
          <p className="mt-2 text-[13.5px] font-semibold text-slate-800">{filter === 'all' ? 'Nobody has overdue bills' : 'No one here'}</p>
          <p className="text-[12px] text-slate-400">{W.Members} with overdue bills show up here.</p>
        </div>
      ) : (
        <div className="max-h-[70vh] overflow-y-auto">
          {shown.map((row) => (
            <ResidentRow key={row.resident._id} row={row} busy={busy}
              onNotice={(r) => (settings.enabled ? setNoticeRow(r) : setShowSettings(true))}
              onAction={(kind, r) => { setConfirm({ kind, row: r }); setNote(''); }} />
          ))}
        </div>
      )}

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} onSaved={load} />
      <NoticeModal row={noticeRow} services={services} settings={settings} onClose={() => setNoticeRow(null)} onDone={load} />

      <Modal open={!!confirm} onClose={() => setConfirm(null)}
        title={confirm?.kind === 'apply' ? `Restrict services for ${confirm?.row.resident.name}?` : `Lift for ${confirm?.row.resident.name}?`}>
        {confirm && (
          <div className="space-y-4">
            <p className="text-[13px] text-slate-600">
              {confirm.kind === 'apply'
                ? <>The notice period has ended and <b>{NGN(confirm.row.overdue)}</b> is still overdue. These will be paused until they pay: <b>{(confirm.row.restriction.services || []).map((k) => services.find((s) => s.key === k)?.label || k).join(', ')}</b>. They'll be notified, and everything restores automatically on payment.</>
                : confirm.row.restriction.status === 'active'
                  ? `Everything that was paused will work again straight away, and the ${W.member} will be notified.`
                  : `The notice will be withdrawn and the ${W.member} told no services will be paused.`}
            </p>
            <div>
              <label className="text-[12px] font-semibold text-slate-600">Reason for the record (optional)</label>
              <input className="input-field mt-1" value={note} onChange={(e) => setNote(e.target.value)}
                placeholder={confirm.kind === 'apply' ? 'e.g. No response to notice' : 'e.g. Agreed payment plan'} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="btn-outline flex-1">Cancel</button>
              <button onClick={runAction} disabled={busy}
                className={`flex-1 h-10 rounded-xl text-sm font-semibold text-white ${confirm.kind === 'apply' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                {busy ? 'Working…' : confirm.kind === 'apply' ? 'Apply restrictions' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
