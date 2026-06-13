import { useMemo, useState, useEffect } from 'react'
import { Lily } from './Lily'

/**
 * Cinematic hero — a blooming lily as the centrepiece, lit on a dark stage,
 * with liquid-glass chrome and a serif nameplate that blurs in word by word.
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
    badge: lang === 'zh' ? '伊兹密尔 · 个人作品' : lang === 'en' ? 'IZMIR · PERSONAL WORK' : 'İZMİR · KİŞİSEL ÇALIŞMA',
    role: lang === 'zh' ? '金融 · 机器学习 · 数据' : lang === 'en' ? 'Finance · Machine Learning · Data' : 'Finans · Makine Öğrenmesi · Veri',
    sub: lang === 'zh' ? '九个项目，跨越市场、模型与代码——精心打造，缓缓绽放。'
      : lang === 'en' ? 'Nine projects across markets, models and code — built with care, unfolding slowly.'
      : 'Piyasalar, modeller ve kod arasında dokuz proje — özenle kuruldu, yavaşça açıyor.',
    cta: lang === 'zh' ? '查看项目' : lang === 'en' ? 'See the work' : 'Projeleri gör',
    contact: lang === 'zh' ? '联系' : lang === 'en' ? 'Contact' : 'İletişim',
    s1: lang === 'zh' ? '项目' : lang === 'en' ? 'Projects' : 'Proje',
    s2: lang === 'zh' ? '实时' : lang === 'en' ? 'Live' : 'Canlı',
    scroll: lang === 'zh' ? '向下滚动' : lang === 'en' ? 'Scroll' : 'Kaydır',
  }

  const name = ['S.', 'Çağatay', 'Sönmez']

  // pollen motes — computed once, deterministic-ish spread
  const motes = useMemo(
    () => Array.from({ length: 16 }, (_, i) => ({
      left: (i * 61) % 100,
      bottom: 6 + (i * 37) % 60,
      size: 2 + (i % 4),
      dur: 8 + (i % 7),
      delay: (i * 0.9) % 9,
      px: ((i % 5) - 2) * 14,
    })),
    [],
  )

  return (
    <header
      className="font-ui"
      style={{
        position: 'relative',
        minHeight: '100svh',
        overflow: 'hidden',
        background:
          'radial-gradient(120% 90% at 50% 18%, #1a1610 0%, #0c0a07 46%, #060504 100%)',
        color: '#f4efe6',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '92px 22px 64px',
      }}
    >
      {/* warm stage wash */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(60% 50% at 50% 34%, rgba(255,226,180,0.10) 0%, rgba(255,200,150,0) 60%)',
      }} />
      {/* pollen */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {motes.map((m, i) => (
          <span key={i} className="pollen" style={{
            left: `${m.left}%`, bottom: `${m.bottom}%`, width: m.size, height: m.size,
            ['--pdur' as string]: `${m.dur}s`, ['--pdl' as string]: `${m.delay}s`, ['--px' as string]: `${m.px}px`,
          }} />
        ))}
      </div>
      {/* vignette */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        boxShadow: 'inset 0 -120px 160px -60px rgba(0,0,0,0.9), inset 0 0 240px 40px rgba(0,0,0,0.5)',
      }} />
      {/* bottom fade into the page */}
      <div aria-hidden style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 160, pointerEvents: 'none',
        background: 'linear-gradient(to bottom, rgba(6,5,4,0), var(--bg))',
      }} />

      {/* ── content ── */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 760 }}>
        <div className="liquid-glass hf" style={{
          borderRadius: 999, padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 9,
          fontSize: '.62rem', letterSpacing: '.18em', color: 'rgba(244,239,230,0.85)', animationDelay: '.2s',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#e9c45f', boxShadow: '0 0 8px #e9c45f' }} />
          {t.badge}
        </div>

        <div className="hf" style={{ animationDelay: '.05s', margin: '14px 0 2px' }}>
          <Lily size={300} />
        </div>

        <h1 className="font-display" style={{
          fontStyle: 'italic', fontWeight: 400,
          fontSize: 'clamp(3.2rem, 9vw, 6.2rem)', lineHeight: 0.92, letterSpacing: '-0.03em',
          margin: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: '0.28em', rowGap: '0.04em',
        }}>
          {name.map((w, i) => (
            <span key={i} className="hw" style={{ animationDelay: `${0.5 + i * 0.12}s`, color: i === 2 ? '#e9c45f' : '#fbf6ec' }}>{w}</span>
          ))}
        </h1>

        <p className="mono hf" style={{
          fontFamily: "'DM Mono', monospace", fontSize: '.62rem', letterSpacing: '.24em', textTransform: 'uppercase',
          color: 'rgba(244,239,230,0.55)', marginTop: 18, animationDelay: '.95s',
        }}>
          {t.role}
        </p>

        <p className="hf" style={{
          fontSize: 'clamp(.92rem, 1.6vw, 1.08rem)', fontWeight: 300, lineHeight: 1.55,
          color: 'rgba(244,239,230,0.8)', maxWidth: 480, marginTop: 16, animationDelay: '1.1s',
        }}>
          {t.sub}
        </p>

        <div className="hf" style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 26, flexWrap: 'wrap', justifyContent: 'center', animationDelay: '1.25s' }}>
          <a href="#projects" className="liquid-glass-strong" style={{
            borderRadius: 999, padding: '12px 22px', display: 'inline-flex', alignItems: 'center', gap: 9,
            fontSize: '.86rem', fontWeight: 500, color: '#fff', textDecoration: 'none',
          }}>
            {t.cta}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7" /><path d="M7 7h10v10" /></svg>
          </a>
          <a href="mailto:s.cagatay.sonmez@gmail.com" style={{
            fontSize: '.86rem', color: 'rgba(244,239,230,0.75)', textDecoration: 'none',
            borderBottom: '1px solid rgba(244,239,230,0.25)', paddingBottom: 2,
          }}>
            {t.contact}
          </a>
        </div>

        {/* stat chips */}
        <div className="hf" style={{ display: 'flex', gap: 12, marginTop: 30, flexWrap: 'wrap', justifyContent: 'center', animationDelay: '1.4s' }}>
          <Chip label={t.s1} value="9" />
          <Chip label={t.s2} value={clock || '··:··'} dot />
        </div>
      </div>

      {/* scroll cue */}
      <a href="#projects" aria-label={t.scroll} className="scroll-cue" style={{
        position: 'absolute', bottom: 26, left: '50%', transform: 'translateX(-50%)', zIndex: 3,
        color: 'rgba(244,239,230,0.5)', textDecoration: 'none',
      }}>
        <svg width="18" height="26" viewBox="0 0 18 26" fill="none" stroke="currentColor" strokeWidth="1.4">
          <rect x="1" y="1" width="16" height="24" rx="8" />
          <line x1="9" y1="7" x2="9" y2="12" strokeLinecap="round" />
        </svg>
      </a>
    </header>
  )
}

function Chip({ label, value, dot }: { label: string; value: string; dot?: boolean }) {
  return (
    <div className="liquid-glass" style={{ borderRadius: 16, padding: '11px 16px', minWidth: 96, textAlign: 'left' }}>
      <div className="mono" style={{ fontFamily: "'DM Mono', monospace", fontSize: '.5rem', letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(244,239,230,0.55)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#7fd18a', boxShadow: '0 0 7px #7fd18a', animation: 'pd 2s ease-in-out infinite' }} />}
        {label}
      </div>
      <div className="font-display" style={{ fontStyle: 'italic', fontSize: '1.7rem', lineHeight: 1, marginTop: 4, color: '#fbf6ec' }}>{value}</div>
    </div>
  )
}
