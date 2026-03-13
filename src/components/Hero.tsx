import { useState, useEffect } from 'react'

export function Hero({ lang }: { lang: string }) {
  const [clock, setClock] = useState('')
  const [vis, setVis] = useState(false)

  useEffect(() => { const t = setTimeout(() => setVis(true), 80); return () => clearTimeout(t) }, [])

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const locale = lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'tr-TR'
      const t = now.toLocaleTimeString(locale, { timeZone:'Europe/Istanbul', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false })
      const d = now.toLocaleDateString(locale, { timeZone:'Europe/Istanbul', day:'numeric', month:'long', year:'numeric' })
      setClock(`${d} \u00B7 ${t}`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [lang])

  const role = lang === 'zh' ? '\u91D1\u878D \u00B7 \u673A\u5668\u5B66\u4E60 \u00B7 \u6570\u636E\u79D1\u5B66'
    : lang === 'en' ? 'Finance \u00B7 Machine Learning \u00B7 Data'
    : 'Finans \u00B7 Makine \u00D6\u011Frenmesi \u00B7 Veri'

  return (
    <header style={{
      minHeight: '52vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      paddingTop: 80,
      paddingBottom: 8,
    }}>
      {/* Clock — subtle top detail */}
      <div className="mono" style={{
        fontSize: '.52rem',
        color: 'var(--muted)',
        letterSpacing: '.08em',
        opacity: vis ? 0.35 : 0,
        transition: 'opacity 1.5s ease 0.6s',
        marginBottom: 28,
      }}>
        {clock}
      </div>

      {/* Main Title */}
      <h1 style={{
        fontSize: 'clamp(2.6rem, 6.5vw, 5rem)',
        fontWeight: 400,
        letterSpacing: '-0.035em',
        lineHeight: 1.06,
        textAlign: 'center',
        fontStyle: 'italic',
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 1.1s cubic-bezier(.16,1,.3,1), transform 1.1s cubic-bezier(.16,1,.3,1)',
      }}>
        {"S. \u00C7a\u011Fatay"}<br/>{"S\u00F6nmez"}
      </h1>

      {/* Role subtitle */}
      <p className="mono" style={{
        fontSize: '.62rem',
        color: 'var(--muted)',
        letterSpacing: '.18em',
        textTransform: 'uppercase',
        marginTop: 20,
        opacity: vis ? 0.55 : 0,
        transform: vis ? 'translateY(0)' : 'translateY(14px)',
        transition: 'opacity 1.3s cubic-bezier(.16,1,.3,1) 0.15s, transform 1.3s cubic-bezier(.16,1,.3,1) 0.15s',
      }}>
        {role}
      </p>

      {/* Geometric accent — thin vertical line */}
      <div style={{
        width: 1,
        height: 44,
        background: 'linear-gradient(to bottom, var(--rule), transparent)',
        marginTop: 32,
        opacity: vis ? 0.4 : 0,
        transition: 'opacity 2s ease 0.4s',
      }} />
    </header>
  )
}
