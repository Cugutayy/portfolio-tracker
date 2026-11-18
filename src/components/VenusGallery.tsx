import { ArrowRight, ArrowUpRight, LockKeyhole } from 'lucide-react'
import { useLayoutEffect } from 'react'
import { rooms, type Caption, type GalleryProject } from './venus-projects'
import '../styles/venus-gallery.css'

type Props = { lang: string; setLang: (language: string) => void }
type Locale = 0 | 1

const painting = '/hub/gallery/venus'
const imageCredit = 'https://commons.wikimedia.org/wiki/File:Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg'

function GalleryCard({ project, locale, id }: { project: GalleryProject; locale: Locale; id?: string }) {
  const title = typeof project.title === 'string' ? project.title : project.title[locale]
  const access = project.href.startsWith('mailto:')
  const isModel = project.href === '/ege-edebiyat/'
  const Action = access ? LockKeyhole : project.href.startsWith('https://') ? ArrowUpRight : ArrowRight

  return (
    <a className="vv-work" id={id} href={project.href}>
      {project.image && (
        <div className="vv-work-image">
          <img src={project.image} alt="" loading="lazy" decoding="async" />
        </div>
      )}
      <div className="vv-work-content">
        <p className="vv-field">{project.field[locale]}</p>
        <h3>{title}</h3>
        <p className="vv-description">{project.description[locale]}</p>
        {project.notes && (
          <ul className="vv-notes">
            {project.notes.map((note) => <li key={note[0]}>{note[locale]}</li>)}
          </ul>
        )}
        <div className="vv-work-action">
          {isModel && <span>{locale ? 'Open the 3D model' : '3B modeli aç'}</span>}
          {access && <span>{locale ? 'Request access' : 'Erişim iste'}</span>}
          <Action size={16} strokeWidth={1.5} aria-hidden="true" />
        </div>
      </div>
    </a>
  )
}

export function VenusGallery({ lang, setLang }: Props) {
  const locale: Locale = lang === 'en' ? 1 : 0
  const t = (...copy: Caption) => copy[locale]
  const artTitle = t('Venüs’ün Doğuşu', 'The Birth of Venus')

  useLayoutEffect(() => {
    const id = window.location.hash.slice(1)
    if (rooms.some(room => room.id === id)) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'instant' })
    }
  }, [])

  return (
    <div className="venus-hub" id="top">
      <header className="vv-hero">
        <picture className="vv-art">
          <source media="(min-width: 1024px)" srcSet={painting + '-8k.webp'} type="image/webp" />
          <img src={painting + '-mobile.webp'} alt={artTitle + ' — Sandro Botticelli'} width={2250} height={1413} fetchPriority="high" />
        </picture>
      </header>

      <main className="vv-exhibition" id="featured">
        <div className="vv-shell">
          <div className="vv-header-inner">
            <a href="#top" className="vv-brand" aria-label={t('SNMEZ, başa dön', 'SNMEZ, back to top')}>SNMEZ</a>
            <nav className="vv-nav" aria-label={t('Ana menü', 'Main navigation')}>
              <a href="#featured">{t('Projeler', 'Projects')}</a>
              <a href="https://journeynotess.com/">{t('Notlar', 'Notes')}</a>
              <a href="mailto:s.cagatay.sonmez@gmail.com">{t('İletişim', 'Contact')}</a>
              <div className="vv-language" aria-label={t('Dil', 'Language')}>
                <button type="button" lang="tr" onClick={() => setLang('tr')} aria-pressed={locale === 0}>TR</button>
                <button type="button" lang="en" onClick={() => setLang('en')} aria-pressed={locale === 1}>EN</button>
              </div>
            </nav>
          </div>

          <section className="vv-section" aria-labelledby="vv-title">
            <header className="vv-section-header">
              <h1 id="vv-title">{t('Projeler', 'Projects')}</h1>
              <nav className="vv-index" aria-label={t('Proje bölümleri', 'Project sections')}>
                {rooms.slice(1).map((room) => <a href={'#' + room.id} key={room.id}>{room.title[locale]}</a>)}
              </nav>
            </header>
            <div className="vv-grid">
              {rooms.flatMap((room, roomIndex) => room.projects.map((project, projectIndex) => (
                <GalleryCard
                  project={project}
                  locale={locale}
                  key={project.href}
                  id={roomIndex > 0 && projectIndex === 0 ? room.id : undefined}
                />
              )))}
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
