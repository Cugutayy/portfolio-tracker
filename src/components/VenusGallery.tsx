import '../styles/venus-gallery.css'

type Language = 'tr' | 'en' | 'zh'
type Props = { lang: string; setLang: (lang: string) => void }
type Entry = { number: string; title: string; description: [string, string]; href: string; image?: string; imageAlt?: string; restricted?: boolean }

const featured: Entry[] = [
  { number: '01', title: 'XX Arena', description: ['Yatırım Yarışması', 'Investment Competition'], href: 'https://xx-arena.vercel.app/' },
  { number: '02', title: 'Portfolio Tracker', description: ['Yatırım Analizi ve Takibi', 'Portfolio Analysis & Tracking'], href: '/tracker/' },
  { number: '03', title: 'Motorsport ML', description: ['Makine Öğrenmesi', 'Machine Learning'], href: '#/f1', restricted: true },
  { number: '04', title: 'Alsancak Runners', description: ['Koşu Topluluğu', 'Running Community'], href: 'https://alsancak-runners.vercel.app/' },
]

const research: Entry[] = [
  { number: '05', title: 'BIST Tezi', description: ['Halka arzların uzun dönem performansı', 'Long-run IPO performance'], href: '/tez/', image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=480&q=85', imageAlt: 'Financial research desk and papers' },
  { number: '06', title: 'Pattern Bot', description: ['Piyasa desenleri ve stratejiler', 'Market patterns and strategies'], href: '/pattern-bot.html', image: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=480&q=85', imageAlt: 'Code used to analyze financial market patterns' },
  { number: '07', title: 'Jane Street Trader', description: ['Nicel işlem deneyimleri', 'Quantitative trading practice'], href: '/jane-street.html', image: 'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?auto=format&fit=crop&w=480&q=85', imageAlt: 'Mathematics on a blackboard' },
  { number: '08', title: 'On-chain Analiz', description: ['Zincir üstü veri ve piyasa dinamikleri', 'On-chain data and market dynamics'], href: '/brain/', image: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&w=480&q=85', imageAlt: 'Physical Bitcoin coin' },
]

const archive: Entry[] = [
  { number: '09', title: 'X × Atlas', description: ['3D / 360° mekân arşivi', '3D / 360° archive of places'], href: '#/x', image: '/x/rooms/sahil.jpg', imageAlt: 'A photographed coastal setting from X Atlas' },
  { number: '10', title: 'Albion Piyasa Tarayıcı', description: ['Oyun ekonomisi · Erişim iste', 'Game economy · Request access'], href: '#/albion', image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=480&q=85', imageAlt: 'Video gaming scene', restricted: true },
  { number: '11', title: 'Sentiment Trading', description: ['BIST 30 · Erişim iste', 'BIST 30 · Request access'], href: 'mailto:s.cagatay.sonmez@gmail.com?subject=Sentiment%20Trading%20eri%C5%9Fim', image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=480&q=85', imageAlt: 'Market trading monitor', restricted: true },
  { number: '12', title: 'Multi-Asset Trend Bot', description: ['29 varlık · Erişim iste', '29 assets · Request access'], href: 'mailto:s.cagatay.sonmez@gmail.com?subject=Trend%20Bot%20eri%C5%9Fim', image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=480&q=85', imageAlt: 'Financial analysis graph', restricted: true },
  { number: '13', title: 'KediDex', description: ['Kedi tanıma oyunu · Erişim iste', 'Cat recognition game · Request access'], href: 'mailto:s.cagatay.sonmez@gmail.com?subject=KediDex%20eri%C5%9Fim', image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=480&q=85', imageAlt: 'Photograph of a cat', restricted: true },
  { number: '14', title: 'Journey Notes', description: ['Fotoğraf ve seyahat günlüğü', 'Photography and travel journal'], href: 'https://journeynotess.com/', image: '/journey/portrait-hq.avif', imageAlt: 'Photograph from the Journey Notes archive' },
]

function isExternal(url: string) {
  return url.startsWith('https://')
}

export function VenusGallery({ lang, setLang }: Props) {
  const l: Language = lang === 'en' ? 'en' : lang === 'zh' ? 'zh' : 'tr'
  const en = l !== 'tr'
  const words = (tr: string, eng: string) => en ? eng : tr

  return (
    <div className="venus-hub" id="top">
      <div className="venus-hub-art" aria-hidden="true" />
      <div className="venus-hub-shade" aria-hidden="true" />

      <div className="venus-hub-opening">
        <nav className="venus-hub-nav" aria-label={words('Ana gezinme', 'Main navigation')}>
          <a className="venus-hub-brand" href="#top" aria-label="SNMEZ">SNMEZ</a>
          <div className="venus-hub-nav-right">
            <a href="#selected-works">{words('PROJELER', 'WORKS')}</a>
            <a href="#top" aria-current="page">HUB</a>
            <a href="https://journeynotess.com/" target="_blank" rel="noreferrer">{words('NOTLAR', 'NOTES')}</a>
            <a href="mailto:s.cagatay.sonmez@gmail.com">ABOUT</a>
            <div className="venus-hub-languages" aria-label={words('Dil seçimi', 'Language selection')}>
              <button type="button" aria-pressed={l === 'tr'} className={l === 'tr' ? 'is-active' : ''} onClick={() => setLang('tr')}>TR</button>
              <button type="button" aria-pressed={l === 'en'} className={l === 'en' ? 'is-active' : ''} onClick={() => setLang('en')}>EN</button>
              <button type="button" aria-pressed={l === 'zh'} className={l === 'zh' ? 'is-active' : ''} onClick={() => setLang('zh')}>中文</button>
            </div>
          </div>
        </nav>

        <section className="venus-hub-hero" aria-labelledby="venus-hub-title">
          <h1 id="venus-hub-title">Hub</h1>
          <p>{words('Projeler, araştırmalar ve deneyler.', 'Projects, research and experiments.')}</p>
        </section>

        <section className="venus-hub-selected" id="selected-works" aria-label={words('Seçilmiş projeler', 'Selected projects')}>
          {featured.map((item) => (
            <a key={item.number} className="venus-hub-featured-item" href={item.href}
              {...(isExternal(item.href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
              <span className="venus-hub-number">{item.number}</span>
              <h2>{item.title}</h2>
              <span className="venus-hub-description">{item.description[en ? 1 : 0]}</span>
              <span className="venus-hub-arrow" aria-hidden="true">↗</span>
            </a>
          ))}
        </section>

        <section className="venus-hub-research" id="research" aria-labelledby="venus-hub-research-title">
          <h2 id="venus-hub-research-title">{words('Araştırmalar & Geliştirme', 'Research & Development')}</h2>
          <div className="venus-hub-research-grid">
            {research.map((item) => (
              <a key={item.number} className="venus-hub-research-item" href={item.href}>
                <img src={item.image} alt={item.imageAlt} loading="lazy" width="120" height="114" />
                <span className="venus-hub-research-copy">
                  <strong>{item.title}</strong>
                  <small>{item.description[en ? 1 : 0]}</small>
                  <span className="venus-hub-arrow" aria-hidden="true">↗</span>
                </span>
              </a>
            ))}
          </div>
        </section>
        <a className="venus-hub-scroll" href="#archive" aria-label={words('Diğer projelere kaydır', 'Scroll to other projects')}>{words('DİĞER PROJELER', 'MORE PROJECTS')} <span aria-hidden="true">↓</span></a>
      </div>

      <section className="venus-hub-archive" id="archive" aria-labelledby="venus-hub-archive-title">
        <div className="venus-hub-archive-inner">
          <div className="venus-hub-archive-heading">
            <span className="venus-hub-archive-kicker">SNMEZ / 09–14</span>
            <h2 id="venus-hub-archive-title">{words('Diğer Çalışmalar', 'Other Works')}</h2>
            <p>{words('Dijital projeler, araştırmalar ve kişisel deneyler.', 'Digital projects, research and personal experiments.')}</p>
          </div>
          <div className="venus-hub-archive-grid">
            {archive.map((item) => (
              <a key={item.number} className="venus-hub-archive-item" href={item.href}
                {...(isExternal(item.href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                <div className="venus-hub-archive-photo">
                  <img src={item.image} alt={item.imageAlt} loading="lazy" decoding="async" />
                </div>
                <div className="venus-hub-archive-copy">
                  <span className="venus-hub-archive-item-number">{item.number}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description[en ? 1 : 0]}</p>
                </div>
                <span className="venus-hub-archive-arrow" aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer className="venus-hub-footer">
        <span>bir zambak gibi, yavaşça</span>
        <div>
          <a href="mailto:s.cagatay.sonmez@gmail.com">E-mail</a>
          <a href="https://github.com/Cugutayy" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="#top">{words('Yukarı', 'Back to top')} ↑</a>
        </div>
      </footer>
    </div>
  )
}
