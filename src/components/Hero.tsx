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
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
        textAlign: 'center', padding: '92px 22px clamp(8vh, 12vh, 130px)',
      }}
    >
      {/* No area filter at all — the lily reads at full brightness here exactly
          like the rest of the page. The nameplate stays legible purely through
          its own text shadow (a halo on the glyphs, not a rectangle). */}

      {/* ── glass content ── */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 720 }}>
        <h1 className="font-display" style={{
          fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(3.4rem, 9.5vw, 7rem)', lineHeight: 0.9,
          letterSpacing: '-0.03em', margin: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          columnGap: '0.28em', rowGap: '0.02em',
          textShadow: '0 1px 2px rgba(0,0,0,0.6), 0 2px 12px rgba(0,0,0,0.7), 0 4px 36px rgba(0,0,0,0.85)',
        }}>
          {name.map((w, i) => (
            <span key={i} className="hw" style={{ animationDelay: `${0.4 + i * 0.13}s`, color: i === 2 ? '#f0cf86' : '#fdf8ee' }}>{w}</span>
          ))}
        </h1>

        <div className="hf" style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 26, flexWrap: 'wrap', justifyContent: 'center', animationDelay: '.9s' }}>
          <a href="mailto:s.cagatay.sonmez@gmail.com" style={{ fontSize: '.86rem', color: '#f4efe6', textDecoration: 'none', borderBottom: '1px solid rgba(244,239,230,0.4)', paddingBottom: 2, textShadow: '0 1px 3px rgba(0,0,0,0.7), 0 1px 12px rgba(0,0,0,0.8)' }}>{t.contact}</a>
        </div>

        {/* bare, frameless live clock */}
        <div className="hf font-display" style={{
          marginTop: 22, animationDelay: '1.05s', fontStyle: 'italic', lineHeight: 1,
          fontSize: 'clamp(2rem, 4.6vw, 3rem)', letterSpacing: '-0.01em', color: '#fdf8ee',
          textShadow: '0 1px 2px rgba(0,0,0,0.6), 0 2px 16px rgba(0,0,0,0.8), 0 3px 34px rgba(0,0,0,0.85)',
        }}>{clock || '··:··'}</div>
      </div>

      <a href="#projects" aria-label={t.scroll} className="scroll-cue" style={{ position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 11, color: 'rgba(244,239,230,0.5)', textDecoration: 'none' }}>
        <svg width="18" height="26" viewBox="0 0 18 26" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1" y="1" width="16" height="24" rx="8" /><line x1="9" y1="7" x2="9" y2="12" strokeLinecap="round" /></svg>
      </a>
    </header>
  )
}
