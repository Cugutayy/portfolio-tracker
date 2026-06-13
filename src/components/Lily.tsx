/**
 * A blooming lily (Lilium) — the brand mark, rendered as an animated SVG.
 * Six tepals in two whorls (3 outer + 3 inner) unfurl from the flower base
 * with a staggered, slightly-overshooting bloom; the flower then breathes and
 * sways, lit from behind by a soft warm halo. Pure CSS keyframes drive it.
 */
const OUTER = 'M200,210 C171,171 161,116 191,72 C197,64 203,64 209,72 C239,116 229,171 200,210 Z'
const INNER = 'M200,210 C181,177 175,127 196,85 C198,80 202,80 204,85 C225,127 219,177 200,210 Z'

const PETALS: { d: string; a: number; delay: number; cls: string }[] = [
  // back whorl (outer, slightly darker) — appears first
  { d: OUTER, a: 0, delay: 0.0, cls: 'back' },
  { d: OUTER, a: 120, delay: 0.12, cls: 'back' },
  { d: OUTER, a: 240, delay: 0.24, cls: 'back' },
  // front whorl (inner, brighter) — interleaved
  { d: INNER, a: 60, delay: 0.4, cls: 'front' },
  { d: INNER, a: 180, delay: 0.52, cls: 'front' },
  { d: INNER, a: 300, delay: 0.64, cls: 'front' },
]

// six stamens (between petals) — filament + warm anther
const STAMENS = [30, 90, 150, 210, 270, 330].map((deg) => {
  const r = 40
  const rad = (deg * Math.PI) / 180
  return { x: 200 + r * Math.sin(rad), y: 210 - r * Math.cos(rad), deg }
})

export function Lily({ size = 320 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 400 400"
      role="img"
      aria-label="Açan zambak"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        {/* warm halo behind the flower */}
        <radialGradient id="lilyHalo" cx="50%" cy="52%" r="50%">
          <stop offset="0%" stopColor="rgba(255,238,206,0.55)" />
          <stop offset="38%" stopColor="rgba(255,214,166,0.20)" />
          <stop offset="100%" stopColor="rgba(255,200,150,0)" />
        </radialGradient>
        {/* outer tepal — cool cream */}
        <linearGradient id="petalOuter" x1="0" y1="0.1" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbf4e8" />
          <stop offset="48%" stopColor="#efe4d0" />
          <stop offset="100%" stopColor="#ddcdb2" />
        </linearGradient>
        {/* inner tepal — brighter, slight blush at base */}
        <linearGradient id="petalInner" x1="0" y1="0.05" x2="0" y2="1">
          <stop offset="0%" stopColor="#fffaf1" />
          <stop offset="55%" stopColor="#f8efe0" />
          <stop offset="100%" stopColor="#f0d9cf" />
        </linearGradient>
        {/* specular spine highlight */}
        <linearGradient id="spine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <radialGradient id="throat" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e9c45f" />
          <stop offset="60%" stopColor="#cf9a3f" />
          <stop offset="100%" stopColor="rgba(180,120,60,0)" />
        </radialGradient>
        <filter id="petalSoft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.5" />
        </filter>
      </defs>

      {/* halo */}
      <circle className="lily-glow" cx="200" cy="200" r="175" fill="url(#lilyHalo)" />

      {/* flower */}
      <g className="lily-breathe">
        {PETALS.map((p, i) => (
          <g key={i} transform={`rotate(${p.a} 200 210)`}>
            <path
              className="petal"
              d={p.d}
              fill={p.cls === 'back' ? 'url(#petalOuter)' : 'url(#petalInner)'}
              filter="url(#petalSoft)"
              style={{ ['--pd' as string]: `${p.delay}s` }}
            />
          </g>
        ))}
        {/* spine highlights on the front whorl */}
        {[60, 180, 300].map((a) => (
          <g key={`sp${a}`} transform={`rotate(${a} 200 210)`}>
            <path
              className="petal"
              d="M200,206 C198,170 198,120 200,92 C202,170 200,206Z"
              fill="url(#spine)"
              opacity="0.5"
              style={{ ['--pd' as string]: '0.75s' }}
            />
          </g>
        ))}

        {/* center — throat + stamens */}
        <g className="lily-center">
          <circle cx="200" cy="210" r="26" fill="url(#throat)" />
          {STAMENS.map((s, i) => (
            <g key={i}>
              <line x1="200" y1="210" x2={s.x} y2={s.y} stroke="#dccdae" strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />
              <ellipse cx={s.x} cy={s.y} rx="3.4" ry="6.2" fill="#b56a2a" transform={`rotate(${s.deg} ${s.x} ${s.y})`} />
            </g>
          ))}
          {/* pistil */}
          <line x1="200" y1="210" x2="200" y2="176" stroke="#cbb98f" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="200" cy="174" r="3.6" fill="#9bbf6a" />
        </g>
      </g>
    </svg>
  )
}
