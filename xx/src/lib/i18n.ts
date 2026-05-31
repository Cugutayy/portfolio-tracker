// ─────────────────────────────────────────────────────────────
// Lightweight i18n. Turkish is the source/default; English is opt-in via the
// `xx-lang` cookie (set by the header flag toggle). Untranslated surfaces
// gracefully fall back to Turkish until they're localized.
// ─────────────────────────────────────────────────────────────

export type Locale = "tr" | "en";

export const dict = {
  tr: {
    nav_arena: "Arena",
    nav_login: "Giriş yap",
    nav_portfolio: "Portföyüm",
    nav_join: "Yarışa katıl",

    edition_issue: "SAYI No. 1",
    announce_band: "3 AYLIK BÜYÜK YARIŞ BAŞLADI — İLK 3’E SÜRPRİZ PARA ÖDÜLÜ",
    announce_detail: "DETAY →",

    hero_eyebrow: "1.000.000 ₺ · gerçek piyasa fiyatları · canlı yarışma",
    hero_h1_a: "Portföyünü kur,",
    hero_h1_b: "traderlarla yarış.",
    hero_sub:
      "Sanal 1.000.000 ₺ ile başla, en fazla 10 varlık seç, gerçek piyasa fiyatlarıyla yarış. En iyi getiri zirveye çıkar.",
    hero_cta_board: "Canlı liderlik ↓",
    hero_cta_start: "Hemen başla",

    cover_edu: "Eğitim amaçlı · gerçek para yok",
    cover_board: "CANLI LİDERLİK ↓",

    edition_live: "Canlı edisyon",
    rules_h2_a: "Kurallar basit,",
    rules_h2_b: "rekabet gerçek.",
    rule_1: "1.000.000 ₺ sanal sermaye ile başlarsın — gerçek para yok, gerçek fiyatlar var.",
    rule_2: "Kripto, emtia, S&P 500, NASDAQ 100 ve BIST 100’den en fazla 10 varlık seçersin.",
    rule_3: "Günde en fazla 10 işlem; her fiyat CoinGecko ve Yahoo Finance’ten canlı akar.",
    rule_4: "En yüksek getiriyi yapan, canlı liderlik tablosunun zirvesine çıkar.",
    stat_start: "Başlangıç",
    stat_max: "Maks. varlık",
    stat_daily: "Günlük işlem",
    stat_data: "Veri",
    stat_live: "Canlı",
    cta_start_arrow: "Hemen başla →",

    rail_title: "Canlı liderlik",
    rail_sub: "en çok kazanan",
    rail_empty_h: "Arena henüz boş.",
    rail_empty_p: "İlk portföyü sen kur — zirvenin ilk ismi ol.",
    rail_empty_cta: "Hemen başla →",
    rail_footer: "Canlı portföyler — gerçek piyasa fiyatlarıyla değerlenir.",
  },
  en: {
    nav_arena: "Arena",
    nav_login: "Log in",
    nav_portfolio: "My portfolio",
    nav_join: "Join the race",

    edition_issue: "ISSUE No. 1",
    announce_band: "THE 3-MONTH TOURNAMENT IS LIVE — SURPRISE CASH PRIZES FOR THE TOP 3",
    announce_detail: "DETAILS →",

    hero_eyebrow: "1,000,000 ₺ · real market prices · live tournament",
    hero_h1_a: "Build your portfolio,",
    hero_h1_b: "race the traders.",
    hero_sub:
      "Start with a virtual 1,000,000 ₺, pick up to 10 assets and compete on real market prices. The best return takes the top.",
    hero_cta_board: "Live leaderboard ↓",
    hero_cta_start: "Get started",

    cover_edu: "For education · no real money",
    cover_board: "LIVE LEADERBOARD ↓",

    edition_live: "Live edition",
    rules_h2_a: "Simple rules,",
    rules_h2_b: "real competition.",
    rule_1: "You start with a virtual 1,000,000 ₺ — no real money, real prices.",
    rule_2: "Hold up to 10 assets from crypto, commodities, the S&P 500, NASDAQ 100 and BIST 100.",
    rule_3: "Up to 10 trades a day; every price streams live from CoinGecko and Yahoo Finance.",
    rule_4: "Whoever posts the highest return climbs to the top of the live leaderboard.",
    stat_start: "Starting",
    stat_max: "Max assets",
    stat_daily: "Daily trades",
    stat_data: "Data",
    stat_live: "Live",
    cta_start_arrow: "Get started →",

    rail_title: "Live leaderboard",
    rail_sub: "top gainers",
    rail_empty_h: "The arena is empty.",
    rail_empty_p: "Build the first portfolio — be the first name at the top.",
    rail_empty_cta: "Get started →",
    rail_footer: "Live portfolios — valued at real market prices.",
  },
} as const;

export type Dict = Record<keyof (typeof dict)["tr"], string>;

export function getDict(locale: Locale): Dict {
  return dict[locale] ?? dict.tr;
}
