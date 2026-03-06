interface Props { t: (k: string) => string }

export function PortfolioCard({ t }: Props) {
  return (
    <a href="/tracker/" style={{
      gridColumn:'1/-1', display:'block', border:'1px solid var(--card-border)',
      borderRadius:14, padding:'24px 28px', background:'var(--card-bg)', cursor:'pointer',
      transition:'box-shadow .4s ease, transform .35s cubic-bezier(.16,1,.3,1), background .3s, border-color .3s',
      textDecoration:'none', color:'inherit'
    }}
    onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 28px var(--shadow)' }}
    onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}
    >
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div>
          <span className="mono" style={{ fontSize:'.65rem', color:'var(--accent)' }}>01</span>
          <h3 style={{ fontSize:'1.25rem', fontWeight:400, marginTop:4 }}>Portfolio Tracker</h3>
          <p style={{ color:'var(--muted)', marginTop:5, lineHeight:1.5, fontSize:'.88rem', maxWidth:520 }}>{t('p1d')}</p>
        </div>
        <div style={{ flexShrink:0, marginLeft:16, width:32, height:32, borderRadius:'50%', border:'1px solid var(--rule)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="13" height="13" fill="none" stroke="var(--muted)" viewBox="0 0 24 24" style={{ transform:'rotate(-45deg)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 12h14m-7-7l7 7-7 7"/></svg>
        </div>
      </div>

      {/* Mini Dashboard */}
      <div style={{ marginTop:12, border:'1px solid var(--dash-border)', borderRadius:10, padding:'12px 14px', background:'var(--dash-bg)', transition:'background .3s, border-color .3s' }}>
        <div style={{ display:'flex', gap:16, marginBottom:8, flexWrap:'wrap' }}>
          <div><div className="mono" style={{ fontSize:'.52rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em' }}>{t('pf')}</div><div className="mono" style={{ fontSize:'.82rem', fontWeight:500 }}>101.019 ₺</div></div>
          <div><div className="mono" style={{ fontSize:'.52rem', color:'var(--muted)', textTransform:'uppercase' }}>K/Z</div><div className="mono" style={{ fontSize:'.82rem', fontWeight:500, color:'var(--green-t)' }}>+1.019 ₺</div></div>
          <div><div className="mono" style={{ fontSize:'.52rem', color:'var(--muted)', textTransform:'uppercase' }}>{t('ch')}</div><div className="mono" style={{ fontSize:'.82rem', fontWeight:500, color:'var(--green-t)' }}>+1.02%</div></div>
        </div>
        <svg style={{ width:'100%', height:48, display:'block', marginBottom:5 }} viewBox="0 0 400 70" preserveAspectRatio="none">
          <defs><linearGradient id="cf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a472a" stopOpacity=".12"/><stop offset="100%" stopColor="#1a472a" stopOpacity=".01"/></linearGradient></defs>
          <path d="M0,35 L31,37 L62,42 L93,46 L124,44 L155,46 L186,47 L217,53 L248,51 L279,50 L310,55 L341,38 L372,33 L400,34 L400,70 L0,70Z" fill="url(#cf)"/>
          <polyline points="0,35 31,37 62,42 93,46 124,44 155,46 186,47 217,53 248,51 279,50 310,55 341,38 372,33 400,34" fill="none" stroke="#1a472a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="0" cy="35" r="2.5" fill="#1a472a" opacity=".4"/><circle cx="400" cy="34" r="2.5" fill="#1a472a"/>
          <line x1="0" y1="35" x2="400" y2="35" stroke="var(--accent)" strokeWidth="1" strokeDasharray="4,4" opacity=".25"/>
        </svg>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div className="mono" style={{ fontSize:'.52rem', color:'var(--muted)', display:'flex', alignItems:'center', gap:3 }}>
            <span style={{ display:'inline-block', width:5, height:5, borderRadius:'50%', background:'#e67e22' }}/>BTC 40%
            <span style={{ display:'inline-block', width:5, height:5, borderRadius:'50%', background:'#c0392b', marginLeft:8 }}/>THYAO
            <span style={{ display:'inline-block', width:5, height:5, borderRadius:'50%', background:'#c9a84c', marginLeft:8 }}/>{t('gd')}
            <span style={{ display:'inline-block', width:5, height:5, borderRadius:'50%', background:'#1d4ed8', marginLeft:8 }}/>+4
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', animation:'pd 2s ease-in-out infinite', display:'inline-block' }}/>
            <span className="mono" style={{ fontSize:'.65rem', color:'var(--green-t)' }}>{t('lv')}</span>
          </div>
        </div>
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:12 }}>
        {[t('tF'), t('tA'), 'Cloudflare', 'Chart.js'].map(tag => (
          <span key={tag} className="mono" style={{ fontSize:'.58rem', letterSpacing:'.06em', textTransform:'uppercase', padding:'2px 8px', borderRadius:99, border:'1px solid var(--rule)', color:'var(--muted)' }}>{tag}</span>
        ))}
      </div>
    </a>
  )
}
