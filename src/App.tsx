import { useState, useEffect, useRef } from 'react'
import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { ProjectCards } from './components/ProjectCards'
import { Footer } from './components/Footer'
import { XPage } from './components/XPage'

const I18N: Record<string, Record<string, string>> = {
  tr: { lockK:'Erişime kapalı', lockMsg:'Bu projeyi görüntüleme yetkiniz yok', lockBack:'Hub\'a dön', lead:'MANŞET', leadCta:'Arenaya gir', leadStart:'Başlangıç', leadLev:'Kaldıraç', leadData:'CANLI VERİ', secP:'Projeler', pCnt:'9 proje', p1d:'Responsible Investment dersi için 100.000 TL portföy takip sistemi. 7 enstrüman, canlı fiyatlar, ESG analizi.', pf:'Portföy', ch:'Değişim', gd:'Altın', lv:'Canlı', tF:'FİNANS', tA:'Canlı API', p2t:'F1 Yarış Tahmini', p2d:'Ensemble ML (Ridge+GB+ELO) ile F1 yarış tahmini. Canlı telemetri, sektör analizi, lap-by-lap güncelleme.', drivers:'sürücü', p3t:'Tez Konusu', p3d:'BIST 2020–2025 halka arz düşük fiyatlaması, sürü davranışı ve SPK cezaları. 209 halka arz, 5 araştırma sorusu.', p4t:'Albion Piyasa Tarayıcı', p4d:'Albion Online piyasa arbitraj tarayıcı. Şehirler arası ve Kara Pazar fiyat farkı analizi.', p5t:'Alsancak Runners', p5d:'İzmir merkezli urban running topluluğu. Strava entegrasyonu, etkinlik yönetimi, topluluk dashboard\'ı.', p7t:'X', p7d:'3D / 360° dijital mekân arşivi. Gezilen estetik ve otantik mekânların sinematik, immersive dijital atlası. (Geliştiriliyor)', p8t:'XX', p8d:'Traderların 1.000.000 ₺ sanal portföyle yarıştığı sosyal yatırım arenası. Gerçek piyasa fiyatları, canlı liderlik. (Geliştiriliyor)', navP:'projeler', navC:'iletişim' },
  en: { lockK:'Restricted', lockMsg:'You don\'t have access to this project', lockBack:'Back to hub', lead:'LEAD STORY', leadCta:'Enter the arena', leadStart:'Starting', leadLev:'Leverage', leadData:'Live data', secP:'Projects', pCnt:'9 projects', p1d:'Portfolio tracking system for Responsible Investment course. 100K TL, 7 instruments, live prices, ESG analysis.', pf:'Portfolio', ch:'Change', gd:'Gold', lv:'Live', tF:'Finance', tA:'Live API', p2t:'F1 Race Predictor', p2d:'F1 race prediction with Ensemble ML. Live telemetry, sector analysis, lap-by-lap updates.', drivers:'drivers', p3t:'Thesis', p3d:'BIST 2020–2025 IPO underpricing, herding behavior & SPK penalties. 209 IPOs, 5 research questions.', p4t:'Albion Market Scanner', p4d:'Albion Online market arbitrage scanner. City-to-city and Black Market price gap analysis.', p5t:'Alsancak Runners', p5d:'Urban running collective based in Izmir. Strava integration, event management, community dashboard.', p7t:'X', p7d:'A 3D / 360° digital archive of places. A cinematic, immersive digital atlas of the aesthetic and authentic spaces visited. (Work in progress)', p8t:'XX', p8d:'A social investing arena where traders compete with a 1,000,000 ₺ virtual portfolio. Real market prices, live leaderboard. (Work in progress)', navP:'projects', navC:'contact' },
  zh: { lockK:'受限访问', lockMsg:'您无权查看此项目', lockBack:'返回主页', lead:'头条', leadCta:'进入竞技场', leadStart:'起始', leadLev:'杠杆', leadData:'实时数据', secP:'项目', pCnt:'9个项目', p1d:'负责任投资课程的投资组合跟踪系统。', pf:'投资组合', ch:'变化', gd:'黄金', lv:'实时', tF:'金融', tA:'实时API', p2t:'F1比赛预测', p2d:'集成ML模型预测F1比赛。实时遥测、扇区分析。', drivers:'车手', p3t:'毕业论文', p3d:'BIST 2020-2025 IPO定价不足和羊群行为研究。209家IPO。', p4t:'Albion市场扫描器', p4d:'Albion Online市场套利扫描器。城市间和黑市价格差分析。', p5t:'Alsancak Runners', p5d:'伊兹密尔城市跑步社区。Strava集成、活动管理、社区仪表板。', p7t:'X', p7d:'3D / 360° 数字空间档案。一座记录所游历的美学与本真场所的电影级沉浸式数字地图集。（开发中）', p8t:'XX', p8d:'交易者用100万₺虚拟投资组合竞争的社交投资竞技场。真实市场价格，实时排行榜。（开发中）', navP:'项目', navC:'联系' },
}

export default function App() {
  const [lang, setLang] = useState('tr')
  const [dark, setDark] = useState(true)
  const [page, setPage] = useState<'hub' | 'f1' | 'albion' | 'x'>('hub')
  const lilyRef = useRef<HTMLDivElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  const t = (key: string) => I18N[lang]?.[key] || key

  // scroll-driven backdrop: the lily gently drifts down to reveal its lower
  // stems (parallax) while a soft scrim keeps content legible without hiding it
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const vh = window.innerHeight || 1
        const kScrim = Math.min(1, window.scrollY / (vh * 0.8))
        const kPar = Math.min(1, window.scrollY / (vh * 1.8))
        if (scrimRef.current) scrimRef.current.style.opacity = String(0.1 + kScrim * 0.46)
        if (lilyRef.current) lilyRef.current.style.backgroundPosition = `center ${38 + kPar * 30}%`
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [page])

  useEffect(() => { document.documentElement.lang = lang }, [lang])
  useEffect(() => { document.documentElement.setAttribute('data-theme', dark ? 'dark' : '') }, [dark])

  // Hash-based routing
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#/f1') setPage('f1')
      else if (window.location.hash === '#/albion') setPage('albion')
      else if (window.location.hash.startsWith('#/x')) setPage('x')
      else setPage('hub')
    }
    handleHash()
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  // F1 & Albion are access-restricted — outsiders get a locked screen.
  if (page === 'f1' || page === 'albion') {
    return <LockedPage t={t} />
  }

  if (page === 'x') {
    return <XPage />
  }

  return (
    <>
      {/* site-wide fixed lily backdrop (drifts on scroll) */}
      <div className="site-lily" aria-hidden ref={lilyRef} />
      <div className="site-scrim" aria-hidden ref={scrimRef} />
      <div className="site-grain" aria-hidden />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Navbar lang={lang} setLang={setLang} dark={dark} setDark={setDark} t={t} />
        <Hero lang={lang} />
        <ProjectCards t={t} />
        <Footer />
      </div>
    </>
  )
}

/** Access-denied screen for restricted routes (#/f1, #/albion). */
function LockedPage({ t }: { t: (k: string) => string }) {
  return (
    <div className="font-ui" style={{
      minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 20, textAlign: 'center', padding: 24, background: 'var(--bg)', color: 'var(--ink)',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%', display: 'grid', placeItems: 'center',
        border: '1px solid var(--rule)', color: 'var(--muted)',
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </div>
      <h1 className="font-display" style={{ fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', margin: 0 }}>
        {t('lockK')}
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '.92rem', maxWidth: 360, margin: 0, lineHeight: 1.55 }}>{t('lockMsg')}</p>
      <a href="#/" onClick={() => { window.location.hash = ''; }} className="mono" style={{
        fontSize: '.62rem', letterSpacing: '.14em', textTransform: 'uppercase',
        border: '1px solid var(--rule)', padding: '10px 18px', borderRadius: 999, color: 'var(--ink)', textDecoration: 'none',
      }}>← {t('lockBack')}</a>
    </div>
  )
}
