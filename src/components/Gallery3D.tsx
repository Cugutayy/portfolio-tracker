import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import * as THREE from 'three'

// ═══════════════════════════════════════════════════
// Gallery3D — our own walkable museum hall, built in Three.js.
// Paintings are hung on the walls using OUR high-res textures (unlit → always
// true-colour and razor sharp, independent of scene lighting).
// Controls (intentionally simple to avoid the disorientation of generic 3D viewers):
//   • Drag        → look around
//   • W A S D / ↑↓←→ or on-screen pad → walk
//   • Click a painting → glide to stand directly in front of it + open its card
//   • Reset      → return to the entrance
// ═══════════════════════════════════════════════════

export type GalleryArt = {
  id: string; title: string; artist: string; year: string; museum: string; medium: string;
  thumb: string; story?: string
}

// Derive a sharp 1920px texture from the 960px grid thumbnail (Wikimedia only serves specific
// width buckets — 960/1920/3840 are valid, 1600/2560 are not — and 1920 keeps memory sane vs 3840).
const texUrl = (thumb: string) =>
  thumb.includes('/960px-') ? thumb.replace('/960px-', '/1920px-') : thumb

export type GalleryVariant = 'gallery' | 'archaeo'

// Per-variant palette so each museum reads like itself: a warm orientalist salon
// (paintings) vs. a cool limestone archaeology hall (sculptures & sarcophagi).
const PALETTES: Record<GalleryVariant, {
  bg: number; wall: number; floor: number; ceil: number; trim: number;
  carpet: number; carpetEdge: number; stone: number; frame: number;
  hemiSky: number; hemiGround: number; lamp: number; spot: number; decor: 'plant' | 'column'
}> = {
  gallery: {
    bg: 0x1c1512, wall: 0x4a3f38, floor: 0x2c241f, ceil: 0x1c1715, trim: 0x8a6f33,
    carpet: 0x5a1d20, carpetEdge: 0x8a6f33, stone: 0x5a5048, frame: 0x9c7b32,
    hemiSky: 0xfff2dc, hemiGround: 0x20140c, lamp: 0xffe6c0, spot: 0xfff3df, decor: 'plant',
  },
  archaeo: {
    bg: 0x15171b, wall: 0x736a5e, floor: 0x3b3c3e, ceil: 0x1a1c20, trim: 0x9aa0a8,
    carpet: 0x4a4742, carpetEdge: 0x8f8a7e, stone: 0x837a6c, frame: 0x7c6a44,
    hemiSky: 0xe6ecf6, hemiGround: 0x161410, lamp: 0xe9f0ff, spot: 0xf2f5ff, decor: 'column',
  },
}

export function Gallery3D({ items, variant = 'gallery' }: { items: GalleryArt[]; variant?: GalleryVariant }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [helpOpen, setHelpOpen] = useState(true)
  const [loaded, setLoaded] = useState(false)
  // imperative bridge into the render loop (set up inside the effect)
  const api = useRef<{
    setMove: (dir: 'f' | 'b' | 'l' | 'r', on: boolean) => void
    goTo: (i: number) => void
    reset: () => void
  } | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    if (items.length === 0) return

    const W = () => mount.clientWidth || window.innerWidth
    const H = () => mount.clientHeight || window.innerHeight

    // ── renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(W(), H())
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab'
    mount.appendChild(renderer.domElement)
    const maxAniso = renderer.capabilities.getMaxAnisotropy()

    const P = PALETTES[variant]

    // ── scene & camera ──
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(P.bg)
    scene.fog = new THREE.Fog(P.bg, 16, 52)

    const camera = new THREE.PerspectiveCamera(62, W() / H(), 0.1, 100)
    const EYE = 1.62
    camera.position.set(0, EYE, 4)

    // ── hall dimensions ──
    const SPACING = 5.2                 // distance between successive paintings down the hall
    const HALF_W = 4.2                  // half hall-width (walls at ±HALF_W)
    const WALL_H = 4.6
    const perSide = Math.ceil(items.length / 2)
    const hallEndZ = -(perSide * SPACING + 2.5)   // far wall
    const hallStartZ = 6                          // near wall (behind the camera)
    const hallLen = hallStartZ - hallEndZ
    const hallMidZ = (hallStartZ + hallEndZ) / 2

    // ── procedural textures — give every surface real material life ──
    const texPool: THREE.Texture[] = []
    const hx = (n: number) => '#' + n.toString(16).padStart(6, '0')
    const makeTex = (
      size: number, draw: (c: CanvasRenderingContext2D, s: number) => void, rx = 1, ry = 1,
    ) => {
      const cv = document.createElement('canvas'); cv.width = cv.height = size
      const ctx = cv.getContext('2d')!
      draw(ctx, size)
      const t = new THREE.CanvasTexture(cv)
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.repeat.set(rx, ry)
      t.anisotropy = maxAniso
      t.colorSpace = THREE.SRGBColorSpace
      texPool.push(t)
      return t
    }
    // soft monochrome noise overlay (adds grain so flats don't look like plastic)
    const grain = (ctx: CanvasRenderingContext2D, s: number, alpha: number) => {
      for (let i = 0; i < s * s * 0.30; i++) {
        const x = Math.random() * s, y = Math.random() * s
        ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${Math.random() * alpha})`
        ctx.fillRect(x, y, 1, 1)
      }
    }

    // FLOOR — herringbone parquet (salon) / veined marble tiles (archaeo)
    const floorTex = variant === 'archaeo'
      ? makeTex(512, (c, s) => {
          const tiles = 2, t = s / tiles
          for (let r = 0; r < tiles; r++) for (let col = 0; col < tiles; col++) {
            const light = (r + col) % 2 === 0
            c.fillStyle = light ? '#cdc9c0' : '#b3aea4'
            c.fillRect(col * t, r * t, t, t)
            // marble veins
            c.strokeStyle = light ? 'rgba(120,118,112,.35)' : 'rgba(90,88,82,.4)'
            c.lineWidth = 1.4
            for (let v = 0; v < 5; v++) {
              c.beginPath(); c.moveTo(col * t + Math.random() * t, r * t)
              for (let y = 0; y < t; y += 14) c.lineTo(col * t + Math.random() * t, r * t + y)
              c.stroke()
            }
          }
          c.strokeStyle = 'rgba(40,40,40,.5)'; c.lineWidth = 3
          for (let i = 0; i <= tiles; i++) { c.beginPath(); c.moveTo(i * t, 0); c.lineTo(i * t, s); c.stroke(); c.beginPath(); c.moveTo(0, i * t); c.lineTo(s, i * t); c.stroke() }
          grain(c, s, 0.05)
        }, 6, Math.max(6, perSide * 2))
      : makeTex(512, (c, s) => {
          c.fillStyle = '#2c241f'; c.fillRect(0, 0, s, s)
          const pw = s / 4, ph = s / 8
          for (let r = 0; r < 8; r++) for (let col = 0; col < 4; col++) {
            const off = r % 2 ? pw / 2 : 0
            const x = col * pw + off, y = r * ph
            const shade = 0x35 + Math.floor(Math.random() * 0x14)
            c.fillStyle = hx((shade << 16) | ((shade - 8) << 8) | (shade - 16))
            c.fillRect(x, y, pw - 2, ph - 2)
            // wood grain streaks
            c.strokeStyle = 'rgba(20,12,6,.25)'; c.lineWidth = 1
            for (let g = 0; g < 3; g++) { c.beginPath(); c.moveTo(x, y + Math.random() * ph); c.lineTo(x + pw, y + Math.random() * ph); c.stroke() }
          }
          grain(c, s, 0.06)
        }, 4, Math.max(8, perSide * 3))

    // WALL — fabric-weave plaster (salon) / dressed limestone ashlar (archaeo)
    const wallTex = variant === 'archaeo'
      ? makeTex(512, (c, s) => {
          c.fillStyle = hx(P.wall); c.fillRect(0, 0, s, s)
          const bh = s / 6
          for (let r = 0; r < 6; r++) {
            const off = r % 2 ? s / 6 : 0
            for (let x = -s; x < s; x += s / 3) {
              const sh = 0x68 + Math.floor(Math.random() * 0x18)
              c.fillStyle = hx((sh << 16) | ((sh - 6) << 8) | (sh - 18))
              c.fillRect(x + off + 1, r * bh + 1, s / 3 - 2, bh - 2)
            }
          }
          grain(c, s, 0.07)
        }, 4, 2)
      : makeTex(512, (c, s) => {
          c.fillStyle = hx(P.wall); c.fillRect(0, 0, s, s)
          // tall damask-ish panel framing
          c.strokeStyle = 'rgba(138,111,51,.16)'; c.lineWidth = 4
          c.strokeRect(s * 0.12, s * 0.08, s * 0.76, s * 0.84)
          c.strokeStyle = 'rgba(138,111,51,.10)'; c.lineWidth = 2
          c.strokeRect(s * 0.17, s * 0.13, s * 0.66, s * 0.74)
          grain(c, s, 0.09)
        }, 3, 1)

    // CARPET — ornamental runner with medallion border
    const carpetTex = makeTex(256, (c, s) => {
      c.fillStyle = hx(P.carpet); c.fillRect(0, 0, s, s)
      const edge = hx(P.carpetEdge)
      c.strokeStyle = edge; c.lineWidth = 10; c.strokeRect(14, 14, s - 28, s - 28)
      c.lineWidth = 3; c.strokeRect(30, 30, s - 60, s - 60)
      // central medallion
      c.strokeStyle = edge; c.lineWidth = 4
      c.beginPath(); c.ellipse(s / 2, s / 2, s * 0.18, s * 0.30, 0, 0, Math.PI * 2); c.stroke()
      c.beginPath(); c.ellipse(s / 2, s / 2, s * 0.10, s * 0.20, 0, 0, Math.PI * 2); c.stroke()
      // corner motifs
      const dot = (x: number, y: number) => { c.fillStyle = edge; c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill() }
      dot(40, 40); dot(s - 40, 40); dot(40, s - 40); dot(s - 40, s - 40)
      grain(c, s, 0.05)
    }, 1, Math.max(4, perSide))

    // ── materials for the room ──
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: wallTex, roughness: 0.9, metalness: 0 })
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: floorTex, roughness: variant === 'archaeo' ? 0.35 : 0.5, metalness: variant === 'archaeo' ? 0.15 : 0.1 })
    const ceilMat = new THREE.MeshStandardMaterial({ color: P.ceil, roughness: 1, metalness: 0 })

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, hallLen), floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.set(0, 0, hallMidZ)
    scene.add(floor)

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, hallLen), ceilMat)
    ceil.rotation.x = Math.PI / 2
    ceil.position.set(0, WALL_H, hallMidZ)
    scene.add(ceil)

    const wallL = new THREE.Mesh(new THREE.PlaneGeometry(hallLen, WALL_H), wallMat)
    wallL.rotation.y = Math.PI / 2
    wallL.position.set(-HALF_W, WALL_H / 2, hallMidZ)
    scene.add(wallL)

    const wallR = new THREE.Mesh(new THREE.PlaneGeometry(hallLen, WALL_H), wallMat)
    wallR.rotation.y = -Math.PI / 2
    wallR.position.set(HALF_W, WALL_H / 2, hallMidZ)
    scene.add(wallR)

    const wallFar = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, WALL_H), wallMat)
    wallFar.position.set(0, WALL_H / 2, hallEndZ)
    scene.add(wallFar)

    const wallNear = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, WALL_H), wallMat)
    wallNear.rotation.y = Math.PI
    wallNear.position.set(0, WALL_H / 2, hallStartZ)
    scene.add(wallNear)

    // skirting / a subtle base line along each wall
    const trimMat = new THREE.MeshStandardMaterial({ color: P.trim, roughness: 0.5, metalness: 0.4 })
    ;[-HALF_W, HALF_W].forEach((x) => {
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, hallLen), trimMat)
      trim.position.set(x - Math.sign(x) * 0.03, 0.09, hallMidZ)
      scene.add(trim)
    })

    // ── lighting (ambiance only; paintings are unlit so they stay true-colour) ──
    scene.add(new THREE.HemisphereLight(P.hemiSky, P.hemiGround, variant === 'archaeo' ? 0.95 : 0.85))
    scene.add(new THREE.AmbientLight(0xffffff, variant === 'archaeo' ? 0.5 : 0.42))
    const ceilGlow = new THREE.PointLight(P.lamp, 0.7, 0, 1.4)
    ceilGlow.position.set(0, WALL_H - 0.4, hallStartZ - 2)
    scene.add(ceilGlow)
    // a soft warm key from the entrance so the hall has depth & direction
    const keyLight = new THREE.DirectionalLight(P.lamp, variant === 'archaeo' ? 0.35 : 0.45)
    keyLight.position.set(2.5, WALL_H, hallStartZ)
    scene.add(keyLight)

    // ── paintings ──
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')
    const raycastTargets: THREE.Mesh[] = []
    const frontSpots: { pos: THREE.Vector3; look: THREE.Vector3 }[] = []
    const disposables: { dispose: () => void }[] = []
    let pending = items.length

    // ════ furniture & living decor — so the hall reads as a real museum, not an empty box ════
    const mk = <T extends THREE.Material>(m: T): T => { disposables.push(m); return m }
    const addMesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, ry = 0) => {
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(x, y, z); mesh.rotation.y = ry
      scene.add(mesh); disposables.push(geo)
      return mesh
    }
    const goldMat    = mk(new THREE.MeshStandardMaterial({ color: P.frame, roughness: 0.4, metalness: variant === 'archaeo' ? 0.25 : 0.6 }))
    const woodMat    = mk(new THREE.MeshStandardMaterial({ color: variant === 'archaeo' ? 0x4f4a42 : 0x37271b, roughness: 0.55, metalness: 0.15 }))
    const leatherMat = mk(new THREE.MeshStandardMaterial({ color: variant === 'archaeo' ? 0x6b6458 : 0x5e2a23, roughness: 0.6, metalness: 0.05 }))
    const stoneMat   = mk(new THREE.MeshStandardMaterial({ color: P.stone, roughness: 0.85, metalness: 0.05 }))
    const bronzeMat  = mk(new THREE.MeshStandardMaterial({ color: variant === 'archaeo' ? 0x5b5346 : 0x6e5326, roughness: 0.45, metalness: 0.5 }))
    const potMat     = mk(new THREE.MeshStandardMaterial({ color: 0x7a4327, roughness: 0.8, metalness: 0.05 }))
    const leafMat    = mk(new THREE.MeshStandardMaterial({ color: 0x2f5538, roughness: 1, metalness: 0 }))
    const carpetMat  = mk(new THREE.MeshStandardMaterial({ color: 0xffffff, map: carpetTex, roughness: 1, metalness: 0 }))
    const carpetEdge = mk(new THREE.MeshStandardMaterial({ color: P.carpetEdge, roughness: 0.7, metalness: 0.3 }))
    const glowMat    = mk(new THREE.MeshBasicMaterial({ color: variant === 'archaeo' ? 0xeef3ff : 0xfff1d8 }))
    const ropeMat    = mk(new THREE.MeshStandardMaterial({ color: variant === 'archaeo' ? 0x3a3a3e : 0x6e1f24, roughness: 0.6, metalness: 0.2 }))
    const brassMat   = mk(new THREE.MeshStandardMaterial({ color: P.frame, roughness: 0.3, metalness: 0.8 }))

    // central carpet runner
    const rugW = Math.min(2.4, HALF_W * 0.9)
    addMesh(new THREE.PlaneGeometry(rugW + 0.3, hallLen - 1.5), carpetEdge, 0, 0.011, hallMidZ).rotation.x = -Math.PI / 2
    addMesh(new THREE.PlaneGeometry(rugW, hallLen - 2.0), carpetMat, 0, 0.013, hallMidZ).rotation.x = -Math.PI / 2

    // crown molding + baseboard + dado rail along the side walls
    ;[-HALF_W, HALF_W].forEach((x) => {
      const dir = Math.sign(x)
      addMesh(new THREE.BoxGeometry(0.12, 0.16, hallLen), goldMat, x - dir * 0.06, WALL_H - 0.12, hallMidZ)
      addMesh(new THREE.BoxGeometry(0.14, 0.30, hallLen), woodMat, x - dir * 0.07, 0.15, hallMidZ)
      addMesh(new THREE.BoxGeometry(0.05, 0.05, hallLen), goldMat, x - dir * 0.03, 1.05, hallMidZ)
    })
    // crown along the end walls
    ;[hallStartZ, hallEndZ].forEach((z) => {
      addMesh(new THREE.BoxGeometry(HALF_W * 2, 0.16, 0.12), goldMat, 0, WALL_H - 0.12, z - Math.sign(z) * 0.06)
    })

    // pilasters between the paintings (+ gold capitals) on both side walls
    for (let k = 0; k <= perSide; k++) {
      const pz = -(k * SPACING + SPACING / 2)
      if (pz < hallEndZ + 0.4 || pz > hallStartZ - 0.4) continue
      ;[-HALF_W, HALF_W].forEach((x) => {
        const dir = Math.sign(x)
        addMesh(new THREE.BoxGeometry(0.12, WALL_H - 0.3, 0.22), stoneMat, x - dir * 0.06, (WALL_H - 0.3) / 2 + 0.15, pz)
        addMesh(new THREE.BoxGeometry(0.20, 0.12, 0.32), goldMat, x - dir * 0.05, WALL_H - 0.34, pz)
      })
    }

    // museum benches down the centre
    for (let r = 0; r < perSide; r++) {
      if (r % 2 !== 0) continue
      const bz = -((r + 1) * SPACING)
      if (bz < hallEndZ + 1 || bz > hallStartZ - 1) continue
      addMesh(new THREE.BoxGeometry(0.62, 0.12, 1.7), leatherMat, 0, 0.5, bz)
      addMesh(new THREE.BoxGeometry(0.50, 0.44, 1.5), woodMat, 0, 0.24, bz)
    }

    // corner accents — potted plants for the warm salon, fluted stone columns for the archaeology hall
    const addPlant = (x: number, z: number) => {
      addMesh(new THREE.CylinderGeometry(0.26, 0.32, 0.5, 16), potMat, x, 0.25, z)
      addMesh(new THREE.CylinderGeometry(0.04, 0.05, 0.7, 8), woodMat, x, 0.6, z)
      addMesh(new THREE.IcosahedronGeometry(0.46, 0), leafMat, x, 1.15, z)
      addMesh(new THREE.IcosahedronGeometry(0.32, 0), leafMat, x + 0.18, 0.95, z - 0.1)
    }
    const addColumn = (x: number, z: number) => {
      const colH = WALL_H - 0.5
      addMesh(new THREE.BoxGeometry(0.62, 0.18, 0.62), stoneMat, x, 0.09, z)               // base
      addMesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), stoneMat, x, 0.24, z)                  // base torus
      addMesh(new THREE.CylinderGeometry(0.22, 0.26, colH, 20), stoneMat, x, 0.3 + colH / 2, z) // fluted shaft
      addMesh(new THREE.CylinderGeometry(0.30, 0.22, 0.22, 20), stoneMat, x, 0.3 + colH + 0.05, z) // echinus
      addMesh(new THREE.BoxGeometry(0.56, 0.16, 0.56), goldMat, x, 0.3 + colH + 0.22, z)    // abacus
    }
    const addCorner = P.decor === 'column' ? addColumn : addPlant
    const px = HALF_W - 0.55
    addCorner(-px, hallStartZ - 0.9); addCorner(px, hallStartZ - 0.9)
    addCorner(-px, hallEndZ + 0.9); addCorner(px, hallEndZ + 0.9)
    if (hallLen > 18) { addCorner(-px, hallMidZ); addCorner(px, hallMidZ) }

    // pedestals with bronze urns flanking the far wall
    const addUrn = (x: number, z: number) => {
      addMesh(new THREE.BoxGeometry(0.5, 1.0, 0.5), stoneMat, x, 0.5, z)
      addMesh(new THREE.BoxGeometry(0.62, 0.1, 0.62), goldMat, x, 1.02, z)
      addMesh(new THREE.SphereGeometry(0.22, 16, 12), bronzeMat, x, 1.32, z)
      addMesh(new THREE.CylinderGeometry(0.10, 0.16, 0.18, 12), bronzeMat, x, 1.55, z)
    }
    addUrn(-(HALF_W - 0.9), hallEndZ + 1.1); addUrn(HALF_W - 0.9, hallEndZ + 1.1)

    // luminous ceiling skylight + recessed lamps with warm point-lights spread down the hall
    addMesh(new THREE.PlaneGeometry(1.8, hallLen - 2), glowMat, 0, WALL_H - 0.03, hallMidZ).rotation.x = Math.PI / 2
    const lampN = Math.max(3, Math.min(6, perSide + 1))
    for (let i = 0; i < lampN; i++) {
      const t = lampN === 1 ? 0.5 : i / (lampN - 1)
      const lz = hallStartZ - 1 - t * (hallLen - 2)
      addMesh(new THREE.CircleGeometry(0.3, 20), glowMat, 0, WALL_H - 0.04, lz).rotation.x = Math.PI / 2
      const pl = new THREE.PointLight(P.lamp, 0.7, 14, 1.6)
      pl.position.set(0, WALL_H - 0.5, lz)
      scene.add(pl)

      // hanging pendant lamp / chandelier down the centre with its own warm glow
      addMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 6), brassMat, 0, WALL_H - 0.5, lz)
      addMesh(new THREE.SphereGeometry(0.16, 16, 12), glowMat, 0, WALL_H - 1.05, lz)
      addMesh(new THREE.TorusGeometry(0.22, 0.018, 8, 20), brassMat, 0, WALL_H - 1.05, lz).rotation.x = Math.PI / 2
      const pend = new THREE.PointLight(P.lamp, 0.55, 9, 1.8)
      pend.position.set(0, WALL_H - 1.2, lz)
      scene.add(pend)
    }

    // wall sconces between paintings — small glowing bulbs that throw warm pools on the walls
    for (let k = 0; k <= perSide; k++) {
      const sz = -(k * SPACING + SPACING / 2)
      if (sz < hallEndZ + 0.5 || sz > hallStartZ - 0.5) continue
      ;[-HALF_W, HALF_W].forEach((x) => {
        const dir = Math.sign(x)
        addMesh(new THREE.CylinderGeometry(0.05, 0.08, 0.28, 10), brassMat, x - dir * 0.13, 2.55, sz, 0).rotation.z = dir * Math.PI / 2
        addMesh(new THREE.SphereGeometry(0.09, 14, 10), glowMat, x - dir * 0.26, 2.62, sz)
        const sc = new THREE.PointLight(P.lamp, 0.45, 4.5, 2)
        sc.position.set(x - dir * 0.5, 2.7, sz)
        scene.add(sc)
      })
    }

    // velvet-rope stanchions lining the central runner (brass posts + draped rope)
    const ropeX = Math.min(1.5, HALF_W * 0.55)
    let prevPostL: THREE.Vector3 | null = null, prevPostR: THREE.Vector3 | null = null
    for (let k = 0; k <= perSide + 1; k++) {
      const pz = hallStartZ - 1.5 - k * SPACING
      if (pz < hallEndZ + 1) break
      ;[-ropeX, ropeX].forEach((x) => {
        addMesh(new THREE.CylinderGeometry(0.05, 0.07, 0.04, 12), brassMat, x, 0.02, pz)        // foot
        addMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 10), brassMat, x, 0.47, pz)       // post
        addMesh(new THREE.SphereGeometry(0.06, 12, 10), brassMat, x, 0.95, pz)                  // finial
        const here = new THREE.Vector3(x, 0.78, pz)
        const prev = x < 0 ? prevPostL : prevPostR
        if (prev) {
          // draped rope: a thin tube sagging between two posts
          const mid = prev.clone().lerp(here, 0.5); mid.y -= 0.18
          const curve = new THREE.QuadraticBezierCurve3(prev.clone(), mid, here.clone())
          const tube = new THREE.TubeGeometry(curve, 10, 0.022, 6, false)
          const rope = new THREE.Mesh(tube, ropeMat); scene.add(rope); disposables.push(tube)
        }
        if (x < 0) prevPostL = here; else prevPostR = here
      })
    }

    items.forEach((art, i) => {
      const side = i % 2 === 0 ? -1 : 1               // even → left wall, odd → right wall
      const z = -((Math.floor(i / 2) + 1) * SPACING)
      const wallXPos = side === -1 ? -HALF_W : HALF_W
      const faceY = side === -1 ? Math.PI / 2 : -Math.PI / 2   // normal points into the hall
      const centerY = 2.0

      // group holds frame + canvas; positioned at the wall, rotated to face inward
      const group = new THREE.Group()
      group.position.set(wallXPos + side * 0.02, centerY, z)
      group.rotation.y = faceY
      scene.add(group)

      // accent picture light
      const spot = new THREE.SpotLight(P.spot, 6, 7, Math.PI / 5, 0.6, 1.2)
      spot.position.set(wallXPos - side * 1.6, WALL_H - 0.5, z)
      spot.target = group
      scene.add(spot)
      scene.add(spot.target)

      // placeholder size until the texture decodes
      let pw = 1.6, ph = 2.0

      const frameMat = new THREE.MeshStandardMaterial({ color: P.frame, roughness: 0.45, metalness: variant === 'archaeo' ? 0.3 : 0.55 })
      const matteMat = new THREE.MeshStandardMaterial({ color: 0x16110f, roughness: 0.9, metalness: 0 })
      const artMat = new THREE.MeshBasicMaterial({ color: 0x111111 })   // unlit → crisp, true colour

      const frame = new THREE.Mesh(new THREE.PlaneGeometry(pw + 0.34, ph + 0.34), frameMat)
      const matte = new THREE.Mesh(new THREE.PlaneGeometry(pw + 0.14, ph + 0.14), matteMat)
      const artPlane = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), artMat)
      frame.position.z = 0.01; matte.position.z = 0.02; artPlane.position.z = 0.03
      artPlane.userData.index = i
      group.add(frame, matte, artPlane)
      raycastTargets.push(artPlane)
      disposables.push(frame.geometry, matte.geometry, artPlane.geometry, frameMat, matteMat, artMat)

      // a standing spot directly in front of the painting (into the hall) the camera can glide to
      frontSpots[i] = {
        pos: new THREE.Vector3(wallXPos - side * 2.4, EYE, z),
        look: new THREE.Vector3(wallXPos, centerY, z),
      }

      loader.load(
        texUrl(art.thumb),
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace
          tex.anisotropy = maxAniso
          tex.minFilter = THREE.LinearMipmapLinearFilter
          tex.magFilter = THREE.LinearFilter
          tex.generateMipmaps = true
          const img = tex.image as { width: number; height: number }
          const aspect = img.width / img.height
          // fit within a max footprint, preserve aspect
          const maxW = 2.6, maxH = 2.6
          if (aspect >= 1) { pw = maxW; ph = maxW / aspect } else { ph = maxH; pw = maxH * aspect }
          artPlane.geometry.dispose(); matte.geometry.dispose(); frame.geometry.dispose()
          artPlane.geometry = new THREE.PlaneGeometry(pw, ph)
          matte.geometry = new THREE.PlaneGeometry(pw + 0.14, ph + 0.14)
          frame.geometry = new THREE.PlaneGeometry(pw + 0.34, ph + 0.34)
          artMat.color.set(0xffffff)
          artMat.map = tex
          artMat.needsUpdate = true
          disposables.push(tex)
          pending -= 1
          if (pending <= 0) setLoaded(true)
        },
        undefined,
        () => { pending -= 1; if (pending <= 0) setLoaded(true) }
      )
    })

    // ── look state (yaw/pitch) & movement ──
    let yaw = Math.PI            // start facing down the hall (−z)
    let pitch = 0
    const move = { f: false, b: false, l: false, r: false }
    let auto: { pos: THREE.Vector3; look: THREE.Vector3; t: number } | null = null

    const applyRot = () => {
      const e = new THREE.Euler(pitch, yaw, 0, 'YXZ')
      camera.quaternion.setFromEuler(e)
    }
    applyRot()

    const clamp = () => {
      camera.position.x = Math.max(-HALF_W + 0.6, Math.min(HALF_W - 0.6, camera.position.x))
      camera.position.z = Math.max(hallEndZ + 0.8, Math.min(hallStartZ - 0.8, camera.position.z))
      camera.position.y = EYE
    }

    // ── pointer: drag to look, click (no drag) to select a painting ──
    let dragging = false
    let lastX = 0, lastY = 0, downX = 0, downY = 0, moved = 0
    const ray = new THREE.Raycaster()
    const ndc = new THREE.Vector2()

    const onDown = (e: PointerEvent) => {
      dragging = true; moved = 0
      lastX = downX = e.clientX; lastY = downY = e.clientY
      renderer.domElement.style.cursor = 'grabbing'
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - lastX, dy = e.clientY - lastY
      lastX = e.clientX; lastY = e.clientY
      moved += Math.abs(dx) + Math.abs(dy)
      auto = null
      yaw -= dx * 0.0042
      pitch -= dy * 0.0042
      pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch))
      applyRot()
    }
    const onUp = (e: PointerEvent) => {
      dragging = false
      renderer.domElement.style.cursor = 'grab'
      if (moved < 6) {
        const rect = renderer.domElement.getBoundingClientRect()
        ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
        ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
        ray.setFromCamera(ndc, camera)
        const hit = ray.intersectObjects(raycastTargets, false)[0]
        if (hit) {
          const idx = hit.object.userData.index as number
          glideTo(idx)
          setSelected(idx)
        }
      }
    }

    const glideTo = (i: number) => {
      const s = frontSpots[i]; if (!s) return
      auto = { pos: s.pos.clone(), look: s.look.clone(), t: 0 }
    }

    // ── keyboard ──
    const keyMap: Record<string, 'f' | 'b' | 'l' | 'r'> = {
      KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r',
    }
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      const dir = keyMap[e.code]; if (!dir) return
      move[dir] = down; auto = null; e.preventDefault()
    }
    const kd = onKey(true), ku = onKey(false)

    renderer.domElement.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)

    // ── resize ──
    const onResize = () => {
      camera.aspect = W() / H(); camera.updateProjectionMatrix()
      renderer.setSize(W(), H())
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(mount)
    window.addEventListener('resize', onResize)

    // ── expose imperative API ──
    api.current = {
      setMove: (dir, on) => { move[dir] = on; if (on) auto = null },
      goTo: (i) => { glideTo(i); setSelected(i) },
      reset: () => {
        auto = null; setSelected(null)
        camera.position.set(0, EYE, 4); yaw = Math.PI; pitch = 0; applyRot()
      },
    }

    // ── render loop ──
    const SPEED = 3.2
    const clock = new THREE.Clock()
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(clock.getDelta(), 0.05)

      if (auto) {
        auto.t = Math.min(1, auto.t + dt * 1.6)
        const k = auto.t < 0.5 ? 2 * auto.t * auto.t : 1 - Math.pow(-2 * auto.t + 2, 2) / 2 // easeInOut
        camera.position.lerp(auto.pos, k * 0.18 + 0.04)
        // look toward target
        const m = new THREE.Matrix4().lookAt(camera.position, auto.look, new THREE.Vector3(0, 1, 0))
        const q = new THREE.Quaternion().setFromRotationMatrix(m)
        camera.quaternion.slerp(q, 0.12)
        const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ')
        yaw = e.y; pitch = e.x
        if (auto.t >= 1 && camera.position.distanceTo(auto.pos) < 0.05) auto = null
      } else {
        const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize()
        const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize()
        const step = SPEED * dt
        if (move.f) camera.position.addScaledVector(fwd, step)
        if (move.b) camera.position.addScaledVector(fwd, -step)
        if (move.l) camera.position.addScaledVector(right, -step)
        if (move.r) camera.position.addScaledVector(right, step)
      }
      clamp()
      renderer.render(scene, camera)
    }
    tick()

    // ── cleanup ──
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      disposables.forEach((d) => d.dispose())
      texPool.forEach((t) => t.dispose())
      floor.geometry.dispose(); ceil.geometry.dispose()
      wallL.geometry.dispose(); wallR.geometry.dispose(); wallFar.geometry.dispose(); wallNear.geometry.dispose()
      wallMat.dispose(); floorMat.dispose(); ceilMat.dispose(); trimMat.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
      api.current = null
    }
  }, [items, variant])

  const sel = selected != null ? items[selected] : null

  // press-and-hold helpers for the on-screen pad
  const hold = (dir: 'f' | 'b' | 'l' | 'r') => ({
    onPointerDown: (e: ReactPointerEvent) => { e.preventDefault(); api.current?.setMove(dir, true) },
    onPointerUp: () => api.current?.setMove(dir, false),
    onPointerLeave: () => api.current?.setMove(dir, false),
    onPointerCancel: () => api.current?.setMove(dir, false),
  })

  return (
    <>
      {/* canvas host — fills the hero, sits at the base layer */}
      <div ref={mountRef} className="g3d-stage" />

      {!loaded && (
        <div className="g3d-load"><span className="g3d-spin" />Salon hazırlanıyor…</div>
      )}

      {/* movement pad (works on touch + click) */}
      <div className="g3d-pad" aria-hidden="true">
        <button className="g3d-pb up" {...hold('f')}>▲</button>
        <div className="g3d-pad-mid">
          <button className="g3d-pb" {...hold('l')}>◀</button>
          <button className="g3d-pb" {...hold('b')}>▼</button>
          <button className="g3d-pb" {...hold('r')}>▶</button>
        </div>
      </div>

      {/* navigation help / reset */}
      {helpOpen ? (
        <div className="g3d-guide">
          <h5>Nasıl gezilir
            <button className="g3d-x" onClick={() => setHelpOpen(false)} aria-label="Kapat">×</button>
          </h5>
          <div className="g3d-row"><b>Sürükle</b> — etrafına bakmak için</div>
          <div className="g3d-row"><b>W A S D / oklar</b> — yürümek için (veya sol alttaki pad)</div>
          <div className="g3d-row"><b>Tabloya tıkla</b> — tam önüne git + bilgi kartını aç</div>
          <div className="g3d-act">
            <button className="g3d-btn" onClick={() => api.current?.reset()}>Girişe dön</button>
            <button className="g3d-btn" onClick={() => setHelpOpen(false)}>Anladım</button>
          </div>
        </div>
      ) : (
        <button className="g3d-help" onClick={() => setHelpOpen(true)}>? Nasıl gezilir</button>
      )}

      {/* info card for the focused painting */}
      {sel && (
        <div className="g3d-card">
          <button className="g3d-x g3d-card-x" onClick={() => setSelected(null)} aria-label="Kapat">×</button>
          <div className="g3d-card-label">{sel.museum}</div>
          <h3 className="g3d-card-title">{sel.title}</h3>
          <p className="g3d-card-meta">{sel.artist} · {sel.year} · {sel.medium}</p>
          {sel.story && <p className="g3d-card-story">{sel.story}</p>}
          <div className="g3d-card-nav">
            <button onClick={() => api.current?.goTo((selected! - 1 + items.length) % items.length)}>← Önceki</button>
            <button onClick={() => api.current?.goTo((selected! + 1) % items.length)}>Sonraki →</button>
          </div>
        </div>
      )}
    </>
  )
}
