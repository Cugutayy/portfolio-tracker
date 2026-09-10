import { Moon, Sun } from './Icons'

interface Props {
  lang: string
  setLang: (l: string) => void
  dark: boolean
  setDark: (d: boolean) => void
  t: (k: string) => string
}

/** Thin masthead strip — hairline border, mono links, plain-text language pills. */
export function Navbar({ lang, setLang, dark, setDark, t }: Props) {
  const langs: [string, string][] = [['tr', 'TR'], ['en', 'EN'], ['zh', '中文']]

  return (
    <nav
      className="hub-nav"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'transparent', backdropFilter: 'none', WebkitBackdropFilter: 'none',
      }}
    >
      <div className="nav-inner" style={{ maxWidth: 1200, margin: '0 auto', height: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="nav-links">
          <a href="/" className="logo-mark hub-nav-brand" style={{ marginRight: 6 }}>cs</a>
          <a href="#projects" className="link-ed mono hub-nav-link" style={{ fontSize: '.66rem', letterSpacing: '.12em', textTransform: 'uppercase' }}>{t('navP')}</a>
          <a href="mailto:s.cagatay.sonmez@gmail.com" className="link-ed mono nav-hide-sm hub-nav-link" style={{ fontSize: '.66rem', letterSpacing: '.12em', textTransform: 'uppercase' }}>{t('navC')}</a>
          <a href="https://github.com/Cugutayy" target="_blank" rel="noreferrer" lang="en" className="link-ed mono nav-hide-sm hub-nav-link" style={{ fontSize: '.66rem', letterSpacing: '.12em', textTransform: 'uppercase' }}>github</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {langs.map(([code, label]) => (
            <button
              key={code}
              onClick={() => setLang(code)}
              className="mono hub-lang"
              aria-pressed={lang === code}
              style={{
                background: 'transparent',
                border: 0,
                color: lang === code ? '#f0cf86' : 'rgba(255,250,242,.82)',
                fontSize: '.59rem',
                fontWeight: 500,
                letterSpacing: '.09em',
                padding: '5px 6px',
                cursor: 'pointer',
                opacity: lang === code ? 1 : 0.74,
              }}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDark(!dark)}
            className="hub-theme-button"
            aria-label={dark ? 'Açık temaya geç' : 'Koyu temaya geç'}
            title="Dark/Light"
          >
            {dark ? <Sun size={14} color="#f0cf86" /> : <Moon size={14} color="#fffaf2" />}
          </button>
        </div>
      </div>
    </nav>
  )
}
