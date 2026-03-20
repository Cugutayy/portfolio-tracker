# Backend Improvements Plan

## Durum: PLANLAMA — Onay bekleniyor

Audit'te 27 sorun bulundu. Asagidakileri düzeltmeyi planliyorum:

---

## YAPILACAK (12 fix — kritik + yüksek öncelik)

### 1. Privacy IDOR: /members/[id] herkese açık (CRITICAL)
- **Dosya:** `members/[id]/route.ts`
- **Sorun:** Privacy="private" olan kullanicinin profili herkes tarafindan görülebiliyor
- **Fix:** Privacy kontrolü ekle — private ise sadece kendi görebilir

### 2. Community feed privacy filtresi hatalı (CRITICAL)
- **Dosya:** `community/activities/route.ts`
- **Sorun:** `privacy="members"` olan aktiviteler anonim kullanıcılara da gösteriliyor
- **Fix:** Anonim → sadece `public`, login → `public + members`

### 3. Yorum text validasyonu eksik (CRITICAL)
- **Dosya:** `activities/[id]/comments/route.ts`
- **Sorun:** Trim sonrası boş string kontrolü yok
- **Fix:** `cleanText` sonrası `if (!cleanText || cleanText.length < 1)` kontrolü

### 4. Kudos toggle race condition (CRITICAL)
- **Dosya:** `activities/[id]/kudos/route.ts`
- **Sorun:** Check-then-insert arası race condition
- **Fix:** PostgreSQL `ON CONFLICT DO NOTHING` kullan (upsert)

### 5. Photo base64 format doğrulaması (CRITICAL)
- **Dosya:** `activities/route.ts`
- **Sorun:** Herhangi bir string fotoğraf olarak kaydedilebilir
- **Fix:** `data:image/(jpeg|png|webp);base64,` prefix kontrolü

### 6. Event tarih validasyonu (HIGH)
- **Dosya:** `events/route.ts`
- **Sorun:** Geçmiş tarihli veya geçersiz tarihli etkinlik oluşturulabilir
- **Fix:** `Date.parse(date) > Date.now()` kontrolü

### 7. Rate limiter fail-open loglama (HIGH)
- **Dosya:** `lib/rateLimit.ts`
- **Sorun:** Redis yoksa sessizce tüm istekleri geçiriyor
- **Fix:** `console.warn("RATE_LIMIT_BYPASS: Redis unavailable")` ekle

### 8. Haftalık istatistik DST sorunu (HIGH)
- **Dosya:** `members/me/route.ts`
- **Sorun:** UTC+3 hardcoded, Türkiye yaz saatinde UTC+3 (DST yok aslında — Türkiye 2016'dan beri kalıcı UTC+3)
- **Fix:** Aslında sorun YOK — Türkiye kalıcı UTC+3 kullanıyor. Yorum ekle.

### 9. RSVP'de kapasite kontrolü (HIGH)
- **Dosya:** `events/[slug]/rsvp/route.ts`
- **Sorun:** maxParticipants aşılabilir
- **Fix:** Mevcut RSVP sayısını kontrol et, max aşılırsa 400 dön

### 10. Activity type validasyonu (MEDIUM)
- **Dosya:** `activities/route.ts`
- **Sorun:** Geçersiz aktivite tipi kaydedilebilir
- **Fix:** Whitelist: `["run", "walk", "hike", "ride", "swim"]`

### 11. Followers pagination (MEDIUM)
- **Dosya:** `members/[id]/followers/route.ts`
- **Sorun:** Tüm takipçileri tek seferde döndürüyor
- **Fix:** `limit=50` ve `offset` parametreleri ekle

### 12. Activity oluşturulunca takipçilere bildirim (MEDIUM)
- **Dosya:** `activities/route.ts`
- **Sorun:** Kudos/yorum/etkinlikte bildirim var ama yeni koşuda yok
- **Fix:** POST sonrası takipçilerin pushToken'larını al, bildirim gönder

---

## YAPILMAYACAK (sebebiyle)

| # | Sorun | Neden yapılmıyor |
|---|-------|-------------------|
| N+1 subquery | Şu an kullanıcı sayısı az, premature optimization |
| Missing indexes | PostgreSQL otomatik index oluşturuyor PK/unique için, henüz gerekli değil |
| CORS | Next.js aynı domain'de serve ediyor, sorun yok |
| Email regex | Mevcut regex yeterli, kullanıcı sayısı az |
| Cache collision | Yapısal olarak düşük risk |
| Unused schema fields | Gelecekte kullanılabilir |
| SQL injection | Drizzle ORM zaten parametrize ediyor |
| Event spam | Rate limit + küçük grup, şimdilik sorun değil |

---

## İmplementasyon sırası

```
Adım 1: #1 + #2 (Privacy fixler — en kritik)
Adım 2: #3 + #4 + #5 (Input validation fixler)
Adım 3: #6 + #9 (Event validasyonlar)
Adım 4: #7 + #10 + #11 (Rate limit + type + pagination)
Adım 5: #12 (Activity notification)
Adım 6: TypeScript check + commit + deploy
```
