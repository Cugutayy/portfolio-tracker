/**
 * A blooming lily (Lilium). `Bloom` is the flower head (6 tepals in two whorls
 * that unfurl with a staggered overshoot + a warm centre); `Lily` wraps it with
 * a soft halo for standalone use. Pure-CSS keyframes drive the bloom; the
 * fan-rotation is a reliable SVG transform, CSS only scales each petal in.
 */
const OUTER = 'M200,210 C171,171 161,116 191,72 C197,64 203,64 209,72 C239,116 229,171 200,210 Z'
const INNER = 'M200,210 C181,177 175,127 196,85 C198,80 202,80 204,85 C225,127 219,177 200,210 Z'

const PETALS = [
  { d: OUTER, a: 0, delay: 0.0, back: true },
  { d: OUTER, a: 120, delay: 0.12, back: true },
  { d: OUTER, a: 240, delay: 0.24, back: true },
  { d: INNER, a: 60, delay: 0.4, back: false },
  { d: INNER, a: 180, delay: 0.52, back: false },
  { d: INNER, a: 300, delay: 0.64, back: false },
]

const STAMENS = [30, 90, 150, 210, 270, 330].map((deg) => {
  const r = 40, rad = (deg * Math.PI) / 180
  return { x: 200 + r * Math.sin(rad), y: 210 - r * Math.cos(rad), deg }
})

let gid = 0

/** The flower head only. `uid` keeps gradient ids unique across instances. */
export function Bloom({ size = 300, delayBase = 0 }: { size?: number; delayBase?: number }) {
  const id = `bl${gid++}`
  return (
    <svg width={size} height={size} viewBox="0 0 400 400" style={{ display: 'block', overflow: 'visible' }} aria-hidden>
      <defs>
        <linearGradient id={`${id}o`} x1="0" y1="0.1" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbf4e8" /><stop offset="48%" stopColor="#efe4d0" /><stop offset="100%" stopColor="#ddcdb2" />
        </linearGradient>
        <linearGradient id={`${id}i`} x1="0" y1="0.05" x2="0" y2="1">
          <stop offset="0%" stopColor="#fffaf1" /><stop offset="55%" stopColor="#f8efe0" /><stop offset="100%" stopColor="#f0d9cf" />
        </linearGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.85)" /><stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <radialGradient id={`${id}t`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e9c45f" /><stop offset="60%" stopColor="#cf9a3f" /><stop offset="100%" stopColor="rgba(180,120,60,0)" />
        </radialGradient>
        <filter id={`${id}f`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.5" /></filter>
      </defs>

      <g className="lily-breathe">
        {PETALS.map((p, i) => (
          <g key={i} transform={`rotate(${p.a} 200 210)`}>
            <path className="petal" d={p.d} fill={`url(#${id}${p.back ? 'o' : 'i'})`} filter={`url(#${id}f)`}
              style={{ ['--pd' as string]: `${delayBase + p.delay}s` }} />
          </g>
        ))}
        {[60, 180, 300].map((a) => (
          <g key={`sp${a}`} transform={`rotate(${a} 200 210)`}>
            <path className="petal" d="M200,206 C198,170 198,120 200,92 C202,170 200,206Z" fill={`url(#${id}s)`} opacity="0.5"
              style={{ ['--pd' as string]: `${delayBase + 0.75}s` }} />
          </g>
        ))}
        <g className="lily-center">
          <circle cx="200" cy="210" r="26" fill={`url(#${id}t)`} />
          {STAMENS.map((s, i) => (
            <g key={i}>
              <line x1="200" y1="210" x2={s.x} y2={s.y} stroke="#dccdae" strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />
              <ellipse cx={s.x} cy={s.y} rx="3.4" ry="6.2" fill="#b56a2a" transform={`rotate(${s.deg} ${s.x} ${s.y})`} />
            </g>
          ))}
          <line x1="200" y1="210" x2="200" y2="176" stroke="#cbb98f" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="200" cy="174" r="3.6" fill="#9bbf6a" />
        </g>
      </g>
    </svg>
  )
}

/** Standalone flower with a warm halo behind it. */
export function Lily({ size = 320 }: { size?: number }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'grid', placeItems: 'center' }}>
      <div className="lily-glow" aria-hidden style={{
        position: 'absolute', inset: '-10%', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,238,206,0.5) 0%, rgba(255,214,166,0.18) 40%, rgba(255,200,150,0) 70%)',
      }} />
      <div style={{ position: 'relative' }}><Bloom size={size} /></div>
    </div>
  )
}
