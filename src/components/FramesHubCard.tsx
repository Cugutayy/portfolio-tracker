import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Injects the Frames visual-journal project into the hub's existing editorial
 * project grid without coupling the standalone /frames/ prototype to App routing.
 */
export function FramesHubCard() {
  const [target, setTarget] = useState<Element | null>(null)

  useEffect(() => {
    const findGrid = () => {
      const grid = document.querySelector('.ed-grid')
      if (grid) setTarget(grid)
      return Boolean(grid)
    }

    if (findGrid()) return

    const observer = new MutationObserver(() => {
      if (findGrid()) observer.disconnect()
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  if (!target) return null

  return createPortal(
    <>
      <style>{`
        .frames-hub-card .frames-strip {
          display:grid;
          grid-template-columns:1.5fr .75fr .75fr;
          gap:5px;
          height:86px;
          margin:13px 0 12px;
          overflow:hidden;
          background:var(--rule);
        }
        .frames-hub-card .frames-shot {
          min-width:0;
          background-size:cover;
          background-position:center;
          transition:transform .65s cubic-bezier(.16,1,.3,1), filter .45s ease;
          filter:saturate(.88) contrast(1.03);
        }
        .frames-hub-card:hover .frames-shot { transform:scale(1.035); filter:saturate(1) contrast(1.04); }
        .frames-hub-card .frames-shot:nth-child(1) { background-image:url('/lily.jpg'); background-position:center 38%; }
        .frames-hub-card .frames-shot:nth-child(2) { background-image:url('/x/venus-2k.jpg'); background-position:41% center; }
        .frames-hub-card .frames-shot:nth-child(3) { background-image:url('/x/venus-2k.jpg'); background-position:69% center; }
        .frames-hub-card .frames-mode {
          display:flex; align-items:center; justify-content:space-between; gap:8px;
          font-family:'DM Mono',monospace; font-size:.45rem; letter-spacing:.12em;
          text-transform:uppercase; color:var(--muted);
        }
        @media(max-width:560px){ .frames-hub-card .frames-strip{height:76px;} }
      `}</style>
      <div className="fade-up" style={{ height: '100%', animationDelay: '.08s' }}>
        <a
          href="/frames/"
          className="ed-card frames-hub-card"
          style={{ '--ed-accent': '#d7a85b' } as React.CSSProperties}
          aria-label="Frames — görsel günlük"
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <span className="mono" style={{ fontSize: '.5rem', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Görsel Günlük · Fotoğraf
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
              <span className="ed-arrow mono" style={{ fontSize: '.6rem', color: '#d7a85b' }}>→</span>
              <span className="mono" style={{ fontSize: '.52rem', color: '#d7a85b', opacity: .9 }}>13</span>
            </span>
          </div>

          <h3 className="display" style={{ fontSize: '1.15rem', marginBottom: 6 }}>
            Frames <em className="italic-accent" style={{ color: '#d7a85b', fontSize: '.98rem' }}>Journal</em>
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: '.74rem', lineHeight: 1.5, marginBottom: 0 }}>
            Gördüğüm manzaralar, sokaklar ve küçük ayrıntılar için yüksek çözünürlüklü görsel günlük. Sinematik akış, koleksiyonlar ve kısa field note kartları.
          </p>

          <div className="frames-strip" aria-hidden>
            <span className="frames-shot" />
            <span className="frames-shot" />
            <span className="frames-shot" />
          </div>

          <div className="frames-mode" aria-hidden>
            <span>Flow</span><span>Index</span><span>Field Notes</span><span>2K / 4K</span>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 11, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="mono" style={{ fontSize: '.48rem', color: '#d7a85b', letterSpacing: '.08em', textTransform: 'uppercase' }}>
              ● Yeni
            </span>
          </div>
          <div lang="en" style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 11 }}>
            {['Photography', 'Editorial', 'HD', 'Visual Journal'].map((tag) => (
              <span key={tag} className="mono" style={{ fontSize: '.43rem', letterSpacing: '.07em', color: 'var(--muted)', border: '1px solid var(--rule)', padding: '2px 6px' }}>
                {tag}
              </span>
            ))}
          </div>
        </a>
      </div>
    </>,
    target,
  )
}
