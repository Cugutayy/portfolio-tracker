import { useState, useEffect } from 'react'

/**
 * Masthead hero — personal broadsheet nameplate.
 * Eyebrow · giant serif name with italic accent · role line ·
 * newspaper edition line (date · live Istanbul clock · issue) between rules.
 */
export function Hero({ lang }: { lang: string }) {
  const [clock, setClock] = useState('')
  const [dateLine, setDateLine] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const locale = lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'tr-TR'
      setClock(now.toLocaleTimeString(locale, { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
      setDateLine(
        now
          .toLocaleDateString(locale, { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })
          .toLocaleUpperCase(locale),
      )
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [lang])

  const eyebrow = lang === 'zh' ? '个人版 · 伊兹密尔' : lang === 'en' ? 'PERSONAL EDITION · IZMIR' : 'KİŞİSEL EDİSYON · İZMİR'
  const role = lang === 'zh' ? '金融 · 机器学习 · 数据'
    : lang === 'en' ? 'Finance · Machine Learning · Data'
    : 'Finans · Makine Öğrenmesi · Veri'
  const issue = lang === 'zh' ? '第 II 期 · 9个项目' : lang === 'en' ? 'VOL. II · 9 PROJECTS' : 'CİLT II · 9 PROJE'
  const liveLabel = lang === 'zh' ? '实时' : lang === 'en' ? 'LIVE' : 'CANLI'

  return (
    <header className="container" style={{ paddingTop: 92, paddingBottom: 8 }}>
      {/* nameplate */}
      <div style={{ textAlign: 'center', padding: '40px 0 34px' }}>
        <div className="eyebrow fade-up" style={{ marginBottom: 26, animationDelay: '.05s' }}>
          {eyebrow}
        </div>

        <h1 className="display fade-up" style={{
          fontSize: 'clamp(3rem, 9vw, 6.4rem)',
          margin: 0,
          animationDelay: '.16s',
        }}>
          {'S. Çağatay '}
          <span className="italic-accent">Sönmez</span>
        </h1>

        <p className="mono fade-up" style={{
          fontSize: '.62rem',
          color: 'var(--muted)',
          letterSpacing: '.24em',
          textTransform: 'uppercase',
          marginTop: 24,
          animationDelay: '.3s',
        }}>
          {role}
        </p>
      </div>

      {/* edition line — between newspaper rules */}
      <div className="fade-up" style={{ animationDelay: '.42s' }}>
        <hr className="rule-thick" style={{ opacity: .85 }} />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 14, flexWrap: 'wrap', padding: '9px 2px',
        }}>
          <span className="mono" style={{ fontSize: '.56rem', letterSpacing: '.14em', color: 'var(--muted)' }}>
            {issue}
          </span>
          <span className="mono" style={{ fontSize: '.56rem', letterSpacing: '.14em', color: 'var(--muted)' }}>
            {dateLine}
          </span>
          <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: '.56rem', letterSpacing: '.14em', color: 'var(--muted)' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', animation: 'pd 2s ease-in-out infinite', display: 'inline-block' }} />
            {liveLabel} · {clock}
          </span>
        </div>
        <hr className="rule-thin" />
      </div>
    </header>
  )
}
