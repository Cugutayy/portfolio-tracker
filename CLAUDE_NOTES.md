# CLAUDE DEV NOTES — HER PUSH'TAN ÖNCE OKU
# =============================================

## KURAL 1: ASLA RASTGELE/UYDURMA VERİ — GERÇEK VERİ KULLAN
## KURAL 2: TEK SAYFA — ayrı sekme yok

## KURAL 3: ML MODELİ v2 (GÜNCELLENDİ)
- Ensemble: Ridge (%40) + GradientBoosting (%60) + ELO rating
- 14 feature (eskiden 8): grid, delta, form, team, circuit, exp, season, teammate, driverELO, teamELO, trend, volatility, gridVsForm, frontRowBonus
- Temporal: 2025=3x, 2024=1x
- Lap-by-lap canlı güncelleme: momentum + pace trendi
- GradientBoosting: 50 decision stump ensemble
- ELO: Sürücü + takım dinamik güç sıralaması

## KURAL 4: KAYNAKLAR
- f1_sensor: Dashboard kartları, canlı veri formatı
- TUMFTM: Gerçek pist koordinatları
- f1-race-replay: Telemetri race replay
- f1ml: Lap-by-lap sequential prediction + pit + olay tahmin
- mar-antaya: GradientBoosting + sektör süreleri

## KURAL 5: CANLI VERİ — 5s polling
## KURAL 6: DÜRÜSTLÜK — tahmin = tahmin
## KURAL 7: ASLA YENİ CHAT ÖNERİ
## KURAL 8: * selector transition KULLANMA
