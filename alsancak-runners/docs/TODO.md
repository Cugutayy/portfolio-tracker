# Alsancak Runners + Rota App — Yapilacaklar

## SENİN YAPMAN GEREKENLER (Manuel)

### 1. Mapbox Token (KRITIK — harita icin sart)
- [ ] https://mapbox.com adresinden ucretsiz hesap ac
- [ ] Dashboard'dan "Default public token" kopyala
- [ ] `.env.local` dosyasina ekle: `NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx...`
- [ ] Vercel > Settings > Environment Variables'a da ayni token'i ekle
- [ ] Deploy tetikle (otomatik olacak)

### 2. Vercel Environment Variables (KRITIK)
- [ ] Vercel dashboard'da su env var'larin ayarli oldugundan emin ol:
  - `DATABASE_URL` (Neon PostgreSQL)
  - `AUTH_SECRET` (min 16 karakter)
  - `STRAVA_CLIENT_ID`
  - `STRAVA_CLIENT_SECRET`
  - `STRAVA_TOKEN_ENCRYPTION_KEY` (64 hex karakter)
  - `STRAVA_WEBHOOK_VERIFY_TOKEN`
  - `NEXT_PUBLIC_MAPBOX_TOKEN` (yeni eklenecek)
  - `CRON_SECRET` (cron endpointleri icin)

### 3. PR #20 Merge
- [ ] https://github.com/Cugutayy/portfolio-tracker/pull/20 merge et
- [ ] Vercel otomatik deploy edecek
- [ ] Deploy basarili olup olmadigini kontrol et

### 4. Strava App Onay
- [ ] Strava Developer portal'da 999 athlete onayi almak icin basvur
- [ ] Webhook subscription'i kontrol et

### 5. Apple Developer Hesabi (Rota App icin, ileride)
- [ ] https://developer.apple.com — $99/yil hesap ac
- [ ] TestFlight icin gerekli

---

## CLAUDE ILE YAPILACAKLAR (Sonraki oturumlar)

### Alsancak Runners Web (Kisa vadeli)
- [ ] Mapbox token eklenince haritayi test et ve screenshot al
- [ ] Demo seed verilerini gercek verilerle degistir (gercek uyeler katilinca)
- [ ] Vercel deployment dogrulama (tum sayfalar canli mi?)

### Rota Mobile App (Orta vadeli — MVP)
- [ ] **Step 3:** Auth + login ekrani (email/password)
- [ ] **Step 4:** Aktivite listesi + harita (Mapbox)
- [ ] **Step 5:** GPS kosu takibi (baslat/bitir, polyline kaydet)
- [ ] **Step 6:** Apple Health + push notification
- [ ] Tab navigator: Feed | Harita | Kosu | Profil
- [ ] Strava OAuth (deep link ile)
- [ ] Leaderboard ekrani
- [ ] Etkinlikler ekrani + RSVP

### Rota Mobile App (Uzun vadeli — V2/V3)
- [ ] Canli kosu paylasimi
- [ ] Paylasim karti (Instagram/WhatsApp)
- [ ] Kulup sistemi (multi-community)
- [ ] Rozet sistemi (ilk 5K, streak, 100km)
- [ ] Arkadaslik (takip et, karsilastir)
- [ ] Antrenman plani
- [ ] Multi-source sync (Nike, Garmin)
- [ ] GPX/FIT dosya import
- [ ] App Store + Play Store yayinlama

---

## TAMAMLANAN ISLER

### PR #1-#18 (Merged)
- [x] PostgreSQL + Drizzle ORM + Auth.js
- [x] Strava OAuth + webhook + sync
- [x] Mapbox harita altyapisi
- [x] Community leaderboard + stats
- [x] Events + RSVP sistemi
- [x] i18n (Turkce + Ingilizce)
- [x] Redis cache + rate limiting
- [x] Vercel Cron (gunluk)

### PR #19 (Merged)
- [x] Runs Explorer v1 (full-screen map, sidebar, bottom sheet)
- [x] Runs Explorer v2 (overlay filtreler, mini leaderboard, runner renkleri)
- [x] Community activities API (bounds, filters)

### PR #20 (Acik — merge bekliyor)
- [x] Mobile API: POST/PATCH/DELETE activities
- [x] Push token kayit endpoint
- [x] OAuth mobile redirect destegi
- [x] Expo (React Native) proje kurulumu
- [x] API client + auth modulu
- [x] Seed data (5 uye, 4 etkinlik, 15 aktivite)
- [x] Leaderboard source filtresi duzeltmesi
- [x] Runs Explorer CTA ana sayfada
- [x] Vercel cron Hobby plan uyumlu (gunluk)
