export function Footer() {
  return (
    <footer className="container">
      <div style={{ padding:'20px 0', borderTop:'1px solid var(--rule)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
          <a href="mailto:s.cagatay.sonmez@gmail.com" className="link-ed mono" style={{ fontSize:'.65rem' }}>s.cagatay.sonmez@gmail.com</a>
          <a href="https://github.com/Cugutayy" target="_blank" className="link-ed mono" style={{ fontSize:'.65rem' }}>GitHub</a>
        </div>
        <span className="mono" style={{ fontSize:'.55rem', color:'var(--muted)' }}>© 2026 snmez.xyz</span>
      </div>
    </footer>
  )
}
