import { useRef, useEffect, useState, useCallback } from 'react'

interface Node {
  id: string; label: string; x: number; y: number; r: number
  type: 'center' | 'project' | 'tech'
  href?: string; sub?: string
}

const INITIAL_NODES: Node[] = [
  { id: 'name', label: 'S. Cagatay Sonmez', x: 50, y: 45, r: 42, type: 'center' },
  { id: 'portfolio', label: 'Portfolio Tracker', x: 22, y: 25, r: 30, type: 'project', href: '/tracker/', sub: '100K TL · 7 instruments' },
  { id: 'f1', label: 'F1 Predictor', x: 78, y: 25, r: 30, type: 'project', href: '#/f1', sub: 'Ensemble ML · OpenF1' },
  { id: 'thesis', label: 'Tez Konusu', x: 50, y: 80, r: 26, type: 'project', href: '/tez/', sub: '209 IPO · BIST 2020-2025' },
  { id: 'react', label: 'React', x: 88, y: 54, r: 15, type: 'tech' },
  { id: 'ts', label: 'TypeScript', x: 90, y: 70, r: 15, type: 'tech' },
  { id: 'finance', label: 'Finance', x: 10, y: 54, r: 15, type: 'tech' },
  { id: 'ml', label: 'ML', x: 82, y: 10, r: 15, type: 'tech' },
  { id: 'chartjs', label: 'Chart.js', x: 8, y: 20, r: 14, type: 'tech' },
  { id: 'openf1', label: 'OpenF1', x: 92, y: 40, r: 14, type: 'tech' },
  { id: 'esg', label: 'ESG', x: 14, y: 70, r: 14, type: 'tech' },
  { id: 'api', label: 'Live API', x: 30, y: 66, r: 14, type: 'tech' },
  { id: 'python', label: 'Python', x: 70, y: 68, r: 14, type: 'tech' },
  { id: 'streamlit', label: 'Streamlit', x: 36, y: 80, r: 14, type: 'tech' },
]

const EDGES: [string, string][] = [
  ['name', 'portfolio'], ['name', 'f1'], ['name', 'thesis'],
  ['portfolio', 'finance'], ['portfolio', 'chartjs'], ['portfolio', 'esg'], ['portfolio', 'api'],
  ['f1', 'react'], ['f1', 'ml'], ['f1', 'openf1'], ['f1', 'ts'],
  ['thesis', 'python'], ['thesis', 'streamlit'],
]

// Pre-compute float params once (deterministic per node index)
const FLOAT_PARAMS = INITIAL_NODES.map((n, i) => ({
  phase: (i * 2.399) % (Math.PI * 2),
  speed: 0.3 + (i * 0.618) % 0.4,
  ampX: n.type === 'center' ? 0.3 : n.type === 'project' ? 0.6 : 0.9,
  ampY: n.type === 'center' ? 0.2 : n.type === 'project' ? 0.5 : 0.8,
}))

const DOT_COLORS: Record<string, string> = {
  portfolio: '#22c55e', f1: '#e10600', thesis: '#d45a3e',
}

// Accent glow colors for project nodes
const GLOW_COLORS: Record<string, string> = {
  portfolio: 'rgba(34,197,94,', f1: 'rgba(225,6,0,', thesis: 'rgba(212,90,62,',
}

interface Props { dark: boolean; t: (k: string) => string }

export function InteractiveGraph({ dark }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const hoveredRef = useRef<string | null>(null)
  const [cursorStyle, setCursorStyle] = useState<string>('default')
  const rafRef = useRef(0)
  const dprRef = useRef(1)

  // Dragging state
  const dragRef = useRef<{
    nodeIdx: number; startX: number; startY: number
    origX: number; origY: number; moved: boolean
  } | null>(null)
  const nodePositions = useRef(INITIAL_NODES.map(n => ({ x: n.x, y: n.y })))

  // Canvas draw loop
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

    const smoothX = new Float64Array(INITIAL_NODES.length)
    const smoothY = new Float64Array(INITIAL_NODES.length)

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
      const dragging = dragRef.current
      const positions = nodePositions.current

      // Compute positions
      const posX = new Float64Array(INITIAL_NODES.length)
      const posY = new Float64Array(INITIAL_NODES.length)

      for (let i = 0; i < INITIAL_NODES.length; i++) {
        const node = INITIAL_NODES[i]
        const f = FLOAT_PARAMS[i]
        const pos = positions[i]

        // If this node is being dragged, use direct position
        if (dragging && dragging.nodeIdx === i) {
          posX[i] = pos.x / 100 * w
          posY[i] = pos.y / 100 * h
          smoothX[i] = 0
          smoothY[i] = 0
          continue
        }

        // Float target
        let dx = Math.sin(time * f.speed + f.phase) * f.ampX
        let dy = Math.cos(time * f.speed * 0.7 + f.phase + 1) * f.ampY

        // Mouse repulsion (only when not dragging any node)
        if (!dragging && mx > -900) {
          const mxPct = ((mx - rect.left) / rect.width) * 100
          const myPct = ((my - rect.top) / rect.height) * 100
          const ddx = pos.x - mxPct
          const ddy = pos.y - myPct
          const dist = Math.sqrt(ddx * ddx + ddy * ddy)
          if (dist < 20 && dist > 0) {
            const force = (20 - dist) / 20 * 2.5
            dx += (ddx / dist) * force
            dy += (ddy / dist) * force
          }
        }

        smoothX[i] += (dx - smoothX[i]) * 0.08
        smoothY[i] += (dy - smoothY[i]) * 0.08

        posX[i] = (pos.x + smoothX[i]) / 100 * w
        posY[i] = (pos.y + smoothY[i]) / 100 * h
      }

      // Clear
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      // Draw edges
      for (const [a, b] of EDGES) {
        const ai = INITIAL_NODES.findIndex(n => n.id === a)
        const bi = INITIAL_NODES.findIndex(n => n.id === b)
        const isEdgeHovered = hovered === a || hovered === b
        const isEdgeDragged = dragging && (dragging.nodeIdx === ai || dragging.nodeIdx === bi)

        ctx.beginPath()
        ctx.moveTo(posX[ai], posY[ai])
        ctx.lineTo(posX[bi], posY[bi])
        ctx.strokeStyle = isEdgeDragged
          ? (isDark ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.25)')
          : isEdgeHovered
            ? (isDark ? 'rgba(255,255,255,.30)' : 'rgba(0,0,0,.22)')
            : (isDark ? 'rgba(255,255,255,.15)' : 'rgba(0,0,0,.12)')
        ctx.lineWidth = isEdgeDragged ? 2 : isEdgeHovered ? 1.8 : 1.2
        ctx.stroke()
      }

      // Draw nodes
      for (let i = 0; i < INITIAL_NODES.length; i++) {
        const node = INITIAL_NODES[i]
        const px = posX[i], py = posY[i]
        const isHovered = hovered === node.id
        const isDragged = dragging?.nodeIdx === i
        const isCenter = node.type === 'center'
        const isProject = node.type === 'project'
        const isTech = node.type === 'tech'
        const scale = isDragged ? 1.18 : isHovered ? 1.10 : 1
        const rPx = node.r * 0.003 * w * scale

        // Outer glow for dragged/hovered project nodes
        if ((isDragged || isHovered) && isProject && GLOW_COLORS[node.id]) {
          const glowBase = GLOW_COLORS[node.id]
          const grad = ctx.createRadialGradient(px, py, rPx * 0.8, px, py, rPx * 1.6)
          grad.addColorStop(0, glowBase + (isDragged ? '0.15)' : '0.08)'))
          grad.addColorStop(1, glowBase + '0)')
          ctx.beginPath()
          ctx.arc(px, py, rPx * 1.6, 0, Math.PI * 2)
          ctx.fillStyle = grad
          ctx.fill()
        }

        // Background circle — more visible fills
        ctx.beginPath()
        ctx.arc(px, py, rPx, 0, Math.PI * 2)
        if (isDragged) {
          ctx.fillStyle = isDark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.08)'
        } else {
          ctx.fillStyle = isDark
            ? (isCenter ? 'rgba(255,255,255,.08)' : isProject ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.04)')
            : (isCenter ? 'rgba(0,0,0,.06)' : isProject ? 'rgba(0,0,0,.05)' : 'rgba(0,0,0,.03)')
        }
        ctx.fill()

        // Border — stronger strokes
        ctx.strokeStyle = isDragged
          ? (isDark ? 'rgba(255,255,255,.50)' : 'rgba(0,0,0,.40)')
          : isHovered
            ? (isDark ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.28)')
            : isDark
              ? (isCenter ? 'rgba(255,255,255,.22)' : isProject ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.10)')
              : (isCenter ? 'rgba(0,0,0,.18)' : isProject ? 'rgba(0,0,0,.14)' : 'rgba(0,0,0,.08)')
        ctx.lineWidth = isDragged ? 2.5 : isCenter ? 2 : isProject ? 1.8 : 1.4
        ctx.stroke()

        // Dot indicator for projects
        if (isProject && DOT_COLORS[node.id]) {
          const dotR = isDragged ? 4.5 : 3.5
          ctx.beginPath()
          ctx.arc(px, py - rPx * 0.6, dotR, 0, Math.PI * 2)
          ctx.fillStyle = DOT_COLORS[node.id]
          ctx.globalAlpha = isHovered || isDragged ? 1 : 0.7
          ctx.fill()
          ctx.globalAlpha = 1
        }

        // Label — bigger, bolder fonts
        const fontSize = isCenter ? w * 0.030 : isProject ? w * 0.020 : w * 0.014
        ctx.font = isCenter
          ? `italic 600 ${fontSize}px 'Newsreader', Georgia, serif`
          : isTech
            ? `500 ${fontSize}px 'DM Mono', monospace`
            : `600 ${fontSize}px 'Newsreader', Georgia, serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // Text shadow for readability
        if (isDark) {
          ctx.save()
          ctx.shadowColor = 'rgba(0,0,0,.6)'
          ctx.shadowBlur = 4
        }

        ctx.fillStyle = isDark
          ? (isCenter ? '#f0ece4' : isProject ? '#ddd8cf' : '#a8a29e')
          : (isCenter ? '#1a1a16' : isProject ? '#2a2a2a' : '#666')
        const labelY = node.sub && !isTech ? py - fontSize * 0.3 : py + fontSize * 0.05
        ctx.fillText(node.label, px, labelY)

        if (isDark) ctx.restore()

        // Sub label — more readable
        if (node.sub && !isTech) {
          const subSize = Math.max(10, w * 0.011)
          ctx.font = `500 ${subSize}px 'DM Mono', monospace`
          ctx.globalAlpha = isHovered || isDragged ? 0.9 : 0.55
          ctx.fillStyle = isDark ? '#9a958c' : '#888'
          ctx.fillText(node.sub, px, py + fontSize * 0.65)
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

  // Hit-test helper
  const hitTest = useCallback((clientX: number, clientY: number): number => {
    const container = containerRef.current
    if (!container) return -1
    const rect = container.getBoundingClientRect()
    const mxPct = ((clientX - rect.left) / rect.width) * 100
    const myPct = ((clientY - rect.top) / rect.height) * 100
    const positions = nodePositions.current

    for (let i = 0; i < INITIAL_NODES.length; i++) {
      const pos = positions[i]
      const dx = pos.x - mxPct
      const dy = pos.y - myPct
      const dist = Math.sqrt(dx * dx + dy * dy)
      const hitR = INITIAL_NODES[i].r * 0.30
      if (dist < hitR) return i
    }
    return -1
  }, [])

  // Mouse move — hover detection + dragging
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY }
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()

    // Handle dragging
    const drag = dragRef.current
    if (drag) {
      const mxPct = ((e.clientX - rect.left) / rect.width) * 100
      const myPct = ((e.clientY - rect.top) / rect.height) * 100
      const dx = mxPct - drag.startX
      const dy = myPct - drag.startY
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) drag.moved = true
      nodePositions.current[drag.nodeIdx] = {
        x: Math.max(5, Math.min(95, drag.origX + dx)),
        y: Math.max(5, Math.min(95, drag.origY + dy)),
      }
      setCursorStyle('grabbing')
      return
    }

    // Hover detection
    const idx = hitTest(e.clientX, e.clientY)
    const nodeId = idx >= 0 ? INITIAL_NODES[idx].id : null

    if (nodeId !== hoveredRef.current) {
      hoveredRef.current = nodeId
    }

    if (idx >= 0) {
      setCursorStyle('grab')
    } else {
      setCursorStyle('default')
    }
  }, [hitTest])

  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { x: -1000, y: -1000 }
    hoveredRef.current = null
    if (dragRef.current) {
      dragRef.current = null
    }
    setCursorStyle('default')
  }, [])

  // Mouse down — start dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return // left click only
    const idx = hitTest(e.clientX, e.clientY)
    if (idx < 0) return

    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const mxPct = ((e.clientX - rect.left) / rect.width) * 100
    const myPct = ((e.clientY - rect.top) / rect.height) * 100
    const pos = nodePositions.current[idx]

    dragRef.current = {
      nodeIdx: idx,
      startX: mxPct,
      startY: myPct,
      origX: pos.x,
      origY: pos.y,
      moved: false,
    }
    setCursorStyle('grabbing')
    e.preventDefault()
  }, [hitTest])

  // Mouse up — end drag or navigate
  const handleMouseUp = useCallback(() => {
    const drag = dragRef.current
    if (!drag) return

    // If barely moved, treat as a click → navigate
    if (!drag.moved) {
      const node = INITIAL_NODES[drag.nodeIdx]
      if (node.href) window.location.href = node.href
    }

    dragRef.current = null
    setCursorStyle('grab')
  }, [])

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{
        width: '100%', maxWidth: 960, margin: '0 auto',
        height: 'clamp(400px, 55vh, 600px)',
        position: 'relative',
        cursor: cursorStyle,
        userSelect: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  )
}
