import { useState, useEffect } from 'react'
import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { InteractiveGraph } from './components/InteractiveGraph'
import { ProjectCards } from './components/ProjectCards'
import { Footer } from './components/Footer'
import { F1Page } from './components/F1Page'

const I18N: Record<string, Record<string, string>> = {
  tr: { secP:'Projeler', pCnt:'3 proje', p1d:'Responsible Investment dersi için 100.000 TL portföy takip sistemi. 7 enstrüman, canlı fiyatlar, ESG analizi.', pf:'Portföy', ch:'Değişim', gd:'Altın', lv:'Canlı', tF:'Finans', tA:'Canlı API', p2t:'F1 Yarış Tahmini', p2d:'Ensemble ML (Ridge+GB+ELO) ile F1 yarış tahmini. Canlı telemetri, sektör analizi, lap-by-lap güncelleme.', drivers:'sürücü', p3t:'Tez Konusu', p3d:'BIST 2020–2025 halka arz düşük fiyatlaması, sürü davranışı ve SPK cezaları. 209 halka arz, 5 araştırma sorusu.', navP:'projeler', navC:'iletişim' },
  en: { secP:'Projects', pCnt:'3 projects', p1d:'Portfolio tracking system for Responsible Investment course. 100K TL, 7 instruments, live prices, ESG analysis.', pf:'Portfolio', ch:'Change', gd:'Gold', lv:'Live', tF:'Finance', tA:'Live API', p2t:'F1 Race Predictor', p2d:'F1 race prediction with Ensemble ML. Live telemetry, sector analysis, lap-by-lap updates.', drivers:'drivers', p3t:'Thesis', p3d:'BIST 2020–2025 IPO underpricing, herding behavior & SPK penalties. 209 IPOs, 5 research questions.', navP:'projects', navC:'contact' },
  zh: { secP:'项目', pCnt:'3个项目', p1d:'负责任投资课程的投资组合跟踪系统。', pf:'投资组合', ch:'变化', gd:'黄金', lv:'实时', tF:'金融', tA:'实时API', p2t:'F1比赛预测', p2d:'集成ML模型预测F1比赛。实时遥测、扇区分析。', drivers:'车手', p3t:'毕业论文', p3d:'BIST 2020-2025 IPO定价不足和羊群行为研究。209家IPO。', navP:'项目', navC:'联系' },
}

/* Pure CSS ambient orbs — zero JS, GPU composited */
function AmbientOrbs({ dark }: { dark: boolean }) {
  return (
    <div className="ambient-orbs" aria-hidden="true" style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
      <div className="orb orb-1" style={{
        position:'absolute', width:'45vmax', height:'45vmax', borderRadius:'50%',
        top:'-10%', left:'-5%',
        background: dark
          ? 'radial-gradient(circle, rgba(200,160,100,0.07) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(180,140,80,0.08) 0%, transparent 70%)',
        filter:'blur(60px)',
        animation:'orbFloat1 30s ease-in-out infinite alternate',
      }} />
      <div className="orb orb-2" style={{
        position:'absolute', width:'40vmax', height:'40vmax', borderRadius:'50%',
        top:'30%', right:'-10%',
        background: dark
          ? 'radial-gradient(circle, rgba(80,110,160,0.06) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(100,130,180,0.06) 0%, transparent 70%)',
        filter:'blur(70px)',
        animation:'orbFloat2 35s ease-in-out infinite alternate',
      }} />
      <div className="orb orb-3" style={{
        position:'absolute', width:'35vmax', height:'35vmax', borderRadius:'50%',
        bottom:'-5%', left:'30%',
        background: dark
          ? 'radial-gradient(circle, rgba(160,90,100,0.05) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(180,100,120,0.05) 0%, transparent 70%)',
        filter:'blur(80px)',
        animation:'orbFloat3 28s ease-in-out infinite alternate',
      }} />
      <div className="orb orb-4" style={{
        position:'absolute', width:'25vmax', height:'25vmax', borderRadius:'50%',
        top:'60%', left:'10%',
        background: dark
          ? 'radial-gradient(circle, rgba(100,180,140,0.04) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(80,160,120,0.04) 0%, transparent 70%)',
        filter:'blur(50px)',
        animation:'orbFloat4 32s ease-in-out infinite alternate',
      }} />
    </div>
  )
}

export default function App() {
  const [lang, setLang] = useState('tr')
  const [dark, setDark] = useState(true)
  const [page, setPage] = useState<'hub' | 'f1'>('hub')
  const t = (key: string) => I18N[lang]?.[key] || key

  useEffect(() => { document.documentElement.lang = lang }, [lang])
  useEffect(() => { document.documentElement.setAttribute('data-theme', dark ? 'dark' : '') }, [dark])

  // Hash-based routing
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#/f1') setPage('f1')
      else setPage('hub')
    }
    handleHash()
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  if (page === 'f1') {
    return <F1Page dark={dark} setDark={setDark} />
  }

  return (
    <>
      <AmbientOrbs dark={dark} />
      <div style={{ position:'relative', zIndex:1 }}>
        <Navbar lang={lang} setLang={setLang} dark={dark} setDark={setDark} t={t} />
        <Hero lang={lang} />
        <InteractiveGraph dark={dark} t={t} />
        <ProjectCards t={t} />
        <Footer />
      </div>
    </>
  )
}
