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
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'var(--nav-bg)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--rule)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <a href="/" className="logo-mark" style={{ marginRight: 6 }}>cs</a>
          <a href="#projects" className="link-ed mono" style={{ fontSize: '.62rem', color: 'var(--muted)', letterSpacing: '.12em', textTransform: 'uppercase' }}>{t('navP')}</a>
          <a href="mailto:s.cagatay.sonmez@gmail.com" className="link-ed mono" style={{ fontSize: '.62rem', color: 'var(--muted)', letterSpacing: '.12em', textTransform: 'uppercase' }}>{t('navC')}</a>
          <a href="https://github.com/Cugutayy" target="_blank" lang="en" className="link-ed mono" style={{ fontSize: '.62rem', color: 'var(--muted)', letterSpacing: '.12em', textTransform: 'uppercase' }}>github</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {langs.map(([code, label]) => (
            <button
              key={code}
              onClick={() => setLang(code)}
              className="mono"
              style={{
                background: 'none',
                border: '1px solid',
                borderColor: lang === code ? 'var(--accent)' : 'var(--rule)',
                color: lang === code ? 'var(--accent)' : 'var(--muted)',
                fontSize: '.56rem',
                letterSpacing: '.1em',
                padding: '3px 8px',
                cursor: 'pointer',
                opacity: lang === code ? 1 : 0.65,
                transition: 'all .2s',
              }}
            >
              {label}
            </button>
          ))}
          {/* Theme toggle */}
          <div
            onClick={() => setDark(!dark)}
            style={{
              width: 52, height: 26, padding: 3, borderRadius: 99, cursor: 'pointer',
              border: '1px solid var(--rule)', background: 'var(--bg)',
              transition: 'all .3s', marginLeft: 6, position: 'relative',
              display: 'flex', alignItems: 'center',
            }}
            title="Dark/Light"
          >
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              transition: 'all .3s cubic-bezier(.16,1,.3,1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'absolute', left: 3,
              transform: dark ? 'translateX(26px)' : 'translateX(0)',
              background: dark ? '#252420' : '#e8e4dc',
              pointerEvents: 'none',
            }}>
              {dark ? <Sun size={11} color="#fbbf24" /> : <Moon size={11} color="#8a8578" />}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
