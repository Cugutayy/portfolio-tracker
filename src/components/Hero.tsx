import { useState, useEffect } from 'react'

export function Hero({ lang }: { lang: string }) {
  const [clock, setClock] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const locale = lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'tr-TR'
      const t = now.toLocaleTimeString(locale, { timeZone:'Europe/Istanbul', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false })
      const d = now.toLocaleDateString(locale, { timeZone:'Europe/Istanbul', day:'numeric', month:'long', year:'numeric' })
      setClock(`${d} · ${t}`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [lang])

  return (
    <header className="container" style={{ paddingTop:60, paddingBottom:20, display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
      <div>
        <h1 style={{ fontSize:'clamp(1.4rem, 3vw, 1.8rem)', fontWeight:300, lineHeight:1.15, letterSpacing:'-.02em' }}>
          S. Çağatay <em style={{ fontWeight:300, fontStyle:'italic' }}>Sönmez</em>
        </h1>
        <p style={{ marginTop:6, color:'var(--muted)', fontSize:'.75rem', lineHeight:1.4 }}>Developer · Data · ML</p>
      </div>
      <div style={{ textAlign:'right' }}>
        <div className="mono" style={{ fontSize:'.62rem', color:'var(--muted)', letterSpacing:'.04em', opacity:.6 }}>{clock}</div>
      </div>
    </header>
  )
}
