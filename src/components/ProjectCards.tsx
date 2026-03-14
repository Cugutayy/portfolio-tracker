import { useRef, useCallback, useEffect, useState } from 'react'

interface Props { t: (k: string) => string }

export function ProjectCards({ t }: Props) {
  return (
    <section id="projects" className="container" style={{ padding:'32px 0 48px' }}>
      <ScrollReveal delay={0}>
        <hr style={{ border:'none', borderTop:'1px solid var(--rule)', marginBottom:24, opacity:0.5 }} />
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:24 }}>
          <h2 style={{ fontSize:'.85rem', fontWeight:400, letterSpacing:'.12em', textTransform:'uppercase', fontFamily:'DM Mono, monospace' }}>{t('secP')}</h2>
          <span className="mono" style={{ fontSize:'.5rem', color:'var(--muted)', opacity:0.4 }}>{t('pCnt')}</span>
        </div>
      </ScrollReveal>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:16, alignItems:'stretch' }}>
        <ScrollReveal delay={80} style={{ height: '100%' }}>
          <GlassCard href="/tracker/" label="01" accent="var(--green-t)">
            <h3 style={{ fontSize:'.95rem', fontWeight:500, marginBottom:6 }}>Portfolio Tracker</h3>
            <p style={{ color:'var(--muted)', fontSize:'.72rem', lineHeight:1.45, marginBottom:10 }}>{t('p1d')}</p>
            <MiniChart />
            <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap',alignItems:'center'}}>
              <Stat label={t('pf')} value="101K ₺" />
              <Stat label="K/Z" value="+1.02%" pos />
              <LiveDot label={t('lv')} />
            </div>
            <Tags items={[t('tF'), t('tA'), 'Chart.js']} />
          </GlassCard>
        </ScrollReveal>

        <ScrollReveal delay={160} style={{ height: '100%' }}>
          <GlassCard href="#/f1" label="02" accent="#e10600">
            <h3 style={{ fontSize:'.95rem', fontWeight:500, marginBottom:6 }}>{t('p2t')}</h3>
            <p style={{ color:'var(--muted)', fontSize:'.72rem', lineHeight:1.45, marginBottom:10 }}>{t('p2d')}</p>
            <TrackMini />
            <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
              {['Ensemble ML','OpenF1',`22 ${t('drivers')}`].map(s => (
                <span key={s} className="mono" style={{fontSize:'.44rem',color:'var(--muted)',background:'rgba(255,255,255,0.04)',border:'1px solid var(--rule)',padding:'2px 6px',borderRadius:4}}>{s}</span>
              ))}
            </div>
            <Tags items={['Ridge+GB','ELO','React']} />
          </GlassCard>
        </ScrollReveal>

        <ScrollReveal delay={240} style={{ height: '100%' }}>
          <GlassCard href="/tez/" label="03" accent="var(--accent)">
            <h3 style={{ fontSize:'.95rem', fontWeight:500, marginBottom:6 }}>{t('p3t')}</h3>
            <p style={{ color:'var(--muted)', fontSize:'.72rem', lineHeight:1.45, marginBottom:10 }}>{t('p3d')}</p>
            <IpoMini />
            <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap',alignItems:'center'}}>
              <Stat label="IPOs" value="209" />
              <Stat label="Underpricing" value="67.8%" pos />
              <Stat label="CAAR" value="−7.4%" />
            </div>
            <Tags items={['Event Study','CSAD','OLS']} />
          </GlassCard>
        </ScrollReveal>

        <ScrollReveal delay={320} style={{ height: '100%' }}>
          <GlassCard href="#/albion" label="04" accent="#d4a843">
            <h3 style={{ fontSize:'.95rem', fontWeight:500, marginBottom:6 }}>{t('p4t')}</h3>
            <p style={{ color:'var(--muted)', fontSize:'.72rem', lineHeight:1.45, marginBottom:10 }}>{t('p4d')}</p>
            <ArbitrageMini />
            <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap',alignItems:'center'}}>
              <Stat label="Cities" value="7+BM" />
              <Stat label="Items" value="~5K" />
              <LiveDot label="Real-time" />
            </div>
            <Tags items={['Arbitrage','AO Data API','React']} />
          </GlassCard>
        </ScrollReveal>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════
// SCROLL REVEAL
// ═══════════════════════════════════════════
function ScrollReveal({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight + 100) { setVisible(true); return }
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.unobserve(el) }
    }, { threshold: 0, rootMargin: '100px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} style={{
      ...style,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(24px)',
      transition: `opacity .6s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .6s cubic-bezier(.16,1,.3,1) ${delay}ms`,
    }}>
      {children}
    </div>
  )
}

// ═══════════════════════════════════════════
// GLASSMORPHISM CARD
// ═══════════════════════════════════════════
function GlassCard({ children, href, disabled, label, accent }: { children: React.ReactNode; href?: string; disabled?: boolean; label: string; accent?: string }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current || disabled) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const rotateX = (0.5 - y) * 4
    const rotateY = (x - 0.5) * 4
    cardRef.current.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`
    if (glowRef.current) {
      glowRef.current.style.opacity = '1'
      glowRef.current.style.background = `radial-gradient(circle at ${x*100}% ${y*100}%, ${accent || 'rgba(255,255,255,0.08)'} 0%, transparent 50%)`
    }
  }, [disabled, accent])

  const handleMouseLeave = useCallback(() => {
    if (!cardRef.current) return
    cardRef.current.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateY(0)'
    if (glowRef.current) glowRef.current.style.opacity = '0'
  }, [])

  const Tag = href ? 'a' : 'div'
  const tagProps: any = href ? { href, style:{textDecoration:'none',color:'inherit',display:'block',height:'100%'} } : { style:{height:'100%'} }

  return (
    <Tag {...tagProps}>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          position:'relative', overflow:'hidden',
          border: disabled ? '1px dashed var(--card-border)' : '1px solid var(--card-border)',
          borderRadius:16, padding:'22px 24px',
          background: disabled ? 'transparent' : 'var(--card-bg)',
          backdropFilter: disabled ? 'none' : 'blur(20px) saturate(1.1)',
          WebkitBackdropFilter: disabled ? 'none' : 'blur(20px) saturate(1.1)',
          cursor: disabled ? 'default' : 'pointer',
          transition:'transform .5s cubic-bezier(.16,1,.3,1), box-shadow .5s ease, border-color .3s',
          transformStyle:'preserve-3d', willChange:'transform',
          boxShadow: disabled ? 'none' : '0 4px 24px var(--shadow), 0 1px 3px rgba(0,0,0,0.04)',
          opacity: disabled ? 0.5 : 1,
          height:'100%',
        }}
      >
        {/* Glow overlay */}
        <div ref={glowRef} style={{position:'absolute',inset:0,borderRadius:'inherit',opacity:0,transition:'opacity .4s ease',pointerEvents:'none',zIndex:1}}/>
        {/* Label */}
        <div className="mono" style={{fontSize:'.55rem', color: accent || 'var(--muted)', letterSpacing:'.06em', marginBottom:8, opacity:.7, position:'relative', zIndex:2}}>
          {label}
        </div>
        <div style={{position:'relative',zIndex:2}}>
          {children}
        </div>
      </div>
    </Tag>
  )
}

// ═══════════════════════════════════════════
// MINI CHART (Portfolio)
// ═══════════════════════════════════════════
function MiniChart() {
  return (
    <svg style={{width:'100%',height:36,display:'block'}} viewBox="0 0 400 50" preserveAspectRatio="none">
      <defs><linearGradient id="cf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity=".15"/><stop offset="100%" stopColor="#22c55e" stopOpacity=".01"/></linearGradient></defs>
      <path d="M0,25 L31,27 L62,30 L93,33 L124,31 L155,33 L186,34 L217,38 L248,36 L279,35 L310,39 L341,27 L372,23 L400,24 L400,50 L0,50Z" fill="url(#cf)"/>
      <polyline points="0,25 31,27 62,30 93,33 124,31 155,33 186,34 217,38 248,36 279,35 310,39 341,27 372,23 400,24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".7"/>
    </svg>
  )
}

// ═══════════════════════════════════════════
// TRACK MINI (F1)
// ═══════════════════════════════════════════
const TRK = "M40,55 C40,20 80,10 130,10 C180,10 200,35 235,35 C270,35 300,15 320,40 C340,65 315,72 275,68 C235,64 190,72 130,72 C70,72 40,90 40,55 Z"

function TrackMini() {
  return (
    <svg style={{width:'100%',height:56}} viewBox="0 0 360 80" preserveAspectRatio="xMidYMid meet">
      <path d={TRK} fill="none" stroke="var(--rule)" strokeWidth="10" strokeLinecap="round" opacity=".3"/>
      <path d={TRK} fill="none" stroke="var(--muted)" strokeWidth=".4" strokeDasharray="3,5" opacity=".15"/>
      {[{c:'#3671C6',d:3.2,b:0},{c:'#FF8000',d:3.4,b:.4},{c:'#E8002D',d:3.6,b:.8},{c:'#27F4D2',d:3.8,b:1.2}].map((car,i) => (
        <g key={i} opacity={1-i*.06}>
          <animateMotion dur={`${car.d}s`} repeatCount="indefinite" path={TRK} begin={`${car.b}s`} rotate="auto"/>
          <rect x="-5" y="-2" width="10" height="4" rx="1.2" fill={car.c}/>
          <circle cx="2.5" cy="-2.5" r=".8" fill="#222"/><circle cx="2.5" cy="2.5" r=".8" fill="#222"/>
          <circle cx="-3.5" cy="-2.5" r=".8" fill="#222"/><circle cx="-3.5" cy="2.5" r=".8" fill="#222"/>
        </g>
      ))}
    </svg>
  )
}

// ═══════════════════════════════════════════
// IPO MINI (Thesis) — bar chart showing yearly IPO distribution
// ═══════════════════════════════════════════
function IpoMini() {
  const bars = [
    { year: '20', h: 8, max: 56 },
    { year: '21', h: 53, max: 56 },
    { year: '22', h: 39, max: 56 },
    { year: '23', h: 56, max: 56 },
    { year: '24', h: 33, max: 56 },
    { year: '25', h: 20, max: 56 },
  ]
  return (
    <svg style={{width:'100%',height:40,display:'block'}} viewBox="0 0 300 50" preserveAspectRatio="none">
      {bars.map((b, i) => {
        const bw = 30, gap = 20, x = i * (bw + gap) + 10
        const barH = (b.h / b.max) * 38
        return (
          <g key={i}>
            <rect x={x} y={40 - barH} width={bw} height={barH} rx={3} fill="var(--accent)" opacity={0.6 + (b.h / b.max) * 0.4} />
            <text x={x + bw/2} y={48} textAnchor="middle" fontSize="6" fill="var(--muted)" fontFamily="DM Mono, monospace">{b.year}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ═══════════════════════════════════════════
// ARBITRAGE MINI (Albion) — buy/sell spread bars
// ═══════════════════════════════════════════
function ArbitrageMini() {
  const items = [
    { buy: 18, sell: 32, c: '#e2a44f' },
    { buy: 25, sell: 41, c: '#5bb5e0' },
    { buy: 12, sell: 28, c: '#4caf50' },
    { buy: 30, sell: 45, c: '#e53935' },
    { buy: 22, sell: 35, c: '#ab47bc' },
  ]
  return (
    <svg style={{width:'100%',height:40,display:'block'}} viewBox="0 0 300 50" preserveAspectRatio="none">
      {items.map((it, i) => {
        const y = i * 10 + 2
        const bw = (it.buy / 50) * 280
        const sw = (it.sell / 50) * 280
        return (
          <g key={i}>
            <rect x={10} y={y} width={sw} height={7} rx={2} fill={it.c} opacity={.2} />
            <rect x={10} y={y} width={bw} height={7} rx={2} fill={it.c} opacity={.6} />
            <rect x={bw + 10} y={y} width={sw - bw} height={7} rx={0} fill="#d4a843" opacity={.35} />
          </g>
        )
      })}
    </svg>
  )
}

// ═══════════════════════════════════════════
// SHARED
// ═══════════════════════════════════════════
function Stat({ label, value, pos }: { label:string; value:string; pos?:boolean }) {
  return (
    <div>
      <div className="mono" style={{fontSize:'.44rem',color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.06em'}}>{label}</div>
      <div className="mono" style={{fontSize:'.72rem',fontWeight:500,color:pos?'var(--green-t)':'var(--ink)'}}>{value}</div>
    </div>
  )
}

function LiveDot({ label }: { label:string }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:4,marginLeft:'auto'}}>
      <span style={{width:5,height:5,borderRadius:'50%',background:'var(--green)',animation:'pd 2s ease-in-out infinite',display:'inline-block'}}/>
      <span className="mono" style={{fontSize:'.55rem',color:'var(--green-t)'}}>{label}</span>
    </div>
  )
}

function Tags({ items }: { items:string[] }) {
  return (
    <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:10}}>
      {items.map(t => <span key={t} className="mono" style={{fontSize:'.48rem',letterSpacing:'.05em',textTransform:'uppercase',padding:'1px 6px',borderRadius:4,border:'1px solid var(--rule)',color:'var(--muted)',opacity:.6}}>{t}</span>)}
    </div>
  )
}
