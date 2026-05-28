import { useEffect, useRef, useState } from 'react'

// ═══════════════════════════════════════════════════
// X — cinematic digital-atlas page
// Hero: Botticelli · La Nascita di Venere (4K gigapixel scan)
// Below: manifesto + collections grid (museum-catalog feel)
// ═══════════════════════════════════════════════════

const CATEGORIES = [
  { n: '01', tr: 'Sanat & Müzeler', it: 'Arte & Musei', d: 'Galeriler, koleksiyonlar, fresk ve heykellerin sessiz salonları.' },
  { n: '02', tr: 'Şarap Bağları', it: 'Vigneti', d: 'Tepelere yayılan asmalar, taş mahzenler ve hasat ışığı.' },
  { n: '03', tr: 'Sahil & Doğa', it: 'Costa & Natura', d: 'Kıyılar, koylar ve kesintisiz ufkun dingin genişliği.' },
  { n: '04', tr: 'Tarihi Sokaklar', it: 'Strade Storiche', d: 'Taş döşeli geçitler, eski cepheler, zamanın patinası.' },
  { n: '05', tr: 'Otantik Mekânlar', it: 'Luoghi Autentici', d: 'Kafeler, atölyeler, karakterini koruyan iç mekânlar.' },
  { n: '06', tr: 'Koleksiyonlar', it: 'Collezioni', d: 'Temayla kürate edilmiş seçkiler ve özel rotalar.' },
]

const CSS = `
@keyframes xUp{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:translateY(0)}}
@keyframes xKen{0%{transform:scale(1.04)}100%{transform:scale(1.10)}}
@keyframes xPulse{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:.9;transform:scale(1.35)}}
@keyframes xScroll{0%{transform:translate(-50%,-40%);opacity:0}40%{opacity:1}100%{transform:translate(-50%,140%);opacity:0}}

.x-page{width:100%;background:#0c0a0b;color:#f3ead6;font-family:'Newsreader',Georgia,serif}

/* ════ HERO ════ */
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
.x-brand{text-decoration:none;color:#f3ead6;display:inline-flex;flex-direction:column;gap:3px;line-height:1}
.x-brand b{font-weight:500;font-size:1.5rem;letter-spacing:.04em;font-style:italic;text-shadow:0 1px 20px rgba(0,0,0,.5)}
.x-brand b em{color:#d8b25a;font-style:italic}
.x-brand span{font-family:'DM Mono',monospace;font-size:.58rem;letter-spacing:.32em;text-transform:uppercase;color:rgba(243,234,214,.6)}
.x-brand:hover b em{color:#ecc879}
.x-mono{font-family:'DM Mono',monospace;font-size:.6rem;letter-spacing:.26em;text-transform:uppercase;
  color:rgba(243,234,214,.7);text-align:right;line-height:1.9;text-shadow:0 1px 12px rgba(0,0,0,.6)}

.x-bottom{display:flex;align-items:flex-end;justify-content:space-between;gap:24px}
.x-placard{display:flex;gap:18px;align-items:stretch;max-width:560px;
  animation:xUp 1.2s cubic-bezier(.16,1,.3,1) .25s both}
.x-rule{width:1px;flex:none;align-self:stretch;background:linear-gradient(180deg,transparent,#d8b25a 35%,#d8b25a 65%,transparent)}
.x-plabel{font-family:'DM Mono',monospace;font-size:.6rem;letter-spacing:.3em;text-transform:uppercase;color:#d8b25a;margin-bottom:12px}
.x-ptitle{font-size:clamp(2.3rem,5.4vw,4.6rem);font-weight:400;line-height:.98;letter-spacing:-.01em;margin:0 0 14px;text-shadow:0 2px 30px rgba(0,0,0,.55)}
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
.x-cat{position:relative;background:#0c0a0b;padding:30px 30px 30px;cursor:pointer;overflow:hidden;
  transition:background .55s cubic-bezier(.16,1,.3,1)}
.x-cat::after{content:'';position:absolute;left:0;top:0;height:2px;width:0;background:#d8b25a;
  transition:width .55s cubic-bezier(.16,1,.3,1)}
.x-cat:hover{background:#120e0c}
.x-cat:hover::after{width:100%}
.x-cnum{font-family:'DM Mono',monospace;font-size:.6rem;letter-spacing:.2em;color:#d8b25a;opacity:.85}
.x-ctitle{font-size:1.45rem;font-weight:400;margin:16px 0 2px;line-height:1.1}
.x-cit{font-style:italic;font-size:.92rem;color:rgba(236,200,121,.82);margin:0 0 14px}
.x-cdesc{font-size:.86rem;line-height:1.62;color:rgba(243,234,214,.6);margin:0;max-width:34ch}
.x-carw{margin-top:20px;font-family:'DM Mono',monospace;font-size:.72rem;letter-spacing:.2em;color:rgba(243,234,214,.45);
  display:flex;align-items:center;gap:8px;transition:color .4s,gap .4s}
.x-cat:hover .x-carw{color:#ecc879;gap:14px}

/* footer */
.x-foot{position:relative;z-index:1;max-width:1180px;margin:clamp(56px,8vh,96px) auto 0;
  padding:24px 0 4px;border-top:1px solid rgba(216,178,90,.2);
  display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.x-foot a{color:rgba(243,234,214,.7);text-decoration:none;font-family:'DM Mono',monospace;
  font-size:.6rem;letter-spacing:.24em;text-transform:uppercase;transition:color .3s}
.x-foot a:hover{color:#ecc879}
.x-foot .fnote{font-family:'DM Mono',monospace;font-size:.58rem;letter-spacing:.2em;text-transform:uppercase;color:rgba(243,234,214,.42)}

@media (max-width:680px){
  .x-cue{display:none}
  .x-bottom{flex-direction:column;align-items:flex-start}
  .x-mono{display:none}
}
`

export function XPage() {
  const [ready, setReady] = useState(false)
  const introRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const prev = document.title
    document.title = 'X — Dijital Atlas · Botticelli'
    return () => { document.title = prev }
  }, [])

  const scrollToIntro = () => introRef.current?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="x-page">
      <style>{CSS}</style>

      {/* ════ HERO ════ */}
      <section className="x-hero">
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
            <div className="x-mono">Sanat &amp; Müzeler<br />Opera N° 01</div>
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

      {/* ════ INTRO / MANIFESTO ════ */}
      <section className="x-intro" ref={introRef}>
        <div className="x-wrap">
          <div className="x-eyebrow">Arşiv Üzerine</div>
          <h2 className="x-lead">
            Gezilen her mekânın, içine girilebilen bir <em>hatıraya</em> dönüştüğü dijital bir atlas.
          </h2>
          <p className="x-body">
            X; sanat eserlerini, otantik mekânları ve doğanın sahnelerini 3D ve 360° olarak yakalayıp
            sinematik bir koleksiyona dönüştürür. Amaç bir uygulama değil — bir his. Bir esere yaklaşır
            gibi gir, ve gör. Her mekân kendi ışığı, dokusu ve sessizliğiyle korunur; ziyaret ettiğin yer,
            zamanın dışında bir köşede kalır.
          </p>

          <div className="x-chead">
            <h2>Koleksiyonlar</h2>
            <span>Sei Collezioni · {CATEGORIES.length}</span>
          </div>

          <div className="x-grid">
            {CATEGORIES.map(c => (
              <div className="x-cat" key={c.n} role="button" tabIndex={0}>
                <div className="x-cnum">{c.n}</div>
                <h3 className="x-ctitle">{c.tr}</h3>
                <p className="x-cit">{c.it}</p>
                <p className="x-cdesc">{c.d}</p>
                <div className="x-carw">Keşfet <span>→</span></div>
              </div>
            ))}
          </div>
        </div>

        <footer className="x-foot">
          <a href="#/">← Hub'a dön</a>
          <span className="fnote">Mavi Atlas · codename X · Geliştiriliyor</span>
        </footer>
      </section>
    </div>
  )
}
