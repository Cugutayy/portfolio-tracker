import { useMemo } from 'react'
import { Bloom } from './Lily'

/**
 * Cinematic dusk garden behind the hero. Layered for depth + pointer parallax:
 *   dusk sky → glowing disc + faint rays → tiered hill silhouettes → drifting
 *   mist → ground → a central lily rising on its roots → two framing lily
 *   stalks growing in from the left/right edges → foreground fireflies.
 * All SVG/CSS, no video. Each layer reads --px/--py (set by the hero) and a
 * per-layer --depth to parallax by depth.
 */

function Layer({ depth, z, style, children }: { depth: number; z: number; style?: React.CSSProperties; children?: React.ReactNode }) {
  return (
    <div className="scene-layer par" aria-hidden style={{ ['--depth' as string]: depth, zIndex: z, ...style }}>
      {children}
    </div>
  )
}

/** One lily stalk: stem + leaves (+ optional roots) with a bloom at the top. */
function Stalk({ side, heightVh, bloom, sway, grow, leafDelay, roots }: {
  side: 'left' | 'right' | 'center'
  heightVh: number
  bloom: number
  sway: number
  grow: number
  leafDelay: number
  roots?: boolean
}) {
  const mirror = side === 'right'
  // stem from base (110,640) up to the bloom seat (~112,150)
  const stem = 'M110,640 C100,512 126,406 113,300 C105,236 109,196 111,156'
  const leaf = 'M0,0 C-7,-30 -4,-66 0,-82 C4,-66 7,-30 0,0 Z'
  const leaves = [
    { x: 110, y: 452, rot: 46, s: 1.5 },
    { x: 118, y: 356, rot: -50, s: 1.35 },
    { x: 110, y: 268, rot: 42, s: 1.15 },
  ]
  const pos: React.CSSProperties =
    side === 'center'
      ? { left: '50%', bottom: '-2%', transform: 'translateX(-50%)' }
      : side === 'left'
      ? { left: 'clamp(-130px, -4vw, -40px)', bottom: '-3%' }
      : { right: 'clamp(-130px, -4vw, -40px)', bottom: '-3%' }

  return (
    <div style={{ position: 'absolute', height: `${heightVh}vh`, width: `${heightVh * 0.42}vh`, transform: mirror ? 'scaleX(-1)' : undefined, ...pos }}>
      <div className="stalk-grow" style={{ width: '100%', height: '100%', ['--sgd' as string]: `${grow}s` }}>
        <div className="stalk-sway" style={{ width: '100%', height: '100%', ['--swA' as string]: `${sway}deg`, ['--swD' as string]: `${7 + heightVh / 30}s`, ['--swDl' as string]: `${grow}s` }}>
          <svg viewBox="0 0 220 660" preserveAspectRatio="xMidYMax meet" style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
            <defs>
              <linearGradient id={`st${side}`} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#2f4a25" /><stop offset="55%" stopColor="#4a7333" /><stop offset="100%" stopColor="#6f9a45" />
              </linearGradient>
              <linearGradient id={`lf${side}`} x1="0" y1="1" x2="0.4" y2="0">
                <stop offset="0%" stopColor="#33561f" /><stop offset="100%" stopColor="#74a046" />
              </linearGradient>
            </defs>
            {roots && (
              <g stroke="#5a4a36" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.7">
                {[[-34, 30], [-16, 44], [4, 40], [22, 34], [-2, 50]].map(([dx, dy], i) => (
                  <path key={i} className="root" pathLength={1} d={`M110,640 q ${dx / 2},${dy / 2} ${dx},${dy}`} style={{ ['--rd' as string]: `${0.1 + i * 0.08}s` }} />
                ))}
              </g>
            )}
            <path d={stem} fill="none" stroke={`url(#st${side})`} strokeWidth="7" strokeLinecap="round" />
            <path d={stem} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.6" strokeLinecap="round" />
            {leaves.map((lf, i) => (
              <path key={i} className="leaf" d={leaf} fill={`url(#lf${side})`}
                transform={`translate(${lf.x} ${lf.y}) rotate(${lf.rot}) scale(${lf.s})`}
                style={{ ['--ld' as string]: `${leafDelay + i * 0.18}s` }} />
            ))}
          </svg>
          {/* bloom seat at the stem top */}
          <div style={{ position: 'absolute', left: '50%', top: 'clamp(2%, 6%, 9%)', transform: mirror ? 'translateX(-50%) scaleX(-1)' : 'translateX(-50%)' }}>
            <Bloom size={bloom} delayBase={grow + 0.2} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function LilyScene() {
  const stars = useMemo(() => Array.from({ length: 40 }, (_, i) => ({ x: (i * 53) % 100, y: (i * 17) % 46, s: 0.6 + (i % 3) * 0.5, o: 0.2 + (i % 5) * 0.13, d: 2 + (i % 6) })), [])
  const flies = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    left: (i * 47) % 100, bottom: 8 + (i * 29) % 66, size: 2 + (i % 4) * 1.4,
    fd: 9 + (i % 8), fdl: (i * 0.7) % 9, fx: ((i % 5) - 2) * 18, fy: -(40 + (i % 6) * 22), fo: 0.45 + (i % 4) * 0.16,
    blur: (i % 3) * 0.7,
  })), [])

  return (
    <>
      {/* dusk sky */}
      <Layer depth={0} z={0} style={{
        background: 'linear-gradient(to bottom, #07060d 0%, #150f28 26%, #2c1d3c 44%, #5e3a44 58%, #b07248 67%, #8a5436 72%, #2a1a17 80%, #0c0907 100%)',
      }} />

      {/* stars */}
      <Layer depth={5} z={1}>
        {stars.map((s, i) => (
          <span key={i} style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, borderRadius: '50%', background: '#fff', opacity: s.o, animation: `pd ${s.d}s ease-in-out infinite` }} />
        ))}
      </Layer>

      {/* glowing disc + halo */}
      <Layer depth={9} z={2} style={{ display: 'grid', placeItems: 'start center' }}>
        <div className="disc-in" style={{ marginTop: '13%' }}>
          <div style={{ position: 'relative', width: 'min(34vmin, 300px)', height: 'min(34vmin, 300px)' }}>
            <div className="rays" style={{
              position: 'absolute', inset: '-120%',
              background: 'conic-gradient(from 0deg, rgba(255,232,194,.10) 0deg 1.4deg, transparent 1.4deg 13deg, rgba(255,232,194,.07) 13deg 14deg, transparent 14deg 26deg)',
              WebkitMaskImage: 'radial-gradient(closest-side, #000 12%, transparent 70%)',
              maskImage: 'radial-gradient(closest-side, #000 12%, transparent 70%)', filter: 'blur(2px)',
            }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle, #fff3d6 0%, #ffe2ad 26%, rgba(255,206,150,.35) 46%, rgba(255,190,140,0) 72%)' }} />
            <div style={{ position: 'absolute', inset: '30%', borderRadius: '50%', background: 'radial-gradient(circle, #fffaf0 0%, #ffe9bf 70%, rgba(255,225,170,0) 100%)', boxShadow: '0 0 70px 20px rgba(255,224,170,.35)' }} />
          </div>
        </div>
      </Layer>

      {/* hill silhouettes */}
      <Layer depth={14} z={3}>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}>
          <path className="hill" style={{ ['--hd' as string]: '.2s' }} fill="#2a2036" d="M0,612 C240,560 420,600 660,576 C900,552 1080,600 1440,560 L1440,900 L0,900 Z" />
          <path className="hill" style={{ ['--hd' as string]: '.35s' }} fill="#1c1528" d="M0,668 C260,628 480,672 760,648 C1010,628 1240,672 1440,636 L1440,900 L0,900 Z" />
          <path className="hill" style={{ ['--hd' as string]: '.5s' }} fill="#100b1a" d="M0,728 C300,700 520,742 820,720 C1080,702 1280,740 1440,716 L1440,900 L0,900 Z" />
        </svg>
      </Layer>

      {/* mist over the hills */}
      <Layer depth={20} z={4}>
        <div className="mist" style={{ position: 'absolute', left: '-10%', right: '-10%', top: '60%', height: '12%', background: 'linear-gradient(to right, transparent, rgba(220,210,225,.16), transparent)', filter: 'blur(14px)', ['--md' as string]: '46s' }} />
        <div className="mist" style={{ position: 'absolute', left: '-10%', right: '-10%', top: '68%', height: '10%', background: 'linear-gradient(to right, transparent, rgba(230,200,200,.12), transparent)', filter: 'blur(18px)', ['--md' as string]: '64s' }} />
      </Layer>

      {/* ground */}
      <Layer depth={22} z={5} style={{
        background: 'linear-gradient(to bottom, rgba(40,24,20,0) 70%, #1a1110 84%, #080605 100%)',
      }} />

      {/* central lily rising on its roots — softly behind the nameplate */}
      <Layer depth={30} z={6} style={{ opacity: 0.62 }}>
        <Stalk side="center" heightVh={60} bloom={140} sway={0.8} grow={0.2} leafDelay={1.5} roots />
      </Layer>

      {/* framing stalks from the edges */}
      <Layer depth={44} z={7}>
        <Stalk side="left" heightVh={86} bloom={200} sway={-1.6} grow={0.0} leafDelay={1.1} />
      </Layer>
      <Layer depth={46} z={7}>
        <Stalk side="right" heightVh={92} bloom={210} sway={1.5} grow={0.35} leafDelay={1.3} />
      </Layer>

      {/* foreground fireflies */}
      <Layer depth={56} z={8}>
        {flies.map((f, i) => (
          <span key={i} className="firefly" style={{
            left: `${f.left}%`, bottom: `${f.bottom}%`, width: f.size, height: f.size, filter: `blur(${f.blur}px)`,
            ['--fd' as string]: `${f.fd}s`, ['--fdl' as string]: `${f.fdl}s`, ['--fx' as string]: `${f.fx}px`, ['--fy' as string]: `${f.fy}px`, ['--fo' as string]: f.fo,
          }} />
        ))}
      </Layer>
    </>
  )
}
