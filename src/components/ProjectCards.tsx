import { useRef, useEffect, useState } from 'react'

interface Props { t: (k: string) => string }

/**
 * Front page — editorial project index.
 * Lead story (XX Arena, live) + flat hairline cards for the rest.
 * Glassmorphism/3D tilt dropped for a refined broadsheet feel.
 */
export function ProjectCards({ t }: Props) {
  return (
    <section id="projects" className="container" style={{ padding: '40px 0 56px' }}>
      {/* section header */}
      <ScrollReveal delay={0}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 className="eyebrow" style={{ fontSize: '.62rem', color: 'var(--ink)' }}>{t('secP')}</h2>
          <span className="mono" style={{ fontSize: '.52rem', color: 'var(--muted)', opacity: .6 }}>{t('pCnt')}</span>
        </div>
      </ScrollReveal>

      {/* ── lead story · XX Arena ── */}
      <ScrollReveal delay={60}>
        <a href="https://xx-arena.vercel.app" className="lead-card" style={{ marginBottom: 14, '--ed-accent': '#a78bfa' } as React.CSSProperties}>
          <div className="lead-grid">
            <div style={{ padding: '28px 30px', borderRight: '1px solid var(--rule)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span className="mono" style={{ fontSize: '.52rem', letterSpacing: '.2em', color: 'var(--bg)', background: 'var(--ink)', padding: '3px 8px' }}>
                  {t('lead')}
                </span>
                <LiveDot label={t('lv')} />
              </div>
              <h3 className="display" style={{ fontSize: 'clamp(1.7rem, 3.4vw, 2.5rem)', margin: '0 0 12px' }}>
                XX <span className="italic-accent" style={{ color: '#a78bfa' }}>Arena</span>
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: '.85rem', lineHeight: 1.6, marginBottom: 18, maxWidth: 480 }}>
                {t('p8d')}
              </p>
              <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18 }}>
                <Stat label={t('leadStart')} value="1.000.000 ₺" />
                <Stat label={t('leadLev')} value="10x" />
                <Stat label={t('leadData')} value="Binance · Yahoo" pos />
              </div>
              <span className="mono" style={{ fontSize: '.58rem', letterSpacing: '.16em', textTransform: 'uppercase', color: '#a78bfa' }}>
                {t('leadCta')} →
              </span>
            </div>
            <div style={{ padding: '28px 26px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
              <PortfolioMini />
              {/* pre-uppercased: Tags is lang="en", so Turkish words must arrive final-form */}
              <Tags items={['Next.js 16', 'VADELİ · TP/SL', 'CANLI LİDERLİK', 'Sosyal']} />
            </div>
          </div>
        </a>
      </ScrollReveal>

      {/* ── column grid · remaining projects ── */}
      <div className="ed-grid">
        <ScrollReveal delay={120} style={{ height: '100%' }}>
          <EdCard href="/tracker/" no="01" kicker={t('tF')} accent="var(--green-t)">
            <h3 className="display" style={{ fontSize: '1.15rem', marginBottom: 6 }}>Portfolio Tracker</h3>
            <p style={{ color: 'var(--muted)', fontSize: '.74rem', lineHeight: 1.5, marginBottom: 10 }}>{t('p1d')}</p>
            <LiveSparkline />
            <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <Stat label={t('pf')} value="101K ₺" />
              <Stat label="K/Z" value="+1.02%" pos />
              <LiveDot label={t('lv')} />
            </div>
            <Tags items={[t('tF'), t('tA'), 'Chart.js']} />
          </EdCard>
        </ScrollReveal>

        <ScrollReveal delay={180} style={{ height: '100%' }}>
          <EdCard href="#/f1" no="02" kicker="Motorsport · ML" accent="#e10600" locked lockLabel={t('lockK')} lockReq={t('lockReq')}>
            <h3 className="display" style={{ fontSize: '1.15rem', marginBottom: 6 }}>{t('p2t')}</h3>
            <p style={{ color: 'var(--muted)', fontSize: '.74rem', lineHeight: 1.5, marginBottom: 10 }}>{t('p2d')}</p>
            <TrackMini />
            <Tags items={['Ridge+GB', 'ELO', 'OpenF1', `22 ${t('drivers')}`]} />
          </EdCard>
        </ScrollReveal>

        <ScrollReveal delay={240} style={{ height: '100%' }}>
          <EdCard href="/tez/" no="03" kicker="Akademi" accent="var(--accent)">
            <h3 className="display" style={{ fontSize: '1.15rem', marginBottom: 6 }}>{t('p3t')}</h3>
            <p style={{ color: 'var(--muted)', fontSize: '.74rem', lineHeight: 1.5, marginBottom: 10 }}>{t('p3d')}</p>
            <IpoMini />
            <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <Stat label="IPOs" value="209" />
              <Stat label="Underpricing" value="67.8%" pos />
              <Stat label="CAAR" value="−7.4%" />
            </div>
            <Tags items={['Event Study', 'CSAD', 'OLS']} />
          </EdCard>
        </ScrollReveal>

        <ScrollReveal delay={300} style={{ height: '100%' }}>
          <EdCard href="#/albion" no="04" kicker="Oyun Ekonomisi" accent="#d4a843" locked lockLabel={t('lockK')} lockReq={t('lockReq')}>
            <h3 className="display" style={{ fontSize: '1.15rem', marginBottom: 6 }}>{t('p4t')}</h3>
            <p style={{ color: 'var(--muted)', fontSize: '.74rem', lineHeight: 1.5, marginBottom: 10 }}>{t('p4d')}</p>
            <ArbitrageMini />
            <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <Stat label="Cities" value="7+BM" />
              <Stat label="Items" value="~5K" />
              <LiveDot label="Real-time" />
            </div>
            <Tags items={['Arbitrage', 'AO Data API']} />
          </EdCard>
        </ScrollReveal>

        <ScrollReveal delay={360} style={{ height: '100%' }}>
          <EdCard href="https://alsancak-runners.vercel.app" no="05" kicker="Topluluk" accent="#9faf26">
            <h3 className="display" style={{ fontSize: '1.15rem', marginBottom: 6 }}>{t('p5t')}</h3>
            <p style={{ color: 'var(--muted)', fontSize: '.74rem', lineHeight: 1.5, marginBottom: 10 }}>{t('p5d')}</p>
            <RunRouteMini />
            <Tags items={['Next.js 16', 'Strava', 'Drizzle']} />
          </EdCard>
        </ScrollReveal>

        <ScrollReveal delay={420} style={{ height: '100%' }}>
          <EdCard href="/tracker/sentiment-bot/" no="06" kicker="Quant Research" accent="#4ade80" locked lockLabel={t('lockK')} lockReq={t('lockReq')}>
            <h3 className="display" style={{ fontSize: '1.15rem', marginBottom: 6 }}>
              Sentiment Trading <em className="italic-accent" style={{ color: '#4ade80', fontSize: '.95rem' }}>LLM</em>
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '.74rem', lineHeight: 1.5, marginBottom: 10 }}>
              BIST 30 + 40 akademik feature + 5-model bagging ensemble + vol-targeting. 1052 gün walk-forward, XU100 üstü getiri.
            </p>
            <SentimentMini />
            <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <Stat label="Sharpe" value="0.80" pos />
              <Stat label="CAGR" value="+101%" pos />
              <Stat label="vs XU100" value="+1086pp" pos />
            </div>
            <Tags items={['LLM', 'Vol-Target', 'Ensemble']} />
          </EdCard>
        </ScrollReveal>

        <ScrollReveal delay={480} style={{ height: '100%' }}>
          <EdCard href="/tracker/trend-bot/" no="06b" kicker="Quant · Live" accent="#34d399" locked lockLabel={t('lockK')} lockReq={t('lockReq')}>
            <h3 className="display" style={{ fontSize: '1.15rem', marginBottom: 6 }}>
              Multi-Asset <em className="italic-accent" style={{ color: '#34d399', fontSize: '.95rem' }}>Trend Bot</em>
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '.74rem', lineHeight: 1.5, marginBottom: 10 }}>
              29 ETF/kripto trend-following. 14.5y backtest Jensen α p=0.0001. Şu an <strong style={{ color: '#34d399' }}>3 aylık canlı paper trading</strong>.
            </p>
            <SentimentMini />
            <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <Stat label="Alpha" value="+16.66%" pos />
              <Stat label="Sharpe" value="0.97" pos />
              <LiveDot label="Live" />
            </div>
            <Tags items={['Trend', 'Risk-Parity', 'Vol-Target', 'Jensen α']} />
          </EdCard>
        </ScrollReveal>

        <ScrollReveal delay={540} style={{ height: '100%' }}>
          <EdCard href="#/x" no="07" kicker="Dijital Atlas" accent="#4f8ff7">
            <h3 className="display" style={{ fontSize: '1.15rem', marginBottom: 6 }}>
              {t('p7t')} <em className="italic-accent" style={{ color: '#4f8ff7' }}>×</em>
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '.74rem', lineHeight: 1.5, marginBottom: 10 }}>{t('p7d')}</p>
            <AtlasMini />
            <Tags items={['3D Capture', 'Immersive', 'Polycam']} />
          </EdCard>
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
// EDITORIAL CARD — flat, hairline, kicker + number, hover accent rule
// ═══════════════════════════════════════════
function LockIcon({ color, size = 11 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function EdCard({ children, href, no, kicker, accent, locked, lockLabel, lockReq }: {
  children: React.ReactNode; href: string; no: string; kicker: string; accent: string
  locked?: boolean; lockLabel?: string; lockReq?: string
}) {
  if (locked) {
    const mailto = `mailto:s.cagatay.sonmez@gmail.com?subject=${encodeURIComponent('Erişim talebi — ' + kicker)}`
    return (
      <div className="ed-card" style={{ '--ed-accent': accent, position: 'relative' } as React.CSSProperties}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <span className="mono" style={{ fontSize: '.5rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            {kicker}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <LockIcon color={accent} />
            <span className="mono" style={{ fontSize: '.52rem', color: accent, opacity: .85 }}>{no}</span>
          </span>
        </div>

        {/* blurred/obscured content so outsiders can't read it */}
        <div aria-hidden style={{ filter: 'blur(5px)', opacity: .5, pointerEvents: 'none', userSelect: 'none' }}>
          {children}
        </div>

        {/* frosted lock overlay — a quiet door rather than a wall */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 11, textAlign: 'center', padding: 16,
          background: 'color-mix(in srgb, var(--bg) 55%, transparent)', backdropFilter: 'blur(1px)',
        }}>
          <span style={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', border: '1px solid var(--rule)', color: 'var(--muted)' }}>
            <LockIcon color="currentColor" size={16} />
          </span>
          <span className="mono" style={{ fontSize: '.56rem', letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--ink)' }}>{lockLabel}</span>
          <a href={mailto} className="mono" style={{
            fontSize: '.54rem', letterSpacing: '.1em', textTransform: 'uppercase', textDecoration: 'none',
            color: 'var(--bg)', background: 'var(--ink)', padding: '7px 14px', borderRadius: 999,
          }}>{lockReq} →</a>
        </div>
      </div>
    )
  }

  return (
    <a href={href} className="ed-card" style={{ '--ed-accent': accent } as React.CSSProperties}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="mono" style={{ fontSize: '.5rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          {kicker}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
          <span className="ed-arrow mono" style={{ fontSize: '.6rem', color: accent }}>→</span>
          <span className="mono" style={{ fontSize: '.52rem', color: accent, opacity: .85 }}>{no}</span>
        </span>
      </div>
      {children}
    </a>
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
// LIVE SPARKLINE — real BTC/USD last-30-days (CoinGecko, no key, CORS-open)
// Falls back to the static path if the fetch fails, so the card never breaks.
// ═══════════════════════════════════════════
function LiveSparkline() {
  const [pts, setPts] = useState<number[] | null>(null)
  const [chg, setChg] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('bad'))))
      .then((d: { prices?: [number, number][] }) => {
        if (!alive || !d.prices?.length) return
        const ps = d.prices.map((p) => p[1])
        setPts(ps)
        setChg(((ps[ps.length - 1] - ps[0]) / ps[0]) * 100)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const W = 400, H = 50
  const up = (chg ?? 0) >= 0
  const stroke = up ? '#22c55e' : '#ef4444'

  let line = 'M0,25 L31,27 L62,30 L93,33 L124,31 L155,33 L186,34 L217,38 L248,36 L279,35 L310,39 L341,27 L372,23 L400,24'
  let area = ''
  if (pts && pts.length > 1) {
    const min = Math.min(...pts), max = Math.max(...pts), span = max - min || 1
    const c = pts.map((v, i) => [ (i / (pts.length - 1)) * W, H - ((v - min) / span) * (H - 8) - 4 ] as const)
    line = 'M' + c.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L')
    area = line + ` L${W},${H} L0,${H} Z`
  }

  return (
    <div>
      <svg style={{ width: '100%', height: 36, display: 'block' }} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="lsf" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity=".16" /><stop offset="100%" stopColor={stroke} stopOpacity=".01" />
          </linearGradient>
        </defs>
        {area && <path d={area} fill="url(#lsf)" />}
        <path d={line} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity={pts ? '.9' : '.45'} />
      </svg>
      <div className="mono" lang="en" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '.46rem', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
        <span>BTC/USD · 30g</span>
        {chg != null && <span style={{ color: up ? 'var(--green-t)' : '#ef4444' }}>{up ? '+' : ''}{chg.toFixed(1)}%</span>}
      </div>
    </div>
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
// IPO MINI (Thesis) · bar chart showing yearly IPO distribution
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
// ARBITRAGE MINI (Albion) · buy/sell spread bars
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
// SENTIMENT MINI · backtest equity curve with sentiment "pulses"
// ═══════════════════════════════════════════
function SentimentMini() {
  return (
    <svg style={{width:'100%',height:36,display:'block'}} viewBox="0 0 400 50" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" stopOpacity=".18"/>
          <stop offset="100%" stopColor="#4ade80" stopOpacity=".01"/>
        </linearGradient>
      </defs>
      <polyline points="0,30 50,29 100,28 150,28 200,27 250,27 300,26 350,25 400,25" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,3" opacity=".5"/>
      <path d="M0,32 L33,30 L66,33 L99,28 L132,29 L165,25 L198,22 L231,18 L264,21 L297,16 L330,12 L363,14 L400,10 L400,50 L0,50 Z" fill="url(#sf)"/>
      <polyline points="0,32 33,30 66,33 99,28 132,29 165,25 198,22 231,18 264,21 297,16 330,12 363,14 400,10" fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" opacity=".9"/>
      <circle cx="99" cy="28" r="2" fill="#4ade80" opacity=".8"><animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite"/></circle>
      <circle cx="231" cy="18" r="2" fill="#4ade80" opacity=".8"><animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite" begin="0.6s"/></circle>
      <circle cx="363" cy="14" r="2" fill="#4ade80" opacity=".8"><animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite" begin="1.2s"/></circle>
    </svg>
  )
}

// ═══════════════════════════════════════════
// ATLAS MINI (X) · orbiting 3D-capture nodes around a wireframe globe
// ═══════════════════════════════════════════
function AtlasMini() {
  return (
    <svg style={{width:'100%',height:50,display:'block'}} viewBox="0 0 360 80" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="ax" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4f8ff7" stopOpacity=".25"/>
          <stop offset="100%" stopColor="#4f8ff7" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="180" cy="40" r="30" fill="url(#ax)"/>
      <circle cx="180" cy="40" r="22" fill="none" stroke="#4f8ff7" strokeWidth=".6" opacity=".5"/>
      <ellipse cx="180" cy="40" rx="22" ry="8" fill="none" stroke="#4f8ff7" strokeWidth=".5" opacity=".4"/>
      <ellipse cx="180" cy="40" rx="9" ry="22" fill="none" stroke="#4f8ff7" strokeWidth=".5" opacity=".3"/>
      <line x1="158" y1="40" x2="202" y2="40" stroke="#4f8ff7" strokeWidth=".5" opacity=".3"/>
      <ellipse cx="180" cy="40" rx="48" ry="16" fill="none" stroke="#4f8ff7" strokeWidth=".4" strokeDasharray="2,4" opacity=".35"/>
      {[{d:6,b:0},{d:6,b:2},{d:6,b:4}].map((n,i) => (
        <g key={i} opacity={.9-i*.15}>
          <animateMotion dur={`${n.d}s`} repeatCount="indefinite" begin={`${n.b}s`} path="M132,40 a48,16 0 1,0 96,0 a48,16 0 1,0 -96,0"/>
          <rect x="-2.5" y="-2.5" width="5" height="5" rx="1" fill="#4f8ff7"/>
          <rect x="-4" y="-4" width="8" height="8" rx="1.5" fill="none" stroke="#4f8ff7" strokeWidth=".5" opacity=".5"/>
        </g>
      ))}
    </svg>
  )
}

// ═══════════════════════════════════════════
// PORTFOLIO MINI (XX) · allocation donut + ranked portfolios
// ═══════════════════════════════════════════
function PortfolioMini() {
  const C = 2 * Math.PI * 22
  const segs = [
    { w:.34, c:'#f7931a' },
    { w:.26, c:'#a78bfa' },
    { w:.20, c:'#c8a064' },
    { w:.12, c:'#e0556b' },
    { w:.08, c:'#4f8ff7' },
  ]
  let acc = 0
  return (
    <svg style={{width:'100%',height:90,display:'block'}} viewBox="0 0 360 80" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="px" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity=".22"/>
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="180" cy="40" r="32" fill="url(#px)"/>
      <g transform="rotate(-90 180 40)">
        <circle cx="180" cy="40" r="22" fill="none" stroke="var(--rule)" strokeWidth="5" opacity=".25"/>
        {segs.map((s,i) => {
          const len = s.w * C
          const off = acc * C
          acc += s.w
          return (
            <circle key={i} cx="180" cy="40" r="22" fill="none" stroke={s.c} strokeWidth="5"
              strokeDasharray={`${len-1.5} ${C-len+1.5}`} strokeDashoffset={-off} strokeLinecap="round" opacity=".85">
              <animate attributeName="opacity" values=".55;.95;.55" dur="3.5s" begin={`${i*.4}s`} repeatCount="indefinite"/>
            </circle>
          )
        })}
      </g>
      <circle cx="180" cy="40" r="13" fill="var(--bg)" stroke="#a78bfa" strokeWidth=".8" opacity=".9"/>
      <circle cx="180" cy="36" r="4" fill="#a78bfa" opacity=".7"/>
      <path d="M172,48 a8,6 0 0,1 16,0" fill="#a78bfa" opacity=".7"/>
      {[{x:70,o:.5},{x:110,o:.7},{x:250,o:.7},{x:290,o:.5}].map((p,i) => (
        <g key={i} opacity={p.o}>
          <circle cx={p.x} cy="40" r="9" fill="none" stroke="#a78bfa" strokeWidth="1" opacity=".5"/>
          <circle cx={p.x} cy="40" r="4" fill="#a78bfa" opacity=".4"/>
          <animate attributeName="opacity" values={`${p.o};${p.o-.25};${p.o}`} dur="4s" begin={`${i*.5}s`} repeatCount="indefinite"/>
        </g>
      ))}
    </svg>
  )
}

// ═══════════════════════════════════════════
// RUN ROUTE MINI (Alsancak Runners) · animated runner on route
// ═══════════════════════════════════════════
const RUN_ROUTE = "M20,60 C20,30 60,15 100,20 C140,25 160,45 200,40 C240,35 270,15 310,25 C350,35 340,55 300,60 C260,65 220,55 180,60 C140,65 100,70 60,65 C30,62 20,60 20,60 Z"

function RunRouteMini() {
  return (
    <svg style={{width:'100%',height:50}} viewBox="0 0 360 80" preserveAspectRatio="xMidYMid meet">
      <path d={RUN_ROUTE} fill="none" stroke="var(--rule)" strokeWidth="6" strokeLinecap="round" opacity=".2"/>
      <path d={RUN_ROUTE} fill="none" stroke="#D6FF00" strokeWidth="1.5" strokeDasharray="8,6" opacity=".4"/>
      {[{c:'#D6FF00',d:4,b:0},{c:'#ffffff',d:4.5,b:1.2},{c:'#D6FF00',d:5,b:2.4}].map((r,i) => (
        <g key={i} opacity={1-i*.2}>
          <animateMotion dur={`${r.d}s`} repeatCount="indefinite" path={RUN_ROUTE} begin={`${r.b}s`} rotate="auto"/>
          <circle r="3" fill={r.c} opacity=".9"/>
          <circle r="6" fill={r.c} opacity=".15"/>
        </g>
      ))}
    </svg>
  )
}

// ═══════════════════════════════════════════
// SHARED
// ═══════════════════════════════════════════
function Stat({ label, value, pos }: { label:string; value:string; pos?:boolean }) {
  return (
    <div>
      {/* lang="en": Turkish locale uppercases i→İ (UNDERPRİCİNG); labels are EN/mixed */}
      <div className="mono" lang="en" style={{fontSize:'.46rem',color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.1em'}}>{label}</div>
      <div className="mono" style={{fontSize:'.74rem',fontWeight:500,color:pos?'var(--green-t)':'var(--ink)'}}>{value}</div>
    </div>
  )
}

function LiveDot({ label }: { label:string }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:5}}>
      <span style={{width:5,height:5,borderRadius:'50%',background:'var(--green)',animation:'pd 2s ease-in-out infinite',display:'inline-block'}}/>
      <span className="mono" style={{fontSize:'.55rem',color:'var(--green-t)',letterSpacing:'.08em'}}>{label}</span>
    </div>
  )
}

function Tags({ items }: { items:string[] }) {
  return (
    // lang="en": avoid Turkish dotted-İ when uppercasing English tech tags
    <div lang="en" style={{display:'flex',flexWrap:'wrap',gap:5,marginTop:12}}>
      {items.map(t => <span key={t} className="mono" style={{fontSize:'.48rem',letterSpacing:'.06em',textTransform:'uppercase',padding:'2px 7px',border:'1px solid var(--rule)',color:'var(--muted)',opacity:.65}}>{t}</span>)}
    </div>
  )
}
