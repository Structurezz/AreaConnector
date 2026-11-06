import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, AlertCircle, Shield, ArrowRight, Smartphone } from 'lucide-react';
import { MobileAuthShell, DesktopAuthShell } from '../components/auth/AuthShell';
import toast from 'react-hot-toast';


function MobileLogin({ form, setForm, showPw, setShowPw, loading, error, handleSubmit }) {
  return (
    <MobileAuthShell>
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
    </MobileAuthShell>
  );
}

function DesktopLogin({ form, setForm, showPw, setShowPw, loading, error, handleSubmit }) {
  return (
    <DesktopAuthShell
      topRight={<>New to AreaConnect?&nbsp;<Link to="/register" className="font-semibold text-[#059669] hover:text-[#047857]">Start free trial</Link></>}>
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
    </DesktopAuthShell>
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
