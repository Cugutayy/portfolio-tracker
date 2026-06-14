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
    role: lang === 'zh' ? '金融 · 机器学习 · 数据' : lang === 'en' ? 'Finance · Machine Learning · Data' : 'Finans · Makine Öğrenmesi · Veri',
    sub: lang === 'zh' ? '九个项目，跨越市场、模型与代码。精心打造，缓缓绽放。'
      : lang === 'en' ? 'Nine projects across markets, models and code. Built with care, unfolding slowly.'
      : 'Piyasalar, modeller ve kod arasında dokuz proje. Özenle kuruldu, yavaşça açıyor.',
    cta: lang === 'zh' ? '查看项目' : lang === 'en' ? 'See the work' : 'Projeleri gör',
    contact: lang === 'zh' ? '联系' : lang === 'en' ? 'Contact' : 'İletişim',
    s1: lang === 'zh' ? '项目' : lang === 'en' ? 'Projects' : 'Proje',
    s2: lang === 'zh' ? '实时' : lang === 'en' ? 'Live' : 'Canlı',
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
      {/* the lily lives in the site-wide fixed backdrop; here we only grade the
          hero viewport — darken the top (nav) and bottom (nameplate) for legibility */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(to bottom, rgba(5,5,6,0.6) 0%, rgba(5,5,6,0.1) 20%, rgba(5,5,6,0) 46%, rgba(5,5,6,0.2) 64%, rgba(5,5,6,0.7) 86%, transparent 100%)',
      }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 1, boxShadow: 'inset 0 -110px 150px -60px rgba(0,0,0,0.85), inset 0 0 320px 80px rgba(0,0,0,0.5)' }} />

      {/* ── glass content ── */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 720 }}>
        <h1 className="font-display" style={{
          fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(3.4rem, 9.5vw, 7rem)', lineHeight: 0.9,
          letterSpacing: '-0.03em', margin: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          columnGap: '0.28em', rowGap: '0.02em', textShadow: '0 2px 60px rgba(0,0,0,0.8)',
        }}>
          {name.map((w, i) => (
            <span key={i} className="hw" style={{ animationDelay: `${0.4 + i * 0.13}s`, color: i === 2 ? '#f0cf86' : '#fdf8ee' }}>{w}</span>
          ))}
        </h1>

        <p className="mono hf" style={{
          fontFamily: "'DM Mono', monospace", fontSize: '.62rem', letterSpacing: '.24em', textTransform: 'uppercase',
          color: 'rgba(244,239,230,0.66)', marginTop: 18, animationDelay: '.9s',
        }}>{t.role}</p>

        <p className="hf" style={{
          fontSize: 'clamp(.92rem, 1.6vw, 1.06rem)', fontWeight: 300, lineHeight: 1.55,
          color: 'rgba(244,239,230,0.88)', maxWidth: 470, marginTop: 16, animationDelay: '1.05s', textShadow: '0 1px 26px rgba(0,0,0,0.8)',
        }}>{t.sub}</p>

        <div className="hf" style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 26, flexWrap: 'wrap', justifyContent: 'center', animationDelay: '1.2s' }}>
          <a href="#projects" className="liquid-glass-strong" style={{ borderRadius: 999, padding: '12px 22px', display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: '.86rem', fontWeight: 500, color: '#fff', textDecoration: 'none' }}>
            {t.cta}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7" /><path d="M7 7h10v10" /></svg>
          </a>
          <a href="mailto:s.cagatay.sonmez@gmail.com" style={{ fontSize: '.86rem', color: 'rgba(244,239,230,0.82)', textDecoration: 'none', borderBottom: '1px solid rgba(244,239,230,0.32)', paddingBottom: 2 }}>{t.contact}</a>
        </div>

        <div className="hf" style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap', justifyContent: 'center', animationDelay: '1.35s' }}>
          <Chip label={t.s1} value="9" />
          <Chip label={t.s2} value={clock || '··:··'} dot />
        </div>
      </div>

      <a href="#projects" aria-label={t.scroll} className="scroll-cue" style={{ position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 11, color: 'rgba(244,239,230,0.5)', textDecoration: 'none' }}>
        <svg width="18" height="26" viewBox="0 0 18 26" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="1" y="1" width="16" height="24" rx="8" /><line x1="9" y1="7" x2="9" y2="12" strokeLinecap="round" /></svg>
      </a>
    </header>
  )
}

function Chip({ label, value, dot }: { label: string; value: string; dot?: boolean }) {
  return (
    <div className="liquid-glass" style={{ borderRadius: 16, padding: '11px 16px', minWidth: 96, textAlign: 'left' }}>
      <div className="mono" style={{ fontFamily: "'DM Mono', monospace", fontSize: '.5rem', letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(244,239,230,0.62)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#7fd18a', boxShadow: '0 0 7px #7fd18a', animation: 'pd 2s ease-in-out infinite' }} />}
        {label}
      </div>
      <div className="font-display" style={{ fontStyle: 'italic', fontSize: '1.7rem', lineHeight: 1, marginTop: 4, color: '#fdf8ee' }}>{value}</div>
    </div>
  )
}
