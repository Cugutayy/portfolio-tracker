import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['tr', 'en'],
  defaultLocale: 'tr',
  pathnames: {
    '/': '/',
    '/about': {
      tr: '/hakkimizda',
      en: '/about'
    },
    '/etkinlikler': {
      tr: '/etkinlikler',
      en: '/events'
    },
    '/etkinlikler/[slug]': {
      tr: '/etkinlikler/[slug]',
      en: '/events/[slug]'
    },
    '/topluluk': {
      tr: '/topluluk',
      en: '/community'
    },
    '/routes': '/routes',
    '/routes/[slug]': '/routes/[slug]',
    '/gallery': '/gallery',
    '/collaborations': '/collaborations',
    '/runs': {
      tr: '/kosular',
      en: '/runs'
    },
    '/join': '/join',
    '/dashboard': '/dashboard',
    '/dashboard/activity/[id]': '/dashboard/activity/[id]'
  }
});

export type Pathnames = keyof typeof routing.pathnames;
export type Locale = (typeof routing.locales)[number];
