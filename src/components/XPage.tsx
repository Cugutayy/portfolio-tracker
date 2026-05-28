import { useEffect } from 'react'

// ═══════════════════════════════════════════════════
// X — cinematic 3D/360 digital space archive (hero scaffold)
// Codename "X" · premium / museum / dark textured aesthetic
// ═══════════════════════════════════════════════════

const CATEGORIES = [
  { tr: 'Sanat & Müzeler', en: 'Art & Museums' },
  { tr: 'Şarap Bağları', en: 'Vineyards' },
  { tr: 'Sahil & Doğa', en: 'Coast & Nature' },
  { tr: 'Tarihi Sokaklar', en: 'Historic Streets' },
  { tr: 'Otantik Mekânlar', en: 'Authentic Interiors' },
  { tr: 'Koleksiyonlar', en: 'Collections' },
]

const CSS = `
@keyframes xFadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
@keyframes xDrift{0%{transform:translate(0,0) scale(1)}100%{transform:translate(3%,-2%) scale(1.08)}}
@keyframes xShimmer{0%,100%{opacity:.5}50%{opacity:.9}}
.x-root{min-height:100vh;background:#070b14;color:#e7ecf5;font-family:'Newsreader',Georgia,serif;position:relative;overflow:hidden}
/* deep textured atmosphere */
.x-root::before{content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
  background:radial-gradient(ellipse at 25% -10%,rgba(79,143,247,.16) 0%,transparent 55%),
  radial-gradient(ellipse at 90% 20%,rgba(40,70,130,.14) 0%,transparent 50%),
  radial-gradient(ellipse at 50% 120%,rgba(60,107,168,.12) 0%,transparent 55%);
  animation:xDrift 24s ease-in-out infinite alternate}
.x-root::after{content:'';position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.035;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.x-wrap{position:relative;z-index:1;max-width:1100px;margin:0 auto;padding:0 28px;min-height:100vh;display:flex;flex-direction:column}
.x-nav{display:flex;align-items:center;justify-content:space-between;padding:26px 0}
.x-back{font-family:'DM Mono',monospace;font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(231,236,245,.55);text-decoration:none;transition:color .3s}
.x-back:hover{color:#4f8ff7}
.x-mono{font-family:'DM Mono',monospace;font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;color:rgba(231,236,245,.4)}
.x-hero{flex:1;display:flex;flex-direction:column;justify-content:center;padding:48px 0 64px}
.x-kicker{font-family:'DM Mono',monospace;font-size:.66rem;letter-spacing:.34em;text-transform:uppercase;color:#4f8ff7;opacity:.85;margin-bottom:22px;animation:xFadeUp .9s cubic-bezier(.16,1,.3,1) both}
.x-title{font-size:clamp(3.4rem,11vw,8.5rem);font-weight:400;line-height:.92;letter-spacing:-.02em;margin:0 0 26px;animation:xFadeUp 1s cubic-bezier(.16,1,.3,1) .1s both}
.x-title em{font-style:italic;color:#4f8ff7}
.x-lead{font-size:clamp(1.05rem,2.2vw,1.5rem);font-weight:300;line-height:1.55;max-width:620px;color:rgba(231,236,245,.78);margin:0 0 40px;animation:xFadeUp 1s cubic-bezier(.16,1,.3,1) .2s both}
.x-cats{display:flex;flex-wrap:wrap;gap:10px;animation:xFadeUp 1s cubic-bezier(.16,1,.3,1) .32s both}
/* liquid glass chip */
.x-chip{position:relative;overflow:hidden;padding:10px 18px;border-radius:999px;
  background:rgba(255,255,255,.018);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  box-shadow:inset 0 1px 1px rgba(255,255,255,.08);
  font-family:'DM Mono',monospace;font-size:.66rem;letter-spacing:.12em;text-transform:uppercase;color:rgba(231,236,245,.62);
  transition:color .3s,transform .4s cubic-bezier(.16,1,.3,1)}
.x-chip::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;
  background:linear-gradient(180deg,rgba(255,255,255,.4) 0%,rgba(255,255,255,.06) 40%,rgba(255,255,255,0) 60%,rgba(79,143,247,.3) 100%);
  -webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
.x-chip:hover{color:#fff;transform:translateY(-2px)}
.x-foot{padding:24px 0 30px;display:flex;align-items:center;justify-content:space-between;
  border-top:1px solid rgba(255,255,255,.06)}
.x-status{display:flex;align-items:center;gap:8px}
.x-dot{width:6px;height:6px;border-radius:50%;background:#4f8ff7;animation:xShimmer 2.2s ease-in-out infinite}
`

export function XPage() {
  useEffect(() => {
    const prev = document.title
    document.title = 'X — Digital Atlas'
    return () => { document.title = prev }
  }, [])

  return (
    <div className="x-root">
      <style>{CSS}</style>
      <div className="x-wrap">
        <nav className="x-nav">
          <a href="#/" className="x-back">← Hub</a>
          <span className="x-mono">07 / Atlas</span>
        </nav>

        <header className="x-hero">
          <div className="x-kicker">3D · 360° · Dijital Mekân Arşivi</div>
          <h1 className="x-title">X<em>.</em></h1>
          <p className="x-lead">
            Gezilen estetik ve otantik mekânların sinematik, immersive dijital atlası.
            Gir ve gör — sanat galerileri, şarap bağları, tarihi sokaklar ve daha fazlası
            3D yakalanmış mekânlar olarak.
          </p>
          <div className="x-cats">
            {CATEGORIES.map(c => (
              <span key={c.en} className="x-chip">{c.tr}</span>
            ))}
          </div>
        </header>

        <footer className="x-foot">
          <span className="x-mono">Mavi Atlas · codename X</span>
          <span className="x-status">
            <span className="x-dot" />
            <span className="x-mono">Geliştiriliyor</span>
          </span>
        </footer>
      </div>
    </div>
  )
}
