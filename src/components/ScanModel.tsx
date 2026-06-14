import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

// ═══════════════════════════════════════════════════
// ScanModel — displays a REAL photogrammetry scan (a .glb exported from Scaniverse)
// as a turntable object viewer. Orbit to look around, wheel/pinch to zoom, right-drag to pan.
// The model is auto-centred and the camera is auto-fit to its bounding box, so any scan
// (object or small room) frames itself correctly without hand-tuning.
// ═══════════════════════════════════════════════════

export function ScanModel({ src }: { src: string }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [pct, setPct] = useState(0)
  const [failed, setFailed] = useState(false)
  const [helpOpen, setHelpOpen] = useState(true)
  const resetRef = useRef<() => void>(() => {})

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const W = () => mount.clientWidth || window.innerWidth
    const H = () => mount.clientHeight || window.innerHeight

    // ── renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    const maxAniso = renderer.capabilities.getMaxAnisotropy()
    renderer.setSize(W(), H())
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab'
    mount.appendChild(renderer.domElement)

    // ── scene & camera ──
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0d0c0e)

    const camera = new THREE.PerspectiveCamera(50, W() / H(), 0.01, 1000)
    camera.position.set(0, 0, 5)

    // ── lighting — bright & even so the baked scan texture reads true-colour ──
    scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2620, 1.15))
    scene.add(new THREE.AmbientLight(0xffffff, 0.55))
    const key = new THREE.DirectionalLight(0xffffff, 0.9)
    key.position.set(3, 5, 4)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0xdfe6ff, 0.5)
    rim.position.set(-4, 2, -3)
    scene.add(rim)

    // ── controls ──
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.rotateSpeed = 0.85
    controls.zoomSpeed = 0.9
    controls.panSpeed = 0.7
    controls.autoRotate = !reduce
    controls.autoRotateSpeed = 0.55

    // pause idle spin while the user is interacting, resume a few seconds after they stop
    let idleTimer = 0
    controls.addEventListener('start', () => {
      controls.autoRotate = false
      renderer.domElement.style.cursor = 'grabbing'
      window.clearTimeout(idleTimer)
    })
    controls.addEventListener('end', () => {
      renderer.domElement.style.cursor = 'grab'
      if (!reduce) idleTimer = window.setTimeout(() => { controls.autoRotate = true }, 3500)
    })

    // ── load the scan ──
    let model: THREE.Object3D | null = null
    let homePos = new THREE.Vector3(0, 0, 5)
    const homeTarget = new THREE.Vector3(0, 0, 0)
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)   // for EXT_meshopt_compression scans
    loader.load(
      src,
      (gltf) => {
        model = gltf.scene
        // crisp texture at grazing angles + proper mipmaps (quality, negligible cost)
        model.traverse((o) => {
          const mesh = o as THREE.Mesh
          const mat = mesh.material as THREE.MeshStandardMaterial | undefined
          if (mat && mat.map) {
            mat.map.anisotropy = maxAniso
            mat.map.generateMipmaps = true
            mat.map.minFilter = THREE.LinearMipmapLinearFilter
            mat.map.needsUpdate = true
          }
        })
        // centre the model at the origin and fit the camera to its bounding box
        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())
        model.position.sub(center)
        scene.add(model)

        // frame by the bounding SPHERE so the whole object stays in view at every
        // turntable angle (no clipping as it auto-rotates), and sits dead-centre
        const radius = box.getBoundingSphere(new THREE.Sphere()).radius || Math.max(size.x, size.y, size.z) / 2 || 1
        const vfov = (camera.fov * Math.PI) / 180
        // extra padding (1.45) + a slight upward aim so the object sits a touch lower —
        // gives clear headroom so the top never clips under the page header on desktop
        const dist = (radius / Math.sin(vfov / 2)) * 1.45
        const aimY = radius * 0.12
        camera.near = Math.max(dist / 1000, 0.001)
        camera.far = dist * 100 + radius
        camera.position.set(0, aimY, dist)
        camera.updateProjectionMatrix()
        controls.target.set(0, aimY, 0)
        homeTarget.set(0, aimY, 0)
        controls.minDistance = radius * 0.6
        controls.maxDistance = dist * 3
        controls.update()
        homePos = camera.position.clone()

        setLoaded(true)
      },
      (ev) => { if (ev.total) setPct(Math.round((ev.loaded / ev.total) * 100)) },
      () => { setFailed(true); setLoaded(true) },
    )

    resetRef.current = () => {
      camera.position.copy(homePos)
      controls.target.copy(homeTarget)
      controls.update()
      if (!reduce) controls.autoRotate = true
    }

    // ── resize ──
    const onResize = () => {
      camera.aspect = W() / H(); camera.updateProjectionMatrix()
      renderer.setSize(W(), H())
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(mount)
    window.addEventListener('resize', onResize)

    // ── render loop ──
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      controls.update()
      renderer.render(scene, camera)
    }
    tick()

    // ── cleanup ──
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(idleTimer)
      ro.disconnect()
      window.removeEventListener('resize', onResize)
      controls.dispose()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.geometry) m.geometry.dispose()
        const mat = m.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(mat)) mat.forEach((x) => disposeMat(x))
        else if (mat) disposeMat(mat)
      })
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }

    function disposeMat(mat: THREE.Material) {
      const anyMat = mat as unknown as Record<string, unknown>
      for (const k of Object.keys(anyMat)) {
        const v = anyMat[k]
        if (v && v instanceof THREE.Texture) v.dispose()
      }
      mat.dispose()
    }
  }, [src])

  return (
    <>
      <div ref={mountRef} className="g3d-stage" />

      {!loaded && (
        <div className="g3d-load"><span className="g3d-spin" />
          Tarama yükleniyor{pct ? ` · %${pct}` : '…'}
        </div>
      )}
      {failed && (
        <div className="g3d-load">Tarama yüklenemedi.</div>
      )}

      {helpOpen ? (
        <div className="g3d-guide">
          <h5>Nasıl gezilir
            <button className="g3d-x" onClick={() => setHelpOpen(false)} aria-label="Kapat">×</button>
          </h5>
          <div className="g3d-row"><b>Sürükle</b> — modeli döndürmek için</div>
          <div className="g3d-row"><b>Tekerlek / kıstır</b> — yakınlaş / uzaklaş</div>
          <div className="g3d-row"><b>Sağ tık sürükle</b> — kaydırmak için</div>
          <div className="g3d-act">
            <button className="g3d-btn" onClick={() => resetRef.current()}>Görünümü sıfırla</button>
            <button className="g3d-btn" onClick={() => setHelpOpen(false)}>Anladım</button>
          </div>
        </div>
      ) : (
        <button className="g3d-help" onClick={() => setHelpOpen(true)}>? Nasıl gezilir</button>
      )}
    </>
  )
}

export default ScanModel
