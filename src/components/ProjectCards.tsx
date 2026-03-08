import { useRef, useCallback, useEffect, useState } from 'react'
import { TEAMS } from '../f1/data'

interface Props { t: (k: string) => string }

export function ProjectCards({ t }: Props) {
  return (
    <section id="projects" className="container" style={{ padding:'60px 0 80px' }}>
      <ScrollReveal delay={0}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:48 }}>
          <h2 style={{ fontSize:'1.5rem', fontWeight:300 }}>{t('secP')}</h2>
          <span className="mono" style={{ fontSize:'.7rem', color:'var(--muted)' }}>{t('pCnt')}</span>
        </div>
      </ScrollReveal>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
        <ScrollReveal delay={100}>
          <Card3D href="/tracker/" accent="var(--green-t)">
            <PortfolioContent t={t} />
          </Card3D>
        </ScrollReveal>
        <ScrollReveal delay={200}>
          <Card3D href="#/f1" accent="#e10600">
            <F1Content t={t} />
          </Card3D>
        </ScrollReveal>
        <ScrollReveal delay={300}>
          <Card3D disabled>
            <PlaceholderContent t={t} />
          </Card3D>
        </ScrollReveal>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════
// SCROLL REVEAL — IntersectionObserver ile
// ═══════════════════════════════════════════
function ScrollReveal({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.unobserve(el) }
    }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} style={{
      ...style,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(32px)',
      transition: `opacity .7s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .7s cubic-bezier(.16,1,.3,1) ${delay}ms`,
    }}>
      {children}
    </div>
  )
}

// ═══════════════════════════════════════════
// 3D PERSPEKTİF KART — mouse takipli tilt + glow
// ═══════════════════════════════════════════
function Card3D({ children, href, disabled, accent }: { children: React.ReactNode; href?: string; disabled?: boolean; accent?: string }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current || disabled) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const rotateX = (0.5 - y) * 5
    const rotateY = (x - 0.5) * 5
    cardRef.current.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.008,1.008,1.008)`
    if (glowRef.current) {
      glowRef.current.style.opacity = '1'
      glowRef.current.style.background = `radial-gradient(circle at ${x*100}% ${y*100}%, ${accent || 'rgba(201,168,76,0.06)'} 0%, transparent 55%)`
    }
  }, [disabled, accent])

  const handleMouseLeave = useCallback(() => {
    if (!cardRef.current) return
    cardRef.current.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)'
    if (glowRef.current) glowRef.current.style.opacity = '0'
  }, [])

  const Tag = href ? 'a' : 'div'
  const tagProps: any = href ? { href, style:{textDecoration:'none',color:'inherit',display:'block'} } : {}

  return (
    <Tag {...tagProps}>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          position:'relative', overflow:'hidden',
          border: disabled ? '1px dashed var(--card-border)' : '1px solid var(--card-border)',
          borderRadius:18, padding:'28px 32px',
          background: disabled ? 'var(--bg)' : 'var(--card-bg)',
          cursor: disabled ? 'default' : 'pointer',
          transition:'transform .5s cubic-bezier(.16,1,.3,1), box-shadow .5s ease',
          transformStyle:'preserve-3d', willChange:'transform',
          boxShadow: disabled ? 'none' : '0 4px 24px var(--shadow)',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {/* Glow */}
        <div ref={glowRef} style={{position:'absolute',inset:0,borderRadius:'inherit',opacity:0,transition:'opacity .4s ease',pointerEvents:'none',zIndex:1}}/>
        {/* Üst accent çizgi */}
        {!disabled && <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${accent||'var(--accent)'},transparent)`,opacity:0.3}}/>}
        <div style={{position:'relative',zIndex:2}}>
          {children}
        </div>
      </div>
    </Tag>
  )
}

// ═══════════════════════════════════════════
// PORTFOLIO CONTENT
// ═══════════════════════════════════════════
function PortfolioContent({ t }: { t: (k: string) => string }) {
  return <>
    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
      <div>
        <span className="mono" style={{fontSize:'.65rem',color:'var(--accent)',letterSpacing:'.04em'}}>01</span>
        <h3 style={{fontSize:'1.3rem',fontWeight:400,marginTop:4}}>Portfolio Tracker</h3>
        <p style={{color:'var(--muted)',marginTop:6,lineHeight:1.5,fontSize:'.88rem',maxWidth:520}}>{t('p1d')}</p>
      </div>
      <Arrow />
    </div>
    <div style={{marginTop:14,border:'1px solid var(--dash-border)',borderRadius:12,padding:'14px 16px',background:'var(--dash-bg)'}}>
      <div style={{display:'flex',gap:20,marginBottom:10,flexWrap:'wrap'}}>
        <MS label={t('pf')} value="101.019 ₺" />
        <MS label="K/Z" value="+1.019 ₺" pos />
        <MS label={t('ch')} value="+1.02%" pos />
      </div>
      <svg style={{width:'100%',height:50,display:'block',marginBottom:6}} viewBox="0 0 400 70" preserveAspectRatio="none">
        <defs><linearGradient id="cf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a472a" stopOpacity=".12"/><stop offset="100%" stopColor="#1a472a" stopOpacity=".01"/></linearGradient></defs>
        <path d="M0,35 L31,37 L62,42 L93,46 L124,44 L155,46 L186,47 L217,53 L248,51 L279,50 L310,55 L341,38 L372,33 L400,34 L400,70 L0,70Z" fill="url(#cf)"/>
        <polyline points="0,35 31,37 62,42 93,46 124,44 155,46 186,47 217,53 248,51 279,50 310,55 341,38 372,33 400,34" fill="none" stroke="#1a472a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="400" cy="34" r="2.5" fill="#1a472a"/>
      </svg>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div className="mono" style={{fontSize:'.52rem',color:'var(--muted)',display:'flex',alignItems:'center',gap:3}}>
          <Dot c="#e67e22"/>BTC 40%<Dot c="#c0392b" ml/>THYAO<Dot c="#c9a84c" ml/>{t('gd')}<Dot c="#1d4ed8" ml/>+4
        </div>
        <div style={{display:'flex',alignItems:'center',gap:4}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:'var(--green)',animation:'pd 2s ease-in-out infinite',display:'inline-block'}}/>
          <span className="mono" style={{fontSize:'.65rem',color:'var(--green-t)'}}>{t('lv')}</span>
        </div>
      </div>
    </div>
    <Tags items={[t('tF'), t('tA'), 'Cloudflare', 'Chart.js']} />
  </>
}

// ═══════════════════════════════════════════
// F1 CONTENT
// ═══════════════════════════════════════════
const TRK = "M40,80 C40,30 80,15 140,15 C200,15 220,45 260,45 C300,45 340,20 360,50 C380,80 350,90 300,85 C250,80 200,90 140,90 C80,90 40,130 40,80 Z"

function F1Content({ t }: { t: (k: string) => string }) {
  return <>
    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
      <div>
        <span className="mono" style={{fontSize:'.65rem',color:'var(--accent)',letterSpacing:'.04em'}}>02</span>
        <h3 style={{fontSize:'1.3rem',fontWeight:400,marginTop:4}}>{t('p2t')}</h3>
        <p style={{color:'var(--muted)',marginTop:6,lineHeight:1.5,fontSize:'.88rem'}}>{t('p2d')}</p>
      </div>
      <Arrow />
    </div>
    <div style={{marginTop:14,border:'1px solid var(--dash-border)',borderRadius:12,padding:'14px 16px',background:'var(--dash-bg)'}}>
      <svg style={{width:'100%',height:80}} viewBox="0 0 400 100" preserveAspectRatio="xMidYMid meet">
        <path d={TRK} fill="none" stroke="var(--rule)" strokeWidth="14" strokeLinecap="round" opacity=".4"/>
        <path d={TRK} fill="none" stroke="var(--muted)" strokeWidth=".5" strokeDasharray="4,6" opacity=".2"/>
        {[{c:'#3671C6',d:3.8,b:0},{c:'#FF8000',d:4,b:.5},{c:'#E8002D',d:4.2,b:1},{c:'#27F4D2',d:4.4,b:1.5}].map((car,i) => (
          <g key={i} opacity={1-i*.08}>
            <animateMotion dur={`${car.d}s`} repeatCount="indefinite" path={TRK} begin={`${car.b}s`} rotate="auto"/>
            <rect x="-6" y="-2.5" width="12" height="5" rx="1.5" fill={car.c}/>
            <rect x="4" y="-3.5" width="2.5" height="7" rx=".8" fill={car.c} opacity=".6"/>
            <rect x="-8" y="-3" width="1.5" height="6" rx=".5" fill={car.c} opacity=".5"/>
            <circle cx="3" cy="-3.5" r="1" fill="#222"/><circle cx="3" cy="3.5" r="1" fill="#222"/>
            <circle cx="-5" cy="-3.5" r="1" fill="#222"/><circle cx="-5" cy="3.5" r="1" fill="#222"/>
          </g>
        ))}
      </svg>
      <div style={{display:'flex',gap:8,marginTop:4,flexWrap:'wrap'}}>
        {['Ensemble ML','OpenF1 API',`22 ${t('drivers')}`,'Live Telemetry'].map(s => (
          <span key={s} className="mono" style={{fontSize:'.48rem',color:'var(--muted)',background:'var(--bg)',border:'1px solid var(--rule)',padding:'2px 7px',borderRadius:5}}>{s}</span>
        ))}
      </div>
    </div>
    <Tags items={['Ridge+GB','ELO','OpenF1','React']} />
  </>
}

// ═══════════════════════════════════════════
// PLACEHOLDER
// ═══════════════════════════════════════════
function PlaceholderContent({ t }: { t: (k: string) => string }) {
  return <>
    <span className="mono" style={{fontSize:'.65rem',color:'var(--accent)',opacity:.4}}>03</span>
    <h3 style={{fontSize:'1.2rem',fontWeight:400,marginTop:4,color:'var(--muted)',opacity:.35}}>{t('cs')}</h3>
    <p style={{color:'var(--muted)',opacity:.25,marginTop:6,fontSize:'.88rem'}}>{t('csd')}</p>
    <div style={{marginTop:12}}>
      <span className="mono" style={{fontSize:'.55rem',padding:'2px 8px',borderRadius:99,border:'1px solid var(--rule)',color:'var(--muted)',opacity:.25}}>{t('tba')}</span>
    </div>
  </>
}

// ═══════════════════════════════════════════
// SHARED
// ═══════════════════════════════════════════
function Arrow() {
  return <div style={{flexShrink:0,marginLeft:16,width:34,height:34,borderRadius:'50%',border:'1px solid var(--rule)',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .3s'}}>
    <svg width="14" height="14" fill="none" stroke="var(--muted)" viewBox="0 0 24 24" style={{transform:'rotate(-45deg)'}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 12h14m-7-7l7 7-7 7"/></svg>
  </div>
}
function MS({ label, value, pos }: { label:string; value:string; pos?:boolean }) {
  return <div><div className="mono" style={{fontSize:'.52rem',color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.06em'}}>{label}</div><div className="mono" style={{fontSize:'.85rem',fontWeight:500,color:pos?'var(--green-t)':'var(--ink)'}}>{value}</div></div>
}
function Dot({ c, ml }: { c:string; ml?:boolean }) {
  return <span style={{display:'inline-block',width:5,height:5,borderRadius:'50%',background:c,marginLeft:ml?8:0}}/>
}
function Tags({ items }: { items:string[] }) {
  return <div style={{display:'flex',flexWrap:'wrap',gap:5,marginTop:14}}>
    {items.map(t => <span key={t} className="mono" style={{fontSize:'.58rem',letterSpacing:'.06em',textTransform:'uppercase',padding:'2px 8px',borderRadius:99,border:'1px solid var(--rule)',color:'var(--muted)'}}>{t}</span>)}
  </div>
}
