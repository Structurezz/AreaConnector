import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const AD_SLIDES = [
  {
    tag: 'What is AreaMates?',
    headline: 'Your Estate, Your Community',
    body: 'AreaMates is the resident app that keeps you connected to your estate. Pre-register visitors, pay levies, chat with neighbours, and get instant security alerts — all from your phone.',
    points: ['Visitor Pre-registration & QR Passes', 'Online Levy & Service Payments', 'Neighbourhood Chat', 'Real-time Security Alerts'],
    accent: '#6366F1',
    num: '01',
  },
  {
    tag: 'Convenience at Your Fingertips',
    headline: 'Never Miss a Beat',
    body: 'From estate announcements to community polls and local marketplace listings — AreaMates puts everything you need to stay informed and engaged right in your pocket.',
    points: ['Estate Announcements & Notices', 'Community Polls & Voting', 'Local Marketplace', 'Event Board & RSVPs'],
    accent: '#818CF8',
    num: '02',
  },
  {
    tag: 'Safe & Connected',
    headline: 'Peace of Mind, Always',
    body: 'Share guest QR passes via WhatsApp, track entry logs, and receive push alerts for gate events — AreaMates keeps your home safe and your community tight-knit.',
    points: ['QR-code Gate Passes via WhatsApp', 'Visitor Entry & Exit Logs', 'Emergency Alert Broadcasting', 'Works with AreaConnect Manager'],
    accent: '#A78BFA',
    num: '03',
  },
];

function AdSidebar() {
  const [idx, setIdx] = useState(0);
  const [out, setOut] = useState(false);

  const go = (i) => { setOut(true); setTimeout(() => { setIdx(i); setOut(false); }, 280); };

  useEffect(() => {
    const t = setInterval(() => go((idx + 1) % AD_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, [idx]);

  const s = AD_SLIDES[idx];

  return (
    <div className="hidden lg:flex" style={{
      width: 320, flexShrink: 0,
      background: 'linear-gradient(180deg,#060E1A 0%,#0B1626 100%)',
      flexDirection: 'column', padding: '40px 32px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
        width: 260, height: 260, borderRadius: '50%', pointerEvents: 'none',
        background: `radial-gradient(circle, ${s.accent}20 0%, transparent 70%)`,
        transition: 'background 0.5s',
      }}/>
      <div style={{
        position: 'absolute', bottom: -60, right: -40, pointerEvents: 'none',
        width: 200, height: 200, borderRadius: '50%',
        background: `radial-gradient(circle, ${s.accent}12 0%, transparent 70%)`,
        transition: 'background 0.5s',
      }}/>

      {/* Brand top */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 9,
          background: 'linear-gradient(135deg,#6366F1,#4F46E5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 40 40" fill="none">
            <path d="M20 10L11 15.5v11L20 32l9-5.5v-11L20 10z" fill="rgba(255,255,255,0.2)"/>
            <text x="20" y="25" textAnchor="middle" fill="white" fontSize="12" fontWeight="800" fontFamily="system-ui">AM</text>
          </svg>
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.7)', letterSpacing: '-0.02em' }}>
          Area<span style={{ color: '#6366F1' }}>Mates</span>
        </span>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.15)', marginBottom: 0, position: 'relative', zIndex: 1 }}>
        {s.num} <span style={{ color: 'rgba(255,255,255,0.08)' }}>/ 03</span>
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        paddingTop: 16, paddingBottom: 16, position: 'relative', zIndex: 1,
        opacity: out ? 0 : 1, transform: out ? 'translateY(10px)' : 'translateY(0)',
        transition: 'opacity 0.28s, transform 0.28s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
          <span style={{ width: 20, height: 2, borderRadius: 99, background: s.accent }}/>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: s.accent, textTransform: 'uppercase' }}>{s.tag}</span>
        </div>

        <h3 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.22, letterSpacing: '-0.03em', color: '#fff', marginBottom: 10 }}>
          {s.headline}
        </h3>

        <div style={{ width: 28, height: 3, borderRadius: 99, background: `linear-gradient(90deg,${s.accent},transparent)`, marginBottom: 14 }}/>

        <p style={{ fontSize: 12, lineHeight: 1.7, color: 'rgba(255,255,255,0.42)', marginBottom: 20 }}>{s.body}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {s.points.map(pt => (
            <div key={pt} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
              <CheckCircle size={12} color={s.accent} style={{ flexShrink: 0, marginTop: 2 }}/>
              <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{pt}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, paddingBottom: 16, position: 'relative', zIndex: 1 }}>
        {AD_SLIDES.map((_, i) => (
          <button key={i} onClick={() => go(i)} style={{
            width: i === idx ? 22 : 6, height: 6, borderRadius: 99, border: 'none', cursor: 'pointer', padding: 0,
            background: i === idx ? s.accent : 'rgba(255,255,255,0.15)',
            transition: 'all 0.35s',
          }}/>
        ))}
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14, position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.55)' }}>
          Area<span style={{ color: '#10B981' }}>Connect</span>
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 3 }}>Smart Estate Technology</div>
      </div>
    </div>
  );
}

function MobileBanner() {
  const [idx, setIdx] = useState(0);
  const [out, setOut] = useState(false);

  const go = (i) => { setOut(true); setTimeout(() => { setIdx(i); setOut(false); }, 260); };

  useEffect(() => {
    const t = setInterval(() => go((idx + 1) % AD_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, [idx]);

  const s = AD_SLIDES[idx];

  return (
    <div className="lg:hidden" style={{ marginBottom: 20 }}>
      <div style={{
        borderRadius: 16, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg,#060E1A 0%,#0D1B2E 100%)',
        border: `1px solid ${s.accent}28`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.18), 0 0 0 1px ${s.accent}10`,
        padding: '16px 18px',
        transition: 'border-color 0.5s, box-shadow 0.5s',
      }}>
        <div style={{
          position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%', pointerEvents: 'none',
          background: `radial-gradient(circle, ${s.accent}22 0%, transparent 70%)`,
          transition: 'background 0.5s',
        }}/>
        <div style={{
          opacity: out ? 0 : 1, transform: out ? 'translateX(8px)' : 'translateX(0)',
          transition: 'opacity 0.26s, transform 0.26s', position: 'relative', zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 14, height: 2, borderRadius: 99, background: s.accent }}/>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: s.accent, textTransform: 'uppercase' }}>{s.tag}</span>
            </div>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>{s.num}/03</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 4 }}>{s.headline}</div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.55, marginBottom: 10 }}>{s.body.slice(0, 110)}…</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {s.points.slice(0, 3).map(pt => (
              <span key={pt} style={{
                fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 99,
                background: `${s.accent}15`, color: s.accent, border: `1px solid ${s.accent}25`,
              }}>{pt}</span>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 12, position: 'relative', zIndex: 1, display: 'flex', gap: 4 }}>
          {AD_SLIDES.map((_, i) => (
            <button key={i} onClick={() => go(i)} style={{
              flex: i === idx ? 2 : 1, height: 3, borderRadius: 99, border: 'none', cursor: 'pointer', padding: 0,
              background: i === idx ? s.accent : 'rgba(255,255,255,0.12)',
              transition: 'all 0.35s',
            }}/>
          ))}
        </div>
      </div>
    </div>
  );
}

const DEMO = { label: 'Resident (Demo)', email: 'resident1@estate-demo.com', password: 'Resident@123' };

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#F8FAFC' }}>
      <AdSidebar />
      <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md animate-fade-in">
      <MobileBanner />
        {/* Brand mark */}
        <div className="text-center mb-8">
          <div
            style={{
              width: 64, height: 64, borderRadius: 18,
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              boxShadow: '0 4px 24px rgba(16,185,129,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <path d="M20 6L8 13v14l12 7 12-7V13L20 6z" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none"/>
              <path d="M20 10L11 15.5v11L20 32l9-5.5v-11L20 10z" fill="rgba(255,255,255,0.15)"/>
              <text x="20" y="25" textAnchor="middle" fill="white" fontSize="13" fontWeight="800" fontFamily="system-ui,sans-serif">AM</text>
            </svg>
          </div>
          <h1
            className="text-3xl font-display font-bold mb-1"
            style={{ letterSpacing: '-0.03em', color: '#0F172A' }}
          >
            Area<span style={{ color: '#6366F1' }}>Mates</span>
          </h1>
          <p className="text-sm" style={{ color: '#64748B' }}>Sign in to your estate account</p>
        </div>

        {/* Demo account chip */}
        <div className="glass-card p-4 mb-4">
          <p
            className="text-xs font-semibold mb-3 uppercase tracking-wider"
            style={{ color: '#94A3B8' }}
          >
            Demo Account
          </p>
          <button
            onClick={() => { setForm({ email: DEMO.email, password: DEMO.password }); setError(''); }}
            className="w-full text-xs text-left p-2.5 rounded-lg transition-all"
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.30)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
          >
            <div className="font-semibold" style={{ color: '#0F172A' }}>{DEMO.label}</div>
            <div style={{ color: '#94A3B8' }}>{DEMO.email}</div>
          </button>
        </div>

        {/* Login form */}
        <form
          onSubmit={handleSubmit}
          className="glass-card p-6 space-y-4"
          style={{ border: '1px solid rgba(16,185,129,0.20)', background: 'linear-gradient(135deg, rgba(16,185,129,0.04) 0%, #FFFFFF 100%)' }}
        >
          {error && (
            <div
              className="flex items-center gap-2 rounded-xl p-3 text-sm"
              style={{ color: '#DC2626', background: '#FEF2F2', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div>
            <label className="text-sm mb-1.5 block font-medium" style={{ color: '#475569' }}>
              Email Address
            </label>
            <input
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-sm mb-1.5 block font-medium" style={{ color: '#475569' }}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className="input-field pr-10"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: '#94A3B8' }}
                onMouseEnter={e => e.currentTarget.style.color = '#475569'}
                onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-center text-sm" style={{ color: '#94A3B8' }}>
            New resident?{' '}
            <Link to="/register" className="font-medium hover:underline transition-colors" style={{ color: '#6366F1' }}>
              Join with estate code
            </Link>
          </p>
        </form>
      </div>
      </div>
    </div>
  );
}
