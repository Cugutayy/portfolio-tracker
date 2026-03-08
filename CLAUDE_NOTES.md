# CLAUDE DEV NOTES — SEANS BAŞINDA OKU
# =============================================
# Proje: snmez.xyz — Kişisel proje hub + F1 predictor + Portfolio tracker
# Repo: C:\Users\cugut\Documents\portfolio-tracker
# GitHub: Cugutayy/portfolio-tracker
# Live: snmez.xyz (hub), snmez.xyz/tracker/ (finans), snmez.xyz/#/f1 (F1)
# Deploy: Cloudflare Pages → npm run build → dist
# Son güncelleme: 8 Mart 2026, 22:45

# ═══════════════════════════════════════════════════════════════
# HEMEN YAPILACAKLAR — ÖNCELİK SIRASI
# ═══════════════════════════════════════════════════════════════

## 1. F1 SAYFASI TAM YENİDEN TASARIM [KRİTİK]
Kullanıcı referans: https://github.com/IAmTomShaw/f1-race-replay
Mevcut hali "sıkışık ve sade" — referans görüntüdeki gibi olmalı:

### Hedef Layout (hem predict hem replay aynı):
```
┌─────────────────────────────────────────────────────────────┐
│ F1 PREDICTOR [Melbourne▼] LAP 37/52    TAHMİN REPLAY CANLI │
├────────────┬──────────────────────────────┬─────────────────┤
│ Weather    │                              │ Leaderboard     │
│ Track:23°C │   ╔══════════════╗           │ 1. PIA     ●    │
│ Air:18.5°C │   ║   TRACK MAP  ║           │ 2. NOR  +1.2s   │
│ Humid:73%  │   ║  (BÜYÜK)     ║           │ 3. HUL  +3.4s   │
│ Wind:1km/h │   ║  araçlar     ║           │ 4. HAM  OUT     │
│ Rain:DRY   │   ║  hareket     ║           │ 5. STR          │
│────────────│   ║  ediyor      ║           │ 6. GAS          │
│ Driver:PIA │   ║              ║           │ 7. RUS          │
│ Speed:289  │   ║  DRS zonları ║           │ 8. ALO          │
│ Gear:7     │   ║  yeşil       ║           │ 9. VER          │
│ DRS:OFF    │   ║              ║           │ ...             │
│ THR ██████ │   ║  bayrak      ║           │ 17. HAD  OUT    │
│ BRK ███    │   ║  bölgeleri   ║           │ 18. BOR         │
│ Ahead:N/A  │   ║  sarı        ║           │ 19. LAW  OUT    │
│ Behind:3.1s│   ╚══════════════╝           │ 20. COL         │
│────────────│                              │─────────────────│
│ Driver:VER │  Controls:                   │ AI TAHMİN       │
│ Speed:299  │  [SPACE] Pause               │ P1: RUS 65%     │
│ Gear:8     │  [←/→] Rewind/FF            │ P2: ANT 18%     │
│ ...        │  [1/2/4] Speed               │ P3: LEC 8%      │
│────────────│                              │                 │
│ Driver:HAM │                              │ OLAYLAR         │
│ Speed:155  │                              │ L12 PIT RUS→H   │
│ ...        │                              │ L8 OVT VER P5→4 │
├────────────┴──────────────────────────────┴─────────────────┤
│ ◄◄ ► ►► 0.5x [1x] 2x 4x ════════════════════ L37/52      │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░  Yeşil=Bayrak  Sarı=SC  Kırmızı=Red│
└─────────────────────────────────────────────────────────────┘
```

### Yapılması gerekenler:
- [ ] Sol panel: 3 seçilebilir driver telemetri kartı
  - Speed bar (renkli, 0-350 km/h)
  - Gear göstergesi
  - DRS durumu (ON/OFF)
  - Throttle bar (yeşil, 0-100%)
  - Brake bar (kırmızı, 0-100%)
  - Ahead: sürücü adı + gap + mesafe (m)
  - Behind: sürücü adı + gap + mesafe (m)
  - OpenF1 car_data endpoint kullan: speed, rpm, n_gear, throttle, brake, drs
- [ ] Pist: Daha büyük, renkli
  - DRS zonları yeşil çizgi ile işaretli
  - Sarı bayrak bölgeleri sarı
  - Race control mesajlarına göre dinamik renk
  - Araçlar takım renkleriyle, daha büyük noktalar
  - Tıklanabilir araçlar (tıklayınca sol panelde telemetri göster)
- [ ] Sağ panel: Leaderboard + AI Tahmin + Olay akışı
  - OUT/PIT durumu göster
  - Lastik ikonu (renk kodlu)
  - AI tahmin kolonu (→P1, →P3)
- [ ] Alt bar: Progress bar
  - Tur bazlı renkli (yeşil=yeşil bayrak, sarı=SC/VSC, kırmızı=red flag)
  - Race control mesajlarından otomatik hesapla
- [ ] Spacing: Daha rahat, daha canlı, can sıkıcı olmayan

## 2. SHADER ARKA PLAN [ÖNEMLİ]
- `npm install @paper-design/shaders-react three` — kullanıcı "paper yüklü" dedi ama kontrol et
- Warp shader component'i F1 arka planına entegre et
- Veya DitheringShader (sphere shape, koyu tema)
- Alternatif: DottedSurface (Three.js particle wave)
- Kullanıcı arscontexta.org tarzı beğendi

## 3. TRACKER KATEGORİ TAB SİSTEMİ [ÖNEMLİ]
- BIST | Emtia | Döviz | Kripto | Endeks butonları
- Tıklayınca içinde arama yapılabilir
- Mevcut SEARCH_SUGGESTIONS'ı kategorilere ayır
- Kullanıcı dostu UI — investing.com benzeri

## 4. HUB SİTESİ YENİDEN TASARIM [ORTA]
- arscontexta.org tarzı: koyu tema, grain, glassmorphism kartlar
- 4-kolon kart layout (PLUGIN|INSTALL|EXPLORE|APP benzeri)
- Daha kompakt — kullanıcı "çok boş yer var" dedi
- İnteraktif ve smooth

## 5. EXCEL BETA/KOVARYANS [ORTA]
- tracker/js/beta.js mevcut — hocanın istediği formülleri ekle
- Beta hesaplama
- Kovaryans matrisi
- Hocanın attığı Excel formatına uyumlu

## 6. MOBİL RESPONSIVE [DÜŞÜK]
- Tracker + Hub + F1 son kontrol
- F1: @media(max-width:900px) var ama test edilmedi

# ═══════════════════════════════════════════════════════════════
# PROJE YAPISI
# ═══════════════════════════════════════════════════════════════

```
C:\Users\cugut\Documents\portfolio-tracker\
├── src/
│   ├── App.tsx                    — hash routing (#/f1), i18n (tr/en/zh)
│   ├── components/
│   │   ├── F1Page.tsx             — F1 dashboard (~310 satır) — TAM YENİDEN YAZILACAK
│   │   ├── ProjectCards.tsx       — 3 kart (Portfolio, F1, Yakında)
│   │   ├── Navbar.tsx, Hero.tsx, Footer.tsx, Icons.tsx
│   ├── f1/
│   │   ├── types.ts               — tipler
│   │   ├── data.ts                — 22 sürücü, 11 takım, DRIVERS/TEAMS
│   │   ├── realdata.ts            — 2026 AUS GP sıralama + YARIŞ SONUÇLARI + computeBacktest()
│   │   ├── api.ts                 — OpenF1 API client (rate limit 4/s, cache, retry)
│   │   ├── predictor.ts           — Ensemble ML v5 (predictFromGrid + updateFromLiveData)
│   │   ├── trackData.ts           — Hardcoded pist koordinatları (Albert Park 113 nokta)
│   │   ├── index.ts               — barrel export
│   ├── styles/
│   │   └── globals.css            — CSS vars, grain overlay, mobil responsive
├── tracker/
│   ├── js/
│   │   ├── markets.js             — 200+ sembol (BIST-100, emtia, döviz, kripto)
│   │   ├── api.js                 — yahooProxy + safeGet
│   │   ├── core.js, data.js, init.js, i18n.js, analytics.js, beta.js
│   ├── index.html
├── CLAUDE_NOTES.md                — BU DOSYA
├── package.json
├── vite.config.ts                 — vite-plugin-static-copy: tracker/ → dist/tracker/
```

# ═══════════════════════════════════════════════════════════════
# TEKNİK NOTLAR — BİLMEN GEREKENLER
# ═══════════════════════════════════════════════════════════════

## OpenF1 API
- URL: api.openf1.org/v1
- Rate limit: 3 req/s (biz 4 kullanıyoruz, tolere ediliyor)
- 2026 verisi MEVCUT: sessions, laps, positions, intervals, stints, race_control, weather, location, car_data, drivers
- 2026 AUS GP Race: session_key = 11234
- 2026 Shanghai GP: session_key = 11240 (Race), qualifying henüz belirsiz
- location endpoint: driver_number ZORUNLU (yoksa 422 hatası!)
- drivers endpoint: numara sırasına göre döndürür (NOR=1, VER=3... RUS=63 en sonda!)
- car_data endpoint: speed, rpm, n_gear, throttle(0-100), brake(0-100), drs

## SVG Track Map
- Y-flip ZORUNLU: sy = H - PAD - ((y-yMin)/(yMax-yMin))*(H-2*PAD)
- Pist koordinatları trackData.ts'te hardcoded (Albert Park 113 nokta)
- Yeni pist eklemek: Russell'ın Lap 10'unu çek, her 3. noktayı al, TRACK_COORDS'a ekle
- Shanghai pisti henüz eklenmedi — yarış sonrası ekle

## Replay Sistemi
- ZAMAN BAZLI: replayTime (ms) → 200ms tick → TIME_STEP = TICK * speed * 10
- 1x: 2s/tick, 4x: 8s/tick
- Araç pozisyonları: allLocationData'dan replayTime'a en yakın önceki konum
- Lap numarası: Russell'ın lap date_start'larından hesaplanır
- raceStartTime/raceEndTime: yarışın ilk ve son lap zamanlarından

## ML Model v5
- Ensemble: Ridge(40%) + GradientBoosting(60%) + ELO
- 14 feature: grid, delta, form, team, circuit, exp, season, teammate, driverELO, teamELO, trend, volatility, gridVsForm, frontRowBonus
- ELO-grid recovery: gridFormGap > 8 && eloNorm > 0.5 → recovery bonus
- updateFromLiveData: momentum(son 3 tur trend) + race progress weighting(tur/58 * 0.7)
- Backtest AUS GP: MAE 3.06, Winner ✓ (RUS), Podium 2/3, VER P20→P8(gerçek P6)

## Deployment
- Cloudflare Pages: npm run build → dist
- CNAME: @ → portfolio-tracker-gz6.pages.dev
- Cache: her deploy sonrası Ctrl+Shift+R gerekli
- Proxy: /api/prices → Cloudflare Pages Function → Yahoo Finance
- Email: HTML'deki @ işaretini &#64; ile encode et (Cloudflare email protection)

## File Tools Dikkat Noktaları
- Filesystem:edit_file: oldText EXACT MATCH gerekli — Unicode sorunları yaşanabilir
- ÇÖZÜM: copy_file_user_to_claude → grep ile exact text bul → sonra edit
- Büyük dosyalar: bash_tool'da python ile satır bazlı değiştir → /home/claude/'a yaz → present_files ile paylaş
- write_file: tam dosya yazımı en güvenli yol (edit_file'dan daha az hata)

# ═══════════════════════════════════════════════════════════════
# KURALLAR
# ═══════════════════════════════════════════════════════════════

1. ASLA RASTGELE/UYDURMA VERİ — tüm veriler gerçek API'den
2. Push öncesi: bracket kontrol (python ile { } ( ) [ ] dengesi)
3. Push öncesi: emoji scan (büyük emoji kullanma, text butonlar)
4. * selector'de transition KULLANMA (performans)
5. TEK SAYFA — F1 sayfası tek amaç: yarış tahmini + canlı takip
6. ASLA YENİ CHAT ÖNERİ — bu chat'te devam et
7. Test et → sonra push et (canlı sitede screenshot al, kontrol et)

# ═══════════════════════════════════════════════════════════════
# BİLİNEN BUGLAR (düzeltilmedi)
# ═══════════════════════════════════════════════════════════════

- F1Page predict modunda pist çok küçük ve sade — referans görüntüdeki gibi büyük olmalı
- Tracker'da yeni eklenen emtialar (buğday, mısır vs) aranabilir ama görüntülenmiyor olabilir
- Hub'da ScrollReveal kartları ilk yüklenmede bazen görünmüyor (getBoundingClientRect fix var ama %100 değil)
- @paper-design/shaders-react npm install edildi mi kontrol et
- Tracker'da kategori tab butonları yok — tüm semboller düz liste

# ═══════════════════════════════════════════════════════════════
# ÖNCEKİ SEANSDA YAPILAN İŞLER (8 Mart 2026)
# ═══════════════════════════════════════════════════════════════

1. OpenF1 2026 verisi keşfedildi (ücretsiz, tüm endpoint'ler çalışıyor)
2. F1Page tamamen yeniden yazıldı (v3) — 2 mod: Tahmin + Replay + Canlı
3. SVG Track Map — Albert Park hardcoded koordinatlar
4. Zaman bazlı replay — 200ms tick, araçlar hareket ediyor
5. Leaderboard — gap tarihe göre filtreleme, lastik badge
6. Event Feed — overtake, pit, DNF
7. AI Tahmin lap-by-lap — predictor.updateFromLiveData
8. Canlı yarış modu — 5s polling
9. Yarış seçici dropdown — 2026 tüm yarışlar
10. Hub tasarım iyileştirmeleri — grain, glassmorphism, compact
11. SEARCH_SUGGESTIONS 200+ sembol
12. Mobil responsive @media breakpoints
13. Emoji → text butonlar (TAHMİN, REPLAY, CANLI, PLAY, STOP)
14. Sonraki yarış otomatik qualifying fetch

# ═══════════════════════════════════════════════════════════════
# SEANS BAŞLATMA CHECKLIST
# ═══════════════════════════════════════════════════════════════

1. Bu dosyayı oku: C:\Users\cugut\Documents\portfolio-tracker\CLAUDE_NOTES.md
2. Canlı siteyi kontrol et: https://snmez.xyz/#/f1
3. npm install durumunu kontrol et: @paper-design/shaders-react, three
4. git status — uncommitted değişiklik var mı?
5. Yapılacaklar listesindeki 1 numaradan başla
