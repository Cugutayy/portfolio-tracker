import { useRef, useEffect } from 'react'

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

// Pre-compute edge index pairs (avoid findIndex every frame)
const NODE_ID_MAP = new Map(INITIAL_NODES.map((n, i) => [n.id, i]))
const EDGE_INDICES = EDGES.map(([a, b]) => [NODE_ID_MAP.get(a)!, NODE_ID_MAP.get(b)!] as const)

const FLOAT_PARAMS = INITIAL_NODES.map((n, i) => ({
  phase: (i * 2.399) % (Math.PI * 2),
  speed: 0.3 + (i * 0.618) % 0.4,
  ampX: n.type === 'center' ? 0.3 : n.type === 'project' ? 0.6 : 0.9,
  ampY: n.type === 'center' ? 0.2 : n.type === 'project' ? 0.5 : 0.8,
}))

const DOT_COLORS: Record<string, string> = {
  portfolio: '#22c55e', f1: '#e10600', thesis: '#d45a3e',
}

const GLOW_COLORS: Record<string, string> = {
  portfolio: 'rgba(34,197,94,', f1: 'rgba(225,6,0,', thesis: 'rgba(212,90,62,',
}

const N = INITIAL_NODES.length

interface Props { dark: boolean; t: (k: string) => string }

export function InteractiveGraph({ dark }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // All mutable state lives in a single ref — ZERO React re-renders during interaction
  const stateRef = useRef({
    mx: -1000, my: -1000,
    hovered: null as string | null,
    drag: null as { idx: number; startX: number; startY: number; origX: number; origY: number; moved: boolean } | null,
    positions: INITIAL_NODES.map(n => ({ x: n.x, y: n.y })),
    cursor: 'default',
    raf: 0,
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const S = stateRef.current

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

    const smoothX = new Float64Array(N)
    const smoothY = new Float64Array(N)

    // ---- Hit-test (pure function, no allocations) ----
    const hitTest = (clientX: number, clientY: number, rect: DOMRect): number => {
      const mxPct = ((clientX - rect.left) / rect.width) * 100
      const myPct = ((clientY - rect.top) / rect.height) * 100
      for (let i = 0; i < N; i++) {
        const p = S.positions[i]
        const dx = p.x - mxPct, dy = p.y - myPct
        if (dx * dx + dy * dy < (INITIAL_NODES[i].r * 0.30) ** 2) return i
      }
      return -1
    }

    // ---- Cursor helper (direct DOM, no React) ----
    const setCursor = (c: string) => {
      if (S.cursor !== c) { S.cursor = c; container.style.cursor = c }
    }

    // ---- Native event handlers (bypass React synthetic events) ----
    const onMouseMove = (e: MouseEvent) => {
      S.mx = e.clientX; S.my = e.clientY
      const rect = container.getBoundingClientRect()

      if (S.drag) {
        const mxPct = ((e.clientX - rect.left) / rect.width) * 100
        const myPct = ((e.clientY - rect.top) / rect.height) * 100
        const dx = mxPct - S.drag.startX, dy = myPct - S.drag.startY
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) S.drag.moved = true
        S.positions[S.drag.idx] = {
          x: S.drag.origX + dx,
          y: S.drag.origY + dy,
        }
        setCursor('grabbing')
        return
      }

      const idx = hitTest(e.clientX, e.clientY, rect)
      S.hovered = idx >= 0 ? INITIAL_NODES[idx].id : null
      setCursor(idx >= 0 ? 'grab' : 'default')
    }

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      const rect = container.getBoundingClientRect()
      const idx = hitTest(e.clientX, e.clientY, rect)
      if (idx < 0) return
      const p = S.positions[idx]
      S.drag = {
        idx,
        startX: ((e.clientX - rect.left) / rect.width) * 100,
        startY: ((e.clientY - rect.top) / rect.height) * 100,
        origX: p.x, origY: p.y, moved: false,
      }
      setCursor('grabbing')
      e.preventDefault()
    }

    const onMouseUp = () => {
      if (!S.drag) return
      if (!S.drag.moved) {
        const node = INITIAL_NODES[S.drag.idx]
        if (node.href) window.location.href = node.href
      }
      S.drag = null
      setCursor('grab')
    }

    const onMouseLeave = () => {
      S.mx = -1000; S.my = -1000; S.hovered = null; S.drag = null
      setCursor('default')
    }

    container.addEventListener('mousemove', onMouseMove, { passive: true })
    container.addEventListener('mousedown', onMouseDown)
    container.addEventListener('mouseup', onMouseUp)
    container.addEventListener('mouseleave', onMouseLeave)

    // ---- Render loop ----
    const tick = (t: number) => {
      S.raf = requestAnimationFrame(tick)

      const w = canvas.width / dpr
      const h = canvas.height / dpr
      if (w === 0 || h === 0) return

      const time = t / 1000
      const isDark = dark
      const { hovered, drag, positions } = S
      const rect = container.getBoundingClientRect()

      // Compute positions
      const posX = new Float64Array(N)
      const posY = new Float64Array(N)

      for (let i = 0; i < N; i++) {
        const f = FLOAT_PARAMS[i]
        const pos = positions[i]

        if (drag && drag.idx === i) {
          posX[i] = pos.x / 100 * w
          posY[i] = pos.y / 100 * h
          smoothX[i] = 0; smoothY[i] = 0
          continue
        }

        let dx = Math.sin(time * f.speed + f.phase) * f.ampX
        let dy = Math.cos(time * f.speed * 0.7 + f.phase + 1) * f.ampY

        if (!drag && S.mx > -900) {
          const mxPct = ((S.mx - rect.left) / rect.width) * 100
          const myPct = ((S.my - rect.top) / rect.height) * 100
          const ddx = pos.x - mxPct, ddy = pos.y - myPct
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
      for (const [ai, bi] of EDGE_INDICES) {
        const isEdgeHovered = hovered === INITIAL_NODES[ai].id || hovered === INITIAL_NODES[bi].id
        const isEdgeDragged = drag && (drag.idx === ai || drag.idx === bi)

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
      for (let i = 0; i < N; i++) {
        const node = INITIAL_NODES[i]
        const px = posX[i], py = posY[i]
        const isHovered = hovered === node.id
        const isDragged = drag?.idx === i
        const isCenter = node.type === 'center'
        const isProject = node.type === 'project'
        const isTech = node.type === 'tech'
        const scale = isDragged ? 1.18 : isHovered ? 1.10 : 1
        const baseW = Math.min(w, 960)
        const rPx = node.r * 0.003 * baseW * scale

        // Glow
        if ((isDragged || isHovered) && isProject && GLOW_COLORS[node.id]) {
          const base = GLOW_COLORS[node.id]
          const grad = ctx.createRadialGradient(px, py, rPx * 0.8, px, py, rPx * 1.6)
          grad.addColorStop(0, base + (isDragged ? '0.15)' : '0.08)'))
          grad.addColorStop(1, base + '0)')
          ctx.beginPath()
          ctx.arc(px, py, rPx * 1.6, 0, Math.PI * 2)
          ctx.fillStyle = grad
          ctx.fill()
        }

        // Circle fill
        ctx.beginPath()
        ctx.arc(px, py, rPx, 0, Math.PI * 2)
        ctx.fillStyle = isDragged
          ? (isDark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.08)')
          : isDark
            ? (isCenter ? 'rgba(255,255,255,.08)' : isProject ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.04)')
            : (isCenter ? 'rgba(0,0,0,.06)' : isProject ? 'rgba(0,0,0,.05)' : 'rgba(0,0,0,.03)')
        ctx.fill()

        // Border
        ctx.strokeStyle = isDragged
          ? (isDark ? 'rgba(255,255,255,.50)' : 'rgba(0,0,0,.40)')
          : isHovered
            ? (isDark ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.28)')
            : isDark
              ? (isCenter ? 'rgba(255,255,255,.22)' : isProject ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.10)')
              : (isCenter ? 'rgba(0,0,0,.18)' : isProject ? 'rgba(0,0,0,.14)' : 'rgba(0,0,0,.08)')
        ctx.lineWidth = isDragged ? 2.5 : isCenter ? 2 : isProject ? 1.8 : 1.4
        ctx.stroke()

        // Dot indicator
        if (isProject && DOT_COLORS[node.id]) {
          ctx.beginPath()
          ctx.arc(px, py - rPx * 0.6, isDragged ? 4.5 : 3.5, 0, Math.PI * 2)
          ctx.fillStyle = DOT_COLORS[node.id]
          ctx.globalAlpha = isHovered || isDragged ? 1 : 0.7
          ctx.fill()
          ctx.globalAlpha = 1
        }

        // Label
        const fontSize = isCenter ? baseW * 0.030 : isProject ? baseW * 0.020 : baseW * 0.014
        ctx.font = isCenter
          ? `italic 600 ${fontSize}px 'Newsreader', Georgia, serif`
          : isTech
            ? `500 ${fontSize}px 'DM Mono', monospace`
            : `600 ${fontSize}px 'Newsreader', Georgia, serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        if (isDark) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 4 }

        ctx.fillStyle = isDark
          ? (isCenter ? '#f0ece4' : isProject ? '#ddd8cf' : '#a8a29e')
          : (isCenter ? '#1a1a16' : isProject ? '#2a2a2a' : '#666')
        ctx.fillText(node.label, px, node.sub && !isTech ? py - fontSize * 0.3 : py + fontSize * 0.05)

        if (isDark) ctx.restore()

        // Sub label
        if (node.sub && !isTech) {
          ctx.font = `500 ${Math.max(10, baseW * 0.011)}px 'DM Mono', monospace`
          ctx.globalAlpha = isHovered || isDragged ? 0.9 : 0.55
          ctx.fillStyle = isDark ? '#9a958c' : '#888'
          ctx.fillText(node.sub, px, py + fontSize * 0.65)
          ctx.globalAlpha = 1
        }
      }
    }

    S.raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(S.raf)
      ro.disconnect()
      container.removeEventListener('mousemove', onMouseMove)
      container.removeEventListener('mousedown', onMouseDown)
      container.removeEventListener('mouseup', onMouseUp)
      container.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [dark])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: 'clamp(400px, 55vh, 600px)',
        position: 'relative',
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
