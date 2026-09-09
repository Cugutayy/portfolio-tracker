import { useEffect } from 'react'

/**
 * Keeps the KediDex project visible in the hub while presenting it as restricted,
 * matching the access-request treatment used by the other private projects.
 */
export function KediDexGuard() {
  useEffect(() => {
    const apply = () => {
      const card = document.querySelector<HTMLAnchorElement>('a.ed-card[href="/kedidex/"]')
      if (!card || card.dataset.kedidexGuarded === 'true') return

      card.dataset.kedidexGuarded = 'true'
      card.href = 'mailto:s.cagatay.sonmez@gmail.com?subject=' + encodeURIComponent('Erişim talebi — KediDex')
      card.style.position = 'relative'
      card.style.overflow = 'hidden'

      Array.from(card.children).forEach((child) => {
        const el = child as HTMLElement
        el.style.filter = 'blur(5px)'
        el.style.opacity = '.42'
        el.style.pointerEvents = 'none'
        el.setAttribute('aria-hidden', 'true')
      })

      const overlay = document.createElement('div')
      overlay.setAttribute('aria-label', 'KediDex erişime kapalı. Erişim istemek için tıklayın.')
      overlay.style.cssText = [
        'position:absolute','inset:0','z-index:4','display:flex','flex-direction:column',
        'align-items:center','justify-content:center','gap:11px','text-align:center','padding:16px',
        'background:color-mix(in srgb, var(--bg) 58%, transparent)','backdrop-filter:blur(1.5px)',
        'pointer-events:none'
      ].join(';')

      overlay.innerHTML = `
        <span style="width:38px;height:38px;border-radius:50%;display:grid;place-items:center;border:1px solid var(--rule);color:var(--muted)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
          </svg>
        </span>
        <span class="mono" style="font-size:.56rem;letter-spacing:.16em;text-transform:uppercase;color:var(--ink)">Erişime kapalı</span>
        <span class="mono" style="font-size:.54rem;letter-spacing:.1em;text-transform:uppercase;color:var(--bg);background:var(--ink);padding:7px 14px;border-radius:999px">Erişim iste →</span>
      `
      card.appendChild(overlay)
    }

    apply()
    const observer = new MutationObserver(apply)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return null
}
