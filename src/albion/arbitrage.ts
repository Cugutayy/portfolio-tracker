/**
 * Albion Arbitrage Engine — Caerleon ↔ Black Market Focus
 * =======================================================
 * Finds profitable Caerleon → Black Market instant-sell opportunities.
 *
 * Strategy: Buy at sell_price_min in Caerleon → instant-sell at buy_price_max in BM.
 * - No tax on instant sell to BM buy orders
 * - Zero travel risk (BM is inside Caerleon)
 * - Guaranteed immediate profit if both prices are current
 *
 * Critical requirement: BOTH sides must be verified as fresh:
 * - Caerleon sell order must exist RIGHT NOW
 * - BM buy order must be active RIGHT NOW
 */

import type { ValidatedPrice, AlbionItem, ArbitrageOpportunity, TaxMode, City, Freshness, TradeStrategy } from './types'
import { TAX_NORMAL, TAX_PREMIUM, MAX_SPREAD_RATIO } from './constants'
import { getRouteInfo } from './constants'
import { displayName } from './items'

function calcOpportunityCost(
  sourceCity: string,
  destCity: string,
  sourcePrice: number,
  netProfit: number,
): { deathRisk: number; riskLevel: 'safe' | 'medium' | 'dangerous'; transportMinutes: number; expectedValue: number; profitPerHour: number } {
  const route = getRouteInfo(sourceCity, destCity)
  // Expected value = profit if survive - loss if die
  const expectedValue = Math.round(netProfit * (1 - route.deathRisk) - sourcePrice * route.deathRisk)
  const profitPerHour = route.transportMinutes > 0
    ? Math.round((expectedValue / route.transportMinutes) * 60)
    : expectedValue * 60
  return {
    deathRisk: route.deathRisk,
    riskLevel: route.riskLevel,
    transportMinutes: route.transportMinutes,
    expectedValue,
    profitPerHour,
  }
}

function makeFreshness(a: Freshness, b: Freshness): Freshness {
  if (a === 'stale' || b === 'stale') return 'stale'
  if (a === 'recent' || b === 'recent') return 'recent'
  return 'fresh'
}

export function findOpportunities(
  prices: ValidatedPrice[],
  items: AlbionItem[],
  taxMode: TaxMode,
): ArbitrageOpportunity[] {
  const itemMap = new Map<string, AlbionItem>()
  for (const it of items) itemMap.set(it.uniqueName, it)

  const taxRate = taxMode === 'premium' ? TAX_PREMIUM : TAX_NORMAL

  // Group prices by itemId+quality
  const groups = new Map<string, ValidatedPrice[]>()
  for (const p of prices) {
    const key = `${p.itemId}|${p.quality}`
    const list = groups.get(key)
    if (list) list.push(p)
    else groups.set(key, [p])
  }

  const opportunities: ArbitrageOpportunity[] = []

  for (const [, group] of groups) {
    const byCity = new Map<string, ValidatedPrice>()
    for (const p of group) {
      const existing = byCity.get(p.city)
      if (!existing || p.sellMin > 0 && (!existing.sellMin || p.sellMinDate > existing.sellMinDate)) {
        byCity.set(p.city, p)
      }
    }

    const itemId = group[0].itemId
    const quality = group[0].quality
    const item = itemMap.get(itemId) || itemMap.get(itemId.replace(/@\d+$/, ''))

    // Focused mode: only Caerleon as source → Black Market as dest
    // Caerleon → BM = 0 risk, instant sell, no travel
    const sources: { city: City; price: ValidatedPrice }[] = []

    // Only Caerleon as source city
    const caerleonPrice = byCity.get('Caerleon')
    if (caerleonPrice && caerleonPrice.sellMin > 0) {
      sources.push({ city: 'Caerleon', price: caerleonPrice })
    }

    const tier = item?.tier || parseInt(itemId.match(/^T(\d)/)?.[1] || '0', 10)
    const enchantment = item?.enchantment || parseInt(itemId.match(/@(\d)$/)?.[1] || '0', 10)
    const category = item?.category || ''
    const dName = displayName(itemId)

    // ── Caerleon → Black Market: Instant Sell ──
    // Buy at sell_price_min in Caerleon, instant-sell to BM at buy_price_max
    // No tax, no travel risk, instant profit
    const bm = byCity.get('Black Market')
    if (bm && bm.buyMax > 0) {
      for (const src of sources) {
        const buyPrice = src.price.sellMin
        if (bm.buyMax > buyPrice * MAX_SPREAD_RATIO) continue
        const netProfit = bm.buyMax - buyPrice
        if (netProfit <= 0) continue
        const profitPct = (netProfit / buyPrice) * 100

        const freshness = makeFreshness(src.price.freshness, bm.freshness)
        const opp = calcOpportunityCost(src.city, 'Black Market', buyPrice, netProfit)

        opportunities.push({
          itemId, displayName: dName, tier, enchantment, category,
          sourceCity: src.city, sourcePrice: buyPrice, sourceDate: src.price.sellMinDate,
          destCity: 'Black Market', destPrice: bm.buyMax, destDate: bm.buyMaxDate,
          netProfit: Math.round(netProfit),
          profitPercent: Math.round(profitPct * 10) / 10,
          isBlackMarket: true, freshness, quality,
          strategy: 'instant-sell',
          taxPaid: 0,
          ...opp,
        })
      }
    }
  }

  return opportunities
}
