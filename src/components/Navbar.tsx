import { Moon, Sun } from './Icons'

interface Props {
  lang: string
  setLang: (l: string) => void
  dark: boolean
  setDark: (d: boolean) => void
  t: (k: string) => string
}

export function Navbar({ lang, setLang, dark, setDark, t }: Props) {
  const langs: [string, string, JSX.Element][] = [
    ['tr', 'Türkçe', <svg key="tr" viewBox="0 0 1200 800"><rect fill="#E30A17" width="1200" height="800"/><circle fill="#fff" cx="480" cy="400" r="200"/><circle fill="#E30A17" cx="530" cy="400" r="160"/><polygon fill="#fff" points="600,400 667,430 650,360 700,310 630,310 600,260 570,310 500,310 550,360 533,430"/></svg>],
    ['en', 'English', <svg key="en" viewBox="0 0 60 30"><clipPath id="s"><rect width="60" height="30"/></clipPath><g clipPath="url(#s)"><rect width="60" height="30" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/><path d="M30,0V30M0,15H60" stroke="#fff" strokeWidth="10"/><path d="M30,0V30M0,15H60" stroke="#C8102E" strokeWidth="6"/></g></svg>],
    ['zh', '中文', <svg key="zh" viewBox="0 0 900 600"><rect fill="#EE1C25" width="900" height="600"/><g fill="#FF0" transform="translate(150,120)"><polygon points="0,-60 17,-18 58,-18 25,7 36,49 0,24 -36,49 -25,7 -58,-18 -17,-18"/></g><g fill="#FF0" transform="translate(300,60)"><polygon points="0,-20 6,-6 19,-6 8,2 12,16 0,8 -12,16 -8,2 -19,-6 -6,-6"/></g><g fill="#FF0" transform="translate(360,120)"><polygon points="0,-20 6,-6 19,-6 8,2 12,16 0,8 -12,16 -8,2 -19,-6 -6,-6"/></g><g fill="#FF0" transform="translate(360,210)"><polygon points="0,-20 6,-6 19,-6 8,2 12,16 0,8 -12,16 -8,2 -19,-6 -6,-6"/></g><g fill="#FF0" transform="translate(300,270)"><polygon points="0,-20 6,-6 19,-6 8,2 12,16 0,8 -12,16 -8,2 -19,-6 -6,-6"/></g></svg>],
  ]

  return (
    <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:50, background:'var(--nav-bg)', backdropFilter:'blur(16px)', borderBottom:'1px solid var(--rule)' }}>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 28px', height:48, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:28 }}>
          <a href="/" className="logo-mark" style={{ marginRight:8 }}>cs</a>
          <a href="#projects" className="link-ed mono" style={{ fontSize:'.65rem', color:'var(--muted)', letterSpacing:'.04em' }}>{t('navP')}</a>
          <a href="mailto:s.cagatay.sonmez@gmail.com" className="link-ed mono" style={{ fontSize:'.65rem', color:'var(--muted)', letterSpacing:'.04em' }}>{t('navC')}</a>
          <a href="https://github.com/Cugutayy" target="_blank" className="link-ed mono" style={{ fontSize:'.65rem', color:'var(--muted)', letterSpacing:'.04em' }}>github</a>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          {langs.map(([code, title, flag]) => (
            <button
              key={code}
              onClick={() => setLang(code)}
              title={title}
              style={{
                background:'none', border:'1px solid var(--rule)', borderRadius:5,
                width:30, height:22, cursor:'pointer', padding:0, overflow:'hidden',
                display:'flex', alignItems:'center', justifyContent:'center',
                opacity: lang === code ? 1 : 0.5,
                borderColor: lang === code ? 'var(--accent)' : 'var(--rule)',
                transition:'all .2s'
              }}
            >
              <span style={{ width:20, height:14, display:'block' }}>{flag}</span>
            </button>
          ))}
          {/* Theme Toggle */}
          <div
            onClick={() => setDark(!dark)}
            style={{
              width:52, height:26, padding:3, borderRadius:99, cursor:'pointer',
              border:'1px solid var(--rule)', background:'var(--bg)',
              transition:'all .3s', marginLeft:4, position:'relative',
              display:'flex', alignItems:'center'
            }}
            title="Dark/Light"
          >
            <div style={{
              width:18, height:18, borderRadius:'50%',
              transition:'all .3s cubic-bezier(.16,1,.3,1)',
              display:'flex', alignItems:'center', justifyContent:'center',
              position:'absolute', left:3,
              transform: dark ? 'translateX(26px)' : 'translateX(0)',
              background: dark ? '#252420' : '#e8e4dc',
              pointerEvents:'none'
            }}>
              {dark ? <Sun size={11} color="#fbbf24" /> : <Moon size={11} color="#8a8578" />}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
