const DUR = '18s';

const STARS = [
  [55,28],[110,14],[185,42],[260,18],[320,38],[390,12],[455,30],[520,8],[595,44],[665,22],[730,36],[770,14],
  [80,68],[155,78],[240,55],[335,72],[420,60],[505,82],[580,52],[650,76],[720,60],[35,50],[760,68],[290,88],
  [460,92],[140,95],[560,78],[680,92],[380,98],[225,82],[495,65],[610,88],
];

const KEYFRAMES = `
  @keyframes carJourney {
    0%   { transform: translate(480px, 0px)    scale(1.00); opacity:1; }
    23%  { transform: translate(0px,   0px)    scale(1.00); opacity:1; }
    31%  { transform: translate(0px,   0px)    scale(1.00); opacity:1; }
    50%  { transform: translate(-6px,  -102px) scale(0.40); opacity:1; }
    62%  { transform: translate(-192px,-108px) scale(0.33); opacity:1; }
    66%  { transform: translate(-192px,-108px) scale(0.33); opacity:0; }
    69%  { transform: translate(480px,  0px)   scale(1.00); opacity:0; }
    73%  { transform: translate(480px,  0px)   scale(1.00); opacity:1; }
    100% { transform: translate(480px,  0px)   scale(1.00); opacity:1; }
  }
  @keyframes gateL {
    0%,21%  { transform: scaleX(1); }
    34%     { transform: scaleX(0.04); }
    63%     { transform: scaleX(0.04); }
    77%     { transform: scaleX(1); }
    100%    { transform: scaleX(1); }
  }
  @keyframes gateR {
    0%,21%  { transform: scaleX(1); }
    34%     { transform: scaleX(0.04); }
    63%     { transform: scaleX(0.04); }
    77%     { transform: scaleX(1); }
    100%    { transform: scaleX(1); }
  }
  @keyframes sensorGlow {
    0%,19%  { opacity:0; }
    28%     { opacity:1; }
    65%     { opacity:1; }
    74%     { opacity:0; }
    100%    { opacity:0; }
  }
  @keyframes gateWash {
    0%,19%  { opacity:0; }
    32%     { opacity:1; }
    64%     { opacity:1; }
    76%     { opacity:0; }
    100%    { opacity:0; }
  }
  @keyframes tw1 { 0%,100%{opacity:.15} 50%{opacity:.85} }
  @keyframes tw2 { 0%,100%{opacity:.50} 50%{opacity:.10} }
  @keyframes tw3 { 0%,100%{opacity:.30} 50%{opacity:.90} }
  @keyframes winFlicker {
    0%,76%,100%{opacity:.70} 78%{opacity:.22} 82%{opacity:.60} 86%{opacity:.18} 90%{opacity:.70}
  }
  @keyframes lampPulse  { 0%,100%{opacity:.55} 50%{opacity:.82} }
  @keyframes smokeRise  { 0%{transform:translateY(0) scaleX(1);opacity:.35} 100%{transform:translateY(-26px) scaleX(1.5);opacity:0} }
  @keyframes cloudDrift { 0%{transform:translateX(0)} 100%{transform:translateX(-110px)} }
  @keyframes moonShimmer{ 0%,100%{opacity:.92} 50%{opacity:1} }
  @keyframes flagWave   { 0%,100%{transform:skewX(0deg) scaleX(1)} 50%{transform:skewX(11deg) scaleX(.93)} }
  @keyframes hlBeam     { 0%,100%{opacity:.07} 50%{opacity:.22} }
  @keyframes wheelSpin  { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
`;

/* ─── Small house helper ──────────────────────────────────────── */
function House({ x, y, w, h, wAnim = 0, flip = false }) {
  const sign = flip ? -1 : 1;
  const ox   = flip ? x + w : x;
  const rw   = w * 0.26;
  const rh   = h * 0.38;
  const doorW = w * 0.22;
  const doorH = h * 0.42;
  return (
    <g transform={`translate(${ox},0) scale(${sign},1)`}>
      {/* chimney */}
      <rect x={w*0.2} y={-h*0.55} width={w*0.12} height={h*0.28} fill="#060C18" rx="1"/>
      <rect x={w*0.17} y={-h*0.58} width={w*0.18} height={h*0.06} fill="#09111E" rx="1"/>
      {/* roof */}
      <polygon
        points={`${-4},${y} ${w+4},${y} ${w*0.5},${y-h*0.55}`}
        fill="#060D1C"/>
      <polygon
        points={`${0},${y} ${w},${y} ${w*0.5+4},${y-h*0.52}`}
        fill="#091222" opacity=".7"/>
      {/* body */}
      <rect x={0} y={y} width={w} height={h} fill="#0C192E" rx="2"/>
      {/* front face (3D side) */}
      <polygon
        points={`${w},${y} ${w+6},${y+5} ${w+6},${y+h+4} ${w},${y+h}`}
        fill="#09131F" opacity=".8"/>
      {/* left window */}
      <rect x={w*0.08} y={y+h*0.12} width={rw} height={rh} fill="#F59E0B" opacity=".58" rx="1"
        style={{animation:`winFlicker ${3.2+wAnim}s ${wAnim*0.3}s ease-in-out infinite`}}/>
      <rect x={w*0.08} y={y+h*0.12} width={rw} height={rh} fill="url(#winGlw)" rx="1" opacity=".45"/>
      <line x1={w*0.08+rw/2} y1={y+h*0.12} x2={w*0.08+rw/2} y2={y+h*0.12+rh} stroke="#C8A96E" strokeWidth=".6" opacity=".3"/>
      <line x1={w*0.08}      y1={y+h*0.12+rh/2} x2={w*0.08+rw} y2={y+h*0.12+rh/2} stroke="#C8A96E" strokeWidth=".6" opacity=".3"/>
      {/* right window */}
      <rect x={w*0.66} y={y+h*0.12} width={rw} height={rh} fill="#F59E0B" opacity=".52" rx="1"
        style={{animation:`winFlicker ${3.8+wAnim}s ${wAnim*0.4+0.5}s ease-in-out infinite`}}/>
      <rect x={w*0.66} y={y+h*0.12} width={rw} height={rh} fill="url(#winGlw)" rx="1" opacity=".4"/>
      <line x1={w*0.66+rw/2} y1={y+h*0.12} x2={w*0.66+rw/2} y2={y+h*0.12+rh} stroke="#C8A96E" strokeWidth=".6" opacity=".3"/>
      <line x1={w*0.66}      y1={y+h*0.12+rh/2} x2={w*0.66+rw} y2={y+h*0.12+rh/2} stroke="#C8A96E" strokeWidth=".6" opacity=".3"/>
      {/* door */}
      <rect x={(w-doorW)/2} y={y+h-doorH} width={doorW} height={doorH} fill="#050B16" rx="1"/>
      <rect x={(w-doorW)/2+(doorW*0.62)} y={y+h-doorH*0.55} width={doorW*0.08} height={doorW*0.08} fill="#C8A96E" rx="1" opacity=".6"/>
      {/* path lamp */}
      <rect x={w*0.5-1} y={y+h} width={2} height={h*0.2} fill="#1A2B40" rx="1"/>
      <circle cx={w*0.5} cy={y+h+h*0.2} r={h*0.09} fill="url(#lampGlw)"
        style={{animation:`lampPulse ${3+wAnim*0.3}s ease-in-out infinite`}}/>
      <circle cx={w*0.5} cy={y+h+h*0.2} r={h*0.04} fill="#FDE68A" opacity=".55"/>
      {/* window glow on ground */}
      <ellipse cx={w*0.22} cy={y+h} rx={rw*0.8} ry={h*0.06} fill="#F59E0B" opacity=".06"/>
    </g>
  );
}

export default function EstateScene() {
  return (
    <>
      <style>{KEYFRAMES}</style>
      <svg viewBox="0 0 820 540" xmlns="http://www.w3.org/2000/svg"
        style={{width:'100%',height:'100%',display:'block'}}>
        <defs>
          <linearGradient id="skyGrd"      x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#010710"/>
            <stop offset="55%"  stopColor="#030D20"/>
            <stop offset="100%" stopColor="#071630"/>
          </linearGradient>
          <linearGradient id="interiorGrd" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#030C1A"/>
            <stop offset="100%" stopColor="#071628"/>
          </linearGradient>
          <linearGradient id="groundGrd"   x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#071628"/>
            <stop offset="100%" stopColor="#04101E"/>
          </linearGradient>
          <linearGradient id="roadGrd"     x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#0A1828"/>
            <stop offset="100%" stopColor="#0D1E32"/>
          </linearGradient>
          <linearGradient id="wallGrd"     x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#0C1A2C"/>
            <stop offset="50%"  stopColor="#102238"/>
            <stop offset="100%" stopColor="#0C1A2C"/>
          </linearGradient>
          <linearGradient id="pillarGrd"   x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#8B7A50"/>
            <stop offset="28%"  stopColor="#D4AF70"/>
            <stop offset="70%"  stopColor="#B89550"/>
            <stop offset="100%" stopColor="#6A5530"/>
          </linearGradient>
          {/* 3-D car gradients */}
          <linearGradient id="carSide"     x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#C8D4E4"/>
            <stop offset="50%"  stopColor="#9CAABF"/>
            <stop offset="100%" stopColor="#6878940"/>
          </linearGradient>
          <linearGradient id="carRoof"     x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#A8B8CC"/>
            <stop offset="100%" stopColor="#8090A8"/>
          </linearGradient>
          <linearGradient id="carFront"    x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#6A7A8E"/>
            <stop offset="100%" stopColor="#8A9AAE"/>
          </linearGradient>
          <linearGradient id="carHood"     x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#B0C0D4"/>
            <stop offset="100%" stopColor="#8090A4"/>
          </linearGradient>
          <linearGradient id="intRoadGrd"  x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#080E1A"/>
            <stop offset="100%" stopColor="#0C1828"/>
          </linearGradient>

          <radialGradient id="winGlw"    cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#F59E0B" stopOpacity=".7"/>
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="lampGlw"   cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#FDE68A" stopOpacity="1"/>
            <stop offset="100%" stopColor="#FDE68A" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="moonGlw"   cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#C8D8FF" stopOpacity=".25"/>
            <stop offset="100%" stopColor="#C8D8FF" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="sensorGlw" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#10B981" stopOpacity=".9"/>
            <stop offset="100%" stopColor="#10B981" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="hlGlw"     cx="0%" cy="50%" r="100%">
            <stop offset="0%"   stopColor="#FFFDE7" stopOpacity=".55"/>
            <stop offset="100%" stopColor="#FFFDE7" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="gateAura"  cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#10B981" stopOpacity=".12"/>
            <stop offset="100%" stopColor="#10B981" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="intLampGlw" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#FDE68A" stopOpacity=".7"/>
            <stop offset="100%" stopColor="#FDE68A" stopOpacity="0"/>
          </radialGradient>

          <clipPath id="lgClip"><rect x="328" y="272" width="74" height="92"/></clipPath>
          <clipPath id="rgClip"><rect x="418" y="272" width="74" height="92"/></clipPath>
          <clipPath id="interiorClip"><rect x="0" y="160" width="820" height="196"/></clipPath>
        </defs>

        {/* ── Sky ── */}
        <rect width="820" height="540" fill="url(#skyGrd)"/>

        {/* ── Moon ── */}
        <circle cx="700" cy="72" r="44" fill="url(#moonGlw)"/>
        <circle cx="700" cy="72" r="27" fill="#DDE8FF" opacity=".92"
          style={{animation:`moonShimmer 5s ease-in-out infinite`}}/>
        <circle cx="712" cy="65" r="23" fill="#030D20"/>
        <circle cx="692" cy="80" r="2"   fill="#C8D8FF" opacity=".25"/>

        {/* ── Stars ── */}
        {STARS.map(([x,y],i)=>{
          const r    = i%4===0?1.6:i%3===0?1.2:0.9;
          const anim = i%3===0?'tw1':i%3===1?'tw2':'tw3';
          const dur  = 2+(i*0.31)%3;
          const del  = (i*0.18)%3;
          return <circle key={i} cx={x} cy={y} r={r} fill="white"
            style={{animation:`${anim} ${dur}s ${del}s ease-in-out infinite`}}/>;
        })}

        {/* ── Clouds ── */}
        <g opacity=".06" style={{animation:`cloudDrift 30s linear infinite`}}>
          <ellipse cx="180" cy="100" rx="90" ry="20" fill="#80A8CC"/>
          <ellipse cx="225" cy="88"  rx="65" ry="15" fill="#80A8CC"/>
        </g>
        <g opacity=".05" style={{animation:`cloudDrift 45s linear infinite`,animationDelay:'-18s'}}>
          <ellipse cx="530" cy="82"  rx="75" ry="18" fill="#80A8CC"/>
          <ellipse cx="575" cy="70"  rx="52" ry="13" fill="#80A8CC"/>
        </g>

        {/* ═══════════════════════════════════════════════
            ESTATE INTERIOR — visible above the wall
            Perspective: viewer outside looking over wall
            VP = (410, 186)
        ═══════════════════════════════════════════════ */}
        <g clipPath="url(#interiorClip)">
          {/* Ground/grass inside estate */}
          <rect x="0" y="160" width="820" height="196" fill="url(#interiorGrd)"/>
          {/* Subtle grass strips */}
          {[330,336,342,348].map((y,i)=>(
            <line key={i} x1="0" x2="820" y1={y} y2={y} stroke="#0C2030" strokeWidth=".5" opacity=".5"/>
          ))}

          {/* ── Internal main avenue (perspective trapezoid, gate→VP) ──
              Left edge:  x = 410 - 82*(y-186)/168  from y=186 to y=354
              Right edge: x = 410 + 82*(y-186)/168
          */}
          <polygon
            points="328,354 492,354 416,186 404,186"
            fill="url(#intRoadGrd)" opacity=".9"/>
          {/* Centre line on internal avenue */}
          <line x1="410" y1="354" x2="410" y2="200" stroke="#162C44" strokeWidth="1.5"
            strokeDasharray="8,11" opacity=".7"/>
          {/* Kerb edges */}
          <line x1="328" y1="354" x2="404" y2="186" stroke="#102030" strokeWidth="1.2" opacity=".5"/>
          <line x1="492" y1="354" x2="416" y2="186" stroke="#102030" strokeWidth="1.2" opacity=".5"/>

          {/* ── T-junction cross road (at y≈252) ──
              At y=252: left_x≈384, right_x≈436
          */}
          {/* Left branch road */}
          <polygon
            points="0,240 384,240 384,264 0,264"
            fill="url(#intRoadGrd)" opacity=".85"/>
          {/* Right branch road */}
          <polygon
            points="436,240 820,240 820,264 436,264"
            fill="url(#intRoadGrd)" opacity=".85"/>
          {/* Branch road centre lines */}
          <line x1="0"   y1="252" x2="384" y2="252" stroke="#162C44" strokeWidth="1.2" strokeDasharray="7,9" opacity=".6"/>
          <line x1="436" y1="252" x2="820" y2="252" stroke="#162C44" strokeWidth="1.2" strokeDasharray="7,9" opacity=".6"/>

          {/* ── Deeper interior road (circle loop, subtle) ── */}
          <ellipse cx="410" cy="210" rx="55" ry="14" fill="none"
            stroke="#0D1F31" strokeWidth="12" opacity=".7"/>

          {/* ── Path lights along main avenue ── */}
          {[
            [325,310],[325,285],[325,265],
            [495,310],[495,285],[495,265],
          ].map(([x,y],i)=>(
            <g key={i}>
              <rect x={x} y={y} width="2" height="16" fill="#1A2840" rx="1"/>
              <circle cx={x+1} cy={y} r="5" fill="url(#intLampGlw)"
                style={{animation:`lampPulse ${3+i*0.22}s ${i*0.3}s ease-in-out infinite`}}/>
              <circle cx={x+1} cy={y} r="2" fill="#FDE68A" opacity=".5"/>
            </g>
          ))}
          {/* Path lights along branches */}
          {[
            [100,250],[200,250],[300,250],
            [520,250],[620,250],[720,250],
          ].map(([x,y],i)=>(
            <g key={i}>
              <rect x={x} y={y-16} width="2" height="16" fill="#1A2840" rx="1"/>
              <circle cx={x+1} cy={y-16} r="4" fill="url(#intLampGlw)"
                style={{animation:`lampPulse ${3.5+i*0.18}s ${i*0.25}s ease-in-out infinite`}}/>
              <circle cx={x+1} cy={y-16} r="1.8" fill="#FDE68A" opacity=".45"/>
            </g>
          ))}

          {/* ── Cypress trees inside estate ── */}
          {[
            [305,275],[305,300],[305,325],
            [515,275],[515,300],[515,325],
            [56,245],[150,245],[248,245],
            [570,245],[668,245],[762,245],
          ].map(([x,y],i)=>(
            <g key={i}>
              <rect x={x+4} y={y+20} width="5" height="18" fill="#040810" rx="1"/>
              <polygon points={`${x},${y+20} ${x+13},${y+20} ${x+6.5},${y}`}   fill="#050A14"/>
              <polygon points={`${x-3},${y+14} ${x+16},${y+14} ${x+6.5},${y+4}`} fill="#040912"/>
            </g>
          ))}

          {/* ══════════════════════════════════
              HOUSES — Left side of main avenue
          ══════════════════════════════════ */}
          {/* House A — close left, large */}
          <House x={62}  y={298} w={84} h={50} wAnim={0.0}/>
          {/* House B — mid-left */}
          <House x={102} y={265} w={64} h={38} wAnim={0.5}/>
          {/* House C — far left */}
          <House x={130} y={244} w={48} h={28} wAnim={1.0}/>
          {/* House I — on left branch road */}
          <House x={198} y={272} w={52} h={32} wAnim={0.8}/>
          {/* House J — further left branch */}
          <House x={288} y={267} w={44} height={27} wAnim={1.2}/>

          {/* ══════════════════════════════════
              HOUSES — Right side (flipped)
          ══════════════════════════════════ */}
          {/* House D — close right */}
          <House x={674} y={298} w={84} h={50} wAnim={0.3} flip/>
          {/* House E — mid-right */}
          <House x={654} y={265} w={64} h={38} wAnim={0.7} flip/>
          {/* House F — far right */}
          <House x={642} y={244} w={48} h={28} wAnim={1.1} flip/>
          {/* House K — on right branch */}
          <House x={568} y={272} w={52} h={32} wAnim={0.6} flip/>
          {/* House L — further right branch */}
          <House x={488} y={267} w={44} h={27} wAnim={1.3} flip/>

          {/* ══════════════════════════════════
              HOUSES — Deep interior (tiny, far)
          ══════════════════════════════════ */}
          <House x={266} y={216} w={34} h={20} wAnim={1.5}/>
          <House x={520} y={216} w={34} h={20} wAnim={1.6} flip/>

          {/* ── Estate flag pole (deep center) ── */}
          <line x1="410" y1="172" x2="410" y2="198" stroke="#6A8098" strokeWidth="1.2" opacity=".6"/>
          <g style={{animation:`flagWave 2.4s ease-in-out infinite`,transformOrigin:'410px 175px'}}>
            <polygon points="410,173 430,178 410,183" fill="#10B981" opacity=".75"/>
          </g>
          <circle cx="410" cy="172" r="1.8" fill="#C8A96E" opacity=".6"/>

          {/* ── Perimeter back wall ── */}
          <rect x="0" y="160" width="820" height="12" fill="#0A1828" opacity=".9"/>
          {Array.from({length:22},(_,i)=>(
            <rect key={i} x={i*40} y="156" width="9" height="10" fill="#0C1C2E" rx="1" opacity=".8"/>
          ))}
        </g>

        {/* ── Perimeter wall (front) ── */}
        <rect x="0" y="356" width="820" height="22" fill="url(#wallGrd)"/>
        <rect x="0" y="352" width="820" height="7"  fill="#122038" opacity=".8"/>
        {Array.from({length:22},(_,i)=>(
          <rect key={i} x={i*40} y="346" width="10" height="14" fill="#0E1C30" rx="1"/>
        ))}

        {/* ── Cypress Trees (flanking exterior) ── */}
        {[[72,240],[28,258],[116,228],[704,240],[748,258],[660,228]].map(([x,y],i)=>(
          <g key={i}>
            <rect x={x+7}  y={y+65} width="7" height="35" fill="#05090F"/>
            <polygon points={`${x},${y+65} ${x+21},${y+65} ${x+10.5},${y}`}     fill="#060C18"/>
            <polygon points={`${x-4},${y+45} ${x+25},${y+45} ${x+10.5},${y+8}`} fill="#050A15"/>
          </g>
        ))}

        {/* ── Lawn ── */}
        <rect x="0" y="378" width="820" height="162" fill="url(#groundGrd)"/>
        {[385,391,397,403,409].map((y,i)=>(
          <line key={i} x1="0" x2="820" y1={y} y2={y} stroke="#0C1E30" strokeWidth=".5" opacity=".6"/>
        ))}

        {/* ── External Driveway ── */}
        <polygon points="322,358 498,358 578,540 242,540" fill="url(#roadGrd)" opacity=".95"/>
        <line x1="410" y1="370" x2="410" y2="515"
          stroke="#182E48" strokeWidth="2" strokeDasharray="10,14" opacity=".75"/>
        <line x1="322" y1="358" x2="244" y2="540" stroke="#162840" strokeWidth="1.5" opacity=".55"/>
        <line x1="498" y1="358" x2="576" y2="540" stroke="#162840" strokeWidth="1.5" opacity=".55"/>

        {/* ── Gate Pillars ── */}
        <rect x="292" y="278" width="36" height="102" fill="url(#pillarGrd)" rx="3"/>
        <rect x="288" y="274" width="44" height="12"  fill="#C8A060" rx="2" opacity=".9"/>
        <circle cx="310" cy="268" r="16" fill="url(#pillarGrd)"/>
        <circle cx="310" cy="262" r="5"  fill="#E8C870" opacity=".9"/>
        <rect x="306" y="282" width="4"  height="92" fill="#E8C870" opacity=".25" rx="2"/>
        <circle cx="310" cy="272" r="12" fill="url(#lampGlw)"
          style={{animation:`lampPulse 3s ease-in-out infinite`}}/>
        <circle cx="310" cy="272" r="5"  fill="#FDE68A" opacity=".6"/>

        <rect x="492" y="278" width="36" height="102" fill="url(#pillarGrd)" rx="3"/>
        <rect x="488" y="274" width="44" height="12"  fill="#C8A060" rx="2" opacity=".9"/>
        <circle cx="510" cy="268" r="16" fill="url(#pillarGrd)"/>
        <circle cx="510" cy="262" r="5"  fill="#E8C870" opacity=".9"/>
        <rect x="510" y="282" width="4"  height="92" fill="#E8C870" opacity=".25" rx="2"/>
        <circle cx="510" cy="272" r="12" fill="url(#lampGlw)"
          style={{animation:`lampPulse 3s 1.5s ease-in-out infinite`}}/>
        <circle cx="510" cy="272" r="5"  fill="#FDE68A" opacity=".6"/>

        {/* ── Gate Aura ── */}
        <ellipse cx="410" cy="338" rx="90" ry="50" fill="url(#gateAura)"
          style={{animation:`gateWash ${DUR} ease-in-out infinite`}}/>

        {/* ── Left Gate Panel ── */}
        <g style={{transformBox:'fill-box',transformOrigin:'left center',animation:`gateL ${DUR} ease-in-out infinite`}}
          clipPath="url(#lgClip)">
          {[328,341,354,367,380,393].map((x,i)=>(
            <rect key={i} x={x} y="280" width="7" height="84" fill="#3C5272" rx="2"/>
          ))}
          <rect x="328" y="278" width="76" height="7"  fill="#6A8098" rx="2"/>
          <rect x="328" y="276" width="76" height="3"  fill="#C8A96E" opacity=".7" rx="1"/>
          <rect x="328" y="322" width="76" height="5"  fill="#2E4460" rx="1"/>
          <rect x="328" y="356" width="76" height="5"  fill="#2E4460" rx="1"/>
          {[331,344,357,370,383,396].map((x,i)=>(
            <polygon key={i} points={`${x},278 ${x+3.5},264 ${x+7},278`} fill="#4E6882"/>
          ))}
          <rect x="328" y="280" width="3" height="78" fill="#5A7890" opacity=".4" rx="1"/>
        </g>

        {/* ── Right Gate Panel ── */}
        <g style={{transformBox:'fill-box',transformOrigin:'right center',animation:`gateR ${DUR} ease-in-out infinite`}}
          clipPath="url(#rgClip)">
          {[418,431,444,457,470,483].map((x,i)=>(
            <rect key={i} x={x} y="280" width="7" height="84" fill="#3C5272" rx="2"/>
          ))}
          <rect x="416" y="278" width="76" height="7"  fill="#6A8098" rx="2"/>
          <rect x="416" y="276" width="76" height="3"  fill="#C8A96E" opacity=".7" rx="1"/>
          <rect x="416" y="322" width="76" height="5"  fill="#2E4460" rx="1"/>
          <rect x="416" y="356" width="76" height="5"  fill="#2E4460" rx="1"/>
          {[419,432,445,458,471,484].map((x,i)=>(
            <polygon key={i} points={`${x},278 ${x+3.5},264 ${x+7},278`} fill="#4E6882"/>
          ))}
          <rect x="489" y="280" width="3" height="78" fill="#5A7890" opacity=".4" rx="1"/>
        </g>
        <rect x="407" y="296" width="6"  height="24" fill="#C8A96E" opacity=".5" rx="2"/>
        <circle cx="410" cy="294" r="4"  fill="#C8A96E" opacity=".4"/>

        {/* ── Gate Sensor ── */}
        <rect x="302" y="306" width="7" height="7" fill="#10B981" rx="3.5"
          style={{animation:`sensorGlow ${DUR} ease-in-out infinite`}}/>
        <circle cx="305.5" cy="309.5" r="5" fill="url(#sensorGlw)"
          style={{animation:`sensorGlow ${DUR} ease-in-out infinite`}}>
          <animate attributeName="r" values="5;14;10;14;5" dur={DUR}
            keyTimes="0;0.28;0.46;0.63;0.74" calcMode="spline"
            keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"
            repeatCount="indefinite"/>
        </circle>

        {/* ── Lamp Posts (exterior flanking) ── */}
        {[[215,310],[605,310]].map(([x,y],i)=>(
          <g key={i}>
            <rect x={x}   y={y}    width="5" height="82" fill="#1A2B40" rx="2"/>
            <rect x={x-8} y={y-4}  width="21" height="6" fill="#1A2B40" rx="3"/>
            <rect x={x+3} y={y-12} width="5" height="14" fill="#1A2B40" rx="2"/>
            <circle cx={x+5} cy={y-14} r="9"  fill="url(#lampGlw)"
              style={{animation:`lampPulse ${3.5+i*0.4}s ${i*0.7}s ease-in-out infinite`}}/>
            <circle cx={x+5} cy={y-14} r="4.5" fill="#FDE68A" opacity=".55"/>
          </g>
        ))}

        {/* ── Path lights driveway ── */}
        {[355,380,405,430,455].map((x,i)=>(
          <ellipse key={i} cx={x} cy="374" rx="4" ry="2" fill="#C8A96E" opacity=".18"/>
        ))}

        {/* ══════════════════════════════════════════════
            3-D CAR — front-quarter perspective, faces LEFT
            Group base position: x≈352 to 502, y≈415-478
            Animation translates & scales this whole group
        ══════════════════════════════════════════════ */}
        <g style={{animation:`carJourney ${DUR} ease-in-out infinite`}}>

          {/* Headlight beams (cast forward-left) */}
          <polygon points="352,430 252,412 252,450 352,448"
            fill="url(#hlGlw)"
            style={{animation:`hlBeam 1.8s ease-in-out infinite`}}/>
          <polygon points="352,443 262,430 262,456 352,453"
            fill="url(#hlGlw)" opacity=".55"
            style={{animation:`hlBeam 1.8s .35s ease-in-out infinite`}}/>

          {/* ── Drop shadow ── */}
          <ellipse cx="427" cy="476" rx="74" ry="7" fill="#000018" opacity=".45"/>

          {/* ── 3D Right side face (depth panel) ── */}
          <polygon
            points="492,420 504,424 504,458 492,455"
            fill="url(#carFront)" opacity=".72"/>
          {/* right side window-row continuation */}
          <polygon
            points="432,408 492,420 492,422 432,410"
            fill="#8898AC" opacity=".4"/>

          {/* ── Main body (side panel) ── */}
          <rect x="352" y="420" width="140" height="36" fill="url(#carSide)" rx="5"/>

          {/* Body character lines */}
          <line x1="352" y1="438" x2="492" y2="438" stroke="#A8B8CC" strokeWidth=".9" opacity=".35"/>
          <line x1="352" y1="420" x2="492" y2="420" stroke="#D0DAE8" strokeWidth=".7" opacity=".45"/>
          <rect x="352" y="420" width="140" height="36" fill="none"
            stroke="#8898B0" strokeWidth=".8" rx="5" opacity=".3"/>

          {/* ── Cabin top section ── */}
          <rect x="374" y="400" width="96" height="24" fill="url(#carRoof)" rx="4"/>

          {/* ── 3D Roof top panel (visible surface) ── */}
          <polygon
            points="374,400 470,400 484,406 388,406"
            fill="#B8C8DC" opacity=".65"/>

          {/* ── Hood (slopes down to front) ── */}
          <polygon
            points="352,420 380,420 374,406 344,414"
            fill="url(#carHood)" opacity=".85"/>

          {/* ── Front face (3D angled) ── */}
          <polygon
            points="344,414 352,420 352,456 340,450"
            fill="url(#carFront)"/>

          {/* ── Windshield (front) ── */}
          <polygon
            points="376,402 415,402 415,420 374,420"
            fill="#081828" opacity=".88"/>
          {/* Windshield glare */}
          <polygon
            points="378,403 400,403 398,409 376,409"
            fill="#C8D8E8" opacity=".12"/>

          {/* ── Side windows ── */}
          <rect x="417" y="402" width="46" height="18" fill="#0A1E35" rx="2" opacity=".84"/>
          {/* Window divider */}
          <line x1="440" y1="402" x2="440" y2="420" stroke="#5A7090" strokeWidth=".8" opacity=".4"/>
          {/* Window glint */}
          <line x1="419" y1="404" x2="430" y2="404" stroke="#C0CDD8" strokeWidth=".7" opacity=".2"/>

          {/* ── Side mirror ── */}
          <polygon points="370,413 380,413 376,408 366,410" fill="#8090A4" opacity=".7"/>

          {/* ── Door handles ── */}
          <rect x="388" y="432" width="14" height="3.5" fill="#C0CCd8" rx="2" opacity=".55"/>
          <rect x="434" y="432" width="14" height="3.5" fill="#B8C4D4" rx="2" opacity=".5"/>

          {/* ── Bumper / lower trim ── */}
          <rect x="350" y="450" width="144" height="6"  fill="#6878901" rx="3" opacity=".6"/>
          <rect x="348" y="453" width="10"  height="8"  fill="#707888" rx="2"/>
          <rect x="494" y="453" width="10"  height="8"  fill="#707888" rx="2"/>

          {/* ── Front headlights ── */}
          <ellipse cx="351" cy="432" rx="7" ry="5"   fill="#FFFDE7" opacity=".92">
            <animate attributeName="opacity" values=".80;1;.80" dur="1.8s" repeatCount="indefinite"/>
          </ellipse>
          <ellipse cx="351" cy="444" rx="6" ry="4"   fill="#FEF3C7" opacity=".82">
            <animate attributeName="opacity" values=".70;.96;.70" dur="1.8s" begin=".3s" repeatCount="indefinite"/>
          </ellipse>
          {/* DRL strip */}
          <rect x="348" y="428" width="7" height="2"  fill="#C8E8FF" opacity=".6" rx="1"/>

          {/* ── Rear lights ── */}
          <ellipse cx="494" cy="430" rx="6" ry="4.5" fill="#EF4444" opacity=".82"/>
          <ellipse cx="494" cy="442" rx="5" ry="3.5" fill="#F87171" opacity=".55"/>
          {/* Rear reflector */}
          <rect x="492" y="448" width="6"  height="3"  fill="#F87171" opacity=".3" rx="1"/>

          {/* ── Wheels (ellipses = 3D perspective discs) ── */}
          {/* Front-left wheel */}
          <ellipse cx="380" cy="458" rx="15" ry="9.5" fill="#101820"/>
          <ellipse cx="380" cy="458" rx="10" ry="6.5" fill="#1C2838"/>
          {/* Spokes */}
          {[0,60,120,180,240,300].map((deg,j)=>(
            <line key={j}
              x1="380" y1="458"
              x2={380+Math.cos(deg*Math.PI/180)*8}
              y2={458+Math.sin(deg*Math.PI/180)*5.2}
              stroke="#3A4E68" strokeWidth=".8"/>
          ))}
          <ellipse cx="380" cy="458" rx="3.5" ry="2.2" fill="#8898A8"/>
          <ellipse cx="380" cy="458" rx="15"  ry="9.5"  fill="none"
            stroke="#2A3848" strokeWidth=".8"/>

          {/* Rear-left wheel */}
          <ellipse cx="466" cy="458" rx="15" ry="9.5" fill="#101820"/>
          <ellipse cx="466" cy="458" rx="10" ry="6.5" fill="#1C2838"/>
          {[0,60,120,180,240,300].map((deg,j)=>(
            <line key={j}
              x1="466" y1="458"
              x2={466+Math.cos(deg*Math.PI/180)*8}
              y2={458+Math.sin(deg*Math.PI/180)*5.2}
              stroke="#3A4E68" strokeWidth=".8"/>
          ))}
          <ellipse cx="466" cy="458" rx="3.5" ry="2.2" fill="#8898A8"/>

          {/* Front-right wheel (foreshortened, behind body) */}
          <ellipse cx="384" cy="457" rx="12" ry="5"   fill="#1A2838" opacity=".7"/>
          {/* Rear-right wheel */}
          <ellipse cx="470" cy="457" rx="12" ry="5"   fill="#1A2838" opacity=".65"/>

          {/* ── Exhaust / undercarriage ── */}
          <rect x="490" y="453" width="8"  height="4"  fill="#3A4858" rx="2" opacity=".6"/>

          {/* ── Antenna ── */}
          <line x1="436" y1="400" x2="436" y2="388" stroke="#6A7888" strokeWidth="1.1"/>
          <circle cx="436" cy="388" r="1.5" fill="#7A8898"/>

          {/* Under-glow */}
          <ellipse cx="427" cy="466" rx="60" ry="5" fill="#FFFDE7" opacity=".04"
            style={{animation:`hlBeam 1.8s ease-in-out infinite`}}/>
        </g>

        {/* ── Foreground edge ── */}
        <rect x="0" y="535" width="820" height="5" fill="#030810"/>
      </svg>
    </>
  );
}
