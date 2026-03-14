/* Albion Online Arbitrage Scanner — Type Definitions */

/** Raw API response from Albion Online Data Project */
export interface AlbionPriceEntry {
  item_id: string
  city: string
  quality: number
  sell_price_min: number
  sell_price_min_date: string
  sell_price_max: number
  sell_price_max_date: string
  buy_price_min: number
  buy_price_min_date: string
  buy_price_max: number
  buy_price_max_date: string
}

/** History API response */
export interface AlbionHistoryDataPoint {
  item_count: number
  avg_price: number
  timestamp: string
}
export interface AlbionHistoryResponse {
  location: string
  item_id: string
  quality: number
  data: AlbionHistoryDataPoint[]
}

/** Enriched volume data for validated opportunities */
export interface VolumeData {
  dailyVolumeSrc: number   // avg daily volume at source city
  dailyVolumeDst: number   // avg daily volume at dest city
  avgPriceSrc: number      // 7-day avg price at source
  avgPriceDst: number      // 7-day avg price at dest
  recommendedQty: number   // how many to buy (min of volume * 0.3)
  liquidityScore: number   // 0-100, higher = easier to sell
  daysToSell: number       // estimated days to sell at recommended qty
}

/** Parsed item from ao-bin-dumps */
export interface AlbionItem {
  uniqueName: string
  tier: number
  enchantment: number
  category: string
}

/** Validated price data */
export interface ValidatedPrice {
  itemId: string
  city: City
  quality: number
  sellMin: number
  sellMinDate: Date
  buyMax: number
  buyMaxDate: Date
  freshness: Freshness
}

/** Trade strategy */
export type TradeStrategy = 'instant-sell' | 'sell-order'

/** Route risk level */
export type RiskLevel = 'safe' | 'medium' | 'dangerous'

/** Arbitrage opportunity */
export interface ArbitrageOpportunity {
  itemId: string
  displayName: string
  tier: number
  enchantment: number
  category: string
  sourceCity: City
  sourcePrice: number
  sourceDate: Date
  destCity: City
  destPrice: number
  destDate: Date
  netProfit: number
  profitPercent: number
  isBlackMarket: boolean
  freshness: Freshness
  quality: number
  strategy: TradeStrategy
  // Opportunity cost fields
  deathRisk: number          // 0-1 probability of dying on route
  riskLevel: RiskLevel
  transportMinutes: number   // estimated transport time
  expectedValue: number      // netProfit * (1-risk) - sourcePrice * risk
  profitPerHour: number      // expectedValue / transportMinutes * 60
  taxPaid: number            // tax amount (0 for instant-sell)
  // Volume data (enriched after scan for top trades)
  volume?: VolumeData
}

/** Scan state for React */
export interface ScanState {
  status: 'idle' | 'loading-items' | 'scanning' | 'analyzing' | 'complete' | 'error'
  progress: number
  batchesDone: number
  batchesTotal: number
  itemsTotal: number
  opportunities: ArbitrageOpportunity[]
  lastScanTime: Date | null
  error: string | null
}

/** Dashboard filter state */
export interface FilterState {
  minProfit: number
  minProfitPercent: number
  sourceCity: City | 'all'
  destCity: City | 'all'
  category: string | 'all'
  minTier: number
  maxTier: number
  showBlackMarket: boolean
  showStale: boolean
  sortBy: SortField
  sortDir: 'asc' | 'desc'
  search: string
}

export type SortField =
  | 'netProfit' | 'profitPercent' | 'sourcePrice'
  | 'displayName' | 'tier' | 'sourceCity' | 'destCity' | 'freshness'
  | 'expectedValue' | 'profitPerHour'

export type City =
  | 'Bridgewatch' | 'Martlock' | 'Fort Sterling'
  | 'Lymhurst' | 'Thetford' | 'Caerleon' | 'Brecilien' | 'Black Market'

export type Freshness = 'fresh' | 'recent' | 'stale'

export type TaxMode = 'normal' | 'premium'
