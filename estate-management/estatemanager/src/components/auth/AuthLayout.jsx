import { Shield } from 'lucide-react';
import EstateScene from './EstateScene';

export default function AuthLayout({ children, caption, sub, pills }) {
  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: '#040912' }}>

      {/* ══════ LEFT — Animated Estate Panel ══════ */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden">
        <div className="absolute inset-0">
          <EstateScene />
        </div>

        {/* Right-edge fade */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to right, transparent 60%, #040912 100%)' }}/>

        {/* Brand watermark */}
        <div className="absolute top-8 left-8 flex items-center gap-2.5 z-10">
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#10B981,#059669)',
            boxShadow: '0 0 18px rgba(16,185,129,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={18} color="white"/>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">
            Area<span style={{ color: '#10B981' }}>Connect</span>
          </span>
        </div>

        {/* Bottom caption */}
        <div className="absolute bottom-10 left-10 right-28 z-10">
          <p className="text-white/80 text-2xl font-bold leading-snug mb-2 drop-shadow">
            {caption || <>Where every gate opens<br/><span style={{ color: '#10B981' }}>with intelligence.</span></>}
          </p>
          <p className="text-white/35 text-sm">
            {sub || 'Premium estate management — automated access, real-time monitoring, and community control in one platform.'}
          </p>
          {pills && (
            <div className="flex flex-wrap gap-2 mt-4">
              {pills.map(f => (
                <span key={f} className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{ background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)', color:'#6EE7B7' }}>
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══════ RIGHT — Form Panel ══════ */}
      <div className="w-full lg:w-[460px] flex items-center justify-center relative shrink-0 overflow-y-auto"
        style={{ background: 'linear-gradient(160deg, #050D1C 0%, #040912 50%, #060F1E 100%)', minHeight: '100vh' }}>

        {/* Subtle top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.06) 0%, transparent 70%)' }}/>

        <div className="w-full max-w-sm relative z-10 animate-fade-in py-10 px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
