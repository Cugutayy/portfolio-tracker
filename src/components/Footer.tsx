/** Colophon — newspaper-style closing strip. */
export function Footer() {
  return (
    <footer className="container" style={{ paddingBottom: 36 }}>
      <hr className="rule-double" style={{ opacity: .8 }} />
      <div style={{ padding: '16px 2px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
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
