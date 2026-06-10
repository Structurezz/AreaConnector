import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, AlertCircle, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from '../components/auth/AuthLayout';

const DEMO = { label: 'Estate Manager', email: 'manager@estate-demo.com', password: 'Manager@123' };

const PILLS = ['Auto Gate Control', '24/7 Monitoring', 'Resident Portal', 'Smart Payments'];

export default function Login() {
  const [form, setForm]     = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
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

  return (
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
            <div className="text-xs font-semibold uppercase tracking-widest mt-0.5"
              style={{ color: '#94A3B8' }}>
              Admin Portal
            </div>
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-1.5 tracking-tight" style={{ color: '#0F172A' }}>Welcome back</h1>
        <p className="text-sm" style={{ color: '#475569' }}>Sign in to manage your estate</p>
      </div>

      {/* Demo quick-fill */}
      <div className="mb-6 rounded-xl p-3.5"
        style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2.5"
          style={{ color: '#94A3B8' }}>Demo Account</p>
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
          <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
            style={{ color: '#64748B' }}>Email Address</label>
          <input type="email" className="input-field" placeholder="you@example.com"
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            required autoComplete="email"/>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
            style={{ color: '#64748B' }}>Password</label>
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
            color: 'white',
            boxShadow: loading ? 'none' : '0 4px 14px rgba(16,185,129,0.25)',
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
    </AuthLayout>
  );
}
