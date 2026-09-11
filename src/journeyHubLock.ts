const lockJourneyCard = () => {
  const card = document.querySelector<HTMLElement>('.journey-card')
  if (!card || card.dataset.accessLocked === 'true') return

  card.dataset.accessLocked = 'true'
  card.removeAttribute('href')
  card.setAttribute('aria-label', 'Journey Notes — erişime kapalı')
  card.setAttribute('aria-disabled', 'true')
  Object.assign(card.style, {
    position: 'relative',
    cursor: 'default',
    overflow: 'hidden',
  })

  Array.from(card.children).forEach((node) => {
    const child = node as HTMLElement
    child.setAttribute('aria-hidden', 'true')
    Object.assign(child.style, {
      filter: 'blur(5px)',
      opacity: '0.5',
      pointerEvents: 'none',
      userSelect: 'none',
    })
  })

  const overlay = document.createElement('div')
  overlay.dataset.journeyLockOverlay = 'true'
  Object.assign(overlay.style, {
    position: 'absolute',
    inset: '0',
    zIndex: '5',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '11px',
    textAlign: 'center',
    padding: '16px',
    background: 'color-mix(in srgb, var(--bg) 55%, transparent)',
    backdropFilter: 'blur(1px)',
  })

  const lock = document.createElement('span')
  lock.setAttribute('aria-hidden', 'true')
  Object.assign(lock.style, {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    border: '1px solid var(--rule)',
    color: 'var(--muted)',
  })
  lock.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>'

  const label = document.createElement('span')
  label.className = 'mono'
  label.textContent = 'Erişime kapalı'
  Object.assign(label.style, {
    fontSize: '.56rem',
    letterSpacing: '.16em',
    textTransform: 'uppercase',
    color: 'var(--ink)',
  })

  const request = document.createElement('a')
  request.className = 'mono'
  request.href = `mailto:s.cagatay.sonmez@gmail.com?subject=${encodeURIComponent('Erişim talebi — Journey Notes')}`
  request.textContent = 'Erişim iste →'
  Object.assign(request.style, {
    fontSize: '.54rem',
    letterSpacing: '.1em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    color: 'var(--bg)',
    background: 'var(--ink)',
    padding: '7px 14px',
    borderRadius: '999px',
    cursor: 'pointer',
  })

  overlay.append(lock, label, request)
  card.appendChild(overlay)
}

const observer = new MutationObserver(lockJourneyCard)
observer.observe(document.documentElement, { childList: true, subtree: true })
lockJourneyCard()
