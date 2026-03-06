export function Footer() {
  return (
    <>
      <div className="container" style={{ padding:'48px 0', display:'flex', flexWrap:'wrap', gap:24, justifyContent:'center' }}>
        <a href="mailto:s.cagatay.sonmez@gmail.com" className="link-ed mono" style={{ fontSize:'.78rem' }}>s.cagatay.sonmez@gmail.com</a>
        <a href="https://github.com/Cugutayy" target="_blank" className="link-ed mono" style={{ fontSize:'.78rem' }}>GitHub ↗</a>
      </div>
      <footer className="container">
        <div style={{ padding:'28px 0', borderTop:'1px solid var(--rule)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span className="mono" style={{ fontSize:'.65rem', color:'var(--muted)' }}>© 2026</span>
          <span className="mono" style={{ fontSize:'.65rem', color:'var(--muted)' }}>snmez.xyz</span>
        </div>
      </footer>
    </>
  )
}
