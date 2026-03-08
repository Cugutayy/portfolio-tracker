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
    <header className="container" style={{ paddingTop:80, paddingBottom:40, display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
      <div>
        <h1 style={{ fontSize:'clamp(2rem, 4.5vw, 3.2rem)', fontWeight:300, lineHeight:1.05, letterSpacing:'-.03em' }}>
          S. Çağatay<br/><em style={{ fontWeight:300, fontStyle:'italic' }}>Sönmez</em>
        </h1>
        <p style={{ marginTop:12, color:'var(--muted)', fontSize:'.82rem', maxWidth:320, lineHeight:1.5 }}>Developer · Data · ML</p>
      </div>
      <div style={{ textAlign:'right' }}>
        <div className="mono" style={{ fontSize:'.68rem', color:'var(--muted)', letterSpacing:'.04em', opacity:.7 }}>{clock}</div>
      </div>
    </header>
  )
}
