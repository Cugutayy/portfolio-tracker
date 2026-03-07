import { useRef, useCallback } from 'react'
import { TEAMS, TYRES } from '../f1/data'

interface Props { t: (k: string) => string }

export function ProjectCards({ t }: Props) {
  return (
    <section id="projects" className="container" style={{ padding:'48px 0 56px' }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:40 }}>
        <h2 style={{ fontSize:'1.4rem', fontWeight:300 }}>{t('secP')}</h2>
        <span className="mono" style={{ fontSize:'.7rem', color:'var(--muted)' }}>{t('pCnt')}</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div style={{ gridColumn:'1/-1' }}>
          <Card3D href="/tracker/">
            <PortfolioContent t={t} />
          </Card3D>
        </div>
        <Card3D href="#/f1">
          <F1Content t={t} />
        </Card3D>
        <Card3D disabled>
          <PlaceholderContent t={t} />
        </Card3D>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════
// 3D PERSPEKTİF KART
// ═══════════════════════════════════════════
function Card3D({ children, href, disabled }: { children: React.ReactNode; href?: string; disabled?: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current || disabled) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const rotateX = (0.5 - y) * 12  // max 6 derece
    const rotateY = (x - 0.5) * 12
    
    cardRef.current.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
    
    if (glowRef.current) {
      glowRef.current.style.opacity = '1'
      glowRef.current.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(201,168,76,0.08) 0%, transparent 60%)`
    }
  }, [disabled])

  const handleMouseLeave = useCallback(() => {
    if (!cardRef.current) return
    cardRef.current.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
    if (glowRef.current) glowRef.current.style.opacity = '0'
  }, [])

  const Wrapper = href ? 'a' : 'div'
  const wrapperProps: any = href ? { href, style: { textDecoration:'none', color:'inherit', display:'block' } } : {}

  return (
    <Wrapper {...wrapperProps}>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          position:'relative', overflow:'hidden',
          border: disabled ? '1px dashed var(--card-border)' : '1px solid var(--card-border)',
          borderRadius:16, padding:'28px 32px',
          background: disabled ? 'var(--bg)' : 'var(--card-bg)',
          cursor: disabled ? 'default' : 'pointer',
          transition: 'transform .4s cubic-bezier(.16,1,.3,1), box-shadow .4s ease',
          transformStyle: 'preserve-3d',
          willChange: 'transform',
          boxShadow: disabled ? 'none' : '0 4px 20px var(--shadow)',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {/* Glow overlay */}
        <div ref={glowRef} style={{
          position:'absolute', inset:0, borderRadius:'inherit',
          opacity:0, transition:'opacity .3s ease', pointerEvents:'none', zIndex:1,
        }} />
        {/* Shine line on hover */}
        {!disabled && <div style={{
          position:'absolute', top:0, left:'-100%', width:'60%', height:'100%',
          background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
          transition:'left .6s ease', pointerEvents:'none',
        }} className="shine-line" />}
        {/* Content */}
        <div style={{ position:'relative', zIndex:2 }}>
          {children}
        </div>
      </div>
    </Wrapper>
  )
}

// ═══════════════════════════════════════════
// PORTFOLIO CONTENT
// ═══════════════════════════════════════════
function PortfolioContent({ t }: { t: (k: string) => string }) {
  return <>
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
      <div>
        <span className="mono" style={{ fontSize:'.65rem', color:'var(--accent)', letterSpacing:'.04em' }}>01</span>
        <h3 style={{ fontSize:'1.3rem', fontWeight:400, marginTop:4 }}>Portfolio Tracker</h3>
        <p style={{ color:'var(--muted)', marginTop:6, lineHeight:1.5, fontSize:'.88rem', maxWidth:520 }}>{t('p1d')}</p>
      </div>
      <ArrowCircle />
    </div>

    <div style={{ marginTop:14, border:'1px solid var(--dash-border)', borderRadius:10, padding:'12px 14px', background:'var(--dash-bg)' }}>
      <div style={{ display:'flex', gap:16, marginBottom:8, flexWrap:'wrap' }}>
        <MiniStat label={t('pf')} value="101.019 ₺" />
        <MiniStat label="K/Z" value="+1.019 ₺" positive />
        <MiniStat label={t('ch')} value="+1.02%" positive />
      </div>
      <svg style={{ width:'100%', height:48, display:'block', marginBottom:5 }} viewBox="0 0 400 70" preserveAspectRatio="none">
        <defs><linearGradient id="cf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a472a" stopOpacity=".12"/><stop offset="100%" stopColor="#1a472a" stopOpacity=".01"/></linearGradient></defs>
        <path d="M0,35 L31,37 L62,42 L93,46 L124,44 L155,46 L186,47 L217,53 L248,51 L279,50 L310,55 L341,38 L372,33 L400,34 L400,70 L0,70Z" fill="url(#cf)"/>
        <polyline points="0,35 31,37 62,42 93,46 124,44 155,46 186,47 217,53 248,51 279,50 310,55 341,38 372,33 400,34" fill="none" stroke="#1a472a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="400" cy="34" r="2.5" fill="#1a472a"/>
      </svg>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div className="mono" style={{ fontSize:'.52rem', color:'var(--muted)', display:'flex', alignItems:'center', gap:3 }}>
          <Dot color="#e67e22"/>BTC 40%<Dot color="#c0392b" ml/>THYAO<Dot color="#c9a84c" ml/>{t('gd')}<Dot color="#1d4ed8" ml/>+4
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', animation:'pd 2s ease-in-out infinite', display:'inline-block' }}/>
          <span className="mono" style={{ fontSize:'.65rem', color:'var(--green-t)' }}>{t('lv')}</span>
        </div>
      </div>
    </div>

    <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:14 }}>
      {[t('tF'), t('tA'), 'Cloudflare', 'Chart.js'].map(tag => <Tag key={tag}>{tag}</Tag>)}
    </div>
  </>
}

// ═══════════════════════════════════════════
// F1 CONTENT
// ═══════════════════════════════════════════
const TRACK = "M40,80 C40,30 80,15 140,15 C200,15 220,45 260,45 C300,45 340,20 360,50 C380,80 350,90 300,85 C250,80 200,90 140,90 C80,90 40,130 40,80 Z"

function F1Content({ t }: { t: (k: string) => string }) {
  return <>
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
      <div>
        <span className="mono" style={{ fontSize:'.65rem', color:'var(--accent)', letterSpacing:'.04em' }}>02</span>
        <h3 style={{ fontSize:'1.3rem', fontWeight:400, marginTop:4 }}>{t('p2t')}</h3>
        <p style={{ color:'var(--muted)', marginTop:6, lineHeight:1.5, fontSize:'.88rem' }}>{t('p2d')}</p>
      </div>
      <ArrowCircle />
    </div>

    <div style={{ marginTop:14, border:'1px solid var(--dash-border)', borderRadius:10, padding:'12px 14px', background:'var(--dash-bg)' }}>
      <svg style={{ width:'100%', height:80 }} viewBox="0 0 400 100" preserveAspectRatio="xMidYMid meet">
        <path d={TRACK} fill="none" stroke="var(--rule)" strokeWidth="14" strokeLinecap="round" opacity=".4"/>
        <path d={TRACK} fill="none" stroke="var(--muted)" strokeWidth=".5" strokeDasharray="4,6" opacity=".2"/>
        {[
          { color:'#3671C6', dur:3.8, begin:0 },
          { color:'#FF8000', dur:4.0, begin:0.5 },
          { color:'#E8002D', dur:4.2, begin:1.0 },
          { color:'#27F4D2', dur:4.4, begin:1.5 },
        ].map((car, i) => (
          <g key={i}>
            <g opacity={1 - i * 0.08}>
              <animateMotion dur={`${car.dur}s`} repeatCount="indefinite" path={TRACK} begin={`${car.begin}s`} rotate="auto"/>
              <rect x="-6" y="-2.5" width="12" height="5" rx="1.5" fill={car.color}/>
              <rect x="4" y="-3.5" width="2.5" height="7" rx=".8" fill={car.color} opacity=".6"/>
              <rect x="-8" y="-3" width="1.5" height="6" rx=".5" fill={car.color} opacity=".5"/>
              <circle cx="3" cy="-3.5" r="1" fill="#222"/><circle cx="3" cy="3.5" r="1" fill="#222"/>
              <circle cx="-5" cy="-3.5" r="1" fill="#222"/><circle cx="-5" cy="3.5" r="1" fill="#222"/>
            </g>
          </g>
        ))}
      </svg>
      <div style={{ display:'flex', gap:10, marginTop:4, flexWrap:'wrap' }}>
        {['Ridge Regression', 'OpenF1 API', `22 ${t('drivers')}`].map(s => (
          <span key={s} className="mono" style={{ fontSize:'.52rem', color:'var(--muted)', background:'var(--bg)', border:'1px solid var(--rule)', padding:'2px 7px', borderRadius:5 }}>{s}</span>
        ))}
      </div>
    </div>

    <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:14 }}>
      {['Python', 'ML', 'OpenF1', 'React'].map(tag => <Tag key={tag}>{tag}</Tag>)}
    </div>
  </>
}

// ═══════════════════════════════════════════
// PLACEHOLDER
// ═══════════════════════════════════════════
function PlaceholderContent({ t }: { t: (k: string) => string }) {
  return <>
    <span className="mono" style={{ fontSize:'.65rem', color:'var(--accent)', opacity:.5 }}>03</span>
    <h3 style={{ fontSize:'1.2rem', fontWeight:400, marginTop:4, color:'var(--muted)', opacity:.4 }}>{t('cs')}</h3>
    <p style={{ color:'var(--muted)', opacity:.3, marginTop:6, fontSize:'.88rem' }}>{t('csd')}</p>
    <div style={{ marginTop:12 }}>
      <span className="mono" style={{ fontSize:'.55rem', padding:'2px 8px', borderRadius:99, border:'1px solid var(--rule)', color:'var(--muted)', opacity:.3 }}>{t('tba')}</span>
    </div>
  </>
}

// ═══════════════════════════════════════════
// SHARED
// ═══════════════════════════════════════════
function ArrowCircle() {
  return (
    <div style={{ flexShrink:0, marginLeft:16, width:32, height:32, borderRadius:'50%', border:'1px solid var(--rule)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .3s' }}>
      <svg width="13" height="13" fill="none" stroke="var(--muted)" viewBox="0 0 24 24" style={{ transform:'rotate(-45deg)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 12h14m-7-7l7 7-7 7"/>
      </svg>
    </div>
  )
}

function MiniStat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div>
      <div className="mono" style={{ fontSize:'.52rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em' }}>{label}</div>
      <div className="mono" style={{ fontSize:'.82rem', fontWeight:500, color: positive ? 'var(--green-t)' : 'var(--ink)' }}>{value}</div>
    </div>
  )
}

function Dot({ color, ml }: { color: string; ml?: boolean }) {
  return <span style={{ display:'inline-block', width:5, height:5, borderRadius:'50%', background:color, marginLeft: ml ? 8 : 0 }}/>
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="mono" style={{ fontSize:'.58rem', letterSpacing:'.06em', textTransform:'uppercase', padding:'2px 8px', borderRadius:99, border:'1px solid var(--rule)', color:'var(--muted)' }}>{children}</span>
}
