import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, AlertCircle, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from '../components/auth/AuthLayout';

const DEMO = { label: 'Estate Manager', email: 'manager@estate-demo.com', password: 'Manager@123' };
const PILLS = ['Auto Gate Control', '24/7 Monitoring', 'Resident Portal', 'Smart Payments'];

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

        {/* Demo chip */}
        <button
          onClick={() => setForm({ email: DEMO.email, password: DEMO.password })}
          style={{
            width: '100%', textAlign: 'left', padding: '11px 14px', borderRadius: 12,
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
            cursor: 'pointer', marginBottom: 22,
          }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: '#10B981', textTransform: 'uppercase', marginBottom: 3 }}>
            Try Demo Account
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{DEMO.email}</div>
        </button>

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
        <AuthLayout
          caption={<>Where every gate opens<br/><span style={{ color: '#10B981' }}>with intelligence.</span></>}
          sub="Premium estate management — automated access, real-time monitoring, and community control."
          pills={PILLS}>

          {/* Logo */}
          <div className="mb-9">
            <div className="flex items-center gap-3.5 mb-7">
              <div style={{
                width: 54, height: 54, borderRadius: 15,
                background: 'linear-gradient(135deg,#10B981,#059669)',
                boxShadow: '0 0 24px rgba(16,185,129,0.25), 0 4px 12px rgba(0,0,0,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Shield size={26} color="white"/>
              </div>
              <div>
                <div className="text-xl font-bold leading-tight tracking-tight" style={{ color: '#0F172A' }}>
                  Area<span style={{ color: '#10B981' }}>Connect</span>
                </div>
                <div className="text-xs font-semibold uppercase tracking-widest mt-0.5" style={{ color: '#94A3B8' }}>
                  Admin Portal
                </div>
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-1.5 tracking-tight" style={{ color: '#0F172A' }}>Welcome back</h1>
            <p className="text-sm" style={{ color: '#475569' }}>Sign in to manage your estate</p>
          </div>

          {/* Demo quick-fill */}
          <div className="mb-6 rounded-xl p-3.5" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2.5" style={{ color: '#94A3B8' }}>Demo Account</p>
            <button
              onClick={() => { setForm({ email: DEMO.email, password: DEMO.password }); setError(''); }}
              className="w-full text-left px-3 py-2.5 rounded-lg transition-all"
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}
              onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)'}
              onMouseOut={e  => e.currentTarget.style.borderColor = '#E2E8F0'}>
              <div className="text-xs font-semibold" style={{ color: '#0F172A' }}>{DEMO.label}</div>
              <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{DEMO.email}</div>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-xl p-3 text-sm"
                style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
                <AlertCircle size={15} className="shrink-0"/> {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#64748B' }}>Email Address</label>
              <input type="email" className="input-field" placeholder="you@example.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                required autoComplete="email"/>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#64748B' }}>Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className="input-field pr-11"
                  placeholder="••••••••" value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required autoComplete="current-password"/>
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#94A3B8' }}
                  onMouseOver={e => e.currentTarget.style.color = '#475569'}
                  onMouseOut={e  => e.currentTarget.style.color = '#94A3B8'}>
                  {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all mt-2"
              style={{
                background: loading ? 'rgba(16,185,129,0.5)' : 'linear-gradient(135deg,#10B981,#059669)',
                color: 'white', boxShadow: loading ? 'none' : '0 4px 14px rgba(16,185,129,0.25)',
              }}>
              {loading ? (
                <>
                  <svg className="animate-spin" width={15} height={15} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity=".3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Signing in…
                </>
              ) : 'Sign In'}
            </button>
            <p className="text-center text-sm pt-1" style={{ color: '#94A3B8' }}>
              Don't have an account?{' '}
              <Link to="/register" className="font-medium transition-colors" style={{ color: '#10B981' }}
                onMouseOver={e => e.currentTarget.style.color = '#059669'}
                onMouseOut={e  => e.currentTarget.style.color = '#10B981'}>
                Create one
              </Link>
            </p>
          </form>

          <p className="text-center text-xs mt-10" style={{ color: '#CBD5E1' }}>
            © 2025 AreaConnect · Secure Estate Management
          </p>
          <p className="text-[11px] text-slate-400 text-center mt-2 tracking-wide">
            Powered by <span className="font-semibold text-slate-500">AREA CONNECTOR TECHNOLOGIES</span> · RC&nbsp;9607864
          </p>
        </AuthLayout>
      </div>
    </>
  );
}
