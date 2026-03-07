# CLAUDE DEV NOTES — HER PUSH'TAN ÖNCE OKU
# =============================================

## KURAL 1: ASLA RASTGELE/UYDURMA VERİ
- skill:98, carSpeed:96 gibi puanlarla sonuç hesaplama — GERÇEK DEĞİL
- Her zaman GERÇEK VERİ kullan (OpenF1 API)
- Gerçek veri yoksa "veri yok" göster — UYDURMA

## KURAL 2: AYRI SEKME YOK — TEK SAYFA
- F1 sayfası tek amaç: yarış tahmini + canlı takip
- "Simülasyon" ve "AI Tahmin" ayrı sekmeler olmasın
- Tek sayfa: Grid (gerçek sıralama) + Tahmin + Canlı Veri Akışı

## KURAL 3: ML MODELİ — ANTAYA YAKLAŞIMI + CİDDİ EKLERs
- GradientBoosting veya Ridge Regression
- Feature'lar: sıralama süresi, geçen yıl aynı pist, sektör süreleri, hava, takım performansı
- Temporal weighting: 2026=4x, 2025=2x, 2024=1x, 2023=0.5x
- Canlı yarış sırasında: lap-by-lap veri → tahmin güncelle
- MAE ile performans ölç

## KURAL 4: CANLI VERİ 
- 5 saniyede bir poll: positions, laps, weather, pits
- Görsel: hangi veriler geldi, kaç kayıt, latency
- Yarış sırasında predictor'u canlı güncelle

## KURAL 5: DÜRÜSTLÜK
- Gerçek ML yoksa "ML" deme, Heuristic ise öyle söyle
- Simülasyon = tahmin olduğunu açıkça etiketle

## KURAL 6: ASLA YENİ CHAT ÖNERİ
## KURAL 7: GEREKSİZ KONUŞMA YAPMA — direkt kod yaz
## KURAL 8: * selector'ünde transition KULLANMA — kasma yapar
