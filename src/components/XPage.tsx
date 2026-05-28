import { useEffect, useState } from 'react'

// ═══════════════════════════════════════════════════
// X — cinematic digital-atlas hero
// Featured opera: Botticelli · La Nascita di Venere (4K gigapixel scan)
// Aesthetic: museum wall / elite gallery · visuals first
// ═══════════════════════════════════════════════════

const CSS = `
@keyframes xUp{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:translateY(0)}}
@keyframes xKen{0%{transform:scale(1.04)}100%{transform:scale(1.10)}}
@keyframes xPulse{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:.9;transform:scale(1.35)}}
@keyframes xScroll{0%{transform:translateY(-40%);opacity:0}40%{opacity:1}100%{transform:translateY(140%);opacity:0}}

.x-root{position:relative;width:100%;height:100vh;height:100svh;overflow:hidden;background:#07060a;
  color:#f3ead6;font-family:'Newsreader',Georgia,serif}

/* ── cinematic background image (4K painting) ── */
.x-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;
  z-index:0;opacity:0;transition:opacity 1.6s cubic-bezier(.16,1,.3,1);
  animation:xKen 40s ease-in-out infinite alternate;will-change:transform,opacity}
.x-bg.ready{opacity:1}

/* ── legibility veils + vignette ── */
.x-veil{position:absolute;inset:0;z-index:1;pointer-events:none;
  background:
    linear-gradient(180deg,rgba(7,6,10,.55) 0%,rgba(7,6,10,0) 22%,rgba(7,6,10,0) 55%,rgba(7,6,10,.78) 100%),
    linear-gradient(90deg,rgba(7,6,10,.55) 0%,rgba(7,6,10,0) 38%),
    radial-gradient(120% 90% at 50% 45%,rgba(0,0,0,0) 55%,rgba(0,0,0,.5) 100%)}
/* film grain */
.x-grain{position:absolute;inset:0;z-index:2;pointer-events:none;opacity:.05;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}

/* ── content frame ── */
.x-frame{position:relative;z-index:3;height:100%;display:flex;flex-direction:column;justify-content:space-between;
  padding:clamp(22px,3.5vw,46px) clamp(22px,4vw,64px)}

/* top bar */
.x-top{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;
  animation:xUp 1.1s cubic-bezier(.16,1,.3,1) both}
.x-brand{text-decoration:none;color:#f3ead6;display:inline-flex;flex-direction:column;gap:3px;line-height:1}
.x-brand b{font-weight:500;font-size:1.5rem;letter-spacing:.04em;font-style:italic;
  text-shadow:0 1px 20px rgba(0,0,0,.5)}
.x-brand b em{color:#d8b25a;font-style:italic}
.x-brand span{font-family:'DM Mono',monospace;font-size:.58rem;letter-spacing:.32em;text-transform:uppercase;
  color:rgba(243,234,214,.6)}
.x-brand:hover b em{color:#ecc879}
.x-mono{font-family:'DM Mono',monospace;font-size:.6rem;letter-spacing:.26em;text-transform:uppercase;
  color:rgba(243,234,214,.7);text-align:right;line-height:1.9;text-shadow:0 1px 12px rgba(0,0,0,.6)}

/* bottom row */
.x-bottom{display:flex;align-items:flex-end;justify-content:space-between;gap:24px}

/* museum placard */
.x-placard{display:flex;gap:18px;align-items:stretch;max-width:560px;
  animation:xUp 1.2s cubic-bezier(.16,1,.3,1) .25s both}
.x-rule{width:1px;flex:none;align-self:stretch;
  background:linear-gradient(180deg,transparent,#d8b25a 35%,#d8b25a 65%,transparent)}
.x-plabel{font-family:'DM Mono',monospace;font-size:.6rem;letter-spacing:.3em;text-transform:uppercase;
  color:#d8b25a;margin-bottom:12px}
.x-ptitle{font-size:clamp(2.3rem,5.4vw,4.6rem);font-weight:400;line-height:.98;letter-spacing:-.01em;margin:0 0 14px;
  text-shadow:0 2px 30px rgba(0,0,0,.55)}
.x-ptitle em{font-style:italic;color:#f6e9c9}
.x-pmeta{font-family:'DM Mono',monospace;font-size:.66rem;letter-spacing:.06em;line-height:1.7;
  color:rgba(243,234,214,.72);margin:0}
.x-pmeta .sep{color:#d8b25a;padding:0 7px;opacity:.8}

/* right column — status + scroll cue */
.x-side{display:flex;flex-direction:column;align-items:flex-end;gap:22px;flex:none;
  animation:xUp 1.2s cubic-bezier(.16,1,.3,1) .45s both}
.x-status{display:flex;align-items:center;gap:8px}
.x-dot{width:6px;height:6px;border-radius:50%;background:#d8b25a;box-shadow:0 0 10px #d8b25a;
  animation:xPulse 2.6s ease-in-out infinite}
.x-stxt{font-family:'DM Mono',monospace;font-size:.58rem;letter-spacing:.24em;text-transform:uppercase;
  color:rgba(243,234,214,.66)}
.x-mouse{width:22px;height:36px;border:1px solid rgba(243,234,214,.4);border-radius:12px;position:relative;overflow:hidden}
.x-mouse i{position:absolute;left:50%;top:7px;width:3px;height:7px;border-radius:2px;background:#d8b25a;
  transform:translateX(-50%);animation:xScroll 2.2s cubic-bezier(.16,1,.3,1) infinite}

@media (max-width:680px){
  .x-side{display:none}
  .x-bottom{flex-direction:column;align-items:flex-start}
  .x-mono{display:none}
}
`

export function XPage() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const prev = document.title
    document.title = 'X — Dijital Atlas · Botticelli'
    return () => { document.title = prev }
  }, [])

  return (
    <div className="x-root">
      <style>{CSS}</style>

      <img
        className={`x-bg${ready ? ' ready' : ''}`}
        src="/x/venus-4k.jpg"
        srcSet="/x/venus-2k.jpg 1920w, /x/venus-4k.jpg 3840w"
        sizes="100vw"
        alt="Sandro Botticelli — La Nascita di Venere (c. 1485), Galleria degli Uffizi"
        decoding="async"
        onLoad={() => setReady(true)}
      />

      <div className="x-veil" />
      <div className="x-grain" />

      <div className="x-frame">
        <header className="x-top">
          <a href="#/" className="x-brand">
            <b>X<em>.</em></b>
            <span>← Dijital Atlas</span>
          </a>
          <div className="x-mono">
            Sanat &amp; Müzeler<br />Opera N° 01
          </div>
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

          <div className="x-side">
            <div className="x-status">
              <span className="x-dot" />
              <span className="x-stxt">Geliştiriliyor</span>
            </div>
            <div className="x-mouse"><i /></div>
          </div>
        </div>
      </div>
    </div>
  )
}
