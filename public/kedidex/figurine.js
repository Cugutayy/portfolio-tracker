// KediDex — 3B kedi figürü (Three.js). Detay ekranında döner figür gösterir.
import * as THREE from 'three';
window.KD = window.KD || {};
KD.figurine = (function () {
  let active = null;

  function hex(c) { try { return new THREE.Color(c); } catch (e) { return new THREE.Color('#cccccc'); } }
  function mat(color, rough) { return new THREE.MeshStandardMaterial({ color: hex(color), roughness: rough == null ? 0.65 : rough, metalness: 0.04 }); }

  function buildCat(cat) {
    const look = (cat && cat.look) || (KD.catgen ? KD.catgen.getLook(cat.seed, cat.rarity) : null) || { coat: { body: '#cdb89a', belly: '#efe2c6', stripe: '#9a8' }, eye: '#5aa86a', eye2: '#5aa86a' };
    const c = look.coat;
    const earTail = look.patch || c.body;
    const g = new THREE.Group();

    const bodyMat = mat(c.body), earMat = mat(earTail);
    // gövde (damla)
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 24), bodyMat);
    body.scale.set(1, 1.2, 0.92); body.position.y = 1.0; g.add(body);
    // karın (açık)
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 18), mat(c.belly));
    belly.scale.set(0.9, 1.05, 0.55); belly.position.set(0, 0.92, 0.5); g.add(belly);
    // kafa
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 24), bodyMat);
    head.position.y = 1.95; g.add(head);
    if (look.fluffy) { const ruff = new THREE.Mesh(new THREE.SphereGeometry(0.72, 20, 16), mat(c.body)); ruff.scale.set(1, 0.7, 1); ruff.position.set(0, 1.55, 0.1); g.add(ruff); }
    // kulaklar
    [-0.34, 0.34].forEach((x, i) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.5, 4), earMat);
      ear.position.set(x, 2.42, 0); ear.rotation.z = x > 0 ? -0.3 : 0.3; g.add(ear);
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 4), mat('#e89ba0', 0.8));
      inner.position.set(x, 2.42, 0.06); inner.rotation.z = ear.rotation.z; g.add(inner);
    });
    // gözler
    [[-0.24, look.eye], [0.24, look.eye2 || look.eye]].forEach(([x, ec]) => {
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 14), mat('#ffffff', 0.4));
      w.position.set(x, 2.0, 0.5); g.add(w);
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), mat(ec, 0.5));
      iris.position.set(x, 2.0, 0.6); g.add(iris);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), mat('#1c160f', 0.5));
      p.position.set(x, 2.0, 0.67); g.add(p);
    });
    // burun
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), mat('#d98a8a', 0.6));
    nose.position.set(0, 1.78, 0.62); g.add(nose);
    // kuyruk
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.11, 12, 24, Math.PI * 1.2), earMat);
    tail.position.set(0.7, 0.9, -0.3); tail.rotation.set(0.3, 0.4, 1.0); g.add(tail);
    // taban (figür standı)
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.15, 0.22, 28), mat('#2b2118', 0.8));
    base.position.y = 0.11; g.add(base);

    // mitik: altın halka
    if (cat && cat.rarity === 'myth') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.05, 10, 40), new THREE.MeshStandardMaterial({ color: hex('#e0a83b'), emissive: hex('#a8741f'), roughness: 0.3, metalness: 0.6 }));
      ring.position.y = 0.24; ring.rotation.x = Math.PI / 2; g.add(ring);
    }
    g.position.y = -1.0;
    return g;
  }

  function mount(el, cat) {
    unmount();
    try {
      const w = el.clientWidth || 240, h = el.clientHeight || 240;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(w, h); renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      el.innerHTML = ''; el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
      camera.position.set(0, 0.4, 5.4); camera.lookAt(0, 0.1, 0);
      scene.add(new THREE.HemisphereLight(0xfff4e0, 0x66503a, 1.15));
      const dir = new THREE.DirectionalLight(0xffffff, 1.25); dir.position.set(3, 6, 5); scene.add(dir);
      const grp = buildCat(cat); scene.add(grp);

      let rotY = -0.5, dragging = false, lastX = 0, vel = 0.012;
      const dom = renderer.domElement;
      dom.style.cursor = 'grab'; dom.style.touchAction = 'pan-y';
      const down = e => { dragging = true; lastX = (e.touches ? e.touches[0].clientX : e.clientX); dom.style.cursor = 'grabbing'; };
      const move = e => { if (!dragging) return; const x = (e.touches ? e.touches[0].clientX : e.clientX); rotY += (x - lastX) * 0.01; lastX = x; };
      const up = () => { dragging = false; dom.style.cursor = 'grab'; };
      dom.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);

      const st = { renderer, raf: 0, dispose: () => { dom.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); } };
      active = st;
      (function frame() {
        if (!dragging) rotY += vel;
        grp.rotation.y = rotY;
        renderer.render(scene, camera);
        st.raf = requestAnimationFrame(frame);
      })();
      return true;
    } catch (e) { return false; }
  }

  function unmount() {
    if (!active) return;
    cancelAnimationFrame(active.raf);
    try {
      active.dispose();
      const dom = active.renderer.domElement;
      if (active.renderer.forceContextLoss) active.renderer.forceContextLoss();
      active.renderer.dispose();
      if (dom && dom.parentNode) dom.parentNode.removeChild(dom);
    } catch (e) {}
    active = null;
  }

  return { mount, unmount };
})();
