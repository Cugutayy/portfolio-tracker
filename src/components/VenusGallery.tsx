import { useEffect, useRef } from 'react'
import '../styles/venus-gallery.css'
import '../styles/renaissance-preview.css'
import '../styles/fullscreen-gallery-preview.css'

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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const stageRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    const stage = stageRef.current
    if (!canvas || !image || !stage) return

    // Extend only the painting's own outermost pixels, not the central figures.
    // The complete source is uniformly scaled so Venus matches the approved distance.
    const draw = () => {
      const width = stage.clientWidth
      const height = stage.clientHeight
      if (!image.naturalWidth || !image.naturalHeight || width <= 720 || !height) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      const ctx = canvas.getContext('2d', { alpha: false })
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      const sw = image.naturalWidth
      const sh = image.naturalHeight
      const paintingHeight = Math.min(height * .855, width * .99 / (sw / sh))
      const paintingWidth = paintingHeight * sw / sh
      const x = (width - paintingWidth) / 2
      const y = 0
      const right = width - x - paintingWidth
      const bottom = height - paintingHeight
      const bandX = Math.max(1, Math.floor(sw * .10))
      const bandY = Math.max(1, Math.floor(sh * .12))

      // Fallback underlay also fills the four narrow corners.
      ctx.drawImage(image, 0, 0, width, height)

      // Mirror the genuine outer strips so the painting fills the viewport
      // without zooming in on the central composition.
      if (x > 0) {
        ctx.save()
        ctx.translate(x, 0)
        ctx.scale(-1, 1)
        ctx.drawImage(image, 0, 0, bandX, sh, 0, y, x, paintingHeight)
        ctx.restore()
      }
      if (right > 0) {
        ctx.save()
        ctx.translate(width, 0)
        ctx.scale(-1, 1)
        ctx.drawImage(image, sw - bandX, 0, bandX, sh, 0, y, right, paintingHeight)
        ctx.restore()
      }
      if (bottom > 0) {
        ctx.save()
        ctx.translate(0, height)
        ctx.scale(1, -1)
        ctx.drawImage(image, 0, sh - bandY, sw, bandY, x, 0, paintingWidth, bottom)
        ctx.restore()
      }
      // The complete, unaltered masterpiece stays sharp in the center.
      ctx.drawImage(image, 0, 0, sw, sh, x, y, paintingWidth, paintingHeight)
      canvas.style.opacity = '1'
    }

    image.addEventListener('load', draw)
    if (image.complete) draw()
    const resizeObserver = new ResizeObserver(draw)
    resizeObserver.observe(stage)
    return () => {
      image.removeEventListener('load', draw)
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <div className="venus-hub">
      <main>
        <section ref={stageRef} className="vv-stage" id="top" aria-label="Sandro Botticelli — Venüs’ün Doğuşu, tam ekran sanat eseri">
          <div className="vv-painting" aria-hidden="true">
            <img
              ref={imageRef}
              className="vv-painting-original"
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/The_Birth_of_Venus_%28Botticelli%29_1.jpg/3840px-The_Birth_of_Venus_%28Botticelli%29_1.jpg"
              srcSet="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/The_Birth_of_Venus_%28Botticelli%29_1.jpg/3840px-The_Birth_of_Venus_%28Botticelli%29_1.jpg 3840w, https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/The_Birth_of_Venus_%28Botticelli%29_1.jpg/7680px-The_Birth_of_Venus_%28Botticelli%29_1.jpg 7680w"
              sizes="100vw"
              width="9360"
              height="5581"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              alt=""
              onError={(event) => {
                const image = event.currentTarget
                if (image.dataset.fallback) return
                image.dataset.fallback = 'local'
                image.srcSet = ''
                image.src = '/x/venus-4k.jpg'
              }}
            />
            <canvas ref={canvasRef} className="vv-painting-canvas" aria-hidden="true" />
          </div>
          <div className="vv-painting-shade" aria-hidden="true" />

          <nav className="vv-nav" aria-label="Main navigation">
            <a href="#top" className="vv-brand" aria-label="SNMEZ — başa dön">SNMEZ</a>
            <div className="vv-nav-links">
              <a href="#featured">WORKS</a>
              <a href="https://journeynotess.com/" target="_blank" rel="noreferrer">NOTES</a>
              <a href="mailto:s.cagatay.sonmez@gmail.com">ABOUT</a>
              <div className="vv-language" aria-label="Language selection">
                <button type="button" className={lang === 'tr' ? 'is-active' : ''} onClick={() => setLang('tr')} aria-pressed={lang === 'tr'}>TR</button>
                <button type="button" className={lang === 'en' ? 'is-active' : ''} onClick={() => setLang('en')} aria-pressed={lang === 'en'}>EN</button>
              </div>
            </div>
          </nav>


        </section>

        <section className="vv-collections" aria-label="Seçilmiş projeler ve araştırmalar">
          <div className="vv-collections-inner">
            <header className="vv-collection-heading">
              <span className="vv-kicker">SNMEZ / {tr ? 'SEÇİLMİŞ ÇALIŞMALAR' : 'SELECTED WORKS'} / 01—08</span>
              <h2>{tr ? 'Seçilmiş Çalışmalar' : 'Selected Works'}</h2>
              <p>{tr ? 'Projeler, araştırmalar ve deneyler.' : 'Projects, research and experiments.'}</p>
            </header>
          <div className="vv-featured" id="featured" aria-label="Selected works">
            {featured.map(item => (
              <a key={item.no} className="vv-feature" href={item.href}>
                <span className="vv-feature-number">{item.no}</span>
                <h2>{item.name}</h2>
                <span className="vv-feature-description">{tr ? item.description : item.en}</span><span className="vv-feature-linkmark" aria-hidden="true">↗</span>
              </a>
            ))}
          </div>

          <div className="vv-research" aria-label="Research and development">
            <h2>{tr ? 'Araştırmalar & Geliştirme' : 'Research & Development'}</h2>
            <div className="vv-research-items">
              {research.map(item => (
                <a href={item.href} key={item.title} className="vv-research-item">
                  <span className="vv-research-image"><img src={item.image} alt="" loading="lazy" /></span>
                  <span className="vv-research-copy"><strong>{item.title}</strong><small>{tr ? item.description : item.en}</small><span className="vv-research-linkmark" aria-hidden="true">↗</span></span>
                </a>
              ))}
            </div>
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
