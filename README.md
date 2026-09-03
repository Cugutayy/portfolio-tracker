# Salih Çağatay Sönmez - Project Portfolio

Finans, veri analizi ve web uygulamalarını bir araya getiren kişisel proje deposu.
Ana arayüz React, TypeScript ve Vite kullanır. Başlangıçtaki portföy takip
uygulaması `tracker/` altında korunmaktadır.

## Projeler ve dizinler

| Dizin | İçerik |
|---|---|
| `src/` | React arayüzü ve proje bileşenleri |
| `tracker/` | Responsible Investment dersi için geliştirilen portföy takip uygulaması |
| `tez/` | Finans araştırmasının web içeriği |
| `alsancak-runners/` | Koşu topluluğu web projesi |
| `rota-app/` | Rota ve topluluk uygulaması |
| `functions/` | Sunucu tarafı işlevleri |
| `tools/` | Yardımcı araçlar |

Projeler farklı geliştirme aşamalarındadır. Ana arayüzdeki F1 ve Albion rotaları
mevcut sürümde erişim kısıtı ekranı gösterir. Bir proje kartının bulunması,
o projenin tüm özelliklerinin yayımlandığı anlamına gelmez.

## Yerel geliştirme

Kök dizindeki `package.json` komutları:

```bash
npm ci
npm run dev
```

## Derleme

```bash
npm run build
npm run preview
```

Vite çıktıyı `dist/` dizinine yazar; `tracker/` ve `tez/` dizinleri derleme sırasında
buraya kopyalanır. Alt projelerin sunucu, veri ve ortam değişkeni gereksinimleri
kendi yapılandırmalarına bağlıdır.
