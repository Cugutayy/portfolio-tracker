import { useState, useEffect } from 'react'

/**
 * Cinematic hero — a 4K photograph of white lilies glowing out of pure black,
 * full-bleed with a slow ken-burns drift. The image's black ground blends into
 * the dark hub; over it sit liquid-glass chrome and a serif nameplate that
 * blurs in word by word.
 */
export function Hero({ lang }: { lang: string }) {
  const [clock, setClock] = useState('')

  useEffect(() => {
    const tick = () => {
      const locale = lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'tr-TR'
      setClock(new Date().toLocaleTimeString(locale, { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hour12: false }))
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [lang])

  const t = {
    contact: lang === 'zh' ? '联系' : lang === 'en' ? 'Contact' : 'İletişim',
    scroll: lang === 'zh' ? '向下滚动' : lang === 'en' ? 'Scroll' : 'Kaydır',
  }
  const name = ['S.', 'Çağatay', 'Sönmez']

  return (
    <header
      className="font-ui"
      style={{
        position: 'relative', minHeight: '100svh', overflow: 'hidden',
        background: 'transparent', color: '#f4efe6',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start',
        textAlign: 'right', padding: 'clamp(82px, 11vh, 122px) clamp(20px, 4.5vw, 56px) 0',
      }}
    >
      {/* No area filter at all — the lily reads at full brightness here exactly
          like the rest of the page. The nameplate stays legible purely through
          its own text shadow (a halo on the glyphs, not a rectangle). */}

      {/* ── small top-right identity cluster ── */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', maxWidth: 460 }}>
        <h1 className="font-display" style={{
          fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(1.5rem, 3.4vw, 2.5rem)', lineHeight: 1,
          letterSpacing: '-0.02em', margin: 0, display: 'flex', flexWrap: 'nowrap', whiteSpace: 'nowrap',
          justifyContent: 'flex-end', columnGap: '0.24em',
          textShadow: '0 1px 2px rgba(0,0,0,0.55), 0 2px 14px rgba(0,0,0,0.7)',
        }}>
          {name.map((w, i) => (
            <span key={i} className="hw" style={{ animationDelay: `${0.18 + i * 0.13}s`, color: i === 2 ? '#f0cf86' : '#fdf8ee' }}>{w}</span>
          ))}
        </h1>

        <div className="hf" style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12, flexWrap: 'wrap', justifyContent: 'flex-end', animationDelay: '.62s' }}>
          <span className="font-display" style={{ fontStyle: 'italic', fontSize: '1.05rem', color: '#fdf8ee', lineHeight: 1, textShadow: '0 1px 8px rgba(0,0,0,0.7)' }}>{clock || '··:··'}</span>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(244,239,230,0.4)' }} />
          <a href="mailto:s.cagatay.sonmez@gmail.com" style={{ fontSize: '.74rem', color: '#f4efe6', textDecoration: 'none', borderBottom: '1px solid rgba(244,239,230,0.4)', paddingBottom: 2, textShadow: '0 1px 8px rgba(0,0,0,0.75)' }}>{t.contact}</a>
        </div>
      </div>

      <a href="#projects" aria-label={t.scroll} className="scroll-cue" style={{ position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 11, color: 'rgba(244,239,230,0.5)', textDecoration: 'none' }}>
        <svg width="18" height="26" viewBox="0 0 18 26" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1" y="1" width="16" height="24" rx="8" /><line x1="9" y1="7" x2="9" y2="12" strokeLinecap="round" /></svg>
      </a>
    </header>
  )
}
