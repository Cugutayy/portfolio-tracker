import { useRef, useEffect, useState, useCallback } from 'react'

interface Node {
  id: string; label: string; x: number; y: number; r: number
  type: 'center' | 'project' | 'tech'
  href?: string; sub?: string
}

const NODES: Node[] = [
  { id: 'name', label: 'S. Cagatay Sonmez', x: 50, y: 48, r: 38, type: 'center', sub: 'Sabanci University' },
  { id: 'portfolio', label: 'Portfolio Tracker', x: 22, y: 28, r: 26, type: 'project', href: '/tracker/', sub: '100K TL · 7 instruments' },
  { id: 'f1', label: 'F1 Predictor', x: 78, y: 28, r: 26, type: 'project', href: '#/f1', sub: 'Ensemble ML · OpenF1' },
  { id: 'soon', label: 'Coming Soon', x: 50, y: 82, r: 18, type: 'project', sub: 'TBA' },
  { id: 'react', label: 'React', x: 88, y: 56, r: 13, type: 'tech' },
  { id: 'ts', label: 'TypeScript', x: 90, y: 72, r: 13, type: 'tech' },
  { id: 'finance', label: 'Finance', x: 10, y: 56, r: 13, type: 'tech' },
  { id: 'ml', label: 'ML', x: 82, y: 12, r: 13, type: 'tech' },
  { id: 'chartjs', label: 'Chart.js', x: 8, y: 22, r: 11, type: 'tech' },
  { id: 'openf1', label: 'OpenF1', x: 92, y: 42, r: 11, type: 'tech' },
  { id: 'esg', label: 'ESG', x: 14, y: 72, r: 11, type: 'tech' },
  { id: 'api', label: 'Live API', x: 30, y: 68, r: 11, type: 'tech' },
  { id: 'python', label: 'Python', x: 70, y: 70, r: 11, type: 'tech' },
]

const EDGES: [string, string][] = [
  ['name', 'portfolio'], ['name', 'f1'], ['name', 'soon'],
  ['portfolio', 'finance'], ['portfolio', 'chartjs'], ['portfolio', 'esg'], ['portfolio', 'api'],
  ['f1', 'react'], ['f1', 'ml'], ['f1', 'openf1'], ['f1', 'ts'],
  ['soon', 'python'], ['soon', 'react'],
]

interface Props { dark: boolean; t: (k: string) => string }

export function InteractiveGraph({ dark, t }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const [offsets, setOffsets] = useState<Map<string, { dx: number, dy: number }>>(new Map())
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const rafRef = useRef(0)
  const floatRef = useRef<Map<string, { phase: number, speed: number, ampX: number, ampY: number }>>(new Map())

  // Init float parameters
  useEffect(() => {
    const m = new Map<string, { phase: number, speed: number, ampX: number, ampY: number }>()
    NODES.forEach(n => {
      m.set(n.id, {
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.4,
        ampX: n.type === 'center' ? 0.3 : n.type === 'project' ? 0.6 : 0.9,
        ampY: n.type === 'center' ? 0.2 : n.type === 'project' ? 0.5 : 0.8,
      })
    })
    floatRef.current = m
  }, [])

  // Animation loop
  useEffect(() => {
    let last = 0
    const tick = (t: number) => {
      rafRef.current = requestAnimationFrame(tick)
      if (t - last < 50) return // ~20fps is enough for subtle floating
      last = t

      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      const time = t / 1000

      const newOffsets = new Map<string, { dx: number, dy: number }>()
      NODES.forEach(node => {
        const f = floatRef.current.get(node.id)
        if (!f) return

        // Float
        let dx = Math.sin(time * f.speed + f.phase) * f.ampX
        let dy = Math.cos(time * f.speed * 0.7 + f.phase + 1) * f.ampY

        // Mouse repulsion (percentage based)
        if (mx > -900) {
          const mxPct = ((mx - rect.left) / rect.width) * 100
          const myPct = ((my - rect.top) / rect.height) * 100
          const ddx = node.x - mxPct
          const ddy = node.y - myPct
          const dist = Math.sqrt(ddx * ddx + ddy * ddy)
          if (dist < 20 && dist > 0) {
            const force = (20 - dist) / 20 * 2.5
            dx += (ddx / dist) * force
            dy += (ddy / dist) * force
          }
        }
        newOffsets.set(node.id, { dx, dy })
      })
      setOffsets(newOffsets)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { x: -1000, y: -1000 }
  }, [])

  const getPos = useCallback((id: string) => {
    const node = NODES.find(n => n.id === id)!
    const off = offsets.get(id) || { dx: 0, dy: 0 }
    return { x: node.x + off.dx, y: node.y + off.dy }
  }, [offsets])

  const edgeColor = dark ? 'rgba(255,255,255,.09)' : 'rgba(0,0,0,.07)'
  const edgeHover = dark ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.15)'

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        width: '100%', maxWidth: 960, margin: '0 auto',
        height: 'clamp(380px, 52vh, 560px)',
        position: 'relative', cursor: 'default',
      }}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
      >
        {/* Edges */}
        {EDGES.map(([a, b]) => {
          const pa = getPos(a), pb = getPos(b)
          const isHovered = hoveredNode === a || hoveredNode === b
          return (
            <line
              key={`${a}-${b}`}
              x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
              stroke={isHovered ? edgeHover : edgeColor}
              strokeWidth={isHovered ? 0.15 : 0.08}
              style={{ transition: 'stroke .3s, stroke-width .3s' }}
            />
          )
        })}

        {/* Nodes */}
        {NODES.map(node => {
          const pos = getPos(node.id)
          const isHovered = hoveredNode === node.id
          const isProject = node.type === 'project'
          const isCenter = node.type === 'center'
          const isTech = node.type === 'tech'

          const nodeColor = dark
            ? (isCenter ? 'rgba(255,255,255,.04)' : isProject ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.02)')
            : (isCenter ? 'rgba(0,0,0,.03)' : isProject ? 'rgba(0,0,0,.02)' : 'rgba(0,0,0,.015)')
          const borderColor = dark
            ? (isHovered ? 'rgba(255,255,255,.2)' : isCenter ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.05)')
            : (isHovered ? 'rgba(0,0,0,.15)' : isCenter ? 'rgba(0,0,0,.08)' : 'rgba(0,0,0,.04)')
          const textColor = dark
            ? (isCenter ? '#e4e0d8' : isProject ? '#b5b0a6' : '#7a756c')
            : (isCenter ? '#1c1c18' : isProject ? '#444' : '#888')
          const fontSize = isCenter ? 2.4 : isProject ? 1.6 : 1.1
          const subColor = dark ? '#7a756c' : '#999'

          return (
            <g
              key={node.id}
              style={{ cursor: node.href ? 'pointer' : 'default', transition: 'opacity .3s' }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => { if (node.href) window.location.href = node.href }}
            >
              {/* Background circle */}
              <circle
                cx={pos.x} cy={pos.y}
                r={isHovered ? node.r * 0.28 : node.r * 0.25}
                fill={nodeColor}
                stroke={borderColor}
                strokeWidth={0.12}
                style={{ transition: 'r .3s, fill .3s, stroke .3s' }}
              />
              {/* Hover glow */}
              {isHovered && (
                <circle
                  cx={pos.x} cy={pos.y}
                  r={node.r * 0.32}
                  fill="none"
                  stroke={dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)'}
                  strokeWidth={0.08}
                />
              )}
              {/* Dot indicator for projects */}
              {isProject && (
                <circle
                  cx={pos.x} cy={pos.y - (isCenter ? 3.5 : 2.5)}
                  r={0.4}
                  fill={node.id === 'portfolio' ? '#22c55e' : node.id === 'f1' ? '#e10600' : '#7a756c'}
                  opacity={isHovered ? 1 : 0.5}
                  style={{ transition: 'opacity .3s' }}
                />
              )}
              {/* Label */}
              <text
                x={pos.x} y={pos.y + (node.sub && !isTech ? -0.3 : 0.4)}
                fill={textColor}
                fontSize={fontSize}
                fontFamily={isCenter ? "'Newsreader', Georgia, serif" : isTech ? "'DM Mono', monospace" : "'Newsreader', Georgia, serif"}
                fontWeight={isCenter ? 300 : isProject ? 400 : 400}
                fontStyle={isCenter ? 'italic' : 'normal'}
                textAnchor="middle"
                letterSpacing={isTech ? '.04em' : isCenter ? '-.01em' : '0'}
                style={{ transition: 'fill .3s' }}
              >
                {node.label}
              </text>
              {/* Sub label */}
              {node.sub && !isTech && (
                <text
                  x={pos.x} y={pos.y + 1.6}
                  fill={subColor}
                  fontSize={0.85}
                  fontFamily="'DM Mono', monospace"
                  textAnchor="middle"
                  letterSpacing=".03em"
                  opacity={isHovered ? 0.8 : 0.4}
                  style={{ transition: 'opacity .3s' }}
                >
                  {node.sub}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
