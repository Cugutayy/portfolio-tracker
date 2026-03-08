# CLAUDE DEV NOTES — HER PUSH'TAN ÖNCE OKU
# =============================================

## KURAL 1: ASLA RASTGELE/UYDURMA VERİ — GERÇEK VERİ KULLAN
## KURAL 2: TEK SAYFA — ayrı sekme yok

## KURAL 3: ML MODELİ v5 (GÜNCELLENDİ)
- Ensemble: Ridge (%40) + GradientBoosting (%60) + ELO rating + ELO-grid recovery post-processing
- 14 feature: grid, delta, form, team, circuit, exp, season, teammate, driverELO, teamELO, trend, volatility, gridVsForm, frontRowBonus
- Temporal: 2025=3x, 2024=1x
- Lap-by-lap canlı güncelleme: momentum + pace trendi + race progress weighting
- GradientBoosting: 20 decision stump ensemble (grid ağırlığı artırıldı)
- ELO: Sürücü + takım dinamik güç sıralaması
- Recovery: gridFormGap > 8 && eloNorm > 0.5 → recovery bonus (VER P20→P8 tahmin, gerçek P6)
- Backtest AUS GP: MAE 3.06, Winner ✓ (RUS), Podium 2/3

## KURAL 4: KAYNAKLAR
- f1_sensor: Dashboard kartları, canlı veri formatı
- TUMFTM: Gerçek pist koordinatları
- f1-race-replay (GitHub: IAmTomShaw): Telemetri race replay — Python projesi, biz React'e çevirdik
- f1ml: Lap-by-lap sequential prediction + pit + olay tahmin
- mar-antaya: GradientBoosting + sektör süreleri
- OpenF1 API: api.openf1.org — ücretsiz, rate limit 3-4 req/s, 2026 verisi MEVCUT

## KURAL 5: CANLI VERİ — 5s polling (canlı mod), 200ms tick (replay)
## KURAL 6: DÜRÜSTLÜK — tahmin = tahmin
## KURAL 7: ASLA YENİ CHAT ÖNERİ
## KURAL 8: * selector transition KULLANMA

# ═══════════════════════════════════════════════════════════════
# SEANS NOTU — 8 Mart 2026
# ═══════════════════════════════════════════════════════════════

## SEANS ÖZETİ
Bu seans F1 race prediction dashboard'ı tamamen yeniden yazıldı + hub sitesi iyileştirildi.
Önceki seanstan devam — context window compaction ile başladı.

## SEANS BAŞINDA YAPILAN KONFİGÜRASYON
1. Transcript dosyası /mnt/transcripts/ altında mevcut — önceki seansın tam kaydı
2. İlk iş: transcript'ten CLAUDE_NOTES.md okuması ve proje durumunu anlaması
3. Filesystem tools: Kullanıcı bilgisayarı C:\Users\cugut\Documents\portfolio-tracker\
4. Claude bilgisayarı: /home/claude/ (geçici çalışma alanı) ve /mnt/user-data/uploads/ (yüklenen dosyalar)
5. Filesystem:copy_file_user_to_claude ile kullanıcı dosyalarını Claude'a kopyalayıp analiz ettik

## FILE TOOLS KULLANIM NOTLARI
- Filesystem:read_text_file → kullanıcı bilgisayarından dosya oku (head/tail parametreleri ile kısmi okuma)
- Filesystem:edit_file → kullanıcı bilgisayarında dosya düzenle (oldText/newText exact match gerekli!)
  ⚠ EDİT HATASI: Unicode karakterler (\u00e7, \u015f vs) oldText'te exact match sorunları yaratıyor
  ⚠ ÇÖZÜM: Filesystem:copy_file_user_to_claude ile dosyayı Claude'a kopyala, grep ile exact text bul, sonra edit yap
- Filesystem:write_file → tamamen yeni dosya yaz (büyük dosyalar için tercih et)
- Filesystem:copy_file_user_to_claude → kullanıcı dosyasını /mnt/user-data/uploads/'a kopyalar
  → Sonra bash_tool ile grep/python analiz yapılabilir
- bash_tool → Claude bilgisayarında komut çalıştır (syntax kontrol, dosya analiz)
  ⚠ npm install çalışmaz (network blocked), sadece analiz için kullan
- Claude in Chrome tools → tarayıcıda test et, API çağrıları yap, screenshot al

## YAPILAN İŞLER (kronolojik)

### 1. OpenF1 API Keşfi
- 2026 Avustralya GP verisi MEVCUT olduğu keşfedildi
- Session key: 11234 (Race), 11230 (Qualifying)
- Endpoints test edildi: laps ✓, positions ✓, intervals ✓, car_data ✓, location ✓, stints ✓, race_control ✓, weather ✓, drivers ✓
- Location endpoint: x,y koordinatları ile pist üzerinde araç pozisyonları (3.7 Hz sample rate)
- ⚠ location?session_key=11234 (driver_number olmadan) → 422 hatası! Her sürücü ayrı ayrı çekilmeli

### 2. F1Page Tamamen Yeniden Yazıldı (v3)
- Eski: 3 kolonlu karanlık dashboard, dev hero, statik tahmin
- Yeni: İki mod (Tahmin + Replay), compact layout, zaman bazlı replay
- Dosya: src/components/F1Page.tsx (~520 satır)

### 3. Track Map — SVG Pist Haritası
- İlk deneme: API'den pist koordinatları çekme → BAŞARISIZ (getLocations cache sorunu, düz çizgi)
- Sorun: slice(0,400) → pit çıkışı koordinatlarını alıyor, pist şekli değil
- Çözüm: trackData.ts dosyasında HARDCODED Albert Park koordinatları
  - Russell'ın Lap 10'unu API'den çekip, her 3. noktayı alarak 113 noktalık pist oluşturuldu
  - Y-flip gerekli (SVG'de y aşağı artıyor, OpenF1'de y yukarı artıyor)
- CIRCUIT_MAP: session_key → circuit name mapping
- Yeni pistler eklemek için: aynı yöntemle lap koordinatlarını çekip TRACK_COORDS'a ekle

### 4. Replay Sistemi
- İlk deneme: Tur bazlı timer → araçlar donuk, hareket etmiyor
- Sorun: Her turda sadece 1 konum noktası alınıyor
- Çözüm: ZAMAN BAZLI replay
  - replayTime (ms) → her 200ms'de TIME_STEP kadar ilerler
  - 1x: 2s/tick, 4x: 8s/tick
  - Araç pozisyonları replayTime'a göre allLocationData'dan bulunuyor
  - Lap numarası replayTime'dan otomatik hesaplanıyor
  - Slider zaman bazlı (raceStartTime → raceEndTime)

### 5. Leaderboard + Gap + Lastik
- Sorun: Herkes "LEADER" görünüyordu
- Neden: Gap verileri tarihe göre filtrelenmiyordu (tüm yarış boyunca son değer alınıyordu)
- Çözüm: Russell'ın ilgili turunun tarihini referans alıp, o tarihe kadar olan verileri filtrele
- Lastik: stint.compound null olabilir (ilk stint), "M" (Medium) default gösteriliyor
- TyreBadge component: S(kırmızı) M(sarı) H(beyaz) I(yeşil) W(mavi)

### 6. Event Feed (Olay Akışı)
- Pit stops: stintData'dan tyre_age_at_start === 0 && lap_start > 1 filtreleme
- Overtakes: posData'dan position değişimlerini izleyerek, tur numarasını Russell'ın lap zamanlarına göre eşleştirme
- DNF/Flags: raceCtrl'den RETIRED/STOPPED/RED FLAG mesajları
- filteredEvents: replayLap'a göre filtreleniyor (sadece o tura kadar olanlar)

### 7. AI Tahmin Lap-by-lap
- predictor.updateFromLiveData() her tur değişiminde çağrılıyor
- currentStandings'ten liveDrivers oluşturuluyor: position, lastLapTime, gap, pitStops, compound
- livePreds state'inde saklanıyor
- AI TAHMİN paneli: top 10 sürücü + win% + confidence (70-95% arası, yarış ilerledikçe artar)
- Leaderboard'da →P kolonu: her sürücünün AI tahmini bitiş pozisyonu

### 8. Canlı Yarış Modu
- toggleLive fonksiyonu: 5 saniyede bir tüm endpoint'leri paralel çeker
- 🔴 CANLI butonu pulse animasyonuyla yanıp söner
- fetchLive: drivers, laps, positions, intervals, stints, race_control, weather + konum (top 6)
- Cleanup: useEffect return ile clearInterval
- Shanghai GP (14 Mart) için hazır — qualifying sonrası otomatik çalışacak

### 9. Yarış Seçici Dropdown
- OpenF1'den 2026 tüm Race session'ları çekilir
- hasData: new Date(s.date_start) <= new Date() — geçmiş yarışlar seçilebilir
- Gelecek yarışlar "⊘" ile disabled
- Yarış değişince: qualifying session bulunur, grid oluşturulur, model tahmin üretir

### 10. Hub Tasarım İyileştirmeleri
- ScrollReveal fix: getBoundingClientRect ile hemen kontrol (IntersectionObserver'dan önce)
- Hero compact: isim tek satır, padding azaltıldı, "Developer · Data · ML" eklendi
- Grain texture: body::after SVG noise filter, %2.5 opacity
- Kart hover: kırmızı/yeşil glow → subtle shadow elevation + 3° tilt
- Renk paleti rafine: daha sıcak tonlar, daha subtle shadow
- Mobil responsive: @media(max-width:768px) F1 grid'ler tek kolon
- Projeler/Footer padding azaltıldı

### 11. Tracker SEARCH_SUGGESTIONS Genişletme
- 107 → ~200+ sembol
- BIST: 24 → ~90 hisse (BIST-100 büyük kısmı)
- US: 21 → 41 hisse (BABA, TSM, ASML, ARM, SMCI vs)
- Emtialar: 6 → 14 (buğday, mısır, soya, kahve, pamuk, şeker, paladyum, Brent)
- Döviz: 6 → 16 (CHF/TRY, JPY/TRY, CNY/TRY, AUD, CAD, cross'lar)
- Kripto: 13 → 23 (ATOM, FTM, NEAR, ALGO, APT, ARB, OP, INJ, PEPE, LTC)
- Endeksler: Nikkei, Hang Seng, Shanghai, Bovespa, ASX, KOSPI, Nifty, Euro Stoxx, Russell, VIX
- ⚠ Proxy test: tüm futures sembolleri /api/prices?sym= üzerinden çalışıyor (GC=F, ZC=F vs)

## BULUNAN VE DÜZELTİLEN BUGLAR

1. ✅ Track düz çizgi → Y-flip + hardcoded koordinatlar
2. ✅ Herkes "LEADER" → Gap/position tarihe göre filtreleme
3. ✅ Lastik göstermiyordu → stint lap_start bazlı filtre + compound null handling
4. ✅ Replay'da araçlar hareket etmiyor → Zaman bazlı replay (200ms tick)
5. ✅ Russell/Hamilton pist üzerinde yok → drivers endpoint numara sırasıyla döndürüyor, drv.slice(0,6) yanlış 6 sürücüyü alıyordu
6. ✅ Replay çok yavaş yükleniyor → 22 sürücü → top 10, 3'lü batch, rate limit 4/s
7. ✅ location?session_key (driver_number yok) → 422 hatası → her sürücü ayrı ayrı çekiliyor
8. ✅ ScrollReveal kartları göstermiyor → getBoundingClientRect ile hemen kontrol
9. ✅ F1 grid'ler mobilde kırılıyor → @media(max-width:768px) ile 1fr tek kolon
10. ✅ KOZAL → TRALT (isim değişikliği)
11. ✅ Piyasalar boş görünüyordu → markets.js HTML'de yüklenmiyordu

## DOSYA YAPISI (güncel)
```
src/
├── App.tsx                    — hash routing (#/f1 → F1Page), i18n (tr/en/zh)
├── components/
│   ├── F1Page.tsx             — F1 dashboard (~520 satır) — 2 mod: Tahmin + Replay + Canlı
│   ├── ProjectCards.tsx       — 3 kart (Portfolio, F1, Yakında) — ScrollReveal + Card3D
│   ├── Navbar.tsx, Hero.tsx, Footer.tsx, Icons.tsx
├── f1/
│   ├── types.ts               — temizlenmiş tipler
│   ├── data.ts                — 22 sürücü, 11 takım, DRIVERS/TEAMS/DRIVER_NUMBER_MAP
│   ├── realdata.ts            — 2026 AUS GP sıralama + GERÇEK YARIŞ SONUÇLARI + computeBacktest()
│   ├── api.ts                 — OpenF1 API client (rate limit, cache, retry)
│   ├── predictor.ts           — Ensemble ML v5 (pre-trained + ELO recovery + updateFromLiveData)
│   ├── trackData.ts           — Hardcoded pist koordinatları (Albert Park 113 nokta)
│   ├── index.ts               — barrel export
├── styles/
│   └── globals.css            — CSS variables, grain overlay, mobil responsive
tracker/
├── js/
│   ├── markets.js             — Piyasalar (200+ sembol, BIST-100, emtia, döviz, kripto)
│   ├── api.js                 — yahooProxy + safeGet
│   ├── core.js, data.js, init.js, i18n.js, analytics.js, beta.js, sample.js, ttest.js
├── index.html
```

## DEPLOYMENT
- DNS: Cloudflare nameservers
- CNAME: @ → portfolio-tracker-gz6.pages.dev
- Build: `npm run build`, Output: `dist`
- vite-plugin-static-copy: tracker/ → dist/tracker/
- Cache: Her deploy sonrası Ctrl+Shift+R gerekli
- Proxy: /api/prices → Cloudflare Pages Function → Yahoo Finance

## KRİTİK PENDING — HEMEN YAPILACAK
- [ ] F1 sayfası referans görüntü gibi olmalı: https://github.com/IAmTomShaw/f1-race-replay
  - Sol: Driver telemetri kartları (speed, gear, DRS, throttle/brake bar, ahead/behind gap)
  - Orta: BÜYÜK pist, araçlar takım renkleriyle, DRS zonları yeşil çizgi
  - Sağ: Leaderboard + OUT/pit durumu
  - Mevcut hali çok sıkışık ve sade — daha canlı, renkli, interaktif olmalı
  - Pist yolları DRS zonlarında yeşil, sarı bayrak bölgelerinde sarı
- [ ] @paper-design/shaders-react Warp shader arka plan (npm install yapıldı mı kontrol et)
- [ ] Tracker kategori tab butonları (BIST/Emtia/Döviz/Kripto) — tıkla, içinde arat
- [ ] Hub arscontexta tarzı interaktif tasarım
- [ ] Excel beta/kovaryans formülleri

## PENDING TODO (sonraki seans)
- [ ] Tracker kategori tab sistemi (BIST/Emtia/Döviz/Kripto/Endeks butonları + içinde arama)
- [ ] Hub arscontexta tarzı interaktif arka plan (koyu tema, grain, cam efektli kartlar, glassmorphism)
- [ ] F1 header ikonları ve buton tasarımı profesyonel (emoji yerine SVG ikon)
- [ ] Excel'e beta, kovaryans, hocanın istediği formüller ekleme
- [ ] Tracker'da tüm BIST-400+ hisse arama, investing.com seviyesi kapsam
- [ ] Mobil responsive son kontrol (tracker + hub + f1)
- [ ] Canlı yarış modu test (Shanghai GP qualifying sonrası — 14 Mart 2026)
- [ ] Yeni pist koordinatları: Shanghai (TRACK_COORDS'a ekle)
- [ ] arscontexta tarzı 4-kolon kart layout: PLUGIN|INSTALL|EXPLORE|APP benzeri
- [ ] Kullanıcı "sitede çok boş yer var" dedi — daha kompakt layout
- [ ] Kullanıcı "çok basit duruyor" dedi — interaktif, smooth, profesyonel tasarım

## ÖNEMLİ TEKNİK NOTLAR
1. OpenF1 rate limit: 3 req/s (biz 4 kullanıyoruz, tolere ediliyor)
2. OpenF1 location endpoint: driver_number ZORUNLU, tek seferde tüm sürücüler çekilemez (422)
3. F1 sürücü numaraları API'den numara sırasına göre dönüyor (NOR=1, VER=3... RUS=63 en sonda!)
4. Replay'da replayTime ms cinsinden — Date.now() ile karşılaştırılıyor
5. TrackMap SVG'de Y-flip gerekli: sy = H - PAD - ((y-yMin)/(yMax-yMin))*(H-2*PAD)
6. Stints'te ilk stint compound genellikle null — "MEDIUM" varsayılmalı
7. computeBacktest(): Model yarış sonuçlarını görmeden tahmin yapar — fair backtest
8. Yahoo Finance futures sembolleri: "=" içerir (GC=F, ZC=F) — URL encode gerekli
9. Cloudflare email protection: HTML'deki @ işaretini &#64; ile encode et
