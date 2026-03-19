# ROTA — Kosu Toplulugu Uygulamasi

> **Calisma adi:** Rota (kesinlestirilecek)
> **Alsancak Runners** kulup sitesi olarak kalir, Rota platformunda bir kulup olarak yer alir.
> Solo gelistirme (Claude ile pair programming).

---

## 1. VIZYON

Izmir merkezli, topluluk odakli kosu uygulamasi. GPS tracking + Strava sync + Apple Health + yerel kosu topluluklari.

**Hedef kullanici:** Izmir'deki amator ve orta seviye koscular (baslangic). Sonra tum Turkiye.
**Rakipler:** Strava (global, ingilizce), Nike Run Club (kurumsal), Runkeeper (eski)
**Fark:** Turkce, topluluk odakli, yerel etkinlikler, kulup sistemi, GPS tracking
**Gelir modeli:** Tamamen ucretsiz (topluluk buyutme oncelikli)
**Tech stack:** Expo + React Native + TypeScript (mevcut bilgiyi aktarir)

---

## 2. URUN OZELLIKLERI (MVP → V2 → V3)

### MVP (Minimum Viable Product) — 2-3 ay

| Ozellik | Aciklama | Oncelik |
|---------|----------|---------|
| **Kayit/Giris** | Email + Strava OAuth + Apple Sign In | P0 |
| **Strava sync** | Mevcut altyapi (webhook + manual sync) | P0 |
| **Apple Health sync** | HealthKit entegrasyonu (adim, mesafe, kalori) | P0 |
| **Google Fit sync** | Health Connect API (Android) | P0 |
| **Kosu haritasi** | Mapbox ile rota goruntuleme (mevcut) | P0 |
| **Profil** | Toplam km, kosu sayisi, streak, pace ortlamasi | P0 |
| **Topluluk akisi** | Son kosular feed'i (kim ne zaman nerede kostu) | P0 |
| **Leaderboard** | Haftalik/aylik/yillik lider tablosu | P0 |
| **Push notification** | Yeni kosu, leaderboard degisimi, etkinlik hatirlatma | P1 |
| **Turkce/Ingilizce** | Mevcut i18n altyapisi | P0 |

### V2 — +2 ay

| Ozellik | Aciklama | Oncelik |
|---------|----------|---------|
| **GPS kosu takibi** | Uygulama icinden kosu baslat/bitir (arka plan GPS) | P1 |
| **Canli kosu** | Arkadaslarin canli konumunu gor | P1 |
| **Paylasim** | Kosu kartini Instagram/WhatsApp'a paylas | P1 |
| **Kulup sistemi** | Birden fazla kosu grubu olustur/katil | P1 |
| **Etkinlikler** | Kosu etkinligi olustur, RSVP, hatirlatma | P1 |
| **Rozet sistemi** | Ilk 5K, ilk 10K, 100km toplam, streak rozeti | P2 |
| **Arkadaslik** | Takip et, kosu karsilastir | P2 |

### V3 — +3 ay

| Ozellik | Aciklama | Oncelik |
|---------|----------|---------|
| **Antrenman plani** | Haftalik plan olustur, hedef belirle | P2 |
| **Kocu onerisi** | Pace grubuna gore otomatik eslesme | P2 |
| **Rota onerisi** | Popüler rotalari kesfet, kaydet | P2 |
| **Fotograf galeri** | Kosu sirasinda foto cek, galeri paylasim | P2 |
| **Sanal yaris** | Aylik mesafe challenge, sehirlerarasi yarisma | P3 |
| **Wear OS / watchOS** | Akilli saat companion app | P3 |

---

## 3. TEKNIK ARSITEKTUR

### Opsiyon A: React Native (Expo) — ONERILEN

```
┌─────────────────────────────────────────────────────┐
│                    MOBILE APP                        │
│  Expo SDK 52 + React Native + TypeScript             │
│  ├── @react-navigation (tab + stack navigator)       │
│  ├── expo-health (Apple Health / Health Connect)     │
│  ├── expo-location (GPS tracking)                    │
│  ├── expo-notifications (push)                       │
│  ├── react-native-mapbox-gl (harita)                 │
│  └── expo-sharing (paylasim karti)                   │
└─────────────────┬───────────────────────────────────┘
                  │ REST API + WebSocket
┌─────────────────▼───────────────────────────────────┐
│                    BACKEND                           │
│  Node.js + Fastify (veya mevcut Next.js API)        │
│  ├── Auth: Clerk / Supabase Auth (social login)     │
│  ├── DB: PostgreSQL (Neon - mevcut)                 │
│  ├── Cache: Redis (Upstash - mevcut)                │
│  ├── Queue: BullMQ (Strava webhook islemcisi)       │
│  ├── Storage: S3 / Cloudflare R2 (fotolar)          │
│  └── WebSocket: Soketi / Pusher (canli kosu)        │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│                EXTERNAL SERVICES                     │
│  ├── Strava API (OAuth2 + Webhooks)                 │
│  ├── Apple HealthKit (native SDK via expo-health)   │
│  ├── Google Health Connect (native SDK)             │
│  ├── Mapbox (harita + geocoding)                    │
│  ├── OneSignal (push notification)                  │
│  └── Vercel (web dashboard deploy)                  │
└─────────────────────────────────────────────────────┘
```

### Neden Expo + React Native?

1. **Tek kod tabani:** iOS + Android ayni TypeScript kodu
2. **Expo SDK:** HealthKit, GPS, kamera, bildirim hepsi hazir
3. **React bilgisi aktarilir:** Mevcut React/TypeScript deneyimi dogrudan kullanilir
4. **Hot reload:** Gelistirme hizi yuksek
5. **OTA update:** App Store onaysiz guncelleme (EAS Update)
6. **Maliyet:** Expo free tier yeterli (MVP icin)

### Opsiyon B: Flutter

- Dart dili ogrenmek gerekir (React deneyimi aktarilamaz)
- Daha iyi native performans
- Material Design hazir
- **Dezavantaj:** Mevcut TypeScript/React bilgisi kullanilamaz

### Opsiyon C: PWA + Capacitor

- En dusuk gelistirme maliyeti
- Mevcut Next.js kodu sarmalanir
- **Dezavantaj:** HealthKit erisimi sinirli, GPS arka plan yok, native his yok

**Karar: Opsiyon A (Expo + React Native) oneriliyor.**

---

## 4. VERITABANI SEMASI (Genisletilmis)

Mevcut Alsancak Runners semasina ek:

```sql
-- Kullanici profili (genisletilmis)
users
  ├── id, email, name, avatar_url
  ├── strava_connected, apple_health_connected
  ├── preferred_unit (km/mi)
  ├── preferred_language (tr/en)
  ├── push_token (OneSignal)
  └── created_at, updated_at

-- Arkadaslik
friendships
  ├── follower_id → users.id
  ├── following_id → users.id
  └── status (pending/accepted)

-- Kulupler (multi-community)
clubs
  ├── id, name, slug, description, logo_url
  ├── city, country
  ├── owner_id → users.id
  └── is_public, member_count

club_memberships
  ├── club_id → clubs.id
  ├── user_id → users.id
  └── role (member/admin/owner)

-- Paylasimlar / Sosyal akis
posts
  ├── id, user_id, activity_id (nullable)
  ├── content (text), image_url
  ├── type (run_share/photo/text)
  └── likes_count, comments_count

comments
  ├── id, post_id, user_id
  └── content, created_at

likes
  ├── post_id, user_id
  └── created_at

-- Rozetler
badges
  ├── id, key (first_5k, streak_7, total_100km)
  ├── name_tr, name_en
  ├── icon_url, description
  └── criteria_json

user_badges
  ├── user_id, badge_id
  └── earned_at
```

---

## 5. VERI AKISI: FITNESS UYGULAMALARI

### Strava (mevcut, calisiyor)
```
Kullanici Strava baglar → OAuth2 token → Webhook auto-sync
Polyline + istatistik otomatik → DB'ye kaydet
```

### Apple Health (yeni — sadece mobile)
```
Kullanici HealthKit izni verir → expo-health ile oku
Son 7 gun adim + mesafe + kalori → DB'ye kaydet
Arka plan guncelleme: UIBackgroundModes (healthkit)
```

### Google Fit / Health Connect (yeni — sadece Android)
```
Kullanici Health Connect izni verir → expo-health ile oku
Son 7 gun adim + mesafe + kalori → DB'ye kaydet
```

### Manuel giris
```
Kullanici form doldurur: mesafe, sure, tarih
Opsiyonel: harita uzerinde rota ciz
```

### GPX/FIT dosya import
```
Kullanici dosya yukler → sunucu parse eder
Polyline + istatistik cikarilir → DB'ye kaydet
```

---

## 6. TIMELINE

| Ay | Faz | Ciktilar |
|----|-----|----------|
| **Ay 1** | Proje kurulumu | Expo proje, navigasyon, auth, profil ekrani |
| **Ay 2** | Veri katmani | Strava sync, Apple Health, kosu listesi, harita |
| **Ay 3** | Sosyal + MVP | Feed, leaderboard, push notification, TestFlight |
| **Ay 4** | V2 baslangic | GPS tracking, paylasim karti, kulup sistemi |
| **Ay 5** | V2 tamamlama | Etkinlikler, rozetler, arkadaslik |
| **Ay 6** | App Store | App Store + Play Store yayinlama, marketing |

---

## 7. MALIYET TAHMINI (Aylik)

| Servis | Free Tier | Ucretli (1000+ kullanici) |
|--------|-----------|--------------------------|
| **Expo EAS** | 30 build/ay | $99/ay (unlimited) |
| **Vercel** | Free | $20/ay (pro) |
| **Neon PostgreSQL** | 0.5 GB | $19/ay (launch) |
| **Upstash Redis** | 10K cmd/gun | $10/ay |
| **Mapbox** | 50K yükleme/ay | $50/ay |
| **OneSignal** | 10K device | Free |
| **Apple Developer** | — | $99/yil |
| **Google Play** | — | $25 (tek seferlik) |
| **Cloudflare R2** | 10 GB | $0.015/GB |
| **TOPLAM** | ~$0/ay | ~$220/ay |

---

## 8. ALSANCAK RUNNERS ILE ILISKI

```
Alsancak Runners (Web)          Kosu Uygulamasi (Mobile)
├── Kulup sitesi                 ├── Genel platform
├── Etkinlikler                  ├── Coklu kulup destegi
├── Topluluk sayfasi             ├── Sosyal akis
├── Rota haritasi                ├── GPS tracking
└── Mevcut API'lar ──────────────┘ (paylasilan backend)
```

- Alsancak Runners web sitesi **kulup sayfasi** olarak kalir
- Kosu uygulamasi Alsancak Runners'i bir **kulup** olarak icerir
- Backend API'lar paylasilabilir (PostgreSQL + Redis ayni)
- Kullanicilar uygulamadan Alsancak Runners kulubune katilabilir

---

## 9. REFERANS PROJELER

| Proje | Ne ogrenebiliriz |
|-------|-----------------|
| **running_page** (GitHub) | 15+ fitness app sync scripti, harita goruntuleme, SVG istatistik |
| **Strava** | Sosyal akis, segment, leaderboard, kulup sistemi |
| **Nike Run Club** | Kosu baslat/bitir UX, antrenman planlari, motivasyon |
| **Runkeeper** | GPS tracking, sesli antrenor, hedef belirleme |
| **Runna** | Antrenman plani olusturucu, AI kocu |

---

## 10. KARARLAR (Cevaplanmis)

| Soru | Karar |
|------|-------|
| Uygulama adi | **Rota** (calisma adi, kesinlestirilecek) |
| Hedef bolge | **Izmir** (baslangic), sonra Turkiye geneli |
| Monetizasyon | **Tamamen ucretsiz** (topluluk buyutme oncelikli) |
| Takim | **Solo** (Claude ile pair programming) |
| MVP'de GPS tracking | **Evet** — uygulamadan kosu baslat/bitir olacak |
| running_page ozellikleri | **Ileride degerlendirilecek** (MVP'de sadece Strava + Apple Health) |
| Alsancak Runners iliskisi | **Kulup olarak kalir**, Rota platformunda bir kulup |

## 11. ACIK SORULAR (Kalan)

1. **Domain/branding:** rotaapp.com, rotarun.com, getrota.com?
2. **App Store hesabi:** Apple Developer ($99/yil) ne zaman alinacak?
3. **Backend:** Mevcut Alsancak API'larini genislet mi, sifirdan mi?
4. **Tasarim:** Alsancak'in dark temasini mi kullan, yoksa yeni tasarim mi?
5. **Beta test:** TestFlight ile kac kisiyle test edilecek?

---

*Bu belge 2026-03-19 tarihinde olusturulmustur. Uygulama gelistirmeye baslamak icin Expo proje kurulumu ilk adimdir.*
