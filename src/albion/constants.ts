/* Albion Online Arbitrage Scanner — Constants */

import type { City, FilterState, RiskLevel } from './types'

export const API_BASE = 'https://europe.albion-online-data.com'
export const ITEMS_URL = 'https://raw.githubusercontent.com/broderickhyman/ao-bin-dumps/master/items.json'

export const CITIES: City[] = [
  'Bridgewatch', 'Martlock', 'Fort Sterling',
  'Lymhurst', 'Thetford', 'Caerleon', 'Brecilien',
]
export const ALL_LOCATIONS: City[] = [...CITIES, 'Black Market']

export const TAX_NORMAL = 0.065
export const TAX_PREMIUM = 0.04

export const MAX_URL_LENGTH = 4096
export const STALE_MS = 24 * 60 * 60 * 1000   // 24h
export const FRESH_MS = 60 * 60 * 1000         // 1h
export const MAX_PRICE = 100_000_000
export const MAX_SPREAD_RATIO = 3
export const PRICE_CACHE_TTL = 90_000           // 90s
export const ITEMS_CACHE_TTL = 24 * 60 * 60 * 1000
export const SCAN_INTERVAL = 2 * 60 * 1000     // 2min
export const BM_REFRESH_INTERVAL = 30 * 1000   // 30s — BM quick refresh

export const CITY_COLORS: Record<string, string> = {
  'Bridgewatch':   '#e2a44f',
  'Martlock':      '#5bb5e0',
  'Fort Sterling': '#c0c0c0',
  'Lymhurst':      '#4caf50',
  'Thetford':      '#8d6e63',
  'Caerleon':      '#e53935',
  'Brecilien':     '#ab47bc',
  'Black Market':  '#888',
}

export const CATEGORY_LABELS: Record<string, string> = {
  equipmentitem: 'Armor',
  weapon: 'Weapons',
  mount: 'Mounts',
  consumableitem: 'Consumables',
  consumablefrominventoryitem: 'Consumables',
  simpleitem: 'Materials',
  furnitureitem: 'Furniture',
  journalitem: 'Journals',
}

export const TRADABLE_CATEGORIES = new Set([
  'simpleitem', 'consumableitem', 'consumablefrominventoryitem',
  'equipmentitem', 'weapon', 'mount', 'furnitureitem', 'journalitem',
])

/**
 * Route risk & transport time data for Albion Online
 *
 * Royal cities (Bridgewatch, Martlock, Fort Sterling, Lymhurst, Thetford)
 * are connected via blue/yellow zone roads → very safe.
 * Caerleon is in the center, accessed via red zone roads → medium risk.
 * Brecilien is in the Roads of Avalon / black zone → dangerous.
 * Black Market is inside Caerleon → same risk as reaching Caerleon.
 *
 * Risk = probability of dying and losing ALL carried items.
 * Transport = approximate minutes for a mounted player.
 */
export interface RouteInfo {
  deathRisk: number       // 0-1 probability
  transportMinutes: number
  riskLevel: RiskLevel
  description: string
}

type RouteKey = `${string}->${string}`

const ROYAL_CITIES = new Set(['Bridgewatch', 'Martlock', 'Fort Sterling', 'Lymhurst', 'Thetford'])

/** Get route info between two cities */
export function getRouteInfo(from: string, to: string): RouteInfo {
  // Normalize: Black Market is in Caerleon
  const dest = to === 'Black Market' ? 'Caerleon' : to
  const src = from === 'Black Market' ? 'Caerleon' : from

  // Specific overrides
  const key: RouteKey = `${src}->${dest}`
  if (ROUTE_OVERRIDES[key]) return ROUTE_OVERRIDES[key]

  // Royal ↔ Royal: safe zone roads
  if (ROYAL_CITIES.has(src) && ROYAL_CITIES.has(dest)) {
    return { deathRisk: 0.02, transportMinutes: 5, riskLevel: 'safe', description: 'Safe zone roads (blue/yellow)' }
  }
  // Royal ↔ Caerleon: red zone roads
  if ((ROYAL_CITIES.has(src) && dest === 'Caerleon') || (src === 'Caerleon' && ROYAL_CITIES.has(dest))) {
    return { deathRisk: 0.08, transportMinutes: 7, riskLevel: 'medium', description: 'Red zone roads to Caerleon' }
  }
  // Anything involving Brecilien: black zone / Roads of Avalon
  if (src === 'Brecilien' || dest === 'Brecilien') {
    return { deathRisk: 0.20, transportMinutes: 12, riskLevel: 'dangerous', description: 'Black zone / Roads of Avalon' }
  }
  // Same city
  if (src === dest) {
    return { deathRisk: 0, transportMinutes: 1, riskLevel: 'safe', description: 'Same city' }
  }
  // Fallback
  return { deathRisk: 0.10, transportMinutes: 8, riskLevel: 'medium', description: 'Unknown route' }
}

/** Specific route overrides for fine-tuned risk */
const ROUTE_OVERRIDES: Partial<Record<RouteKey, RouteInfo>> = {
  // Caerleon ↔ Caerleon (BM is in Caerleon, so no transport needed)
  'Caerleon->Caerleon': { deathRisk: 0, transportMinutes: 1, riskLevel: 'safe', description: 'Same city (BM is in Caerleon)' },
}

export const DEFAULT_FILTERS: FilterState = {
  minProfit: 5000,
  minProfitPercent: 8,
  sourceCity: 'all',
  destCity: 'all',
  category: 'all',
  minTier: 4,
  maxTier: 8,
  showBlackMarket: true,
  showStale: false,
  sortBy: 'netProfit',
  sortDir: 'desc',
  search: '',
}
