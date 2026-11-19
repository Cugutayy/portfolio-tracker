export type Caption = readonly [tr: string, en: string]

export type GalleryProject = {
  title: string | Caption
  href: string
  anchor?: string
  image?: string
  fit?: 'contain'
}

const media = '/hub/gallery/'
const requestAccess = (title: string) => 'mailto:s.cagatay.sonmez@gmail.com?subject=' + encodeURIComponent(title + ' erişim talebi')

export const projects: GalleryProject[] = [
  {
    title: ['Ege Üniversitesi Edebiyat Fakültesi', 'Ege University Faculty of Letters'],
    href: '/ege-edebiyat/',
    image: media + 'ege-edebiyat-giris.webp',
  },
  {
    title: 'X × Atlas',
    href: '#/x',
    anchor: 'atlas',
    image: media + 'x-atlas-ceramikos.webp',
    fit: 'contain',
  },
  {
    title: 'Journey Notes',
    href: 'https://journeynotess.com/',
    image: '/journey/hero-snow.avif',
  },
  {
    title: 'XX Arena',
    href: 'https://xx-arena.vercel.app/',
    image: media + 'xx-arena.webp',
  },
  {
    title: 'Portfolio Tracker',
    href: '/tracker/',
    image: media + 'portfolio-tracker.webp',
  },
  {
    title: 'Alsancak Runners',
    href: 'https://alsancak-runners.vercel.app/',
    image: media + 'alsancak-runners.webp',
  },
  {
    title: ['BIST Tezi', 'BIST Thesis'],
    href: '/tez/',
    anchor: 'research',
    image: media + 'bist-tezi.webp',
  },
  {
    title: 'Jane Street Trader',
    href: '/jane-street.html',
    image: media + 'jane-street.webp',
  },
  {
    title: ['On-chain Analiz', 'On-chain Analysis'],
    href: '/brain/',
    image: media + 'onchain-analiz.webp',
  },
  {
    title: 'Pattern Bot',
    href: requestAccess('Pattern Bot'),
  },
  {
    title: 'Motorsport ML',
    href: requestAccess('Motorsport ML'),
    anchor: 'archive',
  },
  {
    title: ['Albion Piyasa Tarayıcı', 'Albion Market Scanner'],
    href: requestAccess('Albion'),
  },
  {
    title: 'Sentiment Trading',
    href: requestAccess('Sentiment Trading'),
  },
  {
    title: 'Multi-Asset Trend Bot',
    href: requestAccess('Trend Bot'),
  },
  {
    title: 'KediDex',
    href: requestAccess('KediDex'),
    image: '/kedidex/icons/icon-512.png',
    fit: 'contain',
  },
]
