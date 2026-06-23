import { useState, useEffect, useRef } from 'react';
import {
  Scale, Gavel, Users, FileText, Clock, CheckCircle2, XCircle,
  AlertTriangle, Shield, ChevronRight, Plus, ArrowLeft, Upload,
  Send, User, Briefcase, Star, ThumbsUp, ThumbsDown, Minus,
  Banknote, Eye, RotateCcw, Siren, Lock, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { courtAPI } from '../api';
import toast from 'react-hot-toast';

// ── helpers ─────────────────────────────────────────────────────────────────

const fmt = n => '₦' + Number(n || 0).toLocaleString('en-NG');

const STATUS_META = {
  filed:              { label: 'Filed',              color: '#64748B', bg: '#F1F5F9' },
  open:               { label: 'Open',               color: '#2563EB', bg: '#EFF6FF' },
  in_hearing:         { label: 'In Hearing',         color: '#D97706', bg: '#FFFBEB' },
  jury_deliberation:  { label: 'Jury Deliberating',  color: '#7C3AED', bg: '#F5F3FF' },
  judge_deliberation: { label: 'Judge Deliberating', color: '#DC2626', bg: '#FEF2F2' },
  verdict_delivered:  { label: 'Verdict Delivered',  color: '#065F46', bg: '#D1FAE5' },
  settled:            { label: 'Settled',            color: '#059669', bg: '#ECFDF5' },
  appealing:          { label: 'Appealing',          color: '#B45309', bg: '#FEF3C7' },
  closed:             { label: 'Closed',             color: '#94A3B8', bg: '#F8FAFC' },
};

const TYPE_LABELS = {
  noise_complaint:      'Noise Complaint',
  property_damage:      'Property Damage',
  harassment:           'Harassment',
  payment_dispute:      'Payment Dispute',
  marketplace_violation:'Marketplace Violation',
  community_rules:      'Community Rules',
  eviction_dispute:     'Eviction Dispute',
  boundary_dispute:     'Boundary Dispute',
  other:                'Other',
};

const AI_PERSONAS = {
  adaeze: { name: 'Barrister Adaeze Okafor', role: 'Prosecution Counsel',     initials: 'AO', color: '#DC2626' },
  emeka:  { name: 'Counsel Emeka Nwosu',     role: 'Defense Counsel',          initials: 'EN', color: '#2563EB' },
  chidi:  { name: 'Solicitor Chidi Eze',     role: 'Settlement Mediator',      initials: 'CE', color: '#7C3AED' },
  ngozi:  { name: 'Attorney Ngozi Adeyemi',  role: 'Constitutional Counsel',   initials: 'NA', color: '#059669' },
};

const JUDGE = { name: 'Judge Orizu', initials: 'JO', color: '#B45309' };

const EVENT_META = {
  case_filed:                 { label: 'Case Filed',              icon: FileText,   color: '#64748B' },
  case_opened:                { label: 'Case Opened',             icon: Gavel,      color: '#2563EB' },
  lawyer_hired_prosecution:   { label: 'Prosecutor Engaged',      icon: Briefcase,  color: '#DC2626' },
  lawyer_hired_defense:       { label: 'Defense Counsel Engaged', icon: Briefcase,  color: '#2563EB' },
  opening_statement:          { label: 'Opening Statement',       icon: FileText,   color: '#0F172A' },
  rebuttal:                   { label: 'Rebuttal',                icon: RotateCcw,  color: '#7C3AED' },
  evidence_submitted:         { label: 'Evidence Submitted',      icon: Upload,     color: '#D97706' },
  cross_examination:          { label: 'Cross Examination',       icon: Eye,        color: '#0284C7' },
  closing_argument:           { label: 'Closing Argument',        icon: FileText,   color: '#0F172A' },
  jury_summoned:              { label: 'Jury Summoned',           icon: Users,      color: '#7C3AED' },
  jury_deliberation_started:  { label: 'Jury Deliberating',       icon: Clock,      color: '#7C3AED' },
  jury_vote_cast:             { label: 'Jury Vote Cast',          icon: CheckCircle2, color: '#059669' },
  judge_deliberation:         { label: 'Judge Deliberating',      icon: Gavel,      color: '#B45309' },
  jury_verdict:               { label: 'Jury Verdict',            icon: Users,      color: '#7C3AED' },
  verdict_delivered:          { label: 'Verdict Delivered',       icon: Gavel,      color: '#B45309' },
  fine_issued:                { label: 'Fine Issued',             icon: Banknote,   color: '#DC2626' },
  fine_paid:                  { label: 'Fine Paid',               icon: CheckCircle2, color: '#059669' },
  settlement_proposed:        { label: 'Settlement Proposed',     icon: TrendingUp, color: '#7C3AED' },
  settlement_accepted:        { label: 'Settlement Accepted',     icon: CheckCircle2, color: '#059669' },
  settlement_rejected:        { label: 'Settlement Rejected',     icon: XCircle,    color: '#DC2626' },
  appeal_filed:               { label: 'Appeal Filed',            icon: RotateCcw,  color: '#D97706' },
  appeal_ruled:               { label: 'Appeal Ruled',            icon: Gavel,      color: '#B45309' },
  case_closed:                { label: 'Case Closed',             icon: Lock,       color: '#94A3B8' },
  punishment_enforced:        { label: 'Punishment Enforced',     icon: Shield,     color: '#DC2626' },
};

const SEVERITY_COLORS = {
  minor:    { text: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  moderate: { text: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  major:    { text: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  critical: { text: '#7C2D12', bg: '#FFF7ED', border: '#FED7AA' },
};

const PUNISHMENT_LABELS = {
  none:                 'No Punishment',
  warning:              'Formal Warning',
  fine:                 'Financial Penalty',
  marketplace_ban:      'Marketplace Ban',
  lounge_suspension:    'Lounge Suspension',
  community_suspension: 'Community Suspension',
  estate_ban:           'Estate Ban',
};

function Avatar({ initials, color, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 3,
      background: color + '22', border: `2px solid ${color}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{ color, fontSize: size * 0.33, fontWeight: 800 }}>{initials}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.filed;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
      color: m.color, background: m.bg, border: `1px solid ${m.color}33`,
    }}>{m.label}</span>
  );
}

// ── Courtroom header banner ─────────────────────────────────────────────────

function CourtroomBanner({ stats }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F2A1A 100%)',
      borderRadius: 20, padding: '28px 32px', marginBottom: 24,
      border: '1px solid #1E293B', position: 'relative', overflow: 'hidden',
    }}>
      {/* decorative */}
      <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(16,185,129,0.05)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(180,83,9,0.06)', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ background: 'rgba(180,83,9,0.2)', border: '1px solid rgba(180,83,9,0.4)', borderRadius: 12, padding: '8px 10px' }}>
              <Scale size={22} color="#F59E0B" />
            </div>
            <div>
              <div style={{ color: '#F59E0B', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                AreaConnect Court of Justice
              </div>
              <div style={{ color: '#F1F5F9', fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                The Honourable Court
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <div style={{ background: 'rgba(180,83,9,0.15)', borderRadius: 8, padding: '3px 10px' }}>
              <span style={{ color: '#D97706', fontSize: 11, fontWeight: 600 }}>Presiding: Judge Orizu</span>
            </div>
            <div style={{ color: '#64748B', fontSize: 11 }}>· AI-Powered Legal System</div>
          </div>
        </div>

        {stats && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Cases', value: stats.total ?? 0, color: '#94A3B8' },
              { label: 'In Hearing',  value: stats.byStatus?.in_hearing ?? 0, color: '#D97706' },
              { label: 'Verdicts',    value: stats.byStatus?.verdict_delivered ?? 0, color: '#10B981' },
              { label: 'Settled',     value: stats.byStatus?.settled ?? 0, color: '#7C3AED' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ color: s.color, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
                <div style={{ color: '#64748B', fontSize: 10, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* bottom tagline */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ color: '#475569', fontSize: 11, fontStyle: 'italic', margin: 0 }}>
          "Justice delayed is justice denied. All disputes shall be heard with fairness, evidence, and due process."
        </p>
      </div>
    </div>
  );
}

// ── Case card ───────────────────────────────────────────────────────────────

function CaseCard({ c, onClick }) {
  const sev = SEVERITY_COLORS[c.severity] || SEVERITY_COLORS.minor;
  return (
    <button onClick={onClick}
      className="w-full text-left transition-all"
      style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '16px 18px', marginBottom: 10 }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(16,185,129,0.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{c.caseNumber}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 999,
              color: sev.text, background: sev.bg, border: `1px solid ${sev.border}` }}>
              {c.severity?.toUpperCase()}
            </span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 4 }}>{c.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B', flexWrap: 'wrap' }}>
            <span>{c.plaintiff?.name || 'Unknown'}</span>
            <span style={{ color: '#DC2626', fontWeight: 800 }}>vs</span>
            <span>{c.defendant?.isEstate ? 'Estate Management' : (c.defendant?.name || 'Unknown')}</span>
            <span style={{ color: '#CBD5E1' }}>·</span>
            <span style={{ color: '#94A3B8' }}>{TYPE_LABELS[c.type] || c.type}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <StatusBadge status={c.status} />
          <span style={{ fontSize: 11, color: '#94A3B8' }}>
            {new Date(c.filedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>
      {c.proceedings?.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={11} color="#94A3B8" />
          <span style={{ fontSize: 11, color: '#94A3B8' }}>{c.proceedings.length} proceedings</span>
          {c.jury?.members?.length > 0 && (
            <><span style={{ color: '#CBD5E1' }}>·</span>
            <Users size={11} color="#7C3AED" />
            <span style={{ fontSize: 11, color: '#7C3AED' }}>{c.jury.members.length} jurors</span></>
          )}
          {c.fine?.status === 'pending' && (
            <><span style={{ color: '#CBD5E1' }}>·</span>
            <Banknote size={11} color="#DC2626" />
            <span style={{ fontSize: 11, color: '#DC2626' }}>Fine pending</span></>
          )}
        </div>
      )}
    </button>
  );
}

// ── File Dispute form ────────────────────────────────────────────────────────

function FileDisputeForm({ onFiled, residents }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', type: '', severity: 'moderate',
    charges: [''],
    plaintiffStatement: '',
    defendantUserId: '', isDefendantEstate: false,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setCharge = (i, v) => {
    const c = [...form.charges]; c[i] = v; set('charges', c);
  };
  const addCharge = () => set('charges', [...form.charges, '']);
  const removeCharge = (i) => set('charges', form.charges.filter((_, idx) => idx !== i));

  const submit = async () => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        charges: form.charges.filter(c => c.trim()),
      };
      await courtAPI.fileCase(payload);
      toast.success('Case filed and opened. AI lawyers have been assigned.');
      onFiled();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to file case');
    } finally {
      setLoading(false);
    }
  };

  const canStep0 = form.title.trim() && form.type && form.severity;
  const canStep1 = form.isDefendantEstate || form.defendantUserId;
  const canStep2 = form.charges.some(c => c.trim()) && form.plaintiffStatement.trim().length >= 30;

  const TYPES = Object.entries(TYPE_LABELS);

  return (
    <div style={{ maxWidth: 600 }}>
      {/* step indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['Case Details', 'Defendant', 'Statement & Charges'].map((s, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              height: 3, borderRadius: 2, marginBottom: 6,
              background: i <= step ? '#10B981' : '#E2E8F0',
            }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: i === step ? '#10B981' : '#94A3B8' }}>{s}</span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Case Title</label>
            <input className="input-field" placeholder="Brief descriptive title of the dispute" value={form.title}
              onChange={e => set('title', e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Type of Dispute</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {TYPES.map(([val, label]) => (
                <button key={val} onClick={() => set('type', val)}
                  style={{
                    padding: '8px 12px', borderRadius: 10, textAlign: 'left', fontSize: 12, fontWeight: 600,
                    border: form.type === val ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                    background: form.type === val ? '#F0FDF4' : '#FAFAFA',
                    color: form.type === val ? '#065F46' : '#475569',
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Severity</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['minor', 'moderate', 'major', 'critical'].map(s => {
                const sc = SEVERITY_COLORS[s];
                return (
                  <button key={s} onClick={() => set('severity', s)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 11, fontWeight: 700,
                      textTransform: 'capitalize',
                      border: form.severity === s ? `1.5px solid ${sc.border}` : '1px solid #E2E8F0',
                      background: form.severity === s ? sc.bg : '#FAFAFA',
                      color: form.severity === s ? sc.text : '#94A3B8',
                    }}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
          <button onClick={() => setStep(1)} disabled={!canStep0}
            style={{ padding: '11px 0', borderRadius: 12, background: canStep0 ? 'linear-gradient(135deg,#10B981,#059669)' : '#E2E8F0',
              color: canStep0 ? '#fff' : '#94A3B8', fontWeight: 700, fontSize: 14, border: 'none', cursor: canStep0 ? 'pointer' : 'not-allowed' }}>
            Continue
          </button>
        </div>
      )}

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button onClick={() => set('isDefendantEstate', !form.isDefendantEstate)}
            style={{
              padding: 14, borderRadius: 12, textAlign: 'left',
              border: form.isDefendantEstate ? '1.5px solid #DC2626' : '1px solid #E2E8F0',
              background: form.isDefendantEstate ? '#FEF2F2' : '#FAFAFA',
            }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: form.isDefendantEstate ? '#DC2626' : '#0F172A', marginBottom: 3 }}>
              {form.isDefendantEstate ? '✓ ' : ''}Filing against Estate Management
            </div>
            <div style={{ fontSize: 12, color: '#64748B' }}>Dispute a decision, rule, or action taken by estate management</div>
          </button>

          {!form.isDefendantEstate && (
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Select Defendant (Resident)</label>
              <select className="input-field" value={form.defendantUserId}
                onChange={e => set('defendantUserId', e.target.value)}>
                <option value="">— Select a resident —</option>
                {residents.map(r => (
                  <option key={r._id} value={r._id}>{r.name}{r.unit ? ` — ${r.unit}` : ''}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(0)} style={{ flex: '0 0 auto', padding: '10px 18px', borderRadius: 12, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Back
            </button>
            <button onClick={() => setStep(2)} disabled={!canStep1}
              style={{ flex: 1, padding: '11px 0', borderRadius: 12, background: canStep1 ? 'linear-gradient(135deg,#10B981,#059669)' : '#E2E8F0',
                color: canStep1 ? '#fff' : '#94A3B8', fontWeight: 700, fontSize: 14, border: 'none', cursor: canStep1 ? 'pointer' : 'not-allowed' }}>
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Charges (what are you alleging?)</label>
            {form.charges.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <input className="input-field" placeholder={`Charge ${i + 1}…`} value={c}
                  onChange={e => setCharge(i, e.target.value)} style={{ flex: 1 }} />
                {form.charges.length > 1 && (
                  <button onClick={() => removeCharge(i)}
                    style={{ padding: '0 12px', borderRadius: 10, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer' }}>
                    <XCircle size={14} />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addCharge} style={{ fontSize: 12, color: '#10B981', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', paddingLeft: 0 }}>
              + Add charge
            </button>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
              Opening Statement (min. 30 characters)
            </label>
            <textarea className="input-field" rows={5} placeholder="Describe the incident in full detail. Include dates, times, witnesses, and the impact on you or the community..."
              value={form.plaintiffStatement} onChange={e => set('plaintiffStatement', e.target.value)} style={{ resize: 'vertical' }} />
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{form.plaintiffStatement.length} characters</div>
          </div>

          <div style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10 }}>
            <CheckCircle2 size={16} color="#10B981" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: '#065F46' }}>
              Upon filing, your case will open immediately. AI lawyers (prosecution and defense) will be auto-assigned, and opening statements will be generated.
            </div>
          </div>

          <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10 }}>
            <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: '#92400E' }}>
              Filing a false claim is a punishable offence under the Estate Community Code. Ensure all information is accurate and truthful.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(1)} style={{ flex: '0 0 auto', padding: '10px 18px', borderRadius: 12, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Back
            </button>
            <button onClick={submit} disabled={!canStep2 || loading}
              style={{ flex: 1, padding: '11px 0', borderRadius: 12,
                background: canStep2 && !loading ? 'linear-gradient(135deg,#DC2626,#B91C1C)' : '#E2E8F0',
                color: canStep2 && !loading ? '#fff' : '#94A3B8', fontWeight: 700, fontSize: 14, border: 'none',
                cursor: canStep2 && !loading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading
                ? <><svg className="animate-spin" width={14} height={14} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>Filing…</>
                : <><Gavel size={14} /> File &amp; Open Case</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Proceeding entry ─────────────────────────────────────────────────────────

function ProceedingEntry({ p, index }) {
  const meta = EVENT_META[p.event] || { label: p.event, icon: FileText, color: '#64748B' };
  const Icon = meta.icon;
  const isJudge = p.actorName?.toLowerCase().includes('judge') || p.actorName?.toLowerCase().includes('orizu');
  const isAI = p.isAI;

  return (
    <div style={{ display: 'flex', gap: 12, paddingBottom: 16, position: 'relative' }}>
      {/* timeline line */}
      <div style={{ position: 'absolute', left: 20, top: 40, bottom: 0, width: 1.5, background: '#F1F5F9' }} />

      <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: meta.color + '15', border: `1.5px solid ${meta.color}30`, zIndex: 1 }}>
        <Icon size={16} color={meta.color} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{meta.label}</span>
          {p.actorName && (
            <span style={{ fontSize: 11, color: '#64748B' }}>— {p.actorName}</span>
          )}
          {isAI && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: '#EDE9FE', color: '#7C3AED', border: '1px solid #DDD6FE' }}>AI</span>
          )}
          {isJudge && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' }}>⚖️ Judge</span>
          )}
          <span style={{ fontSize: 10, color: '#94A3B8', marginLeft: 'auto' }}>
            {new Date(p.timestamp).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        {p.content && (
          <div style={{
            background: isJudge ? 'linear-gradient(135deg,#FFF7ED,#FFFBEB)' : isAI ? '#F8FAFC' : '#FAFAFA',
            border: isJudge ? '1px solid #FDE68A' : '1px solid #F1F5F9',
            borderRadius: 10, padding: '10px 14px', marginTop: 4,
            fontSize: 13, color: '#334155', lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}>
            {isJudge && <span style={{ color: '#B45309', fontWeight: 700, display: 'block', marginBottom: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚖️ The Honourable Judge Orizu</span>}
            {p.content}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Verdict display ──────────────────────────────────────────────────────────

function VerdictDisplay({ verdict, fine, caseObj, onPayFine, payingFine, user }) {
  if (!verdict?.decision) return null;
  const isGuilty = verdict.decision === 'guilty';
  const isDismissed = verdict.decision === 'dismissed';
  const isNotGuilty = verdict.decision === 'not_guilty';

  return (
    <div style={{
      background: isGuilty ? 'linear-gradient(135deg,#1C0A0A,#2D0A0A)' : isDismissed ? 'linear-gradient(135deg,#0F172A,#1E293B)' : 'linear-gradient(135deg,#052E16,#064E3B)',
      borderRadius: 16, padding: 24, marginBottom: 20,
      border: isGuilty ? '1px solid #DC2626' : isDismissed ? '1px solid #334155' : '1px solid #10B981',
    }}>
      {/* Default judgment badge */}
      {caseObj?.isDefaultJudgment && (
        <div style={{ marginBottom: 12, padding: '8px 14px', borderRadius: 10, background: 'rgba(220,38,38,0.2)', border: '1px solid #DC2626', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} color="#FCA5A5" />
          <span style={{ color: '#FCA5A5', fontSize: 12, fontWeight: 700 }}>DEFAULT JUDGMENT — Defendant failed to respond in time</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ background: isGuilty ? '#DC262620' : '#10B98120', borderRadius: 10, padding: '8px 10px' }}>
          <Gavel size={20} color={isGuilty ? '#DC2626' : isDismissed ? '#64748B' : '#10B981'} />
        </div>
        <div>
          <div style={{ color: isGuilty ? '#FCA5A5' : '#94A3B8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Verdict Delivered by Judge Orizu
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.01em',
            color: isGuilty ? '#FCA5A5' : isNotGuilty ? '#6EE7B7' : '#94A3B8' }}>
            {isGuilty ? 'GUILTY' : isNotGuilty ? 'NOT GUILTY' : verdict.decision.toUpperCase().replace('_', ' ')}
          </div>
        </div>
      </div>

      {verdict.summary && (
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 14px', marginBottom: 14, fontSize: 13, color: '#CBD5E1', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {verdict.summary}
        </div>
      )}

      {isGuilty && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {verdict.fine > 0 && (
            <div style={{ flex: 1, background: '#DC262618', border: '1px solid #DC262640', borderRadius: 12, padding: '12px 14px', minWidth: 140 }}>
              <div style={{ color: '#FCA5A5', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Fine Imposed</div>
              <div style={{ color: '#FCA5A5', fontSize: 20, fontWeight: 800 }}>{fmt(verdict.fine)}</div>
              <div style={{ color: '#F87171', fontSize: 11, marginTop: 2 }}>
                {fine?.status === 'paid' ? '✓ Paid' : fine?.status === 'pending' ? `Due ${fine.dueDate ? new Date(fine.dueDate).toLocaleDateString('en-NG') : 'ASAP'}` : ''}
              </div>
            </div>
          )}
          {verdict.punishment !== 'none' && (
            <div style={{ flex: 1, background: '#7C2D1218', border: '1px solid #7C2D1240', borderRadius: 12, padding: '12px 14px', minWidth: 140 }}>
              <div style={{ color: '#FCA5A5', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Punishment</div>
              <div style={{ color: '#FBBF24', fontSize: 13, fontWeight: 700 }}>{PUNISHMENT_LABELS[verdict.punishment]}</div>
              {verdict.punishmentDurationDays > 0 && (
                <div style={{ color: '#F87171', fontSize: 11, marginTop: 2 }}>{verdict.punishmentDurationDays} days</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pay fine button */}
      {isGuilty && fine?.status === 'pending' && fine.amount > 0 &&
        (caseObj.defendant?.userId === user?._id || caseObj.defendant?.userId?._id === user?._id) && (
        <button onClick={onPayFine} disabled={payingFine}
          style={{ marginTop: 14, width: '100%', padding: '12px 0', borderRadius: 12,
            background: 'linear-gradient(135deg,#DC2626,#B91C1C)', color: '#fff', fontWeight: 700, fontSize: 14,
            border: 'none', cursor: payingFine ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {payingFine
            ? <><svg className="animate-spin" width={14} height={14} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg> Processing…</>
            : <><Banknote size={16} /> Pay Fine — {fmt(fine.amount)}</>}
        </button>
      )}
      {isGuilty && fine?.status === 'paid' && (
        <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 12, background: '#06452618', border: '1px solid #10B98140', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} color="#10B981" />
          <span style={{ color: '#6EE7B7', fontSize: 13, fontWeight: 600 }}>Fine paid on {fine.paidAt ? new Date(fine.paidAt).toLocaleDateString('en-NG') : '—'}</span>
        </div>
      )}
    </div>
  );
}

// ── Case detail view ─────────────────────────────────────────────────────────

function CaseDetail({ caseId, onBack, user, isManager }) {
  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('proceedings');

  // action states
  const [argText, setArgText]           = useState('');
  const [argSide, setArgSide]           = useState('prosecution');
  const [submittingArg, setSubmittingArg] = useState(false);
  const [evidenceLabel, setEvidenceLabel] = useState('');
  const [evidenceContent, setEvidenceContent] = useState('');
  const [evidenceSide, setEvidenceSide] = useState('prosecution');
  const [submittingEvid, setSubmittingEvid] = useState(false);
  const [juryVote, setJuryVote]         = useState('');
  const [juryReason, setJuryReason]     = useState('');
  const [submittingVote, setSubmittingVote] = useState(false);
  const [hiringLawyer, setHiringLawyer] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [selectedLawyerSide, setSelectedLawyerSide] = useState(null);
  const [deliveringVerdict, setDeliveringVerdict] = useState(false);
  const [payingFine, setPayingFine]     = useState(false);
  const [settlementTerms, setSettlementTerms] = useState('');
  const [settlementAmount, setSettlementAmount] = useState('');
  const [submittingSettlement, setSubmittingSettlement] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  // new states
  const [chatMsg, setChatMsg]           = useState('');
  const [chatLoading, setChatLoading]   = useState(false);
  const [adjournReason, setAdjournReason] = useState('');
  const [submittingAdjourn, setSubmittingAdjourn] = useState(false);

  const proceedingsRef = useRef(null);
  const chatEndRef = useRef(null);

  const load = async () => {
    try {
      const res = await courtAPI.getCase(caseId);
      setC(res.data.data);
    } catch {
      toast.error('Failed to load case');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [caseId]);

  useEffect(() => {
    if (proceedingsRef.current) {
      proceedingsRef.current.scrollTop = proceedingsRef.current.scrollHeight;
    }
  }, [c?.proceedings?.length]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [c?.lawyerChats]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      <svg className="animate-spin" width={32} height={32} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#10B981" strokeWidth="2.5" strokeOpacity=".2"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    </div>
  );

  if (!c) return <div style={{ padding: 32, color: '#94A3B8' }}>Case not found.</div>;

  const userId = user?._id;
  const isPlaintiff = c.plaintiff?.userId === userId || c.plaintiff?.userId?._id === userId;
  const isDefendant = !c.defendant?.isEstate && (c.defendant?.userId === userId || c.defendant?.userId?._id === userId);
  const isJuror = c.jury?.members?.some(m => m === userId || m?._id === userId || m?.toString() === userId);
  const hasVoted = c.jury?.votes?.some(v => v.userId === userId || v.userId?._id === userId || v.userId?.toString() === userId);
  const canAct = !['settled','closed'].includes(c.status);

  // lawyer chat helpers
  const myLawyerSide = isPlaintiff ? 'prosecution' : isDefendant ? 'defense' : null;
  const myLawyerPersonaKey = myLawyerSide === 'prosecution'
    ? c.lawyers?.prosecution?.aiPersona
    : myLawyerSide === 'defense'
      ? c.lawyers?.defense?.aiPersona
      : null;
  const myLawyerPersona = myLawyerPersonaKey ? AI_PERSONAS[myLawyerPersonaKey] : null;
  const myChats = myLawyerSide ? (c.lawyerChats?.[myLawyerSide] || []) : [];

  const sendChatMsg = async () => {
    if (!chatMsg.trim() || !myLawyerSide) return;
    setChatLoading(true);
    const msgToSend = chatMsg.trim();
    setChatMsg('');
    try {
      await courtAPI.chatWithLawyer(c._id, msgToSend);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
      setChatMsg(msgToSend);
    } finally { setChatLoading(false); }
  };

  const hireAILawyer = async () => {
    if (!selectedPersona || !selectedLawyerSide) return;
    setHiringLawyer(true);
    try {
      await courtAPI.hireLawyer(c._id, { side: selectedLawyerSide, persona: selectedPersona });
      toast.success('Counsel changed — new opening argument submitted to the court!');
      setSelectedPersona(null); setSelectedLawyerSide(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change counsel');
    } finally { setHiringLawyer(false); }
  };

  const submitArgument = async () => {
    if (!argText.trim()) return;
    setSubmittingArg(true);
    try {
      await courtAPI.submitArgument(c._id, { content: argText, side: argSide });
      toast.success('Argument submitted to the court');
      setArgText(''); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSubmittingArg(false); }
  };

  const submitEvidence = async () => {
    if (!evidenceLabel.trim() || !evidenceContent.trim()) return;
    setSubmittingEvid(true);
    try {
      await courtAPI.submitEvidence(c._id, { label: evidenceLabel, content: evidenceContent, side: evidenceSide });
      toast.success('Evidence admitted to the record');
      setEvidenceLabel(''); setEvidenceContent(''); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSubmittingEvid(false); }
  };

  const castVote = async () => {
    if (!juryVote) return;
    setSubmittingVote(true);
    try {
      await courtAPI.castJuryVote(c._id, { vote: juryVote, reasoning: juryReason });
      toast.success('Your verdict has been cast. The jury thanks you.');
      setJuryVote(''); setJuryReason(''); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSubmittingVote(false); }
  };

  const deliverVerdict = async () => {
    setDeliveringVerdict(true);
    try {
      await courtAPI.deliverVerdict(c._id);
      toast.success('Judge Orizu has deliberated and delivered the verdict!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setDeliveringVerdict(false); }
  };

  const payFine = async () => {
    setPayingFine(true);
    try {
      await courtAPI.payFine(c._id);
      toast.success('Fine paid. The court record has been updated.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Insufficient wallet balance. Please top up.');
    } finally { setPayingFine(false); }
  };

  const proposeSettlement = async () => {
    setSubmittingSettlement(true);
    try {
      await courtAPI.proposeSettlement(c._id, { action: 'propose', terms: settlementTerms, amount: Number(settlementAmount) || 0 });
      toast.success('Settlement proposal submitted');
      setSettlementTerms(''); setSettlementAmount(''); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSubmittingSettlement(false); }
  };

  const respondSettlement = async (action) => {
    try {
      await courtAPI.proposeSettlement(c._id, { action });
      toast.success(action === 'accept' ? 'Settlement accepted. Case resolved.' : 'Settlement rejected.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const fileAppeal = async () => {
    if (!appealReason.trim()) return;
    setSubmittingAppeal(true);
    try {
      await courtAPI.fileAppeal(c._id, { reason: appealReason });
      toast.success('Appeal filed. Judge Orizu will reconsider.');
      setAppealReason(''); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSubmittingAppeal(false); }
  };

  const adjourn = async () => {
    if (!adjournReason.trim()) return;
    setSubmittingAdjourn(true);
    try {
      await courtAPI.requestAdjournment(c._id, adjournReason.trim());
      toast.success('Adjournment request submitted to the court.');
      setAdjournReason(''); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request adjournment');
    } finally { setSubmittingAdjourn(false); }
  };

  const sev = SEVERITY_COLORS[c.severity] || SEVERITY_COLORS.minor;
  const prosLawyer = c.lawyers?.prosecution;
  const defLawyer = c.lawyers?.defense;

  // Build tabs — "My Lawyer" only if plaintiff or defendant
  const DETAIL_TABS = [
    { id: 'proceedings', label: 'Proceedings', count: c.proceedings?.length },
    ...(isPlaintiff || isDefendant ? [{ id: 'lawyer', label: 'My Lawyer' }] : []),
    { id: 'evidence', label: 'Evidence', count: c.evidence?.length },
    { id: 'actions', label: 'Actions' },
    { id: 'jury', label: 'Jury', count: c.jury?.members?.length },
  ];

  return (
    <div>
      {/* back button */}
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, padding: 0 }}>
        <ArrowLeft size={15} /> Back to Cases
      </button>

      {/* Case header */}
      <div style={{ background: 'linear-gradient(135deg,#0F172A,#1E293B)', borderRadius: 18, padding: '22px 24px', marginBottom: 16, border: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#F59E0B', fontWeight: 700, letterSpacing: '0.05em' }}>{c.caseNumber}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                color: sev.text, background: sev.bg + 'cc', border: `1px solid ${sev.border}` }}>
                {c.severity?.toUpperCase()}
              </span>
              <span style={{ fontSize: 11, color: '#64748B' }}>{TYPE_LABELS[c.type]}</span>
            </div>
            <div style={{ color: '#F1F5F9', fontSize: 18, fontWeight: 800, marginBottom: 10 }}>{c.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Avatar initials={(c.plaintiff?.name || 'P')[0].toUpperCase()} color="#10B981" size={28} />
                <div>
                  <div style={{ color: '#94A3B8', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Plaintiff</div>
                  <div style={{ color: '#F1F5F9', fontSize: 12, fontWeight: 600 }}>{c.plaintiff?.name || 'Unknown'}</div>
                </div>
              </div>
              <div style={{ color: '#DC2626', fontWeight: 900, fontSize: 16, padding: '0 8px' }}>VS</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Avatar initials={c.defendant?.isEstate ? 'ES' : (c.defendant?.name || 'D')[0].toUpperCase()} color="#DC2626" size={28} />
                <div>
                  <div style={{ color: '#94A3B8', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Defendant</div>
                  <div style={{ color: '#F1F5F9', fontSize: 12, fontWeight: 600 }}>{c.defendant?.isEstate ? 'Estate Management' : (c.defendant?.name || 'Unknown')}</div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <StatusBadge status={c.status} />
            {isManager && ['in_hearing','jury_deliberation','judge_deliberation'].includes(c.status) && !c.verdict?.decision && (
              <button onClick={deliverVerdict} disabled={deliveringVerdict}
                style={{ padding: '7px 14px', borderRadius: 10, background: 'linear-gradient(135deg,#B45309,#92400E)', color: '#fff', fontWeight: 700, fontSize: 12, border: 'none', cursor: deliveringVerdict ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {deliveringVerdict
                  ? <><svg className="animate-spin" width={12} height={12} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg> Deliberating…</>
                  : <><Scale size={13} /> Deliver Verdict</>}
              </button>
            )}
          </div>
        </div>

        {/* Response deadline / default judgment warning */}
        {c.responseDeadline && !c.verdict?.decision && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={13} color="#D97706" />
            <span style={{ fontSize: 12, color: '#D97706', fontWeight: 600 }}>
              Defendant must respond by {new Date(c.responseDeadline).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
        {c.defaultJudgmentWarningAt && !c.verdict?.decision && (
          <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(220,38,38,0.15)', border: '1px solid #DC262650', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={14} color="#FCA5A5" />
            <span style={{ fontSize: 12, color: '#FCA5A5', fontWeight: 700 }}>
              Final warning issued — default judgment pending
            </span>
          </div>
        )}

        {/* Charges */}
        {c.charges?.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #334155' }}>
            <div style={{ color: '#94A3B8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Charges</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {c.charges.map((ch, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: '#DC262618', color: '#FCA5A5', border: '1px solid #DC262630' }}>
                  {i + 1}. {ch}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Lawyers panel */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #334155', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { side: 'prosecution', lawyer: prosLawyer, sideColor: '#DC2626', label: 'Prosecution' },
            { side: 'defense', lawyer: defLawyer, sideColor: '#2563EB', label: 'Defense' },
          ].map(({ side, lawyer, sideColor, label }) => {
            const persona = lawyer?.aiPersona ? AI_PERSONAS[lawyer.aiPersona] : null;
            return (
              <div key={side} style={{ flex: 1, minWidth: 160, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px', border: `1px solid ${sideColor}30` }}>
                <div style={{ color: sideColor, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label} Counsel</div>
                {persona ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar initials={persona.initials} color={persona.color} size={28} />
                    <div>
                      <div style={{ color: '#F1F5F9', fontSize: 11, fontWeight: 700 }}>{persona.name}</div>
                      <div style={{ color: '#64748B', fontSize: 10 }}>{persona.role} · AI</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#64748B', fontSize: 11, fontStyle: 'italic' }}>Self-represented</div>
                )}
              </div>
            );
          })}
          <div style={{ flex: 1, minWidth: 160, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px', border: '1px solid #B4530930' }}>
            <div style={{ color: '#B45309', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Presiding Judge</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar initials={JUDGE.initials} color={JUDGE.color} size={28} />
              <div>
                <div style={{ color: '#F1F5F9', fontSize: 11, fontWeight: 700 }}>{JUDGE.name}</div>
                <div style={{ color: '#64748B', fontSize: 10 }}>AI · AreaConnect Court</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verdict */}
      {c.verdict?.decision && (
        <VerdictDisplay verdict={c.verdict} fine={c.fine} caseObj={c} onPayFine={payFine} payingFine={payingFine} user={user} />
      )}

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#F8FAFC', borderRadius: 12, padding: 4, border: '1px solid #E2E8F0', overflowX: 'auto' }}>
        {DETAIL_TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ flex: 1, minWidth: 'fit-content', padding: '8px 12px', borderRadius: 9, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
              background: activeTab === t.id ? '#fff' : 'transparent',
              color: activeTab === t.id ? '#0F172A' : '#64748B',
              boxShadow: activeTab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>
            {t.label}{t.count != null ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {/* ── Proceedings tab ── */}
      {activeTab === 'proceedings' && (
        <div>
          {c.plaintiffStatement && (
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Plaintiff's Opening Statement</div>
              <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.7 }}>{c.plaintiffStatement}</div>
            </div>
          )}
          <div ref={proceedingsRef} style={{ maxHeight: 480, overflowY: 'auto', paddingRight: 4 }}>
            {c.proceedings?.length === 0
              ? <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px 0', fontSize: 13 }}>No proceedings yet. The court is in recess.</div>
              : c.proceedings.map((p, i) => <ProceedingEntry key={p._id || i} p={p} index={i} />)}
          </div>
        </div>
      )}

      {/* ── My Lawyer tab ── */}
      {activeTab === 'lawyer' && (isPlaintiff || isDefendant) && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 520 }}>
          {/* Lawyer header */}
          {myLawyerPersona ? (
            <div style={{ background: myLawyerPersona.color + '10', border: `1px solid ${myLawyerPersona.color}30`, borderRadius: 12, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar initials={myLawyerPersona.initials} color={myLawyerPersona.color} size={40} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{myLawyerPersona.name}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>{myLawyerPersona.role} · Private Counsel · AI</div>
              </div>
              <div style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 999, background: myLawyerPersona.color + '20', border: `1px solid ${myLawyerPersona.color}40` }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: myLawyerPersona.color }}>
                  {myLawyerSide === 'prosecution' ? 'Your Prosecutor' : 'Your Defender'}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Briefcase size={18} color="#94A3B8" />
              <span style={{ fontSize: 13, color: '#64748B' }}>No counsel assigned yet. Your case is being processed.</span>
            </div>
          )}

          {/* Chat messages */}
          <div style={{ flex: 1, overflowY: 'auto', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {myChats.length === 0 ? (
              <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: '#94A3B8' }}>
                <Lock size={24} color="#CBD5E1" />
                <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Private & Confidential</div>
                <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', maxWidth: 260, lineHeight: 1.5 }}>
                  This chat is between you and your AI counsel only. Start a conversation — ask for strategy, clarification, or guidance on your case.
                </div>
              </div>
            ) : (
              myChats.map((msg, i) => {
                const isUser = msg.from === 'user';
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', gap: 8 }}>
                    {!isUser && myLawyerPersona && (
                      <Avatar initials={myLawyerPersona.initials} color={myLawyerPersona.color} size={28} />
                    )}
                    <div style={{
                      maxWidth: '75%', padding: '10px 14px', borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: isUser ? 'linear-gradient(135deg,#10B981,#059669)' : '#fff',
                      border: isUser ? 'none' : `1px solid ${myLawyerPersona ? myLawyerPersona.color + '25' : '#E2E8F0'}`,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    }}>
                      {!isUser && myLawyerPersona && (
                        <div style={{ fontSize: 10, fontWeight: 700, color: myLawyerPersona.color, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {myLawyerPersona.name}
                        </div>
                      )}
                      <div style={{ fontSize: 13, color: isUser ? '#fff' : '#334155', lineHeight: 1.6 }}>{msg.content}</div>
                      {msg.timestamp && (
                        <div style={{ fontSize: 10, color: isUser ? 'rgba(255,255,255,0.6)' : '#94A3B8', marginTop: 4, textAlign: isUser ? 'right' : 'left' }}>
                          {new Date(msg.timestamp).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                    {isUser && (
                      <Avatar initials={(user?.name || 'U')[0].toUpperCase()} color="#10B981" size={28} />
                    )}
                  </div>
                );
              })
            )}
            {chatLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748B', fontSize: 12, fontStyle: 'italic' }}>
                {myLawyerPersona && <Avatar initials={myLawyerPersona.initials} color={myLawyerPersona.color} size={28} />}
                <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px 14px 14px 4px', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <svg className="animate-spin" width={12} height={12} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#94A3B8" strokeWidth="3" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round"/></svg>
                    <span style={{ fontSize: 12, color: '#64748B' }}>Counsel is reviewing your case...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input-field"
              placeholder={myLawyerPersona ? `Message ${myLawyerPersona.name}…` : 'Type a message…'}
              value={chatMsg}
              onChange={e => setChatMsg(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMsg(); } }}
              disabled={chatLoading || !myLawyerPersona}
              style={{ flex: 1 }}
            />
            <button onClick={sendChatMsg} disabled={!chatMsg.trim() || chatLoading || !myLawyerPersona}
              style={{ padding: '0 16px', borderRadius: 10, border: 'none', cursor: chatMsg.trim() && !chatLoading && myLawyerPersona ? 'pointer' : 'not-allowed',
                background: chatMsg.trim() && !chatLoading && myLawyerPersona ? 'linear-gradient(135deg,#10B981,#059669)' : '#E2E8F0',
                color: chatMsg.trim() && !chatLoading && myLawyerPersona ? '#fff' : '#94A3B8',
                display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Evidence tab ── */}
      {activeTab === 'evidence' && (
        <div>
          {c.evidence?.length === 0
            ? <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px 0', fontSize: 13 }}>No evidence on record yet.</div>
            : c.evidence.map((e, i) => (
              <div key={i} style={{ background: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                    color: e.side === 'prosecution' ? '#DC2626' : e.side === 'defense' ? '#2563EB' : '#64748B',
                    background: e.side === 'prosecution' ? '#FEF2F2' : e.side === 'defense' ? '#EFF6FF' : '#F1F5F9',
                  }}>{e.side?.toUpperCase()}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>{e.label}</span>
                  <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 'auto' }}>
                    {new Date(e.submittedAt).toLocaleDateString('en-NG')}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{e.content}</div>
              </div>
            ))}
        </div>
      )}

      {/* ── Actions tab ── */}
      {activeTab === 'actions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Change Counsel (was Hire Lawyer — now always auto-assigned, this is optional upgrade) */}
          {canAct && (isPlaintiff || isDefendant) && (
            <div style={{ background: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 4 }}>Change Counsel</div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 14 }}>
                An AI lawyer is already assigned to your case. You can optionally switch to a different counsel style.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
                {Object.entries(AI_PERSONAS).map(([key, p]) => (
                  <button key={key} onClick={() => setSelectedPersona(selectedPersona === key ? null : key)}
                    style={{ padding: '10px 12px', borderRadius: 10, textAlign: 'left', border: selectedPersona === key ? `1.5px solid ${p.color}` : '1px solid #E2E8F0',
                      background: selectedPersona === key ? p.color + '10' : '#fff', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar initials={p.initials} color={p.color} size={28} />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: p.color }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: '#94A3B8' }}>{p.role}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {selectedPersona && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {isPlaintiff && <button onClick={() => setSelectedLawyerSide('prosecution')}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 10, fontWeight: 700, fontSize: 12,
                      border: selectedLawyerSide === 'prosecution' ? '1.5px solid #DC2626' : '1px solid #E2E8F0',
                      background: selectedLawyerSide === 'prosecution' ? '#FEF2F2' : '#FAFAFA', color: selectedLawyerSide === 'prosecution' ? '#DC2626' : '#64748B', cursor: 'pointer' }}>
                    As Prosecution
                  </button>}
                  {isDefendant && <button onClick={() => setSelectedLawyerSide('defense')}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 10, fontWeight: 700, fontSize: 12,
                      border: selectedLawyerSide === 'defense' ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                      background: selectedLawyerSide === 'defense' ? '#EFF6FF' : '#FAFAFA', color: selectedLawyerSide === 'defense' ? '#2563EB' : '#64748B', cursor: 'pointer' }}>
                    As Defense
                  </button>}
                </div>
              )}
              {selectedPersona && selectedLawyerSide && (
                <button onClick={hireAILawyer} disabled={hiringLawyer}
                  style={{ width: '100%', padding: '10px 0', borderRadius: 12, fontWeight: 700, fontSize: 13,
                    background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', border: 'none', cursor: hiringLawyer ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {hiringLawyer
                    ? <><svg className="animate-spin" width={14} height={14} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg> Briefing new counsel…</>
                    : <><Briefcase size={14} /> Switch to {AI_PERSONAS[selectedPersona].name}</>}
                </button>
              )}
            </div>
          )}

          {/* Submit argument */}
          {canAct && (isPlaintiff || isDefendant) && c.status !== 'filed' && (
            <div style={{ background: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 4 }}>Submit an Argument</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {[{v:'prosecution',label:'Prosecution',c:'#DC2626'},{v:'defense',label:'Defense',c:'#2563EB'}].map(s => (
                  <button key={s.v} onClick={() => setArgSide(s.v)}
                    style={{ flex: 1, padding: '7px 0', borderRadius: 10, fontWeight: 600, fontSize: 12, border: argSide === s.v ? `1.5px solid ${s.c}` : '1px solid #E2E8F0',
                      background: argSide === s.v ? s.c + '12' : '#fff', color: argSide === s.v ? s.c : '#64748B', cursor: 'pointer' }}>
                    {s.label}
                  </button>
                ))}
              </div>
              <textarea className="input-field" rows={4} placeholder="Your argument, rebuttal, or cross-examination..." value={argText}
                onChange={e => setArgText(e.target.value)} style={{ resize: 'vertical', marginBottom: 10 }} />
              <button onClick={submitArgument} disabled={!argText.trim() || submittingArg}
                style={{ width: '100%', padding: '10px 0', borderRadius: 12, fontWeight: 700, fontSize: 13,
                  background: argText.trim() ? 'linear-gradient(135deg,#0F172A,#1E293B)' : '#E2E8F0',
                  color: argText.trim() ? '#fff' : '#94A3B8', border: 'none', cursor: argText.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Send size={14} /> Submit to Court
              </button>
            </div>
          )}

          {/* Request Adjournment */}
          {canAct && (isPlaintiff || isDefendant) && (
            <div style={{ background: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={15} color="#D97706" /> Request Adjournment
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
                Request a temporary pause in proceedings. The court will review and rule on your request.
              </div>
              <textarea className="input-field" rows={3} placeholder="State your reason for requesting an adjournment..." value={adjournReason}
                onChange={e => setAdjournReason(e.target.value)} style={{ resize: 'none', marginBottom: 10 }} />
              <button onClick={adjourn} disabled={!adjournReason.trim() || submittingAdjourn}
                style={{ width: '100%', padding: '10px 0', borderRadius: 12, fontWeight: 700, fontSize: 13,
                  background: adjournReason.trim() && !submittingAdjourn ? 'linear-gradient(135deg,#D97706,#B45309)' : '#E2E8F0',
                  color: adjournReason.trim() && !submittingAdjourn ? '#fff' : '#94A3B8', border: 'none', cursor: adjournReason.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {submittingAdjourn
                  ? <><svg className="animate-spin" width={14} height={14} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg> Submitting…</>
                  : <><Clock size={14} /> Submit Adjournment Request</>}
              </button>

              {/* Existing adjournments list */}
              {c.adjournments?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Adjournment History</div>
                  {c.adjournments.map((adj, i) => {
                    const isGranted = adj.status === 'granted';
                    const isDenied = adj.status === 'denied';
                    return (
                      <div key={i} style={{ background: isGranted ? '#ECFDF5' : isDenied ? '#FEF2F2' : '#F8FAFC',
                        border: `1px solid ${isGranted ? '#A7F3D0' : isDenied ? '#FECACA' : '#E2E8F0'}`,
                        borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 999,
                            color: isGranted ? '#059669' : isDenied ? '#DC2626' : '#64748B',
                            background: isGranted ? '#D1FAE5' : isDenied ? '#FEE2E2' : '#F1F5F9' }}>
                            {adj.status?.toUpperCase() || 'PENDING'}
                          </span>
                          <span style={{ fontSize: 10, color: '#94A3B8' }}>{adj.side} side</span>
                          {adj.requestedAt && (
                            <span style={{ fontSize: 10, color: '#94A3B8', marginLeft: 'auto' }}>
                              {new Date(adj.requestedAt).toLocaleDateString('en-NG')}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: '#334155', marginBottom: adj.aiRuling ? 6 : 0 }}>{adj.reason}</div>
                        {adj.aiRuling && (
                          <div style={{ fontSize: 12, color: isGranted ? '#065F46' : '#7F1D1D', fontStyle: 'italic', paddingTop: 4, borderTop: `1px solid ${isGranted ? '#A7F3D030' : '#FECACA50'}` }}>
                            Court: {adj.aiRuling}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Submit evidence */}
          {canAct && (isPlaintiff || isDefendant || isManager) && (
            <div style={{ background: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 12 }}>Submit Evidence</div>
              <input className="input-field" placeholder="Evidence label (e.g. CCTV Footage, Payment Receipt...)" value={evidenceLabel}
                onChange={e => setEvidenceLabel(e.target.value)} style={{ marginBottom: 8 }} />
              <textarea className="input-field" rows={3} placeholder="Describe the evidence in detail..." value={evidenceContent}
                onChange={e => setEvidenceContent(e.target.value)} style={{ resize: 'vertical', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {['prosecution','defense','neutral'].map(s => (
                  <button key={s} onClick={() => setEvidenceSide(s)}
                    style={{ flex: 1, padding: '6px 0', borderRadius: 9, fontWeight: 600, fontSize: 11, textTransform: 'capitalize',
                      border: evidenceSide === s ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                      background: evidenceSide === s ? '#F0FDF4' : '#FAFAFA', color: evidenceSide === s ? '#065F46' : '#64748B', cursor: 'pointer' }}>
                    {s}
                  </button>
                ))}
              </div>
              <button onClick={submitEvidence} disabled={!evidenceLabel.trim() || !evidenceContent.trim() || submittingEvid}
                style={{ width: '100%', padding: '10px 0', borderRadius: 12, fontWeight: 700, fontSize: 13,
                  background: evidenceLabel.trim() && evidenceContent.trim() ? 'linear-gradient(135deg,#D97706,#B45309)' : '#E2E8F0',
                  color: evidenceLabel.trim() && evidenceContent.trim() ? '#fff' : '#94A3B8', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Upload size={14} /> Admit to Evidence
              </button>
            </div>
          )}

          {/* Jury vote */}
          {isJuror && !hasVoted && ['open','in_hearing','jury_deliberation'].includes(c.status) && (
            <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#4C1D95', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Star size={16} color="#7C3AED" /> Jury Duty — Cast Your Verdict
              </div>
              <div style={{ fontSize: 12, color: '#6D28D9', marginBottom: 14 }}>You have been summoned to serve as a juror. Your vote carries weight of justice.</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {[
                  { v:'guilty', label:'Guilty', icon: ThumbsDown, c:'#DC2626' },
                  { v:'not_guilty', label:'Not Guilty', icon: ThumbsUp, c:'#059669' },
                  { v:'abstain', label:'Abstain', icon: Minus, c:'#64748B' },
                ].map(o => (
                  <button key={o.v} onClick={() => setJuryVote(o.v)}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 11, fontWeight: 700, fontSize: 12,
                      border: juryVote === o.v ? `1.5px solid ${o.c}` : '1px solid #E2E8F0',
                      background: juryVote === o.v ? o.c + '15' : '#fff', color: juryVote === o.v ? o.c : '#64748B',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <o.icon size={16} />
                    {o.label}
                  </button>
                ))}
              </div>
              <textarea className="input-field" rows={2} placeholder="Reasoning (optional)..." value={juryReason}
                onChange={e => setJuryReason(e.target.value)} style={{ resize: 'none', marginBottom: 10 }} />
              <button onClick={castVote} disabled={!juryVote || submittingVote}
                style={{ width: '100%', padding: '10px 0', borderRadius: 12, fontWeight: 700, fontSize: 13,
                  background: juryVote ? 'linear-gradient(135deg,#7C3AED,#5B21B6)' : '#E2E8F0',
                  color: juryVote ? '#fff' : '#94A3B8', border: 'none', cursor: juryVote ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Scale size={14} /> Submit Jury Vote
              </button>
            </div>
          )}
          {isJuror && hasVoted && (
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={18} color="#10B981" />
              <span style={{ color: '#065F46', fontWeight: 600, fontSize: 13 }}>You have cast your jury vote. The court thanks you for your service.</span>
            </div>
          )}

          {/* Settlement */}
          {canAct && (isPlaintiff || isDefendant) && !['filed'].includes(c.status) && (
            <div style={{ background: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 4 }}>Propose Settlement</div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>Avoid a full verdict — propose an amicable resolution.</div>
              {c.settlement?.status === 'proposed' ? (
                <div>
                  <div style={{ background: '#F5F3FF', borderRadius: 10, padding: '12px 14px', marginBottom: 10, border: '1px solid #DDD6FE' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', marginBottom: 4 }}>SETTLEMENT PROPOSED</div>
                    <div style={{ fontSize: 13, color: '#334155', marginBottom: 6 }}>{c.settlement.terms}</div>
                    {c.settlement.amount > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED' }}>Amount: {fmt(c.settlement.amount)}</div>}
                  </div>
                  {((isPlaintiff && c.settlement.proposedById !== userId) || (isDefendant && c.settlement.proposedById !== userId)) && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => respondSettlement('accept')}
                        style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff', fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>
                        Accept Settlement
                      </button>
                      <button onClick={() => respondSettlement('reject')}
                        style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: '#FEF2F2', color: '#DC2626', fontWeight: 700, fontSize: 12, border: '1px solid #FECACA', cursor: 'pointer' }}>
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <textarea className="input-field" rows={3} placeholder="Propose terms of settlement..." value={settlementTerms}
                    onChange={e => setSettlementTerms(e.target.value)} style={{ resize: 'none', marginBottom: 8 }} />
                  <input className="input-field" type="number" placeholder="Settlement amount (₦) — optional" value={settlementAmount}
                    onChange={e => setSettlementAmount(e.target.value)} style={{ marginBottom: 10 }} />
                  <button onClick={proposeSettlement} disabled={!settlementTerms.trim() || submittingSettlement}
                    style={{ width: '100%', padding: '10px 0', borderRadius: 12, fontWeight: 700, fontSize: 13,
                      background: settlementTerms.trim() ? 'linear-gradient(135deg,#7C3AED,#5B21B6)' : '#E2E8F0',
                      color: settlementTerms.trim() ? '#fff' : '#94A3B8', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <TrendingUp size={14} /> Propose Settlement
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Appeal */}
          {(isPlaintiff || isDefendant) && c.status === 'verdict_delivered' && !c.appeal?.filed && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#92400E', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <RotateCcw size={15} color="#D97706" /> File an Appeal
              </div>
              <div style={{ fontSize: 12, color: '#B45309', marginBottom: 12 }}>Disagree with Judge Orizu's verdict? File an appeal with new grounds.</div>
              <textarea className="input-field" rows={3} placeholder="State your grounds for appeal..." value={appealReason}
                onChange={e => setAppealReason(e.target.value)} style={{ resize: 'none', marginBottom: 10 }} />
              <button onClick={fileAppeal} disabled={!appealReason.trim() || submittingAppeal}
                style={{ width: '100%', padding: '10px 0', borderRadius: 12, fontWeight: 700, fontSize: 13,
                  background: appealReason.trim() ? 'linear-gradient(135deg,#D97706,#B45309)' : '#E2E8F0',
                  color: appealReason.trim() ? '#fff' : '#94A3B8', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <RotateCcw size={14} /> File Appeal with Judge Orizu
              </button>
            </div>
          )}
          {c.appeal?.filed && (
            <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#92400E', marginBottom: 4 }}>Appeal Status: {c.appeal.status?.toUpperCase()}</div>
              <div style={{ fontSize: 12, color: '#B45309' }}>{c.appeal.reason}</div>
            </div>
          )}

        </div>
      )}

      {/* ── Jury tab ── */}
      {activeTab === 'jury' && (
        <div>
          {c.jury?.tally && (c.jury.tally.guilty > 0 || c.jury.tally.notGuilty > 0) && (
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Jury Tally</div>
              <div style={{ display: 'flex', gap: 16 }}>
                {[
                  { label: 'Guilty', val: c.jury.tally.guilty, color: '#DC2626' },
                  { label: 'Not Guilty', val: c.jury.tally.notGuilty, color: '#059669' },
                  { label: 'Abstain', val: c.jury.tally.abstain, color: '#64748B' },
                ].map(t => (
                  <div key={t.label} style={{ flex: 1, textAlign: 'center', padding: '12px 0', background: t.color + '10', borderRadius: 10, border: `1px solid ${t.color}25` }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: t.color }}>{t.val}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: t.color, textTransform: 'uppercase', marginTop: 2 }}>{t.label}</div>
                  </div>
                ))}
              </div>
              {c.jury.verdict !== 'none' && (
                <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: '#0F172A', color: '#F1F5F9', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
                  Jury Recommendation: {c.jury.verdict.toUpperCase().replace('_', ' ')}
                </div>
              )}
            </div>
          )}
          {c.jury?.members?.length === 0 || !c.jury?.members
            ? <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px 0', fontSize: 13 }}>Jury not yet summoned. The court will auto-select jurors when the case opens.</div>
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {c.jury.members.map((m, i) => {
                  const vote = c.jury?.votes?.find(v => v.userId === (m._id || m) || v.userId?._id === (m._id || m));
                  const verdictShown = c.status === 'verdict_delivered' || c.status === 'closed' || c.status === 'settled';
                  return (
                    <div key={i} style={{ background: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                      <Avatar initials={`J${i + 1}`} color="#7C3AED" size={36} />
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', marginTop: 8 }}>{m.name || `Juror ${i + 1}`}</div>
                      {vote && verdictShown
                        ? <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, marginTop: 4, display: 'inline-block',
                            background: vote.vote === 'guilty' ? '#FEF2F2' : vote.vote === 'not_guilty' ? '#ECFDF5' : '#F1F5F9',
                            color: vote.vote === 'guilty' ? '#DC2626' : vote.vote === 'not_guilty' ? '#059669' : '#64748B',
                          }}>{vote.vote.replace('_', ' ').toUpperCase()}</span>
                        : <span style={{ fontSize: 10, color: vote ? '#059669' : '#94A3B8', display: 'block', marginTop: 4 }}>{vote ? 'Voted' : 'Pending'}</span>}
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      )}
    </div>
  );
}

// ── Main Courtroom page ──────────────────────────────────────────────────────

export default function Courtroom() {
  const { user } = useAuth();
  const isManager = user?.role === 'estate_manager' || user?.role === 'super_admin';

  const [tab, setTab]           = useState('active');
  const [cases, setCases]       = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [residents, setResidents] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  const loadCases = async (statusFilter) => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter === 'active') params.status = 'open,in_hearing,jury_deliberation,judge_deliberation,filed';
      else if (statusFilter === 'mine') params.mine = true;
      else if (statusFilter === 'records') params.status = 'verdict_delivered,settled,closed';
      const res = await courtAPI.listCases(params);
      setCases(res.data.data || []);
    } catch {
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await courtAPI.getStats();
      setStats(res.data.data);
    } catch { /* optional */ }
  };

  const loadResidents = async () => {
    try {
      const res = await courtAPI.getMembers();
      setResidents((res.data.data || []).map(r => ({
        _id: r._id,
        name: r.name,
        unit: r.unitId ? `${r.unitId.block ? r.unitId.block + ' ' : ''}${r.unitId.unitNumber}` : null,
      })));
    } catch { setResidents([]); }
  };

  useEffect(() => {
    loadStats();
    loadResidents();
  }, []);

  useEffect(() => {
    if (tab !== 'file' && !selectedCaseId) loadCases(tab);
  }, [tab, selectedCaseId]);

  if (selectedCaseId) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <CaseDetail caseId={selectedCaseId} onBack={() => { setSelectedCaseId(null); loadCases(tab); }} user={user} isManager={isManager} />
      </div>
    );
  }

  const TABS = [
    { id: 'active',  label: 'Active Cases' },
    { id: 'file',    label: '+ File a Dispute' },
    { id: 'mine',    label: 'My Cases' },
    { id: 'records', label: 'Hall of Records' },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <CourtroomBanner stats={stats} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F8FAFC', borderRadius: 14, padding: 4, border: '1px solid #E2E8F0' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              background: tab === t.id ? (t.id === 'file' ? 'linear-gradient(135deg,#DC2626,#B91C1C)' : '#fff') : 'transparent',
              color: tab === t.id ? (t.id === 'file' ? '#fff' : '#0F172A') : '#64748B',
              boxShadow: tab === t.id && t.id !== 'file' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* File dispute */}
      {tab === 'file' && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '24px 24px' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>File a Dispute</div>
            <div style={{ fontSize: 13, color: '#64748B' }}>
              Bring your case before the AreaConnect Court of Justice. Filing automatically opens the case — AI lawyers will be assigned and the jury will be selected immediately.
            </div>
          </div>
          <FileDisputeForm onFiled={() => { setTab('mine'); loadCases('mine'); }} residents={residents} />
        </div>
      )}

      {/* Case lists */}
      {tab !== 'file' && (
        <div>
          {tab === 'records' && (
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
              <Lock size={14} color="#64748B" />
              <span style={{ fontSize: 12, color: '#64748B' }}>
                Hall of Records — all closed, settled, and decided cases. Case records are permanent.
              </span>
            </div>
          )}
          {loading
            ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
                <svg className="animate-spin" width={28} height={28} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#10B981" strokeWidth="2.5" strokeOpacity=".2"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
            )
            : cases.length === 0
              ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <div style={{ background: '#F1F5F9', borderRadius: '50%', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Scale size={28} color="#94A3B8" />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#0F172A', marginBottom: 6 }}>
                    {tab === 'active' ? 'No Active Cases' : tab === 'mine' ? 'You Have No Cases' : 'No Records Found'}
                  </div>
                  <div style={{ fontSize: 13, color: '#94A3B8', maxWidth: 300, margin: '0 auto' }}>
                    {tab === 'active'
                      ? 'The court is in recess. No disputes are currently active in your estate.'
                      : tab === 'mine'
                        ? 'You have not filed or been named in any cases yet.'
                        : 'No closed or settled cases on record yet.'}
                  </div>
                  {tab === 'mine' && (
                    <button onClick={() => setTab('file')}
                      style={{ marginTop: 16, padding: '10px 24px', borderRadius: 12, background: 'linear-gradient(135deg,#DC2626,#B91C1C)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Plus size={14} /> File a Dispute
                    </button>
                  )}
                </div>
              )
              : cases.map(c => <CaseCard key={c._id} c={c} onClick={() => setSelectedCaseId(c._id)} />)
          }
        </div>
      )}

      {/* Educational footer */}
      <div style={{ marginTop: 32, background: '#0F172A', borderRadius: 16, padding: '20px 24px', border: '1px solid #1E293B' }}>
        <div style={{ color: '#F59E0B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Court Guide</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { icon: FileText, title: 'File a Case', desc: 'Any resident can file a dispute. The case opens instantly with AI lawyers auto-assigned.' },
            { icon: Briefcase, title: 'AI Lawyers', desc: 'Auto-assigned on filing. Chat privately with your counsel. Optionally switch via Change Counsel.' },
            { icon: Users, title: 'Jury System', desc: '5 randomly selected residents are auto-selected when the case opens.' },
            { icon: Gavel, title: 'Judge Orizu', desc: 'AI-powered judge delivers final verdicts based on all evidence and jury input.' },
            { icon: Clock, title: 'Response Deadlines', desc: 'Defendants must respond in time. Failure triggers a default judgment warning.' },
            { icon: Banknote, title: 'Fines & Payments', desc: 'Fines are deducted from your wallet. Pay within 7 days to avoid escalation.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{ display: 'flex', gap: 10 }}>
              <div style={{ background: '#1E293B', borderRadius: 8, padding: '6px', flexShrink: 0, height: 'fit-content' }}>
                <Icon size={14} color="#10B981" />
              </div>
              <div>
                <div style={{ color: '#F1F5F9', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{title}</div>
                <div style={{ color: '#64748B', fontSize: 11, lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
