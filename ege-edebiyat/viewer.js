import {
  ACESFilmicToneMapping, AmbientLight, Box3, Color, DirectionalLight, Fog, HemisphereLight,
  Mesh, MeshStandardMaterial, PCFShadowMap, PerspectiveCamera, PlaneGeometry,
  Scene, SRGBColorSpace, Vector3, WebGLRenderer,
} from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";

const $ = (id) => document.getElementById(id);
const modelUrl = new URL("./ege-edebiyat-fakulte-modeli.glb", import.meta.url);
$("download").href = modelUrl.href;
const canvas = $("model");
const scene = new Scene();
scene.background = new Color("#dce6ec");
scene.fog = new Fog(scene.background, 325, 740);
const camera = new PerspectiveCamera(36, 1, .42, 1200);
const control = new OrbitControls(camera, canvas);
control.minDistance = 8;
control.maxDistance = 570;
control.maxPolarAngle = Math.PI*.557;
control.panSpeed = .68;
control.rotateSpeed = .82;
const keyLight = new DirectionalLight(0xfffaf2, 1.92);
keyLight.position.set(-85,135,68);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048,2048);
Object.assign(keyLight.shadow.camera,{left:-145,right:145,top:131,bottom:-131,near:.5,far:425});
keyLight.shadow.normalBias = .075;
keyLight.shadow.bias = -.00018;
scene.add(keyLight, new HemisphereLight(0xeff7ff,0x8b887b,1.64), new AmbientLight(0xf7fbff,.24));
const outside = new Mesh(new PlaneGeometry(1180,1180),new MeshStandardMaterial({color:0xb5bbaf,roughness:1}));
outside.rotation.x = -Math.PI/2;
outside.position.y = -.325;
outside.receiveShadow = true;
scene.add(outside);

const contextGroups = ["Eczacılık Kanadı","İletişim Kanadı","Batı Bağlantıları"];
const viewpoints = {
  all: [[-2,5,-2],[148,115,181]],
  entrance: [[62.1,5.9,46.5],[68.3,2.75,84.1]],
  roof: [[-5,1,2],[-5.016,366,2.6]],
  new: [[-85,5,43],[-157,24,83]],
};
let renderer, modelRoot, pending = 0, flight, mode = "all";
const framePosition = new Vector3();
const frameTarget = new Vector3();
const eyeFloor = 1.2;
const mayMove = () => !matchMedia("(prefers-reduced-motion: reduce)").matches;

function draw() {
  pending = 0;
  if (!renderer) return;
  if (flight) {
    const t = Math.min(1,(performance.now()-flight.start)/360);
    const progress = t*t*(3-2*t);
    camera.position.lerpVectors(flight.from,flight.to,progress);
    control.target.lerpVectors(flight.origin,flight.target,progress);
    if (t===1) flight = null;
    control.update();
  }
  renderer.render(scene,camera);
  const vector = camera.getWorldDirection(framePosition);
  const yaw = Math.atan2(vector.x,-vector.z);
  $("needle").style.transform = `rotate(${yaw+0.027}rad)`;
  document.body.dataset.camera = camera.position.toArray().map((n)=>n.toFixed(3)).join(",");
  document.body.dataset.view = mode;
  if (flight) invalidate();
}

function invalidate() {
  if (!pending) pending = requestAnimationFrame(draw);
}

function resize() {
  if (!renderer) return;
  const {clientWidth:width,clientHeight:height} = canvas;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(width,height,false);
  camera.aspect = width/Math.max(1,height);
  camera.fov = camera.aspect < 1 ? 36+22*(1-camera.aspect) : 36;
  camera.updateProjectionMatrix();
  invalidate();
}

function stopFlight() { flight = null; }

function go(view, animated=true) {
  mode = view;
  const [target,next] = viewpoints[view];
  frameTarget.fromArray(target);
  framePosition.fromArray(next);
  const limit = view === "entrance" ? .31 : 1.06;
  const widen = 1 + Math.max(0, Math.min(limit, (1.10 - camera.aspect) * 1.66));
  if (widen>1) framePosition.sub(frameTarget).multiplyScalar(widen).add(frameTarget);
  framePosition.y=Math.max(framePosition.y,eyeFloor);
  if (animated && mayMove()) {
    flight = {
      start:performance.now(),from:camera.position.clone(),origin:control.target.clone(),
      to:framePosition.clone(),target:frameTarget.clone(),
    };
  } else {
    flight = null;
    camera.position.copy(framePosition);
    control.target.copy(frameTarget);
    control.update();
  }
  for (const button of document.querySelectorAll("[data-view]")) {
    button.setAttribute("aria-pressed",String(button.dataset.view===view));
  }
  invalidate();
}

control.addEventListener("change",()=>{
  if (camera.position.y<eyeFloor) {
    camera.position.y=eyeFloor;
    camera.lookAt(control.target);
  }
  invalidate();
});
canvas.addEventListener("pointerdown",stopFlight,{capture:true});
canvas.addEventListener("wheel",stopFlight,{capture:true,passive:true});
canvas.addEventListener("keydown",(event)=>{
  const amount = .13;
  const offset = camera.position.clone().sub(control.target);
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    offset.applyAxisAngle(camera.up,event.key==="ArrowLeft"?amount:-amount);
    camera.position.copy(control.target).add(offset);
  } else if (event.key === "+" || event.key === "=" || event.key === "-") {
    const factor = event.key==="-" ? 1.14 : .88;
    const distance = Math.min(control.maxDistance,Math.max(control.minDistance,offset.length()*factor));
    camera.position.copy(control.target).add(offset.setLength(distance));
  } else return;
  event.preventDefault();
  stopFlight();
  control.update();
  invalidate();
});
for (const button of document.querySelectorAll("[data-view]")) {
  button.addEventListener("click",()=>go(button.dataset.view));
}
$("context").addEventListener("click",()=>{
  const visible = $("context").getAttribute("aria-pressed")!=="true";
  $("context").setAttribute("aria-pressed",String(visible));
  for (const node of modelRoot.children) {
    if (contextGroups.includes(node.name.replaceAll("_"," "))) node.visible=visible;
  }
  renderer.shadowMap.needsUpdate=true;
  invalidate();
});
$("sources").addEventListener("click",()=>$("sourceDialog").showModal());
for (const dialog of document.querySelectorAll("dialog")) {
  dialog.addEventListener("click",(event)=>{ if (event.target===dialog) dialog.close(); });
}
window.addEventListener("resize",resize);

async function start() {
  renderer = new WebGLRenderer({canvas,antialias:true,powerPreference:"high-performance"});
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  resize();
  const imported = await new GLTFLoader().loadAsync(modelUrl.href);
  modelRoot = imported.scene;
  const structural = new Set(["plaster","terracotta","soffit","cobalt","charcoal","new-shell","neutral","flat-roof","step-face","step-tread"]);
  const terrain = new Set(["site-soil","terrace","lawn","campus-road","road-edge","curb-white","curb-pink","tactile-base","tactile-rib"]);
  const landscape = new Set([
    "broad-bark","pale-bark","pale-bark-dark","needle-bark","leaf-green","leaf-light","leaf-olive",
    "needles","needles-light","stone","stone-light","stone-weathered","lamp-post","lamp-head","flag-cloth",
  ]);
  modelRoot.traverse((node)=>{
    if (!node.isMesh) return;
    const material = node.material.name;
    node.receiveShadow=structural.has(material) || terrain.has(material) || landscape.has(material);
    node.castShadow=structural.has(material) || landscape.has(material);
  });
  renderer.shadowMap.needsUpdate=true;
  scene.add(modelRoot);
  const bounds = new Box3().setFromObject(modelRoot);
  document.body.dataset.bounds = [bounds.min.toArray(),bounds.max.toArray()].flat().join(",");
  document.body.dataset.groups = String(modelRoot.children.length);
  go(location.hash==="#giris" ? "entrance" : "all",false);
  $("context").disabled=false;
  $("status").hidden=true;
  document.body.dataset.ready="true";
}

start().catch((error)=>{
  console.error(error);
  $("status").textContent="3B model açılamadı. WebGL destekli bir tarayıcıda tekrar aç.";
});
