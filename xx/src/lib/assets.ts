// ─────────────────────────────────────────────────────────────
// Asset catalog — the competition universe.
// Crypto top 30 (CoinGecko ids) · commodities · global indices ·
// full NASDAQ-100 · full BIST-100. Colors drive the allocation
// wheels; brand colors where known, deterministic hash otherwise.
// ─────────────────────────────────────────────────────────────

export type AssetType =
  | "crypto"
  | "commodity"
  | "index"
  | "sp500"
  | "nasdaq100"
  | "bist100";

export interface Asset {
  /** Ticker shown in the wheel (e.g. "BTC", "NVDA", "THYAO"). */
  ticker: string;
  /** Human name. */
  name: string;
  /** Brand color for slices. */
  color: string;
  type: AssetType;
  /** CoinGecko id (crypto) or Yahoo Finance symbol (everything else). */
  symbol?: string;
  /**
   * Delisted from the buy catalog but kept priceable so existing holders can
   * still value and SELL their position. Hidden from the markets browser.
   */
  archived?: boolean;
}

/** Deterministic, pleasant slice color when no brand color is given. */
function hashColor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 52% 46%)`;
}

type Row = [ticker: string, name: string, symbol: string, color?: string];

function mk(type: AssetType, rows: Row[], archived = false): Asset[] {
  return rows.map(([ticker, name, symbol, color]) => ({
    ticker,
    name,
    symbol,
    type,
    color: color ?? hashColor(ticker),
    ...(archived ? { archived: true } : {}),
  }));
}

// ── Crypto — top 30 by market cap (stablecoins & tokenized RWA excluded) ──
const CRYPTO: Row[] = [
  ["BTC", "Bitcoin", "bitcoin", "#f7931a"],
  ["ETH", "Ethereum", "ethereum", "#627eea"],
  ["BNB", "BNB", "binancecoin", "#f3ba2f"],
  ["XRP", "XRP", "ripple", "#00aae4"],
  ["SOL", "Solana", "solana", "#14f195"],
  ["TRX", "TRON", "tron", "#eb0029"],
  ["DOGE", "Dogecoin", "dogecoin", "#c2a633"],
  ["HYPE", "Hyperliquid", "hyperliquid", "#50d2c1"],
  ["ZEC", "Zcash", "zcash", "#ecb244"],
  ["ADA", "Cardano", "cardano", "#0033ad"],
  ["XLM", "Stellar", "stellar", "#14b6e7"],
  ["XMR", "Monero", "monero", "#ff6600"],
  ["LINK", "Chainlink", "chainlink", "#2a5ada"],
  ["BCH", "Bitcoin Cash", "bitcoin-cash", "#0ac18e"],
  ["TON", "Toncoin", "the-open-network", "#0098ea"],
  ["HBAR", "Hedera", "hedera-hashgraph", "#222222"],
  ["LTC", "Litecoin", "litecoin", "#345d9d"],
  ["AVAX", "Avalanche", "avalanche-2", "#e84142"],
  ["SUI", "Sui", "sui", "#4da2ff"],
  ["SHIB", "Shiba Inu", "shiba-inu", "#ffa409"],
  ["CRO", "Cronos", "crypto-com-chain", "#103f68"],
  ["NEAR", "NEAR Protocol", "near", "#00c08b"],
  ["LEO", "LEO Token", "leo-token", "#04326b"],
  ["DOT", "Polkadot", "polkadot", "#e6007a"],
  ["UNI", "Uniswap", "uniswap", "#ff007a"],
  ["AAVE", "Aave", "aave", "#b6509e"],
  ["APT", "Aptos", "aptos", "#2dd8a7"],
  ["ETC", "Ethereum Classic", "ethereum-classic", "#328332"],
  ["PEPE", "Pepe", "pepe", "#4caf50"],
  ["ATOM", "Cosmos", "cosmos", "#2e3148"],
  ["BAS", "BNB Attestation Service", "bas", "#f0b90b"],
  ["BLESS", "Bless", "bless-2", "#7c5cff"],
];

// ── Archived crypto — dropped from the top-30 buy list, but still priceable
//    so anyone who already holds them can value and sell their position. ──
const CRYPTO_ARCHIVED: Row[] = [
  ["ICP", "Internet Computer", "internet-computer", "#29abe2"],
  ["FIL", "Filecoin", "filecoin", "#0090ff"],
  ["ARB", "Arbitrum", "arbitrum", "#28a0f0"],
  ["VET", "VeChain", "vechain", "#15bdff"],
  ["OP", "Optimism", "optimism", "#ff0420"],
  ["GRT", "The Graph", "the-graph", "#6f4cff"],
  ["INJ", "Injective", "injective-protocol", "#00d2ff"],
];

// ── Commodities (Yahoo futures, USD) ──
const COMMODITY: Row[] = [
  ["ALTIN", "Altın (Ons)", "GC=F", "#c8a064"],
  ["GÜMÜŞ", "Gümüş", "SI=F", "#9ca3af"],
  ["BAKIR", "Bakır", "HG=F", "#b87333"],
  ["PLATIN", "Platin", "PL=F", "#7d8a99"],
  ["PALADYUM", "Paladyum", "PA=F", "#a9b2bd"],
  ["PETROL", "Ham Petrol (WTI)", "CL=F", "#2b2b2b"],
  ["BRENT", "Brent Petrol", "BZ=F", "#3a3a3a"],
  ["DOĞALGAZ", "Doğalgaz", "NG=F", "#4f8ff7"],
];

// ── Global indices (display as points) ──
const INDEX: Row[] = [
  ["S&P500", "S&P 500", "^GSPC", "#4f8ff7"],
  ["NASDAQ", "NASDAQ 100", "^NDX", "#a78bfa"],
  ["DOW", "Dow Jones", "^DJI", "#1f3d5c"],
  ["BIST100", "BIST 100", "XU100.IS", "#16a34a"],
  ["BIST30", "BIST 30", "XU030.IS", "#15803d"],
  ["DAX", "DAX (Almanya)", "^GDAXI", "#d4a017"],
  ["FTSE", "FTSE 100", "^FTSE", "#5b21b6"],
  ["NIKKEI", "Nikkei 225", "^N225", "#c23b2b"],
];

// ── NASDAQ-100 constituents ──
const NASDAQ100: Row[] = [
  ["AAPL", "Apple", "AAPL", "#a2aaad"],
  ["MSFT", "Microsoft", "MSFT", "#00a4ef"],
  ["NVDA", "NVIDIA", "NVDA", "#76b900"],
  ["AMZN", "Amazon", "AMZN", "#ff9900"],
  ["AVGO", "Broadcom", "AVGO", "#cc092f"],
  ["META", "Meta Platforms", "META", "#0668e1"],
  ["TSLA", "Tesla", "TSLA", "#cc0000"],
  ["GOOGL", "Alphabet A", "GOOGL", "#ea4335"],
  ["GOOG", "Alphabet C", "GOOG", "#fbbc05"],
  ["COST", "Costco", "COST", "#e31837"],
  ["NFLX", "Netflix", "NFLX", "#e50914"],
  ["AMD", "AMD", "AMD", "#ed1c24"],
  ["PEP", "PepsiCo", "PEP", "#004883"],
  ["ADBE", "Adobe", "ADBE", "#ff0000"],
  ["LIN", "Linde", "LIN", "#005596"],
  ["CSCO", "Cisco", "CSCO", "#1ba0d7"],
  ["TMUS", "T-Mobile US", "TMUS", "#e20074"],
  ["INTC", "Intel", "INTC", "#0071c5"],
  ["INTU", "Intuit", "INTU", "#365ebf"],
  ["QCOM", "Qualcomm", "QCOM", "#3253dc"],
  ["TXN", "Texas Instruments", "TXN", "#cc0000"],
  ["AMGN", "Amgen", "AMGN", "#0063c3"],
  ["ISRG", "Intuitive Surgical", "ISRG"],
  ["AMAT", "Applied Materials", "AMAT", "#f37021"],
  ["BKNG", "Booking Holdings", "BKNG", "#003580"],
  ["HON", "Honeywell", "HON", "#e2231a"],
  ["CMCSA", "Comcast", "CMCSA"],
  ["ADP", "ADP", "ADP", "#d0271d"],
  ["VRTX", "Vertex Pharma", "VRTX"],
  ["GILD", "Gilead Sciences", "GILD", "#c8102e"],
  ["ADI", "Analog Devices", "ADI"],
  ["REGN", "Regeneron", "REGN"],
  ["PANW", "Palo Alto Networks", "PANW", "#fa582d"],
  ["MELI", "MercadoLibre", "MELI", "#ffe600"],
  ["LRCX", "Lam Research", "LRCX"],
  ["MU", "Micron", "MU", "#0099d8"],
  ["SBUX", "Starbucks", "SBUX", "#00704a"],
  ["KLAC", "KLA Corp", "KLAC"],
  ["PYPL", "PayPal", "PYPL", "#003087"],
  ["SNPS", "Synopsys", "SNPS"],
  ["CDNS", "Cadence", "CDNS"],
  ["MDLZ", "Mondelez", "MDLZ", "#5b2d8e"],
  ["MAR", "Marriott", "MAR", "#a00020"],
  ["CRWD", "CrowdStrike", "CRWD", "#e01a22"],
  ["ORLY", "O'Reilly Auto", "ORLY"],
  ["CTAS", "Cintas", "CTAS"],
  ["ASML", "ASML Holding", "ASML", "#0a4d8c"],
  ["ABNB", "Airbnb", "ABNB", "#ff5a5f"],
  ["FTNT", "Fortinet", "FTNT", "#ee3124"],
  ["NXPI", "NXP Semiconductors", "NXPI"],
  ["CHTR", "Charter Comms", "CHTR"],
  ["WDAY", "Workday", "WDAY", "#0875e1"],
  ["MNST", "Monster Beverage", "MNST", "#7ed957"],
  ["ADSK", "Autodesk", "ADSK"],
  ["PCAR", "PACCAR", "PCAR"],
  ["PAYX", "Paychex", "PAYX"],
  ["KDP", "Keurig Dr Pepper", "KDP"],
  ["ROP", "Roper Technologies", "ROP"],
  ["AEP", "American Electric", "AEP"],
  ["FANG", "Diamondback Energy", "FANG"],
  ["DXCM", "DexCom", "DXCM"],
  ["EXC", "Exelon", "EXC"],
  ["IDXX", "IDEXX Labs", "IDXX"],
  ["CPRT", "Copart", "CPRT"],
  ["ROST", "Ross Stores", "ROST"],
  ["KHC", "Kraft Heinz", "KHC"],
  ["EA", "Electronic Arts", "EA", "#ff4747"],
  ["FAST", "Fastenal", "FAST"],
  ["GEHC", "GE HealthCare", "GEHC"],
  ["CTSH", "Cognizant", "CTSH"],
  ["CSGP", "CoStar Group", "CSGP"],
  ["VRSK", "Verisk", "VRSK"],
  ["XEL", "Xcel Energy", "XEL"],
  ["CCEP", "Coca-Cola Europacific", "CCEP"],
  ["TTWO", "Take-Two", "TTWO", "#e4002b"],
  ["BKR", "Baker Hughes", "BKR"],
  ["ON", "ON Semiconductor", "ON"],
  ["DDOG", "Datadog", "DDOG", "#632ca6"],
  ["TEAM", "Atlassian", "TEAM", "#2684ff"],
  ["PLTR", "Palantir", "PLTR", "#101820"],
  ["ZS", "Zscaler", "ZS", "#0068b3"],
  ["BIIB", "Biogen", "BIIB"],
  ["MRVL", "Marvell", "MRVL", "#0099cc"],
  ["MDB", "MongoDB", "MDB", "#00ed64"],
  ["LULU", "Lululemon", "LULU", "#d31334"],
  ["PDD", "PDD Holdings", "PDD", "#e02e24"],
  ["ARM", "Arm Holdings", "ARM", "#11809f"],
  ["GFS", "GlobalFoundries", "GFS"],
  ["CDW", "CDW Corp", "CDW"],
  ["TTD", "The Trade Desk", "TTD", "#3a5bbc"],
  ["WBD", "Warner Bros Discovery", "WBD"],
  ["DLTR", "Dollar Tree", "DLTR"],
];

// ── BIST-100 constituents (Yahoo .IS, prices in TRY) ──
const BIST100: Row[] = [
  ["THYAO", "Türk Hava Yolları", "THYAO.IS", "#e30613"],
  ["ASELS", "Aselsan", "ASELS.IS", "#b91c1c"],
  ["GARAN", "Garanti BBVA", "GARAN.IS", "#00a859"],
  ["AKBNK", "Akbank", "AKBNK.IS", "#d4202a"],
  ["ISCTR", "İş Bankası C", "ISCTR.IS", "#003d7a"],
  ["YKBNK", "Yapı Kredi", "YKBNK.IS", "#003366"],
  ["HALKB", "Halkbank", "HALKB.IS", "#005baa"],
  ["VAKBN", "VakıfBank", "VAKBN.IS", "#ffc20e"],
  ["KCHOL", "Koç Holding", "KCHOL.IS", "#1d4ed8"],
  ["SAHOL", "Sabancı Holding", "SAHOL.IS", "#00529b"],
  ["TUPRS", "Tüpraş", "TUPRS.IS", "#0ea5e9"],
  ["SISE", "Şişecam", "SISE.IS", "#15803d"],
  ["EREGL", "Ereğli Demir Çelik", "EREGL.IS", "#f59e0b"],
  ["BIMAS", "BİM", "BIMAS.IS", "#e4002b"],
  ["FROTO", "Ford Otosan", "FROTO.IS", "#003478"],
  ["TOASO", "Tofaş", "TOASO.IS", "#1c3f94"],
  ["TCELL", "Turkcell", "TCELL.IS", "#ffc900"],
  ["TAVHL", "TAV Havalimanları", "TAVHL.IS"],
  ["PGSUS", "Pegasus", "PGSUS.IS", "#f9a01b"],
  ["EKGYO", "Emlak Konut GYO", "EKGYO.IS"],
  ["PETKM", "Petkim", "PETKM.IS", "#e30613"],
  ["CLEBI", "Çelebi Hava Servisi", "CLEBI.IS", "#c8102e"],
  ["KONYA", "Konya Çimento", "KONYA.IS"],
  ["TTKOM", "Türk Telekom", "TTKOM.IS", "#00529b"],
  ["ARCLK", "Arçelik", "ARCLK.IS", "#003da5"],
  ["ENKAI", "Enka İnşaat", "ENKAI.IS"],
  ["TKFEN", "Tekfen Holding", "TKFEN.IS"],
  ["SASA", "Sasa Polyester", "SASA.IS", "#e2231a"],
  ["GUBRF", "Gübre Fabrikaları", "GUBRF.IS"],
  ["DOHOL", "Doğan Holding", "DOHOL.IS"],
  ["MGROS", "Migros", "MGROS.IS", "#e30613"],
  ["SOKM", "Şok Marketler", "SOKM.IS", "#f7941e"],
  ["ULKER", "Ülker", "ULKER.IS", "#005baa"],
  ["VESTL", "Vestel", "VESTL.IS", "#e30613"],
  ["OTKAR", "Otokar", "OTKAR.IS"],
  ["TTRAK", "Türk Traktör", "TTRAK.IS"],
  ["LOGO", "Logo Yazılım", "LOGO.IS", "#f47920"],
  ["MAVI", "Mavi Giyim", "MAVI.IS", "#1f3d7a"],
  ["AEFES", "Anadolu Efes", "AEFES.IS", "#0033a0"],
  ["ENJSA", "Enerjisa", "ENJSA.IS", "#00a651"],
  ["KONTR", "Kontrolmatik", "KONTR.IS"],
  ["ASTOR", "Astor Enerji", "ASTOR.IS"],
  ["HEKTS", "Hektaş", "HEKTS.IS"],
  ["KRDMD", "Kardemir D", "KRDMD.IS"],
  ["ALARK", "Alarko Holding", "ALARK.IS"],
  ["BRSAN", "Borusan Boru", "BRSAN.IS"],
  ["CIMSA", "Çimsa", "CIMSA.IS"],
  ["CCOLA", "Coca-Cola İçecek", "CCOLA.IS", "#e30613"],
  ["AKSEN", "Aksa Enerji", "AKSEN.IS"],
  ["AKSA", "Aksa Akrilik", "AKSA.IS"],
  ["SMRTG", "Smart Güneş", "SMRTG.IS", "#f9a01b"],
  ["EUPWR", "Europower Enerji", "EUPWR.IS"],
  ["OYAKC", "Oyak Çimento", "OYAKC.IS"],
  ["TUKAS", "Tukaş", "TUKAS.IS"],
  ["BRYAT", "Borusan Yatırım", "BRYAT.IS"],
  ["ISMEN", "İş Yatırım", "ISMEN.IS"],
  ["GESAN", "Girişim Elektrik", "GESAN.IS"],
  ["GWIND", "Galata Wind", "GWIND.IS"],
  ["ZOREN", "Zorlu Enerji", "ZOREN.IS"],
  ["YEOTK", "Yeo Teknoloji", "YEOTK.IS"],
  ["AGHOL", "Anadolu Grubu", "AGHOL.IS"],
  ["BERA", "Bera Holding", "BERA.IS"],
  ["TSKB", "TSKB", "TSKB.IS"],
  ["VESBE", "Vestel Beyaz Eşya", "VESBE.IS"],
  ["TMSN", "Tümosan", "TMSN.IS"],
  ["KCAER", "Kocaer Çelik", "KCAER.IS"],
  ["TABGD", "Tab Gıda", "TABGD.IS"],
  ["CWENE", "CW Enerji", "CWENE.IS"],
  ["REEDR", "Reeder Teknoloji", "REEDR.IS"],
  ["KAYSE", "Kayseri Şeker", "KAYSE.IS"],
  ["KMPUR", "Kimteks Poliüretan", "KMPUR.IS"],
  ["GLYHO", "Global Yatırım Holding", "GLYHO.IS"],
  ["ISGYO", "İş GYO", "ISGYO.IS"],
  ["KARSN", "Karsan", "KARSN.IS"],
  ["GENIL", "Gen İlaç", "GENIL.IS"],
  ["AGROT", "Agrotech", "AGROT.IS"],
  ["BINHO", "Bin Holding", "BINHO.IS"],
  ["ENERY", "Enerya Enerji", "ENERY.IS"],
  ["MIATK", "Mia Teknoloji", "MIATK.IS"],
  ["PASEU", "Pasifik Eurasia", "PASEU.IS"],
  ["BIENY", "Bien Yapı", "BIENY.IS"],
  ["DOAS", "Doğuş Otomotiv", "DOAS.IS"],
  ["ODAS", "Odaş Elektrik", "ODAS.IS"],
  ["TURSG", "Türkiye Sigorta", "TURSG.IS"],
  ["ANSGR", "Anadolu Sigorta", "ANSGR.IS"],
  ["AKFGY", "Akfen GYO", "AKFGY.IS"],
  ["EGEEN", "Ege Endüstri", "EGEEN.IS"],
  ["KTLEV", "Katılımevim", "KTLEV.IS"],
  ["CANTE", "Çan2 Termik", "CANTE.IS"],
  ["IEYHO", "Işıklar Enerji", "IEYHO.IS"],
];

export const ASSETS: Asset[] = [
  ...mk("crypto", CRYPTO),
  ...mk("crypto", CRYPTO_ARCHIVED, true),
  ...mk("commodity", COMMODITY),
  ...mk("index", INDEX),
  ...mk("nasdaq100", NASDAQ100),
  ...mk("bist100", BIST100),
];

/** Only the assets buyable in the markets browser (archived ones excluded). */
export const TRADEABLE_ASSETS: Asset[] = ASSETS.filter((a) => !a.archived);

/**
 * BIST-30 constituents — tradeable as single-stock futures (VIOP-30 group).
 * Curated from a recent XU030 list; values are virtual so quarterly drift is fine.
 */
export const BIST30_TICKERS = new Set<string>([
  "AKBNK", "ALARK", "ARCLK", "ASELS", "ASTOR", "BIMAS", "BRSAN", "EKGYO",
  "ENKAI", "EREGL", "FROTO", "GARAN", "GUBRF", "HEKTS", "ISCTR", "KCHOL",
  "KONTR", "KRDMD", "MGROS", "OYAKC", "PETKM", "PGSUS", "SAHOL", "SASA",
  "SISE", "TCELL", "THYAO", "TOASO", "TUPRS", "YKBNK",
]);

/**
 * Whether an asset can be traded with leverage in the futures panel.
 * Crypto, global/BIST indices, and the BIST-30 single stocks (VIOP-30).
 */
export function isLeverageable(a: Asset): boolean {
  if (a.archived) return false;
  return (
    a.type === "crypto" ||
    a.type === "index" ||
    (a.type === "bist100" && BIST30_TICKERS.has(a.ticker))
  );
}

/** Group key for the futures asset picker. */
export type LeverageGroup = "crypto" | "viop" | "index";
export function leverageGroup(a: Asset): LeverageGroup {
  if (a.type === "crypto") return "crypto";
  if (a.type === "bist100") return "viop";
  return "index";
}

/** Assets that can be traded with leverage in the futures section. */
export const LEVERAGE_ASSETS: Asset[] = TRADEABLE_ASSETS.filter(isLeverageable);

export const ASSET_BY_TICKER: Record<string, Asset> = Object.fromEntries(
  ASSETS.map((a) => [a.ticker, a]),
);

export const TYPE_LABEL: Record<AssetType, string> = {
  crypto: "Kripto",
  commodity: "Emtia",
  index: "Endeks",
  sp500: "S&P 500",
  nasdaq100: "NASDAQ 100",
  bist100: "BIST 100",
};
