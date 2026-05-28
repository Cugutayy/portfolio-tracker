import { useEffect, useRef, useState } from 'react'

// ═══════════════════════════════════════════════════
// X — cinematic digital-atlas page
// Hero: Botticelli · La Nascita di Venere (4K gigapixel scan)
// Below: manifesto + collections grid (museum-catalog feel)
// Rooms: #/x/<slug> — 4K masterpiece per category
// Gallery transitions (door / iris / zoom / corridor) + live switcher
// ═══════════════════════════════════════════════════

type Art = { title: string; artist: string; year: string; museum: string; medium: string }
type Cat = { n: string; slug: string; tr: string; it: string; d: string; img: string; art: Art }

const CATEGORIES: Cat[] = [
  {
    n: '01', slug: 'sanat', tr: 'Sanat & Müzeler', it: 'Arte & Musei',
    d: 'Galeriler, koleksiyonlar, fresk ve heykellerin sessiz salonları.',
    img: '/x/rooms/sanat.jpg',
    art: { title: 'Meisje met de parel', artist: 'Johannes Vermeer', year: 'c. 1665', museum: 'Mauritshuis · Den Haag', medium: 'Olio su tela' },
  },
  {
    n: '02', slug: 'sarap', tr: 'Şarap Bağları', it: 'Vigneti',
    d: 'Tepelere yayılan asmalar, taş mahzenler ve hasat ışığı.',
    img: '/x/rooms/sarap.jpg',
    art: { title: 'Bacco', artist: 'Caravaggio', year: 'c. 1596', museum: 'Galleria degli Uffizi · Firenze', medium: 'Olio su tela' },
  },
  {
    n: '03', slug: 'sahil', tr: 'Sahil & Doğa', it: 'Costa & Natura',
    d: 'Kıyılar, koylar ve kesintisiz ufkun dingin genişliği.',
    img: '/x/rooms/sahil.jpg',
    art: { title: 'La Nona Onda', artist: 'Ivan Ajvazovskij', year: '1850', museum: 'Museo di Stato Russo · S. Pietroburgo', medium: 'Olio su tela' },
  },
  {
    n: '04', slug: 'sokak', tr: 'Tarihi Sokaklar', it: 'Strade Storiche',
    d: 'Taş döşeli geçitler, eski cepheler, zamanın patinası.',
    img: '/x/rooms/sokak.jpg',
    art: { title: 'Il Canal Grande', artist: 'Canaletto', year: 'c. 1730', museum: 'Venezia', medium: 'Olio su tela' },
  },
  {
    n: '05', slug: 'mekan', tr: 'Otantik Mekânlar', it: 'Luoghi Autentici',
    d: 'Kafeler, atölyeler, karakterini koruyan iç mekânlar.',
    img: '/x/rooms/mekan.jpg',
    art: { title: 'Cortile di una casa a Delft', artist: 'Pieter de Hooch', year: '1658', museum: 'National Gallery · London', medium: 'Olio su tela' },
  },
  {
    n: '06', slug: 'koleksiyon', tr: 'Koleksiyonlar', it: 'Collezioni',
    d: 'Temayla kürate edilmiş seçkiler ve özel rotalar.',
    img: '/x/rooms/koleksiyon.jpg',
    art: { title: 'Galleria dell’Arciduca Leopoldo Guglielmo', artist: 'David Teniers il Giovane', year: 'c. 1650', museum: 'Kunsthistorisches Museum · Wien', medium: 'Olio su tela' },
  },
]

type TransType = 'door' | 'iris' | 'zoom' | 'corridor'
const TRANS: { id: TransType; tr: string; en: string }[] = [
  { id: 'door', tr: 'Kapı', en: 'Door' },
  { id: 'iris', tr: 'Perde', en: 'Iris' },
  { id: 'zoom', tr: 'Yakınlaş', en: 'Zoom' },
  { id: 'corridor', tr: 'Koridor', en: 'Pan' },
]
// [coverMs, revealMs] per transition — kept in sync with the CSS keyframe durations below
const DUR: Record<TransType, [number, number]> = {
  door: [640, 820], iris: [600, 780], zoom: [600, 720], corridor: [560, 720],
}

function parseHash(): string | null {
  const m = window.location.hash.match(/^#\/x\/([a-z]+)/)
  return m ? m[1] : null
}

const CSS = `
@keyframes xUp{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:translateY(0)}}
@keyframes xKen{0%{transform:scale(1.04)}100%{transform:scale(1.10)}}
@keyframes xPulse{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:.9;transform:scale(1.35)}}
@keyframes xScroll{0%{transform:translate(-50%,-40%);opacity:0}40%{opacity:1}100%{transform:translate(-50%,140%);opacity:0}}

.x-page{width:100%;background:#0c0a0b;color:#f3ead6;font-family:'Newsreader',Georgia,serif}

/* ════ HERO / ROOM SHELL ════ */
.x-hero{position:relative;width:100%;height:100vh;height:100svh;overflow:hidden}
.x-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;
  z-index:0;opacity:0;transition:opacity 1.6s cubic-bezier(.16,1,.3,1);
  animation:xKen 40s ease-in-out infinite alternate;will-change:transform,opacity}
.x-bg.ready{opacity:1}
.x-veil{position:absolute;inset:0;z-index:1;pointer-events:none;
  background:
    linear-gradient(180deg,rgba(7,6,10,.55) 0%,rgba(7,6,10,0) 22%,rgba(7,6,10,0) 52%,rgba(12,10,11,.9) 100%),
    linear-gradient(90deg,rgba(7,6,10,.55) 0%,rgba(7,6,10,0) 38%),
    radial-gradient(120% 90% at 50% 45%,rgba(0,0,0,0) 55%,rgba(0,0,0,.5) 100%)}
.x-grain{position:absolute;inset:0;z-index:2;pointer-events:none;opacity:.05;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.x-frame{position:relative;z-index:3;height:100%;display:flex;flex-direction:column;justify-content:space-between;
  padding:clamp(22px,3.5vw,46px) clamp(22px,4vw,64px)}

.x-top{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;
  animation:xUp 1.1s cubic-bezier(.16,1,.3,1) both}
.x-brand{text-decoration:none;color:#f3ead6;display:inline-flex;flex-direction:column;gap:3px;line-height:1;
  background:none;border:none;cursor:pointer;padding:0;text-align:left;font-family:inherit}
.x-brand b{font-weight:500;font-size:1.5rem;letter-spacing:.04em;font-style:italic;text-shadow:0 1px 20px rgba(0,0,0,.5)}
.x-brand b em{color:#d8b25a;font-style:italic}
.x-brand span{font-family:'DM Mono',monospace;font-size:.58rem;letter-spacing:.32em;text-transform:uppercase;color:rgba(243,234,214,.6)}
.x-brand:hover b em{color:#ecc879}
.x-brand:hover span{color:rgba(236,200,121,.85)}
.x-mono{font-family:'DM Mono',monospace;font-size:.6rem;letter-spacing:.26em;text-transform:uppercase;
  color:rgba(243,234,214,.7);text-align:right;line-height:1.9;text-shadow:0 1px 12px rgba(0,0,0,.6)}

.x-bottom{display:flex;align-items:flex-end;justify-content:space-between;gap:24px}
.x-placard{display:flex;gap:18px;align-items:stretch;max-width:560px;
  animation:xUp 1.2s cubic-bezier(.16,1,.3,1) .25s both}
.x-rule{width:1px;flex:none;align-self:stretch;background:linear-gradient(180deg,transparent,#d8b25a 35%,#d8b25a 65%,transparent)}
.x-plabel{font-family:'DM Mono',monospace;font-size:.6rem;letter-spacing:.3em;text-transform:uppercase;color:#d8b25a;margin-bottom:12px}
.x-ptitle{font-size:clamp(2.3rem,5.4vw,4.6rem);font-weight:400;line-height:.98;letter-spacing:-.01em;margin:0 0 14px}
.x-ptitle em{font-style:italic;color:#f6e9c9}
.x-pmeta{font-family:'DM Mono',monospace;font-size:.66rem;letter-spacing:.06em;line-height:1.7;color:rgba(243,234,214,.72);margin:0}
.x-pmeta .sep{color:#d8b25a;padding:0 7px;opacity:.8}

/* scroll cue (clickable) */
.x-cue{appearance:none;background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:12px;flex:none;
  color:rgba(243,234,214,.7);animation:xUp 1.2s cubic-bezier(.16,1,.3,1) .45s both}
.x-cue:hover{color:#ecc879}
.x-status{display:flex;align-items:center;gap:8px}
.x-dot{width:6px;height:6px;border-radius:50%;background:#d8b25a;box-shadow:0 0 10px #d8b25a;animation:xPulse 2.6s ease-in-out infinite}
.x-stxt{font-family:'DM Mono',monospace;font-size:.58rem;letter-spacing:.24em;text-transform:uppercase;color:rgba(243,234,214,.66)}
.x-mouse{width:22px;height:36px;border:1px solid currentColor;border-radius:12px;position:relative;overflow:hidden;opacity:.6}
.x-mouse i{position:absolute;left:50%;top:7px;width:3px;height:7px;border-radius:2px;background:#d8b25a;animation:xScroll 2.2s cubic-bezier(.16,1,.3,1) infinite}
.x-cuetxt{font-family:'DM Mono',monospace;font-size:.54rem;letter-spacing:.3em;text-transform:uppercase}

/* room-only soft tag near placard */
.x-rtag{display:inline-flex;align-items:center;gap:8px;margin-top:18px;font-family:'DM Mono',monospace;
  font-size:.56rem;letter-spacing:.24em;text-transform:uppercase;color:rgba(243,234,214,.6)}
.x-rtag .x-dot{position:relative}

/* ════ INTRO / MANIFESTO ════ */
.x-intro{position:relative;padding:clamp(80px,13vh,170px) clamp(22px,6vw,90px) clamp(60px,9vh,120px)}
.x-intro::before{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;
  background:
    radial-gradient(80% 60% at 14% -5%,rgba(216,178,90,.10),transparent 60%),
    radial-gradient(70% 60% at 92% 28%,rgba(120,150,140,.07),transparent 60%),
    radial-gradient(95% 80% at 50% 112%,rgba(190,120,110,.06),transparent 60%)}
.x-wrap{position:relative;z-index:1;max-width:1180px;margin:0 auto}
.x-eyebrow{font-family:'DM Mono',monospace;font-size:.62rem;letter-spacing:.34em;text-transform:uppercase;color:#d8b25a;margin-bottom:26px}
.x-lead{font-size:clamp(1.8rem,4.4vw,3.4rem);font-weight:400;line-height:1.12;letter-spacing:-.01em;max-width:20ch;margin:0 0 32px}
.x-lead em{font-style:italic;color:#ecc879}
.x-body{font-size:clamp(1rem,1.5vw,1.18rem);font-weight:300;line-height:1.75;color:rgba(243,234,214,.72);max-width:60ch;margin:0}

/* collections grid */
.x-chead{display:flex;align-items:baseline;justify-content:space-between;gap:16px;
  margin:clamp(60px,9vh,110px) 0 0;padding-top:24px;border-top:1px solid rgba(216,178,90,.2)}
.x-chead h2{font-family:'DM Mono',monospace;font-size:.72rem;font-weight:500;letter-spacing:.26em;text-transform:uppercase;color:#f3ead6;margin:0}
.x-chead span{font-family:'DM Mono',monospace;font-size:.6rem;letter-spacing:.2em;color:#d8b25a;opacity:.75}
.x-grid{margin-top:28px;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));
  gap:1px;background:rgba(216,178,90,.16);border:1px solid rgba(216,178,90,.16)}
.x-cat{position:relative;background:#0c0a0b;cursor:pointer;overflow:hidden;border:none;text-align:left;
  color:inherit;font-family:inherit;display:block;width:100%}
.x-cthumb{position:relative;height:170px;overflow:hidden}
.x-cthumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
  filter:saturate(.86) brightness(.7);transform:scale(1.04);
  transition:transform 1s cubic-bezier(.16,1,.3,1),filter .6s,opacity 1.2s;opacity:0}
.x-cthumb img.ld{opacity:1}
.x-cthumb::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(12,10,11,.1),rgba(12,10,11,.92))}
.x-cat:hover .x-cthumb img{transform:scale(1.12);filter:saturate(1) brightness(.82)}
.x-cbody{position:relative;padding:24px 30px 30px}
.x-cbody::before{content:'';position:absolute;left:0;top:0;height:2px;width:0;background:#d8b25a;
  transition:width .55s cubic-bezier(.16,1,.3,1)}
.x-cat:hover .x-cbody::before{width:100%}
.x-cnum{font-family:'DM Mono',monospace;font-size:.6rem;letter-spacing:.2em;color:#d8b25a;opacity:.85}
.x-ctitle{font-size:1.45rem;font-weight:400;margin:14px 0 2px;line-height:1.1}
.x-cit{font-style:italic;font-size:.92rem;color:rgba(236,200,121,.82);margin:0 0 14px}
.x-cdesc{font-size:.86rem;line-height:1.62;color:rgba(243,234,214,.6);margin:0;max-width:34ch}
.x-carw{margin-top:20px;font-family:'DM Mono',monospace;font-size:.72rem;letter-spacing:.2em;color:rgba(243,234,214,.45);
  display:flex;align-items:center;gap:8px;transition:color .4s,gap .4s}
.x-cat:hover .x-carw{color:#ecc879;gap:14px}

/* footer */
.x-foot{position:relative;z-index:1;max-width:1180px;margin:clamp(56px,8vh,96px) auto 0;
  padding:24px 0 4px;border-top:1px solid rgba(216,178,90,.2);
  display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.x-foot button.lnk,.x-foot a{color:rgba(243,234,214,.7);text-decoration:none;font-family:'DM Mono',monospace;
  font-size:.6rem;letter-spacing:.24em;text-transform:uppercase;transition:color .3s;background:none;border:none;cursor:pointer;padding:0}
.x-foot a:hover,.x-foot button.lnk:hover{color:#ecc879}
.x-foot .fnote{font-family:'DM Mono',monospace;font-size:.58rem;letter-spacing:.2em;text-transform:uppercase;color:rgba(243,234,214,.42)}

/* ════ SCROLL REVEAL ════ */
.reveal{opacity:0;transform:translateY(28px);
  transition:opacity .9s cubic-bezier(.16,1,.3,1),transform .9s cubic-bezier(.16,1,.3,1)}
.reveal.in{opacity:1;transform:none}
.x-cat.reveal{transition-delay:calc(var(--i,0) * 80ms)}

/* ════ TRANSITIONS ════ */
.x-trans{position:fixed;inset:0;z-index:9000;pointer-events:none;overflow:hidden}

/* door — ornate coffered double doors */
.x-trans-door{perspective:1900px}
.x-trans-door .pn{position:absolute;top:0;height:100%;width:50.5%;backface-visibility:hidden;
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='74' height='74'%3E%3Cg fill='none' stroke='%23d8b25a' stroke-opacity='0.16' stroke-width='1'%3E%3Cpath d='M37 2 L72 37 L37 72 L2 37 Z'/%3E%3Ccircle cx='37' cy='37' r='5'/%3E%3C/g%3E%3C/svg%3E"),
    linear-gradient(90deg,rgba(0,0,0,.5),rgba(0,0,0,0) 15%,rgba(0,0,0,0) 85%,rgba(0,0,0,.5)),
    linear-gradient(180deg,#241a16,#120c0a);
  background-size:74px 74px,auto,auto;
  box-shadow:inset 0 0 140px rgba(0,0,0,.85)}
.x-trans-door .pl{left:0;transform-origin:left center;border-right:1px solid rgba(216,178,90,.55)}
.x-trans-door .pr{right:0;transform-origin:right center;border-left:1px solid rgba(216,178,90,.55)}
/* recessed gold-trimmed panels */
.x-trans-door .pn::before,.x-trans-door .pn::after{content:'';position:absolute;left:13%;right:13%;
  border:1px solid rgba(216,178,90,.42);border-radius:3px;
  box-shadow:inset 0 0 0 5px rgba(0,0,0,.22),inset 0 0 40px rgba(0,0,0,.6),0 0 0 1px rgba(0,0,0,.45);
  background:radial-gradient(120% 90% at 50% 50%,rgba(216,178,90,.07),transparent 60%)}
.x-trans-door .pn::before{top:6%;height:40.5%}
.x-trans-door .pn::after{bottom:6%;height:40.5%}
/* gold handles near the seam */
.x-trans-door .kb{position:absolute;top:50%;width:7px;height:56px;border-radius:6px;transform:translateY(-50%);z-index:2;
  background:linear-gradient(180deg,#f3da92,#9c7b32);
  box-shadow:0 0 16px rgba(216,178,90,.5),inset 0 1px 3px rgba(255,255,255,.45),inset 0 -2px 4px rgba(0,0,0,.4)}
.x-trans-door .pl .kb{right:9px}
.x-trans-door .pr .kb{left:9px}
.x-trans-door.cover .pl{animation:dClL .64s cubic-bezier(.7,0,.25,1) forwards}
.x-trans-door.cover .pr{animation:dClR .64s cubic-bezier(.7,0,.25,1) forwards}
.x-trans-door.reveal .pl{animation:dOpL .82s cubic-bezier(.16,1,.3,1) forwards}
.x-trans-door.reveal .pr{animation:dOpR .82s cubic-bezier(.16,1,.3,1) forwards}
@keyframes dClL{from{transform:rotateY(108deg)}to{transform:rotateY(0)}}
@keyframes dClR{from{transform:rotateY(-108deg)}to{transform:rotateY(0)}}
@keyframes dOpL{from{transform:rotateY(0)}to{transform:rotateY(112deg)}}
@keyframes dOpR{from{transform:rotateY(0)}to{transform:rotateY(-112deg)}}

/* iris */
.x-trans-iris .ir{position:absolute;inset:0;
  background:radial-gradient(circle at 50% 50%,#16121a 0%,#0a0709 45%,#060406 100%)}
.x-trans-iris.cover .ir{animation:irIn .6s cubic-bezier(.7,0,.25,1) forwards}
.x-trans-iris.reveal .ir{animation:irOut .78s cubic-bezier(.16,1,.3,1) forwards}
@keyframes irIn{from{clip-path:circle(0% at 50% 50%)}to{clip-path:circle(150% at 50% 50%)}}
@keyframes irOut{from{clip-path:circle(150% at 50% 50%)}to{clip-path:circle(0% at 50% 50%)}}

/* zoom */
.x-trans-zoom .zm{position:absolute;inset:0;
  background:radial-gradient(circle at 50% 50%,#120c0f,#060405 70%)}
.x-trans-zoom.cover .zm{animation:zmIn .6s cubic-bezier(.6,0,.2,1) forwards}
.x-trans-zoom.reveal .zm{animation:zmOut .72s cubic-bezier(.16,1,.3,1) forwards}
@keyframes zmIn{from{opacity:0;transform:scale(1.28)}55%{opacity:1}to{opacity:1;transform:scale(1)}}
@keyframes zmOut{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.9)}}

/* corridor */
.x-trans-corridor .cr{position:absolute;inset:0;
  background:linear-gradient(90deg,#0a0708,#1a1214 50%,#0a0708);
  box-shadow:inset 70px 0 130px rgba(0,0,0,.65),inset -70px 0 130px rgba(0,0,0,.65)}
.x-trans-corridor.cover .cr{animation:crIn .56s cubic-bezier(.7,0,.25,1) forwards}
.x-trans-corridor.reveal .cr{animation:crOut .72s cubic-bezier(.16,1,.3,1) forwards}
@keyframes crIn{from{transform:translateX(101%)}to{transform:translateX(0)}}
@keyframes crOut{from{transform:translateX(0)}to{transform:translateX(-101%)}}

/* ════ TRANSITION SWITCHER (evaluation only) ════ */
.x-switch{position:fixed;right:16px;bottom:16px;z-index:9500;width:228px;
  background:rgba(13,11,12,.84);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border:1px solid rgba(216,178,90,.28);border-radius:14px;padding:13px 13px 11px;
  box-shadow:0 22px 60px rgba(0,0,0,.55);font-family:'DM Mono',monospace}
.x-switch h4{margin:0 0 10px;font-size:.54rem;letter-spacing:.24em;text-transform:uppercase;color:#d8b25a;font-weight:500;
  display:flex;align-items:center;justify-content:space-between}
.x-switch h4 b{color:rgba(243,234,214,.4);font-weight:400}
.x-sgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.x-sbtn{appearance:none;cursor:pointer;text-align:left;padding:8px 10px;border-radius:9px;
  border:1px solid rgba(216,178,90,.18);background:rgba(255,255,255,.02);color:rgba(243,234,214,.72);
  font-family:'DM Mono',monospace;font-size:.66rem;letter-spacing:.04em;transition:all .3s;line-height:1.2}
.x-sbtn:hover{border-color:rgba(216,178,90,.5);color:#f3ead6}
.x-sbtn.on{background:rgba(216,178,90,.16);border-color:#d8b25a;color:#ecc879}
.x-sbtn small{display:block;font-size:.48rem;letter-spacing:.18em;text-transform:uppercase;opacity:.6;margin-top:3px}
.x-shint{margin:10px 2px 0;font-size:.5rem;letter-spacing:.08em;color:rgba(243,234,214,.4);line-height:1.55}

@media (max-width:680px){
  .x-cue{display:none}
  .x-bottom{flex-direction:column;align-items:flex-start}
  .x-mono{display:none}
  .x-switch{top:12px;right:12px;bottom:auto;left:auto;width:178px;padding:10px 10px 8px}
  .x-switch .x-shint{display:none}
  /* show the full painting from edge to edge — no crop, no Ken Burns */
  .x-bg{object-fit:contain;object-position:center;animation:none;transform:none;background:#0c0a0b}
  .x-veil{background:linear-gradient(180deg,rgba(7,6,10,.45) 0%,rgba(7,6,10,0) 26%,rgba(7,6,10,0) 60%,rgba(12,10,11,.92) 100%)}
}
@media (prefers-reduced-motion:reduce){
  .x-bg{animation:none}
  .reveal{opacity:1;transform:none}
}
`

// Fade an image in once it has decoded — handles the cached case where onLoad never fires
const fadeIn = (el: HTMLImageElement | null) => {
  if (!el) return
  const show = () => el.classList.add('ready')
  if (el.complete && el.naturalWidth > 0) show()
  else el.addEventListener('load', show, { once: true })
}

export function XPage() {
  const [view, setView] = useState<string | null>(parseHash())
  const [trans, setTrans] = useState<TransType>('door')
  const [anim, setAnim] = useState<{ type: TransType; phase: 'cover' | 'reveal' } | null>(null)
  const introRef = useRef<HTMLElement>(null)

  const room = view ? CATEGORIES.find(c => c.slug === view) ?? null : null

  // title
  useEffect(() => {
    const prev = document.title
    document.title = room ? `X — ${room.tr} · ${room.art.artist}` : 'X — Dijital Atlas · Botticelli'
    return () => { document.title = prev }
  }, [room])

  // hash sync (browser back/forward + our own pushes)
  useEffect(() => {
    const onHash = () => setView(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // scroll-reveal on the atlas view
  useEffect(() => {
    if (room) return
    const els = Array.from(document.querySelectorAll<HTMLElement>('.x-intro .reveal'))
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } })
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' })
    els.forEach(e => io.observe(e))
    return () => io.disconnect()
  }, [view, room])

  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const navigate = (slug: string | null) => {
    const target = slug ? `#/x/${slug}` : '#/x'
    if (reduce) { window.location.hash = target; window.scrollTo(0, 0); return }
    if (anim) return
    const type = trans
    const [coverMs, revealMs] = DUR[type]
    setAnim({ type, phase: 'cover' })
    window.setTimeout(() => {
      window.location.hash = target
      window.scrollTo(0, 0)
      setAnim({ type, phase: 'reveal' })
      window.setTimeout(() => setAnim(null), revealMs)
    }, coverMs)
  }

  const scrollToIntro = () => introRef.current?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="x-page">
      <style>{CSS}</style>

      {room ? (
        /* ════════ ROOM ════════ */
        <section className="x-hero" key={room.slug}>
          <img
            className="x-bg"
            ref={fadeIn}
            src={room.img}
            alt={`${room.art.artist} — ${room.art.title}`}
            decoding="async"
          />
          <div className="x-veil" />
          <div className="x-grain" />
          <div className="x-frame">
            <header className="x-top">
              <button className="x-brand" onClick={() => navigate(null)}>
                <b>X<em>.</em></b>
                <span>← Koleksiyonlar</span>
              </button>
              <div className="x-mono">{room.tr}<br />Opera N° {room.n}</div>
            </header>

            <div className="x-bottom">
              <div className="x-placard">
                <span className="x-rule" />
                <div>
                  <div className="x-plabel">{room.art.museum}</div>
                  <h1 className="x-ptitle"><em>{room.art.title}</em></h1>
                  <p className="x-pmeta">
                    {room.art.artist}<span className="sep">/</span>{room.art.year}
                    <span className="sep">/</span>{room.art.medium}
                  </p>
                  <div className="x-rtag"><span className="x-dot" />Bu koleksiyon yakında · küratörlükte</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* ════════ ATLAS (hero + intro) ════════ */
        <>
          <section className="x-hero">
            <img
              className="x-bg"
              ref={fadeIn}
              src="/x/venus-4k.jpg"
              srcSet="/x/venus-2k.jpg 1920w, /x/venus-4k.jpg 3840w"
              sizes="100vw"
              alt="Sandro Botticelli — La Nascita di Venere (c. 1485), Galleria degli Uffizi"
              decoding="async"
            />
            <div className="x-veil" />
            <div className="x-grain" />

            <div className="x-frame">
              <header className="x-top">
                <a href="#/" className="x-brand">
                  <b>X<em>.</em></b>
                  <span>← Dijital Atlas</span>
                </a>
                <div className="x-mono">Sandro Botticelli<br />Opera N° 00</div>
              </header>

              <div className="x-bottom">
                <div className="x-placard">
                  <span className="x-rule" />
                  <div>
                    <div className="x-plabel">Galleria degli Uffizi · Firenze</div>
                    <h1 className="x-ptitle">La Nascita di <em>Venere</em></h1>
                    <p className="x-pmeta">
                      Sandro Botticelli<span className="sep">/</span>c. 1485
                      <span className="sep">/</span>Tempera su tela
                    </p>
                  </div>
                </div>

                <button className="x-cue" onClick={scrollToIntro} aria-label="Aşağı kaydır">
                  <span className="x-status"><span className="x-dot" /><span className="x-stxt">Geliştiriliyor</span></span>
                  <span className="x-mouse"><i /></span>
                  <span className="x-cuetxt">Keşfet</span>
                </button>
              </div>
            </div>
          </section>

          <section className="x-intro" ref={introRef}>
            <div className="x-wrap">
              <div className="x-eyebrow reveal">Arşiv Üzerine</div>
              <h2 className="x-lead reveal">
                Gezilen her mekânın, içine girilebilen bir <em>hatıraya</em> dönüştüğü dijital bir atlas.
              </h2>
              <p className="x-body reveal">
                X; sanat eserlerini, otantik mekânları ve doğanın sahnelerini 3D ve 360° olarak yakalayıp
                sinematik bir koleksiyona dönüştürür. Amaç bir uygulama değil — bir his. Bir esere yaklaşır
                gibi gir, ve gör. Her mekân kendi ışığı, dokusu ve sessizliğiyle korunur; ziyaret ettiğin yer,
                zamanın dışında bir köşede kalır.
              </p>

              <div className="x-chead reveal">
                <h2>Koleksiyonlar</h2>
                <span>Sei Collezioni · {CATEGORIES.length}</span>
              </div>

              <div className="x-grid">
                {CATEGORIES.map((c, i) => (
                  <button
                    className="x-cat reveal"
                    key={c.slug}
                    style={{ ['--i' as string]: i }}
                    onClick={() => navigate(c.slug)}
                  >
                    <div className="x-cthumb">
                      <img src={c.img} alt="" loading="lazy" decoding="async"
                        onLoad={(e) => e.currentTarget.classList.add('ld')} />
                    </div>
                    <div className="x-cbody">
                      <div className="x-cnum">{c.n}</div>
                      <h3 className="x-ctitle">{c.tr}</h3>
                      <p className="x-cit">{c.it}</p>
                      <p className="x-cdesc">{c.d}</p>
                      <div className="x-carw">Keşfet <span>→</span></div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <footer className="x-foot">
              <a href="#/">← Hub'a dön</a>
              <span className="fnote">Mavi Atlas · codename X · Geliştiriliyor</span>
            </footer>
          </section>
        </>
      )}

      {/* ════ TRANSITION OVERLAY ════ */}
      {anim && (
        <div className={`x-trans x-trans-${anim.type} ${anim.phase}`} aria-hidden="true">
          {anim.type === 'door' && <><span className="pn pl"><i className="kb" /></span><span className="pn pr"><i className="kb" /></span></>}
          {anim.type === 'iris' && <span className="ir" />}
          {anim.type === 'zoom' && <span className="zm" />}
          {anim.type === 'corridor' && <span className="cr" />}
        </div>
      )}

      {/* ════ TRANSITION SWITCHER (evaluation) ════ */}
      <div className="x-switch">
        <h4>Geçiş <b>seç &amp; dene</b></h4>
        <div className="x-sgrid">
          {TRANS.map(o => (
            <button
              key={o.id}
              className={`x-sbtn${trans === o.id ? ' on' : ''}`}
              onClick={() => setTrans(o.id)}
            >
              {o.tr}<small>{o.en}</small>
            </button>
          ))}
        </div>
        <p className="x-shint">Bir koleksiyona tıkla — seçili geçişle açılır.</p>
      </div>
    </div>
  )
}
