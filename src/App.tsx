import { useState, useEffect, lazy, Suspense } from 'react'
import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { ProjectCards } from './components/ProjectCards'
import { Footer } from './components/Footer'
import { F1Page } from './components/F1Page'

const MeshGradient = lazy(() => import('@paper-design/shaders-react').then(m => ({ default: m.MeshGradient })))

const I18N: Record<string, Record<string, string>> = {
  tr: { secP:'Projeler', pCnt:'3 proje', p1d:'Responsible Investment dersi için 100.000 TL portföy takip sistemi. 7 enstrüman, canlı fiyatlar, ESG analizi.', pf:'Portföy', ch:'Değişim', gd:'Altın', lv:'Canlı', tF:'Finans', tA:'Canlı API', p2t:'F1 Yarış Tahmini', p2d:'Ensemble ML (Ridge+GB+ELO) ile F1 yarış tahmini. Canlı telemetri, sektör analizi, lap-by-lap güncelleme.', drivers:'sürücü', cs:'Yakında', csd:'Yeni proje üzerinde çalışılıyor.', tba:'Duyurulacak', navP:'projeler', navC:'iletişim' },
  en: { secP:'Projects', pCnt:'3 projects', p1d:'Portfolio tracking system for Responsible Investment course. 100K TL, 7 instruments, live prices, ESG analysis.', pf:'Portfolio', ch:'Change', gd:'Gold', lv:'Live', tF:'Finance', tA:'Live API', p2t:'F1 Race Predictor', p2d:'F1 race prediction with Ensemble ML. Live telemetry, sector analysis, lap-by-lap updates.', drivers:'drivers', cs:'Coming Soon', csd:'New project in development.', tba:'TBA', navP:'projects', navC:'contact' },
  zh: { secP:'项目', pCnt:'3个项目', p1d:'负责任投资课程的投资组合跟踪系统。', pf:'投资组合', ch:'变化', gd:'黄金', lv:'实时', tF:'金融', tA:'实时API', p2t:'F1比赛预测', p2d:'集成ML模型预测F1比赛。实时遥测、扇区分析。', drivers:'车手', cs:'即将推出', csd:'新项目开发中。', tba:'待公布', navP:'项目', navC:'联系' },
}

function ShaderBg({ dark }: { dark: boolean }) {
  if (!dark) return null
  return (
    <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', opacity:0.35 }}>
      <Suspense fallback={null}>
        <MeshGradient
          colors={['#0c4a6e','#0e7490','#06b6d4','#164e63']}
          speed={0.08}
          distortion={0.3}
          swirl={0.15}
          style={{ width:'100%', height:'100%' }}
        />
      </Suspense>
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
    return <F1Page />
  }

  return (
    <>
      <ShaderBg dark={dark} />
      <div style={{ position:'relative', zIndex:1 }}>
        <Navbar lang={lang} setLang={setLang} dark={dark} setDark={setDark} t={t} />
        <Hero lang={lang} />
        <ProjectCards t={t} />
        <Footer />
      </div>
    </>
  )
}
