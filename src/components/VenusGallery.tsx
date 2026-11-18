import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react'
import '../styles/venus-gallery.css'

type Props = { lang: string; setLang: (language: string) => void }
type Work = {
  title: string
  description: string
  en: string
  href: string
  image?: string
}

const featured: Work[] = [
  { title: 'XX Arena', description: 'Sosyal yatırım yarışması', en: 'Social investing competition', href: 'https://xx-arena.vercel.app/' },
  { title: 'Portfolio Tracker', description: 'Portföy analizi ve takibi', en: 'Portfolio analysis and tracking', href: '/tracker/' },
  { title: 'Motorsport ML', description: 'Yarış sonuçları için makine öğrenmesi', en: 'Machine learning for race prediction', href: 'mailto:s.cagatay.sonmez@gmail.com?subject=Motorsport%20ML%20Eri%C5%9Fim' },
  { title: 'Alsancak Runners', description: 'İzmir koşu topluluğu', en: 'İzmir running community', href: 'https://alsancak-runners.vercel.app/' },
]

const research: Work[] = [
  { title: 'BIST Tezi', description: 'Halka arzların uzun dönem performansı', en: 'Long-run IPO performance', href: '/tez/' },
  { title: 'Pattern Bot', description: 'Piyasa desenleri ve stratejiler', en: 'Market patterns and strategies', href: '/pattern-bot.html' },
  { title: 'Jane Street Trader', description: 'Nicel işlem deneyimleri', en: 'Quantitative trading experiments', href: '/jane-street.html' },
  { title: 'On-chain Analiz', description: 'Zincir üstü veri ve piyasa dinamikleri', en: 'On-chain data and market dynamics', href: '/brain/' },
]

const archive: Work[] = [
  { title: 'X × Atlas', description: '3B ve 360° mekân arşivi', en: '3D and 360° spatial archive', image: '/x/rooms/sahil.jpg', href: '#/x' },
  { title: 'Journey Notes', description: 'Fotoğraf ve seyahat günlüğü', en: 'Photography and travel journal', image: '/journey/hero-snow.avif', href: 'https://journeynotess.com/' },
  { title: 'Albion Piyasa Tarayıcı', description: 'Oyun ekonomisi', en: 'In-game economy', href: 'mailto:s.cagatay.sonmez@gmail.com?subject=Albion%20Eri%C5%9Fim' },
  { title: 'Sentiment Trading', description: 'BIST 30', en: 'BIST 30', href: 'mailto:s.cagatay.sonmez@gmail.com?subject=Sentiment%20Trading%20Eri%C5%9Fim' },
  { title: 'Multi-Asset Trend Bot', description: '29 varlık için trend takibi', en: 'Trend tracking across 29 assets', href: 'mailto:s.cagatay.sonmez@gmail.com?subject=Trend%20Bot%20Eri%C5%9Fim' },
  { title: 'KediDex', description: 'Kedi tanıma oyunu', en: 'Cat identification game', href: 'mailto:s.cagatay.sonmez@gmail.com?subject=KediDex%20Eri%C5%9Fim' },
]

function WorkLink({ work, tr }: { work: Work; tr: boolean }) {
  const requiresAccess = work.href.startsWith('mailto:')
  const isExternal = work.href.startsWith('https://')
  const Icon = isExternal || requiresAccess ? ArrowUpRight : ArrowRight
  return (
    <a className={'vv-work' + (work.image ? ' vv-work-illustrated' : '')} href={work.href}>
      {work.image && <img className="vv-work-image" src={work.image} loading="lazy" alt="" />}
      <div className="vv-work-content">
        <h3>{work.title}</h3>
        <p>{tr ? work.description : work.en}</p>
        {requiresAccess && <span className="vv-access">{tr ? 'Erişim iste' : 'Request access'}</span>}
      </div>
      <Icon className="vv-work-arrow" size={19} strokeWidth={1.5} aria-hidden="true" />
    </a>
  )
}

export function VenusGallery({ lang, setLang }: Props) {
  const tr = lang !== 'en'
  return (
    <div className="venus-hub" id="top">
      <header className="vv-hero" aria-labelledby="vv-title">
        <figure className="vv-art">
          <img src="/x/venus-2k.jpg" alt={tr ? 'Sandro Botticelli’nin Venüs’ün Doğuşu tablosu' : 'The Birth of Venus by Sandro Botticelli'} fetchPriority="high" />
        </figure>
        <div className="vv-shell vv-hero-inner">
          <div className="vv-header-inner">
            <a href="#top" className="vv-brand" aria-label={tr ? 'SNMEZ, başa dön' : 'SNMEZ, back to top'}>SNMEZ</a>
            <nav className="vv-nav" aria-label={tr ? 'Ana menü' : 'Main navigation'}>
              <a href="#featured">{tr ? 'Projeler' : 'Projects'}</a>
              <a href="https://journeynotess.com/">{tr ? 'Notlar' : 'Notes'}</a>
              <a href="mailto:s.cagatay.sonmez@gmail.com">{tr ? 'İletişim' : 'Contact'}</a>
              <div className="vv-language" aria-label={tr ? 'Dil' : 'Language'}>
                <button type="button" lang="tr" onClick={() => setLang('tr')} aria-pressed={tr}>TR</button>
                <button type="button" lang="en" onClick={() => setLang('en')} aria-pressed={!tr}>EN</button>
              </div>
            </nav>
          </div>
          <div className="vv-hero-copy">
            <h1 id="vv-title">Hub</h1>
            <p className="vv-intro">{tr ? 'Projeler, araştırmalar ve deneyler.' : 'Projects, research and experiments.'}</p>
          </div>
          <a className="vv-hero-link" href="#featured">{tr ? 'Projeleri incele' : 'Browse projects'} <ArrowDown size={17} strokeWidth={1.55} aria-hidden="true" /></a>
        </div>
      </header>

      <main className="vv-shell">
        <section id="featured" className="vv-section" aria-labelledby="vv-featured-title">
          <h2 id="vv-featured-title">{tr ? 'Seçili projeler' : 'Selected projects'}</h2>
          <a className="vv-showcase" href="/ege-edebiyat/">
            <img className="vv-showcase-image" src="/hub/ege-edebiyat.webp" alt={tr ? 'Edebiyat Fakültesi ve bağlı kanatların 3B modeli' : '3D model of the Faculty of Letters and its adjoining wings'} width="1400" height="700" decoding="async" />
            <div className="vv-showcase-copy">
              <p className="vv-category">{tr ? 'Bornova, İzmir · 3B mimari' : 'Bornova, İzmir · 3D architecture'}</p>
              <h3>{tr ? 'Ege Üniversitesi Edebiyat Fakültesi' : 'Ege University Faculty of Letters'}</h3>
              <p>{tr ? 'Fotoğraflar ve hava görüntüleriyle modellenen fakülte, dekanlık girişi ve çevresindeki kanatlar.' : 'The faculty, dean’s entrance and adjoining wings reconstructed from photographs and aerial imagery.'}</p>
            </div>
            <ArrowRight className="vv-work-arrow" size={20} strokeWidth={1.5} aria-hidden="true" />
          </a>
          <div className="vv-grid">
            {featured.map(work => <WorkLink key={work.title} work={work} tr={tr} />)}
          </div>
        </section>

        <section className="vv-section" aria-labelledby="vv-research-title">
          <h2 id="vv-research-title">{tr ? 'Araştırmalar' : 'Research'}</h2>
          <div className="vv-grid">
            {research.map(work => <WorkLink key={work.title} work={work} tr={tr} />)}
          </div>
        </section>

        <section className="vv-section" id="archive" aria-labelledby="vv-archive-title">
          <h2 id="vv-archive-title">{tr ? 'Arşiv' : 'Archive'}</h2>
          <div className="vv-grid">
            {archive.map(work => <WorkLink key={work.title} work={work} tr={tr} />)}
          </div>
        </section>
      </main>

      <footer className="vv-shell vv-footer">
        <span>SNMEZ</span>
        <div>
          <a href="https://github.com/Cugutayy">GitHub</a>
          <a href="mailto:s.cagatay.sonmez@gmail.com">{tr ? 'İletişim' : 'Contact'}</a>
          <a href="#top">{tr ? 'Başa dön' : 'Back to top'}</a>
        </div>
      </footer>
    </div>
  )
}
