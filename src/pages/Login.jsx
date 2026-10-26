import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, AlertCircle, Shield, Lock, ArrowRight, DoorOpen, Wallet, Bell, ShieldCheck, Megaphone, UserCheck, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';


const MOBILE_CSS = `
  @keyframes mgOrb1 {
    0%,100% { transform: translate(0,0) scale(1); }
    35% { transform: translate(30px,-42px) scale(1.09); }
    68% { transform: translate(-20px,28px) scale(0.93); }
  }
  @keyframes mgOrb2 {
    0%,100% { transform: translate(0,0) scale(1); }
    40% { transform: translate(-34px,22px) scale(1.06); }
    72% { transform: translate(24px,-26px) scale(0.95); }
  }
  @keyframes mgPulse {
    0% { transform: scale(1); opacity: 0.55; }
    100% { transform: scale(2.6); opacity: 0; }
  }
  @keyframes mgCardIn {
    0% { opacity: 0; transform: translateY(36px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes mgHeroIn {
    0% { opacity: 0; transform: scale(0.92) translateY(-10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes mgScan {
    0% { top: -2px; opacity: 0.07; }
    100% { top: 101%; opacity: 0.01; }
  }
  @keyframes mgGlow {
    0%,100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  .mg-input {
    width: 100%; padding: 13px 16px; border-radius: 12px;
    background: rgba(255,255,255,0.07); border: 1.5px solid rgba(255,255,255,0.11);
    color: #fff; font-size: 14px; outline: none; box-sizing: border-box;
    transition: border-color 0.2s;
  }
  .mg-input:focus { border-color: rgba(16,185,129,0.5); }
  .mg-input::placeholder { color: rgba(255,255,255,0.3); }
`;

function MobileLogin({ form, setForm, showPw, setShowPw, loading, error, handleSubmit }) {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#040C16 0%,#071A10 100%)', position: 'relative', overflow: 'hidden' }}>
      <style>{MOBILE_CSS}</style>

      {/* Orb 1 — top right */}
      <div style={{
        position: 'fixed', top: -100, right: -80, width: 380, height: 380,
        borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(16,185,129,0.22) 0%, transparent 65%)',
        animation: 'mgOrb1 10s ease-in-out infinite',
      }}/>
      {/* Orb 2 — bottom left */}
      <div style={{
        position: 'fixed', bottom: -120, left: -100, width: 340, height: 340,
        borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(5,150,105,0.16) 0%, transparent 65%)',
        animation: 'mgOrb2 13s 2s ease-in-out infinite',
      }}/>
      {/* Scan line */}
      <div style={{
        position: 'fixed', left: 0, right: 0, height: 1, pointerEvents: 'none',
        background: 'linear-gradient(to right, transparent, rgba(16,185,129,0.35), transparent)',
        animation: 'mgScan 9s linear infinite',
      }}/>

      {/* ── Hero ── */}
      <div style={{
        textAlign: 'center', padding: '64px 24px 36px',
        position: 'relative', zIndex: 1,
        animation: 'mgHeroIn 0.8s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        {/* Icon + pulse rings */}
        <div style={{ position: 'relative', display: 'inline-flex', marginBottom: 22 }}>
          <div style={{
            position: 'absolute', inset: -18, borderRadius: '50%',
            border: '1.5px solid rgba(16,185,129,0.45)',
            animation: 'mgPulse 2.6s ease-out infinite',
          }}/>
          <div style={{
            position: 'absolute', inset: -9, borderRadius: '50%',
            border: '1.5px solid rgba(16,185,129,0.3)',
            animation: 'mgPulse 2.6s 0.7s ease-out infinite',
          }}/>
          <div style={{
            width: 76, height: 76, borderRadius: 22,
            background: 'linear-gradient(135deg,#10B981,#059669)',
            boxShadow: '0 0 56px rgba(16,185,129,0.55), 0 12px 40px rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'mgGlow 3s ease-in-out infinite',
          }}>
            <Shield size={36} color="white"/>
          </div>
        </div>

        <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.045em', color: '#fff', marginBottom: 4 }}>
          Area<span style={{ color: '#10B981' }}>Connect</span>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 24 }}>
          Admin Portal
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 7 }}>
          {['Gate Control', 'Visitors', 'Payments', '24/7 Monitor'].map(f => (
            <span key={f} style={{
              fontSize: 11, fontWeight: 600, padding: '5px 13px', borderRadius: 99,
              background: 'rgba(16,185,129,0.1)', color: '#6EE7B7',
              border: '1px solid rgba(16,185,129,0.22)',
            }}>{f}</span>
          ))}
        </div>
      </div>

      {/* Separator */}
      <div style={{
        margin: '0 20px 0',
        height: 1, background: 'linear-gradient(to right, transparent, rgba(16,185,129,0.18), transparent)',
      }}/>

      {/* ── Form card ── */}
      <div style={{
        margin: '0 12px', padding: '28px 24px 36px',
        borderRadius: '28px 28px 0 0',
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderBottom: 'none',
        animation: 'mgCardIn 0.7s 0.2s cubic-bezier(0.22,1,0.36,1) both',
        position: 'relative', zIndex: 1,
      }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 2 }}>Welcome back</h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 22 }}>Sign in to manage your estate</p>

        {/* Error */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, marginBottom: 16,
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5', fontSize: 13,
          }}>
            <AlertCircle size={14}/> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 8 }}>
              Email Address
            </label>
            <input type="email" className="mg-input" placeholder="you@example.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              required autoComplete="email"/>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 8 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} className="mg-input" placeholder="••••••••"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                required autoComplete="current-password" style={{ paddingRight: 44 }}/>
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}>
                {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '15px', borderRadius: 14, border: 'none',
            background: loading ? 'rgba(16,185,129,0.4)' : 'linear-gradient(135deg,#10B981,#059669)',
            color: '#fff', fontWeight: 700, fontSize: 15,
            boxShadow: loading ? 'none' : '0 6px 24px rgba(16,185,129,0.35)',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {loading ? (
              <>
                <svg className="animate-spin" width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity=".3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Signing in…
              </>
            ) : 'Sign In'}
          </button>

          <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#10B981', fontWeight: 600 }}>Create one</Link>
          </p>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em' }}>
          Powered by <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>AREA CONNECTOR TECHNOLOGIES</span> · RC&nbsp;9607864
        </p>
      </div>
    </div>
  );
}

/* ── Desktop: split screen with a live product preview ── */
const FEED = [
  { icon: UserCheck,  tone: '#10B981', title: 'Visitor checked in',     sub: 'Ada Obi → Flat 4B · Gate A' },
  { icon: Wallet,     tone: '#2E90FA', title: 'Service charge paid',    sub: 'Flat 12 · ₦25,000 via Paystack' },
  { icon: ShieldCheck,tone: '#7A5AF8', title: 'Patrol started',         sub: 'Guard Musa · North perimeter' },
  { icon: Megaphone,  tone: '#F79009', title: 'Announcement delivered', sub: 'Water maintenance · 86 residents' },
  { icon: DoorOpen,   tone: '#10B981', title: 'Delivery cleared',       sub: 'Jumia rider → Flat 7 · Gate B' },
  { icon: Bell,       tone: '#F04438', title: 'Alert resolved',         sub: 'Noise complaint · Block C' },
];

const DESKTOP_CSS = `
  @keyframes dlFeedIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: none; } }
  @keyframes dlFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  @keyframes dlPing { 0% { transform: scale(1); opacity: .7; } 100% { transform: scale(2.4); opacity: 0; } }
  @keyframes dlRise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
  .dl-input { width: 100%; height: 44px; padding: 0 14px; border-radius: 10px; border: 1px solid #D0D5DD; background: #fff;
    font-size: 14px; color: #101828; outline: none; transition: border-color .15s, box-shadow .15s; box-shadow: 0 1px 2px rgba(16,24,40,.05); }
  .dl-input:focus { border-color: #10B981; box-shadow: 0 0 0 4px rgba(16,185,129,.12); }
  .dl-input::placeholder { color: #98A2B3; }
`;

function useTicker(n, ms) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % n), ms); return () => clearInterval(t); }, [n, ms]);
  return i;
}

function useCount(to, ms = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf; const t0 = performance.now();
    const tick = (now) => { const p = Math.min((now - t0) / ms, 1); setV(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return v;
}

function ProductPreview() {
  const tick = useTicker(FEED.length, 2600);
  const visitors = useCount(24) + Math.floor(tick / 2);
  const dues = useCount(1240000);
  const rows = [0, 1, 2].map((k) => FEED[(tick - k + FEED.length * 4) % FEED.length]);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <div style={{ animation: 'dlFloat 7s ease-in-out infinite' }}
      className="w-full max-w-[460px] rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,.6)] overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 h-9 border-b border-white/[0.07]">
        {['#F97066', '#FDB022', '#32D583'].map((c) => <span key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: .8 }} />)}
        <span className="ml-3 text-[11px] text-white/35">area-connector.areaconnect.pro</span>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-white/45">{greet}</p>
            <p className="text-[15px] font-semibold text-white" style={{ color: '#fff' }}>Greenfield Estate</p>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] text-emerald-300">
            <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-emerald-400" style={{ animation: 'dlPing 1.6s ease-out infinite' }} /><span className="relative w-2 h-2 rounded-full bg-emerald-400" /></span>
            Live
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {[
            ['Visitors today', visitors, '#34D399'],
            ['Dues this month', `₦${(dues / 1e6).toFixed(2)}m`, '#60A5FA'],
            ['Open alerts', 0, '#FBBF24'],
          ].map(([l, v, c]) => (
            <div key={l} className="rounded-xl bg-white/[0.05] border border-white/[0.07] px-3 py-2.5">
              <p className="text-[10.5px] text-white/45">{l}</p>
              <p className="mt-0.5 text-[18px] font-semibold tabular-nums" style={{ color: c }}>{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-end gap-[5px] h-10">
          {[38, 52, 45, 70, 58, 82, 64, 90, 76, 60, 84, 96].map((h, k) => (
            <span key={k} className="flex-1 rounded-t-[3px]" style={{ height: `${h}%`, background: k === 11 ? '#10B981' : 'rgba(16,185,129,.28)' }} />
          ))}
        </div>
        <p className="mt-4 mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/35">Live activity</p>
        <div className="space-y-1.5">
          {rows.map((r, k) => (
            <div key={`${tick}-${k}`} className="flex items-center gap-3 rounded-lg px-2.5 py-2"
              style={{ background: k === 0 ? 'rgba(255,255,255,.06)' : 'transparent', opacity: 1 - k * 0.2, animation: k === 0 ? 'dlFeedIn .5s cubic-bezier(.22,1,.36,1)' : undefined }}>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${r.tone}22`, color: r.tone }}><r.icon size={14} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-medium text-white/90 truncate">{r.title}</span>
                <span className="block text-[11px] text-white/45 truncate">{r.sub}</span>
              </span>
              <span className="text-[10.5px] text-white/30">{k === 0 ? 'now' : `${k * 3}m`}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DesktopLogin({ form, setForm, showPw, setShowPw, loading, error, handleSubmit }) {
  return (
    <div className="h-screen min-h-[640px] grid grid-cols-[1.1fr_1fr] bg-white overflow-hidden">
      <style>{DESKTOP_CSS}</style>

      {/* Showcase */}
      <aside className="relative overflow-hidden flex flex-col px-14 py-10 text-white h-full"
        style={{ background: 'radial-gradient(90% 70% at 85% 10%, rgba(16,185,129,.28) 0%, transparent 60%), radial-gradient(70% 60% at 0% 100%, rgba(5,150,105,.18) 0%, transparent 60%), #07111F' }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '44px 44px', maskImage: 'radial-gradient(circle at 60% 40%, #000 0%, transparent 75%)' }} />

        <div className="relative flex items-center gap-3">
          <img src="/icon-192.png" alt="" className="w-10 h-10 rounded-xl" />
          <div className="leading-tight">
            <div className="text-[17px] font-bold tracking-tight" style={{ color: '#fff' }}>Area<span style={{ color: '#34D399' }}>Connect</span></div>
            <div className="text-[11px] text-white/45">Estate manager portal</div>
          </div>
        </div>

        <div className="relative flex-1 min-h-0 flex flex-col justify-center py-6" style={{ animation: 'dlRise .8s cubic-bezier(.22,1,.36,1) both' }}>
          <h2 className="text-[34px] leading-[1.12] font-semibold tracking-tight max-w-[480px]" style={{ color: '#fff' }}>
            Your whole estate, <span style={{ color: '#34D399' }}>calm and in view.</span>
          </h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-white/60 max-w-[440px]">
            Gate access, dues, guards and residents — in one dashboard that updates the moment something happens.
          </p>
          <div className="mt-7"><ProductPreview /></div>
        </div>

        <div className="relative flex items-center justify-between gap-6 text-[12px] text-white/45">
          <div className="flex gap-8">
            {[['24/7', 'gate monitoring'], ['Paystack', 'secure dues'], ['3 apps', 'manager · residents · guards']].map(([a, b]) => (
              <div key={a}><p className="text-[15px] font-semibold text-white/90">{a}</p><p>{b}</p></div>
            ))}
          </div>
        </div>
      </aside>

      {/* Form */}
      <main className="flex flex-col px-10 py-8 h-full overflow-y-auto">
        <div className="flex justify-end text-[13px] text-[#475467]">
          New to AreaConnect?&nbsp;<Link to="/register" className="font-semibold text-[#059669] hover:text-[#047857]">Start free trial</Link>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[380px]" style={{ animation: 'dlRise .6s .1s cubic-bezier(.22,1,.36,1) both' }}>
            <span className="w-12 h-12 rounded-xl bg-[#ECFDF3] border border-[#ABEFC6] flex items-center justify-center text-[#059669]"><Shield size={22} /></span>
            <h1 className="mt-6 text-[28px] font-semibold tracking-tight" style={{ color: '#101828' }}>Welcome back</h1>
            <p className="mt-1.5 text-[14.5px] text-[#475467]">Sign in to manage your estate.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {error && (
                <div className="flex items-start gap-2 rounded-lg px-3.5 py-3 text-[13px] bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318]">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
                </div>
              )}
              <div>
                <label className="block text-[13px] font-medium text-[#344054] mb-1.5">Email</label>
                <input type="email" className="dl-input" placeholder="you@estate.com" autoFocus
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#344054] mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} className="dl-input" style={{ paddingRight: 44 }} placeholder="Enter your password"
                    value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#98A2B3] hover:text-[#475467]">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full h-11 rounded-[10px] text-[14.5px] font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                style={{ background: '#059669', boxShadow: '0 1px 2px rgba(16,24,40,.05), inset 0 -2px 0 rgba(0,0,0,.08)' }}
                onMouseOver={(e) => { if (!loading) e.currentTarget.style.background = '#047857'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#059669'; }}>
                {loading ? (
                  <>
                    <svg className="animate-spin" width={15} height={15} viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity=".3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Signing in…
                  </>
                ) : <>Sign in <ArrowRight size={16} /></>}
              </button>
            </form>

            <div className="mt-8 rounded-xl border border-[#EAECF0] bg-[#F9FAFB] px-4 py-3.5 flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-white border border-[#EAECF0] flex items-center justify-center text-[#475467]"><Smartphone size={16} /></span>
              <div className="text-[12.5px] leading-snug">
                <p className="font-medium text-[#101828]">Are you a resident?</p>
                <p className="text-[#667085]">Sign in on <a href="https://area-mates.areaconnect.pro" className="font-medium text-[#059669] hover:underline">AreaMates</a> instead.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11.5px] text-[#98A2B3]">
          <span className="flex items-center gap-1.5"><Lock size={12} /> Encrypted connection</span>
          <span>Powered by <span className="font-semibold text-[#667085]">AREA CONNECTOR TECHNOLOGIES</span> · RC&nbsp;9607864</span>
        </div>
      </main>
    </div>
  );
}

export default function Login() {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user?.name?.split(' ')[0] || 'User'}!`);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const shared = { form, setForm, showPw, setShowPw, loading, error, handleSubmit };

  return (
    <>
      {/* ── Mobile ── */}
      <div className="lg:hidden">
        <MobileLogin {...shared}/>
      </div>

      {/* ── Desktop ── */}
      <div className="hidden lg:block">
        <DesktopLogin {...shared}/>
      </div>
    </>
  );
}
