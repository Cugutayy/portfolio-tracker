import { PortfolioCard } from './PortfolioCard'
import { F1Card } from './F1Card'

interface Props { t: (k: string) => string }

export function ProjectCards({ t }: Props) {
  return (
    <section id="projects" className="container" style={{ padding:'48px 0 56px' }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:32 }}>
        <h2 style={{ fontSize:'1.4rem', fontWeight:300 }}>{t('secP')}</h2>
        <span className="mono" style={{ fontSize:'.7rem', color:'var(--muted)' }}>{t('pCnt')}</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <PortfolioCard t={t} />
        <F1Card t={t} />
        {/* Placeholder 03 */}
        <div style={{
          border:'1px dashed var(--card-border)', borderRadius:14, padding:'24px 28px',
          background:'var(--bg)', opacity:.7
        }}>
          <span className="mono" style={{ fontSize:'.65rem', color:'var(--accent)' }}>03</span>
          <h3 style={{ fontSize:'1.25rem', fontWeight:400, marginTop:4, color:'var(--muted)', opacity:.4 }}>{t('cs')}</h3>
          <p style={{ color:'var(--muted)', opacity:.4, marginTop:5, fontSize:'.88rem' }}>{t('csd')}</p>
          <div style={{ marginTop:12 }}>
            <span className="mono" style={{ fontSize:'.58rem', padding:'2px 8px', borderRadius:99, border:'1px solid var(--rule)', color:'var(--muted)', opacity:.35 }}>{t('tba')}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
