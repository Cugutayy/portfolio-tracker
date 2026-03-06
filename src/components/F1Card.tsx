interface Props { t: (k: string) => string }

const TRACK_PATH = "M40,80 C40,30 80,15 140,15 C200,15 220,45 260,45 C300,45 340,20 360,50 C380,80 350,90 300,85 C250,80 200,90 140,90 C80,90 40,130 40,80 Z"

export function F1Card({ t }: Props) {
  return (
    <a href="https://github.com/Cugutayy/F1test" target="_blank" rel="noopener" style={{
      display:'block', border:'1px solid var(--card-border)', borderRadius:14,
      padding:'24px 28px', background:'var(--card-bg)', cursor:'pointer',
      transition:'box-shadow .4s ease, transform .35s cubic-bezier(.16,1,.3,1), background .3s, border-color .3s',
      textDecoration:'none', color:'inherit'
    }}
    onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 28px var(--shadow)' }}
    onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}
    >
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div>
          <span className="mono" style={{ fontSize:'.65rem', color:'var(--accent)' }}>02</span>
          <h3 style={{ fontSize:'1.25rem', fontWeight:400, marginTop:4 }}>{t('p2t')}</h3>
          <p style={{ color:'var(--muted)', marginTop:5, lineHeight:1.5, fontSize:'.88rem' }}>{t('p2d')}</p>
        </div>
        <div style={{ flexShrink:0, marginLeft:16, width:32, height:32, borderRadius:'50%', border:'1px solid var(--rule)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="13" height="13" fill="none" stroke="var(--muted)" viewBox="0 0 24 24" style={{ transform:'rotate(-45deg)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 12h14m-7-7l7 7-7 7"/></svg>
        </div>
      </div>

      {/* F1 Track Animation */}
      <div style={{ marginTop:12, border:'1px solid var(--dash-border)', borderRadius:10, padding:'12px 14px', background:'var(--dash-bg)', transition:'background .3s, border-color .3s' }}>
        <svg style={{ width:'100%', height:80, display:'block' }} viewBox="0 0 400 100" preserveAspectRatio="xMidYMid meet">
          <path d={TRACK_PATH} fill="none" stroke="var(--rule)" strokeWidth="12" strokeLinecap="round"/>
          <path d={TRACK_PATH} fill="none" stroke="var(--dash-border)" strokeWidth="1" strokeDasharray="4,6"/>
          <circle r="4" fill="#c9543a"><animateMotion dur="4s" repeatCount="indefinite" path={TRACK_PATH}/></circle>
          <circle r="3.5" fill="#3b82f6"><animateMotion dur="4.3s" repeatCount="indefinite" path={TRACK_PATH} begin="0.6s"/></circle>
          <circle r="3" fill="#f59e0b"><animateMotion dur="4.6s" repeatCount="indefinite" path={TRACK_PATH} begin="1.2s"/></circle>
        </svg>
        <div style={{ display:'flex', gap:12, marginTop:6, flexWrap:'wrap' }}>
          {['GradientBoosting', 'FastF1 API', `22 ${t('drivers')}`].map(s => (
            <span key={s} className="mono" style={{ fontSize:'.55rem', color:'var(--muted)', background:'var(--bg)', border:'1px solid var(--rule)', padding:'2px 8px', borderRadius:6 }}>{s}</span>
          ))}
        </div>
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:16 }}>
        {['Python', 'scikit-learn', 'FastF1', 'ML'].map(tag => (
          <span key={tag} className="mono" style={{ fontSize:'.58rem', letterSpacing:'.06em', textTransform:'uppercase', padding:'2px 8px', borderRadius:99, border:'1px solid var(--rule)', color:'var(--muted)' }}>{tag}</span>
        ))}
      </div>
    </a>
  )
}
