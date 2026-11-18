import { ArrowDown, ArrowRight, ArrowUpRight, LockKeyhole } from 'lucide-react'
import { rooms, type Caption, type GalleryProject } from './venus-projects'
import '../styles/venus-gallery.css'

type Props = { lang: string; setLang: (language: string) => void }
type Locale = 0 | 1

const painting = '/hub/gallery/venus'
const imageCredit = 'https://commons.wikimedia.org/wiki/File:Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg'

function GalleryCard({ project, locale, lead }: { project: GalleryProject; locale: Locale; lead?: boolean }) {
  const title = typeof project.title === 'string' ? project.title : project.title[locale]
  const access = project.href.startsWith('mailto:')
  const Action = access ? LockKeyhole : project.href.startsWith('https://') ? ArrowUpRight : ArrowRight

  return (
    <a
      className={['vv-work', lead && 'vv-showcase', project.image && 'vv-work--illustrated'].filter(Boolean).join(' ')}
      href={project.href}
    >
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
          {(access || lead) && <span>{access ? (locale ? 'Request access' : 'Erişim iste') : (locale ? 'Open the 3D model' : '3B modeli aç')}</span>}
          <Action size={lead ? 21 : 17} strokeWidth={1.5} aria-hidden="true" />
        </div>
      </div>
    </a>
  )
}

export function VenusGallery({ lang, setLang }: Props) {
  const locale: Locale = lang === 'en' ? 1 : 0
  const t = (...copy: Caption) => copy[locale]
  const artTitle = t('Venüs’ün Doğuşu', 'The Birth of Venus')

  return (
    <div className="venus-hub" id="top">
      <picture className="vv-art">
        <source media="(max-width: 800px) and (orientation: portrait)" srcSet={painting + '-portrait.webp'} type="image/webp" />
        <source media="(min-width: 1024px)" srcSet={painting + '-8k.webp'} type="image/webp" />
        <img src={painting + '-mobile.webp'} alt={artTitle + ' — Sandro Botticelli'} fetchPriority="high" />
      </picture>

      <header className="vv-hero" aria-labelledby="vv-title">
        <div className="vv-shell vv-hero-inner">
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

          <div className="vv-hero-copy">
            <h1 id="vv-title">Hub</h1>
            <p className="vv-intro">{t('Projeler, araştırmalar ve deneyler.', 'Projects, research and experiments.')}</p>
          </div>

          <div className="vv-hero-foot">
            <a className="vv-enter" href="#featured">
              <span className="vv-enter-arrow"><ArrowDown size={20} strokeWidth={1.35} aria-hidden="true" /></span>
              {t('Projeleri keşfet', 'Explore projects')}
            </a>
            <div className="vv-credit">
              <span>Sandro Botticelli <i>{artTitle}</i></span>
              <a href={painting + '-8k-detail.webp'} target="_blank" rel="noreferrer" aria-label={t('Tabloyu 8K çözünürlükte aç', 'Open the artwork in 8K')}>
                8K <ArrowUpRight size={12} strokeWidth={1.6} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="vv-exhibition">
        <div className="vv-shell">
          {rooms.map((room, roomIndex) => (
            <section id={room.id} className={'vv-section' + (roomIndex === 0 ? ' vv-section--lead' : '')} key={room.id} aria-labelledby={'vv-heading-' + room.id}>
              <header className="vv-section-header">
                <h2 id={'vv-heading-' + room.id}>{room.title[locale]}</h2>
                {roomIndex === 0 && (
                  <nav className="vv-index" aria-label={t('Proje bölümleri', 'Project sections')}>
                    {rooms.slice(1).map((item) => <a href={'#' + item.id} key={item.id}>{item.title[locale]}</a>)}
                  </nav>
                )}
              </header>
              <div className={'vv-grid vv-grid--' + room.id}>
                {room.projects.map((project, index) => (
                  <GalleryCard project={project} locale={locale} key={project.href} lead={roomIndex === 0 && index === 0} />
                ))}
              </div>
            </section>
          ))}

          <footer className="vv-footer">
            <span>SNMEZ</span>
            <div>
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
