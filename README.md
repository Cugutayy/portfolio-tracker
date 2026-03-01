# Portfolio Tracker — Responsible Investment

Sorumlu Yatırım dersi için çok enstrümanlı portföy takip sistemi.

## Proje Yapısı

```
portfolio-tracker/
├── index.html              # Ana sayfa
├── css/
│   └── style.css           # Tüm stiller
├── js/
│   ├── i18n.js             # Dil sistemi (TR/EN)
│   ├── data.js             # Enstrüman verileri, HISTORY
│   ├── api.js              # API çağrıları (CoinGecko, Yahoo)
│   ├── core.js             # Dashboard render, hesaplamalar
│   ├── ttest.js            # t-Test analiz sayfası
│   ├── beta.js             # Beta analiz sayfası
│   ├── analytics.js        # Sharpe, VaR, Efficient Frontier
│   ├── markets.js          # Canlı piyasa verileri
│   ├── sample.js           # Örnek portföy
│   └── init.js             # Sayfa navigasyon, başlatma
├── netlify/
│   └── functions/
│       └── prices.js       # Serverless API proxy
├── netlify.toml            # Netlify yapılandırma + güvenlik
├── package.json
└── README.md
```

## Özellikler

- 7 enstrümanlı portföy: BTC, THYAO, ASELS, Altın, Tahvil, Fon, Mevduat
- Canlı fiyat takibi (CoinGecko + Yahoo Finance)
- 6 sayfa: Dashboard, t-Test, Beta, Analiz, Piyasalar, Örnek Portföy
- 102 sembol arama önerisi
- Koyu/açık tema + TR/EN dil desteği
- Excel export, ESG skorları, korelasyon matrisi
- Güvenlik başlıkları (CSP, X-Frame-Options, vb.)

## Kurulum

```bash
# Lokal geliştirme
npx serve .

# Netlify'a deploy
# 1. GitHub'a push et
# 2. Netlify'da repo bağla
# 3. Deploy ayarları:
#    - Build command: (boş bırak)
#    - Publish directory: .
```

## Güvenlik

- Content-Security-Policy ile XSS koruması
- X-Frame-Options: DENY (clickjacking koruması)
- Serverless API proxy (CORS yok, key koruması)
- HTTPS (Netlify otomatik SSL)
