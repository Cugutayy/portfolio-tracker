export type Caption = readonly [tr: string, en: string]

export type GalleryProject = {
  title: string | Caption
  field: Caption
  description: Caption
  href: string
  image?: string
  notes?: readonly [Caption, Caption]
}

type GalleryRoom = { id: string; title: Caption; projects: GalleryProject[] }

const media = '/hub/gallery/'
const requestAccess = (title: string) => 'mailto:s.cagatay.sonmez@gmail.com?subject=' + encodeURIComponent(title + ' erişim talebi')

export const rooms: GalleryRoom[] = [
  {
    id: 'featured',
    title: ['Seçili projeler', 'Selected projects'],
    projects: [
      {
        title: ['Ege Üniversitesi Edebiyat Fakültesi', 'Ege University Faculty of Letters'],
        field: ['Mimari belgeleme', 'Architectural documentation'],
        description: [
          'Bornova’daki fakülteyi, dekanlık girişini ve bağlı kanatları bir araya getiren etkileşimli dış mimari modeli.',
          'An interactive exterior model of the Bornova faculty, its dean’s entrance and adjoining wings.',
        ],
        href: '/ege-edebiyat/',
        image: '/hub/ege-edebiyat.webp',
        notes: [['Bornova, İzmir', 'Bornova, İzmir'], ['3B model ve GLB', '3D viewer and GLB']],
      },
      {
        title: 'XX Arena',
        field: ['Sosyal yatırım', 'Social investing'],
        description: [
          'Piyasa fiyatlarıyla işlem yapmayı deneyebileceğin, 1 milyon TL sanal portföyle başlayan yatırım yarışması.',
          'An investing competition starting with a virtual ₺1 million portfolio and using real market prices.',
        ],
        href: 'https://xx-arena.vercel.app/',
        image: media + 'xx-arena.webp',
      },
      {
        title: 'Portfolio Tracker',
        field: ['Portföy analizi', 'Portfolio analysis'],
        description: [
          'Sorumlu Yatırım dersi için geliştirilen, finansal araçları, fiyatları ve ESG verilerini izleyen portföy çalışması.',
          'A Responsible Investment course project for monitoring instruments, prices and ESG data.',
        ],
        href: '/tracker/',
        image: media + 'portfolio-tracker.webp',
      },
    ],
  },
  {
    id: 'atlas',
    title: ['Mekân ve topluluk', 'Places and community'],
    projects: [
      {
        title: 'X × Atlas',
        field: ['Dijital koleksiyon', 'Digital collection'],
        description: [
          'Mekânları, eserleri ve koleksiyonları 360° görüntüler ve fotogrametriyle belgeleyen dijital atlas.',
          'A digital atlas documenting places, objects and collections through 360° imagery and photogrammetry.',
        ],
        href: '#/x',
        image: media + 'x-atlas-ceramikos.webp',
      },
      {
        title: 'Journey Notes',
        field: ['Fotoğraf ve seyahat', 'Photography and travel'],
        description: [
          'Yolculuklardan kalan fotoğraflar, karşılaşmalar ve kısa saha notlarından oluşan görsel günlük.',
          'A visual journal of photographs, encounters and field notes gathered while travelling.',
        ],
        href: 'https://journeynotess.com/',
        image: '/journey/hero-snow.avif',
      },
      {
        title: 'Alsancak Runners',
        field: ['İzmir koşu topluluğu', 'İzmir running community'],
        description: [
          'Alsancak’taki koşucuları buluşturan etkinlik ve topluluk platformu.',
          'An events and community platform bringing runners together in Alsancak.',
        ],
        href: 'https://alsancak-runners.vercel.app/',
        image: media + 'alsancak-runners.webp',
      },
    ],
  },
  {
    id: 'research',
    title: ['Araştırmalar', 'Research'],
    projects: [
      {
        title: ['BIST Tezi', 'BIST Thesis'],
        field: ['Finans araştırması', 'Financial research'],
        description: [
          'Borsa İstanbul’da halka arz fiyatlaması, sürü davranışı ve uzun vadeli performans üzerine tez çalışması.',
          'Thesis research on IPO pricing, herding and long-run performance on Borsa İstanbul.',
        ],
        href: '/tez/',
        image: media + 'bist-tezi.webp',
        notes: [['2020–2025', '2020–2025'], ['Halka arzlar', 'Initial public offerings']],
      },
      {
        title: 'Pattern Bot',
        field: ['Nicel analiz', 'Quantitative analysis'],
        description: [
          'Kripto fiyat serilerinde Wyckoff birikim ve dağılım fazlarını arayan piyasa tarayıcısı.',
          'A market scanner that looks for Wyckoff accumulation and distribution phases in crypto prices.',
        ],
        href: requestAccess('Pattern Bot'),
        notes: [['Wyckoff fazları', 'Wyckoff phases'], ['OHLC fiyat serileri', 'OHLC price series']],
      },
      {
        title: 'Jane Street Trader',
        field: ['İşlem simülasyonu', 'Trading simulation'],
        description: [
          'Piyasa yapıcılığı, olasılık ve fiyatlama üzerine örnek çözümler ve etkileşimli alıştırmalar.',
          'Worked examples and interactive exercises in market making, probability and pricing.',
        ],
        href: '/jane-street.html',
        image: media + 'jane-street.webp',
      },
      {
        title: ['On-chain Analiz', 'On-chain Analysis'],
        field: ['Zincir üstü veriler', 'On-chain data'],
        description: [
          'Bitcoin arzı, varlık hareketleri ve piyasa dinamiklerini incelemek için hazırlanmış analiz paneli.',
          'A dashboard for examining Bitcoin supply, asset flows and market dynamics.',
        ],
        href: '/brain/',
        image: media + 'onchain-analiz.webp',
        notes: [['Bitcoin', 'Bitcoin'], ['Arz mutabakatı', 'Supply reconciliation']],
      },
    ],
  },
  {
    id: 'archive',
    title: ['Arşiv', 'Archive'],
    projects: [
      {
        title: 'Motorsport ML',
        field: ['Yarış modelleme', 'Race modelling'],
        description: [
          'F1 yarış sonuçları için telemetri, sürücü derecelendirmesi ve makine öğrenmesini birleştiren tahmin çalışması.',
          'An F1 race prediction project combining telemetry, driver ratings and machine learning.',
        ],
        href: requestAccess('Motorsport ML'),
        notes: [['Ridge ve Gradient Boosting', 'Ridge and Gradient Boosting'], ['Elo', 'Elo']],
      },
      {
        title: ['Albion Piyasa Tarayıcı', 'Albion Market Scanner'],
        field: ['Oyun ekonomisi', 'Game economy'],
        description: [
          'Albion Online şehirleriyle Kara Pazar arasındaki fiyat farklarını inceleyen arbitraj tarayıcısı.',
          'An arbitrage scanner that compares prices across Albion Online cities and the Black Market.',
        ],
        href: requestAccess('Albion'),
      },
      {
        title: 'Sentiment Trading',
        field: ['Strateji araştırması', 'Strategy research'],
        description: [
          'BIST 30 üzerinde haber duyarlılığını piyasa özellikleriyle birleştiren nicel strateji deneyi.',
          'A quantitative strategy experiment combining news sentiment and market features for the BIST 30.',
        ],
        href: requestAccess('Sentiment Trading'),
        notes: [['BIST 30', 'BIST 30'], ['İleri yürüyen test', 'Walk-forward testing']],
      },
      {
        title: 'Multi-Asset Trend Bot',
        field: ['Sistematik işlem', 'Systematic trading'],
        description: [
          '29 varlıkta trend takibini ve risk ağırlıklı portföy oluşturmayı araştıran sistem.',
          'A system exploring trend following and risk-weighted portfolios across 29 assets.',
        ],
        href: requestAccess('Trend Bot'),
      },
      {
        title: 'KediDex',
        field: ['Mobil oyun', 'Mobile game'],
        description: [
          'Sokak kedilerini keşfetme ve tanıma üzerine kurulu mobil koleksiyon oyunu.',
          'A mobile collection game about finding and recognising street cats.',
        ],
        href: requestAccess('KediDex'),
      },
    ],
  },
]
