# KediDex Backend — Cloudflare Pages Functions + D1

Gerçek, paylaşımlı backend. Oyuncuların yakaladığı kediler ortak bir veritabanında
(Cloudflare **D1**) tutulur ve haritada herkese görünür. İsteğe bağlı olarak yakalanan
kare **Workers AI** ile sunucu tarafında ikinci kez "kedi mi?" diye doğrulanır.

## Uç noktalar (snmez-xyz/functions/api/)
| Method | Yol | İş |
|---|---|---|
| `GET`  | `/api/catches?lat=&lng=&km=` | Yakındaki son yakalamalar (tüm oyuncular, max 300) |
| `POST` | `/api/catches` | Yeni yakalama kaydet |
| `POST` | `/api/verify-cat` | Görseli Workers AI ile doğrula (`{verified:true/false/null}`) |

Bağlama (binding) yoksa uç noktalar **zarifçe** boş/null döner; uygulama yerel moda düşer.
Gizlilik: konum sunucuda ~100m'ye (3 ondalık) yuvarlanır.

## Yerel geliştirme/test (login gerekmez)
```bash
cd Documents/snmez-xyz
npx wrangler pages dev public --d1 DB --port 8788 --compatibility-date 2024-09-23
# test:
curl "http://127.0.0.1:8788/api/catches?lat=40.99&lng=29.03&km=5"
```

## Canlıya alma (Cloudflare hesabı)
```bash
# 1) D1 veritabanı oluştur (çıktıdaki database_id'yi not al)
npx wrangler d1 create kedidex

# 2) Pages projesinde binding ekle:
#    Cloudflare Dashboard > Pages > (proje) > Settings > Functions
#      - D1 database bindings:  Variable name = DB   ->  kedidex
#      - (opsiyonel) Workers AI binding: Variable name = AI   -> /api/verify-cat açılır
#    (veya wrangler.toml ile [[d1_databases]] binding="DB")

# 3) Şemayı uygula (opsiyonel; fonksiyon zaten otomatik oluşturur)
npx wrangler d1 execute kedidex --remote --file=public/kedidex/schema.sql

# 4) Deploy: git push (otomatik) veya
npm run build && npx wrangler pages deploy dist
```

Binding eklendiği an `snmez.xyz/kedidex/` haritası gerçek çok-oyunculu olur.

## Veri modeli
`catches(id, player_id, player_name, cat_name, title, rarity, seed, level, quality,
verified, lat, lng, created_at)` — bkz. `schema.sql`.

## Anti-hile katmanları
1. Tanıma yalnız **canlı kamera** akışından (dosya yükleme yolu yok).
2. İstemci: COCO-SSD ile **sürekli** "cat" + **mikro-hareket** (canlılık).
3. Sunucu: Workers AI (`@cf/microsoft/resnet-50`) ile **bağımsız ikinci doğrulama**.
4. Doğrulanan yakalamalar haritada **✓ doğrulandı** rozeti ve +10 XP alır.
