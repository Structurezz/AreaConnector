import { Shield, Users, Activity, Lock, CheckCircle, Car } from 'lucide-react';

/* ─── Estate photo (Unsplash, luxury gated community) ─── */
const ESTATE_IMG =
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=85&fit=crop';

/* ─── Floating stat cards ─── */
const CARDS = [
  {
    icon: Activity,
    label: 'Gate Status',
    value: 'Open',
    dot: true,
    accent: '#10B981',
    style: { top: '18%', left: '7%' },
    delay: '0.5s',
    bob: '0s',
  },
  {
    icon: Users,
    label: 'Active Residents',
    value: '142',
    sub: '8 checked in today',
    accent: '#D4AF70',
    style: { top: '46%', right: '6%' },
    delay: '1s',
    bob: '1.2s',
  },
  {
    icon: Lock,
    label: 'Security',
    value: '24/7 Active',
    dot: true,
    accent: '#818CF8',
    style: { top: '68%', left: '6%' },
    delay: '1.5s',
    bob: '2.4s',
  },
  {
    icon: Car,
    label: 'Visitors Today',
    value: '23',
    sub: '4 pending approval',
    accent: '#FB923C',
    style: { top: '30%', right: '5%' },
    delay: '2s',
    bob: '0.6s',
  },
];

const FEATURES = [
  'Automated Gate Access',
  'Resident Management',
  'Smart Payments',
  'Visitor Logs',
  '24/7 Monitoring',
];

const CSS = `
  @keyframes kenBurns {
    0%   { transform: scale(1.00) translate(0%, 0%); }
    35%  { transform: scale(1.06) translate(-1.5%, -0.8%); }
    70%  { transform: scale(1.04) translate(1%, 0.5%); }
    100% { transform: scale(1.00) translate(0%, 0%); }
  }
  @keyframes cardIn {
    0%   { opacity: 0; transform: translateY(24px) scale(0.95); }
    100% { opacity: 1; transform: translateY(0px)  scale(1.00); }
  }
  @keyframes bob {
    0%,100% { transform: translateY(0px); }
    50%      { transform: translateY(-7px); }
  }
  @keyframes captionUp {
    0%   { opacity: 0; transform: translateY(28px); }
    100% { opacity: 1; transform: translateY(0px);  }
  }
  @keyframes scanLine {
    0%   { top: -2%; opacity: 0.07; }
    100% { top: 102%; opacity: 0.02; }
  }
  @keyframes glowPulse {
    0%,100% { opacity: 0.55; }
    50%      { opacity: 0.85; }
  }
  @keyframes dotBlink {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.3; }
  }
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }
  @keyframes fadeInForm {
    0%   { opacity: 0; transform: translateX(18px); }
    100% { opacity: 1; transform: translateX(0px);  }
  }
  @keyframes vignette {
    0%,100% { opacity: 0.62; }
    50%     { opacity: 0.72; }
  }
`;

function FloatCard({ icon: Icon, label, value, sub, dot, accent, style, delay, bob }) {
  return (
    <div
      style={{
        position: 'absolute',
        ...style,
        animation: `cardIn 0.7s ${delay} cubic-bezier(0.22,1,0.36,1) both,
                    bob 5s ${bob} ease-in-out infinite`,
        backdropFilter: 'blur(18px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.4)',
        background: 'rgba(8,14,26,0.72)',
        border: `1px solid ${accent}28`,
        borderRadius: 16,
        padding: '12px 16px',
        minWidth: 162,
        boxShadow: `0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px ${accent}12, inset 0 1px 0 rgba(255,255,255,0.06)`,
        zIndex: 10,
      }}>
      {/* top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 9,
          background: `${accent}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={14} color={accent}/>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)',
          letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
      {/* value */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {dot && (
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: accent, flexShrink: 0,
            boxShadow: `0 0 8px ${accent}`,
            animation: 'dotBlink 2s ease-in-out infinite',
          }}/>
        )}
        <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
          {value}
        </span>
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', marginTop: 3 }}>{sub}</div>
      )}
      {/* shimmer bar */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden', pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${accent}55, transparent)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 3s linear infinite',
        }}/>
      </div>
    </div>
  );
}

export default function AuthLayout({ children, caption, sub, pills }) {
  return (
    <>
      <style>{CSS}</style>

      <div style={{
        minHeight: '100vh', display: 'flex', overflow: 'hidden',
        background: '#FFFFFF',
      }}>

        {/* ══════════════════════════════════════════════
            LEFT — Estate photo panel (hidden on mobile)
        ══════════════════════════════════════════════ */}
        <div className="hidden lg:block"
          style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

          {/* Estate photo with Ken Burns */}
          <div style={{
            position: 'absolute', inset: '-5%',
            animation: 'kenBurns 22s ease-in-out infinite',
          }}>
            <img
              src={ESTATE_IMG}
              alt="Luxury estate"
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'center 40%',
                display: 'block',
              }}
            />
          </div>

          {/* Dark vignette overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 30% 50%, rgba(4,9,18,0.25) 0%, rgba(4,9,18,0.72) 100%)',
            animation: 'vignette 8s ease-in-out infinite',
          }}/>

          {/* Bottom-to-top gradient (deepens toward form edge) */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(4,9,18,0.96) 0%, rgba(4,9,18,0.45) 40%, transparent 70%)',
          }}/>

          {/* Right-edge blend into form panel */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to right, transparent 55%, rgba(4,9,18,0.98) 100%)',
          }}/>

          {/* Animated scan line */}
          <div style={{
            position: 'absolute', left: 0, right: 0, height: 2,
            background: 'linear-gradient(to right, transparent, rgba(16,185,129,0.4), transparent)',
            animation: 'scanLine 7s linear infinite',
            pointerEvents: 'none',
          }}/>

          {/* Floating stat cards */}
          {CARDS.map((card) => (
            <FloatCard key={card.label} {...card}/>
          ))}

          {/* Brand watermark */}
          <div style={{
            position: 'absolute', top: 28, left: 28, zIndex: 20,
            display: 'flex', alignItems: 'center', gap: 10,
            animation: 'captionUp 0.8s 0.1s both',
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: 'linear-gradient(135deg,#10B981,#059669)',
              boxShadow: '0 0 22px rgba(16,185,129,0.5), 0 4px 12px rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={18} color="white"/>
            </div>
            <span style={{
              color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: '-0.03em',
              textShadow: '0 2px 12px rgba(0,0,0,0.6)',
            }}>
              Area<span style={{ color: '#10B981' }}>Connect</span>
            </span>
          </div>

          {/* Bottom caption block */}
          <div style={{
            position: 'absolute', bottom: 40, left: 36, right: 120, zIndex: 20,
            animation: 'captionUp 0.9s 0.3s both',
          }}>
            {/* Glow accent line */}
            <div style={{
              width: 48, height: 3, borderRadius: 99,
              background: 'linear-gradient(to right, #10B981, #059669)',
              marginBottom: 14,
              animation: 'glowPulse 3s ease-in-out infinite',
              boxShadow: '0 0 16px rgba(16,185,129,0.6)',
            }}/>

            <p style={{
              color: 'rgba(255,255,255,0.92)', fontSize: 26, fontWeight: 800,
              lineHeight: 1.28, letterSpacing: '-0.035em',
              textShadow: '0 4px 24px rgba(0,0,0,0.7)', marginBottom: 10,
            }}>
              {caption || (
                <>Where every gate opens<br/>
                  <span style={{ color: '#10B981' }}>with intelligence.</span>
                </>
              )}
            </p>

            <p style={{
              color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.55,
              textShadow: '0 2px 8px rgba(0,0,0,0.5)', marginBottom: 18,
            }}>
              {sub || 'Premium estate management — automated access, real-time monitoring, and community control.'}
            </p>

            {/* Feature pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {(pills || FEATURES).map((f) => (
                <span key={f} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 11, fontWeight: 600,
                  padding: '4px 11px', borderRadius: 99,
                  background: 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.22)',
                  color: '#6EE7B7',
                  backdropFilter: 'blur(8px)',
                }}>
                  <CheckCircle size={10} color="#10B981"/>
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            RIGHT — Form panel
        ══════════════════════════════════════════════ */}
        <div style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', flexShrink: 0, overflowY: 'auto', minHeight: '100vh',
          background: '#FFFFFF',
        }}
          className="lg:w-[460px]">

          {/* Subtle top-center emerald glow */}
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: 280, height: 140, pointerEvents: 'none',
            background: 'radial-gradient(ellipse, rgba(16,185,129,0.06) 0%, transparent 70%)',
          }}/>

          {/* Subtle bottom glow */}
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 220, height: 200, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at right bottom, rgba(99,102,241,0.04) 0%, transparent 70%)',
          }}/>

          <div style={{
            width: '100%', maxWidth: 360, position: 'relative', zIndex: 10,
            padding: '40px 32px',
            animation: 'fadeInForm 0.6s cubic-bezier(0.22,1,0.36,1) both',
          }}>
            {children}
          </div>
        </div>

      </div>
    </>
  );
}
