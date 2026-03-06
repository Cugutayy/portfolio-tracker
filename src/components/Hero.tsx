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
    <header className="container" style={{ paddingTop:72, paddingBottom:32, display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
      <div>
        <h1 style={{ fontSize:'clamp(1.8rem, 4vw, 2.8rem)', fontWeight:300, lineHeight:1.1, letterSpacing:'-.02em' }}>
          S. Çağatay<br/><em style={{ fontWeight:300, fontStyle:'italic' }}>Sönmez</em>
        </h1>
      </div>
      <div style={{ textAlign:'right' }}>
        <div className="mono" style={{ fontSize:'.72rem', color:'var(--muted)', letterSpacing:'.03em' }}>{clock}</div>
      </div>
    </header>
  )
}
