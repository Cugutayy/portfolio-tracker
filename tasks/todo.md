# Faz 2 — Detayli Plan

## Durum: ✅ TAMAMLANDI — Deploy edildi (2026-03-20)

---

## BOLUM A: Mevcut Bug Duzeltmeleri (Implement oncesi temizlik)

### A1. Fotoğraf base64 boyut siniri (CRITICAL)
- **Sorun:** Kullanici 5MB foto secerse ~7MB base64 olur, POST body patlayabilir
- **Dosya:** `rota-app/app/(tabs)/track.tsx` satir 346-365
- **Cozum:** ImagePicker'da `quality: 0.4` + max width/height 1200px ekle. Ayrica client-side base64 boyut kontrolu: >1MB ise uyari goster
- **Dogrulama:** 10MB foto sec → resize edildigini kontrol et → API'ye gonderildigini dogrula

### A2. Yorum silme endpoint'inde activityId dogrulamasi yok (HIGH)
- **Sorun:** DELETE handler activityId'yi params'tan almiyor, yorum baska activity'ye ait olabilir
- **Dosya:** `alsancak-runners/src/app/api/activities/[id]/comments/route.ts` DELETE handler
- **Cozum:** `const { id: activityId } = await params;` ekle, comment'in bu activity'ye ait oldugunu dogrula
- **Dogrulama:** Yanlis activityId ile silme dene → 404 donmeli

### A3. Etkinlik olusturmada mesafe/katilimci validasyonu yok (HIGH)
- **Sorun:** distanceM negatif olabilir, maxParticipants siniri yok
- **Dosya:** `alsancak-runners/src/app/api/events/route.ts` POST handler
- **Cozum:** distanceM > 0 ve < 200000 (200km), maxParticipants > 0 ve < 1000 kontrolu
- **Dogrulama:** Negatif mesafe gonder → 400 donmeli

### A4. Yorum eklemeye rate limit yok (MEDIUM)
- **Sorun:** Spam riski — diger POST endpointlerinde rate limit var, commentlerde yok
- **Dosya:** `alsancak-runners/src/app/api/activities/[id]/comments/route.ts` POST handler
- **Cozum:** `checkRateLimit(request, "comments", 20)` ekle (dakikada 20 yorum)
- **Dogrulama:** 21 yorum gonder → 429 donmeli

### A5. Feed auto-refresh 30sn cok agresif (MEDIUM)
- **Sorun:** Gereksiz API call'lar, pil tuketimi
- **Dosya:** `rota-app/app/(tabs)/index.tsx` setInterval
- **Cozum:** 60 saniyeye cikar. Ayrica AppState listener ekle — arka plandayken durdur
- **Dogrulama:** Uygulama arka plana alindiginda interval durmali

### A6. Login/Register'da network timeout yok (LOW)
- **Sorun:** api.ts'deki 10s timeout login/register'da yok, dogrudan fetch kullaniliyor
- **Dosya:** `rota-app/app/login.tsx`, `rota-app/app/register.tsx`
- **Cozum:** AbortController ile 15s timeout ekle
- **Dogrulama:** Sunucu kapaliyken → 15sn sonra hata mesaji gelmeli

---

## BOLUM B: Faz 2 Ozellikleri

### B1. Following / Everyone Feed Sekmeleri
**Amac:** Strava gibi "Takip Ettiklerim" ve "Herkes" sekmeleri

#### Backend degisiklikleri:
- **Dosya:** `alsancak-runners/src/app/api/community/activities/route.ts`
- **Degisiklik:** `filter` query param ekle: `following` | `everyone` (default: everyone)
- **SQL:** `filter=following` ise:
  ```sql
  WHERE activities.memberId IN (
    SELECT followingId FROM follows WHERE followerId = currentUserId
  ) OR activities.memberId = currentUserId
  ```
- **Cache key:** `filter` parametresini cache key'e ekle
- **Edge case:** Kimseyi takip etmiyorsa bos liste + "Henuz kimseyi takip etmiyorsun" mesaji

#### Frontend degisiklikleri:
- **Dosya:** `rota-app/app/(tabs)/index.tsx`
- **UI:** Leaderboard altina iki tab butonu: `TAKIP` | `HERKES`
- **State:** `activeTab: "following" | "everyone"` (default: "following" eger login ise, "everyone" eger anonim)
- **API call:** `getCommunityActivities({ filter: activeTab, ...params })`
- **Tab degisince:** Sayfa 1'den yeniden yukle, mevcut listeyi temizle
- **Empty state:** "Takip Ettiklerim" bossa → "Henuz kimseyi takip etmiyorsun. Kesfet sekmesinden kosuculari bul!"

#### Veri akisi dogrulama:
1. A kullanicisi B'yi takip ediyor → A "Takip" sekmesinde B'nin kosularini gormeli
2. A kimseyi takip etmiyor → "Takip" sekmesi bos mesaj gostermeli
3. A "Herkes" sekmesinde tum kosuculari gormeli
4. B yeni kosu eklerse → A'nin "Takip" sekmesi 60sn icinde guncelenmeli (veya pull-to-refresh ile hemen)

---

### B2. Haftalik Ozet Karti (WeeklySummaryCard)
**Amac:** Profilde bu haftanin ozet istatistikleri

#### Backend degisiklikleri:
- **Dosya:** `alsancak-runners/src/app/api/members/me/route.ts`
- **Degisiklik:** Response'a `weeklyStats` objesi ekle:
  ```typescript
  weeklyStats: {
    totalRuns: number,
    totalDistanceM: number,
    totalTimeSec: number,
    avgPaceSecKm: number | null,
    // Gecen haftaya gore degisim:
    distanceChange: number, // pozitif = artis, negatif = azalis (yuzde)
    runsChange: number,
  }
  ```
- **SQL:** Bu haftanin pazartesisinden itibaren (Turkiye zamani UTC+3) aktiviteleri say
- **Gecen hafta:** Ayni sorguyu gecen haftanin tarih araliginda calistir, degisimi hesapla

#### Frontend degisiklikleri:
- **Dosya:** `rota-app/app/(tabs)/profile.tsx`
- **UI:** Stats grid'in uzerinde yeni kart:
  ```
  ┌──────────────────────────────────────┐
  │ BU HAFTA                             │
  │ 3 kosu · 12.4 km · 5:32 ort. tempo  │
  │ ↑ 15% gecen haftaya gore            │
  └──────────────────────────────────────┘
  ```
- **Edge case:** Bu hafta 0 kosu → "Bu hafta henuz kosu yok. Hadi baslayalim!"
- **Edge case:** Gecen hafta 0 kosu → degisim gosterme, sadece bu haftayi goster

#### Veri akisi dogrulama:
1. Yeni kosu kaydedilince → profil sayfasina don → haftalik ozet guncelenmis olmali
2. 0 kosu durumunda → bos state mesaji gorulmeli
3. Gecen haftadan fazla kosu → yesil yuzde yukaris ok
4. Gecen haftadan az kosu → kirmizi yuzde asagi ok

---

### B3. Paylasim Karti Iyilestirme (Share Card)
**Amac:** Kosu sonrasi Instagram/WhatsApp'a paylasim karti

#### Mevcut durum kontrolu:
- `rota-app/app/activity/[id].tsx` zaten ShareCard ve ViewShot kullaniyor
- `react-native-view-shot` ve `expo-sharing` package'lari mevcut

#### Iyilestirmeler:
- **Dosya:** `rota-app/app/activity/[id].tsx` (veya ayri ShareCard componenti)
- **Mapbox Static Image:** Polyline'i Mapbox Static API URL'sine cevir:
  ```
  https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/path-5+E6FF00-1({encoded_polyline})/auto/600x300@2x?access_token={token}
  ```
- **Kart icerigi:** Statik harita + isim + mesafe + tempo + tarih + uygulama logosu
- **Boyut:** 1080x1920 (Instagram Stories) veya 1080x1080 (kare)
- **Edge case:** polylineEncoded null → harita gosterme, sadece istatistik
- **Edge case:** Mapbox token gecersiz → fallback olarak haritasiz kart

#### Veri akisi dogrulama:
1. Kosu detayinda "Paylas" butonuna bas → kart olusturulmali
2. Kart olusunca Share sheet acilmali (WhatsApp, Instagram vs.)
3. Polyline'siz aktivitede → haritasiz kart olusturulmali

---

### B4. Aktivite Detay Iyilestirme
**Amac:** Splits tablosu renkli, daha bilgilendirici

#### Frontend degisiklikleri:
- **Dosya:** `rota-app/app/activity/[id].tsx`
- **Splits renklendirme:**
  - En hizli split → yesil arka plan (#2D5A27 gibi koyu yesil)
  - En yavas split → kirmizi arka plan (#5A2727 gibi koyu kirmizi)
  - Ortalar → gradyan
- **Hesaplama:** Tum splits'in paceSecKm degerlerini al, min/max bul, her split'e renk ata
- **Edge case:** Tek split → renklendirme yapma
- **Edge case:** Splits bos → "Split verisi yok" mesaji

#### Veri akisi dogrulama:
1. 5km'lik kosu → 5 split satiri gorunmeli, en hizli yesil en yavas kirmizi
2. 0.8km'lik kosu → split olmayabilir veya tek partial split
3. Strava import → server-side splits varsa gostermeli

---

### B5. Takipci/Takip Listesi Ekrani
**Amac:** Profilde takipci/takip sayilarina tiklaninca liste gormek

#### Backend degisiklikleri:
- **Yeni endpoint:** `GET /api/members/[id]/followers?type=followers|following`
- **Dosya:** Yeni `alsancak-runners/src/app/api/members/[id]/followers/route.ts`
- **Response:** `{ users: [{ id, name, image, bio }] }`
- **SQL:** follows tablosundan JOIN members

#### Frontend degisiklikleri:
- **Yeni ekran:** `rota-app/app/followers.tsx` (query param: memberId, type)
- **UI:** Basit liste — avatar + isim + takip/takibi birak butonu
- **Navigasyon:** profile.tsx ve member/[id].tsx'deki TouchableOpacity'lere onPress ekle
- **Edge case:** 0 takipci → "Henuz takipci yok"

#### Veri akisi dogrulama:
1. Profilden "5 TAKIPCI" tikla → 5 kisilik liste gorulmeli
2. Listeden birine tikla → o kisinin profiline gitmeli
3. Listeden "Takip et" tikla → sayi guncelenmeli

---

## BOLUM C: Implementasyon Sirasi

```
Adim 1: A1-A6 bug duzeltmeleri (tum buglar once)
  ↓
Adim 2: B1 Following/Everyone tabs (backend + frontend + test)
  ↓
Adim 3: B2 Haftalik ozet (backend + frontend + test)
  ↓
Adim 4: B4 Splits renklendirme (sadece frontend)
  ↓
Adim 5: B5 Takipci listesi (backend + frontend + test)
  ↓
Adim 6: B3 Paylasim karti (frontend + Mapbox Static)
  ↓
Adim 7: Main'e merge + Vercel deploy
  ↓
Adim 8: E2E dogrulama (tum veri akislari test)
```

---

## BOLUM D: Her Adim Icin Dogrulama Kontrol Listesi

Her ozellik implementasyonundan SONRA:
- [ ] TypeScript `tsc --noEmit` hatasiz
- [ ] API endpoint'i curl ile test edildi, dogru response donuyor
- [ ] Frontend'de dogru field'lar map ediliyor (type mismatch yok)
- [ ] Bos/null/undefined durumlari handle ediliyor
- [ ] Turkce UI metinleri kontrol edildi
- [ ] useFocusEffect ile refresh calisiyor
- [ ] Error state (API fail) kullaniciya mesaj gosteriyor
- [ ] Edge case'ler (0 data, cok uzun text, buyuk foto) test edildi
