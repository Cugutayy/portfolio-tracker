import { LockKeyhole } from 'lucide-react'
import { useLayoutEffect, useRef } from 'react'
import { fitVenusArtwork } from './venus-artwork'
import { projects, type Caption, type GalleryProject } from './venus-projects'
import '../styles/venus-gallery.css'

type Props = { lang: string; setLang: (language: string) => void }
type Locale = 0 | 1

const painting = '/hub/gallery/venus'
const imageCredit = 'https://commons.wikimedia.org/wiki/File:Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg'

function GalleryCard({ project, locale, number }: { project: GalleryProject; locale: Locale; number: number }) {
  const title = typeof project.title === 'string' ? project.title : project.title[locale]
  const access = project.href.startsWith('mailto:')
  const accessLabel = locale ? 'Request access' : 'Erişim iste'

  return (
    <a
      className={project.image ? 'vv-work vv-work--photograph' : 'vv-work'}
      id={project.anchor}
      href={project.href}
      aria-label={access ? `${title} · ${accessLabel}` : undefined}
    >
      {project.image && (
        <img className="vv-work-image" data-fit={project.fit} src={project.image} alt="" loading="lazy" decoding="async" />
      )}
      <span className="vv-work-number" aria-hidden="true">{String(number).padStart(2, '0')}</span>
      {access && <LockKeyhole className="vv-work-lock" size={14} strokeWidth={1.6} aria-hidden="true" />}
      <span className="vv-work-title">{title}</span>
    </a>
  )
}

export function VenusGallery({ lang, setLang }: Props) {
  const locale: Locale = lang === 'en' ? 1 : 0
  const t = (...copy: Caption) => copy[locale]
  const artTitle = t('Venüs’ün Doğuşu', 'The Birth of Venus')
  const artwork = useRef<HTMLImageElement>(null)
  const artworkCanvas = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    if (artwork.current && artworkCanvas.current) {
      return fitVenusArtwork(artwork.current, artworkCanvas.current)
    }
  }, [])

  useLayoutEffect(() => {
    const id = window.location.hash.slice(1)
    if (id === 'featured' || projects.some(project => project.anchor === id)) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'instant' })
    }
  }, [])

  return (
    <div className="venus-hub" id="top">
      <header className="vv-hero">
        <picture className="vv-art">
          <source media="(min-width: 1024px)" srcSet={painting + '-8k.webp'} type="image/webp" width={7680} height={4823} />
          <img ref={artwork} src={painting + '-mobile.webp'} alt={artTitle + ' — Sandro Botticelli'} width={2250} height={1413} fetchPriority="high" />
        </picture>
        <canvas ref={artworkCanvas} className="vv-art-adjustment" aria-hidden="true" hidden />
        <div className="vv-header-inner">
          <a href="#top" className="vv-brand" aria-label={t('SNMEZ, başa dön', 'SNMEZ, back to top')}>SNMEZ</a>
          <nav className="vv-nav" aria-label={t('Ana menü', 'Main navigation')}>
            <div className="vv-language" role="group" aria-label={t('Dil', 'Language')}>
              <button type="button" lang="tr" onClick={() => setLang('tr')} aria-pressed={locale === 0}>TR</button>
              <button type="button" lang="en" onClick={() => setLang('en')} aria-pressed={locale === 1}>EN</button>
            </div>
            <a href="#featured">{t('Projeler', 'Projects')}</a>
            <a href="mailto:s.cagatay.sonmez@gmail.com">{t('İletişim', 'Contact')}</a>
          </nav>
        </div>
      </header>

      <main className="vv-exhibition" id="featured">
        <div className="vv-shell">
          <section className="vv-section" aria-labelledby="vv-title">
            <h1 id="vv-title">{t('Projeler', 'Projects')}</h1>
            <div className="vv-grid">
              {projects.map((project, index) => (
                <GalleryCard project={project} locale={locale} key={project.href} number={index + 1} />
              ))}
            </div>
          </section>

          <footer className="vv-footer">
            <span>SNMEZ</span>
            <div>
              <a href={painting + '-8k-detail.webp'} target="_blank" rel="noreferrer">{t('8K tablo', '8K artwork')}</a>
              <a href={imageCredit}>{t('Tablo kaynağı', 'Artwork source')}</a>
              <a href="https://github.com/Cugutayy">GitHub</a>
              <a href="#top">{t('Başa dön', 'Back to top')}</a>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}
