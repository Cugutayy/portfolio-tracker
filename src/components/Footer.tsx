export function Footer() {
  return (
    <footer className="container">
      <div style={{ padding:'28px 0', borderTop:'1px solid var(--rule)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
          <a href="mailto:s.cagatay.sonmez@gmail.com" className="link-ed mono" style={{ fontSize:'.6rem', letterSpacing:'.02em' }}>s.cagatay.sonmez@gmail.com</a>
          <a href="https://github.com/Cugutayy" target="_blank" className="link-ed mono" style={{ fontSize:'.6rem', letterSpacing:'.02em' }}>GitHub</a>
        </div>
        <span className="mono" style={{ fontSize:'.5rem', color:'var(--muted)', opacity:0.5 }}>&copy; 2026 snmez.xyz</span>
      </div>
    </footer>
  )
}
