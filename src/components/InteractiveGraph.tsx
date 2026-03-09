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

// Pre-compute float params once (deterministic per node index)
const FLOAT_PARAMS = NODES.map((n, i) => ({
  phase: (i * 2.399) % (Math.PI * 2), // golden angle spread
  speed: 0.3 + (i * 0.618) % 0.4,
  ampX: n.type === 'center' ? 0.3 : n.type === 'project' ? 0.6 : 0.9,
  ampY: n.type === 'center' ? 0.2 : n.type === 'project' ? 0.5 : 0.8,
}))

const DOT_COLORS: Record<string, string> = {
  portfolio: '#22c55e', f1: '#e10600',
}

interface Props { dark: boolean; t: (k: string) => string }

export function InteractiveGraph({ dark }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const hoveredRef = useRef<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const rafRef = useRef(0)
  const dprRef = useRef(1)

  // Canvas draw loop — no React state updates, pure imperative rendering
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    dprRef.current = dpr

    const resize = () => {
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    // Smoothed offsets — persisted across frames
    const smoothX = new Float64Array(NODES.length)
    const smoothY = new Float64Array(NODES.length)

    const tick = (t: number) => {
      rafRef.current = requestAnimationFrame(tick)

      const w = canvas.width / dpr
      const h = canvas.height / dpr
      if (w === 0 || h === 0) return

      const time = t / 1000
      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      const rect = container.getBoundingClientRect()
      const isDark = dark
      const hovered = hoveredRef.current

      // Compute positions
      const posX = new Float64Array(NODES.length)
      const posY = new Float64Array(NODES.length)

      for (let i = 0; i < NODES.length; i++) {
        const node = NODES[i]
        const f = FLOAT_PARAMS[i]

        // Float target
        let dx = Math.sin(time * f.speed + f.phase) * f.ampX
        let dy = Math.cos(time * f.speed * 0.7 + f.phase + 1) * f.ampY

        // Mouse repulsion
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

        // Smooth interpolation (lerp toward target)
        smoothX[i] += (dx - smoothX[i]) * 0.08
        smoothY[i] += (dy - smoothY[i]) * 0.08

        posX[i] = (node.x + smoothX[i]) / 100 * w
        posY[i] = (node.y + smoothY[i]) / 100 * h
      }

      // Clear
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      // Draw edges
      for (const [a, b] of EDGES) {
        const ai = NODES.findIndex(n => n.id === a)
        const bi = NODES.findIndex(n => n.id === b)
        const isEdgeHovered = hovered === a || hovered === b
        ctx.beginPath()
        ctx.moveTo(posX[ai], posY[ai])
        ctx.lineTo(posX[bi], posY[bi])
        ctx.strokeStyle = isEdgeHovered
          ? (isDark ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.15)')
          : (isDark ? 'rgba(255,255,255,.09)' : 'rgba(0,0,0,.07)')
        ctx.lineWidth = isEdgeHovered ? 1.2 : 0.6
        ctx.stroke()
      }

      // Draw nodes
      for (let i = 0; i < NODES.length; i++) {
        const node = NODES[i]
        const px = posX[i], py = posY[i]
        const isHovered = hovered === node.id
        const isCenter = node.type === 'center'
        const isProject = node.type === 'project'
        const isTech = node.type === 'tech'
        const rPx = node.r * 0.0025 * w * (isHovered ? 1.12 : 1)

        // Background circle
        ctx.beginPath()
        ctx.arc(px, py, rPx, 0, Math.PI * 2)
        ctx.fillStyle = isDark
          ? (isCenter ? 'rgba(255,255,255,.04)' : isProject ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.02)')
          : (isCenter ? 'rgba(0,0,0,.03)' : isProject ? 'rgba(0,0,0,.02)' : 'rgba(0,0,0,.015)')
        ctx.fill()
        ctx.strokeStyle = isDark
          ? (isHovered ? 'rgba(255,255,255,.2)' : isCenter ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.05)')
          : (isHovered ? 'rgba(0,0,0,.15)' : isCenter ? 'rgba(0,0,0,.08)' : 'rgba(0,0,0,.04)')
        ctx.lineWidth = 1
        ctx.stroke()

        // Hover glow
        if (isHovered) {
          ctx.beginPath()
          ctx.arc(px, py, rPx * 1.15, 0, Math.PI * 2)
          ctx.strokeStyle = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)'
          ctx.lineWidth = 0.6
          ctx.stroke()
        }

        // Dot indicator for projects
        if (isProject && DOT_COLORS[node.id]) {
          ctx.beginPath()
          ctx.arc(px, py - rPx * 0.65, 3, 0, Math.PI * 2)
          ctx.fillStyle = DOT_COLORS[node.id]
          ctx.globalAlpha = isHovered ? 1 : 0.5
          ctx.fill()
          ctx.globalAlpha = 1
        }

        // Label
        const fontSize = isCenter ? w * 0.024 : isProject ? w * 0.016 : w * 0.011
        ctx.font = isCenter
          ? `italic 300 ${fontSize}px 'Newsreader', Georgia, serif`
          : isTech
            ? `400 ${fontSize}px 'DM Mono', monospace`
            : `400 ${fontSize}px 'Newsreader', Georgia, serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = isDark
          ? (isCenter ? '#e4e0d8' : isProject ? '#b5b0a6' : '#7a756c')
          : (isCenter ? '#1c1c18' : isProject ? '#444' : '#888')
        const labelY = node.sub && !isTech ? py - fontSize * 0.25 : py + fontSize * 0.1
        ctx.fillText(node.label, px, labelY)

        // Sub label
        if (node.sub && !isTech) {
          const subSize = Math.max(8, w * 0.0085)
          ctx.font = `400 ${subSize}px 'DM Mono', monospace`
          ctx.globalAlpha = isHovered ? 0.8 : 0.4
          ctx.fillStyle = isDark ? '#7a756c' : '#999'
          ctx.fillText(node.sub, px, py + fontSize * 0.7)
          ctx.globalAlpha = 1
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [dark])

  // Hit-test on mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY }
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const mxPct = ((e.clientX - rect.left) / rect.width) * 100
    const myPct = ((e.clientY - rect.top) / rect.height) * 100

    let found: string | null = null
    // Check project/center nodes first (larger), then tech
    for (let i = 0; i < NODES.length; i++) {
      const node = NODES[i]
      const dx = node.x - mxPct
      const dy = node.y - myPct
      const dist = Math.sqrt(dx * dx + dy * dy)
      const hitR = node.r * 0.27
      if (dist < hitR) { found = node.id; break }
    }
    if (found !== hoveredRef.current) {
      hoveredRef.current = found
      setHoveredNode(found)
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { x: -1000, y: -1000 }
    hoveredRef.current = null
    setHoveredNode(null)
  }, [])

  const handleClick = useCallback(() => {
    const h = hoveredRef.current
    if (!h) return
    const node = NODES.find(n => n.id === h)
    if (node?.href) window.location.href = node.href
  }, [])

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{
        width: '100%', maxWidth: 960, margin: '0 auto',
        height: 'clamp(380px, 52vh, 560px)',
        position: 'relative',
        cursor: hoveredNode && NODES.find(n => n.id === hoveredNode)?.href ? 'pointer' : 'default',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  )
}
