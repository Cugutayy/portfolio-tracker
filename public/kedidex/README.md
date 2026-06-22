# 🐾 KediDex — Sokak Kedisi Avı

Sokakta gördüğün **gerçek** kedileri yakalayıp koleksiyon yapan, Pokémon tarzı bir oyun.
`catchcat.lol`'un Türkçe ve daha interaktif versiyonu. Kurulum gerektirmeyen, tek başına
çalışan bir **PWA** (telefona kurulabilen web uygulaması).

## Nasıl çalışır
1. **Yakala** sekmesinde kamerayı aç.
2. Uygulama, cihaz üzerinde (TensorFlow.js + COCO-SSD) **canlı kamera akışında** gerçek bir
   kedi olup olmadığını kontrol eder. İnternetten resim/ekran görüntüsü ile kandıramazsın:
   - tanıma yalnızca canlı akıştan yapılır (dosya yükleme yolu yok),
   - kedinin birkaç kare boyunca **sürekli** görünmesi gerekir,
   - kutuda doğal **mikro-hareket (canlılık)** aranır — kıpırtısız basılı bir fotoğraf "canlı" sayılmaz.
3. "Hazır" olunca **yakalama mini-oyunu** başlar (daralan halka — tam zamanında dokun).
   İsabet ne kadar iyiyse XP ve istatistik bonusu o kadar yüksek.
4. Kedi; ismi, nadirliği, seviyesi, istatistikleri ve hikâyesiyle koleksiyona eklenir.
5. **Harita** sekmesinde kendi buluşların + yakındaki diğer avcıların buluşları görünür.

> 🎲 Kamerası olmayan cihazda (ör. masaüstü) **"Demo: rastgele kedi"** butonu tüm akışı
> tanıma olmadan dener — test için.

## Çalıştırma (yerel)
Statik site; herhangi bir sunucuyla servis edilir. Kamera için **HTTPS veya localhost** şart.
```bash
# Python
python -m http.server 5173
# veya Node
npx serve .
```
Sonra: http://localhost:5173

## Yayınlama (snmez.xyz)
Tamamen statik olduğundan herhangi bir statik host'a olduğu gibi yüklenebilir:
- **Cloudflare Pages / Netlify / Vercel:** klasörü sürükle-bırak veya git ile bağla.
- **Kendi sunucun:** dosyaları `snmez.xyz` köküne kopyala. Kameranın çalışması için site
  **HTTPS** üzerinden sunulmalı.

## Dosya yapısı
```
index.html      arayüz iskeleti
styles.css      retro çizgi film teması (krem tonlar, kalın dış hatlar)
storage.js      localStorage (koleksiyon + profil/seviye/seri)
catgen.js       prosedürel kedi: isim, nadirlik, istatistik, SVG çizim
detector.js     COCO-SSD kedi tanıma + canlılık (anti-hile)
mapview.js      Leaflet harita
app.js          akış: kamera, tanıma, mini-oyun, yakalama, koleksiyon
manifest + sw   PWA (kurulabilir + çevrimdışı kabuk)
```

## Backend (gerçek, paylaşımlı)
Artık Cloudflare **Pages Functions + D1** üzerinde gerçek bir backend var: yakaladığın
kediler ortak veritabanına yazılır ve **haritada diğer oyunculara** görünür. İsteğe bağlı
**Workers AI** ile sunucu-taraflı kedi doğrulaması (asıl anti-hile). Kurulum: bkz.
[`BACKEND.md`](BACKEND.md) ve [`schema.sql`](schema.sql).
- `GET /api/catches?lat=&lng=&km=` · `POST /api/catches` · `POST /api/verify-cat`
- Binding yoksa uygulama yerel moda düşer (graceful).

## Yol haritası (sonraki sürümler)
- ✅ Gerçek çok oyunculu harita (backend + konum paylaşımı)
- ✅ Sunucu-taraflı kedi doğrulama (Workers AI)
- Anti-hile sertleştirme: ekran/foto parlaması tespiti, derinlik/parallax sinyalleri
- Kedi takası, günlük görevler, koleksiyon rozetleri
- Bölgesel "nadir" kediler ve etkinlikler
