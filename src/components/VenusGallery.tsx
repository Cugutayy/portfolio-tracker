import '../styles/venus-gallery.css'

type Props = { lang: string; setLang: (language: string) => void }

const featured = [
  { no: '01', name: 'XX Arena', description: 'Yatırım Yarışması', en: 'Investment competition', href: 'https://xx-arena.vercel.app/' },
  { no: '02', name: 'Portfolio Tracker', description: 'Yatırım Analizi ve Takibi', en: 'Investment analysis and tracking', href: 'https://snmez.xyz/tracker/' },
  { no: '03', name: 'Motorsport ML', description: 'Makine Öğrenmesi', en: 'Machine learning', href: 'mailto:s.cagatay.sonmez@gmail.com?subject=Motorsport%20ML%20Eri%C5%9Fim' },
  { no: '04', name: 'Alsancak Runners', description: 'Koşu Topluluğu', en: 'Running community', href: 'https://alsancak-runners.vercel.app/' },
]

const research = [
  { title: 'BIST Tezi', description: 'Halka arzların uzun dönem performansı', en: 'Long-run IPO performance', image: '/x/rooms/sanat.jpg', href: 'https://snmez.xyz/tez/' },
  { title: 'Pattern Bot', description: 'Piyasa desenleri ve stratejiler', en: 'Market patterns and strategies', image: '/x/rooms/mekan.jpg', href: 'https://snmez.xyz/pattern-bot.html' },
  { title: 'Jane Street Trader', description: 'Nicel işlem deneyimleri', en: 'Quantitative trading experiments', image: '/x/rooms/koleksiyon.jpg', href: 'https://snmez.xyz/jane-street.html' },
  { title: 'On-chain Analiz', description: 'Zincir üstü veri ve piyasa dinamikleri', en: 'On-chain data and market dynamics', image: '/x/rooms/sarap.jpg', href: 'https://snmez.xyz/brain/' },
]

const archive = [
  { no: '09', title: 'X × Atlas', description: '3D / 360° dijital mekân arşivi', en: 'A 3D / 360° spatial archive', image: '/x/rooms/sahil.jpg', href: 'https://snmez.xyz/#/x' },
  { no: '10', title: 'Albion Piyasa Tarayıcı', description: 'Oyun ekonomisi · Erişim iste', en: 'Game economy · Request access', image: '/x/rooms/sanat.jpg', href: 'mailto:s.cagatay.sonmez@gmail.com?subject=Albion%20Eri%C5%9Fim' },
  { no: '11', title: 'Sentiment Trading', description: 'BIST 30 · Erişim iste', en: 'BIST 30 · Request access', image: '/x/rooms/koleksiyon.jpg', href: 'mailto:s.cagatay.sonmez@gmail.com?subject=Sentiment%20Trading%20Eri%C5%9Fim' },
  { no: '12', title: 'Multi-Asset Trend Bot', description: '29 varlık · Erişim iste', en: '29 assets · Request access', image: '/x/rooms/mekan.jpg', href: 'mailto:s.cagatay.sonmez@gmail.com?subject=Trend%20Bot%20Eri%C5%9Fim' },
  { no: '13', title: 'KediDex', description: 'Kedi tanıma oyunu · Erişim iste', en: 'Cat identification game · Request access', image: '/kedidex/icons/icon-512.png', href: 'mailto:s.cagatay.sonmez@gmail.com?subject=KediDex%20Eri%C5%9Fim', icon: true },
  { no: '14', title: 'Journey Notes', description: 'Fotoğraf ve seyahat günlüğü', en: 'Photography and travel journal', image: '/journey/portrait-hq.avif', href: 'https://journeynotess.com/' },
]

export function VenusGallery({ lang, setLang }: Props) {
  const tr = lang !== 'en'
  return (
    <div className="venus-hub">
      <main>
        <section className="vv-stage" id="top" aria-label="SNMEZ — seçilmiş projeler ve araştırmalar">
          <picture className="vv-painting" aria-hidden="true">
            <source media="(min-width: 1300px)" srcSet="/x/venus-4k.jpg" />
            <img src="/x/venus-2k.jpg" alt="" fetchPriority="high" />
          </picture>
          <div className="vv-painting-shade" aria-hidden="true" />

          <nav className="vv-nav" aria-label="Main navigation">
            <a href="#top" className="vv-brand" aria-label="SNMEZ — başa dön">SNMEZ</a>
            <div className="vv-nav-links">
              <a href="#featured">{tr ? 'PROJELER' : 'WORKS'}</a>
              <a href="https://journeynotess.com/" target="_blank" rel="noreferrer">NOTES</a>
              <a href="mailto:s.cagatay.sonmez@gmail.com">{tr ? 'HAKKINDA' : 'ABOUT'}</a>
              <div className="vv-language" aria-label="Language selection">
                <button type="button" className={lang === 'tr' ? 'is-active' : ''} onClick={() => setLang('tr')} aria-pressed={lang === 'tr'}>TR</button>
                <button type="button" className={lang === 'en' ? 'is-active' : ''} onClick={() => setLang('en')} aria-pressed={lang === 'en'}>EN</button>
              </div>
            </div>
          </nav>

          <div className="vv-introduction">
            <p>{tr ? 'Projeler, araştırmalar ve deneyler.' : 'Projects, research and experiments.'}</p>
          </div>

          <div className="vv-featured" id="featured" aria-label="Selected works">
            {featured.map(item => (
              <a key={item.no} className="vv-feature" href={item.href}>
                <span className="vv-feature-number">{item.no}</span>
                <h2>{item.name}</h2>
                <span className="vv-feature-description">{tr ? item.description : item.en}</span>
              </a>
            ))}
          </div>

          <div className="vv-research" aria-label="Research and development">
            <h2>{tr ? 'Araştırmalar & Geliştirme' : 'Research & Development'}</h2>
            <div className="vv-research-items">
              {research.map(item => (
                <a href={item.href} key={item.title} className="vv-research-item">
                  <span className="vv-research-image"><img src={item.image} alt="" loading="lazy" /></span>
                  <span className="vv-research-copy"><strong>{item.title}</strong><small>{tr ? item.description : item.en}</small></span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="vv-archive" id="archive" aria-labelledby="vv-archive-title">
          <div className="vv-archive-inner">
            <header className="vv-archive-header">
              <div>
                <span className="vv-kicker">SNMEZ / {tr ? 'KOLEKSİYON' : 'COLLECTION'} / 09—14</span>
                <h2 id="vv-archive-title">{tr ? 'Diğer Çalışmalar' : 'Other Works'}</h2>
                <p>{tr ? 'Projeler, araştırmalar ve deneyler.' : 'Projects, research and experiments.'}</p>
              </div>
              <div className="vv-archive-side" aria-hidden="true"><span>09</span><i /><span>14</span></div>
            </header>

            <div className="vv-archive-grid">
              {archive.map(item => (
                <a key={item.no} className="vv-entry" href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}>
                  <div className={'vv-cover' + (item.icon ? ' vv-cover-icon' : '')}>
                    <img src={item.image} loading="lazy" alt="" />
                  </div>
                  <div className="vv-entry-copy">
                    <small>{item.no} / {tr ? 'SEÇİLMİŞ ÇALIŞMA' : 'SELECTED WORK'}</small>
                    <h3>{item.title}</h3>
                    <p>{tr ? item.description : item.en}</p>
                    <span className="vv-entry-invite">{tr ? 'Çalışmayı keşfet' : 'Explore the work'}</span>
                  </div>
                </a>
              ))}
            </div>
            <div className="vv-archive-colophon"><span>SNMEZ · {tr ? 'Dijital koleksiyon' : 'Digital collection'}</span><span>IX — XIV</span></div>
          </div>
        </section>
      </main>
      <footer className="vv-footer">
        <span>bir zambak gibi, yavaşça</span>
        <div>
          <a href="https://github.com/Cugutayy" target="_blank" rel="noreferrer">GitHub</a>
          <a href="mailto:s.cagatay.sonmez@gmail.com">Contact</a>
          <a href="#top">Top</a>
        </div>
      </footer>
    </div>
  )
}
