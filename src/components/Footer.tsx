/** Colophon — newspaper-style closing strip. */
export function Footer() {
  return (
    <footer className="container" style={{ paddingBottom: 36 }}>
      <hr className="rule-double" style={{ opacity: .8 }} />

      {/* signature mark — the white-lily favicon + a quiet motto */}
      <div style={{ padding: '20px 2px 4px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="/x/favicon-lily.png" alt="" aria-hidden width="22" height="22"
          style={{ opacity: 0.82, filter: 'drop-shadow(0 1px 6px rgba(0,0,0,0.4))' }} />
        <span className="font-display" style={{ fontStyle: 'italic', fontSize: '1.05rem', color: 'var(--ink)', opacity: 0.78, letterSpacing: '0.01em' }}>
          bir zambak gibi, yavaşça
        </span>
      </div>

      <div style={{ padding: '8px 2px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
          <a href="mailto:s.cagatay.sonmez@gmail.com" className="link-ed mono" style={{ fontSize: '.58rem', letterSpacing: '.06em' }}>s.cagatay.sonmez@gmail.com</a>
          <a href="https://github.com/Cugutayy" target="_blank" className="link-ed mono" style={{ fontSize: '.58rem', letterSpacing: '.06em' }}>github</a>
        </div>
        <span className="mono" style={{ fontSize: '.5rem', letterSpacing: '.12em', color: 'var(--muted)', opacity: .6, textTransform: 'uppercase' }}>
          Dizgi: React · Baskı: Vercel · © 2026 snmez.xyz
        </span>
      </div>
    </footer>
  )
}
