# CLAUDE DEV NOTES — HER PUSH'TAN ÖNCE OKU
# =============================================

## KURAL 1: ASLA RASTGELE/UYDURMA VERİ
- Simülasyon verileri rastgele üretilmemeli
- skill:98, carSpeed:96 gibi puanlarla sonuç hesaplama — GERÇEK DEĞİL
- Her zaman GERÇEK VERİ kullan (OpenF1 API)
- Gerçek veri yoksa "veri yok" göster

## KURAL 2: TEK SEFERDE DÜZGÜN YAP
- pointer-events:none child elementlere ekle
- addEventListener kullan, inline onclick değil
- body::after z-index:9999 KULLANMA
- * selector'ünde transition KULLANMA — kasma yapar

## KURAL 3: DÜRÜSTLÜK
- Gerçek ML yoksa "ML modeli" deme
- Simülasyon = tahmin olduğunu açıkça etiketle

## KURAL 4: CANLI VERİ SİSTEMİ (KRİTİK)
- Yarış öncesi: Antrenman + sıralama → tahmin
- Yarış sırasında: Her tur OpenF1 API'den veri → tahmin güncelle (HIZLI!)
- Yarış sonrası: Gerçek sonuç + tahmin karşılaştırması
- Veri kaynağı: OpenF1 API (F1 Live Timing SignalR bazlı)
- f1_sensor ilham: lastik stats, pit detay, race control, championship prediction
- Uydurma veri ASLA kullanma

## KURAL 5: ASLA YENİ CHAT ÖNERİ
## KURAL 6: GEREKSİZ KONUŞMA YAPMA — direkt kod yaz
